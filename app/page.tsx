import { createClient } from "@/lib/supabase/server";
import { getTeamDashboard, getCompetitionCategoryRankings } from "@/lib/queries";
import Link from "next/link";

function medal(r: number) { return r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : ""; }

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [stats, rankings] = await Promise.all([
    getTeamDashboard(),
    getCompetitionCategoryRankings(),
  ]);

  const totalMedals = stats.reduce((s, c) => s + c.medals, 0);

  // Mapa: competition_id → categoryName (kategorie domovské skupiny)
  const catMap = new Map<string, string>();
  for (const r of rankings) {
    catMap.set(r.competitionId, r.categoryName);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-[#1a3a5c] text-white px-6 h-14 flex items-center gap-4">
        <span className="font-black text-lg">Gym<span className="text-[#f6a96e]">Analyze</span></span>
        <nav className="flex gap-1 ml-4">
          <Link href="/" className="px-3 py-2 rounded-md text-sm bg-white/15 font-medium">Dashboard</Link>
          <Link href="/gymnasts" className="px-3 py-2 rounded-md text-sm hover:bg-white/10 font-medium">Gymnastky</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm opacity-70 hidden sm:inline">{user.email}</span>
              <form action="/api/auth/signout" method="POST">
                <button className="text-sm bg-white/10 hover:bg-white/20 px-3 py-2 rounded-md">Odhlásit</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md">Přihlásit</Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map(c => {
              const cat = catMap.get(c.id);
              const href = cat
                ? `/competitions/${c.id}?cat=${encodeURIComponent(cat)}`
                : `/competitions/${c.id}`;
              return (
                <Link key={c.id} href={href}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#2563a8] hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">🏆</div>
                    {c.date && <span className="text-xs text-gray-400">{new Date(c.date).toLocaleDateString("cs-CZ")}</span>}
                  </div>
                  <h3 className="font-bold text-[#1a3a5c] group-hover:text-[#2563a8] transition-colors mb-1 line-clamp-2">{c.name}</h3>
                  {c.location && <p className="text-sm text-gray-400 mb-3">📍 {c.location}</p>}
                  <div className="flex gap-3 mt-3 text-xs">
                    {c.homeCount > 0 && (
                      <span className="text-gray-500">🤸‍♀️ {c.homeCount} výsledků</span>
                    )}
                    {c.medals > 0 && (
                      <span className="text-amber-600 font-semibold">
                        {[...Array(Math.min(c.medals, 3))].map((_, i) => medal(i + 1)).join("")} {c.medals}×
                      </span>
                    )}
                    {c.avgScore > 0 && (
                      <span className="text-gray-500">⌀ {c.avgScore.toFixed(2)} b.</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
