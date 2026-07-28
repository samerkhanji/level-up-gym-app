/*
 * Reception dashboard — button-by-button audit.
 *
 * For every control present on page load it records: existence, whether the
 * click produced an observable change (modal / drawer / navigation / tab or
 * filter state / toast / task-feed change), console errors, uncaught page
 * errors, failed network requests, and before/after screenshots.
 *
 * Deliberately non-destructive: only top-level controls are clicked. Buttons
 * INSIDE opened modals/drawers (Take $x, Publish, Create pass, Confirm, …)
 * are never clicked — the audit records that the modal opened, then closes it.
 * window.prompt/confirm dialogs are dismissed and recorded.
 *
 * Determinism: the page's own intervals (gate simulator, clock) are stopped
 * before measuring, and the Google-Sheet fetch is blocked so every run audits
 * the identical built-in fallback dataset.
 *
 * Output: test-results/reception-button-audit/results.json + shots/*.png
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'test-results', 'reception-button-audit');
const SHOT_DIR = path.join(OUT_DIR, 'shots');
const PAGE_PATH = '/reception.html';
const SETTLE_MS = 500;

function slug(s, i) {
  return String(i).padStart(2, '0') + '-' + (s || 'unnamed').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

/* Stop the page's own timers (gate simulator, clock, delayed system blip)
   so before/after comparisons only reflect the click under test. */
async function freezePage(page) {
  await page.evaluate(() => {
    let id = window.setInterval(() => {}, 100000);
    while (id > 0) { window.clearInterval(id); window.clearTimeout(id); id--; }
    document.querySelectorAll('.toast').forEach((t) => t.remove());
  });
}

/* Everything we compare before/after a click. Scoped signals, not a whole-page
   hash, so the diff names WHAT changed. */
async function snapshot(page) {
  return page.evaluate(() => {
    const txt = (el) => (el ? el.innerText.trim() : null);
    const modalOpen = document.getElementById('overlay')?.classList.contains('show') || false;
    const drawerOpen = document.getElementById('drawerWrap')?.classList.contains('show') || false;
    return {
      url: location.pathname + location.hash,
      modalOpen,
      modalTitle: modalOpen ? txt(document.querySelector('#modalBox h3')) : null,
      drawerOpen,
      drawerTitle: drawerOpen ? txt(document.querySelector('#drawer h3, #drawer .d-name, #drawer b')) : null,
      activeNav: txt(document.querySelector('[data-nav].on')),
      activeFilter: txt(document.querySelector('#filters button.on')),
      toast: [...document.querySelectorAll('.toast')].map((t) => t.innerText.trim()).join(' | ') || null,
      taskCount: txt(document.getElementById('taskCount')),
      taskTitles: [...document.querySelectorAll('#tasks .task-t')].map((e) => e.innerText.trim()),
      feedCount: document.querySelectorAll('#feed > *').length,
      offlineBanner: document.getElementById('offlineBanner')?.classList.contains('show') || false,
      searchFocused: document.activeElement?.id === 'searchBox',
      bodyChars: document.body.innerText.length,
    };
  });
}

function diff(before, after) {
  const changes = [];
  if (after.url !== before.url) changes.push(`navigated: ${before.url} → ${after.url}`);
  if (after.modalOpen && !before.modalOpen) changes.push(`modal opened: "${after.modalTitle || 'untitled'}"`);
  if (!after.modalOpen && before.modalOpen) changes.push('modal closed');
  if (after.drawerOpen && !before.drawerOpen) changes.push(`drawer opened: "${after.drawerTitle || 'untitled'}"`);
  if (after.activeNav !== before.activeNav) changes.push(`active tab: ${before.activeNav} → ${after.activeNav}`);
  if (after.activeFilter !== before.activeFilter) changes.push(`gate filter: ${before.activeFilter} → ${after.activeFilter}`);
  if (after.toast) changes.push(`toast: "${after.toast}"`);
  if (after.taskCount !== before.taskCount) changes.push(`task count: ${before.taskCount} → ${after.taskCount}`);
  if (after.feedCount !== before.feedCount) changes.push(`feed rows: ${before.feedCount} → ${after.feedCount}`);
  if (after.offlineBanner !== before.offlineBanner) changes.push(`offline banner: ${after.offlineBanner ? 'shown' : 'hidden'}`);
  if (after.searchFocused && !before.searchFocused) changes.push('search box focused');
  return changes;
}

