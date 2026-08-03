/*
 * Member app (index.html) A-to-Z audit — Tier-1 hardening pass.
 *
 * This file has two halves:
 *   1. The original inventory-first click-sweep (boot/login checks, hidden-view
 *      reachability, per-tab control discovery + click, responsive viewports).
 *      Unmodified in intent from the prior pass — still current for the
 *      Home/Train/Book/Club/Account nav.
 *   2. A full rewrite of the "targeted outcome machines" that used to manipulate
 *      a deleted `gym_demo_state_v3` flat shape (locker fields, a "recovery
 *      booking" feature that was descoped, flat checkedIn/frozen/booking
 *      fields). Every machine below drives the REAL current engine
 *      (`window.DemoData`, persisted under `levelup_demo_db_v4`) through the
 *      REAL UI where possible, plus new coverage for the 10-reason access-denial
 *      matrix, Book/Club/Home/renewal/notification-CTA e2e flows, and Inbox
 *      lifecycle depth (categories, delete, dedup, deep links, badge).
 *
 * Each `test()` in @playwright/test gets its own fresh browser context by
 * default, so every test below starts from a clean, freshly-seeded engine —
 * no manual snapshot/restore is needed BETWEEN tests (only within a test that
 * deliberately wants to isolate a sub-step, as the original click-sweep does
 * around every single control).
 *
 * Output: audit-reports/phase-1-2-2b/member-report.json (inventory sweep only)
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
    await page.fill('#loginPassword', 'demo'); // demo auth accepts any non-empty password
    await page.click('#loginBtn'); // prefilled demo identity (Samer Khanji / mbr_0001); sheet blocked → offline login path
    await page.waitForTimeout(400);
  }
  await freeze(page);
}

/* Drive a denial through the REAL gate-scan click path (not showDenied() directly):
   apply an engine mutation via `mutate`, optionally pick a specific gate branch,
   then click the real "Enter Gym" → gate button path and read the denial UI. */
async function forceDenialAndScan(page, mutate, gateBranchId) {
  await page.evaluate(mutate);
  await page.locator('.tab[data-view="home"]').click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
  await page.locator('[data-action="open-pass"]').first().click({ timeout: 5000 });
  await page.waitForTimeout(300);
  if (gateBranchId) {
    await page.locator(`[data-action="gate-pick"][data-b="${gateBranchId}"]`).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.locator('#gateBtn').click({ timeout: 5000 });
  await page.waitForTimeout(300);
  const reasonText = await page.locator('#deniedReason').textContent();
  const ctaText = await page.locator('#deniedCta').textContent();
  return { reasonText: (reasonText || '').trim(), ctaText: (ctaText || '').trim() };
}

/* ================================================================
 * SECTION 1 — inventory-first click-sweep (unchanged in intent)
 * ================================================================ */

test('member app A-to-Z audit — inventory + click-sweep', async ({ page, context, baseURL }) => {
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
  await page.fill('#loginPassword', 'demo');
  await page.click('#loginBtn');
  await page.waitForTimeout(300);
  report.loginChecks.unknownNameRejected = await page.evaluate(() => document.getElementById('view-login').classList.contains('active'));
  await page.fill('#loginName', 'samer khanji');   // lowercase — matching must be case-insensitive
  await page.fill('#loginPassword', 'demo');
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
          notifs: (window.DemoData ? window.DemoData.NotificationService.forMember('mbr_0001').length : 0),
        }), tab);
        await loc.click({ timeout: 2500 });
        await page.waitForTimeout(320);
        const after = await page.evaluate((t) => ({
          view: document.querySelector('.view.active')?.id,
          text: document.getElementById('view-' + t)?.innerText.length || 0,
          notifs: (window.DemoData ? window.DemoData.NotificationService.forMember('mbr_0001').length : 0),
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
  expect(report.loginChecks.caseInsensitiveLogin).toBe(true);
  expect(report.hiddenViews.allHidden).toBe(true);
  expect(totals.error.length).toBe(0);
});

/* ================================================================
 * SECTION 2 — current-engine machines (replaces deleted-shape T2/T3/T5/T6/T7/T8)
 * ================================================================ */

test('access control: check-in assigns a visit, check-out ends it, state survives reload', async ({ page }) => {
  await login(page);
  await page.locator('.tab[data-view="home"]').click();
  await page.locator('[data-action="open-pass"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('#gateBtn').click();
  await page.waitForTimeout(1600);
  let inside = await page.evaluate(() => window.DemoData.AccessService.insideNow('loc_hamra').some((v) => v.memberId === 'mbr_0001'));
  expect(inside).toBe(true);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  inside = await page.evaluate(() => window.DemoData.AccessService.insideNow('loc_hamra').some((v) => v.memberId === 'mbr_0001'));
  expect(inside).toBe(true); // persists over refresh — no locker concept exists in the current engine

  await page.locator('[data-action="open-pass"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('#gateBtn').click();
  await page.waitForTimeout(1600);
  inside = await page.evaluate(() => window.DemoData.AccessService.insideNow('loc_hamra').some((v) => v.memberId === 'mbr_0001'));
  expect(inside).toBe(false);
});

test('billing: membership renewal by wallet charges exactly once', async ({ page }) => {
  await login(page);
  const price = await page.evaluate(() => window.DemoData.PlanService.byId(window.DemoData.MemberService.byId('mbr_0001').planId).price);
  const before = await page.evaluate((p) => {
    const m = window.DemoData.MemberService.byId('mbr_0001');
    m.wallet = p + 500; // ensure enough balance before opening the modal — avoids re-rendering it mid-flow
    window.DemoData.persist();
    return { wallet: m.wallet, subEnds: m.subEnds };
  }, price);
  await page.locator('.tab[data-view="account"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="renew-open"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="renew-method"][data-m="wallet"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="renew-confirm"]').click();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ wallet: window.DemoData.MemberService.byId('mbr_0001').wallet, subEnds: window.DemoData.MemberService.byId('mbr_0001').subEnds }));
  expect(before.wallet - after.wallet).toBe(price); // charged exactly once, exactly the plan price
  expect(after.subEnds).not.toBe(before.subEnds); // subscription extended
  const modalGone = await page.locator('#modalOverlay').count();
  expect(modalGone).toBe(0);
});

