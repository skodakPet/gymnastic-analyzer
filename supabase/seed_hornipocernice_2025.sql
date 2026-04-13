-- =====================================================
-- Import: 45. ročník závodu Váza Horních Počernic
-- Datum: 14.12.2025
-- Zdroj: Horní počernice.pdf
-- Kategorie: vložený závod mimi C (18 závodnic)
-- Aparáty: kladina (1. sloupec), prostná (2. sloupec)
-- =====================================================

-- Krok 1: Soutěž
INSERT INTO competitions (name, date, location)
VALUES (
  '45. ročník závodu Váza Horních Počernic',
  '2025-12-14',
  'Horní Počernice'
)
ON CONFLICT (name, date) DO NOTHING;

-- Krok 2: Výsledky mimi C
WITH comp AS (
  SELECT id FROM competitions
  WHERE name  = '45. ročník závodu Váza Horních Počernic'
    AND date  = '2025-12-14'
)
INSERT INTO results (
  competition_id, name, club, birth_year, category, rank,
  kladina_d, kladina_e, kladina_pen, kladina_total,
  prostna_d, prostna_e, prostna_pen, prostna_total,
  celkem
)
SELECT
  comp.id,
  r.jmeno, r.oddil, r.rocnik, r.kategorie, r.poradi,
  r.kl_d, r.kl_e, r.kl_pen, r.kl_tot,
  r.pr_d, r.pr_e, r.pr_pen, r.pr_tot,
  r.celkem
FROM comp,
(VALUES
  ('Kořínková Ayla',     'TJ Doksy',                   2020, 'vložený závod mimi C',  1, 2.3, 8.950, 0.0, 11.250, 2.5, 8.800, 0.0, 11.300, 22.550),
  ('Zedníková Anna',     'TJ Doksy',                   2020, 'vložený závod mimi C',  2, 2.3, 8.300, 0.0, 10.600, 2.5, 8.600, 0.0, 11.100, 21.700),
  ('Petrášová Anna',     'TJ Doksy',                   2020, 'vložený závod mimi C',  3, 2.3, 8.100, 0.0, 10.400, 2.5, 8.100, 0.0, 10.600, 21.000),
  ('Menšíková Ella',     'TJ Sokol Horní Počernice',   2020, 'vložený závod mimi C',  4, 2.3, 7.950, 0.0, 10.250, 2.5, 7.933, 0.0, 10.433, 20.683),
  ('Hanzal Sara',        'SK Hradčany',                2020, 'vložený závod mimi C',  5, 2.3, 7.900, 0.0, 10.200, 2.5, 7.800, 0.0, 10.300, 20.500),
  ('Machačová Luisa',    'SK Hradčany',                2020, 'vložený závod mimi C',  6, 2.3, 7.950, 0.0, 10.250, 2.0, 7.566, 0.0,  9.566, 19.816),
  ('Holzerová Jorika',   'T.J. Sokol Poděbrady',       2020, 'vložený závod mimi C',  7, 2.3, 7.600, 0.0,  9.900, 2.5, 7.300, 0.0,  9.800, 19.700),
  ('Mikluščáková Ester', 'T.J. Sokol Poděbrady',       2020, 'vložený závod mimi C',  8, 2.3, 8.000, 0.0, 10.300, 2.0, 7.100, 0.0,  9.100, 19.400),
  ('Klečková Veronika',  'TJ Sokol Horní Počernice',   2020, 'vložený závod mimi C',  9, 2.3, 8.150, 0.0, 10.450, 2.0, 6.766, 0.0,  8.766, 19.216),
  ('Černovská Edita',    'T.J. Sokol Poděbrady',       2020, 'vložený závod mimi C', 10, 2.3, 7.850, 0.0, 10.150, 2.0, 6.900, 0.0,  8.900, 19.050),
  ('Škodová Sofie',      'T.J. Sokol Poděbrady',       2020, 'vložený závod mimi C', 11, 2.4, 7.550, 0.0,  9.950, 1.5, 7.566, 0.0,  9.066, 19.016),
  ('Buřičová Emma',      'T.J. Sokol Poděbrady',       2020, 'vložený závod mimi C', 12, 2.4, 7.050, 0.0,  9.450, 2.0, 7.266, 0.0,  9.266, 18.716),
  ('Pantovič Salomina',  'SK Hradčany',                2020, 'vložený závod mimi C', 13, 2.3, 7.000, 0.3,  9.000, 2.5, 6.800, 0.0,  9.300, 18.300),
  ('Lainová Nikola',     'TJ Sokol Horní Počernice',   2021, 'vložený závod mimi C', 14, 2.3, 7.400, 0.0,  9.700, 2.0, 6.533, 0.0,  8.533, 18.233),
  ('Malá Eliška',        'T.J. Sokol Poděbrady',       2020, 'vložený závod mimi C', 15, 1.8, 7.700, 2.0,  7.500, 2.5, 7.666, 0.0, 10.166, 17.666),
  ('Šíbová Amálka',      'T.J. Sokol Poděbrady',       2020, 'vložený závod mimi C', 16, 1.7, 8.000, 2.0,  7.700, 2.0, 7.333, 0.0,  9.333, 17.033),
  ('Richterová Julie',   'T.J. Sokol Poděbrady',       2020, 'vložený závod mimi C', 17, 1.8, 7.700, 2.0,  7.500, 2.0, 7.133, 0.0,  9.133, 16.633),
  ('Hloušková Evelin',   'GT Šestajovice',             2021, 'vložený závod mimi C', 18, 1.8, 7.400, 2.6,  6.600, 1.5, 6.833, 0.0,  8.333, 14.933)
) AS r(jmeno, oddil, rocnik, kategorie, poradi,
       kl_d, kl_e, kl_pen, kl_tot,
       pr_d, pr_e, pr_pen, pr_tot,
       celkem);
