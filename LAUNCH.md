# LAUNCH.md — from zero to a live backend in one sitting

Everything below is prepared and waiting. The only step that cannot be done in
advance is creating the Supabase project, because both free-tier slots in the
MONZA S.A.L. org are occupied by production projects (Monza SAL APP, Monza
Parts WMS). **Decision needed: upgrade the org to Pro, or create a separate
free organization for the gym.** Everything after that decision is mechanical.

## What is already prepared (this repo)

| Artifact | Purpose |
|---|---|
| `supabase/migrations/0001–0003` | V1: members, devices, plans, subscriptions, gym sessions with anti-passback, entry tokens, staff, trainers, classes, meal plans, notifications, audit log — plus RLS and access RPCs |
| `supabase/migrations/0004` | V2: wallet + loyalty ledgers, cafe orders, health facts (provenance + precedence), incidents/SOS, assets + work orders, pool-lane bookings with a DB-level no-double-booking constraint, guest passes, lockers, support tickets, payments, leads, invoices, vehicles/family, `app_events` realtime stream |
| `supabase/migrations/0005` | RLS for every V2 table (members see their own rows, staff role-gated, ledgers/events are read-only for clients) |
| `supabase/migrations/0006` | Server-side rules: atomic wallet debit, server-priced cafe orders with legal status transitions, role-scoped `health_facts_for()` mirroring the demo's visibility matrix, SOS + incident close-requires-report, safety reports auto-isolating equipment, guest-pass quotas, atomic locker assignment, `export_my_data()`, `request_account_deletion()` |
| `supabase/functions/issue-entry-token`, `verify-entry` | Gate token issue/verify Edge Functions (V1) |
| `supabase/seed.sql` | The demo world (9 members, 7 staff, plans, assets, classes, health facts, menu, opening balances) with fixed UUIDs and `legacy_id` mapping to the old `mbr_/stf_/ast_` ids — **staging/demo project only** |
| `member-app/` | Expo member app expecting `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`.env.example`) |
| `web-demo/config.js` | Backend switch declaration for the web dashboards (`mode: 'demo'` / `'live'`). Honest status: no page reads it yet — the live-mode wiring is the "migrate dashboards to Supabase" slice, done page by page after launch |

## Launch day, in order

1. **Create the project** (the one manual decision):
   - Pro route: upgrade org `dndzqonzcclbfiduzcla` → New project `gym-app`, region `eu-central-1`.
   - Free route: create a new Supabase organization → New project `gym-app`.
2. **Link and push the schema** from the repo root:
   ```
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push
   ```
   This applies 0001→0006 in order. Expected result: ~45 tables/enums, RLS
   enabled everywhere, all RPCs present.
3. **Seed (staging/demo only):** paste `supabase/seed.sql` into the SQL editor
   (or `psql $DB_URL -f supabase/seed.sql`). Skip entirely for a production
   project — real members arrive through onboarding.
4. **Deploy the gate Edge Functions — the secret comes FIRST** (both
   functions hard-require it and will 500 without it):
   ```
   npx supabase secrets set ENTRY_TOKEN_SECRET=<random string, 32+ chars>
   npx supabase functions deploy issue-entry-token
   npx supabase functions deploy verify-entry
   ```
   Then provision the gate device key (the seeded gate has none, so every
   scan would return `gate_unauthorized`). Pick a key, give it to the gate
   device, and store its SHA-256 in the SQL editor:
   ```sql
   create extension if not exists pgcrypto;
   update gates set api_key_hash = encode(digest('<the key>', 'sha256'), 'hex')
   where name = 'Main entrance';
   ```
5. **Point the Expo app:** copy `member-app/.env.example` → `.env`, fill URL +
   anon key from Settings → API, then `npx expo start`.
6. **Auth bootstrap:** Dashboard → Authentication → invite the staff emails;
   set each `staff.user_id` (and later `members.user_id`) to the created auth
   user ids. Until a row is linked, that person simply cannot log in — safe
   default.
7. **Retire the Google Sheet (F-SEC-0 closes here):**
   - Back up the sheet (File → Make a copy) — **do not** edit the original
     before the backup exists.
   - Delete the password column, then turn off link sharing.
   - Ask every member to set a fresh password on first login (Supabase Auth
     reset flow). Treat every password that ever sat in that sheet as burned.
   - The web dashboards keep working in `demo` mode (they no longer read the
     password column); flip pages to `live` as each one is migrated.
8. **Smoke test (15 minutes).** These are SERVER tests run with supabase-js
   as a logged-in seeded user (RPCs require `auth.uid()`, so running them
   bare in the SQL editor raises `not_a_member`). The staff web dashboards
   aren't wired to Supabase yet — that's the migration slice — so proof lives
   in the tables, not on a screen:
   - QR scan → `verify-entry` grants entry, and a `gate-entry` row appears in
     `app_events` (the reception dashboard's future realtime feed) ✓
   - Pamela: first bind a device for her (`insert into member_devices …` —
     seeded members have none, and the device check fires before the
     subscription check), then request a token → denied for the frozen
     subscription ✓
   - `rpc('place_cafe_order', …)` as a member → `cafe_orders` row exists with
     a server-computed total; repeat with an order larger than the wallet →
     `insufficient_funds` ✓
   - `rpc('export_my_data')` as a member → returns the full member bundle ✓

## Known deferred modelling (0007 backlog — nothing here blocks launch)

The schema covers every money, safety, access, and department flow. These
demo features still live only client-side and get tables in a later
migration: workout programs + personal records, challenges and progress,
fitness assessments / nutritionist consultation appointments, meal-plan
versioning + adherence logs, shop merchandise + rewards catalog + points
rules config, parking spot inventory + car-wash orders, and a cafe-wide
open/paused flag (per-item availability already exists).

## Hard rules

- **Never** point `web-demo` at the Monza production projects; the gym gets
  its own project.
- `seed.sql` must never run on a project holding real member data.
- The sheet backup precedes any sheet edit (standing instruction).
- Real payments and gate hardware are separate tracks; nothing above blocks
  multi-device go-live without them.
