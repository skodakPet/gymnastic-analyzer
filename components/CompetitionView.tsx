"use client";
import { useState, useMemo, useRef } from "react";
import { calcRankings, generateFeedback } from "@/lib/analytics";
import type { RankedAthlete, Result } from "@/lib/types";
import { DISC_NAMES } from "@/lib/types";

interface CategoryData { id: string; name: string; results: Result[]; }
interface Props {
  competition: { id: string; name: string; date: string | null; location: string | null };
  categories: CategoryData[];
}

type FilterField = "club" | "name" | "coach";
interface FilterChip { field: FilterField; value: string; label: string; }
const FIELD_LABELS: Record<FilterField, string> = { club: "Oddíl", name: "Závodník", coach: "Trenér" };

function resultToAthlete(r: Result) {
  return {
    rank: r.rank, name: r.name, year: r.birth_year ?? 0,
    club: r.club ?? "", coach: r.coach ?? "",
    disciplines: [
      { D: r.preskok_d, E: r.preskok_e, pen: r.preskok_pen, total: r.preskok_total },
      { D: r.bradla_d,  E: r.bradla_e,  pen: r.bradla_pen,  total: r.bradla_total  },
      { D: r.kladina_d, E: r.kladina_e, pen: r.kladina_pen, total: r.kladina_total },
      { D: r.prostna_d, E: r.prostna_e, pen: r.prostna_pen, total: r.prostna_total },
    ] as [any,any,any,any],
    celkem: r.celkem,
  };
}