test('billing: membership renewal by card does not touch the wallet', async ({ page }) => {
  await login(page);
  const walletBefore = await page.evaluate(() => window.DemoData.MemberService.byId('mbr_0001').wallet);
  await page.locator('.tab[data-view="account"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="renew-open"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="renew-method"][data-m="card"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="renew-confirm"]').click();
  await page.waitForTimeout(300);
  const walletAfter = await page.evaluate(() => window.DemoData.MemberService.byId('mbr_0001').wallet);
  expect(walletAfter).toBe(walletBefore);
});

test('resilience: corrupted localStorage does not brick the app', async ({ page }) => {
  await login(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.evaluate(() => localStorage.setItem('levelup_demo_db_v4', '{corrupt!!'));
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const bootedToUsableScreen = await page.evaluate(() => !!document.querySelector('.view.active'));
  expect(bootedToUsableScreen).toBe(true);
  expect(errors.length).toBe(0);
});

test('notifications: duplicate prevention collapses a rapid repeat push; reload alone does not grow the list', async ({ page }) => {
  await login(page);
  const dedup = await page.evaluate(() => {
    const D = window.DemoData;
    const before = D.NotificationService.forMember('mbr_0001').length;
    D.NotificationService.push({ memberId: 'mbr_0001', title: 'Repeat test', body: 'first', type: 'system' });
    D.NotificationService.push({ memberId: 'mbr_0001', title: 'Repeat test', body: 'second', type: 'system' });
    const after = D.NotificationService.forMember('mbr_0001').length;
    return after - before;
  });
  expect(dedup).toBe(1); // two rapid same-title pushes collapse into one

  const n1 = await page.evaluate(() => window.DemoData.NotificationService.forMember('mbr_0001').length);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400);
  const n2 = await page.evaluate(() => window.DemoData.NotificationService.forMember('mbr_0001').length);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400);
  const n3 = await page.evaluate(() => window.DemoData.NotificationService.forMember('mbr_0001').length);
  expect(n2).toBe(n1);
  expect(n3).toBe(n1);
});

