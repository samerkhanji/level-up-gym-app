# Reception A-to-Z audit

Playwright audit of `web-demo/reception.html` covering the full checklist:

- Page loading and HTTP status
- Every button and navigation tab — visible-effect vs no-effect clicks
- Modals, drawers and their form fields
- Required-field and validation attributes
- Console and JavaScript errors
- Failed requests
- Mobile (375), tablet (768) and desktop (1280) layouts
- Horizontal-scrolling problems (with offending elements named)
- Keyboard focus order and focus-trap detection
- Missing accessible names and alt text
- Duplicate HTML IDs
- Reload stability (task duplication is the failure signal)
- Before-and-after screenshots for every control and layout

## Non-destructive guarantees

- Only top-level controls are clicked. Buttons inside opened modals/drawers are
  inventoried (field/required/button counts) but never clicked — so the audit
  cannot complete payments, grant access, publish announcements, issue refunds
  or close shifts.
- `prompt`/`confirm` dialogs are dismissed and recorded.
- The Google-Sheet fetch is blocked during the run so every run audits the
  identical built-in fallback dataset; the page's own timers are stopped before
  each measurement.

## Run

```
npm install
npx playwright install chromium
npx playwright test reception-a-to-z-audit.spec.js --project=chromium
```

Target defaults to `http://localhost:5500` (serves the same files Vercel
deploys). For production: `BASE_URL=https://gym-app-samers-projects-222dab7d.vercel.app npx playwright test reception-a-to-z-audit.spec.js`

## Output

- `test-results/reception-a-to-z/report.json` — full machine-readable results
- `test-results/reception-a-to-z/summary.md` — human-readable pass/fail report
- `test-results/reception-a-to-z/*.png` — layout + before/after screenshots
