# Phase 1 + 2 + 2b — audit findings & coverage evidence

Executed 2026-07-29 against `http://localhost:5500` (byte-identical to the Vercel
deploy). Chromium only in this staged run — WebKit/Firefox, Axe, performance and
the previously-audited staff suites are **deferred to later phases as instructed**.

Evidence: `audit-reports/phase-1-2-2b/` — `staff-hub-report.json`,
`member-report.json`, `members-clients-report.json`, plus screenshots.
(Kept out of `test-results/`, which Playwright wipes at the start of every run —
that is why an earlier evidence set went missing.)

> **Reporting contract.** A Playwright "passed" line means *the audit executed*.
> It is **not** a Phase verdict. Phase 2b is **NOT green**: 7 controls FAIL,
> 2 are NOT_IMPLEMENTED, and there are **2 CRITICAL + 5 HIGH findings**.
> Phase 2b hard-asserts a must-pass subset so a regression in those cannot hide
> behind a green run; backend-dependent controls are reported, not asserted.

---

## Phase 2b — Members & Clients (headline)

### Audit controls — 15 total

| Control | Verdict | Evidence |
|---|---|---|
| SHEET-ANON-PASSWORD | **FAIL** | HTTP 200, no auth, password column returned |
| MISSING-PW-MODE | PASS | no-column → any password accepted; empty refused |
| ATTR-EXACT | PASS | exact-name event delivered |
| ATTR-CASE-STRICTNESS | PASS | uppercase/whitespace variants not mis-delivered |
| ISO-STATE | **FAIL** | Jawad's state holds Samer's order, notification, pool lane |
| ISO-DOM | **FAIL** | Samer markers visible on home / food / gym / inbox |
| LOGOUT-SCRUB | PASS | markers removed from DOM on sign-out |
| LEDGER-SCOPE | **FAIL** | ledger namespaced by screen, not member |
| CANON-PHONE | PASS | 0 phone conflicts across surfaces |
| CANON-ORPHANS | **FAIL** | Lina Saab, Omar Khal, Maya Haddad, Jad Rahal |
| SAFETY-SOURCE | **FAIL** | no provenance fields; facts duplicated |
| EXPORT-CONTROL | **NOT_IMPLEMENTED** | control exists; no download, no state change |
| DELETE-CONTROL | **NOT_IMPLEMENTED** | control exists; nothing deleted, session intact |
| FROZEN-ENTRY | PASS | gate unreachable, denial shown, **no visit created** |
| FROZEN-HANDLER-GUARD | **FAIL** | direct handler invoke sets checkedIn=true |

**Totals — passed 6 · failed 7 · not implemented 2 · not testable 0 · execution errors 0.**

### Findings — 2 CRITICAL · 5 HIGH · 3 MEDIUM · 0 LOW

**F-SEC-0 [CRITICAL] — public plaintext credential exposure.** The reviewer's
escalation is **confirmed**: `GET .../gviz/tq?tqx=out:csv&sheet=Member` returned
**HTTP 200 with no authentication**, `authRequired: false`,
`publiclyReadable: true`, **`passwordColumnReturned: true`**, cache-control
`no-cache, no-store`. Anyone with the sheet ID can read member credentials.
Only the header row was inspected — **no password value or length was read,
stored, logged or screenshotted**. Fix, in order: delete the column now →
restrict sheet sharing → move auth to Supabase (hashed, email/phone identity,
reset tokens, session expiry, rate limiting).

**F-SEC-1 [CRITICAL]** — app login validates against that column (presence only).

**F-ID-1 [HIGH]** — attribution keys on display name, not `member_id`.
**F-ID-2 [HIGH]** — name-equality is brittle: exact name delivered ✅; `SAMER
KHANJI` and trailing-space variants **not** delivered — i.e. a legitimate
identity variant silently misses delivery today, and a look-alike name would
mis-deliver once names collide. Distinct markers (`ATTR-EXACT` /
`ATTR-UPPERCASE` / `ATTR-WHITESPACE`), unique per-run event IDs, and a ledger
reset per probe.

**F-ISO-1 [HIGH] — cross-account leakage, now proven at the DOM level.**
Method: real state written as Samer (order `C-SAMERONLY`, notification
`ISOLATION-MARKER-SAMER`, pool lane `SAMER-LANE-MARK`), confirmed visible to
Samer, sign-out, log in as **Jawad**, then sweep five surfaces.
Result — state: order ✅ inherited, notification ✅ inherited, lane ✅ inherited.
DOM: **home true, food true, gym true, inbox true**, account false.
So Jawad does not merely retain the data — **he can see it on screen**.
Mitigation observed: logout scrubs the DOM.
Fix: namespace state, ledger, notifications and bookings by `member_id` +
authenticated session; clear on logout.

**F-ISO-2 [MEDIUM]** — ledger namespaced by screen; B's ledger can suppress B's
own events after A used the browser.

