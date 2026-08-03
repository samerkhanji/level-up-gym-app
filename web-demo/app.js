/* Level Up OS — MEMBER APP (multi-branch v3).
   Every fact on screen is read from the shared demo engine (data.js →
   window.DemoData) and every mutation goes through its services, so the
   reception / trainer / instructor / owner dashboards see the same state and
   the same GymBus events live. This file owns ONLY presentation + member
   session identity; the engine owns the truth (members, plans, branches,
   classes, PT, retail, payments, health facts).

   Member identity is persisted in localStorage 'lu_member' (a mbr_* id).
   Purely-visual state (active tab, open drafts) lives in memory. */

const D = window.DemoData;
const MEMBER_KEY = 'lu_member';

/* ================= icons ================= */

const PATHS = {
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1M14 20h1M20 20h1"/>',
  wallet: '<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M15.5 14.5h3"/>',
  star: '<path d="M12 3.5l2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.8l6-.9L12 3.5z"/>',
  zap: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  guest: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20.5c1.2-3.2 3.3-4.8 6-4.8s4.8 1.6 6 4.8M18 7.5v6M15 10.5h6"/>',
  tool: '<path d="M14.2 6.8a4.8 4.8 0 0 1 6.6-1.6l-3.3 3.3 2 2 3.3-3.3a4.8 4.8 0 0 1-6.5 6.6L9 21.1a2.05 2.05 0 0 1-2.9-2.9l8.1-8.1z"/>',
  alert: '<path d="M10.3 4 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.5h.01"/>',
  receipt: '<path d="M14 2.5H6a2 2 0 0 0-2 2v17l3-1.5 2.5 1.5L12 20l2.5 1.5L17 20l3 1.5v-13z"/><path d="M14 2.5v6h6M8.5 12h7M8.5 15.5h7"/>',
  gift: '<path d="M20 12.5V21H4v-8.5M2.5 7.5h19v5h-19zM12 21.5v-14M12 7.5H8a2.3 2.3 0 1 1 0-4.6c2.8 0 4 4.6 4 4.6zM12 7.5h4a2.3 2.3 0 1 0 0-4.6c-2.8 0-4 4.6-4 4.6z"/>',
  shield: '<path d="M12 22s8.5-4 8.5-10.5V5L12 2 3.5 5v6.5C3.5 18 12 22 12 22z"/>',
  chev: '<path d="M9.5 18.5 16 12 9.5 5.5"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z"/><path d="M10.2 19.5a2 2 0 0 0 3.6 0"/>',
  bowl: '<path d="M4 11.5h16a8 8 0 0 1-16 0Z"/><path d="M9 8.5c0-2 1.5-2 1.5-4M13.5 8.5c0-2 1.5-2 1.5-4"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
  clipboard: '<rect x="4.5" y="4" width="15" height="17.5" rx="2"/><path d="M9 4a3 3 0 0 1 6 0M8.5 11h7M8.5 15h5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.5-3.5 4-5 7.5-5s6 1.5 7.5 5"/>',
  check: '<path d="M4.5 12.5 10 18 19.5 7"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',
  leaf: '<path d="M4.5 19.5c0-9 7-15 15-15 0 8-6 15-15 15z"/><path d="M4.5 19.5C8 14 12 10.5 16.5 8"/>',
  flame: '<path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1.4-.6-2-.6-2s1.6.9 1.6 3a4 4 0 0 1-8 0c0-4.5 4-5.5 4-9z"/>',
  trophy: '<path d="M7 4h10v3a5 5 0 0 1-10 0V4z"/><path d="M7 5H4v1a4 4 0 0 0 3.5 4M17 5h3v1a4 4 0 0 1-3.5 4M12 12v4M9 20h6M9 20c0-2 1-3 3-3s3 1 3 3"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.7"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M4 21V11M10 21V6M16 21v-8M21 21H3"/>',
  repeat: '<path d="M17 2.5 21 6.5 17 10.5"/><path d="M3 12v-1a4 4 0 0 1 4-4h14"/><path d="M7 21.5 3 17.5l4-4"/><path d="M21 12v1a4 4 0 0 1-4 4H3"/>',
};
function icon(name, size = 18) {
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || ''}</svg>`;
}
function eyebrow(name, text) {
  return `<div class="eyebrow">${icon(name, 15)}<span>${text}</span></div>`;
}

/* ================= session + tiny helpers ================= */

function myId() { return localStorage.getItem(MEMBER_KEY) || null; }
function setSession(id) { if (id) localStorage.setItem(MEMBER_KEY, id); else localStorage.removeItem(MEMBER_KEY); }
function me() { const id = myId(); return id ? D.MemberService.byId(id) : null; }
function myPlan() { const m = me(); return m ? D.PlanService.byId(m.planId) : null; }
function branch(id) { return D.BranchService.byId(id); }
function branchName(id) { const b = branch(id); return b ? b.name : '—'; }
function insideVisit() { const id = myId(); return id ? D.AccessService.insideNow().find((v) => v.memberId === id) || null : null; }

const fmtT = (ms) => D.fmtTime(ms);
function fmtDate(iso) { const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')); return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtDur(min) { const h = Math.floor(min / 60); return h > 0 ? `${h} hr ${min % 60} min` : `${min} min`; }
function daysUntil(iso) { return Math.round((new Date(iso + 'T23:59:59').getTime() - D.now()) / 864e5); }
function greetingWord() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.getElementById('screen').appendChild(el);
  setTimeout(() => el.remove(), 2700);
}
function pushNotif(title, body, cta) {
  const id = myId(); if (!id) return;
  D.NotificationService.push({ memberId: id, title, body, cta });
}
function unreadCount() {
  const id = myId(); if (!id) return 0;
  return D.NotificationService.forMember(id).filter((n) => !n.read).length;
}
/* the engine records the payment; the wallet balance itself lives on the
   member record, so a wallet purchase debits it here then calls the service */
function debitWallet(amount) {
  const m = me(); if (!m) return false;
  if ((m.wallet || 0) < amount) return false;
  m.wallet = +(m.wallet - amount).toFixed(2); D.persist();
  return true;
}

/* class name → placeholder art */
function clsImg(name) {
  const n = name.toLowerCase();
  if (n.includes('trx')) return 'img/class-trx.svg';
  if (n.includes('spin')) return 'img/class-spinning.svg';
  if (n.includes('yoga')) return 'img/class-yoga.svg';
  if (n.includes('abs') || n.includes('core')) return 'img/class-abs-core.svg';
  if (n.includes('workshop') || n.includes('deadlift')) return 'img/class-workshop.svg';
  if (n.includes('strength')) return 'img/class-strength.svg';
  return 'img/class-functional.svg';
}
const ZONE_IMG = {
  freeweight: 'zone-freeweight', strength: 'zone-strength', cable: 'zone-cable',
  cardio: 'zone-cardio', functional: 'zone-functional', trx: 'zone-trx-studio',
  spin: 'zone-spin-studio', group: 'zone-group-room', locker: 'zone-lockers', reception: 'zone-reception',
};
function branchChip(branchId, extra) {
  const b = branch(branchId);
  if (!b) return '';
  return `<span class="chip-branch${b.unconfirmed ? ' tbc' : ''}"><span class="dotc"></span>${esc(b.name)}${b.unconfirmed ? ' · TBC' : ''}${extra ? ' · ' + esc(extra) : ''}</span>`;
}
function staffName(id) { const s = D.load().staff.find((x) => x.id === id); return s ? s.name : '—'; }
function roomName(id) { const r = D.load().rooms.find((x) => x.id === id); return r ? r.name : '—'; }

/* denial reasons in plain language */
function denialText(reason) {
  const m = me(); const plan = myPlan();
  const home = m ? branchName(m.homeBranchId) : '';
  switch (reason) {
    case 'frozen': return 'Your membership is frozen. Unfreeze it in Account — or ask reception.';
    case 'expired': return `Your membership expired${m ? ' on ' + fmtDate(m.subEnds) : ''}. Renew to keep training.`;
    case 'suspended': return 'Your membership is suspended — please see reception.';
    case 'access_restricted': return 'Access restricted: ' + ((m && m.restriction) || 'see reception') + '.';
    case 'branch_not_allowed': return `Your plan covers ${home} only. The All-Branches plan opens every Level Up door.`;
    case 'outside_allowed_hours': return plan && plan.accessHours ? `Your Off-Peak plan enters between ${plan.accessHours.from}:00 and ${plan.accessHours.to}:00. Come back within those hours.` : 'Outside your plan’s allowed hours.';
    case 'at_capacity': return 'This branch is at capacity right now. Try again shortly — or check a quieter branch.';
    case 'duplicate_visit': return 'You are already checked in. Check out first, then scan again.';
    case 'branch_closed': return 'This branch is temporarily closed — see the Branches tab for details.';
    case 'unknown_branch': return 'Pick which gate you are at first.';
    default: return 'Entry not available — see reception. (' + reason + ')';
  }
}

/* ================= routing ================= */

const views = ['login', 'onboard', 'home', 'train', 'book', 'club', 'account', 'notifications', 'pass'];
const tabViews = ['home', 'train', 'book', 'club', 'account'];
const tabbar = document.getElementById('tabbar');
const scanFab = document.getElementById('scanFab');

/* in-memory UI state — deliberately NOT persisted (visual only) */
const UI = {
  view: 'login',
  pt: null,               // { trainerId, branchId, hour, err }
  ptCancel: null, ptRes: null,
  pkgMethod: 'wallet',
  clsBranch: 'all',
  fuelBranch: null, fuelWarn: null,
  freezeOpen: false, guestBranch: null, transferTo: null, renewMethod: 'wallet',
  gate: null,
  ob: { step: 0, planId: null, branchId: null },
  train: {
    seg: 'today',              // 'today' | 'workouts' | 'history' | 'trainer'
    loggerSessionId: null,     // set while the Live Workout Logger is showing
    pending: null,             // what the readiness check should start: {type:'assigned'|'adhoc', ...}
    historyDetail: null,       // sessionId being viewed in History
    histSeg: 'history',        // 'history' | 'exercise' | 'progress'
    exercisePick: null,
    showVersions: false,
    qw: { picked: [] },        // quick-workout builder selection
  },
  book: { seg: 'classes', nutBranch: null, nutHour: null },   // 'classes' | 'pt' | 'nutrition'
  club: { seg: 'branches' },  // 'branches' | 'fuel'
};

const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function animateCounts(root) {
  if (!root || REDUCED_MOTION) return;
  root.querySelectorAll('[data-countup]').forEach((el) => {
    const target = parseFloat(el.dataset.countup);
    if (!isFinite(target) || target <= 0) return;
    const prefix = el.dataset.prefix || '';
    const finalText = el.textContent;
    const from = Math.floor(target * 0.4);
    const t0 = performance.now(), dur = 520;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = p >= 1 ? finalText : prefix + Math.round(from + (target - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });
  root.querySelectorAll('[data-fillto]').forEach((el) => {
    el.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = el.dataset.fillto; }));
  });
}

const RENDERERS = {
  home: renderHome, train: renderTrain, book: renderBook, club: renderClub,
  account: renderAccount, notifications: renderNotifs, onboard: renderOnboard,
};
function show(view) {
  UI.view = view;
  closeModal();
  stopRest();
  views.forEach((v) => document.getElementById('view-' + v).classList.toggle('active', v === view));
  tabbar.classList.toggle('hidden', !tabViews.includes(view));
  if (scanFab) scanFab.classList.toggle('hidden', !tabViews.includes(view));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  if (RENDERERS[view]) RENDERERS[view]();
  if (view === 'pass') openPass(); else stopPass();
  animateCounts(document.getElementById('c-' + view));
}
function rerender() {
  if (RENDERERS[UI.view]) { RENDERERS[UI.view](); }
  else if (UI.view === 'pass') openPass();
}

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => show(b.dataset.back)));

/* ================= modal ================= */

function openModal(html) {
  closeModal();
  const o = document.createElement('div');
  o.className = 'app-overlay'; o.id = 'modalOverlay';
  o.innerHTML = `<div class="app-modal">${html}</div>`;
  o.addEventListener('click', (ev) => { if (ev.target === o) closeModal(); });
  document.getElementById('screen').appendChild(o);
}
function closeModal() { const o = document.getElementById('modalOverlay'); if (o) o.remove(); }

/* ================= HOME ================= */

function renderHome() {
  const m = me(); if (!m) { show('login'); return; }
  const plan = myPlan() || {};
  const visit = insideVisit();
  const credits = D.PackageService.remaining(m.id) + 0;
  const planCredits = plan.ptCredits || 0;
  const validation = D.AccessService.validate(m.id);
  const unread = unreadCount();

  /* --- hero: enter gym / inside --- */
  let hero;
  if (visit) {
    const mins = Math.max(1, Math.floor((D.now() - Date.parse(visit.enteredAt)) / 60000));
    hero = `<button class="inside-card" data-action="open-pass">
        <div class="inside-left">
          <div class="inside-dot"></div>
          <div>
            <div class="inside-title">Inside · ${esc(branchName(visit.locationId))}</div>
            <div class="inside-meta">Since ${fmtT(Date.parse(visit.enteredAt))} · ${fmtDur(mins)} — tap to check out</div>
          </div>
        </div>
        <div class="hero-chev">${icon('chev', 20)}</div>
      </button>`;
  } else if (m.status === 'frozen') {
    hero = `<button class="enter-card frozen" data-action="open-pass">
        <div class="hero-text"><div class="t">Membership frozen</div><div class="s">Unfreeze in Account to enter</div></div>
        <div class="hero-chev">${icon('chev', 20)}</div>
      </button>`;
  } else {
    hero = `<button class="enter-card" data-action="open-pass">
        <div class="hero-qr">${icon('qr', 26)}</div>
        <div class="hero-text"><div class="t">Enter Gym</div><div class="s">Open your gate pass — any allowed branch</div></div>
        <div class="hero-chev">${icon('chev', 20)}</div>
      </button>`;
  }

  const eligibility = validation.ok
    ? `<div class="dim small" style="display:flex;align-items:center;gap:7px;flex-shrink:0"><span class="ok">${icon('check', 15)}</span>Gate-ready at ${esc(branchName(validation.branchId))} · QR v${m.qrVersion}</div>`
    : `<div class="warn-banner">${icon('alert', 17)}<div><b>Entry currently blocked</b>${esc(denialText(validation.reason))}</div></div>`;

  /* --- the multi-branch nudge --- */
  let nudge = '';
  if (!visit && plan.branchAccess === 'all') {
    const occ = D.BranchService.occupancy();
    const mine = occ.find((o) => o.branchId === m.homeBranchId);
    if (mine && mine.pct > 70) {
      const alt = occ
        .filter((o) => o.branchId !== m.homeBranchId && !o.closure && !(branch(o.branchId) || {}).unconfirmed && o.pct < mine.pct - 15)
        .sort((a, b) => a.pct - b.pct)[0];
      if (alt) {
        nudge = `<button class="li" data-action="goto-club" style="background:none;border:none;text-align:left;cursor:pointer;padding:0;width:100%">
            <div class="li-ic">${icon('pin', 18)}</div>
            <div class="li-body"><b style="font-size:14.5px">${esc(mine.name)} is busy right now</b> (${mine.pct}% full)
              <div class="meta">${esc(alt.name)} has lower occupancy (${alt.pct}%) — your membership covers both</div></div>
            ${icon('chev', 16)}
          </button>`;
      }
    }
  }

  /* --- up next --- */
  const todaysWorkout = D.WorkoutService.todaysAssigned(m.id);
  const nextPt = D.load().ptSessions
    .filter((s) => s.memberId === m.id && ['scheduled', 'live'].includes(s.status))
    .sort((a, b) => a.startsAt - b.startsAt)[0];
  const myBookings = D.BookingService.forMember(m.id)
    .map((b) => D.BookingService.classById(b.classId))
    .filter((c) => c && c.status === 'scheduled')
    .sort((a, b) => a.startsAt - b.startsAt);
  const nextCls = myBookings[0];
  const upnext = [];
  if (todaysWorkout) upnext.push(`<button class="li" data-action="goto-train" style="background:none;border:none;text-align:left;cursor:pointer;padding:0;width:100%">
      <div class="li-ic">${icon('dumbbell', 18)}</div>
      <div class="li-body"><b>${esc(todaysWorkout.dayName)}</b>
        <div class="meta">Today’s workout · ${todaysWorkout.exercises.length} exercises</div></div>
      ${icon('chev', 16)}
    </button>`);
  if (nextPt) upnext.push(`<div class="li">
      <div class="li-ic">${icon('dumbbell', 18)}</div>
      <div class="li-body"><b>PT with ${esc(staffName(nextPt.trainerId))}</b>
        <div class="meta">${fmtT(nextPt.startsAt)} · ${nextPt.durationMins} min</div></div>
      ${branchChip(nextPt.branchId)}
    </div>`);
  if (nextCls) upnext.push(`<div class="li">
      <div class="li-ic">${icon('calendar', 18)}</div>
      <div class="li-body"><b>${esc(nextCls.name)}</b>
        <div class="meta">${fmtT(nextCls.startsAt)} · ${esc(staffName(nextCls.instructorId))}</div></div>
      ${branchChip(nextCls.locationId)}
    </div>`);

  /* --- alerts --- */
  const alerts = [];
  const dLeft = daysUntil(m.subEnds);
  if (m.status === 'suspended') alerts.push({ t: 'Membership suspended', s: m.restriction || 'See reception', a: 'goto-account' });
  if (m.status === 'frozen') alerts.push({ t: 'Membership frozen', s: 'Unfreeze in Account when you are back', a: 'goto-account' });
  if (dLeft <= 0) alerts.push({ t: 'Membership expired', s: 'Renew at reception to restore access', a: 'goto-account' });
  else if (dLeft <= 21) alerts.push({ t: `Renews ${fmtDate(m.subEnds)}`, s: `${dLeft} days left on ${plan.name || 'your plan'}`, a: 'goto-account' });
  if ((credits + planCredits) > 0 && credits <= 2) alerts.push({ t: `${credits} PT credit${credits === 1 ? '' : 's'} remaining`, s: 'Top up a package in the Train tab', a: 'goto-train' });
  const unconfirmed = D.load().ptSessions.filter((s) => s.memberId === m.id && s.status === 'completed' && !s.memberConfirmed);
  if (unconfirmed.length) alerts.push({ t: 'Confirm your completed PT session', s: 'Review your trainer’s notes in Train → History', a: 'goto-train' });
  D.load().classes.filter((c) => (c.waitlist || []).includes(m.id)).forEach((c) => {
    alerts.push({ t: `Waitlist #${c.waitlist.indexOf(m.id) + 1} — ${c.name}`, s: `${branchName(c.locationId)} · ${fmtT(c.startsAt)} — we’ll bump you in automatically`, a: 'goto-book' });
  });
  const offlineHome = D.MaintenanceService.offline(m.homeBranchId).length;
  if (offlineHome) alerts.push({ t: `${offlineHome} machine${offlineHome === 1 ? '' : 's'} under maintenance at ${branchName(m.homeBranchId)}`, s: 'Alternatives posted — details in Club', a: 'goto-club' });

  /* --- branch occupancy snapshot --- */
  const occRows = D.BranchService.occupancy().map((o) => {
    const b = branch(o.branchId) || {};
    const cls = o.pct >= 75 ? 'hot' : o.pct >= 45 ? 'mid' : '';
    return `<div class="row" style="gap:12px">
        <span style="width:86px;font-weight:700;font-size:13.5px">${esc(o.name)}${b.unconfirmed ? ' <span class="dim" style="font-size:10.5px">TBC</span>' : ''}</span>
        <div class="occ-track"><div class="occ-fill ${cls}" data-fillto="${Math.min(100, o.pct)}%" style="width:${Math.min(100, o.pct)}%"></div></div>
        <span class="dim" style="font-size:12.5px;width:58px;text-align:right">${o.inside}/${o.capacity}</span>
      </div>`;
  }).join('');

  document.getElementById('c-home').innerHTML = `
    <header class="app-header">
      <div class="who">
        <div class="avatar">${esc((m.name || 'M')[0])}</div>
        <div>
          <div class="hello">${greetingWord()},</div>
          <div class="greeting">${esc(m.name.split(' ')[0])}</div>
        </div>
      </div>
      <button class="bell" data-action="inbox">${icon('bell', 20)}${unread ? `<span class="badge">${unread}</span>` : ''}</button>
    </header>

    <div class="lu-card">
      <div class="lc-top">
        <div>
          <div class="lc-brand">LEVEL UP</div>
          <div class="lc-name">${esc(m.name)}</div>
          <div class="lc-plan">${esc(plan.name || 'No plan')}</div>
        </div>
        <span class="lu-chip${m.status === 'active' ? '' : m.status === 'frozen' ? ' frz' : ' bad'}">${esc(m.status)}</span>
      </div>
      <div class="lc-grid">
        <div class="lc-cell"><span>Home branch</span><b>${esc(branchName(m.homeBranchId))}</b></div>
        <div class="lc-cell"><span>Renews</span><b>${fmtDate(m.subEnds)}</b></div>
        <div class="lc-cell"><span>PT credits</span><b>${credits}</b></div>
        <div class="lc-cell"><span>Pass</span><b>QR v${m.qrVersion}</b></div>
        <div class="lc-cell"><span>Wallet</span><b>$${(m.wallet || 0).toFixed(2).replace(/\.00$/, '')}</b></div>
        <div class="lc-cell"><span>Points</span><b>${m.points || 0}</b></div>
      </div>
    </div>

    ${hero}
    ${eligibility}

    <div class="card">
      ${eyebrow('pin', 'Live across branches')}
      ${occRows}
      ${nudge ? `<div class="divider"></div>${nudge}` : ''}
      <button class="ghost-btn slim" data-action="goto-club" style="margin-top:4px">Explore branches</button>
    </div>

    ${upnext.length ? `<div class="card">${eyebrow('clock', 'Up next')}${upnext.join('<div class="divider"></div>')}</div>` : ''}

    ${alerts.length ? `<div class="card">${eyebrow('alert', 'Needs your attention')}
      ${alerts.slice(0, 4).map((a) => `<button class="li" data-action="${a.a}" style="background:none;border:none;text-align:left;cursor:pointer;padding:0">
          <div class="li-ic">${icon('alert', 17)}</div>
          <div class="li-body"><b style="font-size:14.5px">${esc(a.t)}</b><div class="meta">${esc(a.s)}</div></div>
          ${icon('chev', 16)}
        </button>`).join('<div class="divider"></div>')}</div>` : ''}

    <div class="quick-grid">
      <button class="quick sos" data-action="sos-open">${icon('zap', 20)}<b>SOS</b><span>Alert staff now</span></button>
      <button class="quick" data-action="report-open">${icon('tool', 20)}<b>Report equipment</b><span>Broken or unsafe?</span></button>
      <button class="quick" data-action="goto-account">${icon('guest', 20)}<b>Guest pass</b><span>Bring a friend</span></button>
      <button class="quick" data-action="inbox">${icon('bell', 20)}<b>Inbox</b><span>${unread ? unread + ' unread' : 'All read'}</span></button>
    </div>`;
}