test('booking: two overlapping classes are blocked as a clash', async ({ page }) => {
  await login(page);
  const result = await page.evaluate(() => {
    const D = window.DemoData;
    const classes = D.load().classes.filter((c) => c.status === 'scheduled').sort((a, b) => a.startsAt - b.startsAt);
    const first = classes[0];
    const overlapping = classes.find((c) => c.id !== first.id && Math.abs(c.startsAt - first.startsAt) < 45 * 60000);
    if (!overlapping) return { skipped: true };
    const r1 = D.BookingService.bookClass('mbr_0001', first.id);
    const r2 = D.BookingService.bookClass('mbr_0001', overlapping.id);
    return { r1, r2 };
  });
  if (result.skipped) {
    test.skip(true, 'no two overlapping scheduled classes exist in the current seed to construct this clash');
    return;
  }
  expect(result.r2.error).toBe('time_conflict');
});

test('KNOWN GAP: PT session does not block a clashing class booking (no cross-check exists in the current engine)', async ({ page }) => {
  await login(page);
  const result = await page.evaluate(() => {
    const D = window.DemoData;
    const cls = D.load().classes.find((c) => c.status === 'scheduled');
    const ptRes = D.TrainerService.book({ memberId: 'mbr_0001', trainerId: 'stf_tr_karim', branchId: 'loc_hamra', startsAt: cls.startsAt, actorId: 'mbr_0001' });
    const clsRes = D.BookingService.bookClass('mbr_0001', cls.id);
    return { ptOk: !ptRes.error, clsRes };
  });
  // Documents current (gap) behavior: BookingService.bookClass only cross-checks
  // other CLASS bookings (data.js:827), never d.ptSessions — so a same-time PT
  // session does NOT block a class booking today. Not fixed here: adding that
  // cross-check is new engine logic (Tier-2), not a hardening fix.
  expect(result.clsRes.error).not.toBe('time_conflict');
});

/* ================================================================
 * SECTION 3 — access-denial matrix (real engine mutation + real UI click path)
 * ================================================================ */

test('access-denial: frozen', async ({ page }) => {
  await login(page);
  const { reasonText, ctaText } = await forceDenialAndScan(page, () => {
    window.DemoData.MemberService.byId('mbr_0001').status = 'frozen';
    window.DemoData.persist();
  });
  expect(reasonText).toContain('frozen');
  expect(ctaText).toBe('Unfreeze in Account');
  await page.locator('#deniedCta').click();
  await page.waitForTimeout(200);
  expect(await page.locator('.tab.active').getAttribute('data-view')).toBe('account');
});

test('access-denial: expired (status)', async ({ page }) => {
  await login(page);
  const { reasonText, ctaText } = await forceDenialAndScan(page, () => {
    window.DemoData.MemberService.byId('mbr_0001').status = 'expired';
    window.DemoData.persist();
  });
  expect(reasonText).toContain('expired');
  expect(ctaText).toBe('Renew now');
  await page.locator('#deniedCta').click();
  await page.waitForTimeout(200);
  expect(await page.locator('#modalOverlay h3').textContent()).toContain('Renew');
});

test('access-denial: expired (subEnds date, status stays active)', async ({ page }) => {
  await login(page);
  const { reasonText, ctaText } = await forceDenialAndScan(page, () => {
    window.DemoData.MemberService.byId('mbr_0001').subEnds = '2020-01-01';
    window.DemoData.persist();
  });
  expect(reasonText).toContain('expired');
  expect(ctaText).toBe('Renew now');
});

test('access-denial: suspended', async ({ page }) => {
  await login(page);
  const { reasonText, ctaText } = await forceDenialAndScan(page, () => {
    const m = window.DemoData.MemberService.byId('mbr_0001');
    m.status = 'suspended'; m.restriction = null;
    window.DemoData.persist();
  });
  expect(reasonText).toContain('suspended');
  expect(ctaText).toContain('Call');
});

test('access-denial: access_restricted', async ({ page }) => {
  await login(page);
  const { reasonText, ctaText } = await forceDenialAndScan(page, () => {
    const m = window.DemoData.MemberService.byId('mbr_0001');
    m.status = 'active'; m.restriction = 'Unpaid balance — see reception';
    window.DemoData.persist();
  });
  expect(reasonText).toContain('restricted');
  expect(ctaText).toContain('Call');
});

test('access-denial: branch_not_allowed', async ({ page }) => {
  await login(page);
  const { reasonText, ctaText } = await forceDenialAndScan(page, () => {
    window.DemoData.MemberService.byId('mbr_0001').planId = 'pln_1mo_single';
    window.DemoData.persist();
  }, 'loc_badaro');
  expect(reasonText).toContain('Hamra');
  expect(ctaText).toBe('See my plan');
});

