-- ============================================================
-- GymAnalyze — Supabase schema
-- Spusťte v Supabase: SQL Editor → New query → paste → Run
-- ============================================================

-- Tabulka soutěží
CREATE TABLE IF NOT EXISTS competitions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  date        DATE,
  location    TEXT,
  filename    TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabulka kategorií v rámci soutěže
CREATE TABLE IF NOT EXISTS categories (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id  UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tabulka výsledků (jedna řádka = jeden závodník)
CREATE TABLE IF NOT EXISTS results (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id     UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  rank            INTEGER,
  name            TEXT NOT NULL,
  birth_year      INTEGER,
  club            TEXT,
  coach           TEXT,

  -- Přeskok
  preskok_d       NUMERIC(5,3),
  preskok_e       NUMERIC(5,3),
  preskok_pen     NUMERIC(5,3),
  preskok_total   NUMERIC(6,3),

  -- Bradla
  bradla_d        NUMERIC(5,3),
  bradla_e        NUMERIC(5,3),
  bradla_pen      NUMERIC(5,3),
  bradla_total    NUMERIC(6,3),

  -- Kladina
  kladina_d       NUMERIC(5,3),
  kladina_e       NUMERIC(5,3),
  kladina_pen     NUMERIC(5,3),
  kladina_total   NUMERIC(6,3),

  -- Prostná
  prostna_d       NUMERIC(5,3),
  prostna_e       NUMERIC(5,3),
  prostna_pen     NUMERIC(5,3),
  prostna_total   NUMERIC(6,3),

  celkem          NUMERIC(7,3),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE results      ENABLE ROW LEVEL SECURITY;

-- Soutěže: každý přihlášený vidí vše, mazat může jen tvůrce
CREATE POLICY "competitions_select" ON competitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "competitions_insert" ON competitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "competitions_delete" ON competitions FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Kategorie a výsledky: sdílené napříč přihlášenými uživateli
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "categories_delete" ON categories FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM competitions c WHERE c.id = competition_id AND c.created_by = auth.uid())
);

CREATE POLICY "results_select" ON results FOR SELECT TO authenticated USING (true);
CREATE POLICY "results_insert" ON results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "results_delete" ON results FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM categories cat
    JOIN competitions c ON c.id = cat.competition_id
    WHERE cat.id = category_id AND c.created_by = auth.uid()
  )
);

-- ============================================================
-- Indexy pro rychlé dotazy
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_categories_competition ON categories(competition_id);
CREATE INDEX IF NOT EXISTS idx_results_category      ON results(category_id);
CREATE INDEX IF NOT EXISTS idx_results_name          ON results(name);
CREATE INDEX IF NOT EXISTS idx_results_club          ON results(club);
