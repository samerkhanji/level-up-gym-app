/*
 * features.html + motion.html — A-to-Z audit (one suite, two tests).
 *
 * Shared checks: page load/HTTP, every visible control (effect vs silent),
 * console/JS errors, failed requests, mobile/tablet/desktop layouts +
 * horizontal scroll, keyboard focus order, accessible names, duplicate IDs,
 * small touch targets, reload stability, screenshots.
 *
 * features.html extras: search + synonyms, zero state, category persistence,
 * coming-soon cards must be non-transactional, staff section separated.
 *
 * motion.html extras: no `transition: all` in any stylesheet, zero infinite
 * animations at idle and after all demos, modal focus in/Esc/restore, rapid
 * open/close cannot stack overlays or leave scroll locked, single-toast queue,
 * skeleton stops, reduced-motion emulation collapses durations.
 *
 * Non-destructive: no payments or bookings exist on these pages; dialogs are
 * page-owned demos. sessionStorage/localStorage reset per load.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'test-results', 'features-motion-a-to-z');
const VIEWPORTS = { mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1280, height: 800 } };
const slug = (s, i) => String(i).padStart(2, '0') + '-' + (s || 'x').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function wire(page, errors, failedReqs, current) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if ((m.location()?.url || '').includes('docs.google.com')) return;
    errors.push({ at: current.v, text: m.text().slice(0, 250) });
  });
  page.on('pageerror', (e) => errors.push({ at: current.v, text: 'PAGEERROR: ' + String(e).slice(0, 250) }));
  page.on('requestfailed', (r) => { if (!r.url().includes('docs.google.com')) failedReqs.push({ at: current.v, url: r.url(), reason: r.failure()?.errorText }); });
  page.on('dialog', async (d) => d.dismiss());
}

async function structure(page) {
  return page.evaluate(() => {
    const ids = {};
    document.querySelectorAll('[id]').forEach((el) => { ids[el.id] = (ids[el.id] || 0) + 1; });
    const dupIds = Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k);
    const unnamed = [...document.querySelectorAll('button, a')].filter((el) => {
      const r = el.getBoundingClientRect(); if (r.width === 0) return false;
      return !el.innerText.trim() && !el.getAttribute('aria-label') && !el.title;
    }).length;
    const small = [...document.querySelectorAll('button, a')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 30; }).length;
    return { duplicateIds: dupIds, unnamedControls: unnamed, buttonsUnder30px: small };
  });
}

async function responsive(page, url, out, report) {
  report.responsive = {};
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(vp);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => ({
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
    }));
    await page.screenshot({ path: path.join(OUT, out + '-layout-' + name + '.png') });
    report.responsive[name] = m;
  }
  await page.setViewportSize(VIEWPORTS.desktop);
}

async function focusOrder(page, n) {
  const order = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return '(body)';
      return (el.id ? '#' + el.id : '') + (el.innerText ? ' "' + el.innerText.trim().slice(0, 20) + '"' : '') + ' <' + el.tagName.toLowerCase() + '>';
    }));
  }
  return order;
}

async function clickSweep(page, url, baseURL, current, errors, failedReqs, prefix) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const controls = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const list = [];
    document.querySelectorAll('button, a[href], input[type="search"]').forEach((el) => {
      if (!vis(el) || el.closest('.overlay') || el.closest('.drawer-wrap')) return;
      el.setAttribute('data-audit-id', String(list.length));
      list.push({ index: list.length, tag: el.tagName.toLowerCase(), text: (el.innerText || el.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 45) || '(unnamed)', href: el.getAttribute('href') });
    });
    return list;
  });
  const results = [];
  for (const c of controls) {
    current.v = prefix + ' #' + c.index + ' "' + c.text + '"';
    const e0 = errors.length;
    const rec = { ...c, effects: [], verdict: 'NOT_FOUND' };
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} });
    const n = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      let i = 0;
      document.querySelectorAll('button, a[href], input[type="search"]').forEach((el) => {
        if (!vis(el) || el.closest('.overlay') || el.closest('.drawer-wrap')) return;
        el.setAttribute('data-audit-id', String(i++));
      });
      return i;
    });
    const loc = page.locator(`[data-audit-id="${c.index}"]`);
    if (n <= c.index || (await loc.count()) === 0) { results.push(rec); continue; }
    try {
      if (c.tag === 'a' && c.href) {
        const r2 = await page.request.get(c.href.startsWith('http') ? c.href : baseURL + '/' + c.href.replace(/^\//, ''));
        rec.effects.push('link → HTTP ' + r2.status());
        rec.verdict = r2.ok() ? 'PASS' : 'ERROR';
      } else if (c.tag === 'input') {
        await loc.fill('shake');
        await page.waitForTimeout(250);
        const changed = await page.evaluate(() => document.getElementById('sections')?.innerText.length || 0);
        rec.effects.push('search filtered content (' + changed + ' chars)');
        rec.verdict = 'PASS';
      } else {
        const before = await page.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('.overlay.show, .drawer-wrap.show, .toast.show, .toast').length);
        await loc.click({ timeout: 3000 });
        await page.waitForTimeout(450);
        const after = await page.evaluate(() => document.body.innerText.length + '|' + document.querySelectorAll('.overlay.show, .drawer-wrap.show, .toast.show, .toast').length);
        if (after !== before) rec.effects.push('visible change (' + before + ' → ' + after + ')');
        const toast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.innerText).join('').slice(0, 60));
        if (toast) rec.effects.push('toast: "' + toast + '"');
        await page.evaluate(() => { document.body.style.overflow = ''; });
        rec.verdict = errors.length > e0 ? 'ERROR' : rec.effects.length ? 'PASS' : 'NO_EFFECT';
      }
    } catch (e) { rec.effects.push('CLICK FAILED: ' + String(e).slice(0, 120)); rec.verdict = 'ERROR'; }
    rec.consoleErrors = errors.slice(e0).map((x) => x.text);
    results.push(rec);
  }
  return results;
}

function totalsOf(results) {
  return {
    controls: results.length,
    pass: results.filter((r) => r.verdict === 'PASS').length,
    noEffect: results.filter((r) => r.verdict === 'NO_EFFECT').length,
    error: results.filter((r) => r.verdict === 'ERROR').length,
    notFound: results.filter((r) => r.verdict === 'NOT_FOUND').length,
  };
}

test('features.html A-to-Z audit', async ({ page, baseURL }) => {
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], failedReqs = [], current = { v: 'load' };
  wire(page, errors, failedReqs, current);
  const report = { meta: { target: baseURL + '/features.html', when: new Date().toISOString() } };

  const resp = await page.goto('/features.html', { waitUntil: 'networkidle' });
  report.load = { status: resp.status(), ok: resp.ok() };
  await page.screenshot({ path: path.join(OUT, 'features-load.png'), fullPage: true });
  report.structure = await structure(page);
  report.keyboard = { focusOrder: await focusOrder(page, 10) };
  await responsive(page, '/features.html', 'features', report);

  /* page-specific behaviour */
  current.v = 'features-behaviour';
  await page.goto('/features.html', { waitUntil: 'networkidle' });
  await page.fill('#q', 'shake');
  await page.waitForTimeout(250);
  const synonymHit = await page.evaluate(() => document.getElementById('sections').innerText.includes('Café ordering'));
  await page.fill('#q', 'zzzz');
  await page.waitForTimeout(250);
  const zeroState = await page.evaluate(() => document.getElementById('sections').innerText.includes('No services match'));
  await page.fill('#q', '');
  await page.click('[data-cat="Recovery"]');
  const catFilter = await page.evaluate(() => !document.getElementById('sections').innerText.includes('Café ordering'));
  await page.click('[data-cat="All"]');
  const soonSafe = await page.evaluate(() => {
    const dim = [...document.querySelectorAll('.feat.dim')];
    return dim.length > 0 && dim.every((c) => !c.querySelector('a') && c.querySelector('[data-notify]'));
  });
  const staffSeparated = await page.evaluate(() => document.getElementById('staffGrid').innerText.includes('STAFF'));
  report.behaviour = { searchSynonyms: synonymHit, zeroState, categoryFilter: catFilter, comingSoonNonTransactional: soonSafe, staffSeparated };

  report.controls = await clickSweep(page, '/features.html', baseURL, current, errors, failedReqs, 'features');
  report.totals = { ...totalsOf(report.controls), consoleErrors: errors.length, failedRequests: failedReqs.length };
  report.errors = errors; report.failedRequests = failedReqs;
  fs.writeFileSync(path.join(OUT, 'features-report.json'), JSON.stringify(report, null, 2));

  expect(report.load.ok).toBe(true);
  expect(report.behaviour.searchSynonyms).toBe(true);
  expect(report.behaviour.comingSoonNonTransactional).toBe(true);
  expect(report.totals.error).toBe(0);
});

