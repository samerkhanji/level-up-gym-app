# Phase 1 + 2 + 2b — audit findings & coverage evidence

Executed 2026-07-29 against `http://localhost:5500` (byte-identical to the Vercel
deploy). Chromium only in this staged run — WebKit/Firefox, Axe, performance and
the previously-audited staff suites are **deferred to later phases as instructed**.

Evidence: `audit-reports/phase-1-2-2b/` — `staff-hub-report.json`,
`member-report.json`, `members-clients-report.json`, plus screenshots.
(Moved out of `test-results/`, which Playwright wipes on every run.)

---

## Result classification (as required)

| Class | Count | Notes |
|---|---|---|
| **Tested and passed** | 116 controls + 8 state machines | hub 9 links + 1 disclosure; member 65 buttons; 8 outcome machines |
| **Tested and failed** | 0 | no control errored after retry classification |
| **Disabled by design** | 3 | preconditions unmet (car wash needs check-in; 2 × Redeem need points) |
| **No visible effect** | 4 | see F-UX-1 |
| **Visually inspected only** | 2 | member inputs/selects inventoried, not fuzzed (Phase 4 scope) |
| **Not executable** | — | none in these phases |
| **Missing persistence/backend** | 7 findings | all of §2b's security/identity findings need Supabase |
| **Blocked by demo architecture** | cross-device, real auth, role guards | unchanged, stated |

---

## Phase 1 — staff.html hub

**Coverage: 10 controls discovered, 10 classified, 100 % tested.**

- HTTP 200; **all 9 links resolve 200**; "How this demo works" disclosure toggles.
- 0 console errors, 0 failed requests, 0 duplicate IDs, 0 unnamed controls.
- No horizontal scroll at **320 / 375 / 768 / 1440**.
- Keyboard: every card reachable in tab order with visible focus.

**F-HUB-1 [RESOLVED]** — stale "Design preview" labels on five live workspaces.
Fixed in commit `9d75f46` *before* this run (the instruction to leave them
arrived after the fix shipped). Recorded because it caused an external audit to
conclude the platform was mostly mock. Verified absent: `noDesignPreviewTags: true`.

---

## Phase 2 — member app (index.html)

**Coverage: 67 controls discovered · 65 buttons tested = 100 % of discovered
buttons; inputs/selects classified in the inventory.**
0 console errors. 0 page errors. Full localStorage snapshot/restore per control
— visits, bookings, lockers, orders, points, reports all restored, not just wallet.

### Outcome machines — all 8 passed
| Machine | Result |
|---|---|
| Check-in assigns a locker | ✅ |
| Check-in survives refresh (persistence) | ✅ |
| Check-out releases the locker | ✅ |
| Wallet charged **exactly once** under double-click | ✅ |
| **Corrupted localStorage** still boots the app | ✅ |
| **Duplicate bus-event replay** blocked across two reloads | ✅ |
| Class booking clashing with a PT session blocked | ✅ |
| Frozen membership surfaced on home | ✅ |

### Login & failure states
- Unknown name rejected ✅ · lowercase name accepted ✅ · **sheet fetch blocked
  for the entire run**, so the offline/fallback path is certified ✅
- Hidden views (`view-train`, `view-gym`, `view-pass`, `view-notifications`) are
  `display:none` → not reachable by screen readers ✅
- No horizontal scroll at 320 / 375 / 768 / 1440 ✅

**F-UX-1 [LOW]** — 4 no-effect controls: `home:Help / SOS`, `gym:Help / SOS`,
`train:Workouts`, `food:Café`. The two SOS buttons are **hold-to-activate by
design** (a plain click must not fire an emergency alert — correct); the other
two are already-active segment tabs. No action needed; documented so future runs
don't re-flag them.

**F-A11Y-1 [LOW]** — 1 control without an accessible name in the member app
(icon-only). Needs an `aria-label`.

---

## Phase 2b — Members & clients (highest-risk phase)

**7 findings: 1 CRITICAL, 4 HIGH, 2 MEDIUM.**
Roster/data-quality issues are scored separately from privacy/authorization
issues, as required.

