#!/usr/bin/env python3
"""
Generátor SQL seedů pro soutěže:
  - 8. ročník závodu Poděbradská cvička - ženy (14.3.2026)
  - Memoriál Evy Bosákové / VS mini,0,1 (11.4.2026)
Výstup: supabase/seed_remaining_competitions.sql
"""

import pdfplumber
import re

# ── helpers ────────────────────────────────────────────────────────────────────

def esc(v):
    if v is None or str(v).strip() == '':
        return 'NULL'
    return "'" + str(v).replace("'", "''").strip() + "'"

def num(v):
    if v is None or str(v).strip() == '':
        return 'NULL'
    return str(v).replace(',', '.')

def row_sql(rank, name, club, coach, birth_year, category,
            pr, br, kl, fl, celkem):
    """Single INSERT values tuple for results table."""
    def ap(t):
        if t is None:
            return 'NULL, NULL, NULL, NULL'
        d, e, p, tot = t
        return f'{num(d)}, {num(e)}, {num(p)}, {num(tot)}'
    return (
        f"  ({esc(name)}, {esc(club)}, {esc(coach)}, "
        f"{num(birth_year) if birth_year else 'NULL'}, {esc(category)}, {rank},\n"
        f"   {ap(pr)},\n"
        f"   {ap(br)},\n"
        f"   {ap(kl)},\n"
        f"   {ap(fl)},\n"
        f"   {num(celkem)})"
    )

# ── Poděbradská cvička – table extraction ──────────────────────────────────────

KNOWN_CLUBS = sorted([
    'T.J. Sokol Poděbrady', 'T.J. Sokol Kampa', 'T.J. Sokol Moravský Krumlov',
    'TJ Sokol Horní Počernice', 'TJ Bohemians Praha', 'SK Hradčany',
    'GT Šestajovice', 'KSG Litvínov', 'KSG Znojmo', 'GK Domažlice',
    'GK Vítkovice', 'Gym Dobřichovice', 'Merkur ČB', 'TJ Slovan Praha',
    'SGC Ostrava', 'TJ Sokol', 'Lokomotiva', 'ČSG', 'TJ Duksy', 'TJ Doksy',
    'Gymnastika Říčany', 'Spartak', 'Slavia', 'ZŠ', 'Dynamo',
], key=len, reverse=True)

def split_club_coach(s):
    s = s.strip()
    for club in KNOWN_CLUBS:
        if s.lower().startswith(club.lower()):
            coach = s[len(club):].strip()
            return club, coach
    # fallback: split at first name-like word after known prefix
    for prefix in ['T.J.', 'TJ ', 'GT ', 'SK ', 'GK ', 'KSG ', 'SGC ', 'Gym ']:
        if s.startswith(prefix):
            words = s.split()
            # heuristic: club = first 3 words
            club = ' '.join(words[:3])
            coach = ' '.join(words[3:])
            return club, coach
    return s, ''

def get_category_name(text):
    """Extract 'X. kategorie - VS6B' from page header text."""
    for line in text.split('\n'):
        line = line.strip()
        m = re.match(r'^([IVX]+\. kategorie[^H\n]*?)(?:\s+Hlavní|$)', line)
        if m:
            return m.group(1).strip()
    return 'neznámá'

def parse_cvicka():
    rows = []
    with pdfplumber.open('Poděbradská cvička.pdf') as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ''
            category = get_category_name(text)
            tables = page.extract_tables()
            for table in tables:
                if not table or len(table) < 2:
                    continue
                ncols = len(table[0])
                for r in table[1:]:
                    if not r[0] or not str(r[0]).strip().isdigit():
                        continue
                    rank = int(r[0])
                    name  = (r[1] or '').replace('\n', ' ').strip()
                    roč   = r[2]
                    club  = (r[3] or '').replace('\n', ' ').strip()
                    coach = (r[4] or '').replace('\n', ' ').strip()
                    try:
                        birth_year = int(roč) if roč and str(roč).strip().isdigit() else None
                    except Exception:
                        birth_year = None

                    if ncols == 22:  # 4 aparáty: přeskok, bradla, kladina, prostná
                        pr = (r[5],  r[6],  r[7],  r[8])
                        br = (r[9],  r[10], r[11], r[12])
                        kl = (r[13], r[14], r[15], r[16])
                        fl = (r[17], r[18], r[19], r[20])
                        celkem = r[21]
                    elif ncols == 18:  # 3 aparáty: bradla, kladina, prostná
                        pr = None
                        br = (r[5],  r[6],  r[7],  r[8])
                        kl = (r[9],  r[10], r[11], r[12])
                        fl = (r[13], r[14], r[15], r[16])
                        celkem = r[17]
                    else:
                        continue

                    rows.append(row_sql(rank, name, club, coach, birth_year,
                                        category, pr, br, kl, fl, celkem))
    return rows

