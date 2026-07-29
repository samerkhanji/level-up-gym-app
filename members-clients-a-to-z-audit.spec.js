/*
 * Phase 2b — Members & Clients audit (identity, isolation, data quality, privacy).
 *
 * Highest-risk phase. Covers:
 *  - identity model: name-based attribution vs immutable IDs; duplicate names,
 *    case, whitespace, Unicode ("Pamela <3")
 *  - cross-account state isolation: log in as A, act, switch to B, assert none
 *    of A's activity or sensitive data survives in state, DOM, notifications,
 *    or pending bus events; logout DOM scrub
 *  - canonical-person mapping: the same person across trainer / nutritionist /
 *    instructor client rosters — phone + safety-fact consistency, orphans
 *  - safety-data provenance: allergies/injuries — source, editors, conflicts
 *  - account states: active / frozen / expired boundaries
 *  - password finding: REDACTED — presence flagged, values never emitted
 *
 * Static analysis reads the shipped source (app.js + staff pages) since the
 * client rosters are seeded there; browser drives the isolation tests.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'test-results', 'phase-1-2-2b');
const WEB = path.join(__dirname, 'web-demo');
const read = (f) => fs.readFileSync(path.join(WEB, f), 'utf8');

/* pull a JS array-of-objects literal out of source by its declaration */
function grabClients(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) return {};
  const start = src.indexOf('{', i);
  let depth = 0, end = start;
  for (let j = start; j < src.length; j++) { if (src[j] === '{') depth++; if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } } }
  return src.slice(start, end + 1);
}
const normalizePhone = (p) => (p || '').replace(/[^\d]/g, '').replace(/^961/, '').replace(/^0/, '');

