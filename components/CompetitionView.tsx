"use client";
import { useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { calcRankings, generateFeedback } from "@/lib/analytics";
import type { Discipline, RankedAthlete, Result } from "@/lib/types";
import { DISC_NAMES } from "@/lib/types";

interface CategoryData {
  id: string;
  name: string;
  results: (Result & { isHome: boolean })[];
}

interface Props {
  competition: { id: string; name: string; date: string | null; location: string | null };
  categories: CategoryData[];
  gymnastIds?: Record<string, string>;
  defaultCategoryId?: string;
}

// DB discipline columns are NUMERIC without NOT NULL — guard against null at runtime
function n(v: number | null | undefined): number { return v ?? 0; }

function resultToAthlete(r: Result & { isHome: boolean }) {
  return {
    id: r.id,
    rank: r.rank, name: r.name, year: r.birth_year ?? 0,
    club: r.club ?? "", coach: r.coach ?? "",
    isHome: r.isHome,
    disciplines: [
      { D: n(r.preskok_d), E: n(r.preskok_e), pen: n(r.preskok_pen), total: n(r.preskok_total) },
      { D: n(r.bradla_d),  E: n(r.bradla_e),  pen: n(r.bradla_pen),  total: n(r.bradla_total)  },
      { D: n(r.kladina_d), E: n(r.kladina_e), pen: n(r.kladina_pen), total: n(r.kladina_total) },
      { D: n(r.prostna_d), E: n(r.prostna_e), pen: n(r.prostna_pen), total: n(r.prostna_total) },
    ] as [Discipline, Discipline, Discipline, Discipline],
    celkem: n(r.celkem),
  };
}

function medal(r: number) { return r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : ""; }
function rankPill(rank: number, total: number) {
  const pct = rank / total;
  if (rank <= 3) return "bg-green-100 text-green-800";
  if (pct <= 0.25) return "bg-blue-100 text-blue-800";
  if (pct <= 0.6) return "bg-gray-100 text-gray-700";
  return "bg-red-100 text-red-700";
}

export default function CompetitionView({ competition, categories, gymnastIds = {}, defaultCategoryId }: Props) {
  const [activeCat, setActiveCat] = useState(
    defaultCategoryId && categories.some(c => c.id === defaultCategoryId)
      ? defaultCategoryId
      : categories[0]?.id ?? ""
  );
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);

  const catData = categories.find(c => c.id === activeCat);

  const athletes = useMemo(() => {
    if (!catData) return [];
    return calcRankings(catData.results.map(resultToAthlete));
  }, [catData]);

  const athlete = useMemo(() =>
    selectedAthlete ? athletes.find(a => (a.id ?? a.name) === selectedAthlete) ?? null : null,
    [selectedAthlete, athletes]
  );

  const feedback = useMemo(() =>
    athlete ? generateFeedback(athlete, athletes) : [],
    [athlete, athletes]
  );

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="p-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Kategorie</p>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => { setActiveCat(cat.id); setSelectedAthlete(null); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between mb-0.5 ${activeCat === cat.id ? "bg-[#1a3a5c] text-white font-semibold" : "hover:bg-gray-50 text-gray-700"}`}>
              <span>{cat.name}</span>
              <span className={`text-xs ${activeCat === cat.id ? "opacity-60" : "text-gray-400"}`}>{cat.results.length}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {athlete ? (
          <AthleteDetail
            a={athlete}
            ranked={athletes}
            feedback={feedback}
            onBack={() => setSelectedAthlete(null)}
          />
        ) : (
          <CategoryResultsTable
            athletes={athletes}
            onSelect={setSelectedAthlete}
            gymnastIds={gymnastIds}
          />
        )}
      </main>
    </div>
  );
}

/* ── Category Results Table ─────────────────────────────────────────────────── */

