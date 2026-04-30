# ASA KLS — Frontend-only version

## Hvad er gjort

Lovable Cloud / Supabase-tilkoblingen er fjernet. Appen kører nu i en ren frontend-only "demo-mode" og er klar til at få tilkoblet et nyt Supabase-projekt.

### Slettet
- `/app/frontend/src/integrations/supabase/` (gammel client + types)
- `/app/frontend/supabase/functions/` (edge functions)
- `/app/frontend/supabase/config.toml`
- `lovable-tagger` (devDependency + vite plugin)
- `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` fra `.env`

### Bevaret
- Hele design (login, dashboard, alle 14 sider)
- Hele feature-lag (UI/komponenter, routing, role-based access)
- `@supabase/supabase-js` som dependency (klar til genbrug)
- `/app/frontend/supabase/migrations/` — alle 21 SQL-migration-filer (til at oprette tabel-strukturen i nyt Supabase-projekt)

### Tilføjet
- `/app/frontend/src/lib/backend-stub.ts` — placeholder-klient der efterligner Supabase-API'et:
  - `auth.signInWithPassword/signUp/signOut/getSession/onAuthStateChange` — fungerer mod `localStorage`
  - `from(table).select()...` → `{ data: [], error: null }`
  - `from(table).insert/update/delete` → `{ error: { message: "Backend skal opsættes ..." } }`
  - `storage`, `functions`, `channel`, `removeChannel` — venlige no-ops
  - Indeholder fuld trin-for-trin guide som top-kommentar til hvordan et nyt Supabase-projekt tilkobles
- `/app/frontend/src/components/BackendStubBanner.tsx` — gult/orange advarselsbanner i toppen
- `start`-script i `package.json` (`vite --host 0.0.0.0 --port 3000`) til supervisor

### Demo-login
- Login accepterer enhver email/adgangskode.
- `admin@*` eller `*kontor*` → admin/kontor-rolle.
- Alle andre → medarbejder-rolle.
- Login-toggle "Kontor" tjekker emailen og giver venlig fejl hvis ikke admin-email.

## Sådan tilkobler du et nyt Supabase-projekt
Se top-kommentaren i `/app/frontend/src/lib/backend-stub.ts` for fuld 7-trins guide.
Kort version:
1. Opret Supabase-projekt
2. Kør SQL-filerne fra `/app/frontend/supabase/migrations/` i kronologisk rækkefølge
3. Sæt `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` i `.env`
4. Genopret `src/integrations/supabase/client.ts` (kode-eksempel i kommentaren)
5. Søg-erstat alle imports `@/lib/backend-stub` → `@/integrations/supabase/client`
6. Slet `backend-stub.ts` og `<BackendStubBanner />`-mountet i `AppLayout.tsx`
