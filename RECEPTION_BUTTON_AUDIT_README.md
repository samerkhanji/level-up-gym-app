# Reception button audit

Playwright audit that clicks every control on `web-demo/reception.html` and
records what actually happens.

## What it records per control

- Whether the control exists
- Whether clicking changed the page (scoped signals, not a page hash):
  modal or drawer opened (with its title), URL navigation, active department
  tab, gate-feed filter state, toast text, task-queue and gate-feed changes,
  offline banner, focus moves
- `window.prompt`/`confirm` dialogs raised (auto-dismissed, message recorded)
- Console errors and uncaught page errors during the click window
- Failed network requests
- Before-and-after screenshots

## What it deliberately does NOT do

- Never clicks buttons inside an opened modal or drawer — so it cannot submit
  payments, sell passes, publish announcements, grant entry or save changes.
  It records that the modal opened, then closes it.
- Blocks the Google-Sheet fetch during the run so every run audits the
  identical built-in fallback dataset (recorded in `meta.note`).
- Stops the page's gate-traffic simulator and clock before measuring, so a
  diff only ever reflects the click under test.

## Run

```
npm install
npx playwright install chromium
npx playwright test reception-button-audit.spec.js --project=chromium
```

Target defaults to `http://localhost:5500` (the local server that serves the
same files Vercel deploys). To audit production instead:

```
BASE_URL=https://gym-app-samers-projects-222dab7d.vercel.app npx playwright test reception-button-audit.spec.js
```

## Output

- `test-results/reception-button-audit/results.json` — per-control records +
  totals (`PASS` / `NO_EFFECT` / `ERROR` / `NOT_FOUND`)
- `test-results/reception-button-audit/shots/NN-name-before|after.png`