function CategoryResultsTable({
  athletes,
  onSelect,
  gymnastIds = {},
}: {
  athletes: RankedAthlete[];
  onSelect: (id: string) => void;
  gymnastIds?: Record<string, string>;
}) {
  const avg = athletes.length > 0 ? athletes.reduce((s, a) => s + a.celkem, 0) / athletes.length : 0;
  const hasPen = athletes.some(a => a.disciplines.some(d => d.pen > 0));
  const homeCount = athletes.filter(a => a.isHome).length;

  return (
    <>
      {/* Stats */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: "Závodnic", value: athletes.length, sub: "v kategorii" },
          { label: "Průměr", value: avg.toFixed(2), sub: "bodů celkem" },
          { label: "Vítěz", value: athletes[0]?.name.split(" ")[0] ?? "—", sub: athletes[0] ? `${athletes[0].celkem.toFixed(3)} b.` : "" },
          ...(homeCount > 0 ? [{ label: "Domácí", value: homeCount, sub: "závodnic" }] : []),
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex-1 min-w-28">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-black text-[#1a3a5c] mt-0.5">{s.value}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#1a3a5c] text-white uppercase tracking-wide">
                <th className="px-3 py-2 text-left" rowSpan={2}>#</th>
                <th className="px-3 py-2 text-left" rowSpan={2}>Jméno</th>
                <th className="px-2 py-2 text-center" rowSpan={2}>Roč.</th>
                <th className="px-3 py-2 text-left" rowSpan={2}>Oddíl</th>
                {DISC_NAMES.map(name => (
                  <th key={name} className="px-2 py-2 text-center border-l border-white/20" colSpan={hasPen ? 4 : 3}>{name}</th>
                ))}
                <th className="px-3 py-2 text-right border-l border-white/20" rowSpan={2}>Celkem</th>
              </tr>
              <tr className="bg-[#244e7a] text-white/80 text-xs">
                {DISC_NAMES.map(name => (
                  <Fragment key={name}>
                    <th className="px-2 py-1 text-center border-l border-white/20 font-normal">D</th>
                    <th className="px-2 py-1 text-center font-normal">E</th>
                    {hasPen && <th className="px-2 py-1 text-center font-normal text-red-300">Pen</th>}
                    <th className="px-2 py-1 text-center font-semibold">T</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {athletes.map(a => {
                const isHome = a.isHome;
                return (
                  <tr
                    key={a.id ?? a.name}
                    onClick={() => onSelect(a.id ?? a.name)}
                    className={`border-t border-gray-100 cursor-pointer transition-colors ${
                      isHome
                        ? "bg-blue-50 hover:bg-blue-100 border-l-2 border-l-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-3 py-2 font-bold text-gray-500 whitespace-nowrap">
                      {medal(a.overallRank)}{a.overallRank}.
                    </td>
                    <td className={`px-3 py-2 font-semibold whitespace-nowrap ${isHome ? "text-blue-800" : "text-gray-800"}`}>
                      {gymnastIds[a.name] ? (
                        <Link
                          href={`/gymnasts/${gymnastIds[a.name]}`}
                          className="text-[#2563a8] hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          {a.name}
                        </Link>
                      ) : a.name}
                      {isHome && <span className="ml-1.5 text-blue-400 text-xs">●</span>}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-400">{a.year || "—"}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${isHome ? "text-blue-700 font-medium" : "text-gray-400"}`}>
                      {a.club || "—"}
                    </td>
                    {a.disciplines.map((d, i) => (
                      <Fragment key={i}>
                        <td className="px-2 py-2 text-center font-mono border-l border-gray-100 text-gray-600">{d.D.toFixed(3)}</td>
                        <td className="px-2 py-2 text-center font-mono text-gray-600">{d.E.toFixed(3)}</td>
                        {hasPen && (
                          <td className="px-2 py-2 text-center font-mono text-red-500">
                            {d.pen > 0 ? `-${d.pen.toFixed(3)}` : "—"}
                          </td>
                        )}
                        <td className={`px-2 py-2 text-center font-mono font-bold ${isHome ? "text-blue-800" : "text-gray-800"}`}>
                          {d.total.toFixed(3)}
                        </td>
                      </Fragment>
                    ))}
                    <td className={`px-3 py-2 text-right font-black border-l border-gray-100 ${isHome ? "text-blue-900" : "text-[#1a3a5c]"}`}>
                      {a.celkem.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── Athlete Detail ──────────────────────────────────────────────────────────── */

function AthleteDetail({
  a,
  ranked,
  feedback,
  onBack,
}: {
  a: RankedAthlete;
  ranked: RankedAthlete[];
  feedback: ReturnType<typeof generateFeedback>;
  onBack: () => void;
}) {
  const maxD = a.catMaxD;
  const hypoGain = a.disciplines.reduce((s, d) => s + (maxD - d.D), 0);
  const hypoTotal = a.celkem + hypoGain;
  const hypoRank = ranked.filter(x => x.celkem > hypoTotal).length + 1;
  const discBorders = ["border-l-blue-500", "border-l-purple-500", "border-l-amber-500", "border-l-emerald-500"];

  return (
    <>
      <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-[#1a3a5c] flex items-center gap-1">
        ← Zpět na výsledky
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 flex gap-5 items-start flex-wrap">
        <div className="w-16 h-16 rounded-full bg-[#1a3a5c] text-white flex items-center justify-center text-xl font-black flex-shrink-0">
          {a.overallRank}.
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-[#1a3a5c]">{a.name}</h2>
          <p className="text-gray-500 text-sm mt-0.5">Ročník {a.year || "—"} · {a.club || "—"} · Trenér: {a.coach || "—"}</p>
          <p className="text-sm mt-1">Celkové pořadí: <strong>{a.overallRank}. / {a.total}</strong> (top {Math.round(a.overallRank / a.total * 100)}%)</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Celkem</p>
          <p className="text-4xl font-black text-[#1a3a5c]">{a.celkem.toFixed(3)}</p>
        </div>
      </div>

      {/* Hypothetical */}
      {hypoGain > 0.005 ? (
        <div className="bg-gradient-to-r from-[#1a3a5c] to-[#2563a8] text-white rounded-2xl p-5 mb-5">
          <p className="text-xs opacity-70 uppercase tracking-wider mb-2">💡 Simulace — plná obtížnost D={maxD.toFixed(3)} ve všech disciplínách</p>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-3xl font-black">{hypoTotal.toFixed(3)} b.</span>
            <span className="text-white/60">→</span>
            <span className="bg-white/20 rounded-lg px-3 py-1 font-bold text-lg">+{hypoGain.toFixed(3)} b.</span>
            <span className="text-lg">
              Pořadí: <strong>{hypoRank}.</strong>
              {hypoRank < a.overallRank && <span className="ml-2 text-green-300">↑ +{a.overallRank - hypoRank} míst</span>}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 text-green-800 text-sm font-semibold">
          ✅ Závodník cvičí s maximální obtížností D={maxD.toFixed(3)} ve všech disciplínách!
        </div>
      )}

      {/* Disciplines */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {a.disciplines.map((d, i) => {
          const allE = ranked.map(x => x.disciplines[i].E);
          const avgE = allE.reduce((s, v) => s + v, 0) / allE.length;
          const maxE = Math.max(...allE);
          const dGap = maxD - d.D;
          return (
            <div key={i} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${discBorders[i]} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">{DISC_NAMES[i]}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rankPill(a.discRanks[i], a.total)}`}>
                  {a.discRanks[i]}. / {a.total}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: "D", value: d.D.toFixed(3), warn: dGap > 0.001 },
                  { label: "E", value: d.E.toFixed(3), warn: false },
                  { label: "Celkem", value: d.total.toFixed(3), bold: true },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-2 text-center ${s.bold ? "bg-blue-50" : "bg-gray-50"}`}>
                    <p className={`text-lg font-black ${s.warn ? "text-orange-600" : s.bold ? "text-[#1a3a5c]" : "text-gray-800"}`}>{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
              {d.pen > 0 && <p className="text-xs text-red-600 mb-2">⚠ Srážka: -{d.pen.toFixed(3)}</p>}
              {dGap > 0.001 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Obtížnost vs. max</span><span>{d.D.toFixed(3)} / {maxD.toFixed(3)}</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${(d.D / maxD * 100).toFixed(0)}%` }} /></div>
                </div>
              )}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>E vs. nejlepší</span><span>{d.E.toFixed(3)} / {maxE.toFixed(3)} (prům. {avgE.toFixed(3)})</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.E >= avgE ? "bg-green-400" : "bg-red-400"}`} style={{ width: `${(d.E / maxE * 100).toFixed(0)}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h3 className="font-bold text-[#1a3a5c] mb-4">📋 Coaching feedback</h3>
        {feedback.length === 0 ? (
          <p className="text-gray-400 text-sm">Výjimečný výkon — žádné zásadní oblasti ke zlepšení.</p>
        ) : (
          <div className="space-y-3">
            {feedback.map((f, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${f.priority === "good" ? "bg-green-100" : f.priority === "high" ? "bg-red-100" : "bg-amber-100"}`}>{f.icon}</div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${f.priority === "good" ? "text-green-700" : f.priority === "high" ? "text-red-700" : "text-amber-700"}`}>
                    {f.disc} — {f.type}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-200">
            {["Disciplína", "D", "E", "Celkem", "Pořadí", "Hypo (D max)"].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
          </tr></thead>
          <tbody>
            {a.disciplines.map((d, i) => {
              const dGap = maxD - d.D;
              const hypo = d.E + maxD;
              const allDisc = ranked.map(x => x.disciplines[i].total).sort((a, b) => b - a);
              const hypoR = allDisc.filter(s => s > hypo).length + 1;
              return (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-semibold">{DISC_NAMES[i]}</td>
                  <td className="px-4 py-2.5 font-mono">{d.D.toFixed(3)}{dGap > 0.001 ? <span className="text-red-500 text-xs ml-1">(−{dGap.toFixed(3)})</span> : <span className="text-green-500 ml-1">✓</span>}</td>
                  <td className="px-4 py-2.5 font-mono">{d.E.toFixed(3)}</td>
                  <td className="px-4 py-2.5 font-bold font-mono">{d.total.toFixed(3)}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rankPill(a.discRanks[i], a.total)}`}>{a.discRanks[i]}. / {a.total}</span></td>
                  <td className="px-4 py-2.5 text-blue-600">{dGap > 0.001 ? <>{hypo.toFixed(3)} → <strong>{hypoR}. místo</strong></> : "—"}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td className="px-4 py-3 font-black">CELKEM</td>
              <td colSpan={2}></td>
              <td className="px-4 py-3 font-black text-lg text-[#1a3a5c]">{a.celkem.toFixed(3)}</td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rankPill(a.overallRank, a.total)}`}>{a.overallRank}. / {a.total}</span></td>
              <td className="px-4 py-3 text-blue-700 font-bold">{hypoGain > 0.01 ? `${hypoTotal.toFixed(3)} → ${hypoRank}. místo` : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
