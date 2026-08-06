# Level Up — Feature Location Matrix

Living implementation-control document. One row per feature: where it lives,
what data it touches, whether it's mutating or read-only, what depends on it
across roles, and its real current status. Updated as work lands — not
reconstructed from memory at the end.

Status legend:
- **Implementation**: `Done` / `In progress` / `Not started`
- **Test**: `Automated` (dedicated Playwright spec) / `Manual` (verified by hand, no automated spec) / `Untested`
- **Demo**: `Live` (real engine read/write) / `Static` (renders but no interaction) / `Missing`

Last updated: mid-implementation, staff workspace + Nutrition integration pass (see git log for exact commits).

---

## Member App — Home

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Greeting + header status pill | Member | Home | Header | Inline | `AccessService.validate`, `AccessService.insideNow` | Read-only | Reception check-in/out | Done | Automated | Live | — |
| Membership pass card | Member | Home | Top card | Card | `MemberService`, `PlanService` | Read-only | Reception, Owner metrics | Done | Automated | Live | — |
| Unified live-status band (inside/blocked/ready) | Member | Home | Status band | Card | `AccessService.validate/insideNow` | Read-only, links to QR pass | Reception, gate hardware sim | Done | Automated | Live | — |
| Live branch occupancy | Member | Home | Occupancy card | Card + bars | `BranchService.occupancy` | Read-only | Reception, Owner network view | Done | Automated | Live | — |
| Multi-branch busy nudge | Member | Home | Occupancy card | Inline row | `BranchService.occupancy` | Read-only | — | Done | Automated | Live | — |
| Up next (workout/PT/class) | Member | Home | Up next card | List | `WorkoutService`, `ptSessions`, `BookingService` | Read-only | Trainer, Instructor | Done | Automated | Live | — |
| Attention alerts (billing/PT/waitlist/maintenance) | Member | Home | Alerts card | List, contextual icons | multiple | Read-only, deep-links | Reception, Maintenance | Done | Automated | Live | — |
| Quick actions (SOS/report/guest/inbox) | Member | Home | Quick grid | Icon-chip grid | `IncidentService`, `MaintenanceService` | Mutating (SOS/report) | Instructor, Maintenance, Reception | Done | Automated | Live | — |

## Member App — Train

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Today's workout hero + start/resume | Member | Train → Today | Flagship card | Bespoke hero card | `WorkoutService.todaysAssigned` | Mutating (starts session) | Trainer (assigns programs) | Done | Automated | Live | — |
| Streak / PRs stat tiles | Member | Train → Today | Stat row | Icon-chip tiles | `WorkoutService.streak`, `PersonalRecordService` | Read-only | — | Done | Automated | Live | — |
| Readiness check (energy/soreness/pain) | Member | Train → Today | Modal | Modal | `WorkoutService` | Mutating (gates session start) | Trainer (sees flags) | Done | Automated | Live | — |
| Live workout logger | Member | Train (modal-like full view) | Set-by-set logging | Custom table UI | `WorkoutService`, `ExerciseService`, `PersonalRecordService` | Mutating | Trainer sees history | Functionally done, **not yet visually recomposed** | Automated (functional) | Live | Dedicated one-handed interaction redesign not yet done — tracked separately |
| Workouts library (assigned days + quick workout) | Member | Train → Workouts | List + builder | Cards | `ProgramService`, `ExerciseService` | Mutating (starts a session) | Trainer (program authorship) | Done (inherits shared tokens) | Automated | Live | Not bespoke-recomposed, token-polish only |
| Workout/exercise history + progress | Member | Train → History | List/detail/sparkline | Cards + `sparklineSvg` | `WorkoutService`, `ExerciseService` | Read-only | Trainer | Done (inherits shared tokens) | Automated | Live | Not bespoke-recomposed |
| Goals (fitness, e.g. frequency/lift) | Member | Train → History → Progress | Progress bar | `GoalService` | Read-mostly | Trainer approval flag exists | Done | Automated | Live | — |
| My Trainer: relationship timeline, PT packages, upcoming/past sessions, feedback | Member | Train → My Trainer | Cards | `TrainerService`, `PackageService`, `ptSessions` | Mutating (buy package, confirm session, cancel/reschedule) | Trainer dashboard mirrors this | Done (inherits shared tokens) | Automated | Live | Not bespoke-recomposed |