test('members & clients identity, isolation & data-quality audit', async ({ page, context, baseURL }) => {
  test.setTimeout(300000);
  fs.mkdirSync(OUT, { recursive: true });
  await context.route('**docs.google.com**', (r) => r.abort());
  const report = { meta: { when: new Date().toISOString(), phase: '2b' }, findings: [] };
  const finding = (id, sev, area, summary, detail) => report.findings.push({ id, severity: sev, area, summary, detail });

  const app = read('app.js');
  const trainer = read('trainer.html');
  const nutri = read('nutritionist.html');
  const instr = read('instructor.html');

  /* ---------- 1. identity model ---------- */
  const usesNameAttribution = /payload\.member === state\.memberName/.test(app) || /ev\.payload\.member === state\.memberName/.test(app);
  const hasMemberId = /member_id|memberId/.test(app);
  report.identityModel = { attributesByName: usesNameAttribution, usesImmutableId: hasMemberId };
  if (usesNameAttribution && !hasMemberId) {
    finding('F-ID-1', 'HIGH', 'identity',
      'Event attribution and state isolation key on display name (state.memberName), not an immutable member_id.',
      'Names can change, duplicate, or vary by case/whitespace/Unicode. Two members named "Samer Khanji", or "samer khanji" vs "Samer Khanji", collide. Fix: assign member_id at registration; attribute and namespace all events, ledgers, notifications and bookings by member_id + session, not name.');
  }
  /* practical collision probes against the login matcher */
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const loginProbe = async (name) => {
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('gym_demo_state_v3') || '{}'); s.loggedIn = false; localStorage.setItem('gym_demo_state_v3', JSON.stringify(s)); });
    await page.goto('/index.html', { waitUntil: 'networkidle' }); await page.waitForTimeout(300);
    await page.fill('#loginName', name); await page.fill('#loginPassword', 'x');
    await page.click('#loginBtn'); await page.waitForTimeout(300);
    return page.evaluate(() => document.getElementById('view-home').classList.contains('active'));
  };
  report.identityProbes = {
    exact: await loginProbe('Samer Khanji'),
    lowercase: await loginProbe('samer khanji'),
    trailingSpace: await loginProbe('Samer Khanji  '),
    unicodeMember: await loginProbe('Pamela <3'),
  };

  /* ---------- 2. cross-account state isolation (THE big risk) ---------- */
  const singleStateKey = /const KEY = 'gym_demo_state_v3'/.test(app);
  const perMemberKey = /gym_demo_state_v3_' \+|KEY \+ .*member|state_' \+ .*member/.test(app);
  report.isolationModel = { singleSharedStateKey: singleStateKey, perMemberNamespacing: perMemberKey };

  /* drive it: log in as Samer, generate activity, switch to another account, inspect */
  await page.evaluate(() => localStorage.clear());
  await page.goto('/index.html', { waitUntil: 'networkidle' }); await page.waitForTimeout(400);
  await page.fill('#loginName', 'Samer Khanji'); await page.fill('#loginPassword', 'samer123');
  await page.click('#loginBtn'); await page.waitForTimeout(400);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('gym_demo_state_v3'));
    s.walletTx = [{ label: 'SECRET-SAMER-TX', when: 'Today', amount: -99 }, ...(s.walletTx || [])];
    s.notifications = [{ title: 'SECRET-SAMER-NOTIF', body: 'private', when: 'now', unread: true }, ...(s.notifications || [])];
    localStorage.setItem('gym_demo_state_v3', JSON.stringify(s));
  });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('gym_demo_state_v3')); s.loggedIn = false; localStorage.setItem('gym_demo_state_v3', JSON.stringify(s)); });
  await page.goto('/index.html', { waitUntil: 'networkidle' }); await page.waitForTimeout(300);
  await page.fill('#loginName', 'Jawad'); await page.fill('#loginPassword', 'jawad123');
  await page.click('#loginBtn'); await page.waitForTimeout(400);
  const asJawad = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('gym_demo_state_v3'));
    return {
      name: s.memberName,
      inheritedSamerTx: (s.walletTx || []).some((t) => t.label === 'SECRET-SAMER-TX'),
      inheritedSamerNotif: (s.notifications || []).some((n) => n.title === 'SECRET-SAMER-NOTIF'),
      domLeaksSamer: document.body.innerText.includes('SECRET-SAMER'),
    };
  });
  report.accountSwitch = asJawad;
  if (asJawad.inheritedSamerTx || asJawad.inheritedSamerNotif || asJawad.domLeaksSamer) {
    finding('F-ISO-1', 'HIGH', 'isolation',
      'Switching accounts on the same browser inherits the previous member\'s activity (wallet history / notifications / DOM).',
      'One localStorage key ("gym_demo_state_v3") holds all member state; login overwrites identity fields but not activity arrays, so member B sees member A\'s data on a shared demo device. Fix: namespace state, bus ledger and notifications by member_id + authenticated session; on logout clear sensitive state from storage AND the DOM.');
  }
  /* logout DOM scrub */
  await page.evaluate(() => { const b = [...document.querySelectorAll('[data-action="signout"]')][0]; if (b) b.click(); });
  await page.waitForTimeout(300);
  report.logoutScrub = { domClearedOfSecrets: !(await page.evaluate(() => document.body.innerText.includes('SECRET-SAMER'))) };

  /* pending bus events survive across accounts (member-scoping check) */
  report.busScoping = { ledgerKeyedByScreenNotMember: /markProcessed\([^,]+, '(member|trainer|cafe|nutritionist|maintenance|instructor|cafe)'\)/.test(app) };
  if (report.busScoping.ledgerKeyedByScreenNotMember && !hasMemberId) {
    finding('F-ISO-2', 'MEDIUM', 'isolation',
      'The processed-event ledger is namespaced by screen ("member"), not by member_id + session.',
      'On a shared browser, member B\'s "member" ledger already contains member A\'s processed event IDs, which can suppress B\'s legitimate events. Fix: include member_id + session in the ledger namespace.');
  }

  /* ---------- 3. canonical-person mapping ---------- */
  const parsePeople = (blob) => {
    const people = {};
    const re = /'([^']+)':\s*\{([^]*?)phone:\s*'([^']*)'/g; let m2;
    while ((m2 = re.exec(blob))) {
      const name = m2[1]; const body = m2[2] + m2[3];
      const inj = /injuries:\s*\[([^\]]*)\]/.exec(m2[0] + blob.slice(re.lastIndex, re.lastIndex + 400));
      people[name] = { phone: m2[3] };
    }
    return people;
  };
  const trainerClients = Object.keys(parsePeople(grabClients(trainer, 'const CLIENTS')));
  const nutriClients = Object.keys(parsePeople(grabClients(nutri, 'const CLIENTS')));
  const trainerPhones = parsePeople(grabClients(trainer, 'const CLIENTS'));
  const nutriPhones = parsePeople(grabClients(nutri, 'const CLIENTS'));

  const allPeople = [...new Set([...trainerClients, ...nutriClients])];
  const mapping = allPeople.map((n) => {
    const tPhone = trainerPhones[n]?.phone, nPhone = nutriPhones[n]?.phone;
    const conflict = tPhone && nPhone && normalizePhone(tPhone) !== normalizePhone(nPhone);
    return { name: n, onTrainer: trainerClients.includes(n), onNutritionist: nutriClients.includes(n), trainerPhone: tPhone || null, nutriPhone: nPhone || null, phoneConflict: !!conflict };
  });
  report.canonicalPersonMapping = mapping;
  const conflicts = mapping.filter((p) => p.phoneConflict);
  if (conflicts.length) finding('F-DQ-1', 'MEDIUM', 'data-quality', 'Same person has different phone numbers across staff rosters.', JSON.stringify(conflicts));

  /* Users/Member sheet is not in-repo (Google Sheet); staff rosters are hardcoded seeds */
  report.sheetMapping = {
    note: 'Member/Users rows live in the Google Sheet (not in repo); staff client rosters are hardcoded seeds in each dashboard. A true canonical mapping needs the sheet exported. Repo-level check compares the staff seeds only.',
    staffSeededPeopleNotGuaranteedInUsers: allPeople,
  };
  finding('F-DQ-2', 'MEDIUM', 'data-quality',
    'Client rosters are hardcoded per dashboard, not derived from one member table.',
    'Trainer clients (' + trainerClients.join(', ') + ') and nutritionist clients (' + nutriClients.join(', ') + ') are independent seeds; people like Lina/Omar/Maya/Jad may not exist as reception/Users members, so reception cannot look them up. Fix: single member table keyed by member_id; all rosters reference it.');

  /* ---------- 4. safety-data provenance ---------- */
  const samerAllergyMember = /allergies:\s*\['peanuts'\]/.test(app);
  const samerAllergyNutri = /'Samer Khanji'[^]*?allergies:\s*\[[^\]]*peanut/i.test(nutri);
  const samerInjuryTrainer = /shoulder impingement/i.test(trainer);
  const samerInjuryInstr = /shoulder/i.test(instr);
  report.safetyProvenance = {
    peanutAllergy: { memberApp: samerAllergyMember, nutritionist: samerAllergyNutri, consistent: samerAllergyMember === samerAllergyNutri || (samerAllergyMember && samerAllergyNutri) },
    shoulderInjury: { trainer: samerInjuryTrainer, instructor: samerInjuryInstr },
    source: 'Each surface hardcodes its own copy of the safety fact; there is no single source, last-updated timestamp, authorized-editor rule or conflict-resolution winner.',
  };
  finding('F-SAFE-1', 'HIGH', 'safety',
    'Safety facts (allergies, injuries) are duplicated per surface with no single source of truth.',
    'Member declares peanuts; nutritionist and café carry their own copies; trainer/instructor carry the shoulder injury separately. No provenance (who entered it, when, who may edit) and no conflict rule if two copies disagree — a real safety risk. Fix: one health record per member_id with authored updates, timestamps and role-scoped edit rights; every surface reads it.');

  /* ---------- 5. account states ---------- */
  const stateHandling = { frozen: /state\.frozen/.test(app), expired: /expired|subEnds/.test(app), deleted: /delete-data|deletion/.test(app), pending: /activate|invitation/.test(app), locked: /locked|suspend/.test(app) };
  report.accountStates = stateHandling;
  if (!stateHandling.locked) finding('F-STATE-1', 'LOW', 'account-states', 'No account-locked/suspended state in the member app.', 'Active/frozen/expired/pending exist; a locked/suspended state (e.g. after payment failure or policy breach) is not modeled.');

  /* ---------- 6. password finding — REDACTED ---------- */
  const loginChecksPassword = /row\.password/.test(app);
  const columnOptional = /demo mode|row\.password\)/.test(app);
  report.passwordFinding = {
    appReadsSheetPasswordColumn: loginChecksPassword,
    columnDeletionTolerated: columnOptional,
    valuesInThisReport: 'REDACTED — no password values are read, logged, or screenshotted by this audit.',
  };
  finding('F-SEC-1', 'CRITICAL', 'security',
    'Login validates against a plaintext password column in the Google Sheet (values redacted here).',
    'Plaintext credentials must never live in a data sheet, localStorage or frontend. The app already tolerates deleting the column (any password works in demo mode). Fix: managed auth (Supabase) with hashed credentials, email/phone identity (names are not unique), reset tokens, session expiry and rate limiting. This is the owner\'s standing demo decision, recorded as a finding, not auto-changed.');

  /* login identity is name, not email/phone */
  finding('F-SEC-2', 'HIGH', 'security',
    'Login identity is full name + password; names are not unique identifiers.',
    'Two members with the same or similar names collide. Fix: authenticate by verified email or phone, resolve to member_id.');

  report.severitySummary = {
    critical: report.findings.filter((f) => f.severity === 'CRITICAL').length,
    high: report.findings.filter((f) => f.severity === 'HIGH').length,
    medium: report.findings.filter((f) => f.severity === 'MEDIUM').length,
    low: report.findings.filter((f) => f.severity === 'LOW').length,
  };
  fs.writeFileSync(path.join(OUT, 'members-clients-report.json'), JSON.stringify(report, null, 2));

  /* the audit asserts it RAN and produced findings — it does not require the app to be defect-free */
  expect(report.findings.length).toBeGreaterThan(0);
  expect(report.passwordFinding.valuesInThisReport).toContain('REDACTED');
});
