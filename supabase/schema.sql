-- ============================================================
-- GymAnalyze — Supabase schema v2 (profilová architektura)
-- Spusťte v Supabase: SQL Editor → New query → paste → Run
-- ============================================================

-- ============================================================
-- Pomocné rozšíření
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Migrace: smazání starých tabulek (CASCADE odstraní i FK závislosti)
-- Pořadí: results → categories → (competitions se zachová, jen přidáme constraint)
-- ============================================================
DROP TABLE IF EXISTS results    CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Přidat UNIQUE constraint na competitions (pokud ještě neexistuje)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'competitions_name_date_key' AND conrelid = 'competitions'::regclass
  ) THEN
    ALTER TABLE competitions ADD CONSTRAINT competitions_name_date_key UNIQUE (name, date);
  END IF;
END $$;

-- ============================================================
-- Tabulky
-- ============================================================

-- Týmy / skupiny v oddíle
CREATE TABLE IF NOT EXISTS teams (
  id    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name  TEXT UNIQUE NOT NULL
);

-- Profily gymnastek (pouze z domovského oddílu)
CREATE TABLE IF NOT EXISTS gymnasts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  birth_year  INTEGER,
  team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (first_name, last_name, birth_year)
);

-- Soutěže
CREATE TABLE IF NOT EXISTS competitions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  date        DATE,
  location    TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (name, date)
);

-- Výsledky — jedna řádka = jeden závodník v jedné soutěži
-- gymnast_id je NULL pro závodnice z cizích oddílů (potřebné pro what-if porovnání)
CREATE TABLE IF NOT EXISTS results (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id  UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  gymnast_id      UUID REFERENCES gymnasts(id) ON DELETE SET NULL,  -- NULL = cizí oddíl
  name            TEXT NOT NULL,
  club            TEXT,
  coach           TEXT,
  birth_year      INTEGER,
  category        TEXT NOT NULL,  -- např. "I. kategorie"
  rank            INTEGER,

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
ALTER TABLE teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gymnasts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results      ENABLE ROW LEVEL SECURITY;

-- Smazat stávající policies (pokud existují z předchozí verze)
DROP POLICY IF EXISTS "competitions_select" ON competitions;
DROP POLICY IF EXISTS "competitions_insert" ON competitions;
DROP POLICY IF EXISTS "competitions_delete" ON competitions;
-- categories policies jsou smazány automaticky přes DROP TABLE categories CASCADE výše
DROP POLICY IF EXISTS "results_select"      ON results;
DROP POLICY IF EXISTS "results_insert"      ON results;
DROP POLICY IF EXISTS "results_update"      ON results;
DROP POLICY IF EXISTS "results_delete"      ON results;
DROP POLICY IF EXISTS "teams_select"        ON teams;
DROP POLICY IF EXISTS "teams_insert"        ON teams;
DROP POLICY IF EXISTS "teams_delete"        ON teams;
DROP POLICY IF EXISTS "gymnasts_select"     ON gymnasts;
DROP POLICY IF EXISTS "gymnasts_insert"     ON gymnasts;
DROP POLICY IF EXISTS "gymnasts_update"     ON gymnasts;
DROP POLICY IF EXISTS "gymnasts_delete"     ON gymnasts;

-- Teams & gymnasts: čtení pro všechny, zápis/mazání jen pro přihlášené
CREATE POLICY "teams_select"    ON teams    FOR SELECT USING (true);
CREATE POLICY "teams_insert"    ON teams    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "teams_delete"    ON teams    FOR DELETE TO authenticated USING (true);

CREATE POLICY "gymnasts_select" ON gymnasts FOR SELECT USING (true);
CREATE POLICY "gymnasts_insert" ON gymnasts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "gymnasts_update" ON gymnasts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "gymnasts_delete" ON gymnasts FOR DELETE TO authenticated USING (true);

-- Soutěže: čtení pro všechny, zápis/mazání jen pro vlastníka
CREATE POLICY "competitions_select" ON competitions FOR SELECT USING (true);
CREATE POLICY "competitions_insert" ON competitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "competitions_delete" ON competitions FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Výsledky: čtení pro všechny, zápis/mazání jen pro přihlášené
CREATE POLICY "results_select" ON results FOR SELECT USING (true);
CREATE POLICY "results_insert" ON results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "results_update" ON results FOR UPDATE TO authenticated USING (true);
CREATE POLICY "results_delete" ON results FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM competitions c
    WHERE c.id = competition_id AND c.created_by = auth.uid()
  )
);

-- ============================================================
-- Indexy
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_results_competition ON results(competition_id);
CREATE INDEX IF NOT EXISTS idx_results_gymnast     ON results(gymnast_id);
CREATE INDEX IF NOT EXISTS idx_results_category    ON results(category);
CREATE INDEX IF NOT EXISTS idx_results_club        ON results(club);
CREATE INDEX IF NOT EXISTS idx_results_name        ON results(name);
CREATE INDEX IF NOT EXISTS idx_gymnasts_name       ON gymnasts(last_name, first_name);