**F-SAFE-1 [HIGH]** — safety facts duplicated per surface, no source,
timestamp, editor rule or conflict winner.

**F-PRIV-1 [HIGH] — export & deletion are NOT implemented.** Controls asserted
present first, then behaviour measured: export → no download event, no network
request, no state change; delete → no local deletion, session unaffected. Both
toast-only.

**F-DQ-2 [MEDIUM] — data-quality, scored separately from privacy.**
Canonical mapping across Member-app / Reception / Trainer / Nutritionist /
Instructor: **0 phone conflicts**; 4 orphans (Lina Saab, Omar Khal, Maya
Haddad, Jad Rahal) exist on staff rosters but not in the member directory, so
reception cannot look them up. *(Full Member↔Users mapping needs the live sheet
exported; the Member sheet has no phone column, so phone comparison uses staff
constants — stated rather than silently skipped.)*

**F-STATE-2 [MEDIUM] — frozen enforcement is presentational.** Separated into
two controls, which is why the earlier single check was misleading: the **user
path is correctly blocked** (gate button unreachable — `isVisible()` respects
hidden ancestors where `getComputedStyle` on the element does not — denial
banner shown, **no visit record created**), but invoking the handler directly
sets `checkedIn = true` because `gateBtn.onclick` never re-checks `state.frozen`.
Consistent with the standing rule that hiding a control is not enforcement.

---

## Phase 1 — staff.html hub

10 controls discovered · 100 % classified and tested · **0 failures**.
All 9 links resolve 200; disclosure toggles; 0 console errors; 0 duplicate IDs;
0 unnamed controls; no horizontal scroll at 320/375/768/1440; every card
keyboard-reachable.
**F-HUB-1 [RESOLVED]** — stale "Design preview" labels on five live workspaces,
fixed in commit `9d75f46` *before* this run (the hold instruction arrived after
the fix shipped). Recorded because those labels caused an external audit to
conclude the platform was mostly mock.

## Phase 2 — member app

67 controls discovered · 65 buttons tested (**100 % of discovered buttons**) ·
**0 execution errors** · full-localStorage snapshot/restore per control ·
dialogs dismissed · sheet blocked, so the offline/fallback path is certified.

All 8 outcome machines passed: locker assign → persist across refresh →
release; **wallet charged exactly once** under double-click; corrupted-
localStorage boot; **duplicate bus-event replay blocked**; class/PT clash guard;
frozen surfaced on home.
3 controls classified **DISABLED_BY_DESIGN** (Redeem without points; car wash
before check-in) rather than counted as failures.
**F-UX-1 [LOW]** — 4 no-effect controls: two are hold-to-activate SOS buttons
(a plain click must *not* fire an emergency — correct), two are already-active
segment tabs. **F-A11Y-1 [LOW]** — 1 icon-only control lacks an accessible name.

---

## Required classification (all three phases)

| Class | Count |
|---|---|
| Tested and passed | Phase 1: 10 controls · Phase 2: 62 controls + 8 machines · Phase 2b: 6 controls |
| **Tested and failed** | **Phase 2b: 7 controls** |
| Not implemented | Phase 2b: 2 (export, deletion) |
| Not testable | 0 |
| Execution errors | 0 |
| Missing persistence/backend | F-SEC-0/1, F-ID-1/2, F-ISO-1/2, F-SAFE-1, F-PRIV-1 |
| Blocked by demo architecture | cross-device sync, staff route guards, DB-layer permissions |

## Audit-precision defects found in the audit itself (fixed, disclosed)

1. Evidence written under `test-results/`, which Playwright wipes → moved to `audit-reports/`.
2. `getComputedStyle` on an element inside a hidden parent reports visible → switched to Playwright `isVisible()`; this is what separated FROZEN-ENTRY from FROZEN-HANDLER-GUARD.
3. `window.GymBus` is undefined (top-level `const` is not a window property) → attribution probes now write the bus log directly; before this fix ATTR-EXACT falsely read as a failure.
4. Instructor roster regex captured non-name fields ("Right shoulder limitation", "Checked in") → tightened to roster-entry shape.
5. Delivery result could be `null`/`undefined` → coerced to boolean.

## Recommended order

1. **F-SEC-0 — delete the sheet password column and restrict sharing. Today.**
   It is the only finding exposing real credentials to the public internet.
2. **F-ISO-1 + F-ID-1 together** — `member_id` + namespaced state/ledger/
   notifications. Unblocks trustworthy multi-account testing for every later phase.
3. **F-STATE-2** — move the frozen check into the gate handler (cheap, and it
   sets the pattern for data-layer enforcement).
4. **F-SAFE-1** — single health record with provenance.
5. **F-PRIV-1** — real export/deletion pipeline.
6. Then the deferred phases: WebKit + Firefox, Axe/contrast/zoom, performance
   and large datasets, staff auth & route guards, stale multi-tab sessions.
