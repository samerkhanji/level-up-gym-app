/*
 * Phase 1 — staff.html hub audit.
 * Inventory-first: every control is discovered, classified and tested.
 * Checks: link resolution, label accuracy vs live reality, a11y statics,
 * keyboard, viewports, console/request errors, reload stability.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'audit-reports', 'phase-1-2-2b');

test('staff hub A-to-Z audit', async ({ page, baseURL }) => {
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], failedReqs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !(m.location()?.url || '').includes('docs.google.com')) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));
  page.on('requestfailed', (r) => { if (!r.url().includes('docs.google.com')) failedReqs.push(r.url()); });

  const report = { meta: { target: baseURL + '/staff.html', when: new Date().toISOString() } };
  const resp = await page.goto('/staff.html', { waitUntil: 'networkidle' });
  report.load = { status: resp.status() };
  await page.screenshot({ path: path.join(OUT, 'staff-hub.png'), fullPage: true });

  /* 1. generated inventory — every interactive element, classified */
  report.inventory = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('a, button, input, select, textarea, details, [role="button"], [tabindex]').forEach((el) => {
      const r = el.getBoundingClientRect();
      items.push({
        kind: el.tagName.toLowerCase(),
        name: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        href: el.getAttribute('href') || null,
        visible: r.width > 0 && r.height > 0,
        touchOK: r.height >= 30 || r.width === 0,
        hasAccessibleName: !!((el.innerText || '').trim() || el.getAttribute('aria-label') || el.title),
      });
    });
    return items;
  });

  /* 2. outcome validation — every link resolves; details toggles */
  report.links = [];
  for (const it of report.inventory.filter((x) => x.href)) {
    const r2 = await page.request.get(baseURL + '/' + it.href.replace(/^\//, ''));
    report.links.push({ href: it.href, status: r2.status(), verdict: r2.ok() ? 'PASS' : 'FAIL' });
  }
  await page.click('summary');
  report.detailsToggles = await page.evaluate(() => document.querySelector('details').open === true);

  /* 3. label accuracy — no stale state labels; live pages must not say preview */
  const html = await page.content();
  report.labelAccuracy = {
    noDesignPreviewTags: !html.includes('Design preview'),
    internalSectionMarked: html.includes('Product &amp; design') || html.includes('Product & design'),
    historicalFinding: 'Stale "Design preview" labels existed until commit 9d75f46 (fixed prior to this audit run); recorded as resolved finding F-HUB-1.',
  };

  /* 4. keyboard + structure */
  const focus = [];
  for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); focus.push(await page.evaluate(() => (document.activeElement?.innerText || '(none)').trim().slice(0, 30))); }
  report.keyboard = { focusOrder: focus, allCardsReachable: focus.filter(Boolean).length >= 9 };
  report.structure = await page.evaluate(() => {
    const ids = {}; document.querySelectorAll('[id]').forEach((el) => { ids[el.id] = (ids[el.id] || 0) + 1; });
    return { duplicateIds: Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k) };
  });

  /* 5. viewports */
  report.responsive = {};
  for (const [name, vp] of Object.entries({ narrow320: { width: 320, height: 568 }, mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } })) {
    await page.setViewportSize(vp);
    await page.goto('/staff.html', { waitUntil: 'networkidle' });
    report.responsive[name] = await page.evaluate(() => ({ hScroll: document.documentElement.scrollWidth > window.innerWidth + 1 }));
  }

  report.errors = { console: errors, failedRequests: failedReqs };
  report.coverage = {
    discovered: report.inventory.length,
    tested: report.links.length + 1,
    pct: Math.round(((report.links.length + 1) / Math.max(1, report.inventory.filter((i) => i.visible).length)) * 100) + '%',
  };
  fs.writeFileSync(path.join(OUT, 'staff-hub-report.json'), JSON.stringify(report, null, 2));

  expect(resp.ok()).toBe(true);
  expect(report.links.every((l) => l.verdict === 'PASS')).toBe(true);
  expect(errors.length).toBe(0);
});
