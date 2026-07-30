# Level Up OS — product direction (Level Up Beirut)

This document is the Level Up Beirut-specific product direction this fork is
being built toward. It supersedes the generic framing in `SPEC.md` wherever
the two disagree; `SPEC.md` remains the underlying screen-by-screen spec for
mechanics that don't change (QR access flow, RLS model, etc).

> Sourcing note: Instagram was not reliably accessible through the browsing
> tool used to research this, so the brand facts below are based on publicly
> indexed information about Level Up Beirut — a strength-focused, multi-location
> fitness club (Hamra, Badaro, Gemmayzeh; a newer third-party listing also
> mentions Hazmieh). The current branch list, class roster, and services
> should be confirmed directly with Level Up before this becomes a real
> commercial build.

Positioning: **Level Up OS** — one operating platform connecting every Level
Up branch, member, trainer, class, payment, asset, and manager. Not a
generic gym app.

## 1. The core problem

The system should be built **multi-branch first**, not as a single-gym app
that later bolts on branches. It exists to answer, at any moment, across the
whole network:

- Which branch a member belongs to, and whether their plan allows another branch
- Who is currently inside each location, and inside which zone of it
- Which trainers work at each branch; which classes run where
- Which equipment is broken, and where
- Which memberships are expiring, frozen, or in dispute
- Which branch is generating the most revenue; whether cash reconciles
- Whether PT packages are being consumed correctly
- Whether staff actions are recorded and accountable

## 2. Member application

Much more focused than a generic gym app. Priority order: **memberships,
access, PT, classes, payments** — before workout plans / exercise library /
progress photos, which come later.

