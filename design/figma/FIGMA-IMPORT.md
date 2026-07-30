# Putting GYM-APP into Figma

Figma can't open HTML directly, but the app is a live public site — so the
**html.to.design** plugin (free, by divRIOTS) converts every page into fully
editable Figma layers: real text, real colors, layered frames. This is the
standard pipeline for HTML → Figma. Total time for the whole app: about an
evening.

## One-time setup (5 minutes)

1. In Figma: **Resources → Plugins → search "html.to.design" → run**.
2. Fonts are already in Figma's Google Fonts library — nothing to install:
   - **Bricolage Grotesque** (headings, big numerals)
   - **Instrument Sans** (body)
3. Design tokens: install **Tokens Studio for Figma** (free plugin), then
   *Tools → Load from file* → pick [`tokens.json`](tokens.json) from this
   folder. Colors, type sizes, radii and the two card shadows land as reusable
   styles/variables so recolors stay consistent while you edit.

## Importing the screens

In html.to.design paste each URL, set the viewport, import. Each arrives as
its own frame.

### Staff dashboards — viewport **1440 (Desktop)**

| Screen | URL |
|---|---|
| All-departments hub | `https://gym-app-samers-projects-222dab7d.vercel.app/staff.html` |
| Reception | `…/reception.html` |
| Café | `…/cafe.html` |
| Trainer | `…/trainer.html` |
| Nutritionist | `…/nutritionist.html` |
| Maintenance | `…/maintenance.html` |
| Instructor | `…/instructor.html` |
| Demo Control Center | `…/demo.html` |
| Features catalog | `…/features.html` |
| Motion spec | `…/motion.html` |

### Member app — viewport **390 (iPhone)**

The member app is state-driven (login + tabs live on one URL), so plain URL
import only captures the login screen. For the logged-in states use the
**html.to.design browser extension** ("Capture current tab" — it snapshots
the page exactly as it stands in YOUR browser):

1. Open `https://gym-app-samers-projects-222dab7d.vercel.app/` in Chrome.
2. Log in as `Samer Khanji` (any password).
3. Capture each state, one per tab click:

| # | State | How to reach it |
|---|---|---|
| 1 | Login | before logging in |
| 2 | Home | after login |
| 3 | Gate pass (QR) | Home → **Enter Gym** |
| 4 | Denied entry | Demo Control Center → *Membership payment failure*, log in as `Mohamad` → Enter Gym |
| 5 | Train tab | bottom nav |
| 6 | Gym tab (locker · guest pass · **pool** · equipment · SOS) | bottom nav |
| 7 | Food tab (café menu + cart) | bottom nav |
| 8 | Order tracking | place a café order first |
| 9 | Account tab (wallet · invoices · privacy) | bottom nav |
| 10 | Frozen state | log in as `Pamela <3` |

Tip: capture #4 and #10 last — they change local state; hit **Reset demo**
on the login screen afterwards.

## After import — 30 minutes of cleanup that pays off

- html.to.design produces absolute-positioned groups; select the main column
  in each frame and apply **Auto Layout** (Shift+A) top-down so edits reflow.
- Swap hard-coded fills for the Tokens Studio styles (select all → bulk
  restyle by value works well).
- Name frames after the table above so prototyping links stay legible.

## What you get vs. what stays behind

Editable in Figma: every layout, card, chip, color, all text.
Not carried over: animations/motion (see `…/motion.html` for the spec — the
durations and easings are documented there), hover states, and the live data
logic. Those stay the app's job — Figma gets the skin, the repo keeps the
brain.