### F-SEC-1 [CRITICAL] — plaintext passwords in the data sheet
Login validates against a password column in the Google Sheet. **All values
redacted — this audit never reads, logs or screenshots a password.**
The app already tolerates deleting the column (any password works in demo mode),
so removal is a one-step change. Fix: managed auth (Supabase), hashed
credentials, reset tokens with expiry, session management, rate limiting.
*Owner's standing demo decision — reported, not auto-changed.*

### F-SEC-2 [HIGH] — login identity is a name
Names are not unique; two "Samer Khanji" collide. Probes: exact ✅ accepted,
lowercase ✅ accepted, **trailing whitespace ✅ accepted** (normalisation is
loose), Unicode `Pamela <3` ❌ rejected under the fallback dataset (that member
only exists in the sheet, which this run blocked). Fix: authenticate by verified
email/phone → resolve to `member_id`.

### F-ID-1 [HIGH] — attribution by display name, not immutable ID
`payload.member === state.memberName` drives every cross-dashboard event.
Confirmed: `usesImmutableId: false`. Fix: `member_id` issued at registration;
all events, ledgers, notifications and bookings namespaced by it.

### F-ISO-1 [HIGH] — cross-account state leakage **(reproduced live)**
Steps: log in as Samer → seed `SECRET-SAMER-TX` (wallet) and `SECRET-SAMER-NOTIF`
(notifications) → sign out → log in as **Jawad**.
Expected: none of Samer's activity present. **Actual: `inheritedSamerTx: true`,
`inheritedSamerNotif: true`** — Jawad inherits Samer's wallet history and
notifications. Cause: one shared key `gym_demo_state_v3`; login overwrites
identity fields only (`singleSharedStateKey: true`, `perMemberNamespacing: false`).
Mitigating: the DOM did **not** leak the strings at switch time, and logout
scrubbed the DOM (`domClearedOfSecrets: true`).
Fix: namespace state **and** ledger/notifications/bookings by `member_id` +
authenticated session; clear sensitive state on logout.

### F-ISO-2 [MEDIUM] — processed-event ledger namespaced by screen, not member
`markProcessed(id, 'member')` is shared across accounts on one browser, so
member B's ledger can already contain member A's processed IDs and suppress B's
legitimate events. Fix: include `member_id` + session in the namespace.

### F-SAFE-1 [HIGH] — safety facts duplicated with no source of truth
Peanut allergy lives in the member app *and* the nutritionist seed; the shoulder
limitation lives in the trainer *and* instructor seeds. No provenance, no
last-updated, no authorised-editor rule, no conflict winner. Fix: one health
record per `member_id`, role-scoped edits, timestamps; every surface reads it.

### F-DQ-2 [MEDIUM] — rosters are per-dashboard seeds, not one member table
Canonical-person mapping (phones normalised; **no conflicts found** where a
person appears twice):

| Person | Trainer | Nutritionist | Phone consistent |
|---|---|---|---|
| Samer Khanji | ✅ | ✅ | ✅ same number |
| Lina Saab | ✅ | — | n/a |
| Omar Khal | ✅ | — | n/a |
| Maya Haddad | — | ✅ | n/a |
| Jad Rahal | — | ✅ | n/a |

None of Lina/Omar/Maya/Jad are sheet members, so **reception cannot look them
up** — a data-quality defect (not a privacy breach). The full Member↔Users
canonical mapping needs the sheet exported; repo-level comparison is recorded.

### F-STATE-1 — account states
Active / frozen / expired / pending modelled ✅; **locked/suspended not modelled**
(logged LOW).

---

## What this run did NOT cover (deferred, per instruction)

WebKit + Firefox · Axe/contrast/200 % zoom · performance & large datasets ·
staff-page auth & route guards · offline/delayed-request simulation beyond the
blocked-sheet path · deletion/export across surfaces (toast-only today → **NOT
Live**) · stale multi-tab session invalidation · the 8 previously-audited staff
suites.

## Recommended order after this

1. **F-ISO-1 + F-ID-1 together** — member_id + namespaced state/ledger. Highest
   value: it invalidates nothing else and unblocks trustworthy multi-account tests.
2. **F-SEC-1** — delete the sheet password column (one step, already tolerated).
3. **F-SAFE-1** — single health record.
4. Then Phase 3 (cross-browser, a11y, performance) and the staff-auth phase.
