import type { ParsedAthlete, RankedAthlete, Discipline } from "./types";
import { DISC_NAMES } from "./types";

// D=E=total=0 typicky znamená, že závodnice disciplínu neabsolvovala
// (chybí v PDF nebo VSx kategorie kde se nesoutěží na všech 4 nářadích).
export function isAbsent(d: Discipline): boolean {
  return d.D === 0 && d.E === 0 && d.total === 0;
}
import {
  SCORE_EPSILON,
  D_GAP,
  E_GAP,
  TOP_DISC_RANK,
  HYPO_GAIN,
  OVERALL_PERCENTILE,
} from "./analytics.constants";

export function calcRankings(athletes: ParsedAthlete[]): RankedAthlete[] {
  const n = athletes.length;
  // Per-disciplína max D — D škály se mezi přeskokem/bradly/kladinou/prostnou liší.
  // D = 0 typicky znamená neúčast (chybějící disciplína v PDF), filtrujeme.
  const catMaxD = ([0, 1, 2, 3] as const).map((i) => {
    const ds = athletes.map((a) => a.disciplines[i].D).filter((d) => d > 0);
    return ds.length > 0 ? Math.max(...ds) : 0;
  }) as [number, number, number, number];

  return athletes.map((a) => {
    const discRanks = a.disciplines.map((d, di) => {
      const scores = athletes.map((x) => x.disciplines[di].total);
      return scores.filter((s) => s > d.total).length + 1;
    }) as [number, number, number, number];

    const overallRank = athletes.filter((x) => x.celkem > a.celkem).length + 1;
    return { ...a, discRanks, overallRank, total: n, catMaxD };
  });
}

export interface FeedbackItem {
  priority: "high" | "medium" | "good";
  icon: string;
  disc: string;
  type: string;
  text: string;
}

export function generateFeedback(a: RankedAthlete, all: RankedAthlete[]): FeedbackItem[] {
  const items: FeedbackItem[] = [];
  const n = all.length;
  const maxD = a.catMaxD;

  a.disciplines.forEach((d, i) => {
    if (isAbsent(d)) return;

    const allE = all.map((x) => x.disciplines[i].E);
    const avgE = allE.reduce((s, v) => s + v, 0) / n;
    const dGap = maxD[i] - d.D;

    if (dGap > SCORE_EPSILON) {
      items.push({
        priority: dGap >= D_GAP.HIGH_PRIORITY ? "high" : "medium",
        icon: dGap >= D_GAP.HIGH_PRIORITY ? "🔴" : "🟡",
        disc: DISC_NAMES[i],
        type: "Obtížnost",
        text: `D=${d.D.toFixed(3)} oproti max. kategorie ${maxD[i].toFixed(3)}. Zvýšení na D=${maxD[i].toFixed(3)} přinese okamžitý zisk +${dGap.toFixed(3)} b.`,
      });
    }

    const eGap = d.E - avgE;
    if (eGap < E_GAP.WEAKNESS) {
      items.push({
        priority: eGap < E_GAP.WEAKNESS_HIGH ? "high" : "medium",
        icon: eGap < E_GAP.WEAKNESS_HIGH ? "🔴" : "🟡",
        disc: DISC_NAMES[i],
        type: "Provedení",
        text: `E=${d.E.toFixed(3)} je o ${Math.abs(eGap).toFixed(3)} b. pod průměrem (${avgE.toFixed(3)}). Zaměřte se na čistost prvků a stabilitu.`,
      });
    } else if (eGap > E_GAP.STRENGTH && dGap < D_GAP.TOLERANCE) {
      items.push({
        priority: "good",
        icon: "🟢",
        disc: DISC_NAMES[i],
        type: "Silná stránka",
        text: `E=${d.E.toFixed(3)} — o ${eGap.toFixed(3)} b. nad průměrem. Tato disciplína je silná stránka.`,
      });
    }

    if (a.discRanks[i] <= TOP_DISC_RANK && dGap < D_GAP.TOLERANCE) {
      items.push({
        priority: "good",
        icon: "🟢",
        disc: DISC_NAMES[i],
        type: "Top výkon",
        text: `${a.discRanks[i]}. místo ze ${n} závodnic — výjimečný výsledek v disciplíně.`,
      });
    }

    if (d.pen > 0) {
      items.push({
        priority: "medium",
        icon: "🟡",
        disc: DISC_NAMES[i],
        type: "Penalizace",
        text: `Srážka ${d.pen.toFixed(3)} b. — eliminace vedoucích chyb přinese okamžité zlepšení.`,
      });
    }
  });

  const hypoGain = a.disciplines.reduce((s, d, i) => {
    if (isAbsent(d)) return s;
    return s + (maxD[i] - d.D);
  }, 0);
  if (hypoGain > HYPO_GAIN.GENERATE_FEEDBACK) {
    const newTotal = a.celkem + hypoGain;
    const hypoRank = all.filter((x) => x.celkem > newTotal).length + 1;
    items.push({
      priority: "medium",
      icon: "📈",
      disc: "Potenciál",
      type: "Simulace plné D",
      text: `S maximální D v každé disciplíně: ${newTotal.toFixed(3)} b. → ${hypoRank}. místo (posun o ${a.overallRank - hypoRank} míst).`,
    });
  }

  const pct = a.overallRank / n;
  if (pct <= OVERALL_PERCENTILE.EXCEPTIONAL) {
    items.unshift({ priority: "good", icon: "🏆", disc: "Celkově", type: "Výjimečný výkon", text: `Top ${Math.round(pct * 100)}% kategorie.` });
  } else if (pct <= OVERALL_PERCENTILE.SOLID) {
    items.unshift({ priority: "good", icon: "⭐", disc: "Celkově", type: "Solidní výkon", text: `Top třetina kategorie. S úpravou obtížnosti je reálný posun do top ${OVERALL_PERCENTILE.TARGET_AFTER_D_FIX}%.` });
  }

  const order: Record<string, number> = { high: 0, medium: 1, good: 2 };
  return items.sort((a, b) => order[a.priority] - order[b.priority]);
}

export function hypoTotal(a: ParsedAthlete, maxD: [number, number, number, number]): number {
  return a.disciplines.reduce((s, d, i) => s + Math.max(d.total, d.E + maxD[i] - d.pen), 0);
}
