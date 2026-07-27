# GYM-APP — Product Spec & Screen Map

One platform, three surfaces, one backend:

1. **Member mobile app** (phone = access card + gym record)
2. **Staff/Trainer interface** (reception + trainers)
3. **Management web dashboard** (owner/manager)
4. Backend: **Supabase** (Postgres, Auth, Realtime, Edge Functions) + gate verify API

---

## V1 Scope (build this first)

- Member registration + login, one registered device per account
- Dynamic QR gym entry (rotating ~25s, server-verified, screenshot-proof)
- Entry/exit records, active session ("You are inside"), visit history + stats
- Anti-passback (can't enter twice without exiting)
- Trainer schedules + booking
- Subscription view / renew / freeze, plan rules
- Live gym capacity (quiet / moderate / busy)
- Café menu (view only — ordering is Phase 2)
- Meal plan viewing (assigned by nutritionist)
- Push notifications (bookings, renewals, "forgot to check out?")
- Reception override flow (dead phone / lost device) — fully logged
- Management dashboard: live occupancy, members, subscriptions, access logs, reports

**Deferred:** NFC/BLE gate unlock (QR first — hardware-independent), café ordering + wallet, lockers, equipment/zones, guest passes, loyalty, corporate, marketplace, white-label.

---

## Member App — Screen Map

### A. Auth & Onboarding
| Screen | Contents |
|---|---|
| A1 Welcome | Logo, Login / Join buttons |
| A2 Register | Name, phone, email, photo capture, password |
| A3 OTP Verify | Phone verification |
| A4 Device Binding | Registers this device as THE device (device ID stored server-side); explains one-phone rule |
| A5 Login | Email/phone + password, then biometric setup prompt |

### B. Home
- Greeting + membership status chip (Active / Expiring / Frozen / Blocked)
- **Big "Enter Gym" button** (state-aware: becomes "You're inside — 47 min" card when checked in)
- Gym capacity meter (quiet/moderate/busy, people inside)
- Next booking card (trainer session / class)
- Quick actions: Book trainer, Menu, My plan, Visits

### C. Entry / Exit
| Screen | Contents |
|---|---|
| C1 Entry Pass | Gated by Face ID/fingerprint. Shows: member photo + name, branch, membership status, **dynamic QR** (refreshes ~25s with countdown ring), FLAG_SECURE/screenshot block. Same screen used at exit gate. |
| C2 Inside Session | Entered at 6:15 PM, live duration timer, branch, "Check out" hint |
| C3 Entry Problem | Denied reasons: expired subscription, unpaid balance, wrong branch, already inside (anti-passback), unregistered device → each with resolution CTA |

**QR mechanics:** Edge Function issues a short-TTL signed token (member ID + device ID + branch + timestamp). Gate scanner POSTs it to `/verify-entry`; server checks subscription, device match, branch, balance, anti-passback state → responds open/deny + logs `access_event`. Offline fallback: gate device holds a recent encrypted member allowlist; app holds a limited offline credential (time-boxed, logged on reconnect).

### D. Visits
- Current status, this-month visit count, average duration, most-visited branch
- History table: date, entered, exited, duration
- Visit detail: timeline (entry → trainer session → class → exit) — grows richer in later phases

### E. Trainers
| Screen | Contents |
|---|---|
| E1 Trainer List | Live status (Available now / With client / At 4:30 / Off today), specialty, languages, rating, price |
| E2 Trainer Profile | Bio, specialties, packages, reviews, available slots |
| E3 Booking | Pick slot → confirm → trainer accepts/rejects → reminder push |
| E4 My Sessions | Upcoming + past, package balance ("3 of 10 remaining"), reschedule/cancel, **member confirms session completion** (trainer can't self-mark paid sessions done) |

### F. Classes
- Calendar, class detail (instructor, capacity, spots left), reserve / waitlist, cancel window, check-in via same entry pass, post-class rating. No-show tracking.

### G. Nutrition
- Café menu: categories, item detail (price, calories, macros, allergens, availability)
- My meal plan: assigned plan, daily meals, macros, reminders. Disclaimer unless assigned by licensed nutritionist.

### H. Subscription & Account
- Current plan, expiry, renew / upgrade / freeze (rules enforced, e.g. 30 frozen days/year)
- Invoices & receipts, payment method
- Profile, registered device (replacement requires reception approval), notification preferences, privacy (export/delete data)

---

## Staff / Trainer Interface

### Reception
- Live entry feed (who's scanning right now, photo shown for identity match)
- Member search → profile: photo, subscription, balance, inside/outside status
- **Manual override:** entry or exit after identity check → requires reason + staff ID, fully audit-logged
- Register member, replace registered device, handle payments, freeze/unfreeze

### Trainer
- Availability editor, booking requests (accept/reject), today's sessions
- Client profiles: program, progress, private notes
- Mark session complete → member confirms → package decrements

---

## Management Dashboard (web)

| Section | Contents |
|---|---|
| Live | Everyone inside now (name, photo, entered at, duration), capacity %, entries/exits ticker, never-checked-out list |
| Access & Security | Failed attempts, manual overrides log, suspicious device activity, anti-passback violations |
| Members | CRUD, subscription status, visit frequency, at-risk flags (regulars gone quiet) |
| Subscriptions | Plans admin, revenue, expiring soon, failed payments, freezes |
| Trainers | Utilization, bookings, packages sold |
| Classes | Schedules admin, attendance, no-show rates |
| Café | Menu admin (Phase 2: orders, revenue) |
| Reports | Peak hours/days, avg visit duration, retention, new registrations |
| Staff & Roles | Owner / Manager / Reception / Trainer / Nutritionist / Café / Accountant — role-based access (Supabase RLS) |

---

## Core Data Model (Supabase)

`branches` · `members` · `member_devices` (one active per member) · `plans` · `subscriptions` (+ freezes) · `gym_sessions` (entry/exit, branch, gate, method, status inside/outside) · `access_events` (every attempt: success/fail/override, reason) · `staff` (+ roles) · `trainers` · `trainer_packages` · `trainer_bookings` · `classes` · `class_bookings` · `menu_items` · `meal_plans` · `notifications` · `audit_log`

Edge Functions: `issue-entry-token`, `verify-entry` (gate calls this), `checkout-reminder` (geofence-triggered push — reminder only, never auto-closes visit).

---

## Phases

- **P1 (V1):** everything above
- **P2:** café ordering + gym wallet, lockers, guest passes, workout tracking
- **P3:** NFC/BLE entry, zones/equipment availability, loyalty, corporate accounts
- **P4:** recovery/retail/marketplace, wearables, AI coach, white-label multi-gym
