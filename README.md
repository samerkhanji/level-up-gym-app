# GYM-APP

Phone-based gym access and membership platform. The member's phone is their
access card: dynamic QR entry/exit, device binding, anti-passback, live
occupancy, visit history, trainer booking and subscription management.

See [SPEC.md](SPEC.md) for the full product spec and screen map.

## Structure

| Path | What it is |
|---|---|
| `member-app/` | Expo (React Native) member app — iOS + Android |
| `supabase/migrations/` | Database schema, RLS policies, RPCs |
| `supabase/functions/` | Edge Functions: `issue-entry-token`, `verify-entry` |

## Backend setup (once a Supabase project exists)

1. Apply migrations in order (`0001` → `0003`) via the Supabase MCP,
   dashboard SQL editor, or `supabase db push`.
2. Deploy both Edge Functions and set secrets:
   - `ENTRY_TOKEN_SECRET` — random 32+ char string (HMAC for QR tokens)
3. In Auth settings, disable email confirmation (registration binds the
   device in the same session) or add a confirmation-aware flow later.
4. Create at least one `branches` row and one `gates` row
   (store `sha256(gate_key)` in `gates.api_key_hash`).
5. Seed `plans` and create a `staff` row (role `owner`) for yourself.

## Member app

```bash
cd member-app
cp .env.example .env   # fill in Supabase URL + anon key
npm install
npx expo start
```

## Gate flow (V1)

1. App calls `issue-entry-token` → server checks subscription, device binding,
   balance, branch, anti-passback → returns a 60s token; app renders it as a
   QR and refreshes every 25s.
2. Gate scanner POSTs the scanned QR to `verify-entry` with its gate API key.
3. Server atomically claims the token (replay-proof), re-checks eligibility,
   opens/closes the `gym_sessions` record and logs an `access_events` row.
4. Reception fallback: `manual_override()` RPC — staff-only, reason required,
   fully audit-logged.
