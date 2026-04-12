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

  // Všechny výsledky gymnastek s profilem (gymnast_id IS NOT NULL)
  const { data: homeResults } = await supabase
    .from("results")
    .select("competition_id, rank, celkem, gymnast_id")
    .not("gymnast_id", "is", null);

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
  categories: { id: string; name: string; results: Result[] }[];
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

  // Seskupit podle kategorie
  const catMap = new Map<string, Result[]>();
  for (const r of allResults) {
    const arr = catMap.get(r.category) ?? [];
    arr.push(r);
    catMap.set(r.category, arr);
  }

  const categories = Array.from(catMap.entries())
    .sort(([a], [b]) => a.localeCompare(b, "cs"))
    .map(([name, res]) => ({ id: name, name, results: res }));

  // Mapa jméno → gymnast_id (pro zobrazení linků na profily)
  const gymnastIdMap: Record<string, string> = {};
  for (const r of allResults) {
    if (r.gymnast_id) gymnastIdMap[r.name] = r.gymnast_id;
  }

  return { competition, categories, gymnastIdMap };
}