/* ================= BRANCHES ================= */

function clubSegHtml(active) {
  const segs = [['branches', 'Branches'], ['fuel', 'Fuel Bar']];
  return `<div class="seg">${segs.map(([k, l]) => `<button class="seg-btn${active === k ? ' active' : ''}" data-action="club-seg" data-seg="${k}">${l}</button>`).join('')}</div>`;
}
function renderClub() {
  const m = me(); if (!m) { show('login'); return; }
  const seg = UI.club.seg || 'branches';
  if (seg === 'fuel') renderClubFuel();
  else renderClubBranches();
}

function renderClubBranches() {
  const m = me(); if (!m) { show('login'); return; }
  const plan = myPlan() || {};
  const occ = D.BranchService.occupancy();
  const list = D.BranchService.list().sort((a, b) => (a.id === m.homeBranchId ? -1 : b.id === m.homeBranchId ? 1 : 0));

  const cards = list.map((l) => {
    const o = occ.find((x) => x.branchId === l.id) || { inside: 0, pct: 0 };
    const cls = o.pct >= 75 ? 'hot' : o.pct >= 45 ? 'mid' : '';
    const img = 'img/branch-' + l.id.slice(4) + '.svg';
    const allowed = plan.branchAccess === 'all' || l.id === m.homeBranchId;
    const closure = l.closure ? (typeof l.closure === 'string' ? l.closure : (l.closure.reason || l.closure.msg || 'Temporarily closed')) : null;

    const todays = D.BranchService.classesToday(l.id)
      .filter((c) => c.status !== 'cancelled')
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((c) => {
        const left = Math.max(0, c.capacity - D.BookingService.forClass(c.id).length);
        return `<div class="row" style="font-size:13.5px"><span><b>${fmtT(c.startsAt)}</b> · ${esc(c.name)}</span><span class="dim">${c.status === 'completed' ? 'done' : left + ' spots'}</span></div>`;
      }).join('');

    const trainers = D.BranchService.trainersAt(l.id)
      .map((t) => `<div class="row" style="font-size:13.5px"><span><b>${esc(t.name)}</b></span><span class="dim" style="text-align:right">${esc((t.specialties || []).join(' · '))}</span></div>`)
      .join('');

    const zones = D.ZoneService.forBranch(l.id)
      .filter((z) => ZONE_IMG[z.key])
      .map((z) => `<div class="zone-cell"><img src="img/${ZONE_IMG[z.key]}.svg" alt="" /><span>${esc(z.name)}</span></div>`)
      .join('');

    const offline = D.MaintenanceService.offline(l.id);
    const maint = offline.length
      ? `<div class="row" style="font-size:13px"><span class="warn" style="font-weight:700">${icon('tool', 14)} ${offline.length} machine${offline.length === 1 ? '' : 's'} under maintenance</span><span class="dim">alternatives posted</span></div>`
      : `<div class="dim" style="font-size:13px">${icon('check', 14)} All equipment in service</div>`;

    const ann = (l.announcements || []).slice(0, 2)
      .map((a) => `<div class="dim small">📣 ${esc(a.msg)}</div>`).join('');

    return `<div class="card">
        <img class="bimg" src="${img}" alt="${esc(l.name)}" />
        <div class="row">
          <span style="font-family:var(--display);font-weight:800;font-size:19px">${esc(l.name)}
            ${l.id === m.homeBranchId ? '<span class="chip chip-ok" style="font-size:10.5px;padding:3px 9px;vertical-align:2px">Home</span>' : ''}
            ${l.unconfirmed ? '<span class="chip chip-warn" style="font-size:10.5px;padding:3px 9px;vertical-align:2px">Opening to be confirmed</span>' : ''}
          </span>
          <span class="dim" style="font-size:12.5px">${l.opens}–${l.closes}</span>
        </div>
        ${closure ? `<div class="warn-banner">${icon('alert', 17)}<div><b>Temporarily closed</b>${esc(closure)}</div></div>` : ''}
        ${!allowed ? `<div class="dim small">${icon('lock', 13)} Not on your plan — All-Branches membership unlocks this door</div>` : ''}
        <div class="row" style="gap:12px">
          <div class="occ-track"><div class="occ-fill ${cls}" data-fillto="${Math.min(100, o.pct)}%" style="width:${Math.min(100, o.pct)}%"></div></div>
          <span class="dim" style="font-size:12.5px;white-space:nowrap">${o.inside} inside · ${o.pct}%</span>
        </div>
        ${ann}
        ${todays ? `<div class="sect-label">Today’s classes</div>${todays}` : ''}
        ${trainers ? `<div class="sect-label">Trainers here</div>${trainers}` : ''}
        <div class="sect-label">Zones</div>
        <div class="zone-strip">${zones}</div>
        ${maint}
        <div class="btn-row">
          <button class="ghost-btn slim" data-action="call-branch" data-phone="${esc(l.phone)}" style="flex:1">Call</button>
          <button class="ghost-btn slim" data-action="directions" data-addr="${esc(l.address)}" style="flex:1">Directions</button>
          <button class="accent-btn slim" data-action="goto-book" data-branch="${l.id}" style="flex:1">Classes</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('c-club').innerHTML = `
    <header class="app-header"><div class="greeting">Club</div><span></span></header>
    ${clubSegHtml('branches')}
    <div class="dim small" style="margin-top:-8px">One membership, four doors — live occupancy from the same engine reception sees.</div>
    ${cards}
    <details class="more-stub">
      <summary>More services (not enabled for Level Up)</summary>
      <ul>
        <li>Pool lane reservations</li>
        <li>Recovery &amp; spa bookings</li>
        <li>Meal-plan food ordering with kitchen workflow</li>
      </ul>
      <div style="margin-top:7px">The platform supports these modules per gym — Level Up’s configuration keeps them off, so the app hides them rather than showing dead ends.</div>
    </details>`;
}

/* ================= TRAIN (PT first) ================= */

function ptErrorText(res, trainer, branchId, hour) {
  const first = trainer.name.split(' ')[0];
  const detail = res.detail || {};
  if (res.error === 'travel_time_conflict') {
    const s = D.load().ptSessions.find((x) => x.id === detail.conflictWith);
    if (s) {
      const end = s.startsAt + (s.durationMins || 60) * 60000;
      const earliest = end + (detail.travelMins || 30) * 60000;
      return `${first} can’t make ${branchName(branchId)} by ${fmtT(D.at(hour, 0))} — they’re in ${branchName(s.branchId)} until ${fmtT(end)} (+${detail.travelMins || 30} min across town). Next possible: ${fmtT(earliest)}.`;
    }
    return `${first} is coaching at another branch around then — Beirut traffic makes that slot impossible. Try a later time.`;
  }
  if (res.error === 'trainer_busy') {
    const s = D.load().ptSessions.find((x) => x.id === detail.conflictWith);
    return s ? `${first} already has a session ${fmtT(s.startsAt)}–${fmtT(s.startsAt + (s.durationMins || 60) * 60000)} at ${branchName(s.branchId)}. Pick another slot.` : `${first} is booked then — pick another slot.`;
  }
  if (res.error === 'class_conflict') return `${first} teaches a class around that time. Pick another slot.`;
  if (res.error === 'no_pt_credits') return 'No PT credits on your account — buy a package below, then book.';
  if (res.error === 'branch_not_allowed') return `Your plan covers ${branchName((me() || {}).homeBranchId)} only — PT at another branch needs the All-Branches plan.`;
  if (res.error === 'trainer_not_at_branch') return `${first} doesn’t coach at that branch.`;
  return 'Could not book: ' + res.error;
}

function todayStr() { return new Date(D.now()).toISOString().slice(0, 10); }

function nextPtSession(m) {
  return D.load().ptSessions
    .filter((s) => s.memberId === m.id && ['scheduled', 'live'].includes(s.status))
    .sort((a, b) => a.startsAt - b.startsAt)[0] || null;
}

function estWorkoutMinutes(w) {
  const restMin = w.exercises.reduce((t, e) => t + Math.max(0, (e.targetSets || 3) - 1), 0) * 1.5;
  return Math.round(w.exercises.length * 10 + restMin);
}

function lastCompletedForDay(m, w) {
  return D.WorkoutService.history(m.id).find((h) => h.id !== w.id && h.programId === w.programId && h.dayName === w.dayName) || null;
}

function daysAgo(iso) { return Math.max(0, Math.round((D.now() - Date.parse(iso)) / 864e5)); }

function trainSegHtml(active) {
  const segs = [['today', 'Today'], ['workouts', 'Workouts'], ['history', 'History'], ['trainer', 'My Trainer']];
  return `<div class="seg">${segs.map(([k, l]) => `<button class="seg-btn${active === k ? ' active' : ''}" data-action="train-seg" data-seg="${k}">${l}</button>`).join('')}</div>`;
}

function sparklineSvg(points) {
  if (!points.length) return '<div class="dim small">Not enough data yet.</div>';
  const w = 280, h = 56, pad = 6;
  const max = Math.max(...points), min = Math.min(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => `${pad + i * step},${h - pad - ((p - min) / span) * (h - pad * 2)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:56px;display:block" preserveAspectRatio="none">
      <polyline points="${coords}" fill="none" stroke="var(--green-deep)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

/* ================= TRAIN — router ================= */

function renderTrain() {
  const m = me(); if (!m) { show('login'); return; }
  if (UI.train.loggerSessionId) { renderLogger(); return; }
  const seg = UI.train.seg || 'today';
  if (seg === 'workouts') renderTrainWorkouts();
  else if (seg === 'history') renderTrainHistory();
  else if (seg === 'trainer') renderTrainMyTrainer();
  else renderTrainToday();
}

/* ---------- 1. Today ---------- */

function renderTrainToday() {
  const m = me();
  const w = D.WorkoutService.todaysAssigned(m.id);
  const streak = D.WorkoutService.streak(m.id);
  const history = D.WorkoutService.history(m.id);
  const lastDone = history[0] || null;
  const nextPt = nextPtSession(m);
  const freqGoal = D.GoalService.forMember(m.id).find((g) => g.kind === 'frequency' && g.status === 'active');

  let card;
  if (w) {
    const resuming = w.status === 'in_progress';
    const trainerLabel = w.trainerId ? `Assigned by ${esc(staffName(w.trainerId))}` : 'Self-guided';
    const estMin = estWorkoutMinutes(w);
    const prior = lastCompletedForDay(m, w);
    const priorLine = prior ? `Last completed ${daysAgo(prior.endedAt)} day${daysAgo(prior.endedAt) === 1 ? '' : 's'} ago` : 'First time on this workout';
    card = `<div class="card" style="box-shadow:var(--shadow-float)">
        ${eyebrow('dumbbell', resuming ? 'In progress' : "Today's workout")}
        <div style="font-family:var(--display);font-weight:800;font-size:20px">${esc(w.dayName)}</div>
        <div class="dim small">${trainerLabel} · ${w.exercises.length} exercises · ~${estMin} min</div>
        <div class="dim small">${esc(priorLine)}</div>
        <button class="accent-btn" data-action="${resuming ? 'today-resume' : 'today-start'}" data-s="${w.id}">${resuming ? 'Resume workout' : 'Start workout'}</button>
      </div>`;
  } else {
    card = `<div class="card">
        ${eyebrow('dumbbell', 'Today')}
        <div style="font-family:var(--display);font-weight:800;font-size:18px">No workout assigned today</div>
        <div class="dim small">Build a quick workout or repeat your last session.</div>
        <button class="accent-btn" data-action="train-seg" data-seg="workouts">Go to Workouts</button>
      </div>`;
  }

  const ptRow = nextPt ? `<div class="li">
      <div class="li-ic">${icon('dumbbell', 18)}</div>
      <div class="li-body"><b>PT with ${esc(staffName(nextPt.trainerId))}</b><div class="meta">${fmtT(nextPt.startsAt)} · ${nextPt.durationMins} min</div></div>
      ${branchChip(nextPt.branchId)}
    </div>` : '';
  const lastRow = lastDone ? `<div class="li">
      <div class="li-ic">${icon('chart', 18)}</div>
      <div class="li-body"><b>${esc(lastDone.dayName)}</b><div class="meta">${fmtDate(lastDone.endedAt.slice(0, 10))} · ${lastDone.totalVolumeKg}kg volume${lastDone.prsHit.length ? ` · ${lastDone.prsHit.length} PR` : ''}</div></div>
    </div>` : '';

  let goalBlock = '';
  if (freqGoal) {
    const weekStart = D.now() - 6 * 864e5;
    const thisWeek = history.filter((h) => Date.parse(h.endedAt) >= weekStart).length;
    const pct = Math.min(100, Math.round((thisWeek / freqGoal.targetValue) * 100));
    goalBlock = `<div class="card">
        ${eyebrow('target', 'This week')}
        <div class="row"><b>${esc(freqGoal.label)}</b><span class="dim small">${thisWeek}/${freqGoal.targetValue} sessions</span></div>
        <div class="occ-track"><div class="occ-fill" data-fillto="${pct}%" style="width:${pct}%"></div></div>
      </div>`;
  }

  document.getElementById('c-train').innerHTML = `
    <header class="app-header"><div class="greeting">Train</div><span></span></header>
    ${trainSegHtml('today')}
    ${card}
    <div class="duo">
      <div class="mini-card" style="cursor:default">
        <div class="mini-top">${icon('flame', 15)} Streak</div>
        <div class="mini-value">${streak}</div>
        <div class="dim" style="font-size:11.5px">day${streak === 1 ? '' : 's'} in a row</div>
      </div>
      <div class="mini-card" style="cursor:default">
        <div class="mini-top">${icon('trophy', 15)} PRs</div>
        <div class="mini-value">${D.PersonalRecordService.forMember(m.id).length}</div>
        <div class="dim" style="font-size:11.5px">personal records</div>
      </div>
    </div>
    ${(ptRow || lastRow) ? `<div class="card">${eyebrow('clock', 'Up next & recent')}${[ptRow, lastRow].filter(Boolean).join('<div class="divider"></div>')}</div>` : ''}
    ${goalBlock}`;
}

/* ---------- 2. Workouts (library) ---------- */

function renderTrainWorkouts() {
  const m = me();
  const continuing = D.load().workoutSessions.find((w) => w.memberId === m.id && w.status === 'in_progress');
  const program = D.ProgramService.current(m.id);
  const version = program ? D.ProgramService.currentVersion(program) : null;
  const today = todayStr();
  const history = D.WorkoutService.history(m.id);

  const continueCard = continuing ? `<div class="card" style="box-shadow:var(--shadow-float)">
      ${eyebrow('dumbbell', 'Continue')}
      <div class="row"><b style="font-size:16px">${esc(continuing.dayName)}</b>${branchChip(continuing.branchId)}</div>
      <div class="dim small">Started ${fmtT(Date.parse(continuing.startedAt))} · ${continuing.exercises.length} exercises</div>
      <button class="accent-btn slim" data-action="today-resume" data-s="${continuing.id}">Resume workout</button>
    </div>` : '';

  const dayCards = version ? version.days.map((day) => {
    const already = D.load().workoutSessions.find((w) => w.memberId === m.id && w.dayName === day.name && w.assignedFor === today);
    let cta;
    if (already && already.status === 'completed') cta = `<div class="done-line">${icon('check', 15)} Completed today</div>`;
    else if (already) cta = `<button class="accent-btn slim" data-action="today-resume" data-s="${already.id}">Resume</button>`;
    else cta = `<button class="accent-btn slim" data-action="workout-start-day" data-day="${esc(day.name)}">Start</button>`;
    const names = day.exercises.map((e) => (D.ExerciseService.byId(e.exerciseId) || {}).name).filter(Boolean);
    return `<div class="card">
        <div class="row"><b style="font-size:15.5px">${esc(day.name)}</b></div>
        <div class="dim small">${day.exercises.length} exercises · ${esc(names.slice(0, 3).join(', '))}${names.length > 3 ? '…' : ''}</div>
        ${cta}
      </div>`;
  }).join('') : '<div class="card dim small">No active program — your trainer hasn’t assigned one yet.</div>';

  const picked = UI.train.qw.picked;
  const cats = ['Strength', 'Isolation', 'Core', 'Cardio', 'Functional'];
  const qwGroups = cats.map((cat) => {
    const items = D.ExerciseService.list(cat);
    if (!items.length) return '';
    return `<div class="sect-label">${cat}</div>
      <div class="slot-row">${items.map((e) => `<button class="slot${picked.includes(e.id) ? ' sel' : ''}" data-action="qw-toggle" data-e="${e.id}">${esc(e.name)}</button>`).join('')}</div>`;
  }).join('');

  const repeat = history[0];
  const repeatCard = repeat ? `<div class="card">
      ${eyebrow('repeat', 'Repeat last workout')}
      <div class="row"><b>${esc(repeat.dayName)}</b><span class="dim small">${fmtDate(repeat.endedAt.slice(0, 10))}</span></div>
      <div class="dim small">${repeat.exercises.length} exercises · ${repeat.totalVolumeKg}kg volume</div>
      <button class="ghost-btn slim" data-action="workout-repeat" data-s="${repeat.id}">Repeat this workout</button>
    </div>` : '';

  document.getElementById('c-train').innerHTML = `
    <header class="app-header"><div class="greeting">Train</div><span></span></header>
    ${trainSegHtml('workouts')}
    ${continueCard}
    <div class="sect-label">Trainer-assigned${program ? ` · v${program.currentVersion}` : ''}</div>
    ${dayCards}
    <div class="card">
      ${eyebrow('dumbbell', 'Quick workout')}
      <div class="dim small">Pick 3–6 exercises — we’ll build the session.</div>
      ${qwGroups}
      <button class="accent-btn" data-action="qw-start" ${picked.length < 3 || picked.length > 6 ? 'disabled style="opacity:.4"' : ''}>Start quick workout (${picked.length})</button>
    </div>
    ${repeatCard}`;
}

/* ---------- 4. History & Progress ---------- */

function renderTrainHistory() {
  const seg = UI.train.histSeg || 'history';
  let body;
  if (UI.train.historyDetail) body = renderHistoryDetail(UI.train.historyDetail);
  else if (seg === 'exercise') body = renderExerciseHistoryPane();
  else if (seg === 'progress') body = renderProgressPane();
  else body = renderHistoryList();

  document.getElementById('c-train').innerHTML = `
    <header class="app-header"><div class="greeting">Train</div><span></span></header>
    ${trainSegHtml('history')}
    ${!UI.train.historyDetail ? `<div class="seg">${[['history', 'History'], ['exercise', 'Exercises'], ['progress', 'Progress']].map(([k, l]) => `<button class="seg-btn${seg === k ? ' active' : ''}" data-action="hist-seg" data-seg="${k}">${l}</button>`).join('')}</div>` : ''}
    ${body}`;
}

function renderHistoryList() {
  const m = me();
  const rows = D.WorkoutService.history(m.id).map((w) => {
    const dur = w.startedAt && w.endedAt ? Math.round((Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60000) : null;
    return `<button class="card" data-action="hist-open" data-s="${w.id}" style="text-align:left;border:none;cursor:pointer;width:100%">
        <div class="row"><b>${esc(w.dayName)}</b>${branchChip(w.branchId)}</div>
        <div class="dim small">${fmtDate(w.endedAt.slice(0, 10))}${dur ? ` · ${fmtDur(dur)}` : ''} · ${w.totalVolumeKg}kg${w.prsHit.length ? ` · ${w.prsHit.length} PR` : ''}</div>
      </button>`;
  }).join('');
  return rows || '<div class="card dim small">No completed workouts yet — finish one from Today or Workouts.</div>';
}

function renderHistoryDetail(sessionId) {
  const w = D.WorkoutService.byId(sessionId);
  if (!w) { UI.train.historyDetail = null; return renderHistoryList(); }
  const dur = w.startedAt && w.endedAt ? Math.round((Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60000) : null;
  const exRows = w.exercises.map((ex) => {
    const exo = D.ExerciseService.byId(ex.exerciseId);
    const sets = ex.sets.filter((s) => s.status === 'completed').map((s) => `${s.actualWeight}kg×${s.actualReps}${s.rpe ? ` @RPE${s.rpe}` : ''}`).join(' · ');
    return `<div class="exercise"><span>${esc(exo ? exo.name : ex.exerciseId)}</span><span class="dim" style="text-align:right">${esc(sets) || '—'}</span></div>`;
  }).join('');
  const fb = w.trainerFeedback;
  return `<button class="ghost-btn slim" data-action="hist-back" style="width:auto">‹ Back</button>
    <div class="card">
      <div class="row"><b style="font-size:17px">${esc(w.dayName)}</b>${branchChip(w.branchId)}</div>
      <div class="dim small">${fmtDate(w.endedAt.slice(0, 10))}${dur ? ` · ${fmtDur(dur)}` : ''} · ${w.totalVolumeKg}kg volume${w.prsHit.length ? ` · ${w.prsHit.length} PR` : ''}</div>
      ${exRows}
      ${w.notes ? `<div class="dim small">“${esc(w.notes)}”</div>` : ''}
    </div>
    ${fb && fb.visibility === 'shared' ? `<div class="card">
        ${eyebrow('clipboard', 'Trainer feedback')}
        <div class="small">${esc(fb.summary || '')}</div>
        ${fb.homework ? `<div class="row small"><span class="dim">Homework</span><b>${esc(fb.homework)}</b></div>` : ''}
        ${fb.nextTarget ? `<div class="row small"><span class="dim">Next target</span><b>${esc(fb.nextTarget)}</b></div>` : ''}
      </div>` : ''}`;
}

function renderExerciseHistoryPane() {
  const m = me();
  const done = D.WorkoutService.history(m.id);
  const idsSeen = [];
  done.forEach((w) => w.exercises.forEach((e) => { if (e.sets.some((s) => s.status === 'completed') && !idsSeen.includes(e.exerciseId)) idsSeen.push(e.exerciseId); }));
  if (!idsSeen.length) return '<div class="card dim small">Log a workout to see exercise history here.</div>';
  const picked = idsSeen.includes(UI.train.exercisePick) ? UI.train.exercisePick : idsSeen[0];
  const chips = idsSeen.map((id) => {
    const exo = D.ExerciseService.byId(id);
    return `<button class="slot${picked === id ? ' sel' : ''}" data-action="ex-pick" data-e="${id}">${esc(exo ? exo.name : id)}</button>`;
  }).join('');

  const rows = D.ExerciseService.historyFor(m.id, picked);
  const pr = D.PersonalRecordService.forExercise(m.id, picked)[0];
  const exo = D.ExerciseService.byId(picked);
  const points = rows.slice().reverse().map((r) => Math.max(0, ...r.sets.map((s) => s.actualWeight || 0)));
  const list = rows.map((r) => {
    const top = r.sets.reduce((best, s) => ((s.actualWeight || 0) > (best.actualWeight || 0) ? s : best), r.sets[0] || {});
    const orm = top.actualWeight ? D.ExerciseService.estOneRepMax(top.actualWeight, top.actualReps) : null;
    return `<div class="row small"><span>${fmtDate(r.at.slice(0, 10))} · ${esc(branchName(r.branchId))}</span><span><b>${top.actualWeight || '—'}kg×${top.actualReps || '—'}</b>${orm ? ` · ~${orm}kg 1RM` : ''}</span></div>`;
  }).join('<div class="divider"></div>');

  return `<div class="slot-row">${chips}</div>
    <div class="card">
      ${eyebrow('chart', esc(exo ? exo.name : ''))}
      ${sparklineSvg(points)}
      ${pr ? `<div class="row"><span class="dim small">Current PR</span><b>${pr.valueKg}kg × ${pr.reps}</b></div>` : ''}
      <div class="divider"></div>
      ${list}
    </div>`;
}

function renderProgressPane() {
  const m = me();
  const logs = D.BodyLogService.forMember(m.id);
  const goals = D.GoalService.forMember(m.id);
  const history = D.WorkoutService.history(m.id);

  const bodyRows = logs.map((b, i) => {
    const prev = logs[i + 1];
    const delta = prev && b.weightKg && prev.weightKg ? +(b.weightKg - prev.weightKg).toFixed(1) : null;
    return `<div class="row small"><span>${fmtDate(b.at)} · ${esc(b.recordedByRole)}</span><span><b>${b.weightKg ? b.weightKg + 'kg' : '—'}</b>${delta != null ? ` <span class="dim">(${delta > 0 ? '+' : ''}${delta}kg)</span>` : ''}</span></div>`;
  }).join('<div class="divider"></div>');

  const goalRows = goals.map((g) => {
    let live;
    if (g.kind === 'frequency') {
      const weekStart = D.now() - 6 * 864e5;
      const thisWeek = history.filter((h) => Date.parse(h.endedAt) >= weekStart).length;
      live = Math.min(100, Math.round((thisWeek / g.targetValue) * 100));
    } else live = D.GoalService.progress(g);
    return `<div style="margin-bottom:2px">
        <div class="row"><b style="font-size:14px">${esc(g.label)}</b><span class="dim small">${g.status === 'done' ? 'Done' : fmtDate(g.targetDate)}</span></div>
        <div class="occ-track" style="margin:5px 0"><div class="occ-fill" data-fillto="${live}%" style="width:${live}%"></div></div>
        <div class="dim small">${g.startValue}${g.unit === 'kg' ? 'kg' : ''} → ${g.targetValue}${g.unit === 'kg' ? 'kg' : ' ' + esc(g.unit)}</div>
      </div>`;
  }).join('<div class="divider"></div>');

  const insights = [];
  if (history.length >= 2) {
    const [a, b] = history;
    const diff = a.totalVolumeKg - b.totalVolumeKg;
    const pct = b.totalVolumeKg ? Math.round((diff / b.totalVolumeKg) * 100) : 0;
    insights.push(`Your last session moved ${Math.abs(pct)}% ${diff >= 0 ? 'more' : 'less'} volume (${a.totalVolumeKg}kg) than the one before (${b.totalVolumeKg}kg).`);
  }
  const liftGoal = goals.find((g) => g.kind === 'lift' && g.status === 'active');
  if (liftGoal) {
    const last = D.ExerciseService.lastPerformance(m.id, liftGoal.exerciseId);
    const current = last && last.sets.length ? Math.max(...last.sets.map((s) => s.actualWeight || 0)) : liftGoal.startValue;
    const remaining = +(liftGoal.targetValue - current).toFixed(1);
    const daysLeft = Math.max(0, Math.round((new Date(liftGoal.targetDate + 'T12:00:00').getTime() - D.now()) / 864e5));
    const exName = (D.ExerciseService.byId(liftGoal.exerciseId) || {}).name || 'your lift';
    insights.push(remaining > 0
      ? `${current}kg on ${esc(exName)} — ${remaining}kg to your ${liftGoal.targetValue}kg goal, ${daysLeft} days left.`
      : `Goal reached — ${current}kg on ${esc(exName)}!`);
  }
  if (logs.length >= 2 && logs[0].weightKg && logs[logs.length - 1].weightKg) {
    const total = +(logs[0].weightKg - logs[logs.length - 1].weightKg).toFixed(1);
    insights.push(`Body weight ${total <= 0 ? 'down' : 'up'} ${Math.abs(total)}kg since your first logged entry.`);
  }

  return `
    ${insights.length ? `<div class="card">${eyebrow('chart', 'Insights')}${insights.map((t) => `<div class="small">${t}</div>`).join('')}</div>` : ''}
    <div class="card">
      ${eyebrow('target', 'Goals')}
      ${goalRows || '<div class="dim small">No goals yet.</div>'}
    </div>
    <div class="card">
      ${eyebrow('chart', 'Body log')}
      ${bodyRows || '<div class="dim small">No entries yet.</div>'}
      <div class="divider"></div>
      <div class="dim small">Add today’s numbers</div>
      <input class="input slim" id="blWeight" type="number" inputmode="decimal" placeholder="Weight (kg)" />
      <div class="btn-row">
        <input class="input slim" id="blWaist" type="number" inputmode="decimal" placeholder="Waist (cm)" style="flex:1" />
        <input class="input slim" id="blChest" type="number" inputmode="decimal" placeholder="Chest (cm)" style="flex:1" />
      </div>
      <button class="accent-btn slim" data-action="bl-save">Save body log</button>
    </div>`;
}

/* ---------- 5. My Trainer ---------- */

function renderTrainMyTrainer() {
  const m = me();
  const program = D.ProgramService.current(m.id);
  const trainerId = (program && program.trainerId) || m.trainerId;
  const trainer = trainerId ? D.TrainerService.byId(trainerId) : null;
  const credits = D.PackageService.remaining(m.id);
  const pkgs = D.PackageService.forMember(m.id);

  const profileCard = trainer ? `<div class="card">
      ${eyebrow('dumbbell', 'Your trainer')}
      <div class="trainer" style="box-shadow:none;padding:0">
        <div class="avatar sm tone-1">${esc(trainer.name[0])}</div>
        <div class="info">
          <div class="n">${esc(trainer.name)}</div>
          <div class="meta">${esc((trainer.specialties || []).join(' · '))}</div>
          <div class="meta">${branchChip((trainer.worksAt || [trainer.locationId])[0])}</div>
        </div>
      </div>
      <div class="row small"><span class="dim">PT credits remaining</span><b>${credits}</b></div>
    </div>` : `<div class="card dim small">No trainer assigned yet.</div>`;

  const programCard = program ? `<div class="card">
      ${eyebrow('clipboard', 'Current program')}
      <div class="row"><b>${esc(program.name)}</b><span class="chip chip-ok">v${program.currentVersion}</span></div>
      <button class="ghost-btn slim" data-action="prog-versions">${UI.train.showVersions ? 'Hide' : 'View'} past versions</button>
      ${UI.train.showVersions ? D.ProgramService.versionHistory(program.id).map((v) => `<div class="row small" style="align-items:flex-start"><span class="dim">v${v.version} · ${fmtDate(v.at.slice(0, 10))}</span><span style="text-align:right;max-width:210px">${esc(v.reason || '')}</span></div>`).join('<div class="divider"></div>') : ''}
    </div>` : '';

  const items = [];
  D.WorkoutService.history(m.id).filter((w) => w.trainerId).forEach((w) => items.push({ at: w.endedAt, kind: 'workout', data: w }));
  if (program) D.ProgramService.versionHistory(program.id).forEach((v) => items.push({ at: v.at.length === 10 ? v.at + 'T12:00:00' : v.at, kind: 'program', data: v }));
  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const tl = items.map((it, i) => {
    const rail = `<div class="tl-rail"><div class="tl-dot"></div>${i < items.length - 1 ? '<div class="tl-line"></div>' : ''}</div>`;
    if (it.kind === 'workout') {
      const w = it.data;
      return `<div class="tl-item">${rail}<div class="tl-body">
          <div class="tl-time">${fmtDate(w.endedAt.slice(0, 10))}</div>
          <div class="tl-title">${esc(w.dayName)} — ${w.totalVolumeKg}kg${w.prsHit.length ? ` · ${w.prsHit.length} PR` : ''}</div>
          ${w.trainerFeedback && w.trainerFeedback.visibility === 'shared' ? `<div class="tl-sub">“${esc(w.trainerFeedback.summary || '')}”</div>` : ''}
        </div></div>`;
    }
    const v = it.data;
    return `<div class="tl-item">${rail}<div class="tl-body">
        <div class="tl-time">${fmtDate((v.at || '').slice(0, 10))}</div>
        <div class="tl-title">Program updated — v${v.version}</div>
        <div class="tl-sub">${esc(v.reason || '')}${v.changeSummary ? ` · ${esc(v.changeSummary)}` : ''}</div>
      </div></div>`;
  }).join('');

  const sessions = D.load().ptSessions.filter((s) => s.memberId === m.id);
  const upcoming = sessions.filter((s) => ['scheduled', 'live'].includes(s.status)).sort((a, b) => a.startsAt - b.startsAt);
  const historyPt = sessions.filter((s) => ['completed', 'no_show', 'cancelled'].includes(s.status)).sort((a, b) => b.startsAt - a.startsAt);

  const upcomingRows = upcoming.map((s) => {
    let actions = `<div class="btn-row">
        <button class="ghost-btn slim" data-action="pt-res" data-s="${s.id}" style="flex:1">Reschedule</button>
        <button class="ghost-btn slim danger" data-action="pt-cancel" data-s="${s.id}" style="flex:1">Cancel</button>
      </div>`;
    if (UI.ptCancel === s.id) {
      actions = `<div class="dim small">Why are you cancelling?</div><div class="slot-row">
          ${['Work conflict', 'Feeling unwell', 'Travel plans'].map((r) => `<button class="slot" data-action="pt-cancel-reason" data-s="${s.id}" data-r="${esc(r)}">${r}</button>`).join('')}
          <button class="slot" data-action="pt-abort">Keep it</button>
        </div>`;
    }
    if (UI.ptRes === s.id) {
      const t = D.TrainerService.byId(s.trainerId);
      const windows = ((t && t.availability) || []).filter((a) => a.branchId === s.branchId);
      const hours = [];
      windows.forEach((wnd) => { for (let h = wnd.fromH; h < wnd.toH; h++) hours.push(h); });
      actions = `<div class="dim small">Pick a new time at ${esc(branchName(s.branchId))}:</div><div class="slot-row">
          ${hours.map((h) => `<button class="slot" data-action="pt-res-hour" data-s="${s.id}" data-h="${h}">${fmtT(D.at(h, 0))}</button>`).join('')}
          <button class="slot" data-action="pt-abort">Never mind</button>
        </div>`;
    }
    return `<div class="card">
        <div class="row"><b>PT · ${esc(staffName(s.trainerId))}</b>${branchChip(s.branchId)}</div>
        <div class="dim small">${fmtT(s.startsAt)} · ${s.durationMins} min${s.status === 'live' ? ' · <span class="ok" style="font-weight:700">in session now</span>' : ''}</div>
        ${actions}
      </div>`;
  }).join('');

  const historyRows = historyPt.slice(0, 4).map((s) => {
    const statusTxt = s.status === 'completed' ? 'Completed' : s.status === 'no_show' ? 'Missed' : 'Cancelled';
    return `<div class="card">
        <div class="row"><b>${esc(staffName(s.trainerId))} · ${statusTxt}</b>${branchChip(s.branchId)}</div>
        <div class="dim small">${fmtT(s.startsAt)}${s.pb ? ` · <span class="ok" style="font-weight:700">PB: ${esc(s.pb)}</span>` : ''}</div>
        ${s.status === 'completed' && !s.memberConfirmed
          ? `<button class="accent-btn slim" data-action="pt-confirm-session" data-s="${s.id}">Confirm session — deducts 1 credit</button>`
          : s.status === 'completed' ? `<div class="done-line">${icon('check', 15)} Confirmed by you</div>` : ''}
      </div>`;
  }).join('');

  const consult = D.load().consults.find((c) => c.memberId === m.id && c.status === 'scheduled');

  document.getElementById('c-train').innerHTML = `
    <header class="app-header"><div class="greeting">Train</div><span></span></header>
    ${trainSegHtml('trainer')}
    ${profileCard}
    ${programCard}
    <div class="sect-label">Relationship timeline</div>
    ${tl ? `<div class="card"><div class="tl">${tl}</div></div>` : '<div class="card dim small">No shared history yet.</div>'}

    <div class="card">
      ${eyebrow('gift', 'PT packages')}
      <div class="dim small">${credits} credit${credits === 1 ? '' : 's'} remaining · ${pkgs.map((p) => `${p.total - p.used}/${p.total} with ${staffName(p.trainerId).split(' ')[0]}`).join(' · ') || 'no package yet'}</div>
      <div class="slot-row">
        <button class="slot${UI.pkgMethod === 'wallet' ? ' sel' : ''}" data-action="pkg-method" data-m="wallet">Pay from wallet ($${(m.wallet || 0).toFixed(0)})</button>
        <button class="slot${UI.pkgMethod === 'card' ? ' sel' : ''}" data-action="pkg-method" data-m="card">Card</button>
      </div>
      <div class="btn-row">
        <button class="ghost-btn slim" data-action="pkg-buy" data-total="4" data-price="140" style="flex:1">4 sessions · $140</button>
        <button class="accent-btn slim" data-action="pkg-buy" data-total="10" data-price="300" style="flex:1">10 sessions · $300</button>
      </div>
      <button class="ghost-btn slim" data-action="goto-book-pt" style="margin-top:8px">Book more sessions</button>
    </div>

    ${upcomingRows ? `<div class="sect-label">Upcoming PT sessions</div>${upcomingRows}` : ''}
    ${historyRows ? `<div class="sect-label">PT session history</div>${historyRows}` : ''}`;
}

/* ---------- 3. Live Workout Logger ---------- */

function materializeTargets(sessionId) {
  const w = D.WorkoutService.byId(sessionId); if (!w) return;
  w.exercises.forEach((ex, ei) => {
    const n = Math.max(1, ex.targetSets || 3);
    while (ex.sets.length < n) D.WorkoutService.addSet(sessionId, ei, { type: 'normal', status: 'upcoming' });
  });
}

function enterLogger(sessionId) {
  materializeTargets(sessionId);
  UI.train.loggerSessionId = sessionId;
  stopRest();
  renderTrain();
}

function renderLogger() {
  const w = D.WorkoutService.byId(UI.train.loggerSessionId);
  if (!w) { UI.train.loggerSessionId = null; renderTrain(); return; }
  const exCards = w.exercises.map((ex, ei) => renderExerciseCard(w, ex, ei)).join('');

  document.getElementById('c-train').innerHTML = `
    <header class="app-header">
      <button class="back" data-action="logger-back">‹</button>
      <div class="greeting" style="font-size:19px">${esc(w.dayName)}</div>
      <span></span>
    </header>
    <div class="dim small" style="margin-top:-8px">${esc(branchName(w.branchId))} · started ${w.startedAt ? fmtT(Date.parse(w.startedAt)) : '—'}</div>
    <div class="rest-wrap idle" id="restWrap">
      <div class="rest-info" id="restTxt">Rest timer</div>
      <div class="rest-track"><div class="rest-fill" id="restBar"></div></div>
      <div class="btn-row" style="margin-top:8px">
        <button class="ghost-btn slim" data-action="rest-start" style="flex:1">Start rest · 90s</button>
        <button class="ghost-btn slim" data-action="rest-skip" style="flex:1">Skip</button>
      </div>
    </div>
    ${exCards}
    <div class="cart-bar">
      <button class="accent-btn" data-action="logger-finish">Finish workout</button>
    </div>`;
  updateRestUI();
}

function renderExerciseCard(w, ex, ei) {
  const exo = D.ExerciseService.byId(ex.exerciseId) || { name: ex.exerciseId, muscles: [] };
  const last = D.ExerciseService.lastPerformance(w.memberId, ex.exerciseId);
  const lastLine = last && last.sets.length ? `Last time: ${last.sets.map((s) => `${s.actualWeight}×${s.actualReps}`).join(', ')}` : 'No previous data for this exercise';
  const needsMachine = exo.machineAssetIds && exo.machineAssetIds.length;
  const avail = needsMachine ? D.ExerciseService.availabilityAt(ex.exerciseId, w.branchId) : { ok: true };
  const availWarn = !avail.ok ? `<div class="warn-banner">${icon('alert', 15)}<div><b>${avail.reason === 'machine_down' ? 'Machine under maintenance' : 'Not available at this branch'}</b>${avail.suggestion ? `Try ${esc(avail.suggestion.name)} instead.` : ''}</div></div>` : '';
  const rows = ex.sets.map((s, si) => renderSetRow(ei, s, si, ex, last)).join('');

  return `<div class="card">
      <div class="row" style="align-items:flex-start">
        <div>
          <div style="font-weight:800;font-size:16px">${esc(exo.name)}</div>
          <div style="margin-top:4px">${(exo.muscles || []).map((mu) => `<span class="mchip">${esc(mu)}</span>`).join('')}</div>
        </div>
        <button class="ghost-btn slim" style="width:auto;flex:0;padding:8px 12px" data-action="copy-last" data-ei="${ei}">Copy last</button>
      </div>
      <div class="dim small">${esc(lastLine)}</div>
      ${availWarn}
      <div class="set-table">${rows}</div>
      <div class="btn-row">
        <button class="ghost-btn slim" data-action="set-add" data-ei="${ei}" style="flex:1">+ Add set</button>
        <button class="ghost-btn slim" data-action="set-remove" data-ei="${ei}" style="flex:1" ${ex.sets.length <= 1 ? 'disabled' : ''}>− Remove set</button>
      </div>
    </div>`;
}

function renderSetRow(ei, s, si, ex, last) {
  const lastSet = last && last.sets[si] ? `${last.sets[si].actualWeight}×${last.sets[si].actualReps}` : '—';
  const done = s.status === 'completed';
  const wt = s.actualWeight != null ? s.actualWeight : '';
  const reps = s.actualReps != null ? s.actualReps : '';
  const rpe = s.rpe != null ? s.rpe : '';
  const types = [['warmup', 'Warm'], ['normal', 'Set'], ['dropset', 'Drop'], ['failure', 'Fail'], ['amrap', 'AMRAP']];
  return `<div class="set-row${done ? ' done' : ''}" data-ei="${ei}" data-si="${si}">
      <div class="set-row-top">
        <select class="set-type" data-ei="${ei}" data-si="${si}">
          ${types.map(([v, l]) => `<option value="${v}" ${s.type === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <span class="set-meta">Last ${lastSet} · Target ${ex.targetReps || 10} reps</span>
        <button class="set-log${done ? ' done' : ''}" data-action="set-log" data-ei="${ei}" data-si="${si}">${done ? icon('check', 14) : 'Log'}</button>
      </div>
      <div class="set-row-bottom">
        <div class="wt-group">
          <button class="wt-adj" data-action="wt-adj" data-d="-5">−5</button>
          <input type="number" inputmode="decimal" class="set-inp set-wt" value="${wt}" placeholder="kg" />
          <button class="wt-adj" data-action="wt-adj" data-d="2.5">+2.5</button>
          <button class="wt-adj" data-action="wt-adj" data-d="5">+5</button>
        </div>
        <input type="number" inputmode="numeric" class="set-inp set-reps" value="${reps}" placeholder="reps" />
        <select class="set-inp set-rpe">
          <option value="">RPE</option>
          ${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<option value="${n}" ${Number(rpe) === n ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
      </div>
    </div>`;
}

/* ---- readiness check ---- */

function openReadinessModal() {
  const soreOpts = ['Chest', 'Back', 'Shoulders', 'Arms', 'Quads', 'Hamstrings', 'Core'];
  openModal(`
    <h3>Quick readiness check</h3>
    <div class="dim small">Three taps, then go.</div>
    <div class="sect-label" style="margin-top:4px">Energy</div>
    <div class="slot-row">${['low', 'normal', 'high'].map((v) => `<button class="slot${v === 'normal' ? ' sel' : ''}" data-action="rc-energy" data-v="${v}">${v[0].toUpperCase()}${v.slice(1)}</button>`).join('')}</div>
    <div class="sect-label">Soreness (optional)</div>
    <div class="slot-row">${soreOpts.map((s) => `<button class="slot" data-action="rc-soreness" data-v="${s}">${s}</button>`).join('')}</div>
    <div class="sect-label">Pain (optional)</div>
    <input class="input slim" id="rcPain" placeholder="Anything hurting today?" autocomplete="off" />
    <button class="accent-btn" data-action="rc-go" style="margin-top:8px">Start workout</button>
    <button class="ghost-btn" data-action="modal-close">Cancel</button>`);
}

/* ---- rest timer (pure client-side, no backend) ---- */

let restTimer = { active: false, secondsLeft: 0, total: 90, intervalId: null };
function startRest(seconds) {
  stopRest();
  restTimer = { active: true, secondsLeft: seconds || 90, total: seconds || 90, intervalId: null };
  restTimer.intervalId = setInterval(() => {
    restTimer.secondsLeft--;
    updateRestUI();
    if (restTimer.secondsLeft <= 0) stopRest();
  }, 1000);
  updateRestUI();
}
function stopRest() {
  if (restTimer.intervalId) clearInterval(restTimer.intervalId);
  restTimer = { active: false, secondsLeft: 0, total: 90, intervalId: null };
  updateRestUI();
}
function updateRestUI() {
  const wrap = document.getElementById('restWrap');
  if (!wrap) return;
  const bar = document.getElementById('restBar');
  const txt = document.getElementById('restTxt');
  wrap.classList.toggle('idle', !restTimer.active);
  if (txt) txt.textContent = restTimer.active ? `Resting · ${restTimer.secondsLeft}s` : 'Rest timer';
  if (bar) bar.style.width = restTimer.active ? Math.max(0, (restTimer.secondsLeft / restTimer.total) * 100) + '%' : '0%';
}

/* ---- finish celebration — the peak moment ---- */

function showFinishCelebration(w) {
  const durMin = w.startedAt && w.endedAt ? Math.max(1, Math.round((Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 60000)) : null;
  const prHtml = w.prsHit.length ? `<div class="finish-prs">${w.prsHit.map((pr) => {
      const exo = D.ExerciseService.byId(pr.exerciseId);
      return `<div class="finish-pr-chip">${icon('trophy', 16)} New PR · ${esc(exo ? exo.name : pr.exerciseId)} — ${pr.valueKg}kg</div>`;
    }).join('')}</div>` : '';
  const el = document.createElement('div');
  el.className = 'finish-cele';
  el.innerHTML = `
    <div class="fc-big">${w.prsHit.length ? '🏆' : '💪'}</div>
    <div class="fc-title">Workout complete!</div>
    <div class="fc-sub">${esc(w.dayName)}${durMin ? ` · ${fmtDur(durMin)}` : ''}</div>
    <div class="fc-stats">
      <div class="fc-stat"><b>${(w.totalVolumeKg || 0).toLocaleString()}</b><span>kg lifted</span></div>
      <div class="fc-stat"><b>${w.exercises.length}</b><span>exercises</span></div>
      <div class="fc-stat"><b>${w.prsHit.length}</b><span>PRs</span></div>
    </div>
    ${prHtml}
    <button class="accent-btn" data-action="fc-done" style="max-width:280px">Done</button>`;
  document.getElementById('screen').appendChild(el);
}

/* ================= CLASSES ================= */

function classBookErrorText(err, c) {
  const m = me() || {};
  switch (err) {
    case 'classes_not_included': return 'Your plan doesn’t include group classes — the Monthly + Classes or 6-Month All-Branches plans do. Ask at reception.';
    case 'branch_not_allowed': return `Your plan covers ${branchName(m.homeBranchId)} only — this class runs at ${branchName(c.locationId)}.`;
    case 'time_conflict': return 'That clashes with another class you’ve already booked.';
    case 'already_booked': return 'You’re already booked into this class.';
    case 'class_not_open': return 'This class isn’t open for booking.';
    default: return 'Could not book: ' + err;
  }
}

function bookSegHtml(active) {
  const segs = [['classes', 'Classes'], ['pt', 'Personal Training'], ['nutrition', 'Nutrition']];
  return `<div class="seg">${segs.map(([k, l]) => `<button class="seg-btn${active === k ? ' active' : ''}" data-action="book-seg" data-seg="${k}">${l}</button>`).join('')}</div>`;
}
function renderBook() {
  const m = me(); if (!m) { show('login'); return; }
  const seg = UI.book.seg || 'classes';
  if (seg === 'pt') renderBookPT();
  else if (seg === 'nutrition') renderBookNutrition();
  else renderBookClasses();
}

function renderBookClasses() {
  const m = me(); if (!m) { show('login'); return; }
  const all = D.load().classes.slice().sort((a, b) =>
    (a.status === 'scheduled' ? 0 : 1) - (b.status === 'scheduled' ? 0 : 1) || a.startsAt - b.startsAt);
  const shown = all.filter((c) => UI.clsBranch === 'all' || c.locationId === UI.clsBranch);
  const myBookings = new Set(D.BookingService.forMember(m.id).map((b) => b.classId));

  const filters = [`<button class="slot${UI.clsBranch === 'all' ? ' sel' : ''}" data-action="cls-branch" data-b="all">All branches</button>`]
    .concat(D.BranchService.list().map((l) => `<button class="slot${UI.clsBranch === l.id ? ' sel' : ''}" data-action="cls-branch" data-b="${l.id}">${esc(l.name)}</button>`))
    .join('');

  const cards = shown.map((c) => {
    const booked = myBookings.has(c.id);
    const waitPos = (c.waitlist || []).indexOf(m.id) + 1;
    const spotsLeft = Math.max(0, c.capacity - D.BookingService.forClass(c.id).length);
    const deadline = c.startsAt - (c.cancelDeadlineMins || 0) * 60000;
    const err = UI.clsErr && UI.clsErr.id === c.id ? UI.clsErr.msg : null;

    let cta;
    if (c.status === 'cancelled') cta = '<div class="err-line">Cancelled by the studio — anyone booked has been notified.</div>';
    else if (c.status === 'completed') cta = '<div class="dim small">Class finished.</div>';
    else if (booked) cta = `<div class="done-line">${icon('check', 15)} Booked · free cancel until ${fmtT(deadline)}</div>
        <button class="ghost-btn slim danger" data-action="cls-cancel" data-c="${c.id}">Cancel booking</button>`;
    else if (waitPos > 0) cta = `<div class="dim small" style="font-weight:700;color:var(--amber)">Waitlist #${waitPos} — we’ll bump you in automatically</div>`;
    else if (spotsLeft === 0) cta = `<button class="ghost-btn slim" data-action="cls-book" data-c="${c.id}">Full — join waitlist</button>`;
    else cta = `<button class="accent-btn slim" data-action="cls-book" data-c="${c.id}">Book · ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left</button>`;

    return `<div class="card">
        <div class="li" style="align-items:flex-start">
          <img class="class-thumb" src="${clsImg(c.name)}" alt="" />
          <div class="li-body">
            <div class="row" style="align-items:flex-start"><b style="font-size:15.5px">${esc(c.name)}</b>${branchChip(c.locationId)}</div>
            <div class="meta">${fmtT(c.startsAt)} · ${c.durationMins} min · ${esc(roomName(c.roomId))}</div>
            <div class="meta">${esc(staffName(c.instructorId))} · ${esc(c.difficulty)}${(c.equipment || []).length ? ' · ' + esc(c.equipment.join(', ')) : ''}</div>
          </div>
        </div>
        ${err ? `<div class="err-line">${esc(err)}</div>` : ''}
        ${cta}
      </div>`;
  }).join('') || (UI.clsBranch === 'all'
    ? '<div class="card dim small">No classes scheduled anywhere today — check back tomorrow.</div>'
    : `<div class="card dim small">No classes at this branch today.
        <button class="ghost-btn" style="margin-top:10px" data-action="cls-branch" data-b="all">See every branch instead</button></div>`);

  document.getElementById('c-book').innerHTML = `
    <header class="app-header"><div class="greeting">Book</div><span></span></header>
    ${bookSegHtml('classes')}
    <div class="dim small" style="margin-top:-8px">Same class name can run at two branches — the branch tag on each card is the one that counts.</div>
    <div class="slot-row">${filters}</div>
    ${cards}`;
}

function renderBookPT() {
  const m = me(); if (!m) { show('login'); return; }
  const program = D.ProgramService.current(m.id);
  const trainerId = (program && program.trainerId) || m.trainerId;
  const credits = D.PackageService.remaining(m.id);
  const allTrainers = D.TrainerService.list();

  let panel = '';
  if (UI.pt) {
    const t = D.TrainerService.byId(UI.pt.trainerId);
    const branches = (t.worksAt || [t.locationId]);
    const windows = (t.availability || []).filter((a) => a.branchId === UI.pt.branchId);
    const hours = [];
    windows.forEach((wnd) => { for (let h = wnd.fromH; h < wnd.toH; h++) hours.push(h); });
    panel = `<div class="card" style="box-shadow:var(--shadow-float)">
        ${eyebrow('dumbbell', 'Book a session · ' + esc(t.name))}
        <div class="dim small">Where?</div>
        <div class="slot-row">${branches.map((b) => `<button class="slot${UI.pt.branchId === b ? ' sel' : ''}" data-action="pt-branch" data-b="${b}">${esc(branchName(b))}</button>`).join('')}</div>
        <div class="dim small">When? <span style="font-size:11.5px">(${esc(t.name.split(' ')[0])} at ${esc(branchName(UI.pt.branchId))}: ${windows.map((wnd) => wnd.fromH + ':00–' + wnd.toH + ':00').join(', ') || 'no hours today'})</span></div>
        <div class="slot-row">${hours.map((h) => `<button class="slot${UI.pt.hour === h ? ' sel' : ''}" data-action="pt-hour" data-h="${h}">${fmtT(D.at(h, 0))}</button>`).join('') || '<span class="dim small">No availability at this branch.</span>'}</div>
        ${UI.pt.err ? `<div class="err-line">${esc(UI.pt.err)}</div>` : ''}
        <div class="btn-row">
          <button class="ghost-btn slim" data-action="pt-close" style="flex:1">Close</button>
          <button class="accent-btn slim" data-action="pt-confirm" style="flex:2;${UI.pt.hour == null ? 'opacity:.45' : ''}" ${UI.pt.hour == null ? 'disabled' : ''}>Confirm booking</button>
        </div>
      </div>`;
  }

  const trainerCards = allTrainers.map((t, i) => {
    const wa = (t.worksAt || [t.locationId]);
    const avail = (t.availability || []).map((a) => `${branchName(a.branchId)} ${a.fromH}:00–${a.toH}:00`).join(' · ');
    return `<div class="trainer">
        <div class="avatar sm tone-${(i % 3) + 1}">${esc(t.name[0])}</div>
        <div class="info">
          <div class="n">${esc(t.name)}${t.id === trainerId ? ' <span class="bonus">your coach</span>' : ''}</div>
          <div class="meta">${esc((t.specialties || []).join(' · '))}</div>
          <div class="meta" style="margin-top:3px">${wa.map((b) => branchChip(b)).join(' ')}</div>
          <div class="status off" style="font-weight:600">${esc(avail)}</div>
        </div>
        <button class="book-btn" data-action="pt-open" data-t="${t.id}">Book</button>
      </div>`;
  }).join('');

  document.getElementById('c-book').innerHTML = `
    <header class="app-header"><div class="greeting">Book</div><span></span></header>
    ${bookSegHtml('pt')}
    <div class="card" style="flex-direction:row;align-items:center;justify-content:space-between">
      <div class="dim small">PT credits remaining</div>
      <b>${credits}</b>
    </div>
    <button class="ghost-btn slim" data-action="goto-train-trainer">Manage packages in Train → My Trainer</button>
    ${panel}
    <div class="sect-label">Trainers</div>
    <div class="stack">${trainerCards}</div>`;
}

function renderBookNutrition() {
  const m = me(); if (!m) { show('login'); return; }
  if (!UI.book.nutBranch) UI.book.nutBranch = m.homeBranchId;
  const consult = D.load().consults.find((c) => c.memberId === m.id && c.status === 'scheduled');
  const branch = D.BranchService.byId ? D.BranchService.byId(UI.book.nutBranch) : D.BranchService.list().find((l) => l.id === UI.book.nutBranch);
  const openH = branch && branch.opens ? Number(branch.opens.split(':')[0]) : 9;
  const closeH = branch && branch.closes ? Number(branch.closes.split(':')[0]) : 21;
  const hourGrid = [9, 11, 13, 15, 17, 19].filter((h) => h >= openH && h < closeH);

  const picker = consult ? '' : `<div class="card">
      ${eyebrow('leaf', 'Book a consult · Rima D.')}
      <div class="dim small">Where?</div>
      <div class="slot-row">${D.BranchService.list().filter((l) => !l.unconfirmed).map((l) =>
        `<button class="slot${UI.book.nutBranch === l.id ? ' sel' : ''}" data-action="nut-branch" data-b="${l.id}">${esc(l.name)}</button>`).join('')}</div>
      <div class="dim small">When?</div>
      <div class="slot-row">${hourGrid.map((h) => `<button class="slot${UI.book.nutHour === h ? ' sel' : ''}" data-action="nut-hour" data-h="${h}">${fmtT(D.at(h, 0))}</button>`).join('') || '<span class="dim small">No slots today.</span>'}</div>
      <button class="accent-btn slim" data-action="consult-book" style="margin-top:10px;${UI.book.nutHour == null ? 'opacity:.45' : ''}" ${UI.book.nutHour == null ? 'disabled' : ''}>Confirm booking</button>
    </div>`;

  document.getElementById('c-book').innerHTML = `
    <header class="app-header"><div class="greeting">Book</div><span></span></header>
    ${bookSegHtml('nutrition')}
    <div class="card">
      <div class="li">
        <img class="svc-thumb" src="img/service-nutrition.svg" alt="" />
        <div class="li-body">
          <b>Nutrition consult · Rima D.</b>
          <div class="meta">${consult ? 'Booked — ' + fmtT(consult.startsAt) + ' · ' + esc(branchName(consult.branchId)) : 'Licensed dietitian — covers all branches by appointment'}</div>
        </div>
        ${consult ? `<span class="chip chip-ok">Booked</span>` : ''}
      </div>
    </div>
    ${picker}`;
}

/* ================= FUEL BAR & RETAIL ================= */

function renderClubFuel() {
  const m = me(); if (!m) { show('login'); return; }
  if (!UI.fuelBranch) {
    const v = insideVisit();
    UI.fuelBranch = v ? v.locationId : m.homeBranchId;
  }
  const myAllergies = D.HealthService.visibleTo(m.id, 'fuelbar').map((f) => f.label);
  const cats = ['Fuel Bar', 'Supplements', 'Merch', 'Accessories'];
  const items = D.RetailService.catalog();

  const chips = D.BranchService.list().map((l) =>
    `<button class="slot${UI.fuelBranch === l.id ? ' sel' : ''}" data-action="fuel-branch" data-b="${l.id}">${esc(l.name)}</button>`).join('');

  const warn = UI.fuelWarn ? `<div class="warn-banner">${icon('alert', 18)}
      <div><b>Heads-up: ${esc(UI.fuelWarn.item)} contains ${esc(UI.fuelWarn.allergen)}</b>
      That allergy is flagged on your health profile. Staff at the counter see the same warning.
      <button class="ghost-btn slim" data-action="fuel-warn-dismiss" style="margin-top:8px">Got it</button></div>
    </div>` : '';

  const sections = cats.map((cat) => {
    const grid = items.filter((i) => i.cat === cat).map((i) => {
      const stock = D.RetailService.stockAt(i.id, UI.fuelBranch);
      const hit = (i.allergens || []).find((a) => myAllergies.includes(a));
      return `<div class="mtile${stock <= 0 ? ' off' : ''}">
          <img class="art" src="${esc(i.img)}" alt="" style="width:100%;height:64px;object-fit:cover;border-radius:12px" />
          <div class="tn">${esc(i.name)}</div>
          <div class="tp">$${i.price}</div>
          <div class="tm">${stock > 0 ? stock + ' in stock' : 'Out of stock here'}</div>
          ${hit ? `<div class="tm" style="color:var(--red);font-weight:700">⚠ contains ${esc(hit)} — on your profile</div>` : ''}
          <button class="accent-btn slim" data-action="fuel-buy" data-i="${i.id}" ${stock <= 0 ? 'disabled style="opacity:.4"' : ''}>Buy</button>
        </div>`;
    }).join('');
    return grid ? `<div class="sect-label">${cat}</div><div class="menu-grid">${grid}</div>` : '';
  }).join('');

  document.getElementById('c-club').innerHTML = `
    <header class="app-header"><div class="greeting">Club</div><span></span></header>
    ${clubSegHtml('fuel')}
    ${warn}
    <div class="card" style="flex-direction:row;align-items:center;justify-content:space-between">
      <div>${eyebrow('wallet', 'Wallet')}<div class="big-number">$${(m.wallet || 0).toFixed(2)}</div></div>
      <div class="dim small" style="text-align:right">Wallet first,<br/>card as fallback</div>
    </div>
    <div class="dim small">Buying at:</div>
    <div class="slot-row">${chips}</div>
    ${sections}`;
}

/* ================= ACCOUNT ================= */

function renderAccount() {
  const m = me(); if (!m) { show('login'); return; }
  const plan = myPlan() || {};
  const payments = D.PaymentService.ledger().filter((p) => p.memberId === m.id).slice(0, 8);
  const monthStart = new Date(D.now()); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const guestsUsed = D.load().guestPasses.filter((g) => g.hostMemberId === m.id && Date.parse(g.createdAt) >= monthStart.getTime()).length;
  const pendingTransfer = D.ApprovalService.list('pending').find((a) => a.type === 'branch_transfer' && a.meta && a.meta.memberId === m.id);
  if (!UI.guestBranch) UI.guestBranch = m.homeBranchId;

  const payRows = payments.map((p) => `<div class="inv">
      <span>${esc(p.what)}<br/><span class="dim" style="font-size:12px">${new Date(p.at).toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${esc(p.method)} · ${esc(branchName(p.locationId))}</span></span>
      <b>$${p.amount}</b>
    </div>`).join('') || '<div class="dim small">No payments yet — your membership, PT packages, and Fuel Bar purchases will show up here.</div>';

  const freezeUI = m.status === 'frozen'
    ? `<button class="accent-btn slim" data-action="acct-unfreeze">Unfreeze membership</button>`
    : UI.freezeOpen
      ? `<div class="dim small">Why are you freezing?</div><div class="slot-row">
          ${['Travelling', 'Injury / recovery', 'Exams season'].map((r) => `<button class="slot" data-action="acct-freeze-reason" data-r="${esc(r)}">${r}</button>`).join('')}
          <button class="slot" data-action="acct-freeze-close">Never mind</button>
        </div>`
      : `<button class="ghost-btn slim" data-action="acct-freeze-open">Freeze membership</button>`;

  document.getElementById('c-account').innerHTML = `
    <header class="app-header"><div class="greeting">Account</div><span></span></header>

    <div class="card member-card">
      ${eyebrow('card', 'My plan')}
      <div class="row"><b style="font-size:16.5px">${esc(plan.name || '—')}</b><span class="chip ${m.status === 'active' ? 'chip-ok' : 'chip-warn'}">${esc(m.status)}</span></div>
      <div class="row small"><span class="dim">Branch access</span><b>${plan.branchAccess === 'all' ? 'All branches' : 'Home branch only (' + esc(branchName(m.homeBranchId)) + ')'}</b></div>
      ${plan.accessHours ? `<div class="row small"><span class="dim">Access hours</span><b>${plan.accessHours.from}:00–${plan.accessHours.to}:00</b></div>` : ''}
      <div class="row small"><span class="dim">Group classes</span><b>${plan.classesIncluded ? 'Included' : 'Not included'}</b></div>
      <div class="row small"><span class="dim">Freeze allowance</span><b>${plan.freezeDays || 0} days / term</b></div>
      <div class="row small"><span class="dim">Guest passes</span><b>${plan.guestsPerMonth || 0} / month (${guestsUsed} used)</b></div>
      <div class="row small"><span class="dim">Renews</span><b>${fmtDate(m.subEnds)}</b></div>
      <div class="row small"><span class="dim">Member since</span><b>${fmtDate(m.memberSince)}</b></div>
      <div class="row small"><span class="dim">Wallet</span><b>$${(m.wallet || 0).toFixed(2)}</b></div>
      <button class="ghost-btn slim" data-action="renew-open" style="margin-top:6px">Renew membership</button>
      ${freezeUI}
    </div>

    <div class="card">
      ${eyebrow('guest', 'Guest pass · $10')}
      <div class="dim small">Bring a friend — reception scans the pass at the door. Charged to your wallet.</div>
      <input class="input slim" id="guestName" placeholder="Guest’s name" autocomplete="off" />
      <div class="slot-row">${D.BranchService.list().filter((l) => !l.unconfirmed).map((l) =>
        `<button class="slot${UI.guestBranch === l.id ? ' sel' : ''}" data-action="guest-branch" data-b="${l.id}">${esc(l.name)}</button>`).join('')}</div>
      <button class="accent-btn slim" data-action="guest-create">Buy guest pass</button>
      ${D.load().guestPasses.filter((g) => g.hostMemberId === m.id && g.status === 'expected').map((g) =>
        `<div class="done-line">${icon('check', 15)} ${esc(g.guestName)} — expected at ${esc(branchName(g.branchId))}</div>`).join('')}
    </div>

    <div class="card">
      ${eyebrow('pin', 'Home branch')}
      <div class="row small"><span class="dim">Current</span><b>${esc(branchName(m.homeBranchId))}</b></div>
      ${pendingTransfer
        ? `<div class="dim small" style="color:var(--amber);font-weight:700">Transfer request pending — waiting for owner approval.</div>`
        : `<div class="dim small">Moving house or office? Request a transfer — it goes to the owner for approval.</div>
          <div class="slot-row">${D.BranchService.list().filter((l) => l.id !== m.homeBranchId && !l.unconfirmed).map((l) =>
            `<button class="slot${UI.transferTo === l.id ? ' sel' : ''}" data-action="transfer-to" data-b="${l.id}">${esc(l.name)}</button>`).join('')}</div>
          <button class="ghost-btn slim" data-action="transfer-request">Request transfer</button>`}
    </div>

    <div class="card">
      ${eyebrow('receipt', 'Payments')}
      ${payRows}
    </div>

    <div class="card">
      ${eyebrow('shield', 'Privacy')}
      <div class="btn-row">
        <button class="ghost-btn slim" data-action="privacy-export" style="flex:1">Export my data</button>
        <button class="ghost-btn slim" data-action="privacy-delete" style="flex:1">Delete account</button>
      </div>
      <div class="dim" style="font-size:12px">GDPR-style stubs — the real platform serves these from the backend with identity checks.</div>
    </div>

    <button class="ghost-btn" data-action="logout">Log out</button>`;
}

/* ================= NOTIFICATIONS ================= */

function renderNotifs() {
  const m = me(); if (!m) { show('login'); return; }
  const list = D.NotificationService.forMember(m.id);
  document.getElementById('c-notifs').innerHTML = `
    ${list.length ? `<button class="ghost-btn slim" data-action="notif-readall">Mark all read</button>` : ''}
    ${list.map((n) => `<div class="notif${n.read ? '' : ' unread'}">
        <div class="nt">${esc(n.title)}</div>
        <div class="nb">${esc(n.body)}</div>
        <div class="nd">${new Date(n.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
        ${n.cta ? `<button class="ghost-btn slim" data-action="notif-cta" data-view="${esc(n.cta.view)}"${n.cta.seg ? ` data-seg="${esc(n.cta.seg)}"` : ''} style="margin-top:8px">${esc(n.cta.label)}</button>` : ''}
      </div>`).join('') || '<div class="card dim small">Nothing yet — booking confirmations and gym alerts land here.</div>'}`;
}

/* ================= ENTRY PASS + QR ================= */

const QR_SECONDS = 25;
let qrTimer = null, qrCountdown = null, secsLeft = QR_SECONDS;

function drawQR() {
  const c = document.getElementById('qrCanvas');
  const ctx = c.getContext('2d');
  const N = 29, cell = c.width / N;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#000';
  let seed = Date.now() % 100000;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const inFinder = (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
    if (!inFinder && rnd() > 0.52) ctx.fillRect(x * cell, y * cell, cell, cell);
  }
  const finder = (fx, fy) => {
    ctx.fillRect(fx * cell, fy * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = '#fff'; ctx.fillRect((fx + 1) * cell, (fy + 1) * cell, 5 * cell, 5 * cell);
    ctx.fillStyle = '#000'; ctx.fillRect((fx + 2) * cell, (fy + 2) * cell, 3 * cell, 3 * cell);
  };
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  /* token string carries the member id + qrVersion — a reset pass invalidates
     screenshots exactly like the backend would */
  const m = me();
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  document.getElementById('qrToken').textContent = m ? `LU·${m.id.toUpperCase()}·V${m.qrVersion}·${token}` : '—';
}
function rotateQR() { drawQR(); secsLeft = QR_SECONDS; }

function renderGatePicker() {
  const m = me(); if (!m) return;
  const visit = insideVisit();
  const picker = document.getElementById('gatePicker');
  const label = document.getElementById('gateLabel');
  if (visit) { picker.innerHTML = ''; picker.hidden = true; label.hidden = true; return; }
  picker.hidden = false; label.hidden = false;
  if (!UI.gate) UI.gate = m.homeBranchId;
  picker.innerHTML = D.BranchService.list().map((l) => l.unconfirmed
    ? `<button class="slot" disabled>${esc(l.name)} · TBC</button>`
    : `<button class="slot${UI.gate === l.id ? ' sel' : ''}" data-action="gate-pick" data-b="${l.id}">${esc(l.name)}</button>`).join('');
}

function openPass() {
  const m = me(); if (!m) { show('login'); return; }
  const visit = insideVisit();
  document.getElementById('passName').textContent = m.name;
  document.getElementById('passAvatar').textContent = m.name[0];
  document.getElementById('passOk').hidden = false;
  document.getElementById('passDenied').hidden = true;
  const face = document.getElementById('faceid');
  face.classList.remove('hidden');
  setTimeout(() => face.classList.add('hidden'), 1100);

  const purpose = document.getElementById('passPurpose');
  purpose.textContent = visit ? 'Scan to EXIT · ' + branchName(visit.locationId) : 'Scan to ENTER';
  purpose.classList.toggle('exit', !!visit);
  document.getElementById('gateBtn').textContent = visit ? 'Simulate exit scan' : 'Simulate gate scan';
  renderGatePicker();

  stopPass();
  rotateQR();
  qrTimer = setInterval(rotateQR, QR_SECONDS * 1000);
  qrCountdown = setInterval(() => {
    secsLeft = Math.max(0, secsLeft - 1);
    document.getElementById('qrSecs').textContent = `refreshes in ${secsLeft}s`;
    document.getElementById('qrBar').style.width = (secsLeft / QR_SECONDS) * 100 + '%';
  }, 1000);
}
function stopPass() {
  if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
  if (qrCountdown) { clearInterval(qrCountdown); qrCountdown = null; }
}
document.getElementById('closePass').onclick = () => show('home');
document.getElementById('closePassDenied').onclick = () => show('home');

function showDenied(reason) {
  const m = me();
  document.getElementById('passOk').hidden = true;
  const denied = document.getElementById('passDenied');
  denied.hidden = false;
  document.getElementById('deniedReason').textContent = denialText(reason);
  const cta = document.getElementById('deniedCta');
  const setCta = (label, onclick) => { cta.textContent = label; cta.onclick = onclick; };
  switch (reason) {
    case 'frozen': setCta('Unfreeze in Account', () => show('account')); break;
    case 'expired': setCta('Renew now', () => openRenewModal()); break;
    case 'suspended':
    case 'access_restricted': {
      const b = m ? branch(m.homeBranchId) : null;
      setCta(b ? `Call ${b.name}` : 'Call reception', () => toast(b ? 'Calling ' + b.phone + '…' : 'See reception'));
      break;
    }
    case 'branch_not_allowed': setCta('See my plan', () => show('account')); break;
    case 'outside_allowed_hours': setCta('View my plan', () => show('account')); break;
    case 'duplicate_visit': setCta('Check out now', () => openPass()); break;
    case 'at_capacity': setCta('Check other branches', () => { UI.club.seg = 'branches'; show('club'); }); break;
    case 'branch_closed': setCta('See other branches', () => { UI.club.seg = 'branches'; show('club'); }); break;
    case 'unknown_branch': setCta('Pick a gate', () => { denied.hidden = true; document.getElementById('passOk').hidden = false; renderGatePicker(); }); break;
    default: setCta('OK', () => show('home'));
  }
}

document.getElementById('gateBtn').onclick = () => {
  const m = me(); if (!m) return;
  const result = document.getElementById('gateResult');
  const visit = insideVisit();

  if (visit) {
    const res = D.AccessService.checkOut(m.id);
    if (!res.ok) { toast('No open visit found'); return; }
    const mins = Math.max(1, Math.floor((D.now() - Date.parse(res.visit.enteredAt)) / 60000));
    result.hidden = false;
    result.innerHTML = `<div class="big">👋</div><div>Gate opened — see you soon!</div>
      <div class="sub">Checked out of ${esc(branchName(res.visit.locationId))} · ${fmtDur(mins)}</div>`;
    pushNotif('Visit recorded', `${branchName(res.visit.locationId)} · ${fmtDur(mins)}. See you next time.`);
    setTimeout(() => { result.hidden = true; show('home'); toast('Checked out · ' + fmtDur(mins)); }, 1500);
    return;
  }

  const res = D.AccessService.checkIn(m.id, null, UI.gate);
  if (!res.ok) { showDenied(res.reason); return; }
  const branchId = res.visit.locationId;
  const todaysWorkout = D.WorkoutService.todaysAssigned(m.id);
  const fuelItems = D.RetailService.catalog()
    .map((i) => ({ i, stock: D.RetailService.stockAt(i.id, branchId) }))
    .filter((x) => x.stock > 0)
    .slice(0, 2);
  result.hidden = false;
  result.innerHTML = `<div class="big">✅</div><div>Welcome to ${esc(branchName(branchId))}!</div>
    <div class="sub">Checked in · ${fmtT(Date.parse(res.visit.enteredAt))} · gate opened</div>
    ${todaysWorkout ? `<div class="gr-extra">${esc(todaysWorkout.dayName)}<div class="meta">Today’s workout · ${todaysWorkout.exercises.length} exercises</div></div>` : ''}
    ${fuelItems.length ? `<div class="gr-extra">Fuel Bar<div class="meta">${fuelItems.map((x) => esc(x.i.name)).join(' · ')} in stock</div></div>` : ''}
    <button class="accent-btn" id="gateResultContinue">Continue</button>`;
  document.getElementById('gateResultContinue').onclick = () => { result.hidden = true; show('home'); toast('Checked in · ' + branchName(branchId)); };
};

/* ================= renew membership ================= */

function openRenewModal() {
  const m = me(); if (!m) return;
  const plan = myPlan();
  if (!plan) { toast('No plan on file — see reception'); return; }
  openModal(`
    <h3>Renew membership</h3>
    <div class="dim small">${esc(plan.name)} · $${plan.price}${plan.months ? ' / ' + plan.months + ' mo' : ''}</div>
    <div class="dim small">Extends from ${m.status === 'expired' || new Date(m.subEnds + 'T23:59:59').getTime() < D.now() ? 'today' : fmtDate(m.subEnds)}.</div>
    <div class="slot-row" style="margin-top:10px">
      <button class="slot${UI.renewMethod === 'wallet' ? ' sel' : ''}" data-action="renew-method" data-m="wallet">Pay from wallet ($${(m.wallet || 0).toFixed(0)})</button>
      <button class="slot${UI.renewMethod === 'card' ? ' sel' : ''}" data-action="renew-method" data-m="card">Card</button>
    </div>
    <button class="accent-btn" data-action="renew-confirm" style="margin-top:12px">Renew · $${plan.price}</button>
    <button class="ghost-btn" data-action="modal-close">Cancel</button>`);
}

/* ================= SOS + equipment report ================= */

function openSOS() {
  const m = me(); if (!m) return;
  const v = insideVisit();
  const b = v ? v.locationId : m.homeBranchId;
  openModal(`
    <h3>Emergency assistance</h3>
    <div class="dim small">Alerts staff at ${esc(branchName(b))} immediately — with your name and location.</div>
    ${['Injury — needs first aid', 'Feeling unwell / dizzy', 'Security concern'].map((t) =>
      `<button class="support-opt sos-type" data-action="sos-send" data-t="${esc(t)}" data-b="${b}">${t}</button>`).join('')}
    <button class="ghost-btn" data-action="modal-close">Cancel</button>`);
}

function openReport() {
  const m = me(); if (!m) return;
  const v = insideVisit();
  const b = v ? v.locationId : m.homeBranchId;
  const assets = D.MaintenanceService.assets(b).filter((a) => !['Plant', 'Access'].includes(a.category));
  openModal(`
    <h3>Report equipment</h3>
    <div class="dim small">${esc(branchName(b))} — which machine?</div>
    ${assets.map((a) => `<button class="support-opt" data-action="report-asset" data-a="${a.id}">${esc(a.name)} <span class="dim">· ${esc(a.zone)}</span></button>`).join('')}
    <button class="ghost-btn" data-action="modal-close">Cancel</button>`);
}
function openReportIssue(assetId) {
  const a = D.MaintenanceService.assetById(assetId);
  openModal(`
    <h3>${esc(a ? a.name : 'Machine')}</h3>
    <div class="dim small">What’s wrong?</div>
    ${['Not working', 'Unusual noise', 'Damaged / frayed', 'Safety concern'].map((t) =>
      `<button class="support-opt" data-action="report-issue" data-a="${assetId}" data-t="${esc(t)}">${t}</button>`).join('')}
    <button class="ghost-btn" data-action="modal-close">Cancel</button>`);
}

/* ================= delegated actions ================= */

document.getElementById('screen').addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const m = me();

  /* navigation */
  if (a === 'open-pass') { show('pass'); return; }
  if (a === 'inbox') { show('notifications'); return; }
  if (a === 'notif-cta') {
    const view = el.dataset.view, seg = el.dataset.seg;
    if (seg) {
      if (view === 'book') UI.book.seg = seg;
      else if (view === 'club') UI.club.seg = seg;
      else if (view === 'train') UI.train.seg = seg;
    }
    show(view);
    return;
  }
  if (a === 'goto-account') { show('account'); return; }
  if (a === 'goto-train') { show('train'); return; }
  if (a === 'goto-club') { UI.club.seg = 'branches'; show('club'); return; }
  if (a === 'goto-book') { if (el.dataset.branch) UI.clsBranch = el.dataset.branch; UI.book.seg = 'classes'; show('book'); return; }
  if (a === 'book-seg') { UI.book.seg = el.dataset.seg; renderBook(); return; }
  if (a === 'club-seg') { UI.club.seg = el.dataset.seg; renderClub(); return; }
  if (a === 'modal-close') { closeModal(); return; }
  if (a === 'logout') { setSession(null); UI.pt = null; show('login'); return; }

  /* branches */
  if (a === 'call-branch') { toast('Calling ' + el.dataset.phone + '…'); return; }
  if (a === 'directions') { toast('Opening maps — ' + el.dataset.addr); return; }

  /* gate picker */
  if (a === 'gate-pick') { UI.gate = el.dataset.b; renderGatePicker(); return; }

  /* SOS */
  if (a === 'sos-open') { openSOS(); return; }
  if (a === 'sos-send') {
    D.IncidentService.raiseSOS({ memberId: m.id, type: el.dataset.t, zone: 'Gym floor', branchId: el.dataset.b });
    closeModal();
    pushNotif('SOS sent', 'Staff at ' + branchName(el.dataset.b) + ' have been alerted. Stay where you are.');
    toast('Staff alerted — help is on the way');
    return;
  }

  /* equipment report */
  if (a === 'report-open') { openReport(); return; }
  if (a === 'report-asset') { openReportIssue(el.dataset.a); return; }
  if (a === 'report-issue') {
    const severity = el.dataset.t === 'Safety concern' ? 'safety' : 'normal';
    D.MaintenanceService.createWorkOrder({ assetId: el.dataset.a, problem: el.dataset.t + ' (member report)', severity, reporterId: m.id });
    closeModal();
    pushNotif('Report received', 'Maintenance has been notified. You’ll see the machine flagged until it’s fixed.');
    toast('Reported — maintenance notified');
    return;
  }

  /* PT booking (discovery — lives in Book → Personal Training) */
  if (a === 'pt-open') {
    const t = D.TrainerService.byId(el.dataset.t);
    UI.pt = { trainerId: t.id, branchId: (t.worksAt || [t.locationId])[0], hour: null, err: null };
    renderBook();
    return;
  }
  if (a === 'pt-branch') { UI.pt.branchId = el.dataset.b; UI.pt.hour = null; UI.pt.err = null; renderBook(); return; }
  if (a === 'pt-hour') { UI.pt.hour = Number(el.dataset.h); UI.pt.err = null; renderBook(); return; }
  if (a === 'pt-close') { UI.pt = null; renderBook(); return; }
  if (a === 'pt-confirm') {
    if (!UI.pt || UI.pt.hour == null) return;
    const t = D.TrainerService.byId(UI.pt.trainerId);
    const res = D.TrainerService.book({ memberId: m.id, trainerId: UI.pt.trainerId, branchId: UI.pt.branchId, startsAt: D.at(UI.pt.hour, 0), actorId: m.id });
    if (res.error) { UI.pt.err = ptErrorText(res, t, UI.pt.branchId, UI.pt.hour); renderBook(); return; }
    pushNotif('PT booked', `${t.name} · ${branchName(res.branchId)} · ${fmtT(res.startsAt)}. Your trainer sees it instantly.`, { label: 'View in Train', view: 'train', seg: 'trainer' });
    UI.pt = null; renderBook();
    toast('Session booked with ' + t.name);
    return;
  }
  if (a === 'pt-cancel') { UI.ptCancel = el.dataset.s; UI.ptRes = null; renderTrain(); return; }
  if (a === 'pt-abort') { UI.ptCancel = null; UI.ptRes = null; renderTrain(); return; }
  if (a === 'pt-cancel-reason') {
    const res = D.TrainerService.cancel(el.dataset.s, m.id, el.dataset.r);
    UI.ptCancel = null;
    if (res.error) toast('Could not cancel: ' + res.error);
    else { toast('Session cancelled'); pushNotif('PT session cancelled', 'Reason: ' + el.dataset.r + '. No credit deducted.'); }
    renderTrain();
    return;
  }
  if (a === 'pt-res') { UI.ptRes = el.dataset.s; UI.ptCancel = null; renderTrain(); return; }
  if (a === 'pt-res-hour') {
    const res = D.TrainerService.reschedule(el.dataset.s, D.at(Number(el.dataset.h), 0), m.id, 'Member rescheduled from app');
    UI.ptRes = null;
    if (res.error) {
      const s = D.load().ptSessions.find((x) => x.id === el.dataset.s);
      const t = s ? D.TrainerService.byId(s.trainerId) : null;
      toast(t ? ptErrorText(res, t, s.branchId, Number(el.dataset.h)) : 'Could not reschedule: ' + res.error);
    } else toast('Rescheduled to ' + fmtT(res.startsAt));
    renderTrain();
    return;
  }
  if (a === 'pt-confirm-session') {
    const res = D.TrainerService.confirmSession(el.dataset.s, m.id);
    if (res.error) toast('Could not confirm: ' + res.error);
    else toast('Session confirmed — thanks!');
    renderTrain();
    return;
  }

  /* PT packages */
  if (a === 'pkg-method') { UI.pkgMethod = el.dataset.m; renderTrain(); return; }
  if (a === 'pkg-buy') {
    const total = Number(el.dataset.total), price = Number(el.dataset.price);
    if (UI.pkgMethod === 'wallet' && !debitWallet(price)) { toast('Wallet balance too low — pay by card instead'); return; }
    const trainerId = (UI.pt && UI.pt.trainerId) || m.trainerId || (D.TrainerService.list()[0] || {}).id;
    D.PackageService.sell({ memberId: m.id, trainerId, total, price, staffId: m.id, branchId: m.homeBranchId, method: UI.pkgMethod });
    pushNotif('PT package added', `${total} sessions with ${staffName(trainerId)} — $${price} (${UI.pkgMethod}).`);
    toast(`${total}-session package added`);
    renderTrain();
    return;
  }

  /* nutrition */
  if (a === 'nut-branch') { UI.book.nutBranch = el.dataset.b; UI.book.nutHour = null; renderBook(); return; }
  if (a === 'nut-hour') { UI.book.nutHour = Number(el.dataset.h); renderBook(); return; }
  if (a === 'consult-book') {
    if (UI.book.nutHour == null) return;
    const branchId = UI.book.nutBranch || m.homeBranchId;
    const startsAt = D.at(UI.book.nutHour, 0);
    D.NutritionService.book({ memberId: m.id, staffId: 'stf_nu_rima', branchId, startsAt, kind: 'consultation' });
    pushNotif('Nutrition consult booked', 'Rima D. · ' + fmtT(startsAt) + ' · ' + branchName(branchId));
    toast('Consult booked with Rima D.');
    UI.book.nutHour = null;
    renderBook();
    return;
  }

  /* Book → Train handoff */
  if (a === 'goto-train-trainer') { UI.train.seg = 'trainer'; show('train'); return; }

  /* renew membership */
  if (a === 'renew-open') { openRenewModal(); return; }
  if (a === 'renew-method') { UI.renewMethod = el.dataset.m; openRenewModal(); return; }
  if (a === 'renew-confirm') {
    const plan = myPlan(); if (!plan) return;
    if (UI.renewMethod === 'wallet' && !debitWallet(plan.price)) { toast('Wallet balance too low — pay by card instead'); return; }
    const res = D.MemberService.renew(m.id, m.id, UI.renewMethod);
    closeModal();
    pushNotif('Membership renewed', `${plan.name} — renewed through ${fmtDate(res.subEnds)}.`);
    toast('Renewed through ' + fmtDate(res.subEnds));
    rerender();
    return;
  }

  /* TRAIN — sub-nav */
  if (a === 'train-seg') { UI.train.seg = el.dataset.seg; UI.train.historyDetail = null; renderTrain(); return; }
  if (a === 'hist-seg') { UI.train.histSeg = el.dataset.seg; UI.train.historyDetail = null; renderTrain(); return; }
  if (a === 'hist-open') { UI.train.historyDetail = el.dataset.s; renderTrain(); return; }
  if (a === 'hist-back') { UI.train.historyDetail = null; renderTrain(); return; }
  if (a === 'ex-pick') { UI.train.exercisePick = el.dataset.e; renderTrain(); return; }
  if (a === 'prog-versions') { UI.train.showVersions = !UI.train.showVersions; renderTrain(); return; }

  /* TRAIN — starting a workout (today's assigned / program day / quick / repeat) */
  if (a === 'today-start') { UI.train.pending = { type: 'assigned', sessionId: el.dataset.s }; openReadinessModal(); return; }
  if (a === 'today-resume') { enterLogger(el.dataset.s); return; }
  if (a === 'workout-start-day') {
    const program = D.ProgramService.current(m.id);
    const version = program ? D.ProgramService.currentVersion(program) : null;
    const day = version ? (version.days || []).find((d) => d.name === el.dataset.day) : null;
    if (!day) return;
    UI.train.pending = { type: 'adhoc', payload: { branchId: m.homeBranchId, dayExercises: day.exercises, programId: program.id, dayName: day.name, trainerId: program.trainerId } };
    openReadinessModal();
    return;
  }
  if (a === 'qw-toggle') {
    const id = el.dataset.e;
    const idx = UI.train.qw.picked.indexOf(id);
    if (idx === -1) { if (UI.train.qw.picked.length >= 6) { toast('Max 6 exercises'); return; } UI.train.qw.picked.push(id); }
    else UI.train.qw.picked.splice(idx, 1);
    renderTrain();
    return;
  }
  if (a === 'qw-start') {
    if (UI.train.qw.picked.length < 3) { toast('Pick at least 3 exercises'); return; }
    const dayExercises = UI.train.qw.picked.map((id) => ({ exerciseId: id, targetSets: 3, targetReps: 10 }));
    UI.train.pending = { type: 'adhoc', payload: { branchId: m.homeBranchId, dayExercises, dayName: 'Quick Workout' } };
    UI.train.qw.picked = [];
    openReadinessModal();
    return;
  }
  if (a === 'workout-repeat') {
    const src = D.WorkoutService.byId(el.dataset.s);
    const dayExercises = src.exercises.map((e) => ({ exerciseId: e.exerciseId, targetSets: e.targetSets, targetReps: e.targetReps }));
    UI.train.pending = { type: 'adhoc', payload: { branchId: src.branchId, dayExercises, dayName: 'Repeat · ' + src.dayName, programId: src.programId || null, trainerId: src.trainerId || null } };
    openReadinessModal();
    return;
  }

  /* TRAIN — readiness check */
  if (a === 'rc-energy') { document.querySelectorAll('[data-action="rc-energy"]').forEach((b) => b.classList.remove('sel')); el.classList.add('sel'); return; }
  if (a === 'rc-soreness') { el.classList.toggle('sel'); return; }
  if (a === 'rc-go') {
    const energySel = document.querySelector('[data-action="rc-energy"].sel');
    const energy = energySel ? energySel.dataset.v : 'normal';
    const soreness = Array.from(document.querySelectorAll('[data-action="rc-soreness"].sel')).map((b) => b.dataset.v);
    const painEl = document.getElementById('rcPain');
    const pain = painEl && painEl.value.trim() ? painEl.value.trim() : null;
    const readiness = { energy, soreness, pain };
    const pending = UI.train.pending;
    closeModal();
    if (!pending) return;
    let sessionId = null;
    if (pending.type === 'assigned') { D.WorkoutService.start(pending.sessionId, readiness); sessionId = pending.sessionId; }
    else if (pending.type === 'adhoc') { const nw = D.WorkoutService.startAdHoc(Object.assign({}, pending.payload, { memberId: m.id, readiness })); sessionId = nw.id; }
    UI.train.pending = null;
    if (sessionId) enterLogger(sessionId);
    return;
  }

  /* TRAIN — Live Workout Logger */
  if (a === 'logger-back') { stopRest(); UI.train.loggerSessionId = null; UI.train.seg = 'today'; renderTrain(); return; }
  if (a === 'copy-last') {
    const ei = Number(el.dataset.ei);
    const w = D.WorkoutService.byId(UI.train.loggerSessionId);
    const ex = w.exercises[ei];
    const last = D.ExerciseService.lastPerformance(w.memberId, ex.exerciseId);
    if (!last || !last.sets.length) { toast('No previous data for this exercise'); return; }
    const target = last.sets[last.sets.length - 1];
    const openIdx = ex.sets.findIndex((s) => s.status !== 'completed');
    const si = openIdx === -1 ? ex.sets.length - 1 : openIdx;
    const row = document.querySelector(`.set-row[data-ei="${ei}"][data-si="${si}"]`);
    if (row) { row.querySelector('.set-wt').value = target.actualWeight; row.querySelector('.set-reps').value = target.actualReps; }
    toast('Copied — tap Log to save');
    return;
  }
  if (a === 'wt-adj') {
    const row = el.closest('.set-row');
    const inp = row.querySelector('.set-wt');
    const cur = parseFloat(inp.value) || 0;
    const d = parseFloat(el.dataset.d);
    inp.value = Math.max(0, Math.round((cur + d) * 10) / 10);
    return;
  }
  if (a === 'set-log') {
    const ei = Number(el.dataset.ei), si = Number(el.dataset.si);
    const row = el.closest('.set-row');
    const type = row.querySelector('.set-type').value;
    const wtV = row.querySelector('.set-wt').value;
    const repsV = row.querySelector('.set-reps').value;
    const rpeV = row.querySelector('.set-rpe').value;
    if (!wtV || !repsV) { toast('Enter weight and reps first'); return; }
    D.WorkoutService.logSet(UI.train.loggerSessionId, ei, si, { type, actualWeight: parseFloat(wtV), actualReps: parseInt(repsV, 10), rpe: rpeV ? Number(rpeV) : null });
    startRest(90);
    renderLogger();
    return;
  }
  if (a === 'set-add') { D.WorkoutService.addSet(UI.train.loggerSessionId, Number(el.dataset.ei), { type: 'normal', status: 'upcoming' }); renderLogger(); return; }
  if (a === 'set-remove') {
    const ei = Number(el.dataset.ei);
    const w = D.WorkoutService.byId(UI.train.loggerSessionId);
    const ex = w.exercises[ei];
    if (ex.sets.length <= 1) return;
    D.WorkoutService.removeSet(UI.train.loggerSessionId, ei, ex.sets.length - 1);
    renderLogger();
    return;
  }
  if (a === 'rest-start') { startRest(90); return; }
  if (a === 'rest-skip') { stopRest(); return; }
  if (a === 'logger-finish') {
    openModal(`<h3>Finish workout</h3>
      <div class="dim small">Add a note for yourself (optional).</div>
      <textarea class="input" id="finishNotes" rows="3" placeholder="How did it feel?" style="resize:vertical"></textarea>
      <button class="accent-btn" data-action="logger-finish-confirm">Finish &amp; save</button>
      <button class="ghost-btn" data-action="modal-close">Keep going</button>`);
    return;
  }
  if (a === 'logger-finish-confirm') {
    const notesEl = document.getElementById('finishNotes');
    const notes = notesEl ? notesEl.value.trim() : '';
    const sessionId = UI.train.loggerSessionId;
    const w = D.WorkoutService.finish(sessionId, { notes });
    closeModal();
    stopRest();
    UI.train.loggerSessionId = null;
    UI.train.seg = 'today';
    showFinishCelebration(w);
    return;
  }
  if (a === 'fc-done') {
    const fcEl = document.querySelector('.finish-cele');
    if (fcEl) fcEl.remove();
    renderTrain();
    return;
  }

  /* TRAIN — Progress: add a body log entry */
  if (a === 'bl-save') {
    const wtEl = document.getElementById('blWeight');
    const waistEl = document.getElementById('blWaist');
    const chestEl = document.getElementById('blChest');
    const weightKg = wtEl && wtEl.value ? parseFloat(wtEl.value) : null;
    if (!weightKg) { toast('Enter a weight first'); return; }
    const measurements = {};
    if (waistEl && waistEl.value) measurements.waist = parseFloat(waistEl.value);
    if (chestEl && chestEl.value) measurements.chest = parseFloat(chestEl.value);
    D.BodyLogService.record({ memberId: m.id, weightKg, measurements, recordedBy: m.id, recordedByRole: 'member' });
    toast('Body log saved');
    renderTrain();
    return;
  }

  /* classes */
  if (a === 'cls-branch') { UI.clsBranch = el.dataset.b; UI.clsErr = null; renderBookClasses(); return; }
  if (a === 'cls-book') {
    const c = D.BookingService.classById(el.dataset.c);
    const res = D.BookingService.bookClass(m.id, el.dataset.c);
    UI.clsErr = null;
    if (res.error) UI.clsErr = { id: el.dataset.c, msg: classBookErrorText(res.error, c) };
    else if (res.waitlisted) { toast(`Class full — you’re #${res.position} on the waitlist`); pushNotif('Waitlisted', `${c.name} (${branchName(c.locationId)}) — position ${res.position}. We’ll bump you in automatically.`, { label: 'View my classes', view: 'book', seg: 'classes' }); }
    else { toast('Booked · ' + c.name + ' at ' + branchName(c.locationId)); pushNotif('Class booked', `${c.name} · ${branchName(c.locationId)} · ${fmtT(c.startsAt)}`, { label: 'View my classes', view: 'book', seg: 'classes' }); }
    renderBookClasses();
    return;
  }
  if (a === 'cls-cancel') {
    const c = D.BookingService.classById(el.dataset.c);
    const res = D.BookingService.cancelBooking(m.id, el.dataset.c, false, m.id);
    if (res.error === 'past_cancel_deadline') {
      UI.clsErr = { id: el.dataset.c, msg: `Past the cancellation window (closed ${fmtT(c.startsAt - (c.cancelDeadlineMins || 0) * 60000)}). Reception can override with a reason.` };
    } else if (res.error) UI.clsErr = { id: el.dataset.c, msg: 'Could not cancel: ' + res.error };
    else { UI.clsErr = null; toast('Booking cancelled — spot released'); }
    renderBookClasses();
    return;
  }

  /* fuel bar */
  if (a === 'fuel-branch') { UI.fuelBranch = el.dataset.b; renderClubFuel(); return; }
  if (a === 'fuel-warn-dismiss') { UI.fuelWarn = null; renderClubFuel(); return; }
  if (a === 'fuel-buy') {
    const item = D.RetailService.byId(el.dataset.i);
    const method = (m.wallet || 0) >= item.price ? 'wallet' : 'card';
    if (method === 'wallet' && !debitWallet(item.price)) { toast('Wallet balance too low'); return; }
    const res = D.RetailService.sell({ itemId: item.id, branchId: UI.fuelBranch, memberId: m.id, staffId: m.id, method });
    if (res.error) { toast(res.error === 'out_of_stock' ? 'Out of stock at this branch' : 'Could not buy: ' + res.error); renderClubFuel(); return; }
    if (res.allergenWarning) UI.fuelWarn = { item: item.name, allergen: res.allergenWarning };
    toast(`Bought ${item.name} · $${item.price} (${method})`);
    renderClubFuel();
    return;
  }

  /* account */
  if (a === 'acct-freeze-open') { UI.freezeOpen = true; renderAccount(); return; }
  if (a === 'acct-freeze-close') { UI.freezeOpen = false; renderAccount(); return; }
  if (a === 'acct-freeze-reason') {
    const res = D.MemberService.freeze(m.id, m.id, el.dataset.r);
    UI.freezeOpen = false;
    if (res.error) toast('Could not freeze: ' + res.error);
    else { toast('Membership frozen — your renewal date shifts accordingly'); pushNotif('Membership frozen', 'Reason: ' + el.dataset.r + '. Unfreeze any time from Account.', { label: 'Unfreeze', view: 'account' }); }
    renderAccount();
    return;
  }
  if (a === 'acct-unfreeze') {
    const res = D.MemberService.unfreeze(m.id, m.id, 'Member unfroze from app');
    if (res.error) toast('Could not unfreeze: ' + res.error);
    else toast('Welcome back — membership active');
    renderAccount();
    return;
  }
  if (a === 'guest-branch') { UI.guestBranch = el.dataset.b; const v = document.getElementById('guestName') ? document.getElementById('guestName').value : ''; renderAccount(); const g = document.getElementById('guestName'); if (g) g.value = v; return; }
  if (a === 'guest-create') {
    const nameEl = document.getElementById('guestName');
    const guestName = (nameEl && nameEl.value || '').trim();
    if (!guestName) { toast('Enter your guest’s name first'); return; }
    if (!debitWallet(10)) { toast('Wallet balance too low for the $10 pass'); return; }
    D.GuestService.create({ hostMemberId: m.id, guestName, branchId: UI.guestBranch });
    pushNotif('Guest pass ready', `${guestName} is expected at ${branchName(UI.guestBranch)} — reception has the pass.`, { label: 'View pass', view: 'account' });
    toast('Guest pass created · $10 wallet');
    renderAccount();
    return;
  }
  if (a === 'transfer-to') { UI.transferTo = el.dataset.b; renderAccount(); return; }
  if (a === 'transfer-request') {
    if (!UI.transferTo) { toast('Pick a branch first'); return; }
    const res = D.MemberService.requestBranchTransfer(m.id, UI.transferTo, m.id, 'Member requested from app');
    if (res.error) toast('Could not request: ' + res.error);
    else { toast('Request sent to the owner for approval'); pushNotif('Transfer requested', `Home branch change to ${branchName(UI.transferTo)} — the owner approves these; we’ll notify you.`); }
    UI.transferTo = null;
    renderAccount();
    return;
  }
  if (a === 'privacy-export') { toast('Data export queued — arrives by email within 24 h'); return; }
  if (a === 'privacy-delete') { toast('Deletion request logged — reception will confirm identity'); return; }

  /* notifications */
  if (a === 'notif-readall') {
    D.NotificationService.forMember(m.id).forEach((n) => { n.read = true; });
    D.persist(); renderNotifs();
    return;
  }

  /* onboarding */
  if (a === 'ob-plan') { UI.ob.planId = el.dataset.p; UI.ob.step = 1; renderOnboard(); return; }
  if (a === 'ob-branch') { UI.ob.branchId = el.dataset.b; UI.ob.step = 2; renderOnboard(); return; }
  if (a === 'ob-back') { UI.ob.step = Math.max(0, UI.ob.step - 1); renderOnboard(); return; }
  if (a === 'ob-login') { show('login'); return; }
  if (a === 'ob-finish') {
    const name = (document.getElementById('obName') ? document.getElementById('obName').value : '').trim();
    const phone = (document.getElementById('obPhone') ? document.getElementById('obPhone').value : '').trim();
    if (name.length < 3) { toast('Enter your full name'); return; }
    const nm = D.MemberService.sell({ name, phone, planId: UI.ob.planId, homeBranchId: UI.ob.branchId, staffId: 'stf_rc_lara', method: 'card' });
    if (nm.error) { toast('Could not join: ' + nm.error); return; }
    setSession(nm.id);
    pushNotif('Welcome to Level Up!', `${(D.PlanService.byId(UI.ob.planId) || {}).name} · home branch ${branchName(UI.ob.branchId)}. Your QR pass is ready.`, { label: 'Open my pass', view: 'pass' });
    UI.ob = { step: 0, planId: null, branchId: null };
    show('home');
    toast('Welcome to Level Up, ' + name.split(' ')[0] + '!');
    return;
  }
});

/* ================= JOIN WIZARD ================= */

function renderOnboard() {
  const step = UI.ob.step;
  const plans = ['pln_1mo_single', 'pln_1mo_all', 'pln_6mo_all'].map((id) => D.PlanService.byId(id)).filter(Boolean);
  let body = '';
  if (step === 0) {
    body = `<div class="ob-title">Pick your plan</div>
      <div class="dim small">Demo placeholder prices — the real packages come from Level Up.</div>
      ${plans.map((p) => `<button class="plan${UI.ob.planId === p.id ? ' current' : ''}" data-action="ob-plan" data-p="${p.id}" style="text-align:left;cursor:pointer">
          <div class="row"><b>${esc(p.name)}</b><b>$${p.price}</b></div>
          <div class="dim small">${p.branchAccess === 'all' ? 'Every branch' : 'One branch'} · ${p.classesIncluded ? 'classes included' : 'classes not included'} · ${p.guestsPerMonth || 0} guest/mo</div>
        </button>`).join('')}
      <button class="ghost-btn" data-action="ob-login">I already have an account</button>`;
  } else if (step === 1) {
    body = `<div class="ob-title">Home branch</div>
      <div class="dim small">Where will you train most? All-branch plans can enter anywhere anyway.</div>
      ${D.BranchService.list().filter((l) => !l.unconfirmed).map((l) => `<button class="plan" data-action="ob-branch" data-b="${l.id}" style="text-align:left;cursor:pointer">
          <div class="row"><b>${esc(l.name)}</b><span class="dim small">${l.opens}–${l.closes}</span></div>
          <div class="dim small">${esc(l.address)}</div>
        </button>`).join('')}
      <button class="ghost-btn" data-action="ob-back">Back</button>`;
  } else {
    body = `<div class="ob-title">About you</div>
      <input class="input" id="obName" placeholder="Full name" autocomplete="off" />
      <input class="input" id="obPhone" placeholder="Phone (+961 …)" autocomplete="off" />
      <div class="dim small">Payment is simulated on card — reception sees the sale land in the same ledger.</div>
      <button class="accent-btn" data-action="ob-finish">Join &amp; pay</button>
      <button class="ghost-btn" data-action="ob-back">Back</button>`;
  }
  document.getElementById('c-onboard').innerHTML = `
    <div class="ob-wrap">
      <div class="ob-progress">${[0, 1, 2].map((i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>
      ${body}
    </div>`;
}

/* ================= auth & boot ================= */

document.getElementById('loginBtn').onclick = () => {
  const nameIn = (document.getElementById('loginName').value || '').trim();
  const passIn = (document.getElementById('loginPassword').value || '').trim();
  const errEl = document.getElementById('loginError');
  const fail = (msg) => { errEl.textContent = msg; errEl.hidden = false; };
  const row = D.MemberService.byName(nameIn);
  if (!row) { fail('No member with that name. Try “Samer Khanji”.'); return; }
  /* DEMO AUTH — any non-empty password. Real auth is Supabase Auth. */
  if (!passIn) { fail('Enter any password — this demo does not use real credentials.'); return; }
  errEl.hidden = true;
  setSession(row.id);
  UI.gate = null; UI.fuelBranch = null; UI.clsBranch = 'all'; UI.pt = null;
  show('home');
  toast('Welcome, ' + row.name.split(' ')[0]);
};
document.getElementById('activateBtn').onclick = () => { UI.ob = { step: 0, planId: null, branchId: null }; show('onboard'); };

document.getElementById('resetDemo').onclick = () => {
  D.reset('normal-day');
  UI.pt = null; UI.fuelBranch = null; UI.fuelWarn = null; UI.clsBranch = 'all'; UI.gate = null;
  if (!me()) { setSession(null); show('login'); }
  else rerender();
  toast('Demo reset — normal day scenario');
};

/* live updates from staff dashboards (same GymBus the engine emits into) */
if (typeof GymBus !== 'undefined') {
  GymBus.on(() => { if (tabViews.includes(UI.view)) rerender(); });
}

/* boot — on a brand-new DB (nothing has happened yet anywhere) run the default
   scenario once so occupancy / payments aren't all zero on first open */
(() => {
  const db = D.load();
  if (!db.visits.length && !db.payments.length && !db.events.length) D.reset('normal-day');
})();
show(me() ? 'home' : 'login');