**Home** — digital membership card, membership status, home branch, access
eligibility, current branch occupancy (with a cross-branch nudge — *"Hamra is
busy. Gemmayzeh has lower occupancy. Your membership gives you access to
both."*), next PT session, next class booking, PT sessions remaining, renewal
date, alerts, one prominent **Enter Gym** button.

**Digital access** — the app is the entry credential. Every check considers:
active membership, allowed branch, allowed time, freeze/suspension, access
restrictions, duplicate active visit, branch capacity, valid rotating QR
(refresh every ~25s). Reception sees entrant, branch, plan, entry time, and
previous branch visit.

**Branch selection** — switch between Hamra / Badaro / Gemmayzeh / Hazmieh
(subject to confirmation). Each branch page: live occupancy, hours, available
trainers, today's classes, equipment zones, contact/directions, closures,
announcements.

**Personal training** — one of the most important parts of the app. Trainers
by branch, specialties (bodybuilding, strength & conditioning, weight loss,
functional training, post-rehab, sports performance, beginner coaching),
availability, booking, PT package purchase/balance, reschedule/cancel,
completed-session history, trainer notes, member confirmation of completed
sessions.

**Classes** — TRX, yoga, spinning, abs/core, and other branch-specific group
sessions. Each listing: name, instructor, branch, room, time, difficulty,
places available, waitlist, cancellation deadline, equipment required. A
booking at Badaro must never accidentally reserve a similarly-named class at
Hamra.

**Training experience** (later phase) — workout plan, exercise library,
training history, personal records, body measurements, trainer notes,
progress photos, strength progression, workout completion.

## 3. Reception (per branch)

Every branch has its own Reception workspace. Regional/owner users can select
**All Level Up branches** instead of one.

Sees: members currently inside, entry attempts, denied entries, expected
appointments, today's classes, guest passes, payments due, expiring
memberships, PT sessions, open requests, incidents, shift/cash drawer.

Can do: register a lead, trial pass, sell/renew/freeze membership, take
payment, sell PT package, guest pass, resolve denied entry, book class/
trainer, reset member QR, transfer home branch, log a complaint, contact
another branch. **Every override requires a reason and is audit-logged.**

## 4. Trainer portal

Trainers may work across branches in the same day (morning Hamra, afternoon
Badaro, evening class Gemmayzeh) — the schedule must account for **travel
time between branches** and refuse impossible back-to-back bookings.

Dashboard: today's clients, branch/zone, goals, injury/movement restrictions,
PT package balance, session history, workout plan, measurements, missed
sessions, messages, availability.

Live session: start, record exercises/sets/reps/weight, notes, personal
best, modify workout, flag pain/injury, end session, request member
confirmation. Only one 1:1 session live at a time unless explicitly
configured as a small-group session.

Performance (management view): sessions delivered, PT revenue, retention,
cancellation rate, no-show rate, utilization, package renewal rate,
satisfaction. Do **not** rank trainers on sales alone — delivery and
retention matter too.

## 5. Instructor & class management

Separate workflow from Trainer (class-based, not 1:1-based). Instructor:
view assigned classes, room safety check, confirm equipment, check members
in, manage late arrivals, report incident, request cover, propose room
change, reduce capacity, post-class report.

Example cross-department chain (this is the strongest demo beat): instructor
reports 2 unusable TRX stations → maintenance ticket created → class
capacity drops 14→12 → booking availability updates → reception notified →
waitlist recalculates.

## 6. Maintenance & equipment

Every machine/asset: asset ID, QR code, branch, floor/zone, equipment type,
brand/model, purchase date, warranty, safety status, last/next inspection,
repair history, parts history, alternative equipment.

Level Up zones: free-weight area, strength machines, cable machines, cardio
area, functional-training area, TRX studio, spinning studio, group-class
room, locker rooms, reception, electrical/generator systems.

When equipment is isolated, members see a simple availability message +
alternative; maintenance staff see the full technical record.

## 7. Fuel Bar & Retail (replaces "Café")

Unless Level Up runs a full kitchen, rename the café module to **Fuel Bar &
Retail**: protein bars/drinks, water, energy drinks, supplements,
pre-workout, shakers, accessories, merch, branch-level stock, counter/member
sales.

Keep: POS, inventory, low-stock alerts, member scanning, allergens where
food is sold. Remove (unless confirmed): kitchen prep timers, chef/station
workflows.

## 8. Nutrition (lightweight, initially)

Only stays a major module if Level Up has employed/contracted nutritionists.
V1: consultation booking, body-composition records, goals, declared
allergies, meal-plan upload, follow-ups, supplement recommendations with
appropriate boundaries. Explicitly distinguish trainer nutrition guidance vs.
qualified nutrition consultation vs. medical nutrition therapy — do not build
clinical workflows without qualified staff behind them.

## 9. Owner / multi-branch dashboard

Network overview: total active members, members by branch, members
currently inside, revenue today/this month (+ by branch), new/expiring/
frozen memberships, outstanding balances, PT revenue, class attendance,
retail sales, open incidents, equipment downtime, staff on shift.

Branch comparison table (members inside, occupancy %, revenue today, PT
sessions, equipment offline, renewals due) — one row per branch
(Hamra/Badaro/Gemmayzeh/Hazmieh). Mark demo figures as simulated.

Owner approvals: large discounts, refunds, write-offs, membership
exceptions, free memberships, large stock purchases, major equipment
repairs, branch transfers, cash variances, sensitive incident closures.

## 10. Sales & CRM

Leads assigned by branch + interest. Sources: Instagram, walk-in, WhatsApp,
website, referral, existing member, corporate partnership, trainer referral.
Pipeline: enquiry → contacted → tour booked → trial/day pass → membership
offered → follow-up → sold.

Management view: leads by branch, Instagram conversion, trial→membership
conversion, overdue follow-ups, sales by receptionist, lost-lead reason,
most-requested branch/package.

## 11. Membership plans

Configurable catalog: single-branch, all-branches, student, off-peak,
monthly/quarterly/6-month/annual, corporate, couple/family, day pass, trial
pass, gym+classes, gym+PT, temporary visitor. Exact packages come from Level
Up, not invented here. Each plan defines: branch access, access times,
classes included, guest passes, freeze allowance, renewal terms, PT credits,
joining fee, discount rules.

## 12. Design direction

Black as the primary structural color, warm beige for backgrounds/premium
surfaces, white for clarity/spacing, strong typography, minimal clutter,
sharp geometric details, restrained animation. Feeling: **strong, modern,
disciplined, urban, premium — but still approachable.** Not: neon gaming UI,
generic purple AI dashboard, medical app, cheap fitness template, or overly
luxurious hotel app.

## 13. Deprioritize unless confirmed

Pool-lane reservations, complex recovery-room booking, full restaurant
kitchen workflows, advanced clinical nutrition, large spa-service modules,
unrelated wellness services. Keep the architecture ready for them; don't
make them central to the Level Up presentation.

## 14. The demo story

Instagram lead → assigned to Hamra → tour booked → buys all-branch
membership → QR issued → enters Hamra → books a trainer at Badaro → reserves
a TRX class in Gemmayzeh → instructor flags damaged equipment → maintenance
work order → capacity adjusts → member buys a protein product → reception
closes shift → owner sees activity across all branches.

## Proposal name

**Level Up OS** — *the operating system behind every Level Up location.*
(Alternative: **Level Up One** — *one membership, every branch, every team.*)

## Scope note added by this build

In addition to branch-level gym entry, access must also be modeled
**per zone within a branch** (gym floor, Fuel Bar & Retail, PT zone, TRX/
spinning studio, group-class room, staff-only areas) — see the zone-level
access control task in this repo's working plan. A member or staff QR check
must answer not just "is this person allowed in this branch" but "is this
person allowed in this zone, right now."