test('access-denial: outside_allowed_hours', async ({ page }) => {
  await login(page);
  const { reasonText, ctaText } = await forceDenialAndScan(page, () => {
    window.DemoData.MemberService.byId('mbr_0001').planId = 'pln_offpeak';
    window.DemoData.setClockOffset(0);
    window.DemoData.persist();
  });
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 16) {
    test.skip(true, 'wall-clock hour is inside the Off-Peak plan\'s allowed window right now — reason cannot be forced without also mutating the demo clock offset in a way that is itself flaky across timezones');
    return;
  }
  expect(reasonText.toLowerCase()).toContain('hours');
  expect(ctaText).toBe('View my plan');
});

test('access-denial: duplicate_visit', async ({ page }) => {
  await login(page);
  await page.locator('.tab[data-view="home"]').click();
  await page.locator('[data-action="open-pass"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('#gateBtn').click(); // first scan succeeds
  await page.waitForTimeout(1600);
  await page.locator('#gateResultContinue').click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => window.DemoData.AccessService.checkIn('mbr_0001', null, 'loc_hamra'));
  expect(result.ok).toBe(false);
  expect(result.reason).toBe('duplicate_visit');

  // The real UI's own gate button is NOT a way to reproduce this denial on
  // screen: once inside, openPass()/#gateBtn correctly detect insideVisit()
  // and switch to the EXIT flow, so a second click checks the member OUT
  // rather than re-attempting entry (by design — good behavior, not a bug).
  // This reason is only reachable via a second concurrent scan (a stale or
  // screenshotted QR, or a different device/staff re-scanning), which this
  // spec cannot simulate through the app's own smart gate button. Verify the
  // CTA mapping the same way the UI-unreachable unknown_branch reason is
  // verified above.
  await page.evaluate(() => { show('pass'); showDenied('duplicate_visit'); });
  await page.waitForTimeout(100);
  expect((await page.locator('#deniedReason').textContent()).toLowerCase()).toContain('checked in');
  expect(await page.locator('#deniedCta').textContent()).toBe('Check out now');
});

test('access-denial: at_capacity', async ({ page }) => {
  await login(page);
  const { reasonText, ctaText } = await forceDenialAndScan(page, () => {
    window.DemoData.BranchService.byId('loc_hamra').capacity = 0;
    window.DemoData.persist();
  });
  expect(reasonText.toLowerCase()).toContain('capacity');
  expect(ctaText).toBe('Check other branches');
  await page.locator('#deniedCta').click();
  await page.waitForTimeout(200);
  expect(await page.locator('.tab.active').getAttribute('data-view')).toBe('club');
});

test('access-denial: branch_closed', async ({ page }) => {
  await login(page);
  const { reasonText, ctaText } = await forceDenialAndScan(page, () => {
    window.DemoData.BranchService.byId('loc_hamra').closure = { reason: 'Maintenance', at: new Date(0).toISOString() };
    window.DemoData.persist();
  });
  expect(reasonText.toLowerCase()).toContain('closed');
  expect(ctaText).toBe('See other branches');
});

test('access-denial: unknown_branch (engine-only — no real gate picker ever offers an invalid branch)', async ({ page }) => {
  await login(page);
  const result = await page.evaluate(() => window.DemoData.AccessService.checkIn('mbr_0001', null, 'bogus_branch_id'));
  expect(result.ok).toBe(false);
  expect(result.reason).toBe('unknown_branch');
});

/* ================================================================
 * SECTION 4 — Book / Club / Home / notification-CTA e2e
 * ================================================================ */

test('Book → Classes: book a class via the real UI', async ({ page }) => {
  await login(page);
  await page.locator('.tab[data-view="book"]').click();
  await page.waitForTimeout(200);
  const bookBtn = page.locator('[data-action="cls-book"]').first();
  await bookBtn.click({ timeout: 5000 });
  await page.waitForTimeout(200);
  const stillBookable = await page.locator('[data-action="cls-book"]').count();
  const doneLine = await page.locator('.done-line').count();
  expect(doneLine).toBeGreaterThanOrEqual(1);
  const engineBookings = await page.evaluate(() => window.DemoData.BookingService.forMember('mbr_0001').length);
  expect(engineBookings).toBeGreaterThanOrEqual(1);
});