# ── Praha Strahov – text extraction ───────────────────────────────────────────

STRAHOV_PAGES = {
    # page_index (0-based): (category_name, app1_field, app2_field)
    6:  ('Evičky',  'kladina', 'prostna'),
    7:  ('Evísci',  'kladina', 'prostna'),
    8:  ('Evulinky','kladina', 'prostna'),
    9:  ('VS mini', 'bradla',  'prostna'),
    10: ('VS 0',    'bradla',  'prostna'),
    11: ('VS 1',    'bradla',  'prostna'),
    12: ('VS 1',    'bradla',  'prostna'),  # continuation
}

def parse_strahov_line(line, category, app1_field, app2_field):
    """Parse one competitor line from Praha Strahov text."""
    rank_m = re.match(r'^(\d+)\.', line.strip())
    if not rank_m:
        return None
    rank = int(rank_m.group(1))

    # All 3-decimal floats = scores (ignoring birth year, which has no decimal)
    all_nums = re.findall(r'\d+\.\d{3}', line)
    if len(all_nums) < 9:
        return None
    scores = all_nums[-9:]  # D1 E1 pen1 tot1  D2 E2 pen2 tot2  celkem

    # Birth year
    year_m = re.search(r'20(?:1[0-9]|2[0-9])', line)
    birth_year = int(year_m.group()) if year_m else None

    # Name: between rank end and birth year start
    name_start = rank_m.end()
    name_end   = year_m.start() if year_m else len(line)
    name = line[name_start:name_end].strip()

    # Club + coach: between birth year end and first score in raw string
    if year_m:
        after_year = line[year_m.end():]
        first_score_m = re.search(r'\d+\.\d{3}', after_year)
        club_coach_raw = after_year[:first_score_m.start()].strip() if first_score_m else ''
    else:
        club_coach_raw = ''

    club, coach = split_club_coach(club_coach_raw)

    # Map apparatus
    ap1 = tuple(scores[0:4])
    ap2 = tuple(scores[4:8])
    celkem = scores[8]

    mapping = {'preskok': None, 'bradla': None, 'kladina': None, 'prostna': None}
    mapping[app1_field] = ap1
    mapping[app2_field] = ap2

    return row_sql(rank, name, club, coach, birth_year, category,
                   mapping['preskok'], mapping['bradla'],
                   mapping['kladina'], mapping['prostna'], celkem)

def parse_strahov():
    rows = []
    with pdfplumber.open('Praha Strahov.pdf') as pdf:
        for pg_idx, (cat, app1, app2) in STRAHOV_PAGES.items():
            text = pdf.pages[pg_idx].extract_text() or ''
            for line in text.split('\n'):
                result = parse_strahov_line(line, cat, app1, app2)
                if result:
                    rows.append(result)
    return rows

# ── SQL output ────────────────────────────────────────────────────────────────

