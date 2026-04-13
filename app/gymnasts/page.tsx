import { createClient } from "@/lib/supabase/server";
import { getGymnastroster } from "@/lib/queries";
import Link from "next/link";

export default async function RosterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const gymnasts = await getGymnastroster();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a3a5c] text-white px-6 h-14 flex items-center gap-4">
        <Link href="/" className="font-black text-lg">Gym<span className="text-[#f6a96e]">Analyze</span></Link>
        <nav className="flex gap-1 ml-4">
          <Link href="/" className="px-3 py-1.5 rounded-md text-sm hover:bg-white/10 font-medium">Dashboard</Link>
          <Link href="/gymnasts" className="px-3 py-1.5 rounded-md text-sm bg-white/15 font-medium">Gymnastky</Link>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1a3a5c]">Gymnastky ({gymnasts.length})</h1>
        </div>

        {gymnasts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🤸‍♀️</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Zatím žádné profily</h2>
            <p className="text-gray-400 text-sm">
              Zatím nejsou v databázi žádné profily gymnastek.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gymnasts.map(g => (
              <Link key={g.id} href={`/gymnasts/${g.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#2563a8] hover:shadow-md transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-lg font-black text-[#1a3a5c]">
                    {g.first_name[0]}{g.last_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-[#1a3a5c] group-hover:text-[#2563a8] transition-colors">
                      {g.first_name} {g.last_name}
                    </p>
                    {g.birth_year && <p className="text-xs text-gray-400">nar. {g.birth_year}</p>}
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  {g.bestRankThisSeason !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nejlepší umístění ({new Date().getFullYear()})</span>
                      <span className="font-bold text-[#1a3a5c]">
                        {g.bestRankThisSeason <= 3
                          ? ["🥇", "🥈", "🥉"][g.bestRankThisSeason - 1] + " "
                          : ""}
                        {g.bestRankThisSeason}. místo
                      </span>
                    </div>
                  )}
                  {g.lastCompetitionDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Poslední závod</span>
                      <span className="text-gray-600 text-xs">{new Date(g.lastCompetitionDate).toLocaleDateString("cs-CZ")}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
