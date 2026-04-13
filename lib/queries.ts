import { createClient } from "@/lib/supabase/server";
import type { Competition, Gymnast, GymnastWithStats, Result, ResultWithCompetition } from "@/lib/types";

// ── Team Dashboard ────────────────────────────────────────────────────────────

export interface CompetitionStats {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  medals: number;      // počet medailí (rank ≤ 3) z domovského oddílu
  avgScore: number;    // průměrné body gymnastek z domovského oddílu
  homeCount: number;   // počet gymnastek z domovského oddílu
}

export async function getTeamDashboard(): Promise<CompetitionStats[]> {
  const supabase = await createClient();

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, name, date, location")
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!competitions?.length) return [];

  // Domovská skupina: filtr dle HOME_CLUB_NAME + HOME_BIRTH_YEAR (env)
  // Fallback: gymnast_id IS NOT NULL (pokud env nejsou nastaveny)
  const homeClub = process.env.HOME_CLUB_NAME;
  const homeBirthYear = process.env.HOME_BIRTH_YEAR ? parseInt(process.env.HOME_BIRTH_YEAR, 10) : null;

  let homeQuery = supabase
    .from("results")
    .select("competition_id, rank, celkem, gymnast_id");

  if (homeClub && homeBirthYear) {
    homeQuery = homeQuery.eq("club", homeClub).eq("birth_year", homeBirthYear);
  } else {
    homeQuery = homeQuery.not("gymnast_id", "is", null);
  }

  const { data: homeResults } = await homeQuery;

  const resultsMap = new Map<string, { rank: number; celkem: number }[]>();
  for (const r of homeResults ?? []) {
    const arr = resultsMap.get(r.competition_id) ?? [];
    arr.push({ rank: r.rank, celkem: r.celkem });
    resultsMap.set(r.competition_id, arr);
  }

  return competitions.map((c: any) => {
    const rs = resultsMap.get(c.id) ?? [];
    const medals = rs.filter(r => r.rank <= 3).length;
    const avgScore = rs.length > 0
      ? rs.reduce((s, r) => s + (r.celkem ?? 0), 0) / rs.length
      : 0;
    return { id: c.id, name: c.name, date: c.date, location: c.location, medals, avgScore: Math.round(avgScore * 1000) / 1000, homeCount: rs.length };
  });
}

// ── Competition Category Rankings ────────────────────────────────────────────

export interface CategoryRankingRow {
  id: string;
  name: string;
  club: string | null;
  rank: number;
  celkem: number;
  isHome: boolean;
}

export interface CategoryRanking {
  competitionId: string;
  competitionName: string;
  competitionDate: string | null;
  categoryName: string;
  results: CategoryRankingRow[];
}

export async function getCompetitionCategoryRankings(): Promise<CategoryRanking[]> {
  const supabase = await createClient();
  const homeClub = process.env.HOME_CLUB_NAME;
  const homeBirthYear = process.env.HOME_BIRTH_YEAR ? parseInt(process.env.HOME_BIRTH_YEAR, 10) : null;

  // Krok 1: najdi soutěže + kategorie, kde závodí domovská skupina
  let homeQuery = supabase
    .from("results")
    .select("competition_id, category, competitions(id, name, date)");

  if (homeClub && homeBirthYear) {
    homeQuery = homeQuery.eq("club", homeClub).eq("birth_year", homeBirthYear);
  } else {
    homeQuery = homeQuery.not("gymnast_id", "is", null);
  }

  const { data: homeRows } = await homeQuery;
  if (!homeRows?.length) return [];

  const compMeta = new Map<string, { name: string; date: string | null; categories: Set<string> }>();
  for (const r of homeRows as any[]) {
    if (!compMeta.has(r.competition_id)) {
      compMeta.set(r.competition_id, {
        name: r.competitions?.name ?? "",
        date: r.competitions?.date ?? null,
        categories: new Set(),
      });
    }
    compMeta.get(r.competition_id)!.categories.add(r.category);
  }

  // Krok 2: načti všechny výsledky pro tyto soutěže
  const { data: allRows } = await supabase
    .from("results")
    .select("id, competition_id, name, club, rank, celkem, birth_year, category")
    .in("competition_id", Array.from(compMeta.keys()))
    .order("rank");

  if (!allRows?.length) return [];

  const rankings: CategoryRanking[] = [];
  Array.from(compMeta.entries()).forEach(([compId, meta]) => {
    Array.from(meta.categories).forEach(category => {
      const catRows = (allRows as any[]).filter(
        r => r.competition_id === compId && r.category === category
      );
      if (!catRows.length) return;

      rankings.push({
        competitionId: compId,
        competitionName: meta.name,
        competitionDate: meta.date,
        categoryName: category,
        results: catRows.map(r => ({
          id: r.id,
          name: r.name,
          club: r.club,
          rank: r.rank,
          celkem: r.celkem,
          isHome: !!(homeClub && homeBirthYear && r.club === homeClub && r.birth_year === homeBirthYear),
        })),
      });
    });
  });

  return rankings.sort((a, b) => (b.competitionDate ?? "") > (a.competitionDate ?? "") ? 1 : -1);
}

