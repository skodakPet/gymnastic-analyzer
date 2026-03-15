# GymAnalyze 🤸‍♀️

Webová aplikace pro analýzu gymnasticých výsledkových listin. Nahrát PDF → okamžitá analýza závodníků, coaching feedback, filtrování dle oddílu.

## Stack
- **Next.js 15** (App Router, TypeScript)
- **Supabase** (PostgreSQL databáze + Auth)
- **Tailwind CSS**
- **pdf-parse** (server-side PDF parsing)

---

## 1. Nastavení Supabase

1. Jděte na [supabase.com](https://supabase.com) → **New project**
2. Po vytvoření projektu: **SQL Editor** → **New query** → vložte obsah `supabase/schema.sql` → **Run**
3. V **Project Settings → API** zkopírujte:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` klíč → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. V **Authentication → URL Configuration** nastavte:
   - Site URL: `https://vase-domena.vercel.app`
   - Redirect URLs: `https://vase-domena.vercel.app/api/auth/callback`

---

## 2. Lokální vývoj

```bash
# 1. Klonujte / rozbalte projekt
cd gym-analyzer

# 2. Nainstalujte závislosti
npm install

# 3. Vytvořte .env.local ze šablony
cp .env.example .env.local
# → Doplňte Supabase URL a klíče

# 4. Spusťte dev server
npm run dev
# → http://localhost:3000
```

---

## 3. Nasazení na Vercel

### Způsob A — Přes GitHub (doporučeno)
1. Nahrajte projekt na GitHub
2. [vercel.com](https://vercel.com) → **Add New Project** → importujte repo
3. V sekci **Environment Variables** přidejte:
   ```
   NEXT_PUBLIC_SUPABASE_URL    = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```
4. Klikněte **Deploy** — hotovo! ✅

### Způsob B — Přes Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
# Při prvním spuštění budete vyzváni k nastavení env proměnných
```

---

## 4. Struktura projektu

```
gym-analyzer/
├── app/
│   ├── page.tsx                    # Dashboard — seznam soutěží
│   ├── login/page.tsx              # Přihlášení
│   ├── register/page.tsx           # Registrace
│   ├── upload/page.tsx             # Nahrání PDF
│   ├── competitions/[id]/page.tsx  # Detail soutěže s analýzou
│   └── api/
│       ├── upload/route.ts         # API: parse PDF + uložit do DB
│       └── auth/                   # Auth callback + signout
├── components/
│   └── CompetitionView.tsx         # Hlavní analytics UI (client)
├── lib/
│   ├── parser.ts                   # Parser PDF textu → strukturovaná data
│   ├── analytics.ts                # Rankings, coaching feedback
│   ├── types.ts                    # TypeScript typy
│   └── supabase/                   # Supabase klienti (server + browser)
├── supabase/
│   └── schema.sql                  # Databázové schéma
└── middleware.ts                   # Auth ochrana routes
```

---

## 5. Jak přidat novou soutěž

1. Přihlaste se → klikněte **+ Nahrát PDF**
2. Přetáhněte PDF výsledkovou listinu
3. Vyplňte název, datum a místo
4. Klikněte **Nahrát a analyzovat**
5. Aplikace automaticky rozpozná kategorie a závodníky

---

## 6. Rozšíření do budoucna

- **Historické porovnání**: grafem sledovat vývoj závodníka napříč soutěžemi
- **Export reportu**: PDF report pro rodiče/závodníka
- **Push notifikace**: upozornění na nové výsledky
- **Týmové účty**: sdílení dat v rámci oddílu
