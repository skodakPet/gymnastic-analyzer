-- ============================================================================
-- 20260509_auto_link_gymnasts.sql
--
-- Automatické párování results.gymnast_id na gymnasts.id přes triggery.
--
-- Důvod: do tohoto bodu se linkování dělalo jen ručním seed_link_gymnasts.sql.
-- Po vložení nového seedu (např. seed_dokska_kladina_2026.sql) bez následného
-- spuštění link skriptu zůstával gymnast_id u nových řádků NULL a profil
-- gymnastky pak ukazoval méně závodů, než kolik je v DB skutečně uložených.
--
-- Co dělá:
--   1) Funkce find_gymnast_id_for_result(name, club, birth_year)
--      vrátí UUID gymnasty pokud najde právě jednu shodu, jinak NULL.
--   2) BEFORE INSERT trigger na results — naplní gymnast_id pokud je NULL.
--      Pokud volající uvede explicit gymnast_id, trigger ho nepřepíše.
--   3) AFTER INSERT trigger na gymnasts — když přibude nová gymnastka,
--      dohledá jí všechny existující NULL výsledky.
--   4) Backfill — jednorázově napároví stávající NULL výsledky podle
--      aktuální tabulky gymnasts.
--
-- Idempotentní: lze pustit opakovaně, neudělá nic destruktivního.
-- ============================================================================

SET search_path = public;

-- ----------------------------------------------------------------------------
-- 1) Lookup funkce
-- ----------------------------------------------------------------------------
-- Match podmínky:
--   * birth_year se musí shodovat (jinak vrať NULL — nelze odhadnout)
--   * name se může shodovat ve dvou tvarech: "Příjmení Jméno" i "Jméno Příjmení"
--     (PDF zdroje používají různé pořadí)
--   * club musí odpovídat teams.name navázaného na gymnastu
--     (gymnasta bez team_id se páruje pouze pokud výsledek nemá club)
--   * vrátí UUID jen při právě jedné shodě — schéma má UNIQUE(first_name,
--     last_name, birth_year), takže duplicita jména v rámci ročníku je
--     vyloučená; tato pojistka je defensive pro edge cases.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_gymnast_id_for_result(
  p_name        TEXT,
  p_club        TEXT,
  p_birth_year  INTEGER
) RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[];
BEGIN
  IF p_name IS NULL OR p_birth_year IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(g.id) INTO v_ids
  FROM gymnasts g
  LEFT JOIN teams t ON g.team_id = t.id
  WHERE g.birth_year = p_birth_year
    AND (
         p_name = g.last_name  || ' ' || g.first_name
      OR p_name = g.first_name || ' ' || g.last_name
    )
    AND (t.name = p_club OR (t.name IS NULL AND p_club IS NULL));

  IF array_length(v_ids, 1) = 1 THEN
    RETURN v_ids[1];
  END IF;

  RETURN NULL;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2) BEFORE INSERT trigger na results
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.results_autolink_gymnast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.gymnast_id IS NULL THEN
    NEW.gymnast_id := public.find_gymnast_id_for_result(
      NEW.name, NEW.club, NEW.birth_year
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_results_autolink ON public.results;
CREATE TRIGGER trg_results_autolink
  BEFORE INSERT ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.results_autolink_gymnast();

-- ----------------------------------------------------------------------------
-- 3) AFTER INSERT trigger na gymnasts (zpětně napárovat osiřelé výsledky)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gymnasts_backfill_results()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_name TEXT;
BEGIN
  IF NEW.team_id IS NOT NULL THEN
    SELECT name INTO v_team_name FROM teams WHERE id = NEW.team_id;
  END IF;

  UPDATE results r
  SET gymnast_id = NEW.id
  WHERE r.gymnast_id IS NULL
    AND r.birth_year = NEW.birth_year
    AND (
         r.name = NEW.last_name  || ' ' || NEW.first_name
      OR r.name = NEW.first_name || ' ' || NEW.last_name
    )
    AND (r.club = v_team_name OR (v_team_name IS NULL AND r.club IS NULL));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gymnasts_backfill ON public.gymnasts;
CREATE TRIGGER trg_gymnasts_backfill
  AFTER INSERT ON public.gymnasts
  FOR EACH ROW
  EXECUTE FUNCTION public.gymnasts_backfill_results();

-- ----------------------------------------------------------------------------
-- 4) Backfill stávajících NULL výsledků
--    Aktualizujeme jen ty řádky, pro které existuje právě jedna shoda
--    v gymnasts (defensive — ambiguity necháme jako NULL).
-- ----------------------------------------------------------------------------
WITH candidate AS (
  SELECT
    r.id              AS result_id,
    array_agg(g.id)   AS gymnast_ids
  FROM results r
  JOIN gymnasts g ON g.birth_year = r.birth_year
  LEFT JOIN teams t ON g.team_id = t.id
  WHERE r.gymnast_id IS NULL
    AND r.birth_year IS NOT NULL
    AND (
         r.name = g.last_name  || ' ' || g.first_name
      OR r.name = g.first_name || ' ' || g.last_name
    )
    AND (t.name = r.club OR (t.name IS NULL AND r.club IS NULL))
  GROUP BY r.id
)
UPDATE results r
SET gymnast_id = (c.gymnast_ids)[1]
FROM candidate c
WHERE r.id = c.result_id
  AND array_length(c.gymnast_ids, 1) = 1;

-- ----------------------------------------------------------------------------
-- 5) Diagnostika (volitelně po migraci)
-- ----------------------------------------------------------------------------
-- Kolik výsledků zůstalo nepárovaných (nemělo by se po backfillu
-- zmenšovat, pokud nepřibyli nějací cizí závodníci):
--   SELECT count(*) AS stale_null FROM results WHERE gymnast_id IS NULL;
--
-- Domácí (T.J. Sokol Poděbrady) výsledky bez napárování — pokud > 0,
-- pravděpodobně neshoda zápisu jména nebo chybí gymnasta v gymnasts:
--   SELECT r.id, r.name, r.club, r.birth_year, c.name AS competition
--   FROM results r LEFT JOIN competitions c ON r.competition_id = c.id
--   WHERE r.club = 'T.J. Sokol Poděbrady' AND r.gymnast_id IS NULL;