def write_sql(cvicka_rows, strahov_rows):
    lines = []

    lines.append("-- ============================================================")
    lines.append("-- Seed: zbývající soutěže")
    lines.append("-- Generováno: generate_seeds.py")
    lines.append("-- ============================================================")
    lines.append("")

    # Competition 1: Poděbradská cvička
    lines.append("-- ── 1. Poděbradská cvička ──────────────────────────────────")
    lines.append("INSERT INTO competitions (name, date, location)")
    lines.append("VALUES ('8. ročník závodu Poděbradská cvička - ženy', '2026-03-14', 'Poděbrady')")
    lines.append("ON CONFLICT (name, date) DO NOTHING;")
    lines.append("")
    lines.append("WITH comp AS (")
    lines.append("  SELECT id FROM competitions")
    lines.append("  WHERE name = '8. ročník závodu Poděbradská cvička - ženy'")
    lines.append("    AND date = '2026-03-14'")
    lines.append(")")
    lines.append("INSERT INTO results (")
    lines.append("  competition_id, name, club, coach, birth_year, category, rank,")
    lines.append("  preskok_d, preskok_e, preskok_pen, preskok_total,")
    lines.append("  bradla_d, bradla_e, bradla_pen, bradla_total,")
    lines.append("  kladina_d, kladina_e, kladina_pen, kladina_total,")
    lines.append("  prostna_d, prostna_e, prostna_pen, prostna_total,")
    lines.append("  celkem")
    lines.append(")")
    lines.append("SELECT comp.id, r.name, r.club, r.coach, r.birth_year::integer, r.category, r.rank::integer,")
    lines.append("  r.preskok_d::numeric, r.preskok_e::numeric, r.preskok_pen::numeric, r.preskok_total::numeric,")
    lines.append("  r.bradla_d::numeric,  r.bradla_e::numeric,  r.bradla_pen::numeric,  r.bradla_total::numeric,")
    lines.append("  r.kladina_d::numeric, r.kladina_e::numeric, r.kladina_pen::numeric, r.kladina_total::numeric,")
    lines.append("  r.prostna_d::numeric, r.prostna_e::numeric, r.prostna_pen::numeric, r.prostna_total::numeric,")
    lines.append("  r.celkem::numeric")
    lines.append("FROM comp, (VALUES")

    for i, r in enumerate(cvicka_rows):
        sep = "," if i < len(cvicka_rows) - 1 else ""
        lines.append(r + sep)

    lines.append(") AS r(name, club, coach, birth_year, category, rank,")
    lines.append("        preskok_d, preskok_e, preskok_pen, preskok_total,")
    lines.append("        bradla_d, bradla_e, bradla_pen, bradla_total,")
    lines.append("        kladina_d, kladina_e, kladina_pen, kladina_total,")
    lines.append("        prostna_d, prostna_e, prostna_pen, prostna_total,")
    lines.append("        celkem);")
    lines.append("")

    # Competition 2: Praha Strahov (Memoriál)
    MEMORIAL_NAME = "Memoriál Evy Bosákové + závod pro nejmenší a vložený závod VS mini, VS0, VS1 a VS2"
    lines.append("-- ── 2. Praha Strahov (Memoriál) ────────────────────────────")
    lines.append(f"INSERT INTO competitions (name, date, location)")
    lines.append(f"VALUES ({esc(MEMORIAL_NAME)}, '2026-04-11', 'Praha - SK Hradčany')")
    lines.append("ON CONFLICT (name, date) DO NOTHING;")
    lines.append("")
    lines.append("WITH comp AS (")
    lines.append("  SELECT id FROM competitions")
    lines.append(f"  WHERE name = {esc(MEMORIAL_NAME)}")
    lines.append("    AND date = '2026-04-11'")
    lines.append(")")
    lines.append("INSERT INTO results (")
    lines.append("  competition_id, name, club, coach, birth_year, category, rank,")
    lines.append("  preskok_d, preskok_e, preskok_pen, preskok_total,")
    lines.append("  bradla_d, bradla_e, bradla_pen, bradla_total,")
    lines.append("  kladina_d, kladina_e, kladina_pen, kladina_total,")
    lines.append("  prostna_d, prostna_e, prostna_pen, prostna_total,")
    lines.append("  celkem")
    lines.append(")")
    lines.append("SELECT comp.id, r.name, r.club, r.coach, r.birth_year::integer, r.category, r.rank::integer,")
    lines.append("  r.preskok_d::numeric, r.preskok_e::numeric, r.preskok_pen::numeric, r.preskok_total::numeric,")
    lines.append("  r.bradla_d::numeric,  r.bradla_e::numeric,  r.bradla_pen::numeric,  r.bradla_total::numeric,")
    lines.append("  r.kladina_d::numeric, r.kladina_e::numeric, r.kladina_pen::numeric, r.kladina_total::numeric,")
    lines.append("  r.prostna_d::numeric, r.prostna_e::numeric, r.prostna_pen::numeric, r.prostna_total::numeric,")
    lines.append("  r.celkem::numeric")
    lines.append("FROM comp, (VALUES")

    for i, r in enumerate(strahov_rows):
        sep = "," if i < len(strahov_rows) - 1 else ""
        lines.append(r + sep)

    lines.append(") AS r(name, club, coach, birth_year, category, rank,")
    lines.append("        preskok_d, preskok_e, preskok_pen, preskok_total,")
    lines.append("        bradla_d, bradla_e, bradla_pen, bradla_total,")
    lines.append("        kladina_d, kladina_e, kladina_pen, kladina_total,")
    lines.append("        prostna_d, prostna_e, prostna_pen, prostna_total,")
    lines.append("        celkem);")

    return '\n'.join(lines)

# ── main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("Parsuji Poděbradská cvička.pdf...", flush=True)
    cvicka_rows = parse_cvicka()
    print(f"  → {len(cvicka_rows)} závodnic", flush=True)

    print("Parsuji Praha Strahov.pdf...", flush=True)
    strahov_rows = parse_strahov()
    print(f"  → {len(strahov_rows)} závodnic", flush=True)

    sql = write_sql(cvicka_rows, strahov_rows)
    out = 'supabase/seed_remaining_competitions.sql'
    with open(out, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f"Výstup: {out} ({len(sql)} znaků)", flush=True)