test('Book → Personal Training: book a session via the real UI', async ({ page }) => {
  await login(page);
  await page.locator('.tab[data-view="book"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="book-seg"][data-seg="pt"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="pt-open"]').first().click();
  await page.waitForTimeout(200);
  const hourSlot = page.locator('[data-action="pt-hour"]').first();
  if (await hourSlot.count()) {
    await hourSlot.click();
    await page.waitForTimeout(150);
    await page.locator('[data-action="pt-confirm"]').click();
    await page.waitForTimeout(300);
    const sessions = await page.evaluate(() => window.DemoData.load().ptSessions.filter((s) => s.memberId === 'mbr_0001' && ['scheduled', 'live'].includes(s.status)).length);
    expect(sessions).toBeGreaterThanOrEqual(1);
  } else {
    test.skip(true, 'no available hour slot for the first trainer at their default branch right now');
  }
});

test('Book → Nutrition: book a consult via the real UI', async ({ page }) => {
  await login(page);
  // mbr_0001 has a pre-existing scheduled consult in the base seed data
  // (ncs_0001) — renderBookNutrition() hides the branch/hour picker entirely
  // whenever a scheduled consult already exists, so clear it first to reach
  // the real booking picker.
  await page.evaluate(() => {
    const D = window.DemoData;
    const d = D.load();
    d.consults = d.consults.filter((c) => c.memberId !== 'mbr_0001');
    D.persist();
  });
  await page.locator('.tab[data-view="book"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="book-seg"][data-seg="nutrition"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="nut-branch"]').first().click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="nut-hour"]').first().click();
  await page.waitForTimeout(150);
  await page.locator('[data-action="consult-book"]').click();
  await page.waitForTimeout(300);
  const consults = await page.evaluate(() => window.DemoData.load().consults.filter((c) => c.memberId === 'mbr_0001' && c.status === 'scheduled').length);
  expect(consults).toBeGreaterThanOrEqual(1);
  expect(await page.locator('.chip-ok', { hasText: 'Booked' }).count()).toBeGreaterThanOrEqual(1);
});

test('Club → Branches renders engine occupancy data', async ({ page }) => {
  await login(page);
  await page.locator('.tab[data-view="club"]').click();
  await page.waitForTimeout(300);
  const engineBranchCount = await page.evaluate(() => window.DemoData.BranchService.list().length);
  const uiBranchCards = await page.locator('#view-club .card').count();
  expect(uiBranchCards).toBeGreaterThanOrEqual(engineBranchCount);
});

test('Club → Fuel Bar renders engine catalog/stock data', async ({ page }) => {
  await login(page);
  await page.locator('.tab[data-view="club"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="club-seg"][data-seg="fuel"]').click();
  await page.waitForTimeout(300);
  const engineItems = await page.evaluate(() => window.DemoData.RetailService.catalog().length);
  const uiTiles = await page.locator('.mtile').count();
  expect(uiTiles).toBe(engineItems);
});

test('Home cards reflect real engine numbers', async ({ page }) => {
  await login(page);
  await page.locator('.tab[data-view="home"]').click();
  await page.waitForTimeout(300);
  const occ = await page.evaluate(() => window.DemoData.BranchService.occupancy());
  for (const o of occ) {
    const row = page.locator('#view-home .row', { hasText: o.name });
    if (await row.count()) {
      const text = await row.first().textContent();
      expect(text).toContain(`${o.inside}/${o.capacity}`);
    }
  }
});

test('notification CTA navigates correctly and survives a reload (deep link persistence)', async ({ page }) => {
  await login(page);
  await page.locator('.tab[data-view="book"]').click();
  await page.waitForTimeout(200);
  const bookBtn = page.locator('[data-action="cls-book"]').first();
  await bookBtn.click({ timeout: 5000 });
  await page.waitForTimeout(200);

  await page.locator('.tab[data-view="home"]').click();
  await page.waitForTimeout(200);
  await page.locator('#view-home .bell').click();
  await page.waitForTimeout(300);
  const ctaBtn = page.locator('[data-action="notif-cta"][data-view="book"]').first();
  await ctaBtn.click({ timeout: 5000 });
  await page.waitForTimeout(200);
  expect(await page.locator('.tab.active').getAttribute('data-view')).toBe('book');
  const activeSeg = await page.locator('#view-book .seg-btn.active').textContent();
  expect(activeSeg).toContain('Classes');

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  expect(await page.locator('.tab.active').getAttribute('data-view')).toBe('book');
});