## Member App — Trainer (booking tab)

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PT credits stat tile | Member | Trainer tab | Top | Stat tile | `PackageService.remaining` | Read-only | Trainer dashboard, Reception (sells packages) | Done | Automated | Live | — |
| Trainer discovery list + booking | Member | Trainer tab | Trainer list | Cards | `TrainerService` | Mutating (books session) | Trainer dashboard (schedule updates) | Done | Automated | Live | — |
| Nutrition consult shortcut | Member | Trainer tab | Bottom card | Card | `NutritionService` | Links to standalone Nutrition page | Nutritionist | Done | Automated | Live | — |

## Member App — Club

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Branch cards (occupancy, hours, closures, trainers, equipment) | Member | Club → Branches | List | Rich cards | `BranchService`, `MaintenanceService` | Read-only | Reception, Maintenance, Owner | Done (existing build) | Automated | Live | Not re-verified this pass beyond screenshot spot-check |
| Class booking / cancel / waitlist | Member | Club → Classes | List | Cards | `BookingService` | Mutating | Instructor, Reception | Done | Automated | Live | — |
| Fuel Bar purchasing, stock, allergens | Member | Club → Fuel Bar | Grid | Product cards | `RetailService` | Mutating | Café/Fuel Bar POS, Owner (restock approvals) | Done (existing build) | Automated | Live | Not re-verified this pass beyond screenshot spot-check |

## Member App — Account

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| My plan (renew/freeze/unfreeze) | Member | Account | Membership & billing group | Card | `PlanService`, `MemberService` | Mutating | Reception, Owner metrics | Done, regrouped into sections | Automated | Live | — |
| Payments history | Member | Account | Membership & billing group | List | `PaymentService` | Read-only | Reception, Owner | Done | Automated | Live | — |
| Home branch + transfer request | Member | Account | Branch & guests group | Card | `BranchService`, `ApprovalService` | Mutating (creates approval) | Owner (approves) | Done | Automated | Live | — |
| Guest pass purchase | Member | Account | Branch & guests group | Card | `GuestService`/wallet | Mutating | Reception (scans at door) | Done | Automated | Live | — |
| Privacy (export/delete stubs) | Member | Account | Privacy & account group | Buttons | — | Stub | — | Done (honest stub) | Automated | Static (documented as stub) | Explicitly a GDPR-style stub, not wired to a backend — by design |
| Logout | Member | Account | Privacy & account group | Button | `setSession` | Mutating | — | Done | Automated | Live | — |

## Member App — QR Pass / Access

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Rotating QR + countdown | Member | Central QR | Pass card | Bespoke wallet-pass card | client-side token rotation | Read-only display | Reception (gate scan) | Done | Automated | Live | Simulated hardware — see Simulated Integrations |
| Gate branch picker | Member | Central QR | Pass card | Chips | `BranchService` | Selection only | — | Done | Automated | Live | — |
| Check-in / check-out | Member | Central QR | Pass card | Button + result overlay | `AccessService.checkIn/checkOut` | Mutating | Reception, Owner live feed | Done | Automated | Live | — |
| All 10 denial reasons + contextual CTA | Member | Central QR | Denied card | Card | `AccessService.validate` | Read-only + CTA navigation | Reception, Owner | Done | Automated | Live | — |

## Member App — Nutrition (standalone page)

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Upcoming consultation | Member | Nutrition (from Trainer tab) | Top card | Card | `NutritionService.forMember` | Read-only | Nutritionist | Done | Automated | Live | — |
| Consultation booking + follow-up booking | Member | Nutrition | Picker | Slot picker | `NutritionService.book` | Mutating | Nutritionist schedule | Done | Automated + manual cross-role | Live | — |
| Consultation history | Member | Nutrition | History card | List | `NutritionService.forMember` | Read-only | Nutritionist | Done (this pass) | Manual | Live | — |
| Body-composition trend | Member | Nutrition | Body comp card | Latest + count | `NutritionService.bodyCompFor` | Read-only | Nutritionist (writes) | Done (this pass) | Manual, cross-role verified | Live | Member sees latest reading + count, not a full chart |
| Nutrition goals + progress | Member | Nutrition | Goals card | Progress bar | `GoalService` (kind: `nutrition`) | Read-only | Nutritionist (writes) | Done (this pass) | Manual, cross-role verified | Live | — |
| Meal plan (current + count of previous) | Member | Nutrition | Meal plan card | Card | `NutritionService.mealPlansFor/currentMealPlanFor` | Read-only | Nutritionist (writes) | Done (this pass) | Manual, cross-role verified | Live | File content itself is not stored, filename metadata only — same as the rest of the demo's "mock uploader" |
| Supplement guidance | Member | Nutrition | Supplements card | List + shortcut | `NutritionService.supplementGuidance` (= `RetailService` Supplements category) | Read-only + shortcut to Fuel Bar | Café/Fuel Bar POS | Done (this pass) | Manual | Live | — |