test('audit every reception control', async ({ page, context, baseURL }) => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  // Determinism: audit the built-in fallback dataset, not the live sheet.
  let sheetBlocked = 0;
  await context.route('**docs.google.com**', (route) => { sheetBlocked++; route.abort(); });

  const errors = [];   // {control, type, text}
  const failedReqs = [];
  let currentControl = 'page-load';
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const src = m.location()?.url || '';
    if (src.includes('docs.google.com')) return; // resource error from the audit's own sheet block
    errors.push({ control: currentControl, type: 'console', text: m.text().slice(0, 300), src });
  });
  page.on('pageerror', (e) => errors.push({ control: currentControl, type: 'pageerror', text: String(e).slice(0, 300) }));
  page.on('requestfailed', (r) => {
    if (r.url().includes('docs.google.com')) return; // blocked by the audit itself
    failedReqs.push({ control: currentControl, url: r.url(), reason: r.failure()?.errorText });
  });
  const dialogs = [];
  page.on('dialog', async (d) => { dialogs.push({ control: currentControl, type: d.type(), message: d.message() }); await d.dismiss(); });

  const load = async () => {
    await page.goto(PAGE_PATH, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800); // let seedScreen + entrance animations finish
    await freezePage(page);
  };

  // ---- enumerate controls on a fresh load ----
  await load();
  const controls = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const list = [];
    document.querySelectorAll('button, a[href]').forEach((el) => {
      if (!vis(el)) return;
      if (el.closest('#overlay') || el.closest('#drawerWrap')) return; // nothing inside modals
      const section =
        el.closest('#filters') ? 'gate-feed filters' :
        el.closest('#tasks') ? 'needs-attention tasks' :
        el.closest('#feed') ? 'gate feed rows' :
        el.dataset.nav !== undefined ? 'department nav' :
        el.dataset.qa !== undefined ? 'quick actions' :
        el.closest('header, .topbar') ? 'header' : 'other';
      el.setAttribute('data-audit-id', String(list.length));
      list.push({
        index: list.length,
        tag: el.tagName.toLowerCase(),
        text: el.innerText.trim().replace(/\s+/g, ' ').slice(0, 60),
        id: el.id || null,
        attrs: { qa: el.dataset.qa ?? null, nav: el.dataset.nav ?? null, open: el.dataset.open ?? null, task: el.dataset.task ?? null, href: el.getAttribute('href') },
        section,
      });
    });
    return list;
  });

  const tagControls = () => page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    let i = 0;
    document.querySelectorAll('button, a[href]').forEach((el) => {
      if (!vis(el) || el.closest('#overlay') || el.closest('#drawerWrap')) return;
      el.setAttribute('data-audit-id', String(i++));
    });
    return i;
  });

  const results = [];
  for (const c of controls) {
    currentControl = `#${c.index} "${c.text}"`;
    const errBefore = errors.length, failBefore = failedReqs.length, dlgBefore = dialogs.length;
    const rec = { ...c, exists: false, clicked: false, effects: [], verdict: 'NOT_FOUND', shots: {} };

    await load();
    const found = await tagControls();
    const loc = page.locator(`[data-audit-id="${c.index}"]`);
    if (found <= c.index || (await loc.count()) === 0) { results.push(rec); continue; }
    rec.exists = true;

    const before = await snapshot(page);
    rec.shots.before = path.join('shots', slug(c.text, c.index) + '-before.png');
    await page.screenshot({ path: path.join(OUT_DIR, rec.shots.before) });

    try {
      if (c.tag === 'a') {
        // Links: verify target resolves instead of navigating away mid-audit.
        const href = c.attrs.href;
        const resp = await page.request.get(href.startsWith('http') ? href : baseURL + '/' + href.replace(/^\//, ''));
        rec.clicked = true;
        rec.effects.push(`link target ${href} → HTTP ${resp.status()}`);
        rec.verdict = resp.ok() ? 'PASS' : 'ERROR';
      } else {
        await loc.click({ timeout: 3000 });
        rec.clicked = true;
        await page.waitForTimeout(SETTLE_MS);
        const after = await snapshot(page);
        rec.effects = diff(before, after);
        rec.shots.after = path.join('shots', slug(c.text, c.index) + '-after.png');
        await page.screenshot({ path: path.join(OUT_DIR, rec.shots.after) });
        // never interact inside what opened — just close it
        await page.evaluate(() => { window.closeModal?.(); window.closeDrawer?.(); });
      }
    } catch (e) {
      rec.effects.push('CLICK FAILED: ' + String(e).slice(0, 160));
    }

    rec.dialogs = dialogs.slice(dlgBefore).map((d) => `${d.type}: "${d.message}" (dismissed)`);
    rec.consoleErrors = errors.slice(errBefore).map((e) => e.text);
    rec.failedRequests = failedReqs.slice(failBefore).map((f) => `${f.url} (${f.reason})`);
    if (rec.verdict === 'NOT_FOUND' && rec.clicked) {
      if (rec.consoleErrors.length) rec.verdict = 'ERROR';
      else if (rec.effects.length || rec.dialogs.length) rec.verdict = 'PASS';
      else rec.verdict = 'NO_EFFECT';
    }
    results.push(rec);
  }

  const summary = {
    meta: {
      target: baseURL + PAGE_PATH,
      when: new Date().toISOString(),
      note: 'Non-destructive: top-level controls only; modal-internal buttons never clicked; dialogs auto-dismissed; sheet fetch blocked (' + sheetBlocked + 'x) so the fallback dataset is audited deterministically.',
      totals: {
        controls: results.length,
        pass: results.filter((r) => r.verdict === 'PASS').length,
        noEffect: results.filter((r) => r.verdict === 'NO_EFFECT').length,
        error: results.filter((r) => r.verdict === 'ERROR').length,
        notFound: results.filter((r) => r.verdict === 'NOT_FOUND').length,
      },
    },
    controls: results,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(summary, null, 2));

  expect(summary.meta.totals.notFound).toBe(0);
});
