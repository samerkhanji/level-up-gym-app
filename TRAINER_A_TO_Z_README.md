# Trainer A-to-Z audit

Playwright audit of `web-demo/trainer.html`.

## What it checks

- Page loading and HTTP status
- Every button, link, nav tab and availability chip — visible-effect vs silent
  clicks, with before/after screenshots
- Console and JS errors, failed requests
- Mobile (375), tablet (768) and desktop (1280) layouts + horizontal scroll
- Keyboard focus order and focus traps
- Missing accessible names / alt text, duplicate HTML IDs, small touch targets
- Reload stability (schedule + availability must not drift)
- localStorage state changes per control

## Non-destructive guarantees

- All `prompt`/`confirm` dialogs are dismissed and recorded — so add-session,
  declines, substitutions and safety overrides never complete.
- Session completion is gated by required notes, so nothing can be deducted.
- Trainer state is reset before every load: each control is tested against the
  identical seeded day.
- The Google-Sheet fetch is blocked for determinism.

## Run

```
npm install
npx playwright install chromium
npx playwright test trainer-a-to-z-audit.spec.js --project=chromium
```

Defaults to `http://localhost:5500` (same files Vercel deploys). Production:
`BASE_URL=https://gym-app-samers-projects-222dab7d.vercel.app npx playwright test trainer-a-to-z-audit.spec.js`

## Output

- `test-results/trainer-a-to-z/report.json` — full machine-readable results
- `test-results/trainer-a-to-z/summary.md` — human-readable pass/fail report
- `test-results/trainer-a-to-z/*.png` — layout + before/after screenshots