**Cross-role Nutrition sync — verified this pass, both directions:**
Nutritionist records body-comp/adds goal/uploads meal plan via the real UI → confirmed visible on the member Nutrition page in a separate browser tab sharing the same demo engine state. Member books a follow-up → confirmed visible on the nutritionist's schedule. No second localStorage system remains — nutritionist.html's previous `levelup_nutri_goals` local-only note was removed and replaced with the shared `GoalService`.

## Member App — Notifications / Inbox

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Read/unread + badge | Member | Inbox (from header bell, any tab) | List | List | `NotificationService` | Mutating (marks read) | — | Done (existing build) | Automated | Live | — |
| Mark all read / delete / empty state | Member | Inbox | List | Buttons | `NotificationService` | Mutating | — | Done (existing build) | Automated | Live | — |
| Category identity (booking/access/billing/account/system) | Member | Inbox | List | Icon + label | `NOTIF_TYPE_META` | Read-only | — | Done (existing build) | Automated | Live | — |
| Deep-link CTAs to correct tab/subsection | Member | Inbox | List | Button | `notif-cta` router | Navigates | All roles that push notifications | Done (existing build) | Automated | Live | — |

---

## Staff — Reception

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| (Full inventory pending — recomposition in progress) | Staff (Reception) | reception.html | — | — | `AccessService`, `PaymentService`, `BookingService`, `GuestService`, CRM services, shift/cash | Mixed | Member app (live status), Owner (metrics/approvals) | **In progress** | Pending fresh run of `reception-a-to-z-audit.spec.js` + `reception-button-audit.spec.js` | Live (pre-existing build); visual recomposition in progress | Row will be expanded to itemized features once the current pass lands |

## Staff — Maintenance

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| (Full inventory pending — recomposition in progress) | Staff (Maintenance) | maintenance.html | — | — | `MaintenanceService` | Mixed | Member app (equipment status), Instructor (capacity), Owner (equipment risk) | **In progress** | Pending fresh run of `maintenance-a-to-z-audit.spec.js` | Live (pre-existing build); visual recomposition in progress | Row will be expanded once the current pass lands |

## Staff — Fuel Bar & Retail POS

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| (Full inventory pending — recomposition in progress) | Staff (Café) | cafe.html | — | — | `RetailService` | Mixed | Member app (Club → Fuel Bar), Owner (restock approvals) | **In progress** | Pending fresh run of `cafe-a-to-z-audit.spec.js` | Live (pre-existing build); visual recomposition in progress | Row will be expanded once the current pass lands |

## Staff — Trainer Dashboard (verified this session)

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Today's schedule, clients, live sessions, programs, history, progress, safety flags, availability, performance | Staff (Trainer) | trainer.html | 9 required categories, all present | Desktop dashboard | `TrainerService`, `ProgramService`, `WorkoutService`, `PackageService` | Mixed | Member Train/Trainer tabs | Done | Automated (`trainer-a-to-z-audit.spec.js`, independently re-run: 1 passed) | Live | — |

## Staff — Instructor Dashboard (verified this session)

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Today's classes, safety prep, roster/attendance, live class controls, equipment issues, cover requests, room/capacity, incidents, post-class report | Staff (Instructor) | instructor.html | 9 required categories, all present | Desktop 2-column, sticky sidebar | `InstructorService`, `BookingService`, `MaintenanceService`, `IncidentService` | Mixed | Member Club → Classes, Maintenance | Done | Automated (`instructor-a-to-z-audit.spec.js`, independently re-run: 1 passed) | Live | "Live" class state is derived client-side from class timing, not a new engine field — documented choice, not a gap |