function AutocompleteInput({ value, onChange, options, placeholder, onSelect }: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder: string; onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestions = options.filter(o => value && o.toLowerCase().includes(value.toLowerCase()));
  return (
    <div ref={containerRef} className="relative">
      <input type="text" value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={e => { if (e.key === "Enter") { setOpen(false); onSelect(value); } if (e.key === "Escape") setOpen(false); }}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {suggestions.slice(0, 25).map(o => (
            <li key={o} onMouseDown={() => { onSelect(o); setOpen(false); }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 truncate">{o}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function medal(r: number) { return r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : ""; }
function rankPill(rank: number, total: number) {
  const pct = rank / total;
  if (rank <= 3) return "bg-green-100 text-green-800";
  if (pct <= 0.25) return "bg-blue-100 text-blue-800";
  if (pct <= 0.6) return "bg-gray-100 text-gray-700";
  return "bg-red-100 text-red-700";
}

export default function CompetitionView({ competition, categories }: Props) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? "");
  const [clubInput, setClubInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [coachInput, setCoachInput] = useState("");
  const [chips, setChips] = useState<FilterChip[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);

  function addChip(field: FilterField, value: string) {
    if (!value.trim()) return;
    if (chips.some(c => c.field === field && c.value === value)) return;
    setChips(prev => [...prev, { field, value, label: FIELD_LABELS[field] }]);
    if (field === "club") setClubInput("");
    if (field === "name") setNameInput("");
    if (field === "coach") setCoachInput("");
    setSelectedAthlete(null);
  }

  function removeChip(field: FilterField, value: string) {
    setChips(prev => prev.filter(c => !(c.field === field && c.value === value)));
    setSelectedAthlete(null);
  }

  function clearAllChips() {
    setChips([]); setClubInput(""); setNameInput(""); setCoachInput("");
    setSelectedAthlete(null);
  }

  const catData = categories.find(c => c.id === activeCat);

  const ranked = useMemo(() => {
    if (!catData) return [];
    return calcRankings(catData.results.map(resultToAthlete));
  }, [catData]);

  const clubs = useMemo(() => [...new Set(ranked.map(a => a.club).filter(Boolean))].sort(), [ranked]);
  const names = useMemo(() => [...new Set(ranked.map(a => a.name).filter(Boolean))].sort(), [ranked]);
  const coaches = useMemo(() => [...new Set(ranked.flatMap(a => a.coach ? a.coach.split(/[,;]/).map(s => s.trim()) : []).filter(Boolean))].sort(), [ranked]);

  const filtered = useMemo(() => {
    if (chips.length === 0) return ranked;
    return ranked.filter(a =>
      chips.every(chip => {
        const val = chip.value.toLowerCase();
        if (chip.field === "club")  return (a.club ?? "").toLowerCase().includes(val);
        if (chip.field === "name")  return a.name.toLowerCase().includes(val);
        if (chip.field === "coach") return (a.coach ?? "").toLowerCase().includes(val);
        return true;
      })
    );
  }, [ranked, chips]);

  const athlete = useMemo(() =>
    selectedAthlete ? ranked.find(a => a.name === selectedAthlete) ?? null : null,
    [selectedAthlete, ranked]
  );

  const feedback = useMemo(() =>
    athlete ? generateFeedback(athlete, ranked) : [],
    [athlete, ranked]
  );

  const clubChip = chips.find(c => c.field === "club");
  const isSingleClubFilter = clubChip && chips.length === 1;

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
        {/* Categories */}
        <div className="p-3 border-b border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Kategorie</p>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => { setActiveCat(cat.id); clearAllChips(); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between mb-0.5 ${activeCat === cat.id ? "bg-[#1a3a5c] text-white font-semibold" : "hover:bg-gray-50 text-gray-700"}`}>
              <span>{cat.name}</span>
              <span className={`text-xs ${activeCat === cat.id ? "opacity-60" : "text-gray-400"}`}>{cat.results.length}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-3 border-b border-gray-200 space-y-3">
          {/* Active filter chips */}
          {chips.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Aktivní filtry</p>
              <div className="flex flex-wrap gap-1.5">
                {chips.map(chip => (
                  <span key={`${chip.field}:${chip.value}`}
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    <span className="text-blue-400">{chip.label}:</span>
                    <span className="max-w-[120px] truncate">{chip.value}</span>
                    <button onClick={() => removeChip(chip.field, chip.value)}
                      className="ml-0.5 text-blue-400 hover:text-blue-700">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-1">Oddíl</p>
            <AutocompleteInput value={clubInput} onChange={setClubInput} options={clubs}
              placeholder="Hledat oddíl…" onSelect={v => addChip("club", v)} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Závodník</p>
            <AutocompleteInput value={nameInput} onChange={setNameInput} options={names}
              placeholder="Hledat jméno…" onSelect={v => addChip("name", v)} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Trenér</p>
            <AutocompleteInput value={coachInput} onChange={setCoachInput} options={coaches}
              placeholder="Hledat trenéra…" onSelect={v => addChip("coach", v)} />
          </div>

          {chips.length > 0 && (
            <button onClick={clearAllChips}
              className="w-full py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors">
              Zrušit filtry
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {athlete ? (
          <AthleteDetail a={athlete} ranked={ranked} feedback={feedback} />
        ) : isSingleClubFilter ? (
          <ClubView athletes={filtered} allAthletes={ranked} clubName={clubChip.value} />
        ) : (
          <OverviewView athletes={filtered} onSelect={setSelectedAthlete} />
        )}
      </main>
    </div>
  );
}

/* ---- Overview ---- */
function OverviewView({ athletes, onSelect }: { athletes: RankedAthlete[]; onSelect: (n: string) => void }) {
  const avg = athletes.reduce((s, a) => s + a.celkem, 0) / athletes.length;
  return (
    <>
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: "Závodnic", value: athletes.length, sub: "v kategorii" },
          { label: "Průměr", value: avg.toFixed(2), sub: "bodů celkem" },
          { label: "Vítěz", value: athletes[0]?.name.split(" ")[0] ?? "—", sub: athletes[0]?.celkem.toFixed(3) + " b." },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex-1 min-w-32">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-black text-[#1a3a5c] mt-0.5">{s.value}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-[#1a3a5c] text-white text-xs uppercase tracking-wide">
            {["#", "Jméno", "Oddíl", "Přeskok", "Bradla", "Kladina", "Prostná", "Celkem"].map(h => (
              <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {athletes.map(a => (
              <tr key={a.name} onClick={() => onSelect(a.name)} className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors">
                <td className="px-4 py-2.5 text-sm font-bold text-gray-500">{medal(a.overallRank)}{a.overallRank}.</td>
                <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{a.name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">{a.club || "—"}</td>
                {a.disciplines.map((d, i) => (
                  <td key={i} className="px-4 py-2.5 text-sm text-right font-mono">{d.total.toFixed(3)}</td>
                ))}
                <td className="px-4 py-2.5 text-sm font-black text-[#1a3a5c] text-right">{a.celkem.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---- Club View ---- */
function ClubView({ athletes, allAthletes, clubName }: { athletes: RankedAthlete[]; allAthletes: RankedAthlete[]; clubName: string }) {
  const maxD = allAthletes[0]?.catMaxD ?? 2;
  return (
    <>
      <h2 className="text-xl font-bold text-[#1a3a5c] mb-4">🏛 {clubName}</h2>
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: "Závodnic", value: athletes.length, sub: `ze ${allAthletes.length} v kat.` },
          { label: "Nejlepší", value: athletes[0]?.overallRank + ". místo", sub: athletes[0]?.name ?? "" },
          { label: "Průměr oddílu", value: (athletes.reduce((s,a) => s + a.celkem, 0) / athletes.length).toFixed(2), sub: `vs ${(allAthletes.reduce((s,a) => s + a.celkem, 0) / allAthletes.length).toFixed(2)} kat.` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex-1 min-w-32">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-black text-[#1a3a5c] mt-0.5">{s.value}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-[#1a3a5c] text-white text-xs uppercase tracking-wide">
            {["Pořadí", "Závodnice", "Přeskok", "Bradla", "Kladina", "Prostná", "Celkem", "Potenciál D max"].map(h => (
              <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {athletes.map(a => {
              const hypoGain = a.disciplines.reduce((s, d) => s + (maxD - d.D), 0);
              const hypoT = a.celkem + hypoGain;
              const hypoR = allAthletes.filter(x => x.celkem > hypoT).length + 1;
              return (
                <tr key={a.name} className="border-t border-gray-100 hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${rankPill(a.overallRank, allAthletes.length)}`}>
                      {medal(a.overallRank)}{a.overallRank}. / {allAthletes.length}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-sm">{a.name}</td>
                  {a.disciplines.map((d, di) => (
                    <td key={di} className="px-4 py-3 text-sm">
                      <span className="font-mono">{d.total.toFixed(3)}</span>
                      <span className="text-xs text-gray-400 ml-1">({a.discRanks[di]}.)</span>
                    </td>
                  ))}
                  <td className="px-4 py-3 font-black text-[#1a3a5c]">{a.celkem.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm text-blue-600">
                    {hypoGain > 0.01 ? <><span className="font-bold">{hypoT.toFixed(3)}</span> → {hypoR}. místo (+{(a.overallRank - hypoR)} ↑)</> : <span className="text-green-600">✓ max D</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---- Athlete Detail ---- */
function AthleteDetail({ a, ranked, feedback }: { a: RankedAthlete; ranked: RankedAthlete[]; feedback: ReturnType<typeof generateFeedback> }) {
  const maxD = a.catMaxD;
  const hypoGain = a.disciplines.reduce((s, d) => s + (maxD - d.D), 0);
  const hypoTotal = a.celkem + hypoGain;
  const hypoRank = ranked.filter(x => x.celkem > hypoTotal).length + 1;
  const discColors = ["blue", "purple", "amber", "emerald"];
  const discBorders = ["border-l-blue-500", "border-l-purple-500", "border-l-amber-500", "border-l-emerald-500"];

  return (
    <>
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