// ── Roster ────────────────────────────────────────────────────────────────────

export async function getGymnastroster(): Promise<GymnastWithStats[]> {
  const supabase = await createClient();

  const { data: gymnasts } = await supabase
    .from("gymnasts")
    .select("id, first_name, last_name, birth_year, team_id, created_at")
    .order("last_name");

  if (!gymnasts?.length) return [];

  // Výsledky s daty soutěží
  const { data: results } = await supabase
    .from("results")
    .select("gymnast_id, rank, category, competition_id, competitions(id, name, date)")
    .not("gymnast_id", "is", null);

  const currentYear = new Date().getFullYear();

  return (gymnasts as Gymnast[]).map(g => {
    const gResults = (results ?? [])
      .filter((r: any) => r.gymnast_id === g.id)
      .sort((a: any, b: any) => {
        const da = a.competitions?.date ?? "";
        const db = b.competitions?.date ?? "";
        return da > db ? -1 : 1;
      });

    const lastResult = gResults[0] as any;
    const thisYearResults = gResults.filter((r: any) =>
      r.competitions?.date?.startsWith(String(currentYear))
    );
    const bestRank = thisYearResults.length > 0
      ? Math.min(...thisYearResults.map((r: any) => r.rank ?? 999))
      : undefined;

    return {
      ...g,
      lastCategory: lastResult?.category,
      bestRankThisSeason: bestRank,
      lastCompetitionDate: lastResult?.competitions?.date,
      lastCompetitionName: lastResult?.competitions?.name,
    };
  });
}

// ── Gymnast Profile ───────────────────────────────────────────────────────────

export interface GymnastProfile {
  gymnast: Gymnast;
  results: ResultWithCompetition[];
}

export async function getGymnastProfile(id: string): Promise<GymnastProfile | null> {
  const supabase = await createClient();

  const { data: gymnast } = await supabase
    .from("gymnasts")
    .select("*")
    .eq("id", id)
    .single();

  if (!gymnast) return null;

  const { data: results } = await supabase
    .from("results")
    .select("*, competitions(id, name, date, location, created_by, created_at)")
    .eq("gymnast_id", id);

  const sorted = ((results ?? []) as ResultWithCompetition[]).sort((a, b) => {
    const da = a.competitions?.date ?? "";
    const db = b.competitions?.date ?? "";
    return da < db ? -1 : 1;
  });

  return { gymnast, results: sorted };
}

// ── What-if Analysis ──────────────────────────────────────────────────────────

export interface WhatIfData {
  myResult: Result;
  categoryResults: Result[];
  competition: Competition;
}

export async function getWhatIfAnalysis(
  competitionId: string,
  gymnastId: string
): Promise<WhatIfData | null> {
  const supabase = await createClient();

  const { data: competition } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", competitionId)
    .single();

  if (!competition) return null;

  // Výsledek konkrétní gymnastky v této soutěži
  const { data: myResult } = await supabase
    .from("results")
    .select("*")
    .eq("competition_id", competitionId)
    .eq("gymnast_id", gymnastId)
    .maybeSingle();

  if (!myResult) return null;

  // Všechny výsledky ve stejné kategorii a soutěži
  const { data: categoryResults } = await supabase
    .from("results")
    .select("*")
    .eq("competition_id", competitionId)
    .eq("category", myResult.category)
    .order("rank");

  return {
    myResult,
    categoryResults: categoryResults ?? [],
    competition,
  };
}

// ── Competition Detail ────────────────────────────────────────────────────────

export interface CompetitionDetail {
  competition: Competition;
  categories: { id: string; name: string; results: (Result & { isHome: boolean })[] }[];
  gymnastIdMap: Record<string, string>; // name → gymnast_id
}

export async function getCompetitionDetail(id: string): Promise<CompetitionDetail | null> {
  const supabase = await createClient();

  const { data: competition } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .single();

  if (!competition) return null;

  const { data: results } = await supabase
    .from("results")
    .select("*")
    .eq("competition_id", id)
    .order("rank");

  const allResults = (results ?? []) as Result[];

  const homeClub = process.env.HOME_CLUB_NAME;
  const homeBirthYear = process.env.HOME_BIRTH_YEAR ? parseInt(process.env.HOME_BIRTH_YEAR, 10) : null;

  // Seskupit podle kategorie
  const catMap = new Map<string, Result[]>();
  for (const r of allResults) {
    const arr = catMap.get(r.category) ?? [];
    arr.push(r);
    catMap.set(r.category, arr);
  }

  const categories = Array.from(catMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, "cs"))
    .map(([name, res]) => ({
      id: name,
      name,
      results: res.map(r => ({
        ...r,
        isHome: !!(homeClub && homeBirthYear && r.club === homeClub && r.birth_year === homeBirthYear),
      })),
    }));

  // Mapa jméno → gymnast_id (pro zobrazení linků na profily)
  const gymnastIdMap: Record<string, string> = {};
  for (const r of allResults) {
    if (r.gymnast_id) gymnastIdMap[r.name] = r.gymnast_id;
  }

  return { competition, categories, gymnastIdMap };
}
