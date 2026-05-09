// Skóre v DB má NUMERIC(5,3) → cokoliv pod 0.001 je zaokrouhlovací šum, ne reálný rozdíl.
export const SCORE_EPSILON = 0.001;

// D-gap = max(D v kategorii) − D závodnice.
export const D_GAP = {
  TOLERANCE: 0.01,
  HIGH_PRIORITY: 0.5,
} as const;

// E-gap = E závodnice − průměr E v kategorii (záporné = pod průměrem).
export const E_GAP = {
  WEAKNESS: -0.4,
  WEAKNESS_HIGH: -0.8,
  STRENGTH: 0.3,
} as const;

export const TOP_DISC_RANK = 3;

// Tři odlišné prahy pro stejnou veličinu — UI banner se zapne dřív než feedback list.
export const HYPO_GAIN = {
  SHOW_BANNER: 0.005,
  SHOW_TABLE: 0.01,
  GENERATE_FEEDBACK: 0.5,
} as const;

export const OVERALL_PERCENTILE = {
  EXCEPTIONAL: 0.1,
  SOLID: 0.3,
  TARGET_AFTER_D_FIX: 15,
} as const;

// rankPill: percentile rank → barva (zbytek = červená).
export const RANK_PILL = {
  TOP: 0.25,
  MIDDLE: 0.6,
} as const;
