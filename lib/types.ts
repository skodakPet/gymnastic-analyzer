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

export interface ParsedCategory {
  name: string;
  athletes: ParsedAthlete[];
}

/** DB row shapes */
export interface Competition {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  filename: string | null;
  created_by: string;
  created_at: string;
}

export interface Category {
  id: string;
  competition_id: string;
  name: string;
  created_at: string;
}

export interface Result {
  id: string;
  category_id: string;
  rank: number;
  name: string;
  birth_year: number | null;
  club: string | null;
  coach: string | null;
  preskok_d: number; preskok_e: number; preskok_pen: number; preskok_total: number;
  bradla_d: number;  bradla_e: number;  bradla_pen: number;  bradla_total: number;
  kladina_d: number; kladina_e: number; kladina_pen: number; kladina_total: number;
  prostna_d: number; prostna_e: number; prostna_pen: number; prostna_total: number;
  celkem: number;
  created_at: string;
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
