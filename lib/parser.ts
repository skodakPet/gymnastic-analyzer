import type { ParsedAthlete, ParsedCategory, Discipline } from "./types";

/**
 * Parses raw text (from pdf-parse) into categories + athletes.
 * Handles the standard Czech gymnastics result sheet format.
 */
export function parseResultsText(text: string): ParsedCategory[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const categories: ParsedCategory[] = [];
  let currentCat: ParsedCategory | null = null;
  let pendingLine: string | null = null;

  for (const line of lines) {
    // Category header: "II. kategorie", "III. kategorie", etc.
    if (/^(I{1,3}V?|IV|V{0,1}I{0,3})\.?\s*kategorie/i.test(line)) {
      currentCat = { name: line.replace(/\s+/g, " ").trim(), athletes: [] };
      categories.push(currentCat);
      pendingLine = null;
      continue;
    }
    if (!currentCat) continue;

    // Skip header rows and page footers
    if (/Jméno|Ročník|přeskok|bradla|kladina|prostná/i.test(line) && !/^\d+\./.test(line)) continue;
    if (/^\s*(strana|\d+\s*\/\s*\d+)/i.test(line)) continue;

    // Continuation of a multi-line entry (club on second line)
    if (pendingLine && !/^\d+\./.test(line)) {
      const merged = pendingLine + " " + line;
      const athlete = tryParseAthlete(merged);
      if (athlete) {
        currentCat.athletes.push(athlete);
        pendingLine = null;
      }
      continue;
    }

    if (/^\d+\./.test(line)) {
      const athlete = tryParseAthlete(line);
      if (athlete) {
        currentCat.athletes.push(athlete);
        pendingLine = null;
      } else {
        pendingLine = line; // might need next line to complete
      }
    }
  }

  return categories.filter((c) => c.athletes.length > 0);
}

function tryParseAthlete(line: string): ParsedAthlete | null {
  const rankMatch = line.match(/^(\d+)\.\s*/);
  if (!rankMatch) return null;

  // Extract all x.xxx decimal numbers
  const decMatches = [...line.matchAll(/(\d+\.\d{3})/g)];
  if (decMatches.length < 17) return null;
  const allDecimals = decMatches.map((m) => parseFloat(m[1]));
  const sc = allDecimals.slice(-17);

  // Validate discipline structure: D+E-pen ≈ total (×4) + celkem
  const disciplines: Discipline[] = [];
  for (let i = 0; i < 4; i++) {
    const D = sc[i * 4], E = sc[i * 4 + 1], pen = sc[i * 4 + 2], tot = sc[i * 4 + 3];
    if (D > 6 || E > 11 || pen > 5) return null;
    if (Math.abs(D + E - pen - tot) > 0.02) return null;
    disciplines.push({ D, E, pen, total: tot });
  }
  const celkem = sc[16];

  // Year (e.g. 2020)
  const yearMatch = line.match(/\b(20[12]\d)\b/);
  if (!yearMatch) return null;

  const name = line.substring(rankMatch[0].length, line.indexOf(yearMatch[0])).trim();
  const afterYear = line.substring(line.indexOf(yearMatch[0]) + 4).trim();

  // Everything before the first score number is club+coach
  const firstScoreIdx = afterYear.search(/\b\d+\.\d{3}\b/);
  const clubCoach = firstScoreIdx > 0 ? afterYear.substring(0, firstScoreIdx).trim() : "";
  const { club, coach } = splitClubCoach(clubCoach);

  return {
    rank: parseInt(rankMatch[1]),
    name: name.replace(/\s+/g, " ").trim(),
    year: parseInt(yearMatch[0]),
    club,
    coach,
    disciplines: disciplines as [Discipline, Discipline, Discipline, Discipline],
    celkem,
  };
}

function splitClubCoach(text: string): { club: string; coach: string } {
  const prefixes = ["T.J. Sokol", "TJ Sokol", "T.J.", "TJ ", "SK ", "SG ", "SGC ", "KSG ", "GT ", "Gymnastika ", "GYMPRA", "BubbleGym"];
  for (const p of prefixes) {
    if (text.startsWith(p)) {
      const rest = text.substring(p.length);
      const m = rest.match(/^(\S+(?:\s+\S+){0,2})\s{2,}(.+)$/);
      if (m) return { club: (p + m[1]).trim(), coach: m[2].trim() };
      const words = text.split(/\s+/);
      return {
        club: words.slice(0, Math.min(4, words.length)).join(" "),
        coach: words.slice(4).join(" "),
      };
    }
  }
  return { club: text, coach: "" };
}
