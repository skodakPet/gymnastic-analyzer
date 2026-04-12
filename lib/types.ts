export interface Discipline {
  D: number;
  E: number;
  pen: number;
  total: number;
}

/** Athlete as parsed from PDF (before storing to DB) */
export interface ParsedAthlete {
  rank: number;
  name: string;
  year: number;
  club: string;
  coach: string;
  disciplines: [Discipline, Discipline, Discipline, Discipline]; // preskok, bradla, kladina, prostna
  celkem: number;
}

/** DB row shapes */
export interface Team {
  id: string;
  name: string;
}

export interface Gymnast {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: number | null;
  team_id: string | null;
  created_at: string;
}

export interface Competition {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  created_by: string;
  created_at: string;
}

export interface Result {
  id: string;
  competition_id: string;
  gymnast_id: string | null;
  name: string;
  club: string | null;
  coach: string | null;
  birth_year: number | null;
  category: string;
  rank: number;
  preskok_d: number; preskok_e: number; preskok_pen: number; preskok_total: number;
  bradla_d: number;  bradla_e: number;  bradla_pen: number;  bradla_total: number;
  kladina_d: number; kladina_e: number; kladina_pen: number; kladina_total: number;
  prostna_d: number; prostna_e: number; prostna_pen: number; prostna_total: number;
  celkem: number;
  created_at: string;
}

/** Result joined with competition data */
export interface ResultWithCompetition extends Result {
  competitions: Competition;
}

/** Gymnast with aggregated stats for roster display */
export interface GymnastWithStats extends Gymnast {
  lastCategory?: string;
  bestRankThisSeason?: number;
  lastCompetitionDate?: string;
  lastCompetitionName?: string;
}

/** Analytics-enriched athlete (after rankings are calculated) */
export interface RankedAthlete extends ParsedAthlete {
  overallRank: number;
  total: number;
  discRanks: [number, number, number, number];
  catMaxD: number;
}

export const DISC_NAMES = ["Přeskok", "Bradla", "Kladina", "Prostná"] as const;
export const DISC_KEYS = ["preskok", "bradla", "kladina", "prostna"] as const;
export type DiscKey = typeof DISC_KEYS[number];
