# GYM-APP — Product Roadmap

Governing principle (condensed from the Jul 28 2026 product review — summarized,
not verbatim): **the app must be organized around five complete member journeys,
not feature categories.** A journey counts as done only when its acceptance
criteria pass end-to-end across member, reception and admin — not when its
screens exist.

## Acceptance criteria — connected workflows

A workflow is complete when: **member submits → staff receives → staff resolves
(human action, never a timer) → member is notified with who/what → action is audited.**

- **SOS**: member holds SOS → picks type → countdown/cancel → alert appears in
  reception's queue with zone → staff Acknowledge (member sees "acknowledged by X")
  → staff Close with note → incident recorded on both sides.
- **Support ticket**: request → ticket number → appears at reception with subject →
  staff Respond with note → member sees "resolved by X: note" in inbox → logged.
- **Equipment report**: select/scan machine → reference number → appears at
  reception/maintenance → staff moves Submitted → Under review → Repaired (each
  transition notifies the member; no automatic transitions) → machine restored.
- **Renewal at desk**: member requests → task at reception → staff takes payment →
  member's expiry updates + invoice appears → revenue and drawer reflect it.
- **Announcement**: staff publishes → every member's home shows it + inbox entry.
- **Denied entry**: gate denial visible on member phone AND reception feed →
  staff resolves via structured fix → member notified "resolved by X" and can enter.

Demo transport: GymBus (BroadcastChannel + persisted log) — same contract the
Supabase backend implements for production (realtime channels + tables + RLS).
Timers may only exist where clearly labeled as gate-traffic simulation.

1. **Join and pay** — invitation → onboarding (verify, photo, rules, waiver, health
   questionnaire, emergency contact, preferences) → plan purchase → active member
2. **Enter the gym** — QR primary; backups: Wallet card, NFC, reception verification,
   temporary offline QR, physical card. Device-bound, short-lived, screenshot-proof.
3. **Train and track progress** — start workout → per-exercise logging (sets/reps/rest
   timer, videos, substitutions, restrictions) → history/charts → adaptive plan →
   trainer approval of PRs
4. **Book and purchase services** — classes (capacity, waitlist auto-promotion,
   cancellation deadlines/fees shown BEFORE cancelling), trainers (reschedule/propose
   new time, messaging), recovery (contraindications + staff approval), lockers
   (map, PIN, forced-open request), parking/car-wash (configurable modules), café
   (live availability, order status, reorder), guests (invite link, waiver tracking,
   anti-reuse) — every reservation states duration, deadlines, no-show consequence
5. **Get assistance** — help everywhere, tickets with numbers and status, safe SOS
   (hold → countdown → type → staff acknowledgment → incident record), equipment
   reports with reference numbers and status lifecycle, lost phone = instant device
   revocation

## Phases

**Phase 1 — core gym use:** onboarding + secure login · membership details/renewals/
payments · reliable QR + backup access · occupancy · classes + trainer booking ·
notifications + reception support · wallet/invoices/receipts · **real backend +
gate integration** (Supabase schema/RLS/edge functions already written in /supabase —
blocked on project creation)

**Phase 2 — retention:** full workout tracking · progress analytics · trainer
messaging · assessments · challenges/rewards · wearables (Apple Health, Health
Connect, Garmin, Fitbit, WHOOP, Oura — opt-in consent) · family permissions
(owner/adult/minor/guardian roles, spending + visibility controls) · referrals

**Phase 3 — revenue:** PT packages · recovery · paid lockers · guest/day passes ·
café · shop · meal plans + nutrition consultations · parking/car wash/EV

**Phase 4 — differentiation:** AI workout assistant · smart equipment · workout
auto-recognition · occupancy-based recommendations · recovery recommendations ·
corporate memberships · at-home training · partner-gym access

## Production infrastructure (§24 — the real gap)

Secure auth · production DB (Supabase, written) · roles · payment gateway ·
gate/access integration · booking engine · realtime occupancy · push · audit logs ·
waiver/file storage · backup/recovery · offline strategy · rate limiting ·
monitoring · consent records · reception/admin integration.

## Compliance & safety notes

- Health questionnaire/nutrition guidance is not medical treatment; contraindication
  answers can block instant booking pending staff approval.
- Minors: parental approval; teen data not auto-visible to all linked adults.
- Wallet checkout must itemize sources (wallet/points/card); 3-DS, duplicate-payment
  protection, refunds/chargebacks logged.
- Lost phone → immediate device revocation (credentials open physical doors).
