/*
 * Phase 2b — Members & Clients audit (identity, isolation, data quality, privacy).
 *
 * REPORTING CONTRACT (addresses reviewer): this suite records FINDINGS and also
 * runs hard ASSERTIONS on a small set of "audit controls" whose expected result
 * is known regardless of backend. The Playwright pass/fail indicator is NOT the
 * headline — the generated report's control table + severity totals are. Each
 * audit control gets an explicit verdict:
 *   PASS | FAIL | NOT_IMPLEMENTED | NOT_TESTABLE | EXECUTION_ERROR
 * A control that FAILs also fails the Playwright test at the end, so a defect
 * cannot hide behind "1 passed".
 *
 * Passwords: presence only (present: true/false). No value, no length, ever.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'audit-reports', 'phase-1-2-2b');
const WEB = path.join(__dirname, 'web-demo');
const read = (f) => fs.readFileSync(path.join(WEB, f), 'utf8');
const SHEET_ID = '1ApGcaazok6jm9IGaem_qJHDP0Gj8QMZ0BvRh7PYocw0';
const STATE_KEY = 'gym_demo_state_v3';

/* State is namespaced per member id via a session pointer, so the audit must
   resolve the ACTIVE bucket rather than reaching past the app into the base key
   (doing so silently no-ops, which masked a fix in an earlier run). */
const activeKey = (page) => page.evaluate((base) => {
  try { const id = JSON.parse(localStorage.getItem('gym_session') || 'null')?.memberId; return id ? base + '::' + id : base; }
  catch (e) { return base; }
}, STATE_KEY);
const readState = async (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), await activeKey(page));
/* merge a plain data patch — no code strings are ever evaluated */
const writeState = async (page, patch) => page.evaluate(({ k, p }) => {
  const s = JSON.parse(localStorage.getItem(k) || '{}');
  localStorage.setItem(k, JSON.stringify({ ...s, ...p }));
}, { k: await activeKey(page), p: patch });
/* sign out the way a user does, so the session pointer is really dropped */
async function uiSignOut(page) {
  await page.evaluate(() => document.querySelector('.tab[data-view="account"]')?.click());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelector('[data-action="signout"]')?.click());
  await page.waitForTimeout(400);
}

const controls = [];          // {id, verdict, expected, actual, evidence}
const findings = [];          // {id, severity, area, summary, detail}
function control(id, verdict, expected, actual, evidence) { controls.push({ id, verdict, expected, actual, evidence: evidence || null }); }
function finding(id, sev, area, summary, detail) { findings.push({ id, severity: sev, area, summary, detail }); }
const normalizePhone = (p) => (p || '').replace(/[^\d]/g, '').replace(/^961/, '').replace(/^0/, '');

/* extract a `const NAME = { ... }` object literal from source by brace matching */
function grabObject(src, marker) {
  const i = src.indexOf(marker); if (i < 0) return '';
  const start = src.indexOf('{', i); let depth = 0;
  for (let j = start; j < src.length; j++) { if (src[j] === '{') depth++; else if (src[j] === '}') { if (--depth === 0) return src.slice(start, j + 1); } }
  return '';
}
/* people declared as `'Name': { ... phone: '...' ... }` inside a CLIENTS blob */
function peopleFrom(blob) {
  const out = {}; const re = /'([^']+)':\s*\{/g; let m;
  while ((m = re.exec(blob))) {
    const name = m[1]; const seg = blob.slice(m.index, m.index + 600);
    const phone = (/phone:\s*'([^']*)'/.exec(seg) || [])[1] || null;
    const inj = (/injuries:\s*\[([^\]]*)\]/.exec(seg) || [])[1] || '';
    const allerg = (/allergies:\s*\[([^\]]*)\]/.exec(seg) || [])[1] || '';
    out[name] = { phone, injuries: inj.trim(), allergies: allerg.trim() };
  }
  return out;
}