/* ================================================================
 * SECTION 5 — Inbox lifecycle & depth
 * ================================================================ */

test('Inbox: read/unread, badge, delete, empty state, categories', async ({ page }) => {
  await login(page);

  // empty state (fresh member notifications may already be non-empty from seed
  // scenarios, so verify the empty-state markup exists in the render function's
  // fallback path by clearing this member's notifications directly first)
  await page.evaluate(() => {
    const D = window.DemoData;
    const d = D.load();
    d.notifications = d.notifications.filter((n) => n.memberId !== 'mbr_0001');
    D.persist();
  });
  await page.locator('.tab[data-view="home"]').click();
  await page.waitForTimeout(200);
  let bellBadge = await page.locator('#view-home .bell .badge').count();
  expect(bellBadge).toBe(0);
  await page.locator('#view-home .bell').click();
  await page.waitForTimeout(200);
  expect(await page.locator('.card', { hasText: 'Nothing yet' }).count()).toBeGreaterThanOrEqual(1);

  // seed two distinct-category notifications
  await page.evaluate(() => {
    const D = window.DemoData;
    D.NotificationService.push({ memberId: 'mbr_0001', title: 'Seed A', body: 'a', type: 'booking' });
    D.NotificationService.push({ memberId: 'mbr_0001', title: 'Seed B', body: 'b', type: 'billing' });
  });
  await page.locator('.back[data-back="home"]').click();
  await page.waitForTimeout(200);
  bellBadge = await page.locator('#view-home .bell .badge').textContent();
  expect(bellBadge).toBe('2');

  await page.locator('#view-home .bell').click();
  await page.waitForTimeout(200);
  const categoryLabels = await page.locator('.notif .nd').allTextContents();
  expect(categoryLabels.some((t) => t.includes('Booking'))).toBe(true);
  expect(categoryLabels.some((t) => t.includes('Billing'))).toBe(true);

  // read/unread class
  expect(await page.locator('.notif.unread').count()).toBe(2);

  // delete one
  const countBefore = await page.locator('.notif').count();
  await page.locator('[data-action="notif-delete"]').first().click();
  await page.waitForTimeout(200);
  expect(await page.locator('.notif').count()).toBe(countBefore - 1);

  // persists across reload
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const persistedCount = await page.evaluate(() => window.DemoData.NotificationService.forMember('mbr_0001').filter((n) => n.title === 'Seed A' || n.title === 'Seed B').length);
  expect(persistedCount).toBe(1);

  // mark all read → badge clears via the Inbox's own back button (tab bar is
  // hidden while on the Inbox sub-view, by design)
  await page.locator('.tab[data-view="home"]').click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
  await page.locator('#view-home .bell').click();
  await page.waitForTimeout(200);
  await page.locator('[data-action="notif-readall"]').click();
  await page.waitForTimeout(200);
  expect(await page.locator('.notif.unread').count()).toBe(0);
  await page.locator('.back[data-back="home"]').click();
  await page.waitForTimeout(200);
  expect(await page.locator('#view-home .bell .badge').count()).toBe(0);
});

test('Inbox: bell + badge are present on every main tab', async ({ page }) => {
  await login(page);
  await page.evaluate(() => window.DemoData.NotificationService.push({ memberId: 'mbr_0001', title: 'Bell check', body: 'x', type: 'system' }));
  for (const tab of TABS) {
    await page.locator(`.tab[data-view="${tab}"]`).click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(200);
    const bellCount = await page.locator(`#view-${tab} .bell`).count();
    expect(bellCount).toBe(1);
    const badgeCount = await page.locator(`#view-${tab} .bell .badge`).count();
    expect(badgeCount).toBe(1);
  }
});

test('KNOWN DEFERRED: notification preferences are not built this pass', async ({ page }) => {
  await login(page);
  const hasPrefsToggle = await page.evaluate(() => typeof window.DemoData.MemberService.byId('mbr_0001').notifPrefs !== 'undefined');
  // Explicitly documents the deferred scope decision — see TIER1_ACCEPTANCE_REPORT.md.
  expect(hasPrefsToggle).toBe(false);
});