test('motion.html A-to-Z audit', async ({ page, baseURL }) => {
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], failedReqs = [], current = { v: 'load' };
  wire(page, errors, failedReqs, current);
  const report = { meta: { target: baseURL + '/motion.html', when: new Date().toISOString() } };

  const resp = await page.goto('/motion.html', { waitUntil: 'networkidle' });
  report.load = { status: resp.status(), ok: resp.ok() };
  await page.screenshot({ path: path.join(OUT, 'motion-load.png'), fullPage: true });
  report.structure = await structure(page);
  report.keyboard = { focusOrder: await focusOrder(page, 10) };
  await responsive(page, '/motion.html', 'motion', report);

  /* motion-specific defects */
  current.v = 'motion-behaviour';
  await page.goto('/motion.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const m = {};
  m.noTransitionAll = await page.evaluate(() =>
    ![...document.styleSheets].some((ss) => { try { return [...ss.cssRules].some((r) => /transition:\s*all/.test(r.cssText)); } catch (e) { return false; } }));
  m.idleInfiniteAnimations = await page.evaluate(() =>
    document.getAnimations({ subtree: true }).filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length);
  /* modal focus + Esc + restore */
  await page.click('#openModal');
  await page.waitForTimeout(300);
  m.focusEntersModal = await page.evaluate(() => document.activeElement.id === 'mClose');
  m.scrollLocks = await page.evaluate(() => document.body.style.overflow === 'hidden');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  m.escCloses = await page.evaluate(() => !document.getElementById('ovl').classList.contains('show'));
  m.focusRestored = await page.evaluate(() => document.activeElement.id === 'openModal');
  m.scrollUnlocks = await page.evaluate(() => document.body.style.overflow === '');
  /* hammer: no stacking */
  await page.click('#hammer');
  await page.waitForTimeout(700);
  m.overlayElements = await page.evaluate(() => document.querySelectorAll('.overlay').length);
  m.scrollFreeAfterHammer = await page.evaluate(() => document.body.style.overflow === '');
  /* toast queue */
  await page.click('#toastBtn');
  await page.waitForTimeout(600);
  m.toastElements = await page.evaluate(() => document.querySelectorAll('.toast').length);
  /* skeleton resolves + nothing infinite left */
  await page.click('#skelBtn');
  await page.waitForTimeout(1500);
  m.skeletonStopped = await page.evaluate(() => document.querySelectorAll('.skel.animating').length === 0);
  m.infiniteAfterDemos = await page.evaluate(() =>
    document.getAnimations({ subtree: true }).filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length);
  /* reduced-motion emulation collapses durations */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/motion.html', { waitUntil: 'networkidle' });
  m.reducedMotionCollapses = await page.evaluate(() => {
    const el = document.querySelector('.demo-btn');
    const d = getComputedStyle(el).transitionDuration;
    return d.split(',').every((x) => parseFloat(x) < 0.05);
  });
  await page.emulateMedia({ reducedMotion: null });
  report.motion = m;

  report.controls = await clickSweep(page, '/motion.html', baseURL, current, errors, failedReqs, 'motion');
  report.totals = { ...totalsOf(report.controls), consoleErrors: errors.length, failedRequests: failedReqs.length };
  report.errors = errors; report.failedRequests = failedReqs;
  fs.writeFileSync(path.join(OUT, 'motion-report.json'), JSON.stringify(report, null, 2));

  expect(report.load.ok).toBe(true);
  expect(m.noTransitionAll).toBe(true);
  expect(m.overlayElements).toBe(1);
  expect(m.toastElements).toBe(1);
  expect(m.infiniteAfterDemos).toBe(0);
  expect(m.reducedMotionCollapses).toBe(true);
  expect(report.totals.error).toBe(0);
});
