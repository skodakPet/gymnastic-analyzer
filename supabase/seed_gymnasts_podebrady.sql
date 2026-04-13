-- =====================================================
-- Gymnast profily: T.J. Sokol Poděbrady
-- Propojí existující výsledky v DB přes gymnast_id
-- =====================================================

-- Krok 1: Tým
INSERT INTO teams (name)
VALUES ('T.J. Sokol Poděbrady')
ON CONFLICT (name) DO NOTHING;

-- Krok 2: Profily gymnastek (příjmení + jméno, ročník)
WITH team AS (
  SELECT id FROM teams WHERE name = 'T.J. Sokol Poděbrady'
)
INSERT INTO gymnasts (first_name, last_name, birth_year, team_id)
SELECT g.first_name, g.last_name, g.birth_year, team.id
FROM team, (VALUES
  ('Jorika',  'Holzerová',    2020),
  ('Ester',   'Mikluščáková', 2020),
  ('Edita',   'Černovská',    2020),
  ('Sofie',   'Škodová',      2020),
  ('Emma',    'Buřičová',     2020),
  ('Eliška',  'Malá',         2020),
  ('Amálka',  'Šíbová',       2020),
  ('Julie',   'Richterová',   2020)
) AS g(first_name, last_name, birth_year)
ON CONFLICT (first_name, last_name, birth_year) DO NOTHING;

-- Krok 3: Prolinkovat výsledky
-- Výsledky mají name ve formátu "Příjmení Jméno" (shodně se seed skriptem)
UPDATE results r
SET gymnast_id = g.id
FROM gymnasts g
JOIN teams t ON g.team_id = t.id
WHERE t.name       = 'T.J. Sokol Poděbrady'
  AND r.name       = g.last_name || ' ' || g.first_name
  AND r.club       = 'T.J. Sokol Poděbrady'
  AND r.gymnast_id IS NULL;

-- Ověření: počet prolinkovaných výsledků
SELECT count(*) AS prolinkované_výsledky
FROM results
WHERE club       = 'T.J. Sokol Poděbrady'
  AND gymnast_id IS NOT NULL;