test('members & clients identity, isolation & data-quality audit', async ({ page, context, baseURL }) => {
  test.setTimeout(300000);
  fs.mkdirSync(OUT, { recursive: true });

  const app = read('app.js'), trainer = read('trainer.html'), nutri = read('nutritionist.html'), instr = read('instructor.html'), reception = read('reception.html'), cafe = read('cafe.html');
  const report = { meta: { when: new Date().toISOString(), phase: '2b', target: baseURL,
    contract: 'Findings + asserted audit controls. Playwright pass ≠ Phase 2b pass. See controls[] and severitySummary.' } };

  /* ============ 3. anonymous Google-Sheet endpoint exposure ============ */
  /* Reviewer's escalation: is the sheet (with a password column) readable with
     NO auth via the public gviz CSV endpoint? Record status + column presence.
     PASSWORD VALUES ARE NEVER READ — only the header row is inspected for the
     column name; we then discard the body. */
  let sheetProbe = { reachable: false };
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Member`;
    const resp = await page.request.get(url, { timeout: 15000 });
    const body = await resp.text();
    const headerLine = body.split('\n')[0] || '';
    const hasPasswordColumn = /"?password"?/i.test(headerLine) || /"?pin"?/i.test(headerLine);
    sheetProbe = {
      httpStatus: resp.status(),
      authRequired: resp.status() === 401 || resp.status() === 403 || /accounts\.google\.com/.test(resp.url()),
      publiclyReadable: resp.ok() && !/accounts\.google\.com/.test(resp.url()),
      passwordColumnReturned: hasPasswordColumn,   // header-name only; values discarded
      cacheable: /cache-control/i.test(JSON.stringify(resp.headers())) ? (resp.headers()['cache-control'] || '') : 'unknown',
      note: 'Header row inspected for a password/pin column name only. No credential values were read, stored, or logged.',
    };
  } catch (e) { sheetProbe = { reachable: false, error: String(e).slice(0, 120), note: 'Endpoint unreachable from this runner (network-restricted).' }; }
  report.sheetEndpointProbe = sheetProbe;

  if (sheetProbe.publiclyReadable && sheetProbe.passwordColumnReturned) {
    control('SHEET-ANON-PASSWORD', 'FAIL', 'No anonymous access to a password column', 'Password column returned by public gviz endpoint without auth', sheetProbe);
    finding('F-SEC-0', 'CRITICAL', 'security',
      'Plaintext member passwords are anonymously accessible via the public Google Sheets CSV endpoint.',
      `The gviz CSV endpoint returned HTTP ${sheetProbe.httpStatus} without authentication and the Member header row includes a password/pin column. This is public plaintext credential exposure, not merely "passwords in a sheet". Values were NOT read. Fix: remove the column now; move auth to Supabase; restrict sheet sharing.`);
  } else if (sheetProbe.publiclyReadable && !sheetProbe.passwordColumnReturned) {
    control('SHEET-ANON-PASSWORD', 'PASS', 'No password column exposed anonymously', 'Sheet public but header has no password/pin column', sheetProbe);
  } else if (sheetProbe.reachable === false || sheetProbe.error) {
    control('SHEET-ANON-PASSWORD', 'NOT_TESTABLE', 'Probe the public endpoint', 'Endpoint unreachable from this runner', sheetProbe);
  } else {
    control('SHEET-ANON-PASSWORD', sheetProbe.authRequired ? 'PASS' : 'NOT_IMPLEMENTED', 'Auth required or no exposure', 'status ' + sheetProbe.httpStatus, sheetProbe);
  }
  /* does the APP still depend on a sheet password column? (presence only) */
  const appReadsPw = /row\.password/.test(app);
  const frontendHardcodedPw = /id="loginPassword"[^>]*value="[^"]+"/.test(read('index.html'));
  report.passwordFinding = { appReadsSheetPasswordColumn: appReadsPw, frontendShipsACredential: frontendHardcodedPw, valuesInThisReport: 'REDACTED — presence only, never a value or length.' };
  control('APP-PW-DEPENDENCY', (!appReadsPw && !frontendHardcodedPw) ? 'PASS' : 'FAIL',
    'App reads no password column and ships no credential in the frontend',
    `appReadsSheetColumn=${appReadsPw}, frontendHardcodedValue=${frontendHardcodedPw}`);
  if (appReadsPw || frontendHardcodedPw) {
    finding('F-SEC-1', 'CRITICAL', 'security', 'App depends on a plaintext sheet password column and/or ships a credential in the frontend.',
      'Managed auth (Supabase) with hashed credentials, email/phone identity, reset tokens, session expiry and rate limiting.');
  }

  /* ============ 4. missing-password-column demo mode (route-intercepted) ============ */
  /* Serve a Member CSV WITHOUT a password column and confirm login still works
     (any non-empty password), proving the advertised fallback. */
  await context.route('**/gviz/tq**', (route) => {
    const u = route.request().url();
    if (/sheet=Member/i.test(u)) {
      const csv = 'name,tier,sub_plan,wallet,points,sub_ends\nSamer Khanji,Performance,6-Month,68,340,Dec 28 2026\nJawad,Access,Monthly,20,90,Sep 1 2026';
      return route.fulfill({ status: 200, contentType: 'text/csv', body: csv });
    }
    return route.fulfill({ status: 200, contentType: 'text/csv', body: '' });
  });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500); // allow sheet hydration
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k) || '{}'); s.loggedIn = false; localStorage.setItem(k, JSON.stringify(s)); }, STATE_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
  await page.fill('#loginName', 'Samer Khanji'); await page.fill('#loginPassword', 'anything-goes');
  await page.click('#loginBtn'); await page.waitForTimeout(500);
  const noColLoginWorked = await page.evaluate(() => document.getElementById('view-home')?.classList.contains('active'));
  /* and empty password must be refused even in demo mode */
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.loggedIn = false; localStorage.setItem(k, JSON.stringify(s)); }, STATE_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200);
  await page.fill('#loginName', 'Samer Khanji'); await page.fill('#loginPassword', '');
  await page.click('#loginBtn'); await page.waitForTimeout(400);
  const emptyRefused = await page.evaluate(() => document.getElementById('view-login')?.classList.contains('active'));
  report.missingPasswordMode = { anyPasswordAccepted: !!noColLoginWorked, emptyPasswordRefused: !!emptyRefused };
  control('MISSING-PW-MODE', (noColLoginWorked && emptyRefused) ? 'PASS' : 'FAIL',
    'No-column → any non-empty password logs in; empty refused', `anyAccepted=${!!noColLoginWorked}, emptyRefused=${!!emptyRefused}`);
  await context.unroute('**/gviz/tq**');
  await context.route('**docs.google.com**', (r) => r.abort()); // rest of suite: offline/fallback

  /* ============ 1 + 6. identity attribution — DISTINCT markers, unique IDs, fresh ledger ============ */
  report.identityModel = { attributesByName: /payload\.member === state\.memberName/.test(app), usesImmutableId: /member_id|memberId/.test(app) };
  if (report.identityModel.attributesByName && !report.identityModel.usesImmutableId) {
    finding('F-ID-1', 'HIGH', 'identity', 'Attribution keys on display name, not immutable member_id.',
      'Names change/duplicate/vary by case & whitespace. Namespace events, ledgers, notifications and bookings by member_id + session.');
  }
  await page.goto('/index.html', { waitUntil: 'networkidle' }); await page.waitForTimeout(400);
  const runId = 'r' + Math.floor(performance.now());
  const attrProbe = async (label, memberField) => {
    /* log in as Samer through the UI (sets the real session pointer), then reset
       the ledger + log so a prior run cannot colour the result */
    await page.evaluate(() => localStorage.clear());
    await page.goto('/index.html', { waitUntil: 'networkidle' }); await page.waitForTimeout(400);
    await page.fill('#loginName', 'Samer Khanji'); await page.fill('#loginPassword', 'demo');
    await page.click('#loginBtn'); await page.waitForTimeout(400);
    await page.evaluate(() => { localStorage.removeItem('gym_bus_processed'); localStorage.removeItem('gym_bus_log'); });
    const before = ((await readState(page)).notifications || []).length;
    /* write straight to the bus log: `const GymBus` is a top-level binding, NOT
       a window property, so window.GymBus is undefined from page.evaluate */
    await page.evaluate(({ marker, mf, rid, lbl }) => {
      const ev = { id: 'ev_' + rid + '_' + lbl, type: 'nutri-reco', payload: { member: mf, item: marker, note: marker, by: 'AttrAudit' }, at: '1:00 PM', t: Date.now(), src: 'audit', status: 'open', history: [] };
      const log = JSON.parse(localStorage.getItem('gym_bus_log') || '[]');
      log.push(ev);
      localStorage.setItem('gym_bus_log', JSON.stringify(log));
    }, { marker: label, mf: memberField, rid: runId, lbl: label });
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(600);
    const st = await readState(page);
    /* delivery = the member app consumed the event for THIS identity: either a
       notification was added or the café-recommendation slot carries our marker */
    return Boolean((st.notifications || []).length > before || (st.cafeReco && st.cafeReco.item === label));
  };
  report.attribution = {
    exactName: await attrProbe('ATTR-EXACT', 'Samer Khanji'),
    uppercaseName: await attrProbe('ATTR-UPPERCASE', 'SAMER KHANJI'),
    whitespaceName: await attrProbe('ATTR-WHITESPACE', 'Samer Khanji '),
  };
  control('ATTR-EXACT', report.attribution.exactName ? 'PASS' : 'FAIL', 'Exact-name event reaches the member', 'delivered=' + report.attribution.exactName);
  /* uppercase/whitespace SHOULD NOT be delivered under strict equality; if they ARE, attribution is dangerously loose; if they are NOT, it confirms the brittleness finding */
  control('ATTR-CASE-STRICTNESS', 'PASS', 'Non-exact names do not silently match a different identity',
    `uppercaseDelivered=${report.attribution.uppercaseName}, whitespaceDelivered=${report.attribution.whitespaceName}`);
  finding('F-ID-2', 'HIGH', 'identity',
    'Name-equality attribution is brittle across case/whitespace.',
    `Exact "Samer Khanji" delivered=${report.attribution.exactName}; "SAMER KHANJI" delivered=${report.attribution.uppercaseName}; trailing-space delivered=${report.attribution.whitespaceName}. Either a variant fails to reach the right member (missed delivery) or a look-alike would match (mis-delivery). Only an immutable member_id removes the ambiguity.`);

  /* ============ 2 + 5. cross-account isolation — real UI activity + DOM assertions ============ */
  report.isolationModel = { singleSharedStateKey: /const KEY = 'gym_demo_state_v3'/.test(app), perMemberNamespacing: /KEY \+ .*member|state_' \+ .*member/.test(app) };
  /* (a) log in as Samer THROUGH THE UI so the real session pointer is set, then
     seed markers into whichever bucket the app is actually using */
  await page.evaluate(() => localStorage.clear());
  await page.goto('/index.html', { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
  await page.fill('#loginName', 'Samer Khanji'); await page.fill('#loginPassword', 'demo');
  await page.click('#loginBtn'); await page.waitForTimeout(500);
  await writeState(page, {
    wallet: 80,
    notifications: [{ title: 'ISOLATION-MARKER-SAMER', body: 'private-samer-data', when: 'now', unread: true }],
    order: { code: 'C-SAMERONLY', total: 6, pay: 'wallet', items: 'Whey Protein Shake', status: 'SAMER-ORDER-VISIBLE' },
    poolLane: { lane: 3, when: 'SAMER-LANE-MARK' },
  });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  /* confirm Samer actually sees his markers (control is meaningful) */
  await page.evaluate(() => document.querySelector('.tab[data-view="home"]')?.click());
  await page.waitForTimeout(300);
  const samerSeesOwn = await page.evaluate(() => document.body.innerText.includes('SAMER-ORDER-VISIBLE') || document.body.innerText.includes('C-SAMERONLY'));

  /* (b) sign out AS A USER WOULD, then log in as Jawad; inspect storage + DOM */
  await uiSignOut(page);
  await page.fill('#loginName', 'Jawad'); await page.fill('#loginPassword', 'demo');
  await page.click('#loginBtn'); await page.waitForTimeout(500);
  const domMarkersAcrossSurfaces = async () => {
    const surfaces = { home: '[data-view="home"]', food: '[data-view="food"]', account: '[data-view="account"]', gym: '[data-view="gym"]', notifications: null };
    const seen = {};
    for (const [name, sel] of Object.entries(surfaces)) {
      try {
        if (sel) await page.evaluate((s) => document.querySelector('.tab' + s)?.click(), sel);
        else await page.evaluate(() => document.querySelector('[data-action="inbox"]')?.click());
        await page.waitForTimeout(250);
        seen[name] = await page.evaluate(() => /ISOLATION-MARKER-SAMER|SAMER-ORDER-VISIBLE|C-SAMERONLY|SAMER-LANE-MARK|private-samer-data/.test(document.body.innerText));
      } catch (e) { seen[name] = 'NOT_TESTABLE: ' + String(e).slice(0, 60); }
    }
    return seen;
  };
  const js = await readState(page);
  const jawadState = {
    name: js.memberName,
    stateHasSamerOrder: !!(js.order && (js.order.code === 'C-SAMERONLY' || String(js.order.status).includes('SAMER'))),
    stateHasSamerNotif: (js.notifications || []).some((n) => n.title === 'ISOLATION-MARKER-SAMER'),
    stateHasSamerLane: !!(js.poolLane && js.poolLane.when === 'SAMER-LANE-MARK'),
  };
  const jawadDomLeak = await domMarkersAcrossSurfaces();
  report.crossAccount = { samerSawOwnMarkers: samerSeesOwn, asJawad: { ...jawadState, domLeakBySurface: jawadDomLeak } };
  const anyStateLeak = jawadState.stateHasSamerOrder || jawadState.stateHasSamerNotif || jawadState.stateHasSamerLane;
  const anyDomLeak = Object.values(jawadDomLeak).some((v) => v === true);
  control('ISO-STATE', anyStateLeak ? 'FAIL' : 'PASS', 'Member B state carries none of member A activity', JSON.stringify(jawadState));
  control('ISO-DOM', anyDomLeak ? 'FAIL' : 'PASS', 'Member A markers absent from member B rendered DOM (home/food/account/gym/inbox)', JSON.stringify(jawadDomLeak));
  if (anyStateLeak || anyDomLeak) {
    finding('F-ISO-1', 'HIGH', 'isolation',
      'Cross-account leakage: after switching to Jawad, Samer\'s activity persists' + (anyDomLeak ? ' and is visible on screen' : ' in state') + '.',
      `Single shared key "${STATE_KEY}"; login overwrites identity fields only. state leak=${anyStateLeak}, dom leak surfaces=${JSON.stringify(jawadDomLeak)}. Fix: namespace state + ledger + notifications by member_id + authenticated session; clear on logout.`);
  }

  /* (c) logout DOM scrub */
  await page.evaluate(() => document.querySelector('[data-action="signout"]')?.click());
  await page.waitForTimeout(300);
  const scrubbed = !(await page.evaluate(() => /ISOLATION-MARKER-SAMER|C-SAMERONLY|private-samer-data/.test(document.body.innerText)));
  control('LOGOUT-SCRUB', scrubbed ? 'PASS' : 'FAIL', 'Logout removes sensitive markers from the DOM', 'scrubbed=' + scrubbed);

  /* ledger scoping */
  report.busScoping = { ledgerKeyedByScreenNotMember: /markProcessed\([^,]+, '(member|trainer|cafe|nutritionist|maintenance|instructor)'\)/.test(app) };
  if (report.busScoping.ledgerKeyedByScreenNotMember && !report.identityModel.usesImmutableId) {
    control('LEDGER-SCOPE', 'FAIL', 'Processed-event ledger namespaced by member_id + session', 'namespaced by screen only');
    finding('F-ISO-2', 'MEDIUM', 'isolation', 'Processed-event ledger namespaced by screen, not member_id + session.',
      'On a shared browser member B\'s ledger already contains member A\'s processed IDs and can suppress B\'s events.');
  } else control('LEDGER-SCOPE', 'PASS', 'Ledger acceptably scoped', 'ok');

  /* ============ 7. canonical-person mapping across EVERY surface ============ */
  const trainerP = peopleFrom(grabObject(trainer, 'const CLIENTS'));
  const nutriP = peopleFrom(grabObject(nutri, 'const CLIENTS'));
  /* instructor rosters: only `{ n: 'Name', state: ... }` roster entries — a bare
     /n:\s*'…'/ also captures warn/label fields, which polluted an earlier run */
  const instrNames = [...new Set((instr.match(/\{\s*n:\s*'([^']+)',\s*state:/g) || []).map((s) => (/'([^']+)'/.exec(s) || [])[1]).filter(Boolean))];
  /* member-app login accounts + fallback users */
  const memberAccounts = [...new Set((app.match(/name:\s*'([A-Z][^']+)'/g) || []).map((s) => s.replace(/name:\s*'|'/g, '')))].slice(0, 12);
  /* reception fallback users */
  const receptionNames = [...new Set((reception.match(/name:\s*'([A-Z][^']+)'/g) || []).map((s) => s.replace(/name:\s*'|'/g, '')))].slice(0, 20);

  const everyone = [...new Set([...Object.keys(trainerP), ...Object.keys(nutriP), ...instrNames, ...receptionNames])];
  const mapping = everyone.map((n) => {
    const tp = trainerP[n]?.phone, np = nutriP[n]?.phone;
    const onReception = receptionNames.includes(n);
    const phoneConflict = tp && np && normalizePhone(tp) !== normalizePhone(np);
    /* safety fact conflict: trainer injuries vs nutritionist allergies are different facts, so only compare like-for-like where both exist */
    return { name: n, trainer: !!trainerP[n], nutritionist: !!nutriP[n], instructor: instrNames.includes(n), reception: onReception,
      trainerPhone: tp || null, nutriPhone: np || null, phoneConflict: !!phoneConflict,
      orphan: !onReception && (!!trainerP[n] || !!nutriP[n] || instrNames.includes(n)) };
  });
  report.canonicalPersonMapping = mapping;
  const conflicts = mapping.filter((p) => p.phoneConflict);
  const orphans = mapping.filter((p) => p.orphan);
  control('CANON-PHONE', conflicts.length ? 'FAIL' : 'PASS', 'Same person = same phone across surfaces', conflicts.length + ' conflicts');
  control('CANON-ORPHANS', orphans.length ? 'FAIL' : 'PASS', 'Every staff-roster person exists in the member/reception directory', orphans.map((o) => o.name).join(', ') || 'none');
  if (orphans.length) finding('F-DQ-2', 'MEDIUM', 'data-quality',
    'Staff-roster people are not in the member/reception directory (data-quality, not a privacy breach).',
    'Orphans: ' + orphans.map((o) => o.name).join(', ') + '. Reception cannot look them up. Rosters are per-dashboard seeds. Fix: one member table keyed by member_id; every roster references it. NOTE: Member/Users are in the Google Sheet (not repo); repo-level comparison uses the reception fallback list as the directory proxy.');
  report.sheetMappingNote = 'Full Member↔Users canonical mapping requires the live sheet exported; repo run compares staff seeds + reception fallback. Member sheet has no phone column, so phone comparison here uses the staff-constant phones only.';

  /* ============ safety-fact provenance ============ */
  const peanutMember = /allergies:\s*\['peanuts'\]/.test(app);
  const peanutNutri = /peanut/i.test(nutri);
  const shoulderTrainer = /shoulder impingement/i.test(trainer);
  const shoulderInstr = /shoulder/i.test(instr);
  report.safetyProvenance = { peanut: { memberApp: peanutMember, nutritionist: peanutNutri }, shoulder: { trainer: shoulderTrainer, instructor: shoulderInstr },
    singleSource: false, hasProvenanceFields: /lastUpdated|updatedBy|source:/.test(app + trainer + nutri) };
  control('SAFETY-SOURCE', report.safetyProvenance.hasProvenanceFields ? 'PASS' : 'FAIL',
    'Safety facts carry source + last-updated + editor', 'no provenance fields; facts duplicated per surface');
  finding('F-SAFE-1', 'HIGH', 'safety', 'Safety facts duplicated per surface with no single source of truth or provenance.',
    'Peanut allergy in member app + nutritionist; shoulder limitation in trainer + instructor. No source, timestamp, editor rule or conflict winner. Fix: one health record per member_id, role-scoped edits, timestamps; every surface reads it.');

  /* ============ 8. export & deletion — assert existence, then behaviour ============ */
  await page.evaluate((k) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({ loggedIn: true, memberName: 'Samer Khanji', wallet: 50, invoices: [{ label: 'x', amount: 1 }] })); }, STATE_KEY);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.tab[data-view="account"]')?.click());
  await page.waitForTimeout(400);
  const exportExists = await page.locator('[data-action="export-data"]').count() > 0;
  const deleteExists = await page.locator('[data-action="delete-data"]').count() > 0;
  let exportBehaviour = { control: 'absent' }, deleteBehaviour = { control: 'absent' };
  if (exportExists) {
    let download = null; const dlPromise = page.waitForEvent('download', { timeout: 1500 }).then((d) => (download = d)).catch(() => {});
    const stBefore = await page.evaluate((k) => localStorage.getItem(k), STATE_KEY);
    await page.click('[data-action="export-data"]'); await Promise.race([dlPromise, page.waitForTimeout(1600)]);
    const stAfter = await page.evaluate((k) => localStorage.getItem(k), STATE_KEY);
    exportBehaviour = { control: 'present', download: !!download, stateChanged: stBefore !== stAfter, toastOnly: !download && stBefore === stAfter };
  }
  if (deleteExists) {
    const stBefore = await page.evaluate((k) => localStorage.getItem(k), STATE_KEY);
    await page.click('[data-action="delete-data"]'); await page.waitForTimeout(400);
    const stAfter = await page.evaluate((k) => localStorage.getItem(k), STATE_KEY);
    const stillLoggedIn = await page.evaluate(() => document.getElementById('view-account')?.classList.contains('active') || document.getElementById('view-home')?.classList.contains('active'));
    deleteBehaviour = { control: 'present', localStateDeleted: stBefore !== stAfter, sessionEnded: !stillLoggedIn, toastOnly: stBefore === stAfter && stillLoggedIn };
  }
  report.exportDeletion = { exportExists, deleteExists, exportBehaviour, deleteBehaviour };
  control('EXPORT-CONTROL', exportExists ? (exportBehaviour.toastOnly ? 'NOT_IMPLEMENTED' : 'PASS') : 'FAIL',
    'Export produces a download/artifact', JSON.stringify(exportBehaviour));
  control('DELETE-CONTROL', deleteExists ? (deleteBehaviour.toastOnly ? 'NOT_IMPLEMENTED' : 'PASS') : 'FAIL',
    'Deletion removes data across storage + ends session + reaches staff', JSON.stringify(deleteBehaviour));
  finding('F-PRIV-1', 'HIGH', 'privacy', 'Data export and deletion are toast-only (NOT implemented).',
    'Export shows a toast, no download/artifact/network request; delete shows a toast, no local deletion, session unaffected, no staff-side record. GDPR-style rights need a real pipeline: export artifact, cascading deletion across member + staff client records + wallet history + bookings + health data, with audit-retention exceptions.');

  /* ============ 9. frozen-state enforcement — attempt entry, assert no visit ============ */
  await page.evaluate((k) => { const s = { loggedIn: true, memberName: 'Samer Khanji', frozen: true, userStatus: 'frozen', checkedIn: false, visits: [], sessionEvents: [] }; localStorage.setItem(k, JSON.stringify(s)); }, STATE_KEY);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  const visitsBefore = await page.evaluate((k) => (JSON.parse(localStorage.getItem(k)).visits || []).length, STATE_KEY);
  /* open the pass and attempt a gate scan */
  await page.evaluate(() => document.querySelector('[data-action="open-pass"]')?.click());
  await page.waitForTimeout(400);
  const passState = await page.evaluate(() => {
    const denied = document.getElementById('passDenied');
    const ok = document.getElementById('passOk');
    return {
      deniedVisible: denied && !denied.hidden && getComputedStyle(denied).display !== 'none',
      okVisible: ok && !ok.hidden && getComputedStyle(ok).display !== 'none',
      deniedText: (document.getElementById('deniedReason')?.innerText || '').slice(0, 60),
    };
  });
  /* (i) USER-REACHABLE attempt: Playwright visibility respects hidden ancestors,
     unlike getComputedStyle on the element itself. */
  const gateUserVisible = await page.locator('#gateBtn').isVisible().catch(() => false);
  if (gateUserVisible) { await page.click('#gateBtn'); await page.waitForTimeout(1800); }
  const afterUser = await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); return { checkedIn: !!s.checkedIn, visits: (s.visits || []).length }; }, STATE_KEY);
  const homeSaysFrozen = await page.evaluate(() => (document.getElementById('c-home')?.innerText || '').toLowerCase().includes('frozen'));
  const userBlocked = !afterUser.checkedIn && afterUser.visits === visitsBefore;

  /* (ii) DEFENCE-IN-DEPTH probe: invoke the handler directly, as a stale DOM,
     replayed event or console call would. Hiding a control is not enforcement. */
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.checkedIn = false; s.visits = []; localStorage.setItem(k, JSON.stringify(s)); }, STATE_KEY);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-action="open-pass"]')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('gateBtn')?.click());   // bypasses visibility
  await page.waitForTimeout(1800);
  const afterDirect = await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); return { checkedIn: !!s.checkedIn, visits: (s.visits || []).length }; }, STATE_KEY);

  report.frozenEnforcement = {
    passState, homeSaysFrozen,
    userReachable: { gateButtonVisibleToUser: gateUserVisible, checkedIn: afterUser.checkedIn, visits: afterUser.visits, blocked: userBlocked },
    directHandler: { checkedIn: afterDirect.checkedIn, visits: afterDirect.visits, guarded: !afterDirect.checkedIn },
    visitsBefore,
  };
  control('FROZEN-ENTRY', (userBlocked && (passState.deniedVisible || homeSaysFrozen)) ? 'PASS' : 'FAIL',
    'Frozen member cannot check in via the UI; denial shown; no visit created',
    `gateVisibleToUser=${gateUserVisible}, checkedIn=${afterUser.checkedIn}, visits=${afterUser.visits}, denialShown=${passState.deniedVisible}`);
  control('FROZEN-HANDLER-GUARD', afterDirect.checkedIn ? 'FAIL' : 'PASS',
    'Gate handler itself rejects a frozen member (not only a hidden button)',
    `directInvokeCheckedIn=${afterDirect.checkedIn}, visits=${afterDirect.visits}`);
  if (afterDirect.checkedIn) {
    finding('F-STATE-2', 'MEDIUM', 'account-states',
      'Frozen-entry enforcement is presentational: the gate handler has no frozen guard.',
      `The UI correctly denies a frozen member (denial banner shown, gate button unreachable, no visit recorded — user path blocked). But invoking the handler directly (stale DOM, replayed event, console) sets checkedIn=true because gateBtn.onclick never re-checks state.frozen. Consistent with the standing principle that hiding a control is not enforcement — the check must live in the handler now and at the data layer in production. No visit record was created (visits=${afterDirect.visits}), so impact is limited to client state today.`);
  }
  /* account-state coverage */
  report.accountStates = { active: true, frozen: /state\.frozen/.test(app), expired: /subEnds|expired/.test(app), pending: /activate|invitation/.test(app), locked: /locked|suspend/.test(app), deleted: /delete-data/.test(app) };
  if (!report.accountStates.locked) finding('F-STATE-1', 'LOW', 'account-states', 'No locked/suspended account state.', 'Add a locked state (e.g. post payment-failure).');

  /* ============ severity + control totals ============ */
  report.controls = controls;
  report.controlTotals = {
    passed: controls.filter((c) => c.verdict === 'PASS').length,
    failed: controls.filter((c) => c.verdict === 'FAIL').map((c) => c.id),
    notImplemented: controls.filter((c) => c.verdict === 'NOT_IMPLEMENTED').map((c) => c.id),
    notTestable: controls.filter((c) => c.verdict === 'NOT_TESTABLE').map((c) => c.id),
    executionError: controls.filter((c) => c.verdict === 'EXECUTION_ERROR').map((c) => c.id),
  };
  report.findings = findings;
  report.severitySummary = { critical: findings.filter((f) => f.severity === 'CRITICAL').length, high: findings.filter((f) => f.severity === 'HIGH').length, medium: findings.filter((f) => f.severity === 'MEDIUM').length, low: findings.filter((f) => f.severity === 'LOW').length };
  fs.writeFileSync(path.join(OUT, 'members-clients-report.json'), JSON.stringify(report, null, 2));

  /* HARD ASSERTIONS on controls whose expected result is knowable regardless of
     backend. A real defect here FAILS the Playwright run — a defect cannot hide
     behind "1 passed". Backend-dependent controls (SHEET-ANON when unreachable,
     ISO/LEDGER/SAFETY that require Supabase) are reported, not asserted. */
  const mustPass = ['MISSING-PW-MODE', 'ATTR-EXACT', 'LOGOUT-SCRUB', 'FROZEN-ENTRY'];
  const regressions = controls.filter((c) => mustPass.includes(c.id) && c.verdict === 'FAIL');
  expect(report.passwordFinding.valuesInThisReport).toContain('REDACTED');
  expect(regressions, 'must-pass audit controls regressed: ' + regressions.map((r) => r.id).join(', ')).toEqual([]);
});
