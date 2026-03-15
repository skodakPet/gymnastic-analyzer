import type { ParsedAthlete, RankedAthlete, Discipline } from "./types";
import { DISC_NAMES } from "./types";

export function calcRankings(athletes: ParsedAthlete[]): RankedAthlete[] {
  const n = athletes.length;
  const catMaxD = Math.max(...athletes.flatMap((a) => a.disciplines.map((d) => d.D)));

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
    const allE = all.map((x) => x.disciplines[i].E);
    const avgE = allE.reduce((s, v) => s + v, 0) / n;
    const maxE = Math.max(...allE);
    const dGap = maxD - d.D;

    if (dGap > 0.001) {
      items.push({
        priority: dGap >= 0.5 ? "high" : "medium",
        icon: dGap >= 0.5 ? "🔴" : "🟡",
        disc: DISC_NAMES[i],
        type: "Obtížnost",
        text: `D=${d.D.toFixed(3)} oproti max. kategorie ${maxD.toFixed(3)}. Zvýšení na D=${maxD.toFixed(3)} přinese okamžitý zisk +${dGap.toFixed(3)} b.`,
      });
    }

    const eGap = d.E - avgE;
    if (eGap < -0.4) {
      items.push({
        priority: eGap < -0.8 ? "high" : "medium",
        icon: eGap < -0.8 ? "🔴" : "🟡",
        disc: DISC_NAMES[i],
        type: "Provedení",
        text: `E=${d.E.toFixed(3)} je o ${Math.abs(eGap).toFixed(3)} b. pod průměrem (${avgE.toFixed(3)}). Zaměřte se na čistost prvků a stabilitu.`,
      });
    } else if (eGap > 0.3 && dGap < 0.01) {
      items.push({
        priority: "good",
        icon: "🟢",
        disc: DISC_NAMES[i],
        type: "Silná stránka",
        text: `E=${d.E.toFixed(3)} — o ${eGap.toFixed(3)} b. nad průměrem. Tato disciplína je silná stránka.`,
      });
    }

    if (a.discRanks[i] <= 3 && dGap < 0.01) {
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

  const hypoGain = a.disciplines.reduce((s, d) => s + (maxD - d.D), 0);
  if (hypoGain > 0.5) {
    const newTotal = a.celkem + hypoGain;
    const hypoRank = all.filter((x) => x.celkem > newTotal).length + 1;
    items.push({
      priority: "medium",
      icon: "📈",
      disc: "Potenciál",
      type: "Simulace plné D",
      text: `S D=${maxD.toFixed(3)} ve všech disciplínách: ${newTotal.toFixed(3)} b. → ${hypoRank}. místo (posun o ${a.overallRank - hypoRank} míst).`,
    });
  }

  const pct = a.overallRank / n;
  if (pct <= 0.1) {
    items.unshift({ priority: "good", icon: "🏆", disc: "Celkově", type: "Výjimečný výkon", text: `Top ${Math.round(pct * 100)}% kategorie.` });
  } else if (pct <= 0.3) {
    items.unshift({ priority: "good", icon: "⭐", disc: "Celkově", type: "Solidní výkon", text: `Top třetina kategorie. S úpravou obtížnosti je reálný posun do top 15%.` });
  }

  const order: Record<string, number> = { high: 0, medium: 1, good: 2 };
  return items.sort((a, b) => order[a.priority] - order[b.priority]);
}

export function hypoTotal(a: ParsedAthlete, maxD: number): number {
  return a.disciplines.reduce((s, d) => s + Math.max(d.total, d.E + maxD - d.pen), 0);
}
