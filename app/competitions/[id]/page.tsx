import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import CompetitionView from "@/components/CompetitionView";
import Link from "next/link";
import type { Result } from "@/lib/types";

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comp } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .single();

  if (!comp) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("competition_id", id)
    .order("name");

  // Load all results for all categories
  const catIds = categories?.map((c: { id: string }) => c.id) ?? [];
  const { data: results } = await supabase
    .from("results")
    .select("*")
    .in("category_id", catIds)
    .order("rank");

  // Build category map
  const catMap = (categories ?? []).map((cat: { id: string; name: string }) => ({
    id: cat.id,
    name: cat.name,
    results: (results ?? []).filter((r: Result) => r.category_id === cat.id),
  }));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#1a3a5c] text-white px-6 h-14 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="font-black text-lg">Gym<span className="text-[#f6a96e]">Analyze</span></Link>
        <span className="text-white/40">/</span>
        <span className="text-sm font-medium opacity-80 truncate max-w-xs">{comp.name}</span>
        {comp.date && <span className="text-xs opacity-50 hidden sm:block">{new Date(comp.date).toLocaleDateString("cs-CZ")}</span>}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm opacity-60">{user.email}</span>
          <form action="/api/auth/signout" method="POST">
            <button className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md">Odhlásit</button>
          </form>
        </div>
      </header>

      <CompetitionView competition={comp} categories={catMap} />
    </div>
  );
}
