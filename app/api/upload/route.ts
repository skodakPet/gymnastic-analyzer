import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseResultsText } from "@/lib/parser";
import type { ParsedAthlete } from "@/lib/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("pdf") as File | null;
  const name = (formData.get("name") as string) || file?.name || "Soutěž";
  const date = (formData.get("date") as string) || null;
  const location = (formData.get("location") as string) || null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Parse PDF server-side
  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    text = data.text;
  } catch (e) {
    return NextResponse.json({ error: "PDF parse failed: " + String(e) }, { status: 500 });
  }

  const categories = parseResultsText(text);
  if (categories.length === 0) {
    return NextResponse.json({ error: "Žádné výsledky nenalezeny v PDF." }, { status: 422 });
  }

  // Store competition
  const { data: comp, error: compErr } = await supabase
    .from("competitions")
    .insert({ name, date, location, filename: file.name, created_by: user.id })
    .select()
    .single();
  if (compErr) return NextResponse.json({ error: compErr.message }, { status: 500 });

  // Store categories + results
  for (const cat of categories) {
    const { data: catRow, error: catErr } = await supabase
      .from("categories")
      .insert({ competition_id: comp.id, name: cat.name })
      .select()
      .single();
    if (catErr) continue;

    const rows = cat.athletes.map((a: ParsedAthlete) => ({
      category_id: catRow.id,
      rank: a.rank,
      name: a.name,
      birth_year: a.year,
      club: a.club || null,
      coach: a.coach || null,
      preskok_d: a.disciplines[0].D, preskok_e: a.disciplines[0].E, preskok_pen: a.disciplines[0].pen, preskok_total: a.disciplines[0].total,
      bradla_d:  a.disciplines[1].D, bradla_e:  a.disciplines[1].E, bradla_pen:  a.disciplines[1].pen, bradla_total:  a.disciplines[1].total,
      kladina_d: a.disciplines[2].D, kladina_e: a.disciplines[2].E, kladina_pen: a.disciplines[2].pen, kladina_total: a.disciplines[2].total,
      prostna_d: a.disciplines[3].D, prostna_e: a.disciplines[3].E, prostna_pen: a.disciplines[3].pen, prostna_total: a.disciplines[3].total,
      celkem: a.celkem,
    }));

    await supabase.from("results").insert(rows);
  }

  return NextResponse.json({ id: comp.id, categories: categories.length });
}
