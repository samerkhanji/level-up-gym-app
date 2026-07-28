/*
 * Reception dashboard — A-to-Z audit.
 *
 * Checks: page load + HTTP status, every button and nav tab (visible-effect vs
 * no-effect), modals/drawers and their form fields, required/validation
 * attributes, console + JS errors, failed requests, mobile/tablet/desktop
 * layouts, horizontal-scroll problems, keyboard focus order, missing labels
 * and alt text, duplicate HTML IDs, reload stability, and before/after
 * screenshots.
 *
 * Non-destructive: top-level controls only. Buttons inside opened modals or
 * drawers are never clicked (no payments, access grants, announcements,
 * refunds or shift closures). Dialogs are dismissed and recorded. The
 * Google-Sheet fetch is blocked so every run audits the identical built-in
 * fallback dataset, and page timers are stopped before measuring.
 *
 * Output: test-results/reception-a-to-z/report.json + summary.md + *.png
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'test-results', 'reception-a-to-z');
const PAGE = '/reception.html';
const SETTLE = 500;
const VIEWPORTS = { mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1280, height: 800 } };

const slug = (s, i) => String(i).padStart(2, '0') + '-' + (s || 'x').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

async function freeze(page) {
  await page.evaluate(() => {
    let id = window.setInterval(() => {}, 100000);
    while (id > 0) { window.clearInterval(id); window.clearTimeout(id); id--; }
    document.querySelectorAll('.toast').forEach((t) => t.remove());
  });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const txt = (el) => (el ? el.innerText.trim() : null);
    const modalOpen = document.getElementById('overlay')?.classList.contains('show') || false;
    const drawerOpen = document.getElementById('drawerWrap')?.classList.contains('show') || false;
    return {
      url: location.pathname + location.hash,
      modalOpen, modalTitle: modalOpen ? txt(document.querySelector('#modalBox h3')) : null,
      drawerOpen, drawerTitle: drawerOpen ? txt(document.querySelector('#drawer b')) : null,
      activeNav: txt(document.querySelector('[data-nav].on')),
      activeFilter: txt(document.querySelector('#filters button.on')),
      toast: [...document.querySelectorAll('.toast')].map((t) => t.innerText.trim()).join(' | ') || null,
      taskCount: txt(document.getElementById('taskCount')),
      feedCount: document.querySelectorAll('#feed > *').length,
      searchDrop: document.getElementById('searchDrop')?.classList.contains('show') || false,
      searchFocused: document.activeElement?.id === 'searchBox',
    };
  });
}

function diff(b, a) {
  const c = [];
  if (a.url !== b.url) c.push(`navigated: ${b.url} → ${a.url}`);
  if (a.modalOpen && !b.modalOpen) c.push(`modal opened: "${a.modalTitle || 'untitled'}"`);
  if (!a.modalOpen && b.modalOpen) c.push('modal closed');
  if (a.drawerOpen && !b.drawerOpen) c.push(`drawer opened: "${a.drawerTitle || 'member'}"`);
  if (a.activeNav !== b.activeNav) c.push(`active tab: ${b.activeNav} → ${a.activeNav}`);
  if (a.activeFilter !== b.activeFilter) c.push(`gate filter: ${b.activeFilter} → ${a.activeFilter}`);
  if (a.toast) c.push(`toast: "${a.toast}"`);
  if (a.taskCount !== b.taskCount) c.push(`task count: ${b.taskCount} → ${a.taskCount}`);
  if (a.feedCount !== b.feedCount) c.push(`feed rows: ${b.feedCount} → ${a.feedCount}`);
  if (a.searchDrop && !b.searchDrop) c.push('search results opened');
  if (a.searchFocused && !b.searchFocused) c.push('search focused');
  return c;
}

test('reception A-to-Z audit', async ({ page, context, baseURL }) => {
  fs.mkdirSync(OUT, { recursive: true });
  const report = { meta: { target: baseURL + PAGE, when: new Date().toISOString() } };

  let sheetBlocked = 0;
  await context.route('**docs.google.com**', (r) => { sheetBlocked++; r.abort(); });

  const errors = [], failedReqs = [], dialogs = [];
  let current = 'page-load';
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if ((m.location()?.url || '').includes('docs.google.com')) return;
    errors.push({ at: current, text: m.text().slice(0, 250) });
  });
  page.on('pageerror', (e) => errors.push({ at: current, text: 'PAGEERROR: ' + String(e).slice(0, 250) }));
  page.on('requestfailed', (r) => { if (!r.url().includes('docs.google.com')) failedReqs.push({ at: current, url: r.url(), reason: r.failure()?.errorText }); });
  page.on('dialog', async (d) => { dialogs.push({ at: current, type: d.type(), message: d.message() }); await d.dismiss(); });

  const load = async () => {
    const resp = await page.goto(PAGE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await freeze(page);
    return resp;
  };

  /* ---------- 1. page load + HTTP ---------- */
  current = 'page-load';
  const resp = await load();
  report.load = { status: resp.status(), ok: resp.ok() };

  /* ---------- 2. static structure: duplicate IDs, labels/alt, validation ---------- */
  current = 'static-scan';
  report.structure = await page.evaluate(() => {
    const ids = {};
    document.querySelectorAll('[id]').forEach((el) => { ids[el.id] = (ids[el.id] || 0) + 1; });
    const dupIds = Object.entries(ids).filter(([, n]) => n > 1).map(([k, n]) => k + ' ×' + n);
    const unnamed = [...document.querySelectorAll('button, a')].filter((el) => {
      const r = el.getBoundingClientRect(); if (r.width === 0) return false;
      return !el.innerText.trim() && !el.getAttribute('aria-label') && !el.title && !el.querySelector('img[alt]');
    }).map((el) => el.outerHTML.slice(0, 90));
    const imgsNoAlt = [...document.querySelectorAll('img:not([alt])')].map((i) => i.src.slice(-50));
    const inputs = [...document.querySelectorAll('input, select, textarea')].filter((el) => el.getBoundingClientRect().width > 0);
    const unlabeled = inputs.filter((el) => {
      const hasLabel = el.id && document.querySelector(`label[for="${el.id}"]`);
      return !hasLabel && !el.getAttribute('aria-label') && !el.placeholder;
    }).map((el) => (el.id || el.name || el.tagName) + '');
    const requiredCount = inputs.filter((el) => el.required).length;
    return {
      duplicateIds: dupIds, unnamedControls: unnamed, imagesWithoutAlt: imgsNoAlt,
      visibleFields: inputs.length, unlabeledFields: unlabeled, fieldsWithRequiredAttr: requiredCount,
      note: 'validation in this demo is JS-level (reason codes, note-required resolves) rather than HTML required attributes',
    };
  });

  /* ---------- 3. responsive layouts + horizontal scroll ---------- */
  report.responsive = {};
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    current = 'responsive-' + name;
    await page.setViewportSize(vp);
    await load();
    const m = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
      offenders: [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 8 && el.getBoundingClientRect().width > 40)
        .slice(0, 5).map((el) => (el.className || el.tagName).toString().slice(0, 50)),
    }));
    await page.screenshot({ path: path.join(OUT, 'layout-' + name + '.png'), fullPage: false });
    report.responsive[name] = { ...vp, ...m, screenshot: 'layout-' + name + '.png' };
  }
  await page.setViewportSize(VIEWPORTS.desktop);

  /* ---------- 4. keyboard focus order ---------- */
  current = 'keyboard';
  await load();
  const focusOrder = [];
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    focusOrder.push(await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return '(body)';
      return (el.id ? '#' + el.id : '') + (el.innerText ? ' "' + el.innerText.trim().slice(0, 25) + '"' : '') + ' <' + el.tagName.toLowerCase() + '>';
    }));
  }
  const stuck = focusOrder.length > 3 && new Set(focusOrder).size === 1;
  report.keyboard = { focusOrder, focusTrap: stuck, shortcuts: { search: '/', pos: 'Ctrl+P', guest: 'Ctrl+G', close: 'Esc' } };

  /* ---------- 5. every control: effect vs no-effect ---------- */
  await load();
  const controls = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const list = [];
    document.querySelectorAll('button, a[href]').forEach((el) => {
      if (!vis(el) || el.closest('#overlay') || el.closest('#drawerWrap') || el.closest('#searchDrop')) return;
      const section = el.closest('#filters') ? 'gate filters' : el.closest('#tasks') ? 'tasks' : el.closest('#feed') ? 'gate feed'
        : el.dataset.nav !== undefined ? 'nav' : el.dataset.qa !== undefined ? 'quick actions'
        : el.closest('.topbar') ? 'topbar' : el.closest('.stats') ? 'stats' : 'other';
      el.setAttribute('data-audit-id', String(list.length));
      list.push({ index: list.length, tag: el.tagName.toLowerCase(), text: el.innerText.trim().replace(/\s+/g, ' ').slice(0, 55), section, href: el.getAttribute('href') });
    });
    return list;
  });

  const tagAll = () => page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    let i = 0;
    document.querySelectorAll('button, a[href]').forEach((el) => {
      if (!vis(el) || el.closest('#overlay') || el.closest('#drawerWrap') || el.closest('#searchDrop')) return;
      el.setAttribute('data-audit-id', String(i++));
    });
    return i;
  });

  const results = [];
  for (const c of controls) {
    current = `#${c.index} "${c.text}"`;
    const eB = errors.length, fB = failedReqs.length, dB = dialogs.length;
    const rec = { ...c, exists: false, effects: [], modalFields: null, verdict: 'NOT_FOUND', shots: {} };
    await load();
    const found = await tagAll();
    const loc = page.locator(`[data-audit-id="${c.index}"]`);
    if (found <= c.index || (await loc.count()) === 0) { results.push(rec); continue; }
    rec.exists = true;
    const before = await snapshot(page);
    rec.shots.before = slug(c.text, c.index) + '-before.png';
    await page.screenshot({ path: path.join(OUT, rec.shots.before) });
    try {
      if (c.tag === 'a' && c.href && !c.href.startsWith('#')) {
        const r2 = await page.request.get(c.href.startsWith('http') ? c.href : baseURL + '/' + c.href.replace(/^\//, ''));
        rec.effects.push(`link → HTTP ${r2.status()}`);
        rec.verdict = r2.ok() ? 'PASS' : 'ERROR';
      } else {
        await loc.click({ timeout: 3000 });
        await page.waitForTimeout(SETTLE);
        const after = await snapshot(page);
        rec.effects = diff(before, after);
        rec.shots.after = slug(c.text, c.index) + '-after.png';
        await page.screenshot({ path: path.join(OUT, rec.shots.after) });
        if (after.modalOpen || after.drawerOpen) {
          rec.modalFields = await page.evaluate(() => {
            const root = document.getElementById('overlay')?.classList.contains('show') ? '#modalBox' : '#drawer';
            const f = [...document.querySelectorAll(root + ' input, ' + root + ' select, ' + root + ' textarea')];
            return { fields: f.length, required: f.filter((x) => x.required).length, buttons: document.querySelectorAll(root + ' button').length };
          });
        }
        await page.evaluate(() => { window.closeModal?.(); window.closeDrawer?.(); });
      }
    } catch (e) { rec.effects.push('CLICK FAILED: ' + String(e).slice(0, 140)); }
    rec.dialogs = dialogs.slice(dB).map((d) => d.type + ': "' + d.message.slice(0, 60) + '" (dismissed)');
    rec.consoleErrors = errors.slice(eB).map((e) => e.text);
    rec.failedRequests = failedReqs.slice(fB).map((f) => f.url + ' (' + f.reason + ')');
    if (rec.verdict === 'NOT_FOUND' && rec.exists) {
      rec.verdict = rec.consoleErrors.length ? 'ERROR' : (rec.effects.length || rec.dialogs.length) ? 'PASS' : 'NO_EFFECT';
    }
    results.push(rec);
  }
  report.controls = results;

  /* ---------- 6. reload stability ---------- */
  current = 'reload-stability';
  await load();
  const s1 = await snapshot(page);
  await load();
  const s2 = await snapshot(page);
  report.reloadStability = {
    taskCountStable: s1.taskCount === s2.taskCount,
    before: { tasks: s1.taskCount, feed: s1.feedCount },
    after: { tasks: s2.taskCount, feed: s2.feedCount },
    note: 'feed row count may differ ±seeded random events; task duplication is the failure signal',
  };

  /* ---------- totals + summary.md ---------- */
  const t = {
    controls: results.length,
    pass: results.filter((r) => r.verdict === 'PASS').length,
    noEffect: results.filter((r) => r.verdict === 'NO_EFFECT').length,
    error: results.filter((r) => r.verdict === 'ERROR').length,
    notFound: results.filter((r) => r.verdict === 'NOT_FOUND').length,
    consoleErrors: errors.length, failedRequests: failedReqs.length,
    sheetFetchesBlockedByAudit: sheetBlocked,
  };
  report.totals = t;

  const md = [];
  md.push('# Reception A-to-Z audit — ' + new Date().toISOString());
  md.push('', 'Target: ' + baseURL + PAGE + ' (HTTP ' + report.load.status + ')', '');
  md.push('## Totals', '', '| Metric | Value |', '|---|---|');
  Object.entries(t).forEach(([k, v]) => md.push('| ' + k + ' | ' + v + ' |'));
  md.push('', '## Structure', '',
    '- Duplicate IDs: ' + (report.structure.duplicateIds.length ? report.structure.duplicateIds.join(', ') : 'none'),
    '- Unnamed buttons/links: ' + (report.structure.unnamedControls.length || 'none'),
    '- Images without alt: ' + (report.structure.imagesWithoutAlt.length || 'none'),
    '- Visible form fields: ' + report.structure.visibleFields + ' (unlabeled: ' + report.structure.unlabeledFields.length + ', with required attr: ' + report.structure.fieldsWithRequiredAttr + ')');
  md.push('', '## Responsive', '');
  Object.entries(report.responsive).forEach(([n, r]) =>
    md.push('- **' + n + '** (' + r.width + '×' + r.height + '): horizontal scroll ' + (r.horizontalScroll ? '⚠ YES — ' + r.offenders.join(', ') : 'none ✓')));
  md.push('', '## Keyboard', '', '- Focus trap: ' + (report.keyboard.focusTrap ? '⚠ YES' : 'none ✓'),
    '- First stops: ' + report.keyboard.focusOrder.slice(0, 5).join(' → '));
  md.push('', '## Controls (' + t.controls + ')', '', '| # | Control | Section | Verdict | Effect |', '|---|---|---|---|---|');
  results.forEach((r) => md.push('| ' + r.index + ' | ' + (r.text || '(unnamed)') + ' | ' + r.section + ' | ' + r.verdict + ' | ' + (r.effects.join('; ') || '—').slice(0, 90).replace(/\|/g, '/') + ' |'));
  md.push('', '## Reload stability', '', '- Tasks stable across reload: ' + (report.reloadStability.taskCountStable ? 'yes ✓' : '⚠ NO (' + report.reloadStability.before.tasks + ' → ' + report.reloadStability.after.tasks + ')'));
  if (errors.length) { md.push('', '## Console/JS errors', ''); errors.forEach((e) => md.push('- [' + e.at + '] ' + e.text)); }
  if (failedReqs.length) { md.push('', '## Failed requests', ''); failedReqs.forEach((f) => md.push('- [' + f.at + '] ' + f.url + ' (' + f.reason + ')')); }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'summary.md'), md.join('\n'));

  expect(t.notFound).toBe(0);
});
