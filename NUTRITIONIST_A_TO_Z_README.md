# Nutritionist A-to-Z audit

Playwright audit of `web-demo/nutritionist.html`.

## What it checks

- Page loading and HTTP status
- Every button, link and tab — visible-effect vs silent clicks with
  before/after screenshots
- Console and JS errors, failed requests
- Mobile (375), tablet (768) and desktop (1280) layouts + horizontal scroll
- Keyboard focus order and focus traps
- Missing accessible names / alt text, duplicate IDs, small touch targets
- Reload stability and localStorage-change tracking

## Non-destructive guarantees

- All prompt/confirm dialogs are dismissed and recorded — appointments,
  assessments and recommendations never complete.
- Plans cannot be sent with unresolved allergy conflicts, and versions are
  never overwritten, so no clicking sequence can corrupt client data.
- State is reset before every load; the Google-Sheet fetch is blocked.

## Run

```
npm install
npx playwright install chromium
npx playwright test nutritionist-a-to-z-audit.spec.js --project=chromium
```

Production: prefix `BASE_URL=https://gym-app-samers-projects-222dab7d.vercel.app`

## Output

- `test-results/nutritionist-a-to-z/report.json`
- `test-results/nutritionist-a-to-z/summary.md`
- `test-results/nutritionist-a-to-z/*.png`
