-- ============================================================================
-- 20260509_normalize_vs_mini_category.sql
--
-- Sjednocení všech variant názvu kategorie pro VS-mini (ročník 2020) na
-- jednotný tvar 'vs-mini'.
--
-- Stávající varianty v DB:
--   * 'VS0-mini'                 (seed_dokska_kladina_2026.sql)
--   * 'VS mini'                  (seed_remaining_competitions.sql)
--   * 'vložený závod mimi C'     (seed_hornipocernice_2025.sql)
--   * 'II. kategorie'            (seed_remaining_competitions.sql) — POZOR generický
--
-- Strategie:
--   1) První 3 tvary jsou jednoznačně mimi/VS → globální přepis bez filtru.
--   2) 'II. kategorie' je v různých závodech označením pro různé věkové
--      skupiny (i ročníky 2013, 2018, …). Přepis JEN pro birth_year = 2020,
--      kde víme, že jde o vs-mini.
--
-- Idempotentní: lze pustit opakovaně.
-- ============================================================================

SET search_path = public;

-- ----------------------------------------------------------------------------
-- 1) Globální sjednocení jednoznačně mimi/VS tvarů
-- ----------------------------------------------------------------------------
UPDATE results
SET category = 'vs-mini'
WHERE category IN ('VS0-mini', 'VS mini', 'vložený závod mimi C');

-- ----------------------------------------------------------------------------
-- 2) 'II. kategorie' jen pro ročník 2020
-- ----------------------------------------------------------------------------
UPDATE results
SET category = 'vs-mini'
WHERE category = 'II. kategorie'
  AND birth_year = 2020;

-- ----------------------------------------------------------------------------
-- 3) Diagnostika (volitelné — spusť samostatně po migraci)
-- ----------------------------------------------------------------------------
-- Kolik řádků má teď kategorii 'vs-mini'?
--   SELECT count(*) FROM results WHERE category = 'vs-mini';
--
-- Zkontroluj, jestli ještě někde nezbyla některá ze starých variant
-- (mělo by vrátit 0 řádků pro varianty 1–3, případně řádky pro
-- 'II. kategorie' v jiných ročnících než 2020 — to je OK):
--   SELECT category, birth_year, count(*)
--   FROM results
--   WHERE category IN ('VS0-mini', 'VS mini', 'vložený závod mimi C', 'II. kategorie')
--   GROUP BY category, birth_year
--   ORDER BY category, birth_year;
