import { createClient } from "@/lib/supabase/server";
import { getWhatIfAnalysis } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Result } from "@/lib/types";
import { DISC_NAMES, DISC_KEYS } from "@/lib/types";

function discVal(r: Result, key: string, field: "D" | "E" | "pen" | "total"): number {
  return (r as any)[`${key}_${field}`] ?? 0;
}

function medal(rank: number) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : ""; }

function DeltaCell({ my, ref: refVal }: { my: number; ref: number }) {
  const delta = my - refVal;
  if (Math.abs(delta) < 0.001) return <span className="text-gray-400">—</span>;
  return (
    <span className={delta > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
      {delta > 0 ? "+" : ""}{delta.toFixed(3)}
    </span>
  );
}

export default async function WhatIfPage({
  params,
}: {
  params: Promise<{ id: string; compId: string }>;
}) {
  const { id: gymnastId, compId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const data = await getWhatIfAnalysis(compId, gymnastId);
  if (!data) notFound();

  const { myResult, categoryResults, competition } = data;

  // Závodnice těsně nad naší gymnastikou
  const above = categoryResults.find(r => r.rank === myResult.rank - 1) ?? null;
  // 3. místo (medaile) — pokud naše gymnastka není top 3
  const third = myResult.rank > 3 ? categoryResults.find(r => r.rank === 3) ?? null : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a3a5c] text-white px-6 h-14 flex items-center gap-3">
        <Link href="/" className="font-black text-lg">Gym<span className="text-[#f6a96e]">Analyze</span></Link>
        <span className="text-white/40">/</span>
        <Link href="/gymnasts" className="text-sm opacity-70 hover:opacity-100">Gymnastky</Link>
        <span className="text-white/40">/</span>
        <Link href={`/gymnasts/${gymnastId}`} className="text-sm opacity-70 hover:opacity-100">{myResult.name}</Link>
        <span className="text-white/40">/</span>
        <span className="text-sm font-medium opacity-80 truncate max-w-xs">{competition.name}</span>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm opacity-60">{user.email}</span>
              <form action="/api/auth/signout" method="POST">
                <button className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md">Odhlásit</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md">Přihlásit</Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Result summary */}
        <div className="flex items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl font-black text-[#1a3a5c]">
              {medal(myResult.rank) || ""} {myResult.rank}. místo — {myResult.name}
            </h1>
            <p className="text-sm text-gray-400">
              {competition.name}
              {competition.date && <> · {new Date(competition.date).toLocaleDateString("cs-CZ")}</>}
              {" · "}{myResult.category}
              {" · "}{categoryResults.length} závodnic
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-black text-[#1a3a5c]">{myResult.celkem?.toFixed(3)}</p>
            <p className="text-xs text-gray-400">bodů celkem</p>
          </div>
        </div>

        {/* Score breakdown table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Body na nářadích</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Nářadí</th>
                <th className="px-4 py-3 text-right">D</th>
                <th className="px-4 py-3 text-right">E</th>
                <th className="px-4 py-3 text-right">Pen</th>
                <th className="px-4 py-3 text-right font-bold">Total</th>
                {above && <th className="px-4 py-3 text-right text-blue-500">vs {above.rank}. místo</th>}
                {third && <th className="px-4 py-3 text-right text-amber-600">vs 3. místo</th>}
              </tr>
            </thead>
            <tbody>
              {DISC_KEYS.map((key, i) => {
                const total = discVal(myResult, key, "total");
                if (total === 0 && discVal(myResult, key, "D") === 0) return null;
                return (
                  <tr key={key} className="border-t border-gray-100">
                    <td className="px-5 py-3 font-semibold text-gray-700">{DISC_NAMES[i]}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{discVal(myResult, key, "D").toFixed(3)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{discVal(myResult, key, "E").toFixed(3)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">
                      {discVal(myResult, key, "pen") > 0
                        ? <span className="text-red-500">-{discVal(myResult, key, "pen").toFixed(3)}</span>
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-[#1a3a5c]">{total.toFixed(3)}</td>
                    {above && (
                      <td className="px-4 py-3 text-right">
                        <div className="text-xs text-gray-400">{discVal(above, key, "total").toFixed(3)}</div>
                        <DeltaCell my={total} ref={discVal(above, key, "total")} />
                      </td>
                    )}
                    {third && (
                      <td className="px-4 py-3 text-right">
                        <div className="text-xs text-gray-400">{discVal(third, key, "total").toFixed(3)}</div>
                        <DeltaCell my={total} ref={discVal(third, key, "total")} />
                      </td>
                    )}
                  </tr>
                );
              })}
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-5 py-3 font-bold text-gray-700">Celkem</td>
                <td colSpan={3}></td>
                <td className="px-4 py-3 text-right font-black text-[#1a3a5c] text-base">{myResult.celkem?.toFixed(3)}</td>
                {above && (
                  <td className="px-4 py-3 text-right">
                    <div className="text-xs text-gray-400">{above.celkem?.toFixed(3)}</div>
                    <DeltaCell my={myResult.celkem} ref={above.celkem} />
                  </td>
                )}
                {third && (
                  <td className="px-4 py-3 text-right">
                    <div className="text-xs text-gray-400">{third.celkem?.toFixed(3)}</div>
                    <DeltaCell my={myResult.celkem} ref={third.celkem} />
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Textové doporučení */}
        {(above || third) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Co by pomohlo</h2>
            <ul className="space-y-2 text-sm">
              {above && (() => {
                const diff = above.celkem - myResult.celkem;
                // Find apparatus where the biggest loss is
                const deltas = DISC_KEYS.map((key, i) => ({
                  disc: DISC_NAMES[i],
                  delta: discVal(above, key, "total") - discVal(myResult, key, "total"),
                })).filter(d => d.delta > 0.001).sort((a, b) => b.delta - a.delta);

                return (
                  <>
                    <li className="flex gap-2">
                      <span>🎯</span>
                      <span>
                        Na <strong>{above.rank}. místo</strong> ({above.name}) chybí{" "}
                        <strong>{diff.toFixed(3)} b.</strong> celkem.
                      </span>
                    </li>
                    {deltas[0] && (
                      <li className="flex gap-2">
                        <span>🔑</span>
                        <span>
                          Největší ztráta na <strong>{deltas[0].disc}</strong>:{" "}
                          <strong>−{deltas[0].delta.toFixed(3)} b.</strong>
                          {deltas[0].delta >= diff
                            ? " — vyrovnání na tomto nářadí by stačilo na přeskočení."
                            : " — přiblížení zde by výrazně pomohlo."}
                        </span>
                      </li>
                    )}
                  </>
                );
              })()}
              {third && (() => {
                const diff = third.celkem - myResult.celkem;
                const deltas = DISC_KEYS.map((key, i) => ({
                  disc: DISC_NAMES[i],
                  delta: discVal(third, key, "total") - discVal(myResult, key, "total"),
                })).filter(d => d.delta > 0.001).sort((a, b) => b.delta - a.delta);

                return (
                  <>
                    <li className="flex gap-2 mt-1 pt-1 border-t border-gray-100">
                      <span>🥉</span>
                      <span>
                        Na medaili (3. místo — {third.name}) chybí{" "}
                        <strong>{diff.toFixed(3)} b.</strong>
                      </span>
                    </li>
                    {deltas[0] && (
                      <li className="flex gap-2">
                        <span>📈</span>
                        <span>
                          Největší mezera oproti medailistce na <strong>{deltas[0].disc}</strong>:{" "}
                          <strong>−{deltas[0].delta.toFixed(3)} b.</strong>
                        </span>
                      </li>
                    )}
                  </>
                );
              })()}
            </ul>
          </div>
        )}

        {/* Pořadí v kategorii */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Pořadí v kategorii {myResult.category}
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Závodnice</th>
                <th className="px-4 py-3 text-left">Oddíl</th>
                <th className="px-4 py-3 text-right">Celkem</th>
              </tr>
            </thead>
            <tbody>
              {categoryResults.map(r => (
                <tr key={r.id}
                  className={`border-t border-gray-100 transition-colors ${r.gymnast_id === myResult.gymnast_id ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}`}>
                  <td className="px-5 py-2.5 font-bold text-gray-500">{medal(r.rank)}{r.rank}.</td>
                  <td className="px-4 py-2.5 text-gray-800">{r.name}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{r.club || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-black text-[#1a3a5c]">{r.celkem?.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
