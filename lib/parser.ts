import type { ParsedAthlete, ParsedCategory, Discipline } from "./types";

/**
 * Parses raw text (from pdf-parse) into categories + athletes.
 * Handles the standard Czech gymnastics result sheet format.
 *
 * NOTE: pdf-parse concatenates numbers without spaces, e.g. "2.0008.6500.00010.650"
 * — all regexes avoid word boundaries (\b) to handle this.
 *
 * Formats supported:
 *   - 4 disciplines (přeskok + bradla + kladina + prostná): 17 decimal values
 *   - 3 disciplines (bradla + kladina + prostná, VS3C/VS4B): 13 decimal values
 */
export function parseResultsText(text: string): ParsedCategory[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const categories: ParsedCategory[] = [];
  let currentCat: ParsedCategory | null = null;
  let pendingLine: string | null = null;

  for (const line of lines) {
    // Category header: Roman numeral + "kategorie" (with optional suffix like "- VS3C")
    if (/^(I{1,3}|IV|VI{0,3}|V)\.?\s+kategorie/i.test(line)) {
      currentCat = { name: line.replace(/\s+/g, " ").trim(), athletes: [] };
      categories.push(currentCat);
      pendingLine = null;
      continue;
    }
    if (!currentCat) continue;

    // Skip column headers and page markers
    if (/přeskok|bradla|kladina|prostná/i.test(line) && !/^\d+\./.test(line)) continue;
    if (/strana|\d+\s*\/\s*\d+/i.test(line) && !/^\d+\./.test(line)) continue;

    if (/^\d+\./.test(line)) {
      // New athlete line — discard any unresolved pending
      pendingLine = null;
      const athlete = tryParseAthlete(line);
      if (athlete) {
        currentCat.athletes.push(athlete);
      } else {
        pendingLine = line; // may need next line (e.g. multi-line club name)
      }
    } else if (pendingLine) {
      // Continuation line — merge and retry
      const athlete = tryParseAthlete(pendingLine + " " + line);
      if (athlete) currentCat.athletes.push(athlete);
      pendingLine = null;
    }
  }

  return categories.filter((c) => c.athletes.length > 0);
}

function tryParseAthlete(line: string): ParsedAthlete | null {
  // Must start with rank number followed by period
  const rankMatch = line.match(/^(\d+)\./);
  if (!rankMatch) return null;

  // ── Decimal scores ──────────────────────────────────────────────────────────
  // pdf-parse concatenates numbers → use /(\d+\.\d{3})/g without \b
  const decMatches = [...line.matchAll(/(\d+\.\d{3})/g)];
  const allDecimals = decMatches.map((m) => parseFloat(m[1]));

  // Determine format by score count
  // 4-discipline: needs 17 values (4×4 + celkem)
  // 3-discipline: needs 13 values (3×4 + celkem), přeskok absent
  let numDisciplines: 3 | 4;
  if (allDecimals.length >= 17) {
    numDisciplines = 4;
  } else if (allDecimals.length >= 13) {
    numDisciplines = 3;
  } else {
    return null;
  }

  const scoreCount = numDisciplines === 4 ? 17 : 13;
  const sc = allDecimals.slice(-scoreCount);

  // ── Disciplines ──────────────────────────────────────────────────────────────
  const parsedDiscs: Discipline[] = [];
  for (let i = 0; i < numDisciplines; i++) {
    const D = sc[i * 4], E = sc[i * 4 + 1], pen = sc[i * 4 + 2], tot = sc[i * 4 + 3];
    if (D > 10 || E > 12 || pen > 10) return null;
    if (Math.abs(D + E - pen - tot) > 0.1) return null;
    parsedDiscs.push({ D, E, pen, total: tot });
  }

  // Map to fixed 4-slot tuple: [přeskok, bradla, kladina, prostná]
  // For 3-discipline format: přeskok slot is zeroed
  const zero: Discipline = { D: 0, E: 0, pen: 0, total: 0 };
  const disciplines: [Discipline, Discipline, Discipline, Discipline] =
    numDisciplines === 4
      ? [parsedDiscs[0], parsedDiscs[1], parsedDiscs[2], parsedDiscs[3]]
      : [zero, parsedDiscs[0], parsedDiscs[1], parsedDiscs[2]];

  const celkem = sc[scoreCount - 1];

  // ── Birth year ───────────────────────────────────────────────────────────────
  // Use lookahead/lookbehind — \b fails between letters and digits ("Anna2020TJ")
  const yearMatch = line.match(/(?<!\d)((?:19|20)\d{2})(?!\d)/);
  if (!yearMatch || yearMatch.index === undefined) return null;

  // ── Name ─────────────────────────────────────────────────────────────────────
  const name = line.substring(rankMatch[0].length, yearMatch.index).trim().replace(/\s+/g, " ");
  if (!name) return null;

  // ── Club + coach ─────────────────────────────────────────────────────────────
  const afterYear = line.substring(yearMatch.index + 4).trim();
  const firstScoreMatch = afterYear.match(/\d+\.\d{3}/);
  const clubCoach = firstScoreMatch
    ? afterYear.substring(0, firstScoreMatch.index).trim()
    : "";
  const { club, coach } = splitClubCoach(clubCoach);

  return {
    rank: parseInt(rankMatch[1]),
    name,
    year: parseInt(yearMatch[1]),
    club,
    coach,
    disciplines,
    celkem,
  };
}

// Clubs whose prefix IS the full club name (no city suffix appended)
const FULL_CLUB_NAMES = new Set(["BubbleGym", "GYMPRA"]);

function splitClubCoach(text: string): { club: string; coach: string } {
  const prefixes = [
    "T.J. Sokol", "TJ Sokol", "T.J.", "TJ ", "SK ", "SG ", "SGC ",
    "KSG ", "GT ", "Gymnastika ", "GYMPRA", "BubbleGym",
  ];
  for (const p of prefixes) {
    if (text.startsWith(p)) {
      const clubBase = p.trim();
      const rest = text.substring(p.length).trim();

      // Complete club names have no city suffix — rest is the coach directly
      if (FULL_CLUB_NAMES.has(clubBase)) {
        return { club: clubBase, coach: rest };
      }

      // PDF concatenates city and coach without spaces, e.g. "DoksyDoubravová"
      // Split at first adjacent lowercase→uppercase transition (camelCase boundary)
      const camel = rest.match(/^(.*?[a-záčďéěíňóřšťúůýž])([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ].*)$/);
      if (camel) {
        return { club: (clubBase + " " + camel[1]).trim(), coach: camel[2].trim() };
      }

      // Fallback for space-separated text (e.g. multi-line merged entries)
      const words = rest.split(/\s+/);
      return {
        club: (clubBase + " " + words.slice(0, 4).join(" ")).trim(),
        coach: words.slice(4).join(" "),
      };
    }
  }
  // No known prefix: try camelCase split on full text
  const camel = text.match(/^(.*?[a-záčďéěíňóřšťúůýž])([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ].*)$/);
  if (camel) return { club: camel[1].trim(), coach: camel[2].trim() };
  return { club: text, coach: "" };
}
