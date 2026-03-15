import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Competition } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: competitions } = await supabase
    .from("competitions")
    .select("*, categories(id, name)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-[#1a3a5c] text-white px-6 h-14 flex items-center gap-4">
        <span className="font-black text-lg">Gym<span className="text-[#f6a96e]">Analyze</span></span>
        <nav className="flex gap-1 ml-4">
          <Link href="/" className="px-3 py-1.5 rounded-md text-sm bg-white/15 font-medium">Soutěže</Link>
          <Link href="/upload" className="px-3 py-1.5 rounded-md text-sm hover:bg-white/10 font-medium">+ Nahrát PDF</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm opacity-70">{user.email}</span>
          <form action="/api/auth/signout" method="POST">
            <button className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md">Odhlásit</button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#1a3a5c]">Soutěže</h1>
          <Link href="/upload" className="bg-[#e85d26] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors">
            + Nahrát PDF
          </Link>
        </div>

        {!competitions || competitions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🤸‍♀️</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Zatím žádné soutěže</h2>
            <p className="text-gray-400 text-sm mb-6">Nahrajte první PDF výsledkovou listinu</p>
            <Link href="/upload" className="bg-[#1a3a5c] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2563a8]">
              Nahrát první soutěž
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {competitions.map((c: Competition & { categories: { id: string; name: string }[] }) => (
              <Link key={c.id} href={`/competitions/${c.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#2563a8] hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">🏆</div>
                  {c.date && <span className="text-xs text-gray-400">{new Date(c.date).toLocaleDateString("cs-CZ")}</span>}
                </div>
                <h3 className="font-bold text-[#1a3a5c] group-hover:text-[#2563a8] transition-colors mb-1 line-clamp-2">{c.name}</h3>
                {c.location && <p className="text-sm text-gray-400 mb-3">📍 {c.location}</p>}
                <div className="flex gap-2 flex-wrap">
                  {c.categories?.map((cat: { id: string; name: string }) => (
                    <span key={cat.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cat.name}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
