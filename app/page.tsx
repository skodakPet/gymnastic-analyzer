import { createClient } from "@/lib/supabase/server";
import { getTeamDashboard, getCompetitionCategoryRankings } from "@/lib/queries";
import Link from "next/link";

function medal(r: number) { return r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : ""; }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string }>;
}) {
  const { comp: selectedCompId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [stats, rankings] = await Promise.all([
    getTeamDashboard(),
    getCompetitionCategoryRankings(),
  ]);

  const totalMedals = stats.reduce((s, c) => s + c.medals, 0);

  // Výsledky vybrané soutěže — jen domovské holky, seřazené dle pořadí
  const selectedRanking = selectedCompId
    ? rankings.find(r => r.competitionId === selectedCompId) ?? null
    : null;
  const homeRows = selectedRanking
    ? selectedRanking.results.filter(r => r.isHome).sort((a, b) => a.rank - b.rank)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-[#1a3a5c] text-white px-6 h-14 flex items-center gap-4">
        <span className="font-black text-lg">Gym<span className="text-[#f6a96e]">Analyze</span></span>
        <nav className="flex gap-1 ml-4">
          <Link href="/" className="px-3 py-1.5 rounded-md text-sm bg-white/15 font-medium">Dashboard</Link>
          <Link href="/gymnasts" className="px-3 py-1.5 rounded-md text-sm hover:bg-white/10 font-medium">Gymnastky</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm opacity-70">{user.email}</span>
              <form action="/api/auth/signout" method="POST">
                <button className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md">Odhlásit</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md">Přihlásit</Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Soutěží", value: stats.length, icon: "🏆" },
            { label: "Medailí celkem", value: totalMedals, icon: "🥇" },
            { label: "Výsledků v DB", value: stats.reduce((s, c) => s + c.homeCount, 0), icon: "🤸‍♀️" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-3xl font-black text-[#1a3a5c]">{s.value}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Competition list */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#1a3a5c]">Soutěže</h2>
        </div>

        {stats.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🤸‍♀️</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Zatím žádné soutěže</h2>
            <p className="text-gray-400 text-sm">Žádné soutěže zatím nejsou k dispozici.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {stats.map(c => {
              const isSelected = c.id === selectedCompId;
              return (
                <Link key={c.id} href={isSelected ? "/" : `/?comp=${c.id}`}
                  className={`rounded-xl border p-5 transition-all group ${
                    isSelected
                      ? "bg-[#1a3a5c] border-[#1a3a5c] shadow-md"
                      : "bg-white border-gray-200 hover:border-[#2563a8] hover:shadow-md"
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${isSelected ? "bg-white/15" : "bg-blue-50"}`}>🏆</div>
                    {c.date && (
                      <span className={`text-xs ${isSelected ? "text-white/60" : "text-gray-400"}`}>
                        {new Date(c.date).toLocaleDateString("cs-CZ")}
                      </span>
                    )}
                  </div>
                  <h3 className={`font-bold mb-1 line-clamp-2 ${isSelected ? "text-white" : "text-[#1a3a5c] group-hover:text-[#2563a8]"} transition-colors`}>
                    {c.name}
                  </h3>
                  {c.location && (
                    <p className={`text-sm mb-3 ${isSelected ? "text-white/60" : "text-gray-400"}`}>📍 {c.location}</p>
                  )}
                  <div className="flex gap-3 mt-3 text-xs">
                    {c.homeCount > 0 && (
                      <span className={isSelected ? "text-white/70" : "text-gray-500"}>🤸‍♀️ {c.homeCount} výsledků</span>
                    )}
                    {c.medals > 0 && (
                      <span className={isSelected ? "text-amber-300 font-semibold" : "text-amber-600 font-semibold"}>
                        {[...Array(Math.min(c.medals, 3))].map((_, i) => medal(i + 1)).join("")} {c.medals}×
                      </span>
                    )}
                    {c.avgScore > 0 && (
                      <span className={isSelected ? "text-white/70" : "text-gray-500"}>⌀ {c.avgScore.toFixed(2)} b.</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Results for selected competition */}
        {selectedCompId && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[#1a3a5c]">
                  {selectedRanking?.competitionName ?? "Výsledky"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedRanking?.competitionDate && new Date(selectedRanking.competitionDate).toLocaleDateString("cs-CZ")}
                  {selectedRanking?.categoryName && ` · kat. ${selectedRanking.categoryName}`}
                </p>
              </div>
              <Link href={`/competitions/${selectedCompId}`}
                className="text-xs text-[#2563a8] hover:underline">
                Celé výsledky →
              </Link>
            </div>

            {homeRows.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                Žádné výsledky pro tuto skupinu.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left">#</th>
                    <th className="px-4 py-2.5 text-left">Závodnice</th>
                    <th className="px-4 py-2.5 text-right">Body</th>
                  </tr>
                </thead>
                <tbody>
                  {homeRows.map(row => (
                    <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-2.5 font-bold text-gray-500 whitespace-nowrap">
                        {medal(row.rank)}{row.rank}.
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{row.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-black text-[#1a3a5c]">
                        {row.celkem?.toFixed(3) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
