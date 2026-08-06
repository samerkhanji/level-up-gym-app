/*
 * Trainer dashboard — A-to-Z audit.
 *
 * Checks: page load + HTTP status, every button/link/tab/availability chip
 * (visible-effect vs silent), console + JS errors, failed requests,
 * mobile/tablet/desktop layouts + horizontal scroll, keyboard focus order,
 * missing accessible names / alt text, duplicate HTML IDs, reload stability,
 * localStorage state changes, before/after screenshots.
 *
 * Non-destructive: prompt/confirm dialogs are DISMISSED (so add-session,
 * declines, overrides and substitutions never complete). Session completion is
 * gated by required notes, so clicking it cannot deduct anything. Trainer
 * state is reset before every load so each control is tested against the
 * identical seeded day. The Google-Sheet fetch is blocked.
 *
 * Output: test-results/trainer-a-to-z/report.json + summary.md + *.png
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'test-results', 'trainer-a-to-z');
const PAGE = '/trainer.html';
const SETTLE = 450;
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
    return {
      url: location.pathname,
      activeSec: txt(document.querySelector('#mainSeg button.on')),
      liveOpen: !document.getElementById('liveCard')?.classList.contains('hidden'),
      liveTitle: txt(document.getElementById('liveTitle')),
      clientOpen: !document.getElementById('clientCard')?.classList.contains('hidden'),
      clientHead: txt(document.querySelector('#clientCard .eyebrow')),
      scheduleStatuses: [...document.querySelectorAll('#schedule .st')].map((e) => e.innerText).join(','),
      queueText: txt(document.getElementById('queue'))?.slice(0, 60),
      availOn: document.querySelectorAll('.slot.on').length,
      tasksDone: document.querySelectorAll('#taskList input:checked').length,
      toast: [...document.querySelectorAll('.toast')].map((t) => t.innerText.trim()).join(' | ') || null,
      banner: txt(document.getElementById('arrivalBanner'))?.slice(0, 40) || null,
      lsKeys: Object.keys(localStorage).sort().join(','),
    };
  });
}

function diff(b, a) {
  const c = [];
  if (a.activeSec !== b.activeSec) c.push(`section: ${b.activeSec} → ${a.activeSec}`);
  if (a.liveOpen && !b.liveOpen) c.push(`live session opened: "${(a.liveTitle || '').slice(0, 50)}"`);
  if (a.clientOpen && !b.clientOpen) c.push(`client file opened: "${a.clientHead || ''}"`);
  if (!a.clientOpen && b.clientOpen) c.push('client file closed');
  if (a.scheduleStatuses !== b.scheduleStatuses) c.push(`schedule status change: ${b.scheduleStatuses} → ${a.scheduleStatuses}`);
  if (a.availOn !== b.availOn) c.push(`open availability slots: ${b.availOn} → ${a.availOn}`);
  if (a.tasksDone !== b.tasksDone) c.push(`tasks checked: ${b.tasksDone} → ${a.tasksDone}`);
  if (a.toast) c.push(`toast: "${a.toast}"`);
  if (a.queueText !== b.queueText) c.push('queue changed');
  if (a.lsKeys !== b.lsKeys) c.push('localStorage keys changed');
  return c;
}

test('trainer A-to-Z audit', async ({ page, context, baseURL }) => {
  fs.mkdirSync(OUT, { recursive: true });
  const report = { meta: { target: baseURL + PAGE, when: new Date().toISOString() } };

  let sheetBlocked = 0;
  await context.route('**docs.google.com**', (r) => { sheetBlocked++; r.abort(); });
  /* deterministic: every load starts from the seeded day */
  await context.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });

  const errors = [], failedReqs = [], dialogs = [];
  let current = 'page-load';
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if ((m.location()?.url || '').includes('docs.google.com') || (m.location()?.url || '').includes('fonts.g')) return;
    errors.push({ at: current, text: m.text().slice(0, 250) });
  });
  page.on('pageerror', (e) => errors.push({ at: current, text: 'PAGEERROR: ' + String(e).slice(0, 250) }));
  page.on('requestfailed', (r) => { if (!r.url().includes('docs.google.com') && !r.url().includes('fonts.g')) failedReqs.push({ at: current, url: r.url(), reason: r.failure()?.errorText }); });
  page.on('dialog', async (d) => { dialogs.push({ at: current, type: d.type(), message: d.message().slice(0, 60) }); await d.dismiss(); });

  const load = async () => {
    const resp = await page.goto(PAGE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await freeze(page);
    return resp;
  };

  /* 1. load */
  current = 'page-load';
  const resp = await load();
  report.load = { status: resp.status(), ok: resp.ok() };
  await page.screenshot({ path: path.join(OUT, 'load-desktop.png'), fullPage: true });

  /* 2. structure + accessibility statics */
  current = 'static-scan';
  report.structure = await page.evaluate(() => {
    const ids = {};
    document.querySelectorAll('[id]').forEach((el) => { ids[el.id] = (ids[el.id] || 0) + 1; });
    const dupIds = Object.entries(ids).filter(([, n]) => n > 1).map(([k, n]) => k + ' ×' + n);
    const unnamed = [...document.querySelectorAll('button, a')].filter((el) => {
      const r = el.getBoundingClientRect(); if (r.width === 0) return false;
      return !el.innerText.trim() && !el.getAttribute('aria-label') && !el.title;
    }).map((el) => el.outerHTML.slice(0, 80));
    const imgsNoAlt = [...document.querySelectorAll('img:not([alt])')].length;
    const inputs = [...document.querySelectorAll('input, select, textarea')].filter((el) => el.getBoundingClientRect().width > 0);
    const unlabeled = inputs.filter((el) => {
      const hasLabel = el.id && document.querySelector(`label[for="${el.id}"]`);
      return !hasLabel && !el.getAttribute('aria-label') && !el.placeholder && el.type !== 'checkbox';
    }).length;
    const small = [...document.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height < 30; }).length;
    return { duplicateIds: dupIds, unnamedControls: unnamed, imagesWithoutAlt: imgsNoAlt, visibleFields: inputs.length, unlabeledFields: unlabeled, buttonsUnder30px: small };
  });

  /* 3. responsive */
  report.responsive = {};
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    current = 'responsive-' + name;
    await page.setViewportSize(vp);
    await load();
    const m = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
      offenders: [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 8 && el.getBoundingClientRect().width > 40)
        .slice(0, 5).map((el) => (el.className || el.tagName).toString().slice(0, 40)),
    }));
    await page.screenshot({ path: path.join(OUT, 'layout-' + name + '.png') });
    report.responsive[name] = { ...vp, ...m };
  }
  await page.setViewportSize(VIEWPORTS.desktop);

  /* 4. keyboard focus order */
  current = 'keyboard';
  await load();
  const focusOrder = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    focusOrder.push(await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return '(body)';
      return (el.id ? '#' + el.id : '') + (el.innerText ? ' "' + el.innerText.trim().slice(0, 22) + '"' : '') + ' <' + el.tagName.toLowerCase() + '>';
    }));
  }
  report.keyboard = { focusOrder, focusTrap: focusOrder.length > 3 && new Set(focusOrder).size === 1 };

  /* 5. every control (buttons, links, availability chips) */
  await load();
  const SEL = 'button, a[href], .slot[data-av]';
  const controls = await page.evaluate((sel) => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const list = [];
    document.querySelectorAll(sel).forEach((el) => {
      if (!vis(el) || el.closest('#clientCard') || el.closest('#liveCard')) return;
      const section = el.closest('#mainSeg') ? 'nav' : el.closest('#schedule') ? 'schedule' : el.closest('.qbar') ? 'schedule actions'
        : el.closest('#queue') ? 'queue' : el.closest('#taskList') ? 'tasks' : el.closest('#availChips') ? 'availability'
        : el.closest('.navrow') ? 'links' : el.closest('#nextCard') ? 'next session' : 'other';
      el.setAttribute('data-audit-id', String(list.length));
      list.push({ index: list.length, tag: el.tagName.toLowerCase(), text: el.innerText.trim().replace(/\s+/g, ' ').slice(0, 45) || '(unnamed)', section, href: el.getAttribute('href') });
    });
    return list;
  }, SEL);

  const tagAll = () => page.evaluate((sel) => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    let i = 0;
    document.querySelectorAll(sel).forEach((el) => {
      if (!vis(el) || el.closest('#clientCard') || el.closest('#liveCard')) return;
      el.setAttribute('data-audit-id', String(i++));
    });
    return i;
  }, SEL);

  const results = [];
  for (const c of controls) {
    current = `#${c.index} "${c.text}"`;
    const eB = errors.length, fB = failedReqs.length, dB = dialogs.length;
    const rec = { ...c, exists: false, effects: [], verdict: 'NOT_FOUND', shots: {} };
    await load();
    const n = await tagAll();
    const loc = page.locator(`[data-audit-id="${c.index}"]`);
    if (n <= c.index || (await loc.count()) === 0) { results.push(rec); continue; }
    rec.exists = true;
    try {
      if (c.tag === 'a' && c.href) {
        const r2 = await page.request.get(c.href.startsWith('http') ? c.href : baseURL + '/' + c.href.replace(/^\//, ''));
        rec.effects.push(`link → HTTP ${r2.status()}`);
        rec.verdict = r2.ok() ? 'PASS' : 'ERROR';
      } else {
        const before = await snapshot(page);
        rec.shots.before = slug(c.text, c.index) + '-before.png';
        await page.screenshot({ path: path.join(OUT, rec.shots.before) });
        await loc.click({ timeout: 3000 });
        await page.waitForTimeout(SETTLE);
        const after = await snapshot(page);
        rec.effects = diff(before, after);
        rec.shots.after = slug(c.text, c.index) + '-after.png';
        await page.screenshot({ path: path.join(OUT, rec.shots.after) });
      }
    } catch (e) { rec.effects.push('CLICK FAILED: ' + String(e).slice(0, 130)); }
    rec.dialogs = dialogs.slice(dB).map((d) => d.type + ': "' + d.message + '" (dismissed)');
    rec.consoleErrors = errors.slice(eB).map((x) => x.text);
    rec.failedRequests = failedReqs.slice(fB).map((x) => x.url + ' (' + x.reason + ')');
    if (rec.verdict === 'NOT_FOUND' && rec.exists) {
      rec.verdict = rec.consoleErrors.length ? 'ERROR' : (rec.effects.length || rec.dialogs.length) ? 'PASS' : 'NO_EFFECT';
    }
    results.push(rec);
  }
  report.controls = results;

  /* 6. reload stability */
  current = 'reload-stability';
  await load();
  const s1 = await snapshot(page);
  await load();
  const s2 = await snapshot(page);
  report.reloadStability = { scheduleStable: s1.scheduleStatuses === s2.scheduleStatuses, availStable: s1.availOn === s2.availOn };

  const t = {
    controls: results.length,
    pass: results.filter((r) => r.verdict === 'PASS').length,
    noEffect: results.filter((r) => r.verdict === 'NO_EFFECT').length,
    error: results.filter((r) => r.verdict === 'ERROR').length,
    notFound: results.filter((r) => r.verdict === 'NOT_FOUND').length,
    consoleErrors: errors.length, failedRequests: failedReqs.length,
    dialogsDismissed: dialogs.length, sheetFetchesBlockedByAudit: sheetBlocked,
  };
  report.totals = t;

  const md = [];
  md.push('# Trainer A-to-Z audit — ' + new Date().toISOString(), '', 'Target: ' + baseURL + PAGE + ' (HTTP ' + report.load.status + ')', '');
  md.push('## Totals', '', '| Metric | Value |', '|---|---|');
  Object.entries(t).forEach(([k, v]) => md.push('| ' + k + ' | ' + v + ' |'));
  md.push('', '## Structure', '',
    '- Duplicate IDs: ' + (report.structure.duplicateIds.length ? report.structure.duplicateIds.join(', ') : 'none'),
    '- Unnamed buttons/links: ' + (report.structure.unnamedControls.length || 'none'),
    '- Images without alt: ' + (report.structure.imagesWithoutAlt || 'none'),
    '- Visible fields: ' + report.structure.visibleFields + ' (unlabeled: ' + report.structure.unlabeledFields + ')',
    '- Buttons under 30px tall: ' + report.structure.buttonsUnder30px);
  md.push('', '## Responsive', '');
  Object.entries(report.responsive).forEach(([n, r]) =>
    md.push('- **' + n + '** (' + r.width + '×' + r.height + '): horizontal scroll ' + (r.horizontalScroll ? '⚠ YES — ' + r.offenders.join(', ') : 'none ✓')));
  md.push('', '## Keyboard', '', '- Focus trap: ' + (report.keyboard.focusTrap ? '⚠ YES' : 'none ✓'),
    '- First stops: ' + report.keyboard.focusOrder.slice(0, 5).join(' → '));
  md.push('', '## Controls (' + t.controls + ')', '', '| # | Control | Section | Verdict | Effect |', '|---|---|---|---|---|');
  results.forEach((r) => md.push('| ' + r.index + ' | ' + r.text + ' | ' + r.section + ' | ' + r.verdict + ' | ' + ((r.effects.concat(r.dialogs || [])).join('; ') || '—').slice(0, 95).replace(/\|/g, '/') + ' |'));
  md.push('', '## Reload stability', '', '- Schedule stable: ' + (report.reloadStability.scheduleStable ? 'yes ✓' : '⚠ NO'), '- Availability stable: ' + (report.reloadStability.availStable ? 'yes ✓' : '⚠ NO'));
  if (errors.length) { md.push('', '## Console/JS errors', ''); errors.forEach((e) => md.push('- [' + e.at + '] ' + e.text)); }
  if (failedReqs.length) { md.push('', '## Failed requests', ''); failedReqs.forEach((f) => md.push('- [' + f.at + '] ' + f.url + ' (' + f.reason + ')')); }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, 'summary.md'), md.join('\n'));

  expect(report.load.ok).toBe(true);
  expect(t.notFound).toBe(0);
});
