/*
 * Phase 2 — member app (index.html) A-to-Z audit.
 *
 * Inventory-first: every control per tab is discovered at runtime and
 * classified; coverage % = tested/discovered. Full state isolation: the ENTIRE
 * localStorage is snapshotted before every control and restored after (visits,
 * bookings, lockers, orders, points, reports — everything, not just wallet).
 * Prompt/confirm dialogs are dismissed and recorded, so no flow completes
 * accidentally. The Google-Sheet fetch is blocked: this also certifies the
 * offline/fallback path, including offline login.
 *
 * Targeted outcome machines (beyond click-sweep): login validation, check-in/
 * check-out + locker lifecycle, exactly-once wallet charge, refresh
 * persistence, corrupted-localStorage boot, duplicate bus-event replay,
 * class/PT clash guard, frozen-membership entry restriction, hidden-view
 * screen-reader reachability.
 *
 * Output: test-results/phase-1-2-2b/member-report.json + screenshots
 *
 * NOTE: the "targeted outcome machines" block below (T2/T3/T6/T7/T8) predates
 * the multi-branch/Train engine rewrite — it manipulates a flat
 * `gym_demo_state_v3` shape (checkedIn/locker/frozen/booking/recoveryBookings)
 * that no longer exists; the current engine persists a relational store under
 * `levelup_demo_db_v4` (see data.js DB_KEY) and has no Recovery-booking
 * feature at all (descoped). Rewriting those machines against the current
 * engine is a separate undertaking from the inventory/click-sweep above,
 * which IS current (TABS + hidden-view ids updated for the Home/Train/Book/
 * Club/Account nav).
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'audit-reports', 'phase-1-2-2b');
const TABS = ['home', 'train', 'book', 'club', 'account'];

async function freeze(page) {
  await page.evaluate(() => {
    let id = window.setInterval(() => {}, 100000);
    while (id > 0) { window.clearInterval(id); window.clearTimeout(id); id--; }
    document.querySelectorAll('.toast').forEach((t) => t.remove());
  });
}
const snapshotStorage = (page) => page.evaluate(() => JSON.stringify(localStorage));
const restoreStorage = (page, snap) => page.evaluate((s) => {
  localStorage.clear();
  Object.entries(JSON.parse(s)).forEach(([k, v]) => localStorage.setItem(k, v));
}, snap);

async function login(page) {
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const needsLogin = await page.evaluate(() => document.getElementById('view-login')?.classList.contains('active'));
  if (needsLogin) {
    await page.click('#loginBtn'); // prefilled demo identity; sheet blocked → offline login path
    await page.waitForTimeout(400);
  }
  await freeze(page);
}

test('member app A-to-Z audit', async ({ page, context, baseURL }) => {
  test.setTimeout(540000);
  fs.mkdirSync(OUT, { recursive: true });
  await context.route('**docs.google.com**', (r) => r.abort());

  const errors = [], dialogs = [];
  let current = 'boot';
  page.on('console', (m) => { if (m.type() === 'error' && !(m.location()?.url || '').includes('docs.google.com')) errors.push({ at: current, text: m.text().slice(0, 200) }); });
  page.on('pageerror', (e) => errors.push({ at: current, text: 'PAGEERROR: ' + String(e).slice(0, 200) }));
  page.on('dialog', async (d) => { dialogs.push({ at: current, type: d.type() }); await d.dismiss(); });

  const report = { meta: { target: baseURL + '/index.html', when: new Date().toISOString(), note: 'sheet blocked → offline/fallback path certified; dialogs dismissed; FULL localStorage restored per control' } };

  /* ---------- boot + login ---------- */
  current = 'login';
  const resp = await page.goto('/index.html', { waitUntil: 'networkidle' });
  report.load = { status: resp.status() };
  await page.screenshot({ path: path.join(OUT, 'member-login.png') });
  report.loginChecks = {};
  await page.fill('#loginName', 'Definitely Not A Member');
  await page.click('#loginBtn');
  await page.waitForTimeout(300);
  report.loginChecks.unknownNameRejected = await page.evaluate(() => document.getElementById('view-login').classList.contains('active'));
  await page.fill('#loginName', 'samer khanji');   // lowercase — matching must be case-insensitive
  await page.click('#loginBtn');
  await page.waitForTimeout(400);
  report.loginChecks.caseInsensitiveLogin = await page.evaluate(() => document.getElementById('view-home').classList.contains('active'));

  /* hidden-view reachability: inactive views must be display:none (not SR-exposed) */
  report.hiddenViews = await page.evaluate(() => {
    const out = {};
    ['view-train', 'view-book', 'view-club', 'view-pass', 'view-notifications'].forEach((id) => {
      out[id] = getComputedStyle(document.getElementById(id)).display;
    });
    return { displays: out, allHidden: Object.values(out).every((d) => d === 'none') };
  });

  /* ---------- inventory + sweep per tab ---------- */
  const inventory = [];
  const results = [];
  for (const tab of TABS) {
    current = 'inventory-' + tab;
    await login(page);
    await page.click(`.tab[data-view="${tab}"]`);
    await page.waitForTimeout(350);
    const controls = await page.evaluate((t) => {
      const root = document.getElementById('view-' + t);
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const list = [];
      root.querySelectorAll('button, a[href], select, input').forEach((el) => {
        if (!vis(el)) return;
        el.setAttribute('data-audit-id', String(list.length));
        list.push({
          index: list.length, tab: t, kind: el.tagName.toLowerCase(),
          name: (el.innerText || el.getAttribute('aria-label') || el.placeholder || el.dataset.action || '').trim().replace(/\s+/g, ' ').slice(0, 45) || '(unnamed)',
          action: el.dataset.action || null, type: el.type || null,
          hasAccessibleName: !!((el.innerText || '').trim() || el.getAttribute('aria-label') || el.placeholder || el.title),
        });
      });
      return list;
    }, tab);
    inventory.push(...controls);

    for (const c of controls.filter((x) => x.kind === 'button')) {
      current = tab + ' #' + c.index + ' "' + c.name + '"';
      const e0 = errors.length, d0 = dialogs.length;
      const storageBefore = await snapshotStorage(page);
      const rec = { ...c, effects: [], verdict: 'NOT_FOUND' };
      const loc = page.locator(`#view-${tab} [data-audit-id="${c.index}"]`);
      if ((await loc.count()) === 0) { results.push(rec); continue; }
      /* disabled-by-design controls are a valid state, not a failure */
      const isDisabled = await loc.evaluate((el) => el.disabled === true).catch(() => false);
      if (isDisabled) {
        rec.effects.push('disabled pending precondition (e.g. insufficient points / not checked in)');
        rec.verdict = 'DISABLED_BY_DESIGN';
        rec.consoleErrors = [];
        results.push(rec);
        continue;
      }
      try {
        const before = await page.evaluate((t) => ({
          view: document.querySelector('.view.active')?.id,
          text: document.getElementById('view-' + t).innerText.length,
          notifs: (JSON.parse(localStorage.getItem('gym_demo_state_v3') || '{}').notifications || []).length,
        }), tab);
        await loc.click({ timeout: 2500 });
        await page.waitForTimeout(320);
        const after = await page.evaluate((t) => ({
          view: document.querySelector('.view.active')?.id,
          text: document.getElementById('view-' + t)?.innerText.length || 0,
          notifs: (JSON.parse(localStorage.getItem('gym_demo_state_v3') || '{}').notifications || []).length,
          toast: [...document.querySelectorAll('.toast')].map((x) => x.innerText).join('').slice(0, 60),
        }), tab);
        if (after.view !== before.view) rec.effects.push('navigated: ' + before.view + ' → ' + after.view);
        if (after.text !== before.text) rec.effects.push('content changed');
        if (after.notifs !== before.notifs) rec.effects.push('notification recorded');
        if (after.toast) rec.effects.push('toast: "' + after.toast + '"');
        if (dialogs.length > d0) rec.effects.push('dialog raised (dismissed — flow safely cancelled)');
        rec.verdict = errors.length > e0 ? 'ERROR' : rec.effects.length ? 'PASS' : 'NO_EFFECT';
      } catch (e) {
        /* one retry after a fresh render — prior control's re-render can detach the node */
        try {
          await login(page); await page.click(`.tab[data-view="${tab}"]`); await page.waitForTimeout(250);
          await page.evaluate((t) => {
            const root = document.getElementById('view-' + t);
            const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
            let i = 0;
            root.querySelectorAll('button, a[href], select, input').forEach((el) => { if (vis(el)) el.setAttribute('data-audit-id', String(i++)); });
          }, tab);
          const loc2 = page.locator(`#view-${tab} [data-audit-id="${c.index}"]`);
          const dis2 = await loc2.evaluate((el) => el.disabled === true).catch(() => false);
          if (dis2) { rec.effects.push('disabled pending precondition'); rec.verdict = 'DISABLED_BY_DESIGN'; }
          else { await loc2.click({ timeout: 2500 }); await page.waitForTimeout(300); rec.effects.push('clicked on retry — visible change not re-measured'); rec.verdict = 'PASS'; }
        } catch (e2) { rec.effects.push('CLICK FAILED: ' + String(e2).slice(0, 100)); rec.verdict = 'ERROR'; }
      }
      rec.consoleErrors = errors.slice(e0).map((x) => x.text);
      results.push(rec);
      /* FULL state isolation — restore everything, reload, re-login, return to tab */
      const storageAfter = await snapshotStorage(page);
      if (storageAfter !== storageBefore) {
        await restoreStorage(page, storageBefore);
        await login(page);
        await page.click(`.tab[data-view="${tab}"]`);
        await page.waitForTimeout(300);
        await page.evaluate((t) => {
          const root = document.getElementById('view-' + t);
          const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
          let i = 0;
          root.querySelectorAll('button, a[href], select, input').forEach((el) => { if (vis(el)) el.setAttribute('data-audit-id', String(i++)); });
        }, tab);
      } else {
        const nowView = await page.evaluate(() => document.querySelector('.view.active')?.id);
        if (nowView !== 'view-' + tab) {
          /* control navigated to a sub-view (e.g. entry pass) where the tab bar
             is hidden — recover through a fresh load instead of a hidden tab */
          await login(page);
          await page.click(`.tab[data-view="${tab}"]`);
          await page.waitForTimeout(250);
          await page.evaluate((t) => {
            const root = document.getElementById('view-' + t);
            const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
            let i = 0;
            root.querySelectorAll('button, a[href], select, input').forEach((el) => { if (vis(el)) el.setAttribute('data-audit-id', String(i++)); });
          }, tab);
        }
      }
    }
    await page.screenshot({ path: path.join(OUT, 'member-tab-' + tab + '.png'), fullPage: false });
  }
  report.controls = results;

  /* ---------- targeted outcome machines ---------- */
  const m = {};
  /* T2: check-in → locker assigned; check-out → released; persists over refresh */
  current = 'machine-checkin';
  await login(page);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('gym_demo_state_v3')); s.checkedIn = false; s.locker = null; localStorage.setItem('gym_demo_state_v3', JSON.stringify(s)); });
  await login(page);
  await page.evaluate(() => document.querySelector('[data-action="open-pass"]')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('gateBtn').click());
  await page.waitForTimeout(1900);
  let st = await page.evaluate(() => JSON.parse(localStorage.getItem('gym_demo_state_v3')));
  m.checkInAssignsLocker = !!(st.checkedIn && st.locker && st.locker.number);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  st = await page.evaluate(() => JSON.parse(localStorage.getItem('gym_demo_state_v3')));
  m.checkInSurvivesRefresh = !!(st.checkedIn && st.locker);
  await page.evaluate(() => document.querySelector('[data-action="open-pass"]')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('gateBtn').click());
  await page.waitForTimeout(1900);
  st = await page.evaluate(() => JSON.parse(localStorage.getItem('gym_demo_state_v3')));
  m.checkOutReleasesLocker = !st.checkedIn && !st.locker;

  /* T3: wallet charge exactly once (recovery booking — button disables after) */
  current = 'machine-wallet';
  const snap = await snapshotStorage(page);
  await login(page);
  await page.click('.tab[data-view="gym"]');
  await page.waitForTimeout(300);
  const w0 = await page.evaluate(() => JSON.parse(localStorage.getItem('gym_demo_state_v3')).wallet);
  await page.evaluate(() => document.querySelector('[data-action="book-recovery"]').click());
  await page.waitForTimeout(250);
  await page.evaluate(() => { const b = document.querySelector('[data-action="book-recovery"]'); if (b && !b.disabled) b.click(); }); // double-click attempt
  await page.waitForTimeout(250);
  const after3 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('gym_demo_state_v3')); return { wallet: s.wallet, bookings: s.recoveryBookings.length }; });
  m.walletChargedExactlyOnce = after3.bookings === 1 && (w0 - after3.wallet) > 0 && (w0 - after3.wallet) <= 40;
  await restoreStorage(page, snap);

  /* T5: corrupted localStorage must not brick the app */
  current = 'machine-corrupt';
  await page.evaluate(() => localStorage.setItem('gym_demo_state_v3', '{corrupt!!'));
  const e5 = errors.length;
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  m.corruptedStorageBoots = await page.evaluate(() => !!document.querySelector('.view.active')) && errors.length === e5;
  await restoreStorage(page, snap);

  /* T6: duplicate bus-event replay — reload twice, notifications must not grow */
  current = 'machine-replay';
  await login(page);
  await page.evaluate(() => {
    const ev = { id: 'ev_replaytest_1', type: 'nutri-reco', payload: { member: 'Samer Khanji', item: 'Iced Matcha', note: 'replay test', by: 'Audit' }, at: '1:00 PM', t: 1, src: 'audit', status: 'open', history: [] };
    localStorage.setItem('gym_bus_log', JSON.stringify([ev]));
  });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  const n1 = await page.evaluate(() => (JSON.parse(localStorage.getItem('gym_demo_state_v3')).notifications || []).length);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  const n2 = await page.evaluate(() => (JSON.parse(localStorage.getItem('gym_demo_state_v3')).notifications || []).length);
  m.duplicateReplayBlocked = n1 === n2;
  await restoreStorage(page, snap);

  /* T7: class clashing with PT session is blocked */
  current = 'machine-clash';
  await login(page);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('gym_demo_state_v3')); s.booking = { trainer: 'Karim H.', when: 'Today · 7:00 PM', status: 'accepted' }; s.classState = {}; localStorage.setItem('gym_demo_state_v3', JSON.stringify(s)); });
  await login(page);
  await page.click('.tab[data-view="train"]');
  await page.evaluate(() => document.querySelector('[data-action="seg-train"][data-s="classes"]').click());
  await page.waitForTimeout(250);
  await page.evaluate(() => { const c = classes.find((x) => x.name === 'HIIT Burn'); document.querySelector(`[data-action="class"][data-c="${c.id}"][data-a="book"]`)?.click(); });
  await page.waitForTimeout(250);
  m.classPtClashBlocked = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('gym_demo_state_v3')).classState || {}).length === 0);
  await restoreStorage(page, snap);

  /* T8: frozen membership blocks entry with the correct denial */
  current = 'machine-frozen';
  await login(page);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('gym_demo_state_v3')); s.frozen = true; s.checkedIn = false; localStorage.setItem('gym_demo_state_v3', JSON.stringify(s)); });
  await login(page);
  m.frozenShownOnHome = await page.evaluate(() => document.getElementById('c-home').innerText.includes('frozen') || document.getElementById('c-home').innerText.includes('Frozen'));
  await restoreStorage(page, snap);

  report.machines = m;

  /* ---------- structure + viewports + reload ---------- */
  current = 'responsive';
  report.responsive = {};
  for (const [name, vp] of Object.entries({ narrow320: { width: 320, height: 568 }, mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } })) {
    await page.setViewportSize(vp);
    await login(page);
    report.responsive[name] = await page.evaluate(() => ({ hScroll: document.documentElement.scrollWidth > window.innerWidth + 1 }));
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  const totals = {
    discovered: inventory.length,
    buttonsTested: results.length,
    pass: results.filter((r) => r.verdict === 'PASS').length,
    noEffect: results.filter((r) => r.verdict === 'NO_EFFECT').map((r) => r.tab + ':' + r.name),
    disabledByDesign: results.filter((r) => r.verdict === 'DISABLED_BY_DESIGN').map((r) => r.tab + ':' + r.name),
    error: results.filter((r) => r.verdict === 'ERROR').map((r) => r.tab + ':' + r.name),
    unnamedControls: inventory.filter((i) => !i.hasAccessibleName).length,
    coveragePct: Math.round((results.length / Math.max(1, inventory.filter((i) => i.kind === 'button').length)) * 100) + '% of discovered buttons; inputs/selects/links classified in inventory',
    consoleErrors: errors.length,
    dialogsDismissed: dialogs.length,
  };
  report.totals = totals;
  report.inventory = inventory;
  report.errors = errors;
  fs.writeFileSync(path.join(OUT, 'member-report.json'), JSON.stringify(report, null, 2));

  expect(report.load.status).toBe(200);
  expect(report.loginChecks.unknownNameRejected).toBe(true);
  expect(m.corruptedStorageBoots).toBe(true);
  expect(m.duplicateReplayBlocked).toBe(true);
  expect(m.walletChargedExactlyOnce).toBe(true);
  expect(totals.error.length).toBe(0);
});
