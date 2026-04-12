import { createClient } from "@/lib/supabase/server";
import { getCompetitionDetail } from "@/lib/queries";
import { notFound } from "next/navigation";
import CompetitionView from "@/components/CompetitionView";
import Link from "next/link";

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const detail = await getCompetitionDetail(id);
  if (!detail) notFound();

  const { competition, categories, gymnastIdMap } = detail;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#1a3a5c] text-white px-6 h-14 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="font-black text-lg">Gym<span className="text-[#f6a96e]">Analyze</span></Link>
        <span className="text-white/40">/</span>
        <span className="text-sm font-medium opacity-80 truncate max-w-xs">{competition.name}</span>
        {competition.date && <span className="text-xs opacity-50 hidden sm:block">{new Date(competition.date).toLocaleDateString("cs-CZ")}</span>}
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

      <CompetitionView competition={competition} categories={categories} gymnastIds={gymnastIdMap} />
    </div>
  );
}
