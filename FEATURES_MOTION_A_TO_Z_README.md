# features.html + motion.html — A-to-Z audit

One Playwright suite (`features-motion-a-to-z-audit.spec.js`), two tests.

## Shared checks (both pages)

- Page load + HTTP status
- Every visible button, link and search control — visible-effect vs silent
- Console/JS errors and failed requests
- Mobile (375), tablet (768), desktop (1280) layouts + horizontal scroll
- Keyboard focus order
- Accessible names, duplicate IDs, sub-30px touch targets
- Before/after and layout screenshots

## features.html specifics

- Search matches names, descriptions and synonyms ("shake" → Café ordering)
- Junk search shows a guiding zero state
- Category filters work and persist across visits (sessionStorage)
- Coming-soon / unavailable cards are NON-transactional — Notify-me only,
  no link, no booking possible
- Staff workspaces are a separated, labeled section

## motion.html specifics

- No `transition: all` in any stylesheet
- Zero infinite animations at idle AND after running every demo
- Modal/drawer: focus moves in on open, Esc closes, focus returns to the
  trigger, background scroll locks and always unlocks
- Rapid open/close ×6 cannot stack overlays or leave scroll locked
- Five rapid toast triggers produce exactly one toast element
- Skeleton shimmer stops when content resolves (with a text loading state)
- `prefers-reduced-motion: reduce` collapses every transition to <50ms

## Run

```
npm install
npx playwright install chromium
npx playwright test features-motion-a-to-z-audit.spec.js --project=chromium
```

Production: prefix `BASE_URL=https://gym-app-samers-projects-222dab7d.vercel.app`

## Output

- `test-results/features-motion-a-to-z/features-report.json`
- `test-results/features-motion-a-to-z/motion-report.json`
- `test-results/features-motion-a-to-z/*.png`
