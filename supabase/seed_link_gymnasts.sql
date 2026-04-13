-- =====================================================
-- Propojení gymnast_id pro T.J. Sokol Poděbrady
-- Krok 1: nové profily (nejsou v gymnasts)
-- Krok 2: UPDATE všech null gymnast_id
-- =====================================================

-- Krok 1: Nové profily gymnastek
WITH team AS (
  SELECT id FROM teams WHERE name = 'T.J. Sokol Poděbrady'
)
INSERT INTO gymnasts (first_name, last_name, birth_year, team_id)
SELECT g.first_name, g.last_name, g.birth_year, team.id
FROM team, (VALUES
  ('Ema',   'Větrovská',  2010),
  ('Anna',  'Blažková',   2009),
  ('Emma',  'Bénová',     2010),
  ('Lilly', 'Bartheldy',  2020)
) AS g(first_name, last_name, birth_year)
ON CONFLICT (first_name, last_name, birth_year) DO NOTHING;

-- Krok 2: Prolinkovat VŠECHNY null záznamy T.J. Sokol Poděbrady
-- (existující i nově vytvořené profily)
UPDATE results r
SET gymnast_id = g.id
FROM gymnasts g
JOIN teams t ON g.team_id = t.id
WHERE t.name      = 'T.J. Sokol Poděbrady'
  AND r.name      = g.last_name || ' ' || g.first_name
  AND r.club      = 'T.J. Sokol Poděbrady'
  AND r.gymnast_id IS NULL;

-- Ověření: kolik záznamů zůstalo bez propojení
SELECT count(*) AS stale_null
FROM results
WHERE club       = 'T.J. Sokol Poděbrady'
  AND gymnast_id IS NULL;