## Staff — Nutritionist Workspace (verified this session + extended this pass)

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Schedule, consultations, client search/records, body comp, meal plans, follow-ups, supplement guidance | Staff (Nutritionist) | nutritionist.html | All required categories present | Desktop 2-column + client detail panel | `NutritionService`, `HealthService`, `RetailService` | Mixed | Member Nutrition page | Done | Automated (`nutritionist-a-to-z-audit.spec.js`, independently re-run: 1 passed) | Live | — |
| Goals | Staff (Nutritionist) | nutritionist.html | Client card | Form + list | `GoalService` (kind: `nutrition`) | Mutating | Member Nutrition page | **Fixed this pass** — was a per-browser `localStorage` note, now the shared `GoalService` | Manual, cross-role verified | Live | — |
| Refer-out visibility | Staff (Nutritionist) | nutritionist.html | Client card | Warning box | `HealthService` condition facts | Read-only | — | Done (existing build) | Manual | Live | Read-only clinical flag by design — no case-routing workflow exists, and none should be invented (non-clinical scope) |

## Staff — Owner Dashboard (verified this session)

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Needs-your-attention strip, approvals queue | Staff (Owner) | owner.html | Top | Prominent card | `ApprovalService` | Mutating (approve/reject) | Reception, Maintenance, Café (requesters) | Done | Manual (independently verified: approve moves item Pending → Decided, live counts) | Live | No dedicated `owner-a-to-z-audit.spec.js` exists; manual verification is the standing gate for this page |
| Network overview (revenue/membership/occupancy/operations) | Staff (Owner) | owner.html | Grouped grid | Cards | `OwnerService.network` | Read-only | All branches | Done | Manual | Live | — |
| Branch comparison table | Staff (Owner) | owner.html | Table | Table | `OwnerService`/`BranchService` | Read-only | — | Done | Manual | Live | — |
| CRM snapshot | Staff (Owner) | owner.html | Cards | Cards | CRM/leads services | Read-only | Reception (leads owner) | Done | Manual | Live | — |
| Trainer scorecards | Staff (Owner) | owner.html | Cards | Cards | `TrainerService`, `PackageService` | Read-only | Trainer dashboard | Done | Manual | Live | — |
| Equipment risk | Staff (Owner) | owner.html | Card | List | `MaintenanceService.assets` | Read-only | Maintenance | **Fixed this pass by its agent** — was only a count, now real detail | Manual | Live | — |
| Incidents | Staff (Owner) | owner.html | Card | List + empty state | `IncidentService.list` | Read-only | Instructor, Reception (raise incidents) | **Fixed this pass by its agent** — previously not rendered at all | Manual | Live | — |
| Live activity feed | Staff (Owner) | owner.html | List | List | `GymBus` event log | Read-only | All roles | Done | Manual | Live | — |

---

## Staff-Adjacent Pages

| Feature | Role | Tab/Workspace | Section | UI Format | Data Service | Mutating/Read-only | Cross-role deps | Implementation | Test | Demo | Known limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Department hub | All staff | staff.html | Full page | Card launcher | — (static links) | Navigation only | Links to all staff pages | Done | Automated (`staff-a-to-z-audit.spec.js`) | Live | — |
| Demo control center | Internal/demo | demo.html | Full page | Scenario buttons | `SCENARIOS` (real engine mutations) | Mutating | Triggers real state changes across all roles | **Not started this pass** | Untested this pass | Unknown — needs verification that every scenario visibly changes shared state, not just a toast | Explicitly called out by the user as needing evidence-of-effect, not just a toast |
| Service catalog | Internal/demo | features.html | Full page | List | — (documentation page) | Read-only | Describes all other pages | **Not started this pass** | Untested this pass | Unknown | Needs an accuracy pass against actual implementation |
| Motion/reference page | Internal/dev | motion.html | Full page | Reference | — | Read-only | None (internal dev reference) | Not prioritized | Untested | Reference only | Not a role workspace — lowest priority in the inventory |

---

## Known Gaps / Explicitly Not Invented

- **Nutrition refer-out case tracking**: read-only clinical flag exists; no case-routing/workflow engine — correctly out of scope for a non-clinical demo.
- **Live workout logger one-handed redesign**: functionally complete and tested, but the dedicated interaction redesign (large touch targets, fast weight/rep entry, copy-last-set) has not been done yet.
- **Demo Control Center evidence-of-effect**: not yet audited this pass — needs confirmation every scenario button produces a verifiable shared-state change, not just a toast.
- **Service Catalog accuracy**: not yet reconciled against actual implementation this pass.
