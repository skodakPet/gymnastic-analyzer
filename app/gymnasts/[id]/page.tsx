import { createClient } from "@/lib/supabase/server";
import { getGymnastProfile } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import PerformanceChart from "@/components/PerformanceChart";
import { DISC_NAMES, DISC_KEYS } from "@/lib/types";
import type { ResultWithCompetition } from "@/lib/types";

function discTotal(r: ResultWithCompetition, key: string): number {
  return (r as any)[`${key}_total`] ?? 0;
}

function medal(rank: number) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : ""; }

export default async function GymnastProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const profile = await getGymnastProfile(id);
  if (!profile) notFound();

  const { gymnast, results } = profile;
  const hasResults = results.length > 0;

  // Osobní rekordy
  const bestTotal = hasResults ? Math.max(...results.map(r => r.celkem ?? 0)) : 0;
  const bestRank = hasResults ? Math.min(...results.map(r => r.rank ?? 999)) : null;

  // Průměry per nářadí
  const discAvgs = DISC_KEYS.map(key => {
    const values = results.map(r => discTotal(r, key)).filter(v => v > 0);
    return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  });
  const topDiscIdx = discAvgs.indexOf(Math.max(...discAvgs));

  // Chart data
  const chartData = results
    .filter(r => r.competitions?.date && r.celkem > 0)
    .map(r => ({
      label: r.competitions.name.length > 18
        ? r.competitions.name.substring(0, 16) + "…"
        : r.competitions.name,
      date: r.competitions.date,
      value: r.celkem,
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a3a5c] text-white px-6 h-14 flex items-center gap-3">
        <Link href="/" className="font-black text-lg">Gym<span className="text-[#f6a96e]">Analyze</span></Link>
        <span className="text-white/40 hidden sm:inline">/</span>
        <Link href="/gymnasts" className="text-sm opacity-70 hover:opacity-100 hidden sm:inline">Gymnastky</Link>
        <span className="text-white/40">/</span>
        <span className="text-sm font-medium opacity-80 truncate max-w-[140px] sm:max-w-none">{gymnast.first_name} {gymnast.last_name}</span>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm opacity-60 hidden sm:inline">{user.email}</span>
              <form action="/api/auth/signout" method="POST">
                <button className="text-sm bg-white/10 hover:bg-white/20 px-3 py-2 rounded-md">Odhlásit</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md">Přihlásit</Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Gymnast header */}
        <div className="flex items-start flex-wrap gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-[#1a3a5c] flex items-center justify-center text-2xl font-black text-white">
            {gymnast.first_name[0]}{gymnast.last_name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1a3a5c]">
              {gymnast.first_name} {gymnast.last_name}
            </h1>
            {gymnast.birth_year && <p className="text-sm text-gray-400">Nar. {gymnast.birth_year}</p>}
          </div>
        </div>

        {!hasResults ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Zatím žádné výsledky
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Závodů</p>
                <p className="text-3xl font-black text-[#1a3a5c] mt-0.5">{results.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Osobní rekord</p>
                <p className="text-3xl font-black text-[#1a3a5c] mt-0.5">{bestTotal.toFixed(3)}</p>
                <p className="text-xs text-gray-400">bodů</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Nejlepší umístění</p>
                <p className="text-3xl font-black text-[#1a3a5c] mt-0.5">
                  {bestRank !== null ? (medal(bestRank) || "") + bestRank + "." : "—"}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Nejsilnější nářadí</p>
                <p className="text-lg font-black text-[#e85d26] mt-1">{DISC_NAMES[topDiscIdx]}</p>
                <p className="text-xs text-gray-400">⌀ {discAvgs[topDiscIdx].toFixed(3)} b.</p>
              </div>
            </div>

            {/* Discipline averages */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Průměry na nářadích</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DISC_NAMES.map((name, i) => (
                  <div key={name} className={`rounded-lg p-3 text-center ${i === topDiscIdx ? "bg-orange-50 border-2 border-orange-200" : "bg-gray-50"}`}>
                    <p className="text-xs text-gray-500 mb-1">{name}</p>
                    <p className={`text-xl font-black ${i === topDiscIdx ? "text-[#e85d26]" : "text-[#1a3a5c]"}`}>
                      {discAvgs[i] > 0 ? discAvgs[i].toFixed(3) : "—"}
                    </p>
                    {i === topDiscIdx && <p className="text-xs text-orange-500 mt-0.5">★ top</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Performance chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Vývoj výkonnosti</h2>
                <PerformanceChart data={chartData} />
                <p className="text-xs text-gray-400 mt-2 text-center">Oranžová přerušovaná = průměr</p>
              </div>
            )}

            {/* Competition history table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Historie závodů</h2>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Soutěž</th>
                    <th className="px-4 py-3 text-left">Datum</th>
                    <th className="px-4 py-3 text-left">Kategorie</th>
                    <th className="px-4 py-3 text-right">Umístění</th>
                    <th className="px-4 py-3 text-right">Celkem</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...results].reverse().map(r => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-[#1a3a5c]">
                        {r.competitions?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {r.competitions?.date
                          ? new Date(r.competitions.date).toLocaleDateString("cs-CZ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.category}</td>
                      <td className="px-4 py-3 text-sm font-bold text-right">
                        {medal(r.rank)}{r.rank}.
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-right text-[#1a3a5c]">
                        {r.celkem?.toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/gymnasts/${gymnast.id}/competitions/${r.competition_id}`}
                          className="text-xs text-[#2563a8] hover:underline whitespace-nowrap"
                        >
                          Analýza →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
