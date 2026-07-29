/* GYM-APP static demo — complete member experience, mock state machine, no backend.
   v4: crafted UI — icon system, sectioned cards, motion. Logic identical to v3. */

const KEY = 'gym_demo_state_v3';

/* ================= icons ================= */

const PATHS = {
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1M14 20h1M20 20h1"/>',
  wallet: '<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M15.5 14.5h3"/>',
  star: '<path d="M12 3.5l2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.8l6-.9L12 3.5z"/>',
  zap: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  locker: '<rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="M4.5 9h15M12 13v3.5"/>',
  guest: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20.5c1.2-3.2 3.3-4.8 6-4.8s4.8 1.6 6 4.8M18 7.5v6M15 10.5h6"/>',
  car: '<path d="M4.5 16.5 6 11a2.5 2.5 0 0 1 2.4-1.8h7.2A2.5 2.5 0 0 1 18 11l1.5 5.5M3.5 16.5h17v3.5h-2.6l-.9-1.5H7l-.9 1.5H3.5z"/>',
  leaf: '<path d="M4.5 19.5c0-9 7-15 15-15 0 8-6 15-15 15z"/><path d="M4.5 19.5C8 14 12 10.5 16.5 8"/>',
  tool: '<path d="M14.2 6.8a4.8 4.8 0 0 1 6.6-1.6l-3.3 3.3 2 2 3.3-3.3a4.8 4.8 0 0 1-6.5 6.6L9 21.1a2.05 2.05 0 0 1-2.9-2.9l8.1-8.1z"/>',
  alert: '<path d="M10.3 4 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.5h.01"/>',
  receipt: '<path d="M14 2.5H6a2 2 0 0 0-2 2v17l3-1.5 2.5 1.5L12 20l2.5 1.5L17 20l3 1.5v-13z"/><path d="M14 2.5v6h6M8.5 12h7M8.5 15.5h7"/>',
  users: '<circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20.5c1.3-3.3 3.6-5 6.5-5s5.2 1.7 6.5 5M16 4a3.5 3.5 0 0 1 0 7M18.5 15.7c1.6.7 2.8 2.3 3.5 4.8"/>',
  gift: '<path d="M20 12.5V21H4v-8.5M2.5 7.5h19v5h-19zM12 21.5v-14M12 7.5H8a2.3 2.3 0 1 1 0-4.6c2.8 0 4 4.6 4 4.6zM12 7.5h4a2.3 2.3 0 1 0 0-4.6c-2.8 0-4 4.6-4 4.6z"/>',
  shield: '<path d="M12 22s8.5-4 8.5-10.5V5L12 2 3.5 5v6.5C3.5 18 12 22 12 22z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  chev: '<path d="M9.5 18.5 16 12 9.5 5.5"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z"/><path d="M10.2 19.5a2 2 0 0 0 3.6 0"/>',
  flame: '<path d="M12 2.5S6 8.5 6 13.5a6 6 0 0 0 12 0c0-5-6-11-6-11z"/><path d="M12 21.5c-1.8 0-3-1.4-3-3.2 0-1.9 3-4.3 3-4.3s3 2.4 3 4.3c0 1.8-1.2 3.2-3 3.2z"/>',
  bowl: '<path d="M4 11.5h16a8 8 0 0 1-16 0Z"/><path d="M9 8.5c0-2 1.5-2 1.5-4M13.5 8.5c0-2 1.5-2 1.5-4"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
  clipboard: '<rect x="4.5" y="4" width="15" height="17.5" rx="2"/><path d="M9 4a3 3 0 0 1 6 0M8.5 11h7M8.5 15h5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.5-3.5 4-5 7.5-5s6 1.5 7.5 5"/>',
  grid: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  check: '<path d="M4.5 12.5 10 18 19.5 7"/>',
};

function icon(name, size = 18) {
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || ''}</svg>`;
}
function eyebrow(name, text) {
  return `<div class="eyebrow">${icon(name, 15)}<span>${text}</span></div>`;
}

/* ================= data ================= */

const trainers = [
  { name: 'Karim H.', spec: 'Strength · Powerlifting', langs: 'AR EN', price: 35, rating: 4.9, status: 'Available now', cls: 'now', initial: 'K' },
  { name: 'Maya R.', spec: 'Functional · Mobility', langs: 'AR EN FR', price: 30, rating: 4.8, status: 'With a client · free 4:30 PM', cls: 'busy', initial: 'M' },
  { name: 'Tony A.', spec: 'Boxing · Conditioning', langs: 'AR EN', price: 40, rating: 4.7, status: 'Available now', cls: 'now', initial: 'T' },
  { name: 'Rita S.', spec: 'Pilates · Core', langs: 'AR FR', price: 32, rating: 5.0, status: 'Not working today', cls: 'off', initial: 'R' },
];

const classes = [
  { id: 'hiit', name: 'HIIT Burn', when: 'Today · 7:00 PM', instructor: 'Tony A.', spots: 4 },
  { id: 'pilates', name: 'Reformer Pilates', when: 'Tomorrow · 9:00 AM', instructor: 'Rita S.', spots: 0 },
  { id: 'boxing', name: 'Boxing Fundamentals', when: 'Tomorrow · 6:30 PM', instructor: 'Tony A.', spots: 9 },
  { id: 'yoga', name: 'Yoga Flow', when: 'Wed · 8:00 AM', instructor: 'Maya R.', spots: 7 },
  { id: 'aqua', name: 'Aqua Fit', when: 'Today · 5:30 PM', instructor: 'Rita S.', spots: 6 },
];

const menu = [
  { id: 'shake', cat: 'Shakes', name: 'Whey Protein Shake', price: 6, cal: 220, p: 32, c: 12, f: 4, allerg: 'milk' },
  { id: 'chicken', cat: 'Meals', name: 'Grilled Chicken Bowl', price: 12, cal: 540, p: 45, c: 52, f: 14, allerg: null },
  { id: 'salmon', cat: 'Meals', name: 'Salmon & Quinoa', price: 15, cal: 610, p: 38, c: 44, f: 26, allerg: 'fish' },
  { id: 'matcha', cat: 'Drinks', name: 'Iced Matcha', price: 5, cal: 90, p: 2, c: 18, f: 1, allerg: null },
  { id: 'bar', cat: 'Snacks', name: 'Protein Bar', price: 4, cal: 210, p: 20, c: 22, f: 7, allerg: 'nuts · milk' },
];

const shop = [
  { id: 'whey2kg', cat: 'Supplements', name: 'Whey Isolate 2 kg', price: 55, note: 'Chocolate · vanilla · member price' },
  { id: 'creatine', cat: 'Supplements', name: 'Creatine Monohydrate 500 g', price: 24, note: 'Trainer-recommended' },
  { id: 'shaker', cat: 'Gear', name: 'GYM Shaker 700 ml', price: 9, note: 'Club green' },
  { id: 'tee', cat: 'Gear', name: 'GYM Training Tee', price: 18, note: 'S–XXL · breathable' },
  { id: 'bands', cat: 'Gear', name: 'Resistance Band Set', price: 22, note: '5 levels' },
];

const mealPlan = [
  { meal: 'Breakfast', desc: 'Oats with whey, banana, almonds', macros: '620 kcal · 42P · 68C · 18F' },
  { meal: 'Lunch', desc: 'Chicken breast, rice, mixed salad, olive oil', macros: '780 kcal · 55P · 82C · 22F' },
  { meal: 'Pre-workout', desc: 'Greek yogurt with honey + espresso', macros: '260 kcal · 20P · 32C · 5F' },
  { meal: 'Post-workout', desc: 'Whey shake + white rice with tuna', macros: '590 kcal · 48P · 70C · 8F' },
  { meal: 'Dinner', desc: 'Salmon, quinoa, roasted vegetables', macros: '600 kcal · 38P · 44C · 26F' },
];

const recovery = [
  { id: 'sauna', name: 'Sauna session', dur: '30 min', price: 8 },
  { id: 'massage', name: 'Sports massage', dur: '45 min', price: 35 },
  { id: 'plunge', name: 'Cold plunge', dur: '15 min', price: 6 },
  { id: 'stretch', name: 'Assisted stretching', dur: '30 min', price: 20 },
];

const machines = ['Treadmill #3', 'Leg press', 'Cable station A', 'Bench #2', 'Lat pulldown', 'Rowing machine #1'];
const issueTypes = ['Not working', 'Unusual noise', 'Needs cleaning', 'Missing accessory', 'Safety concern'];

const todayWorkout = {
  program: 'Push Pull Legs · Week 3', day: 'Push day',
  exercises: [
    { name: 'Bench press', sets: '4 × 8', last: '80 kg' },
    { name: 'Incline dumbbell press', sets: '3 × 10', last: '28 kg' },
    { name: 'Overhead press', sets: '3 × 8', last: '50 kg' },
    { name: 'Cable fly', sets: '3 × 12', last: '18 kg' },
    { name: 'Triceps pushdown', sets: '3 × 12', last: '30 kg' },
  ],
};

const peakHours = [
  { label: '6a', v: 25 }, { label: '8a', v: 45 }, { label: '10a', v: 30 },
  { label: '12p', v: 35 }, { label: '2p', v: 20 }, { label: '4p', v: 55 },
  { label: '6p', v: 100 }, { label: '8p', v: 75 }, { label: '10p', v: 30 },
];

const redeemOptions = [
  { id: 'r-shake', name: 'Free protein shake', pts: 200 },
  { id: 'r-guest', name: 'Guest pass', pts: 500 },
  { id: 'r-pt', name: 'PT session', pts: 1200 },
];

/* Overridable from the sheet (Settings / Branches / Lockers / Parking / Users) */
const PRICES = { guest_pass: 10, car_wash: 12, assessment: 25, nutritionist: 30, pt_package: 300, renewal: 480 };
const POINTS = { visit: 10, class: 15, pr: 20, cafe_order: 5, referral: 300, challenge: 500 };
const CONFIG = { gym_name: 'GYM', referral_code: 'SAMER-2026', freeze_days_per_year: 30, qr_refresh_seconds: 25 };

/* 12 palettes from the Claude Design color exploration — tap to retheme the whole app */
const THEMES = [
  { name: 'Club Green', mood: 'athletic club', deep: '#124a38', accent: '#1e6b52', tint: '#dff0e6', paper: '#f3f4ef', muted: '#6c7a71', bar: '#e3e6de' },
  { name: 'Midnight & Lime', mood: 'dark performance', deep: '#101b14', accent: '#2e7d4f', tint: '#d8f26e', paper: '#f2f3ec', muted: '#6d766c', bar: '#e4e6dc' },
  { name: 'Charcoal & Signal', mood: 'industrial / iron', deep: '#26282b', accent: '#d4552b', tint: '#fbe3d6', paper: '#f4f2ef', muted: '#75716c', bar: '#e8e4df' },
  { name: 'Deep Ocean', mood: 'recovery / calm', deep: '#123a4a', accent: '#1e5b6b', tint: '#dcecf0', paper: '#eff3f2', muted: '#68797c', bar: '#dfe6e5' },
  { name: 'Espresso & Brass', mood: 'boutique premium', deep: '#3a2a1e', accent: '#8a6a3a', tint: '#f0e6d6', paper: '#f5f2ec', muted: '#7c7266', bar: '#e9e2d6' },
  { name: 'Ink & Volt', mood: 'hardcore', deep: '#17181a', accent: '#3a3d42', tint: '#e8f05e', paper: '#f1f1ee', muted: '#73756f', bar: '#e2e2dc' },
  { name: 'Royal & Ice', mood: 'modern premium', deep: '#1e2a5e', accent: '#3d52b8', tint: '#dfe6fa', paper: '#f1f2f0', muted: '#6c7280', bar: '#e2e4e8' },
  { name: 'Forest & Clay', mood: 'earthy / outdoor', deep: '#2c3b26', accent: '#5c7248', tint: '#e9e6d2', paper: '#f4f2ea', muted: '#75796a', bar: '#e5e4d6' },
  { name: 'Plum & Blush', mood: 'boutique studio', deep: '#4a1e3a', accent: '#8a3564', tint: '#f5dfe9', paper: '#f5f0f2', muted: '#7d6d76', bar: '#eadfe4' },
  { name: 'Graphite & Red', mood: 'combat / intensity', deep: '#1c1c1e', accent: '#b3272d', tint: '#f6dcdc', paper: '#f2f1ef', muted: '#75726f', bar: '#e4e2df' },
  { name: 'Slate & Aqua', mood: 'tech / data', deep: '#22333b', accent: '#1e8a8a', tint: '#d6f2ee', paper: '#eff2f1', muted: '#6a7a7c', bar: '#dfe6e4' },
  { name: 'Sand & Terracotta', mood: 'warm wellness', deep: '#7a4a2b', accent: '#c07a4a', tint: '#f7e8d8', paper: '#f6f1e8', muted: '#84766a', bar: '#ece1d2' },
];

function applyTheme(name) {
  const t = THEMES.find((x) => x.name === name) || THEMES[0];
  const r = document.documentElement.style;
  r.setProperty('--green', t.accent);
  r.setProperty('--green-deep', t.deep);
  r.setProperty('--green-bright', t.accent);
  r.setProperty('--mint', t.tint);
  r.setProperty('--paper', t.paper);
  r.setProperty('--muted', t.muted);
  r.setProperty('--line', t.bar);
  r.setProperty('--tint', t.bar);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.paper);
  return t;
}
let pointsRules = [];   // [{action, points}] shown in Account
let plansCatalog = [];  // [{name, price, duration, benefits}] shown in Account
const branchInfo = { name: 'City Center', capacity: 120 };
let lockersPool = null;   // [{number, zone, status}] — free lockers assigned at check-in
let parkingSpots = null;  // [{spot, type, status}]
let usersRoster = [];     // full member roster (backs the system; manager view reads it)
let memberRows = [];      // Member tab rows — the login accounts (name + password)

/* ================= state ================= */

const defaultState = {
  loggedIn: false,
  theme: '',                 // palette name; empty = sheet default or Club Green
  memberName: 'Samer Khanji', tier: 'Performance',
  memberSince: 'March 2026', subPlan: '6-Month · Performance',
  challengeRewarded: false,
  checkedIn: false, enteredAt: null, leftGymPrompt: false,
  frozen: false, freezeDaysUsed: 4, subEnds: 'Dec 28, 2026', autoRenew: true,
  baseInside: 37,
  wallet: 68, points: 340,
  walletTx: [
    { label: 'Café — shake + bar', when: 'Jul 25', amount: -10 },
    { label: 'Top-up (100 + 10 bonus)', when: 'Jul 20', amount: 110 },
    { label: 'Sauna session', when: 'Jul 19', amount: -8 },
  ],
  booking: null, order: null,
  pkgUsed: 7, pkgTotal: 10,
  classState: {}, classRatings: {},
  locker: null,
  lastLocker: 47,
  guestPass: null,
  poolLane: null,
  parking: { plate: 'B 123456', spot: 'P-12 (premium)', carWash: false },
  recoveryBookings: [],
  reports: [],
  allergies: ['peanuts'], // declared in the onboarding health questionnaire
  orderHistory: [],
  prs: [
    { name: 'Bench press', value: '85 kg', when: 'Jul 19' },
    { name: 'Deadlift', value: '150 kg', when: 'Jul 10' },
    { name: 'Squat', value: '120 kg', when: 'Jun 28' },
  ],
  workoutLogged: false,
  challenge: { name: '30-Day Consistency', done: 12, target: 20, reward: '500 pts + free shake' },
  assessment: { last: 'Jun 15 · body fat 18.2% · 78.4 kg', next: null },
  family: [
    { name: 'Lara K.', rel: 'Partner · Active plan', initial: 'L' },
    { name: 'Adam K.', rel: 'Son · Kids club', initial: 'A' },
  ],
  sessionEvents: [], problems: [],
  invoices: [
    { label: '6-Month membership', date: 'Jun 28', amount: 480 },
    { label: 'PT package (10 sessions)', date: 'May 14', amount: 300 },
    { label: 'Monthly membership', date: 'Apr 28', amount: 95 },
  ],
  notifications: [
    { title: 'Class reminder', body: 'HIIT Burn starts today at 7:00 PM — see you there!', when: 'Today 3:00 PM', unread: true },
    { title: 'Challenge update', body: '12 of 20 visits done in the 30-Day Consistency challenge. Keep going!', when: 'Yesterday', unread: true },
    { title: 'Renewal', body: 'Your 6-Month plan renews on Dec 28. Renew early and get one free assessment.', when: 'Jul 24', unread: false },
  ],
  visits: [
    { id: 1, date: 'Jul 25', inT: '5:50 PM', outT: '7:05 PM', dur: 75,
      extras: [
        { time: '5:52 PM', title: 'Locker 47 opened', sub: 'Changing room A' },
        { time: '6:00 PM', title: 'Personal training — Karim H.', sub: 'Session 7 of 10 · confirmed by you' },
        { time: '7:02 PM', title: 'Café order picked up', sub: 'Whey Protein Shake · $6 · wallet' },
      ] },
    { id: 2, date: 'Jul 23', inT: '6:20 PM', outT: '7:58 PM', dur: 98,
      extras: [
        { time: '6:25 PM', title: 'Parking — car wash started', sub: 'Basic wash · ready 7:45 PM' },
        { time: '7:00 PM', title: 'Class — HIIT Burn', sub: 'Tony A. · attended · rated ★★★★★' },
      ] },
    { id: 3, date: 'Jul 21', inT: '7:02 AM', outT: '8:11 AM', dur: 69, extras: [] },
    { id: 4, date: 'Jul 19', inT: '6:05 PM', outT: '7:33 PM', dur: 88,
      extras: [
        { time: '6:15 PM', title: 'Personal training — Karim H.', sub: 'Session 6 of 10' },
        { time: '7:20 PM', title: 'Sauna session', sub: '30 min · $8 wallet' },
      ] },
    { id: 5, date: 'Jul 16', inT: '5:44 PM', outT: '6:59 PM', dur: 75, extras: [] },
    { id: 6, date: 'Jul 13', inT: '8:15 AM', outT: '9:40 AM', dur: 85, extras: [] },
    { id: 7, date: 'Jul 10', inT: '6:30 PM', outT: '8:02 PM', dur: 92, extras: [] },
  ],
};

let state = load();
let cart = {};
let cafeCheckout = null; // in-flight checkout options (not persisted)

/* ================= Google Sheet data source =================
   The sheet is the content database: staff edit tabs, the app reads them.
   Setup: Google Sheet shared as "Anyone with the link — Viewer", with tabs
   Menu, Trainers, Classes, Shop (see README-SHEET.md for exact columns).
   Paste the sheet ID below (the long string in the sheet URL). Leave empty
   to run on built-in mock data. */

const SHEET_ID = '1ApGcaazok6jm9IGaem_qJHDP0Gj8QMZ0BvRh7PYocw0';

/* Seed the session identity + account state from a Member-tab row.
   Used at boot (first row) and again whenever someone logs in. */
function applyMemberSeed(M) {
  if (M.name) state.memberName = M.name;
  if (M.tier) state.tier = M.tier;
  if (M.member_since) state.memberSince = M.member_since;
  if (M.sub_plan) state.subPlan = M.sub_plan + (M.tier ? ' · ' + M.tier : '');
  if (M.wallet) state.wallet = Number(M.wallet) || state.wallet;
  if (M.points) state.points = Number(M.points) || state.points;
  if (M.sub_ends) state.subEnds = M.sub_ends;
  if (M.freeze_used) state.freezeDaysUsed = Number(M.freeze_used) || 0;
  if (M.plate) state.parking.plate = M.plate;
  if (M.spot) state.parking.spot = M.spot;
  if (M.challenge_name) state.challenge.name = M.challenge_name;
  if (M.challenge_done) state.challenge.done = Number(M.challenge_done) || 0;
  if (M.challenge_target) state.challenge.target = Number(M.challenge_target) || 20;
  if (M.challenge_reward) state.challenge.reward = M.challenge_reward;
  if (M.assessment_last) state.assessment.last = M.assessment_last;
  state.userStatus = (M.sub_status || 'active').toLowerCase();
  state.frozen = state.userStatus === 'frozen';
  state.challengeRewarded = state.challenge.done >= state.challenge.target;
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (cell !== '' || row.length) { row.push(cell); rows.push(row); row = []; cell = ''; }
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows;
  return body
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), (r[i] ?? '').trim()])));
}

async function fetchTab(tab) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${tab}: HTTP ${res.status}`);
  return parseCSV(await res.text());
}

async function loadSheetData() {
  if (!SHEET_ID) return;
  try {
    const tabs = ['Menu', 'Trainers', 'Classes', 'Shop', 'Member', 'Visits', 'WalletTx',
      'Notifications', 'PRs', 'Workout', 'MealPlan', 'Recovery', 'Invoices', 'Family',
      'Users', 'InsideNow', 'Lockers', 'Machines', 'PeakHours', 'Rewards', 'Settings',
      'Branches', 'Parking', 'Plans', 'PointsRules'];
    const settled = await Promise.allSettled(tabs.map(fetchTab));
    const T = Object.fromEntries(tabs.map((t, i) =>
      [t, settled[i].status === 'fulfilled' ? settled[i].value : []]));
    const [mRows, tRows, cRows, sRows] = [T.Menu, T.Trainers, T.Classes, T.Shop];
    if (mRows.length) {
      menu.length = 0;
      mRows.forEach((r, i) => menu.push({
        id: 'm' + i, cat: r.category || 'Menu', name: r.name || '—',
        price: Number(r.price) || 0, cal: Number(r.calories) || null,
        p: Number(r.protein) || 0, c: Number(r.carbs) || 0, f: Number(r.fat) || 0,
        allerg: r.allergens || null,
      }));
    }
    if (tRows.length) {
      trainers.length = 0;
      tRows.forEach((r) => {
        const avail = (r.availability || 'available').toLowerCase();
        trainers.push({
          name: r.name || '—', spec: r.specialty || '', langs: r.languages || '',
          price: Number(r.price) || 0, rating: Number(r.rating) || null,
          status: r.status || (avail === 'available' ? 'Available now' : avail === 'busy' ? 'With a client' : 'Not working today'),
          cls: avail === 'available' ? 'now' : avail === 'busy' ? 'busy' : 'off',
          initial: (r.name || '?')[0].toUpperCase(),
        });
      });
    }
    if (cRows.length) {
      classes.length = 0;
      cRows.forEach((r, i) => classes.push({
        id: 'c' + i, name: r.name || '—', when: r.when || '',
        instructor: r.instructor || '', spots: Number(r.spots) || 0,
      }));
      // pool programming ships with the app until the sheet's Classes tab carries it
      if (!classes.some((c) => /aqua/i.test(c.name))) {
        classes.push({ id: 'aqua', name: 'Aqua Fit', when: 'Today · 5:30 PM', instructor: 'Rita S.', spots: 6 });
      }
    }
    if (sRows.length) {
      shop.length = 0;
      sRows.forEach((r, i) => shop.push({
        id: 's' + i, cat: r.category || 'Shop', name: r.name || '—',
        price: Number(r.price) || 0, note: r.note || '',
      }));
    }
    // ---- content tabs: always live from the sheet ----
    if (T.Workout.length) {
      todayWorkout.program = T.Workout[0].program || todayWorkout.program;
      todayWorkout.day = T.Workout[0].day || todayWorkout.day;
      todayWorkout.exercises = T.Workout.map((r) => ({
        name: r.exercise || '—', sets: r.sets || '', last: r.last || '',
      }));
    }
    if (T.MealPlan.length) {
      mealPlan.length = 0;
      T.MealPlan.forEach((r) => mealPlan.push({
        meal: r.meal || '—', desc: r.description || '', macros: r.macros || '',
      }));
    }
    if (T.Recovery.length) {
      recovery.length = 0;
      T.Recovery.forEach((r, i) => recovery.push({
        id: 'rec' + i, name: r.name || '—', dur: r.duration || '', price: Number(r.price) || 0,
      }));
    }
    if (T.PeakHours.length) {
      peakHours.length = 0;
      T.PeakHours.forEach((r) => peakHours.push({ label: r.label || '', v: Number(r.value) || 0 }));
    }
    if (T.Machines.length) {
      machines.length = 0;
      T.Machines.filter((r) => (r.status || 'ok') !== 'maintenance')
        .forEach((r) => machines.push(r.zone ? `${r.name} (${r.zone})` : r.name));
    }
    if (T.Rewards.length) {
      redeemOptions.length = 0;
      T.Rewards.forEach((r, i) => redeemOptions.push({
        id: 'r' + i, name: r.name || '—', pts: Number(r.points) || 0,
      }));
    }
    if (T.Settings.length) {
      T.Settings.forEach((r) => {
        if (!r.key) return;
        if (r.key.startsWith('price_')) PRICES[r.key.slice(6)] = Number(r.value) || PRICES[r.key.slice(6)];
        else CONFIG[r.key] = r.value || CONFIG[r.key];
      });
    }
    if (T.Branches.length) {
      branchInfo.name = T.Branches[0].name || branchInfo.name;
      branchInfo.capacity = Number(T.Branches[0].capacity) || branchInfo.capacity;
    }
    if (T.Lockers.length) {
      lockersPool = T.Lockers.map((r) => ({
        number: Number(r.number) || 0, zone: r.zone || '', status: (r.status || 'free').toLowerCase(),
      }));
    }
    if (T.Parking.length) {
      parkingSpots = T.Parking.map((r) => ({
        spot: r.spot || '', type: r.type || 'standard', status: (r.status || 'free').toLowerCase(),
      }));
    }
    if (T.Users.length) {
      usersRoster = T.Users.map((r) => ({
        name: r.name || '—', phone: r.phone || '', tier: r.tier || '',
        status: r.status || '', plan: r.plan || '', joined: r.joined || '',
      }));
    }
    if (T.Plans.length) {
      plansCatalog = T.Plans.map((r) => ({
        name: r.name || '—', price: r.price || '', duration: r.duration || '',
        benefits: r.benefits || '',
      }));
    }
    if (T.PointsRules.length) {
      pointsRules = T.PointsRules.map((r) => ({
        action: r.action || '—', points: Number(r.points) || 0,
      }));
      T.PointsRules.forEach((r) => {
        if (r.key && POINTS[r.key] !== undefined) POINTS[r.key] = Number(r.points) || POINTS[r.key];
      });
    }
    // live occupancy = people in the InsideNow tab (add/remove rows to change it)
    if (T.InsideNow.length) {
      state.baseInside = T.InsideNow.length;
      save();
    }

    memberRows = T.Member;

    // ---- seed tabs: applied once per fresh state (Reset demo re-seeds) ----
    if (!state.sheetSeeded) {
      if (T.Member[0]) applyMemberSeed(T.Member[0]);
      if (T.Visits.length) {
        state.visits = T.Visits.map((r, i) => ({
          id: i + 1, date: r.date || '—', inT: r.in || '', outT: r.out || '',
          dur: Number(r.duration_min) || 0,
          extras: (r.events || '').split(';').map((e) => e.trim()).filter(Boolean).map((e) => {
            const [time, title, sub] = e.split('|').map((x) => (x || '').trim());
            return { time, title, sub: sub || '' };
          }),
        }));
      }
      if (T.WalletTx.length) {
        state.walletTx = T.WalletTx.map((r) => ({
          label: r.label || '—', when: r.when || '', amount: Number(r.amount) || 0,
        }));
      }
      if (T.Notifications.length) {
        state.notifications = T.Notifications.map((r) => ({
          title: r.title || '—', body: r.body || '', when: r.when || '',
          unread: (r.unread || '').toLowerCase() === 'yes',
        }));
      }
      if (T.PRs.length) {
        state.prs = T.PRs.map((r) => ({
          name: r.exercise || '—', value: r.value || '', when: r.when || '',
        }));
      }
      if (T.Invoices.length) {
        state.invoices = T.Invoices.map((r) => ({
          label: r.label || '—', date: r.date || '', amount: Number(r.amount) || 0,
        }));
      }
      if (T.Family.length) {
        state.family = T.Family.map((r) => ({
          name: r.name || '—', rel: r.relation || '', initial: (r.name || '?')[0].toUpperCase(),
        }));
      }
      state.sheetSeeded = true;
      save();
    }

    // re-render whatever screen is open with the fresh data
    const active = views.find((v) => document.getElementById('view-' + v).classList.contains('active'));
    if (active === 'home') renderHome();
    if (active === 'train') renderTrain();
    if (active === 'gym') renderGym();
    if (active === 'food') renderFood();
    if (active === 'account') renderAccount();
    console.info('Sheet data loaded:',
      Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v.length])));
  } catch (err) {
    console.warn('Sheet load failed — using built-in mock data.', err);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch (_) { /* default */ }
  return structuredClone(defaultState);
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

/* ================= helpers ================= */

function fmtTime(ts) { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function fmtDur(min) { const h = Math.floor(min / 60); return h > 0 ? `${h} hr ${min % 60} min` : `${min} min`; }
function insideMinutes() { return Math.max(0, Math.floor((Date.now() - state.enteredAt) / 60000)); }
function todayLabel() { return new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }); }
function greetingWord() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.getElementById('screen').appendChild(el);
  setTimeout(() => el.remove(), 2700);
}
function pushNotif(title, body) {
  state.notifications.unshift({ title, body, when: 'Just now', unread: true });
  save();
}
function earnPoints(n, why) { state.points += n; save(); toast(`+${n} pts — ${why}`); }
function payWallet(amount, label) {
  if (state.wallet < amount) { toast('Wallet balance too low — top up in Account'); return false; }
  state.wallet -= amount;
  state.walletTx.unshift({ label, when: 'Today', amount: -amount });
  save(); return true;
}
function unread() { return state.notifications.filter((n) => n.unread).length; }

/* ================= routing ================= */

const views = ['login', 'home', 'pass', 'train', 'gym', 'food', 'account', 'visitdetail', 'notifications', 'onboard'];
const tabViews = ['home', 'train', 'gym', 'food', 'account'];
const tabbar = document.getElementById('tabbar');
let segTrain = 'workouts';
let segFood = 'cafe';

function show(view) {
  views.forEach((v) => document.getElementById('view-' + v).classList.toggle('active', v === view));
  tabbar.classList.toggle('hidden', !tabViews.includes(view));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  if (view === 'home') renderHome();
  if (view === 'train') renderTrain();
  if (view === 'gym') renderGym();
  if (view === 'food') renderFood();
  if (view === 'account') renderAccount();
  if (view === 'notifications') renderNotifs();
  if (view === 'pass') openPass();
  if (view !== 'pass') stopPass();
  document.getElementById('simLeave').hidden = !state.checkedIn;
}

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => show(b.dataset.back)));

/* ================= HOME ================= */

function renderHome() {
  const inside = state.baseInside + (state.checkedIn ? 1 : 0);
  const cap = branchInfo.capacity || 120;
  const level = inside < cap * 0.4 ? ['Quiet', 'ok'] : inside < cap * 0.75 ? ['Moderate', 'mid'] : ['Busy', 'hot'];
  const maxPeak = Math.max(...peakHours.map((p) => p.v));
  const hour = new Date().getHours();
  const nowIdx = Math.min(peakHours.length - 1, Math.max(0, Math.floor((hour - 6) / 2)));

  const entry = state.checkedIn
    ? `<button class="inside-card" data-action="open-pass">
        <div class="inside-left">
          <div class="inside-dot"></div>
          <div>
            <div class="inside-title">Inside the gym</div>
            <div class="inside-meta">Since ${fmtTime(state.enteredAt)} · ${fmtDur(insideMinutes())}${state.locker ? ` · locker #${state.locker.number}` : ''}</div>
          </div>
        </div>
        <div class="hero-chev">${icon('chev', 20)}</div>
      </button>`
    : state.frozen
      ? `<button class="enter-card frozen" data-action="open-pass">
          <div class="hero-text"><div class="t">Membership frozen</div><div class="s">Unfreeze in Account to enter</div></div>
          <div class="hero-chev">${icon('chev', 20)}</div>
        </button>`
      : `<button class="enter-card" data-action="open-pass">
          <div class="hero-qr">${icon('qr', 26)}</div>
          <div class="hero-text"><div class="t">Enter Gym</div><div class="s">Open your pass for the gate</div></div>
          <div class="hero-chev">${icon('chev', 20)}</div>
        </button>`;

  const upcoming = [];
  if (state.booking) upcoming.push({ ic: 'dumbbell', t: state.booking.trainer, s: `Personal training · $${state.booking.price}`, w: state.booking.when });
  classes.filter((c) => state.classState[c.id] === 'booked').forEach((c) => upcoming.push({ ic: 'calendar', t: c.name, s: `Class · ${c.instructor}`, w: c.when }));
  classes.filter((c) => state.classState[c.id] === 'waitlist').forEach((c) => upcoming.push({ ic: 'clock', t: c.name, s: "Waitlist — we'll notify you", w: c.when }));
  state.recoveryBookings.forEach((r) => upcoming.push({ ic: 'leaf', t: r.name, s: `Recovery · $${r.price} wallet`, w: r.when }));
  if (state.poolLane) upcoming.push({ ic: 'leaf', t: `Pool — lane ${state.poolLane.lane}`, s: '45 min · included', w: state.poolLane.when });
  if (state.assessment.next) upcoming.push({ ic: 'clipboard', t: 'Fitness assessment', s: 'InBody + movement screen', w: state.assessment.next });

  /* prioritized home: one Next item, everything urgent in one Attention card */
  const next = upcoming[0] || null;
  const rest = upcoming.slice(1);
  const attention = [];
  const endsMs = Date.parse(state.subEnds);
  const expDays = isNaN(endsMs) ? null : Math.round((endsMs - Date.now()) / 86400000);
  if (state.frozen) attention.push({ t: 'Membership frozen', s: 'Unfreeze in Account to enter the gym', act: 'goto-account' });
  else if (expDays != null && expDays < 45) attention.push({ t: expDays <= 0 ? 'Membership expired' : `Membership expires in ${expDays} days`, s: 'Tap to request renewal — pay at the desk', act: 'renew-request' });
  const pkgLeftH = state.pkgTotal - state.pkgUsed;
  if (pkgLeftH <= 2) attention.push({ t: `PT package: ${pkgLeftH} session${pkgLeftH === 1 ? '' : 's'} remaining`, s: 'Renew the 10-pack with Karim or at reception', act: 'goto-train' });
  if (state.pendingPt) attention.push({ t: 'Confirm your training session', s: 'Nothing is deducted until you confirm — Train → Trainers', act: 'goto-train' });
  const openRep = state.reports.find((r) => r.status && r.status !== 'Repaired' && r.status !== 'Fixed');
  if (openRep) attention.push({ t: `${openRep.ref || 'Report'} — ${openRep.status}`, s: openRep.machine, act: 'goto-gym' });
  if (state.lastResolved && !state.lastResolved.rated) attention.push({ t: `${state.lastResolved.tkt} resolved — how did we do?`, s: 'Rate it in the Gym tab', act: 'goto-gym' });

  document.getElementById('c-home').innerHTML = `
    <header class="app-header">
      <div class="who">
        <div class="avatar">${(state.memberName || 'S')[0]}</div>
        <div>
          <div class="hello">${greetingWord()},</div>
          <div class="greeting">${(state.memberName || 'Samer').split(' ')[0]}</div>
        </div>
      </div>
      <div class="header-actions">
        <button class="bell" data-action="inbox" aria-label="Inbox">
          ${icon('bell', 21)}
          ${unread() ? `<span class="badge">${unread()}</span>` : ''}
        </button>
      </div>
    </header>
    <div class="subline">
      <span class="chip ${state.frozen ? 'chip-warn' : 'chip-ok'}">${state.frozen ? 'Frozen' : 'Active'} · ${state.tier}</span>
      <span class="dim small">${branchInfo.name} Branch</span>
    </div>

    ${state.leftGymPrompt && state.checkedIn ? `
      <div class="banner">
        <div class="bt">${icon('alert', 16)} It looks like you left the gym</div>
        <div class="bs">Want to check out? The exit scanner stays the official record — this is just a reminder.</div>
        <div class="btn-row">
          <button class="book-btn" data-action="banner-checkout">Check out</button>
          <button class="book-btn warn" data-action="banner-dismiss">I'm still here</button>
        </div>
      </div>` : ''}

    ${entry}

    ${next ? `
    <button class="card" data-action="goto-train" style="width:100%; text-align:left; display:block;">
      <div class="row">${eyebrow(next.ic, 'Next')}<span class="dim small">${next.w}</span></div>
      <div style="font-weight:800; font-size:16px; font-family:var(--display,inherit);">${next.t}</div>
      <div class="dim small">${next.s}</div>
    </button>` : ''}

    <div class="card">
      ${eyebrow('clock', 'Gym right now')}
      <div class="occupancy-row">
        <div class="occupancy-count">${inside}</div>
        <div>
          <div class="occupancy-level ${level[1]}">${level[0]}</div>
          <div class="dim small">members inside · capacity ${cap}</div>
        </div>
      </div>
      <div class="peak">
        ${peakHours.map((p, i) => `
          <div class="peak-col">
            <div class="peak-bar ${i === nowIdx ? 'now' : ''}" style="height:${Math.round((p.v / maxPeak) * 44) + 6}px"></div>
            <div class="peak-label">${p.label}</div>
          </div>`).join('')}
      </div>
      <div class="dim small">Typical day — usually busiest 6–8 PM</div>
    </div>

    ${state.order ? `
      <div class="card">
        ${eyebrow('bowl', 'Café order')}
        <div class="row"><b>${state.order.items}</b><b class="accent">$${state.order.total}</b></div>
        <div class="dim small">${state.order.status}</div>
      </div>` : ''}

    ${attention.length ? `
      <div class="card" style="border-left:4px solid var(--amber);">
        ${eyebrow('alert', 'Needs your attention')}
        ${attention.map((a) => `
          <button class="li" data-action="${a.act}" style="width:100%; text-align:left; background:none; border:none; padding:8px 0; cursor:pointer;">
            <div class="li-ic">${icon('alert', 17)}</div>
            <div class="li-body"><b>${a.t}</b><div class="dim small">${a.s}</div></div>
          </button>`).join('')}
      </div>` : ''}

    <div class="duo">
      <button class="mini-card" data-action="goto-account">
        <div class="mini-top">${icon('wallet', 17)}<span>Wallet</span></div>
        <div class="mini-value">$${state.wallet}</div>
      </button>
      <button class="mini-card" data-action="goto-account">
        <div class="mini-top">${icon('star', 17)}<span>Points</span></div>
        <div class="mini-value">${state.points}</div>
      </button>
    </div>

    ${rest.length ? `
      <div class="card">
        ${eyebrow('calendar', 'Also coming up')}
        ${rest.map((u) => `
          <div class="li">
            <div class="li-ic">${icon(u.ic, 17)}</div>
            <div class="li-body"><b>${u.t}</b><div class="dim small">${u.s}</div></div>
            <span class="dim small">${u.w}</span>
          </div>`).join('')}
      </div>` : ''}

    <div class="card challenge">
      <div class="row">${eyebrow('flame', state.challenge.name + ' challenge')}
        <b class="accent">${state.challenge.done}/${state.challenge.target}</b></div>
      <div class="bar pkg-bar"><div class="fill" style="width:${(state.challenge.done / state.challenge.target) * 100}%"></div></div>
      <div class="dim small">Visit ${state.challenge.target} times this month → ${state.challenge.reward}</div>
    </div>

    ${CONFIG.announcement ? `
      <div class="card" style="border-left:4px solid var(--amber);">
        ${eyebrow('bell', 'Gym announcement')}
        <div style="font-size:14.5px;">${CONFIG.announcement}</div>
      </div>` : ''}

    <div class="quick-grid">
      <button class="quick" data-action="goto-gym">${icon('locker', 20)}<b>Locker</b><span>${state.locker ? `${state.locker.locked ? 'Locked' : 'Open'} · #${state.locker.number}` : 'Assigned at check-in'}</span></button>
      <button class="quick" data-action="goto-gym">${icon('guest', 20)}<b>Guest pass</b><span>${state.guestPass ? 'Active' : 'Invite a friend'}</span></button>
      <button class="quick" data-action="goto-gym-report">${icon('tool', 20)}<b>Report issue</b><span>Broken equipment</span></button>
      <button class="quick sos" data-action="sos">${icon('alert', 20)}<b>Help / SOS</b><span>Hold-safe · staff alerted</span></button>
    </div>

    <div class="card">
      <div class="li">
        <div class="li-ic">${icon('bell', 17)}</div>
        <div class="li-body"><b>Need anything?</b><div class="dim small">Reception answers in the app — every request gets a ticket.</div></div>
        <button class="book-btn" data-action="support">Contact</button>
      </div>
    </div>`;
}

/* ================= TRAIN ================= */

function renderTrain() {
  const left = state.pkgTotal - state.pkgUsed;
  let body = '';

  if (segTrain === 'workouts') {
    const tw = state.customWorkout || todayWorkout;
    body = `
      <div class="card">
        <div class="row">${eyebrow('dumbbell', tw.program)}<span class="chip chip-ok">${tw.day}</span></div>
        ${state.customWorkout ? `<div class="dim small" style="margin-bottom:6px;">Updated by ${state.customWorkout.by} — synced live from your trainer.</div>` : ''}
        ${tw.exercises.map((e) => `
          <div class="exercise">
            <div><b>${e.name}</b><div class="dim small">${e.sets}</div></div>
            <span class="dim small">last: ${e.last}</span>
          </div>`).join('')}
        ${state.workoutLogged
          ? `<div class="done-line">${icon('check', 17)} Workout logged</div>`
          : '<button class="accent-btn slim" data-action="log-workout">Log today\'s workout</button>'}
      </div>

      <div class="card">
        ${eyebrow('star', 'Personal records')}
        ${state.prs.map((p) => `<div class="row"><b>${p.name}</b><span><b class="accent">${p.value}</b> <span class="dim small">${p.when}</span></span></div>`).join('')}
      </div>

      <div class="card">
        ${eyebrow('clipboard', 'Fitness assessment')}
        <div class="dim small">Last: ${state.assessment.last}</div>
        ${state.assessment.next
          ? `<div class="done-line">${icon('check', 17)} Booked — ${state.assessment.next}</div>`
          : `<button class="book-btn wide" data-action="book-assessment">Book assessment · $${PRICES.assessment}</button>`}
        <div class="dim small">Body composition, posture, mobility and strength — repeated every 3 months.</div>
      </div>`;
  }

  if (segTrain === 'trainers') {
    const b = state.booking;
    body = `
      ${state.pendingPt ? `
      <div class="card" style="border:2px solid var(--deep, #124a38);">
        ${eyebrow('check', 'Confirm your session')}
        <div style="margin-bottom:4px;"><b>${state.pendingPt.trainer}</b> marked today's session complete.</div>
        <div class="dim small" style="margin-bottom:4px;">${state.pendingPt.summary}</div>
        <div class="dim small" style="margin-bottom:10px;">Trainer notes: “${state.pendingPt.notes}”</div>
        <button class="accent-btn slim" data-action="pt-confirm">Confirm — deduct 1 session</button>
        <button class="book-btn wide warn" data-action="pt-dispute" style="margin-top:8px;">This session didn't happen</button>
        <div class="dim small center" style="margin-top:6px;">Nothing is deducted until you confirm. Disputes go to the manager.</div>
      </div>` : ''}
      ${b ? `
      <div class="card">
        <div class="row"><b>${b.trainer} · ${b.when}</b>
          <span class="chip ${b.status === 'accepted' ? 'chip-ok' : 'chip-warn'}">${b.status === 'accepted' ? 'Confirmed ✓' : b.status === 'proposed' ? 'New time proposed' : 'Awaiting trainer'}</span></div>
        ${b.note ? `<div class="dim small">${b.note}</div>` : ''}
        ${b.status === 'proposed' ? `<button class="accent-btn slim" data-action="pt-accept-time" style="margin-top:8px;">Accept ${b.when}</button>` : ''}
      </div>` : ''}
      <div class="card">
        ${eyebrow('dumbbell', 'Personal training package')}
        <div class="row"><b>Karim H. · 10-session pack</b><b class="accent">${state.pkgUsed} used · ${left} remaining</b></div>
        <div class="bar pkg-bar"><div class="fill" style="width:${(left / state.pkgTotal) * 100}%"></div></div>
        <button class="book-btn wide" data-action="renew-pkg">Renew 10-pack · $${PRICES.pt_package} ($${Math.round(PRICES.pt_package / 10)}/session)</button>
        <div class="dim small">Sessions are only marked complete after you confirm them in the app.</div>
      </div>
      ${state.pickSlot ? `
      <div class="card">
        ${eyebrow('calendar', 'Pick a time — ' + state.pickSlot.trainer)}
        ${state.pickSlot.slots.map((s) => `<button class="book-btn wide" data-action="book-slot" data-slot="${s}" style="margin-top:6px;">${s}</button>`).join('')}
        <button class="book-btn wide warn" data-action="book-cancel" style="margin-top:8px;">Cancel</button>
        <div class="dim small">Only genuinely open slots are shown — ${state.pickSlot.trainer.split(' ')[0]}'s live availability controls this list.</div>
      </div>` : ''}
      ${trainers.map((t, i) => `
        <div class="trainer">
          <div class="avatar tone-${i % 4}">${t.initial}</div>
          <div class="info">
            <div class="n">${t.name} <span class="stars">★ ${t.rating}</span></div>
            <div class="meta">${t.spec} · ${t.langs} · $${t.price}/session</div>
            <div class="status ${t.cls}">${t.status}</div>
          </div>
          <button class="book-btn" data-action="book-trainer" data-i="${i}" ${t.cls === 'off' ? 'disabled' : ''}>
            ${state.booking && state.booking.trainer === t.name ? 'Booked ✓' : 'Book'}
          </button>
        </div>`).join('')}`;
  }

  if (segTrain === 'classes') {
    const offerCard = state.classOffer ? `
      <div class="card" style="border:2px solid var(--deep, #124a38);">
        ${eyebrow('calendar', 'Waitlist offer — ' + state.classOffer.name)}
        <div class="dim small">A space opened up. Answer within ${state.classOffer.expires} or it goes to the next person — the space is held for you alone until then.</div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="book-btn" data-action="offer-accept">Accept the space</button>
          <button class="book-btn warn" data-action="offer-decline">Decline</button>
        </div>
      </div>` : '';
    body = offerCard + classes.map((c) => {
      const st = state.classState[c.id];
      const rated = state.classRatings[c.id];
      let btn;
      if (st === 'booked') btn = `<button class="book-btn" data-action="class" data-c="${c.id}" data-a="cancel">Cancel</button>`;
      else if (st === 'waitlist') btn = `<button class="book-btn warn" data-action="class" data-c="${c.id}" data-a="cancel">Waitlist ✓</button>`;
      else if (c.spots === 0) btn = `<button class="book-btn warn" data-action="class" data-c="${c.id}" data-a="waitlist">Join waitlist</button>`;
      else btn = `<button class="book-btn" data-action="class" data-c="${c.id}" data-a="book">Reserve</button>`;
      return `<div class="klass">
        <div class="li-ic">${icon('calendar', 18)}</div>
        <div class="info">
          <div class="n">${c.name}</div>
          <div class="meta">${c.when} · ${c.instructor} · ${c.spots === 0 ? 'Full' : c.spots + ' spots left'}</div>
          ${rated ? `<div class="status now">You rated ★${rated}</div>` : ''}
        </div>${btn}</div>`;
    }).join('') + `<div class="dim small center">Free cancellation up to 3 hours before class. Repeated no-shows pause booking for 48 h.</div>`;
  }

  document.getElementById('c-train').innerHTML = `
    <header class="app-header"><div class="greeting">Train</div></header>
    <div class="seg">
      ${['workouts', 'trainers', 'classes'].map((s) =>
        `<button class="seg-btn ${segTrain === s ? 'active' : ''}" data-action="seg-train" data-s="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
    </div>
    ${body}`;
}

/* ================= GYM ================= */

function renderGym() {
  const g = state.guestPass;
  document.getElementById('c-gym').innerHTML = `
    <header class="app-header"><div class="greeting">Gym</div></header>

    ${state.locker ? `
    <div class="card">
      <div class="row">
        <div>${eyebrow('locker', 'My locker · this visit')}
          <b class="big-number">#${state.locker.number}</b>
          <div class="dim small">${state.locker.zone || 'Changing room A'}</div></div>
        <button class="lock-toggle ${state.locker.locked ? '' : 'open'}" data-action="toggle-locker">
          ${icon('lock', 16)} ${state.locker.locked ? 'Locked' : 'Open'}
        </button>
      </div>
      <div class="dim small">Assigned when you checked in — released automatically at checkout.</div>
      <div class="btn-row">
        <button class="book-btn" data-action="locker-help">Staff open (logged)</button>
        <button class="book-btn warn" data-action="locker-report">Report a problem</button>
      </div>
    </div>` : `
    <div class="card">
      ${eyebrow('locker', 'My locker')}
      <div class="dim small">A free locker is assigned automatically when you check in — the number appears here and on your home screen. Lock and unlock from your phone; it's released the moment you exit.</div>
      ${state.lastLocker ? `<div class="dim small">Last visit: locker #${state.lastLocker}</div>` : ''}
    </div>`}

    <div class="card">
      ${eyebrow('guest', 'Guest pass')}
      ${g ? `
        <div class="row"><b>${g.name}</b><span class="chip ${g.status === 'used' ? 'chip-ok' : 'chip-warn'}">${g.status === 'used' ? 'Visited ✓' : 'Invited — not visited yet'}</span></div>
        <div class="dim small">${g.phone ? g.phone + ' · ' : ''}${g.date || 'Any day'} · one visit · expires ${g.expires} · waiver signed at the desk · logged under your account</div>
        <div class="guest-code">${g.code}</div>
        ${g.status === 'used'
          ? `<button class="book-btn wide" data-action="cancel-guest">Done — clear pass</button>`
          : `<button class="book-btn warn wide" data-action="cancel-guest">Cancel invitation</button>`}`
      : `
        <div class="dim small">Invite a friend for one visit. Reception is told who to expect; your guest signs the waiver at the desk. The pass works once and expires in 48 h.</div>
        <button class="book-btn wide" data-action="create-guest">Create guest pass · $${PRICES.guest_pass} wallet</button>`}
    </div>

    ${(() => {
      const poolDown = (state.assetStatus || {})['Pool'];
      if (poolDown) return `
      <div class="card" style="border-left:4px solid var(--amber);">
        ${eyebrow('leaf', 'Pool')}
        <div class="row"><b>Pool area</b><span class="chip chip-warn">${poolDown.status}</span></div>
        <div class="dim small">Maintenance is on it — you'll be notified the moment it reopens.${poolDown.alt ? ' Meanwhile: ' + poolDown.alt + '.' : ''}</div>
      </div>`;
      return `
      <div class="card">
        ${eyebrow('leaf', 'Pool')}
        <div class="row"><b>Pool area</b><span class="chip chip-ok">Open · lifeguard on duty</span></div>
        <div class="dim small">26°C · 8 swimming now · 25 m, 6 lanes</div>
        ${state.poolLane ? `
          <div class="done-line">${icon('check', 17)} Lane ${state.poolLane.lane} reserved · ${state.poolLane.when} · 45 min</div>
          <button class="book-btn wide warn" data-action="pool-cancel">Cancel lane</button>` : `
          <div class="btn-row" style="margin-top:6px;">
            ${['Now', '6:00 PM', '7:00 PM'].map((t) => `<button class="book-btn" data-action="pool-lane" data-t="${t}">${t}</button>`).join('')}
          </div>
          <div class="dim small">Lane reservation is included in every plan — 45 minutes, shower before entering, no diving in shallow lanes.</div>`}
      </div>`;
    })()}

    <div class="card">
      ${eyebrow('car', 'Parking')}
      <div class="row"><span class="dim">Vehicle</span><b>${state.parking.plate}</b></div>
      <div class="row"><span class="dim">Reserved spot</span><b>${state.parking.spot}</b></div>
      ${state.checkedIn ? `<div class="row"><span class="dim">Parked since</span><b>${fmtTime(state.enteredAt)}</b></div>` : ''}
      ${parkingSpots ? `<div class="row"><span class="dim">Spots free right now</span><b class="ok">${parkingSpots.filter((p) => p.status === 'free').length} of ${parkingSpots.length}</b></div>` : ''}
      ${state.parking.carWash
        ? `<div class="done-line">${icon('check', 17)} Car wash in progress — ready before you finish</div>`
        : `<button class="book-btn wide" data-action="car-wash" ${state.checkedIn ? '' : 'disabled'}>Car wash while you train · $${PRICES.car_wash} wallet${state.checkedIn ? '' : ' (check in first)'}</button>`}
    </div>

    <div class="card">
      ${eyebrow('leaf', 'Recovery')}
      ${recovery.map((r) => `
        <div class="row">
          <div><b>${r.name}</b><div class="dim small">${r.dur} · $${r.price}</div></div>
          <button class="book-btn" data-action="book-recovery" data-r="${r.id}"
            ${state.recoveryBookings.some((b) => b.id === r.id) ? 'disabled' : ''}>
            ${state.recoveryBookings.some((b) => b.id === r.id) ? 'Booked ✓' : 'Book'}
          </button>
        </div>`).join('')}
    </div>

    ${Object.keys(state.assetStatus || {}).length ? `
    <div class="card" style="border-left:4px solid var(--amber);">
      ${eyebrow('tool', 'Equipment out of service')}
      ${Object.entries(state.assetStatus).map(([a, v]) => `
        <div class="row"><b>${a}</b><span class="chip chip-warn">${v.status}</span></div>
        ${v.alt ? `<div class="dim small">Alternative: <b>${v.alt}</b></div>` : ''}`).join('')}
      <div class="dim small">You'll be notified when it's repaired and verified.</div>
    </div>` : ''}

    <div class="card" id="reportCard">
      ${eyebrow('tool', 'Report an equipment issue')}
      <div class="dim small">In the gym you'd scan the QR sticker on the machine — pick one here instead.</div>
      <select class="input slim" id="repMachine">${machines.map((m) => `<option ${(state.assetStatus || {})[m] ? 'disabled' : ''}>${m}${(state.assetStatus || {})[m] ? ' — already reported' : ''}</option>`).join('')}</select>
      <select class="input slim" id="repIssue">${issueTypes.map((t) => `<option>${t}</option>`).join('')}</select>
      <button class="book-btn wide" data-action="report-issue">Send report</button>
      ${state.reports.length ? `
        <div class="divider"></div>
        ${state.reports.map((r) => `<div class="row"><div><b>${r.machine}</b><div class="dim small">${r.ref ? r.ref + ' · ' : ''}${r.issue} · ${r.when}</div></div><span class="chip ${r.status === 'Repaired' || r.status === 'Fixed' ? 'chip-ok' : 'chip-warn'}">${r.status}</span></div>`).join('')}` : ''}
    </div>

    ${state.lastResolved ? `
    <div class="card">
      ${eyebrow('check', 'Ticket ' + state.lastResolved.tkt + ' resolved')}
      ${state.lastResolved.rated
        ? `<div class="done-line">${icon('check', 17)} Thanks — you rated it ${'★'.repeat(state.lastResolved.rated)}</div>`
        : `<div class="dim small">How did we handle it?</div>
           <div class="btn-row">${[1, 2, 3, 4, 5].map((n) => `<button class="book-btn" data-action="rate-ticket" data-n="${n}">${'★'.repeat(n)}</button>`).join('')}</div>`}
      <button class="book-btn warn wide" data-action="reopen-ticket">Not fixed — reopen</button>
    </div>` : ''}

    <div class="card sos-card">
      ${eyebrow('alert', 'Need help?')}
      <div class="dim small">Alerts reception with your name and that you're ${state.checkedIn ? 'inside the gym' : 'at the gym'}. For injuries, equipment danger, or anything urgent.</div>
      <button class="sos-btn" data-action="sos">Help / SOS</button>
    </div>

    <div class="card">
      ${eyebrow('clock', 'My visits')}
      <div class="stats-row">
        <div class="stat"><div class="stat-v">${state.visits.filter((v) => v.date.startsWith('Jul')).length + (state.checkedIn ? 1 : 0)}</div><div class="stat-l">this month</div></div>
        <div class="stat"><div class="stat-v">${fmtDur(Math.round(state.visits.reduce((s, v) => s + v.dur, 0) / (state.visits.length || 1)))}</div><div class="stat-l">avg duration</div></div>
        <div class="stat"><div class="stat-v">City Center</div><div class="stat-l">top branch</div></div>
      </div>
      ${state.checkedIn ? `
        <div class="visit"><div class="d">Today</div>
          <div class="t">${fmtTime(state.enteredAt)} → <span class="live">inside</span></div>
          <div class="dur live">${fmtDur(insideMinutes())}</div></div>` : ''}
      ${state.visits.slice(0, 5).map((v) => `
        <div class="visit" data-action="visit-detail" data-v="${v.id}">
          <div class="d">${v.date}</div>
          <div class="t">${v.inT} → ${v.outT} ${v.extras.length ? `<span class="extras-dot">●&nbsp;${v.extras.length}</span>` : ''}</div>
          <div class="dur">${fmtDur(v.dur)}</div>
        </div>`).join('')}
      <div class="dim small center">Tap a visit for its full timeline</div>
    </div>`;
}

/* ================= FOOD ================= */

function renderFood() {
  let body = '';

  if (segFood === 'cafe') {
    /* live order status card — statuses come ONLY from café staff via the bus */
    const o = state.order;
    const statusCard = o ? `
      <div class="card" ${o.subOffer ? 'style="border:2px solid var(--deep, #124a38);"' : ''}>
        ${eyebrow('cafe', 'Your order · #' + (o.code || ''))}
        <div class="row"><b>${o.items}</b><b class="accent">$${o.total}</b></div>
        <div class="dim small">${o.custom && o.custom.length ? o.custom.join(' · ') + ' · ' : ''}${o.pay === 'reception' ? 'Pay at reception · ' : ''}${o.status}</div>
        ${o.subOffer ? `
          <div class="dim small" style="margin-top:6px;"><b>Substitution offered:</b> ${o.subOffer}</div>
          <button class="accent-btn slim" data-action="sub-accept">Accept ${o.subOffer}</button>
          <button class="book-btn wide warn" data-action="sub-decline" style="margin-top:6px;">No thanks — cancel &amp; refund</button>` : ''}
      </div>` : '';
    const recoCard = state.cafeReco ? `
      <div class="card" style="border-left:4px solid var(--deep, #124a38);">
        ${eyebrow('leaf', 'Suggested by ' + state.cafeReco.by)}
        <div class="row"><b>${state.cafeReco.item}</b></div>
        <div class="dim small">${state.cafeReco.note}</div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="book-btn" data-action="reco-add">Add to cart</button>
          <button class="book-btn warn" data-action="reco-dismiss">Not today</button>
        </div>
        <div class="dim small">A suggestion only — nothing is ordered or charged unless you check out.</div>
      </div>` : '';
    const lastOrder = (state.orderHistory || [])[0];
    const reorderCard = (!o && lastOrder && lastOrder.itemsArr) ? `
      <div class="card">
        <div class="row"><b>Order again?</b><span class="dim small">${lastOrder.when}</span></div>
        <div class="dim small">${lastOrder.items} · $${lastOrder.total}</div>
        <button class="book-btn wide" data-action="reorder" style="margin-top:8px;">Reorder — straight to checkout</button>
      </div>` : '';

    if (state.cafeOpen === false) {
      body = statusCard + `
      <div class="card" style="text-align:center;">
        ${eyebrow('cafe', 'Café paused')}
        <div style="font-size:14px; font-weight:600;">The café is not taking orders right now.</div>
        <div class="dim small" style="margin-top:4px;">Your active order (if any) is still being handled. Check back shortly.</div>
      </div>`;
    } else if (cafeCheckout) {
      /* ---- checkout: itemized, customized, allergens visible BEFORE paying ---- */
      const ids = Object.keys(cart);
      const hasShake = ids.some((id) => /shake/i.test(menu.find((m) => m.id === id)?.name || ''));
      const co = cafeCheckout;
      let total = ids.reduce((s, id) => s + cart[id] * menu.find((m) => m.id === id).price, 0);
      if (hasShake) { if (co.milk !== 'Regular milk') total += 0.5; if (co.banana) total += 1; }
      const allergens = [...new Set(ids.map((id) => menu.find((m) => m.id === id).allerg).filter(Boolean).join(' · ').split(' · ').filter(Boolean))];
      const kcal = ids.reduce((s, id) => s + cart[id] * menu.find((m) => m.id === id).cal, 0) + (co.banana ? 90 : 0);
      const declared = (state.allergies || []).join(', ');
      body = `
      <div class="card">
        ${eyebrow('cafe', 'Checkout')}
        ${ids.map((id) => { const m = menu.find((x) => x.id === id); return `<div class="row"><b>${m.name} ×${cart[id]}</b><span>$${m.price * cart[id]}</span></div>`; }).join('')}
        ${hasShake ? `
        <div class="dim small" style="margin:8px 0 4px;"><b>Customize your shake</b></div>
        <select class="input" data-coset="milk" style="margin-bottom:6px;">
          ${['Regular milk', 'Almond milk (+$0.50)', 'Oat milk (+$0.50)'].map((m) => `<option ${co.milk === m.split(' (')[0] ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <button class="book-btn wide ${co.banana ? '' : 'warn'}" data-action="co-toggle" data-k="banana">${co.banana ? '✓ ' : ''}Add banana +$1</button>
        <button class="book-btn wide ${co.noHoney ? '' : 'warn'}" data-action="co-toggle" data-k="noHoney" style="margin-top:6px;">${co.noHoney ? '✓ ' : ''}No honey</button>
        <button class="book-btn wide warn" disabled style="margin-top:6px; opacity:.55;">Add peanut butter — blocked</button>
        <div class="dim small">⚠ You declared a ${declared} allergy in your health profile — this add-on is blocked. Staff can review with a manager if this is outdated.</div>` : ''}
        <div class="dim small" style="margin-top:8px;">${allergens.length ? '⚠ Contains: ' + allergens.join(', ') + ' · prepared with shared equipment — not guaranteed allergen-free. ' : ''}≈${kcal} kcal total.</div>
        <div class="dim small" style="margin:8px 0 4px;"><b>Pickup</b></div>
        <select class="input" data-coset="pickup" style="margin-bottom:6px;">
          ${['Prepare now', 'Ready after workout', 'Pick a time — 6:30 PM'].map((p) => `<option ${co.pickup === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <div class="dim small" style="margin:4px 0;"><b>Payment</b></div>
        <select class="input" data-coset="pay" style="margin-bottom:8px;">
          <option ${co.pay === 'wallet' ? 'selected' : ''} value="wallet">Wallet ($${state.wallet} available)</option>
          <option ${co.pay === 'reception' ? 'selected' : ''} value="reception">Pay at reception (order waits until paid)</option>
        </select>
        <div class="row"><b>Total</b><b class="accent">$${total}</b></div>
        <button class="accent-btn slim" data-action="place-order">${co.pay === 'wallet' ? 'Pay $' + total + ' & send to café' : 'Send order — pay $' + total + ' at reception'}</button>
        <button class="book-btn wide warn" data-action="co-back" style="margin-top:6px;">Back to menu</button>
      </div>`;
    } else {
      const cats = [...new Set(menu.map((m) => m.cat))];
      const ids = Object.keys(cart);
      const count = ids.reduce((s, id) => s + cart[id], 0);
      const total = ids.reduce((s, id) => s + cart[id] * menu.find((m) => m.id === id).price, 0);
      body = statusCard + recoCard + reorderCard + cats.map((cat) =>
        `<div class="menu-cat">${cat}</div>` +
        menu.filter((m) => m.cat === cat).map((m) => {
          const av = (state.cafeAv || {})[m.name] || 'ok';
          const off = av === 'out';
          return `
          <div class="menu-item" ${off ? 'style="opacity:.45;"' : ''}>
            <div class="info">
              <div class="n">${m.name} <span class="accent">$${m.price}</span>
                ${off ? '<span class="macro warn">SOLD OUT</span>' : av === 'low' ? '<span class="macro warn">low stock</span>' : ''}</div>
              <div>
                <span class="macro">${m.cal} kcal</span><span class="macro">${m.p}P</span>
                <span class="macro">${m.c}C</span><span class="macro">${m.f}F</span>
                ${m.allerg ? `<span class="macro warn">⚠ ${m.allerg}</span>` : ''}
              </div>
            </div>
            <button class="qty-btn" data-action="qty" data-m="${m.id}" data-d="-1" ${off ? 'disabled' : ''}>−</button>
            <span class="qty">${cart[m.id] || 0}</span>
            <button class="qty-btn" data-action="qty" data-m="${m.id}" data-d="1" ${off ? 'disabled' : ''}>+</button>
          </div>`; }).join('')).join('') +
        (count ? `
          <div class="cart-bar">
            <div class="row"><b>${count} item${count > 1 ? 's' : ''} · $${total}</b><span class="dim small">customize at checkout</span></div>
            <button class="accent-btn slim" data-action="order">Review &amp; checkout</button>
          </div>` : '');
    }
  }

  if (segFood === 'plan') {
    const lp = state.mealPlanLive;
    if (lp) {
      const log = state.todayLog || {};
      body = `
      <div class="card" ${lp.status === 'sent' ? 'style="border:2px solid var(--deep, #124a38);"' : ''}>
        ${eyebrow('clipboard', `Plan v${lp.v} · ${lp.status === 'sent' ? 'awaiting your OK' : 'active'} · by ${lp.by}`)}
        <div class="dim small">${lp.goal} · ${lp.kcalT} kcal · ${lp.pT} g protein · review ${lp.review}</div>
        ${lp.v > 1 && lp.changelog ? `<div class="dim small" style="margin-top:4px;"><b>Changed in v${lp.v}:</b> ${lp.changelog}</div>` : ''}
        ${lp.status === 'sent' ? `
          <button class="accent-btn slim" data-action="plan-ack" style="margin-top:9px;">Acknowledge & start v${lp.v}</button>
          <div class="dim small center">Nothing is active until you confirm — ${lp.by} is told the moment you do.</div>` : `
          <div class="dim small">Started ${lp.startedAt || 'today'} · v${lp.v > 1 ? (lp.v - 1) + ' stays in your history' : '1'}</div>`}
      </div>
      ${lp.meals.map((m) => `
        <div class="meal">
          <div class="mn">${m.name} <span class="dim small">· ${m.time}</span></div>
          <div class="md">${m.items.map((i) => i.n + ' — ' + i.qty).join('<br>')}</div>
          <div class="dim small">${m.totals.kcal} kcal · ${m.totals.p} g protein</div>
          ${lp.status === 'active' ? `
          <div class="btn-row" style="margin-top:6px;">
            ${[['followed', '✓ Followed'], ['partly', '± Partly'], ['skipped', '✗ Skipped']].map(([k, l]) =>
              `<button class="book-btn ${log[m.name] === k ? '' : 'warn'}" data-action="nlog-set" data-meal="${m.name}" data-v="${k}">${l}</button>`).join('')}
          </div>` : ''}
        </div>`).join('')}
      ${lp.status === 'active' ? `
      <div class="card">
        <div class="row"><b>Today's log</b>
          <button class="book-btn ${log.water ? '' : 'warn'}" data-action="nlog-set" data-meal="water" data-v="1">💧 Water goal</button></div>
        <button class="accent-btn slim" data-action="nlog-send">Send today's log to ${lp.by}</button>
        <button class="book-btn wide warn" data-action="nutri-discomfort" style="margin-top:6px;">Report discomfort with this plan</button>
        <div class="dim small center">Logs are guidance, not judgment — substitutions from the approved list always count.</div>
      </div>` : ''}
      <button class="book-btn wide" data-action="book-nutritionist">Book a follow-up consultation · $${PRICES.nutritionist}</button>`;
    } else {
      body = `
      <div class="card">
        ${eyebrow('clipboard', 'Muscle gain · assigned by nutritionist')}
        <div class="dim small">2,850 kcal · 190 g protein · adjusted weekly from your check-ins</div>
      </div>
      ${mealPlan.map((m) => `
        <div class="meal"><div class="mn">${m.meal}</div><div class="md">${m.desc}</div>
        <div class="dim small">${m.macros}</div></div>`).join('')}
      <button class="book-btn wide" data-action="book-nutritionist">Book nutritionist consultation · $${PRICES.nutritionist}</button>
      <div class="dim small center">Plans are general guidance unless prepared by a licensed professional.</div>`;
    }
  }

  if (segFood === 'shop') {
    const cats = [...new Set(shop.map((s) => s.cat))];
    body = cats.map((cat) =>
      `<div class="menu-cat">${cat}</div>` +
      shop.filter((s) => s.cat === cat).map((s) => `
        <div class="menu-item">
          <div class="info">
            <div class="n">${s.name} <span class="accent">$${s.price}</span></div>
            <div class="meta">${s.note}</div>
          </div>
          <button class="book-btn" data-action="buy" data-s="${s.id}">Buy</button>
        </div>`).join('')).join('') +
      `<div class="dim small center">Click &amp; collect at reception · paid from wallet · member prices</div>`;
  }

  document.getElementById('c-food').innerHTML = `
    <header class="app-header"><div class="greeting">Food &amp; Shop</div></header>
    <div class="seg">
      <button class="seg-btn ${segFood === 'cafe' ? 'active' : ''}" data-action="seg-food" data-s="cafe">Café</button>
      <button class="seg-btn ${segFood === 'plan' ? 'active' : ''}" data-action="seg-food" data-s="plan">Meal plan</button>
      <button class="seg-btn ${segFood === 'shop' ? 'active' : ''}" data-action="seg-food" data-s="shop">Shop</button>
    </div>
    ${body}`;
}

/* ================= ACCOUNT ================= */

function renderAccount() {
  document.getElementById('c-account').innerHTML = `
    <header class="app-header"><div class="greeting">Account</div></header>

    <div class="card member-card">
      <div class="row">
        <div class="fam"><div class="avatar">${(state.memberName || 'S')[0]}</div>
          <div><b style="font-size:18px">${state.memberName}</b>
          <div class="member-sub">Member since ${state.memberSince} · ${branchInfo.name}</div></div></div>
        <span class="tier">${state.tier}</span>
      </div>
    </div>

    <div class="card">
      ${eyebrow('wallet', 'Wallet & credits')}
      <div class="row"><span class="dim">Balance</span><b class="big-number accent">$${state.wallet}</b></div>
      <div class="btn-row">
        <button class="book-btn" data-action="topup" data-amt="50">+ $50</button>
        <button class="book-btn" data-action="topup" data-amt="100">+ $100 <span class="bonus">+10 bonus</span></button>
      </div>
      <div class="divider"></div>
      ${state.walletTx.slice(0, 4).map((t) => `
        <div class="row"><span class="dim small">${t.label} · ${t.when}</span>
        <b class="${t.amount > 0 ? 'ok' : ''}">${t.amount > 0 ? '+' : ''}$${Math.abs(t.amount)}</b></div>`).join('')}
      <div class="dim small">Pays for café, trainers, recovery, guest passes and the shop.</div>
    </div>

    <div class="card">
      ${eyebrow('star', 'Loyalty points')}
      <div class="row"><span class="dim">Balance</span><b class="big-number accent">${state.points} pts</b></div>
      ${pointsRules.length
        ? pointsRules.map((r) => `<div class="row"><span class="dim small">${r.action}</span><b class="ok">+${r.points}</b></div>`).join('')
        : '<div class="dim small">Earn: +10 per visit · +15 per class · +20 per PR · +5 per café order</div>'}
      <div class="divider"></div>
      ${redeemOptions.map((r) => `
        <div class="row"><div><b>${r.name}</b><div class="dim small">${r.pts} pts</div></div>
        <button class="book-btn" data-action="redeem" data-r="${r.id}" ${state.points < r.pts ? 'disabled' : ''}>Redeem</button></div>`).join('')}
    </div>

    <div class="card">
      ${eyebrow('receipt', 'Subscription')}
      <div class="row"><span class="dim">Plan</span><b>${state.subPlan}</b></div>
      <div class="row"><span class="dim">Status</span><b class="${state.frozen ? 'warn' : 'ok'}">${state.frozen ? 'frozen' : 'active'}</b></div>
      <div class="row"><span class="dim">Valid until</span><b>${state.subEnds}</b></div>
      <div class="row"><span class="dim">Freeze days used</span><b>${state.freezeDaysUsed} / ${CONFIG.freeze_days_per_year}</b></div>
      <div class="row"><span class="dim">Renewal amount</span><b>$480 · 6 months</b></div>
      <div class="row"><span class="dim">Included</span><b class="small">Gym · classes · 1 assessment/quarter</b></div>
      <div class="row"><span class="dim">Auto-renew</span>
        <button class="switch ${state.autoRenew ? 'on' : ''}" data-action="auto-renew" role="switch" aria-checked="${state.autoRenew}"><span></span></button></div>
      ${state.pendingPlanChange ? `<div class="done-line">${icon('clock', 17)} ${state.pendingPlanChange} — reception will confirm</div>` : ''}
      <div class="btn-row">
        <button class="book-btn" data-action="renew-sub">Renew +6 months</button>
        <button class="book-btn ${state.frozen ? '' : 'warn'}" data-action="freeze">${state.frozen ? 'Unfreeze now' : 'Freeze 7 days'}</button>
      </div>
      <button class="book-btn wide" data-action="renew-request">Request renewal at reception (pay at desk)</button>
      <div class="btn-row">
        <button class="book-btn" data-action="upgrade-request" ${state.pendingPlanChange ? 'disabled' : ''}>Request upgrade</button>
        <button class="book-btn warn" data-action="cancel-request" ${state.pendingPlanChange ? 'disabled' : ''}>Request cancellation</button>
      </div>
      <div class="dim small">Freeze up to ${CONFIG.freeze_days_per_year} days/year · cancellation needs 30 days notice · plan changes start next cycle and are confirmed by reception — nothing changes until they do.</div>
    </div>

    ${plansCatalog.length ? `
    <div class="card">
      ${eyebrow('receipt', 'Membership plans')}
      ${plansCatalog.map((p) => `
        <div class="plan ${p.name.includes('6-Month') ? 'current' : ''}">
          <div class="row"><b>${p.name}</b><b class="accent">${p.price}</b></div>
          <div class="dim small">${p.duration}${p.benefits ? ' · ' + p.benefits : ''}</div>
          ${p.name.includes('6-Month') ? '<div class="ok small" style="font-weight:700">Your current plan</div>' : ''}
        </div>`).join('')}
      <div class="dim small">Upgrades and downgrades are handled at reception — changes start from your next cycle.</div>
    </div>` : ''}

    <div class="card">
      ${eyebrow('users', 'Family')}
      ${state.family.map((f, i) => `
        <div class="row"><div class="fam"><div class="avatar sm tone-${(i + 1) % 4}">${f.initial}</div>
        <div><b>${f.name}</b><div class="dim small">${f.rel}</div></div></div>
        <span class="chip chip-ok">Active</span></div>`).join('')}
      <div class="dim small">You manage payments — each person has their own phone key and private history.</div>
    </div>

    <div class="card">
      ${eyebrow('gift', 'Refer a friend')}
      <div class="row"><b class="guest-code sm">${CONFIG.referral_code}</b>
        <button class="book-btn" data-action="copy-ref">Share</button></div>
      <div class="dim small">They get one free week — you get 300 points when they join.</div>
    </div>

    <div class="card">
      ${eyebrow('receipt', 'Invoices')}
      ${state.invoices.slice(0, 5).map((i) => `<div class="inv"><span>${i.label}</span><span class="dim">${i.date} · $${i.amount}</span></div>`).join('')}
    </div>

    <div class="card">
      ${eyebrow('phone', 'Registered device')}
      <div class="row"><span class="dim">This phone</span><b class="ok">active key</b></div>
      <div class="dim small">One phone per account. Switching requires reception approval — the old device is deactivated automatically.</div>
    </div>

    <div class="card">
      ${eyebrow('alert', 'Entry & exit problems')}
      ${state.problems.length
        ? state.problems.map((p) => `<div class="problem">⚠ ${p}</div>`).join('')
        : '<div class="dim small">No failed attempts recorded.</div>'}
    </div>

    <div class="card">
      ${eyebrow('star', 'Appearance')}
      <div class="dim small">Pick the club's palette — the whole app recolors instantly.</div>
      <div class="swatches">
        ${THEMES.map((t) => `
          <button class="swatch ${(state.theme || CONFIG.theme || 'Club Green') === t.name ? 'current' : ''}" data-action="theme" data-t="${t.name}">
            <span class="sw-dots"><i style="background:${t.deep}"></i><i style="background:${t.accent}"></i><i style="background:${t.tint}"></i></span>
            <span class="sw-name">${t.name}</span>
            <span class="sw-mood">${t.mood}</span>
          </button>`).join('')}
      </div>
    </div>

    <div class="card">
      ${eyebrow('shield', 'Privacy')}
      <div class="btn-row">
        <button class="book-btn" data-action="export-data">Export my data</button>
        <button class="book-btn warn" data-action="delete-data">Delete my data</button>
      </div>
      <div class="dim small">Your movement, health and payment data belongs to you. Health integrations are opt-in only.</div>
    </div>

    <button class="ghost-btn danger" data-action="signout">Sign out</button>`;
}

/* ================= notifications & visit detail ================= */

function renderNotifs() {
  document.getElementById('c-notifs').innerHTML = state.notifications.map((n) =>
    `<div class="notif ${n.unread ? 'unread' : ''}">
      <div class="nt">${n.title}</div><div class="nb">${n.body}</div><div class="nd">${n.when}</div>
    </div>`).join('');
  state.notifications.forEach((n) => n.unread = false);
  save();
}

function renderVisitDetail(id) {
  const v = state.visits.find((x) => x.id == id);
  if (!v) return;
  document.getElementById('vdTitle').textContent = `${v.date} · ${fmtDur(v.dur)}`;
  const steps = [
    { time: v.inT, title: 'Entered — Main gate', sub: 'City Center Branch · QR' },
    ...v.extras,
    { time: v.outT, title: 'Exited — Main gate', sub: 'Visit complete · +10 pts' },
  ];
  document.getElementById('c-visitdetail').innerHTML = `<div class="tl">` +
    steps.map((s, i) => `<div class="tl-item">
      <div class="tl-rail"><div class="tl-dot"></div>${i < steps.length - 1 ? '<div class="tl-line"></div>' : ''}</div>
      <div class="tl-body">
        <div class="tl-time">${s.time}</div>
        <div class="tl-title">${s.title}</div>
        <div class="tl-sub">${s.sub}</div>
      </div></div>`).join('') + '</div>';
  show('visitdetail');
}

/* ================= entry pass + QR ================= */

let QR_SECONDS = 25;
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
}

function rotateQR() { drawQR(); secsLeft = QR_SECONDS; }

function openPass() {
  QR_SECONDS = Number(CONFIG.qr_refresh_seconds) || 25;
  const nameEl = document.querySelector('#passOk .member-name');
  if (nameEl) nameEl.textContent = state.memberName;
  const avEl = document.querySelector('#passOk .avatar');
  if (avEl) avEl.textContent = (state.memberName || 'S')[0];
  const face = document.getElementById('faceid');
  face.classList.remove('hidden');
  setTimeout(() => face.classList.add('hidden'), 1200);

  const ok = document.getElementById('passOk');
  const denied = document.getElementById('passDenied');

  if (state.userStatus === 'expired' && !state.checkedIn) {
    ok.hidden = true; denied.hidden = false;
    document.getElementById('deniedReason').textContent =
      'No active subscription. Renew at reception to enter the gym.';
    const cta = document.getElementById('deniedCta');
    cta.textContent = 'OK';
    cta.onclick = () => show('home');
    if (!state.problemLogged) {
      state.problemLogged = true;
      state.problems.push(`Entry denied — subscription expired · ${todayLabel()}`);
      save();
    }
    return;
  }

  if (state.frozen && !state.checkedIn) {
    ok.hidden = true; denied.hidden = false;
    document.getElementById('deniedReason').textContent =
      'Your membership is frozen. Unfreeze it to enter — or see reception.';
    const cta = document.getElementById('deniedCta');
    cta.textContent = 'Unfreeze membership';
    cta.onclick = () => {
      state.frozen = false; save();
      toast('Membership unfrozen — welcome back');
      show('pass');
    };
    if (!state.problemLogged) {
      state.problemLogged = true;
      state.problems.push(`Entry denied — membership frozen · ${todayLabel()}`);
      save();
    }
    return;
  }

  ok.hidden = false; denied.hidden = true;
  const purpose = document.getElementById('passPurpose');
  purpose.textContent = state.checkedIn ? 'Scan to EXIT' : 'Scan to ENTER';
  purpose.classList.toggle('exit', state.checkedIn);

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

function doCheckout() {
  const mins = insideMinutes() || 1;
  state.visits.unshift({
    id: Date.now(), date: todayLabel(),
    inT: fmtTime(state.enteredAt), outT: fmtTime(Date.now()), dur: mins,
    extras: [...state.sessionEvents],
  });
  state.checkedIn = false;
  state.enteredAt = null;
  state.leftGymPrompt = false;
  state.sessionEvents = [];
  state.order = null;
  state.parking.carWash = false;
  state.challenge.done = Math.min(state.challenge.target, state.challenge.done + 1);
  state.points += POINTS.visit;
  // pay out the challenge reward exactly once when the target is reached
  if (state.challenge.done >= state.challenge.target && !state.challengeRewarded) {
    state.challengeRewarded = true;
    state.points += POINTS.challenge;
    pushNotif('Challenge complete!', `${state.challenge.name} finished — +${POINTS.challenge} pts. ${state.challenge.reward.includes('shake') ? 'Your free shake is waiting at the café.' : ''}`);
  }
  if (state.locker) {
    if (!state.locker.locked) {
      pushNotif('Locker left open', `Locker ${state.locker.number} was open when you exited — staff have been notified to secure it.`);
    }
    state.visits[0].extras.push({ time: fmtTime(Date.now()), title: `Locker ${state.locker.number} released`, sub: 'Back in the pool for the next member' });
    state.lastLocker = state.locker.number;
    state.locker = null;
  }
  save();
  show('home');
  toast(`Checked out · ${fmtDur(mins)} · +10 pts`);
}

document.getElementById('gateBtn').onclick = () => {
  const result = document.getElementById('gateResult');
  const entering = !state.checkedIn;

  result.hidden = false;
  result.innerHTML = `<div class="big">${entering ? '✅' : '👋'}</div>
    <div>${entering ? 'Gate opened — welcome in!' : 'Gate opened — see you soon!'}</div>
    <div class="sub">${entering ? 'Session started · anti-passback armed' : 'Visit recorded · ' + fmtDur(insideMinutes() || 1)}</div>`;

  if (entering) {
    state.checkedIn = true;
    state.enteredAt = Date.now();
    state.sessionEvents = [];
    // the gate tells the building: trainers with a session today get an arrival alert
    GymBus.send('gate-entry', { member: state.memberName, time: fmtTime(Date.now()) }, 'member-app');
    // assign a free locker from the Lockers table (fallback: random number)
    let number, zone = 'Changing room A';
    const freeLockers = (lockersPool || []).filter((l) => l.status === 'free');
    if (freeLockers.length) {
      const pick = freeLockers[Math.floor(Math.random() * freeLockers.length)];
      number = pick.number; zone = pick.zone || zone;
    } else {
      number = 12 + Math.floor(Math.random() * 68);
    }
    state.locker = { number, zone, locked: true };
    state.sessionEvents.push({ time: fmtTime(Date.now()), title: `Locker ${number} assigned`, sub: 'Yours for this visit · unlock from the app' });
    pushNotif(`Your locker today: #${number}`, 'Assigned for this visit only. Lock and unlock it from the Gym tab — it frees up automatically when you check out.');
    if (state.order && !state.order.busId) { // legacy pre-bus orders only — café staff drive real statuses
      state.order.status = 'Preparing — ready when you finish';
      state.sessionEvents.push({ time: fmtTime(Date.now()), title: 'Café order confirmed', sub: `${state.order.items} · $${state.order.total} wallet` });
    }
    save();
    setTimeout(() => { result.hidden = true; show('home'); toast('Checked in · City Center Branch'); }, 1600);
  } else {
    setTimeout(() => { result.hidden = true; doCheckout(); }, 1600);
  }
};

document.getElementById('simLeave').onclick = () => {
  if (!state.checkedIn) return;
  state.leftGymPrompt = true;
  pushNotif('Forgot to check out?', 'It looks like you left the gym. Open the app to check out — the exit scanner remains the official record.');
  save();
  show('home');
  toast('Geofence: phone left the gym area');
};

/* ================= delegated actions ================= */

document.getElementById('screen').addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-coset]');
  if (!el || !cafeCheckout) return;
  const k = el.dataset.coset;
  cafeCheckout[k] = k === 'milk' ? el.value.split(' (')[0] : el.value;
  renderFood();
});

document.getElementById('screen').addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;

  if (a === 'open-pass') show('pass');
  if (a === 'inbox') show('notifications');
  if (a === 'goto-account') show('account');
  if (a === 'goto-gym') show('gym');
  if (a === 'goto-gym-report') { show('gym'); document.getElementById('reportCard')?.scrollIntoView({ behavior: 'smooth' }); }

  if (a === 'banner-checkout') doCheckout();
  if (a === 'banner-dismiss') { state.leftGymPrompt = false; save(); renderHome(); }

  if (a === 'seg-train') { segTrain = el.dataset.s; renderTrain(); }
  if (a === 'seg-food') { segFood = el.dataset.s; renderFood(); }

  if (a === 'log-workout') {
    state.workoutLogged = true;
    state.prs.unshift({ name: 'Bench press', value: '87.5 kg', when: 'Today' });
    save(); earnPoints(POINTS.pr, 'new bench PR'); renderTrain();
    if (state.checkedIn) state.sessionEvents.push({ time: fmtTime(Date.now()), title: 'Workout logged — Push day', sub: 'New PR: bench 87.5 kg' });
  }
  if (a === 'book-assessment') {
    if (!payWallet(PRICES.assessment, 'Fitness assessment')) return;
    state.assessment.next = 'Thu · 5:00 PM';
    save(); renderTrain();
    pushNotif('Assessment booked', 'Thursday 5:00 PM — wear training clothes; takes about 40 minutes.');
    toast('Assessment booked · Thu 5:00 PM');
  }
  if (a === 'renew-pkg') {
    state.pkgUsed = 0;
    state.invoices.unshift({ label: 'PT package (10 sessions)', date: 'Today', amount: PRICES.pt_package });
    save(); renderTrain();
    toast('Package renewed — 10 sessions added');
  }
  if (a === 'book-trainer') {
    const t = trainers[Number(el.dataset.i)];
    const published = (state.trainerSlots || {})[t.name];
    if (published && !published.length) { toast(`${t.name} has no open slots right now — check back`); return; }
    state.pickSlot = { trainer: t.name, price: t.price, slots: published || ['Tomorrow · 6:00 PM'] };
    save(); renderTrain();
  }
  if (a === 'book-slot') {
    const p = state.pickSlot; if (!p) return;
    const slot = el.dataset.slot;
    const busId = GymBus.send('pt-request', { member: state.memberName, trainer: p.trainer, slot }, 'member-app');
    state.booking = { trainer: p.trainer, when: slot, price: p.price, status: 'requested', busId };
    state.pickSlot = null;
    save(); renderTrain();
    toast(`Request sent for ${slot} — ${p.trainer} accepts, proposes a time or declines`);
  }
  if (a === 'book-cancel') { state.pickSlot = null; save(); renderTrain(); }
  if (a === 'pt-accept-time') {
    const b = state.booking; if (!b || b.status !== 'proposed') return;
    GymBus.update(b.busId, 'accepted', state.memberName, b.when);
    b.status = 'accepted'; b.note = null; save(); renderTrain();
    pushNotif('Session confirmed', `${b.trainer} · ${b.when} — on both calendars.`);
  }
  if (a === 'pt-confirm') {
    const p = state.pendingPt; if (!p) return;
    // idempotency: a replayed confirmation can never deduct twice
    if (GymBus.isProcessed(p.busId + ':deduct', 'member')) { state.pendingPt = null; save(); renderTrain(); return; }
    GymBus.markProcessed(p.busId + ':deduct', 'member');
    GymBus.update(p.busId, 'confirmed', state.memberName, 'Confirmed in app');
    state.pkgUsed = Math.min(state.pkgTotal, state.pkgUsed + 1);
    (p.prs || []).forEach((pr) => state.prs.unshift({ name: pr.name, value: pr.value, when: 'Today' }));
    if (state.checkedIn) state.sessionEvents.push({ time: fmtTime(Date.now()), title: `PT session confirmed — ${p.trainer}`, sub: `Session ${state.pkgUsed} of ${state.pkgTotal}${p.prs && p.prs.length ? ' · new PR: ' + p.prs.map((x) => x.name).join(', ') : ''}` });
    state.pendingPt = null; save(); renderTrain();
    if (p.prs && p.prs.length) earnPoints(POINTS.pr, 'new PR');
    pushNotif('Session completed', `${state.pkgUsed} used · ${state.pkgTotal - state.pkgUsed} remaining. ${p.trainer}'s notes are saved to your progress.`);
    toast(`Session completed · ${state.pkgUsed} used · ${state.pkgTotal - state.pkgUsed} remaining`);
  }
  if (a === 'pt-dispute') {
    const p = state.pendingPt; if (!p) return;
    const r = prompt('Tell us what happened — this goes to the manager with entry records:', '');
    if (r == null) return;
    GymBus.update(p.busId, 'disputed', state.memberName, r || 'No details given');
    state.pendingPt = null; save(); renderTrain();
    pushNotif('Sent to manager review', 'No session was deducted. The manager compares trainer notes with entry records and gets back to you.');
  }
  if (a === 'class') {
    const id = el.dataset.c, act = el.dataset.a;
    if (act === 'book') {
      const c = classes.find((x) => x.id === id);
      const bt = state.booking && state.booking.when && c && c.when && (state.booking.when.match(/\d+:\d+ [AP]M/) || [])[0];
      if (bt && c.when.includes(bt)) { toast(`Clashes with your PT session (${state.booking.when}) — pick another class`); return; }
      state.classState[id] = 'booked'; earnPoints(POINTS.class, 'class reserved');
      GymBus.send('class-book', { member: state.memberName, name: c.name }, 'member-app');
    }
    if (act === 'waitlist') {
      state.classState[id] = 'waitlist';
      const cw = classes.find((x) => x.id === id);
      if (cw) GymBus.send('class-waitlist', { member: state.memberName, name: cw.name }, 'member-app');
      toast("On the waitlist — you'll get the first opened space");
    }
    if (act === 'cancel') {
      const cc = classes.find((x) => x.id === id);
      delete state.classState[id];
      if (cc) GymBus.send('class-cancel', { member: state.memberName, name: cc.name }, 'member-app');
      toast('Booking cancelled — your space goes to the waitlist');
    }
    save(); renderTrain();
  }

  if (a === 'offer-accept') {
    const o = state.classOffer; if (!o) return;
    if (GymBus.isProcessed(o.busId + ':answer', 'member')) { state.classOffer = null; save(); renderTrain(); return; }
    GymBus.markProcessed(o.busId + ':answer', 'member');
    GymBus.update(o.busId, 'accepted', state.memberName);
    const co = classes.find((x) => x.name === o.name);
    if (co) state.classState[co.id] = 'booked';
    state.classOffer = null;
    save(); renderTrain();
    earnPoints(POINTS.class, 'class reserved');
    pushNotif("You're in — " + o.name, 'Promoted from the waitlist. Your booking is confirmed.');
    toast('Space confirmed — see you in ' + o.name);
  }
  if (a === 'offer-decline') {
    const o = state.classOffer; if (!o) return;
    if (GymBus.isProcessed(o.busId + ':answer', 'member')) { state.classOffer = null; save(); renderTrain(); return; }
    GymBus.markProcessed(o.busId + ':answer', 'member');
    GymBus.update(o.busId, 'declined', state.memberName);
    state.classOffer = null;
    save(); renderTrain();
    toast('Declined — the space goes to the next person');
  }
  if (a === 'toggle-locker') {
    if (!state.locker) return;
    state.locker.locked = !state.locker.locked;
    save(); renderGym();
    toast(state.locker.locked ? `Locker ${state.locker.number} locked` : `Locker ${state.locker.number} open`);
  }
  if (a === 'create-guest') {
    const gname = prompt("Guest's full name (reception checks ID against this):", '');
    if (!gname) return;
    const gphone = prompt("Guest's phone:", '03 ');
    if (gphone == null) return;
    if (!payWallet(PRICES.guest_pass, 'Guest pass')) return;
    const gcode = 'GST-' + String(Date.now()).slice(-6);
    state.guestPass = { name: gname, phone: gphone, code: gcode, date: 'Tomorrow', expires: 'in 48 h', status: 'invited' };
    GymBus.send('ticket', { tkt: gcode, member: state.memberName, subject: `Expected guest — ${gname} (${gphone}) · one visit · check ID + waiver at desk` }, 'member-app');
    save(); renderGym();
    pushNotif('Guest invited', `${gname} — code ${gcode}. Reception is expecting them; waiver is signed at the desk.`);
    toast(`Guest pass created · $${PRICES.guest_pass} wallet`);
  }
  if (a === 'cancel-guest') {
    const wasUsed = state.guestPass && state.guestPass.status === 'used';
    state.guestPass = null; save(); renderGym();
    toast(wasUsed ? 'Pass archived' : 'Invitation cancelled — reception notified');
  }
  if (a === 'pool-lane') {
    if (state.poolLane) return;
    const lane = 1 + Math.floor(Math.random() * 6);
    state.poolLane = { lane, when: el.dataset.t === 'Now' ? 'Now · until ' + fmtTime(Date.now() + 45 * 60000) : 'Today · ' + el.dataset.t };
    if (state.checkedIn) state.sessionEvents.push({ time: fmtTime(Date.now()), title: `Pool lane ${lane} reserved`, sub: state.poolLane.when + ' · 45 min' });
    save(); renderGym();
    pushNotif('Lane ' + lane + ' reserved', state.poolLane.when + ' · 45 minutes. Shower before entering; the lifeguard has your name.');
    toast('Lane ' + lane + ' is yours · ' + state.poolLane.when);
  }
  if (a === 'pool-cancel') {
    state.poolLane = null; save(); renderGym();
    toast('Lane released — it opens up for the next swimmer');
  }
  if (a === 'locker-help') {
    if (!state.locker) return;
    GymBus.send('ticket', { tkt: 'TKT-' + String(Date.now()).slice(-5), member: state.memberName, subject: `Manual locker open — #${state.locker.number} (${state.locker.zone || 'Changing room A'}) · identity check required, opening is logged` }, 'member-app');
    pushNotif('Staff on the way', `Locker #${state.locker.number} — staff verify it's yours before opening. Every manual opening is logged.`);
    toast('Reception notified — staff coming to your locker');
  }
  if (a === 'locker-report') {
    if (!state.locker) return;
    const ref = 'REP-' + String(Date.now()).slice(-4);
    const busId = GymBus.send('report', { ref, machine: `Locker #${state.locker.number}`, issue: 'Lock not responding', member: state.memberName }, 'member-app');
    state.reports.unshift({ ref, machine: `Locker #${state.locker.number}`, issue: 'Lock not responding', when: 'Just now', status: 'Submitted', busId });
    save(); renderGym();
    toast(ref + ' sent — maintenance notified');
  }
  if (a === 'upgrade-request') {
    GymBus.send('renewal', { member: state.memberName, plan: 'Upgrade → 12-Month · Performance · $720/year (from next cycle)', price: 720 }, 'member-app');
    state.pendingPlanChange = 'Upgrade to 12-Month requested';
    save(); renderAccount();
    pushNotif('Upgrade requested', 'Reception prepares the 12-Month plan — pay at the desk. Your current plan runs until they confirm.');
    toast('Upgrade request sent to reception');
  }
  if (a === 'cancel-request') {
    GymBus.send('ticket', { tkt: 'TKT-' + String(Date.now()).slice(-5), member: state.memberName, subject: 'Cancellation request — 30-day notice · please contact me about freeze/downgrade options first' }, 'member-app');
    state.pendingPlanChange = 'Cancellation requested (30-day notice)';
    save(); renderAccount();
    pushNotif('Cancellation requested', 'Nothing changes yet — reception will contact you to confirm, and may offer a freeze or downgrade instead.');
    toast('Request sent — reception will contact you');
  }
  if (a === 'rate-ticket') {
    if (!state.lastResolved) return;
    state.lastResolved.rated = Number(el.dataset.n);
    save(); renderGym();
    toast('Thanks for the feedback' + (state.lastResolved.rated >= 4 ? ' 💚' : " — we'll do better"));
  }
  if (a === 'reopen-ticket') {
    if (!state.lastResolved) return;
    const old = state.lastResolved.tkt;
    GymBus.send('ticket', { tkt: 'TKT-' + String(Date.now()).slice(-5), member: state.memberName, subject: `Reopened ${old} — issue not actually fixed` }, 'member-app');
    state.lastResolved = null;
    save(); renderGym();
    pushNotif('Ticket reopened', `${old} is back with reception as a new ticket — sorry about that.`);
  }
  if (a === 'car-wash') {
    if (!state.checkedIn) return;
    if (!payWallet(PRICES.car_wash, 'Car wash')) return;
    state.parking.carWash = true;
    state.sessionEvents.push({ time: fmtTime(Date.now()), title: 'Car wash started', sub: `Basic wash · $${PRICES.car_wash} wallet` });
    save(); renderGym();
    toast('Car wash started — ready before you finish');
  }
  if (a === 'book-recovery') {
    const r = recovery.find((x) => x.id === el.dataset.r);
    if (!payWallet(r.price, r.name)) return;
    state.recoveryBookings.push({ ...r, when: 'Today · after workout' });
    if (state.checkedIn) state.sessionEvents.push({ time: fmtTime(Date.now()), title: r.name, sub: `${r.dur} · $${r.price} wallet` });
    save(); renderGym();
    toast(`${r.name} booked · $${r.price} wallet`);
  }
  if (a === 'report-issue') {
    const machine = document.getElementById('repMachine').value;
    const issue = document.getElementById('repIssue').value;
    const ref = 'REP-' + String(Date.now()).slice(-4);
    const busId = GymBus.send('report', { member: state.memberName, machine, issue, ref });
    state.reports.unshift({ machine, issue, when: 'Just now', status: 'Submitted', ref, busId });
    save(); renderGym();
    pushNotif('Report ' + ref + ' received', `${machine} — "${issue}". Status changes when staff act on it.`);
    toast('Report ' + ref + ' sent to maintenance');
  }
  if (a === 'sos') startSOS();
  if (a === 'support') openSupport();
  if (a === 'ob-next') obNext();
  if (a === 'ob-back') { if (obStep === 0) show('login'); else { obStep--; renderOnboard(); } }
  if (a === 'ob-finish') {
    const nameEl = document.getElementById('loginName');
    if (nameEl && obData.sign) nameEl.value = obData.sign;
    toast('Activated — reception will assign your plan');
    show('login');
  }
  if (a === 'visit-detail') renderVisitDetail(el.dataset.v);

  if (a === 'qty') {
    const id = el.dataset.m;
    cart[id] = Math.max(0, (cart[id] || 0) + Number(el.dataset.d));
    if (cart[id] === 0) delete cart[id];
    renderFood();
  }
  if (a === 'order') {
    if (!Object.keys(cart).length) return;
    if (state.cafeOpen === false) { toast('The café is paused — not taking orders right now'); return; }
    if (state.order) { toast('You already have an open order — wait for it or cancel it first'); return; }
    cafeCheckout = { milk: 'Regular milk', banana: false, noHoney: false, pickup: 'Ready after workout', pay: 'wallet' };
    renderFood();
  }
  if (a === 'co-toggle') { cafeCheckout[el.dataset.k] = !cafeCheckout[el.dataset.k]; renderFood(); }
  if (a === 'co-back') { cafeCheckout = null; renderFood(); }
  if (a === 'place-order') {
    const ids = Object.keys(cart);
    if (!ids.length) { cafeCheckout = null; renderFood(); return; }
    if (state.cafeOpen === false) { toast('The café is paused — not taking orders right now'); cafeCheckout = null; renderFood(); return; }
    const co = cafeCheckout;
    const hasShake = ids.some((id) => /shake/i.test(menu.find((m) => m.id === id)?.name || ''));
    let total = ids.reduce((s, id) => s + cart[id] * menu.find((m) => m.id === id).price, 0);
    const custom = [];
    if (hasShake) {
      if (co.milk !== 'Regular milk') { total += 0.5; custom.push(co.milk); }
      if (co.banana) { total += 1; custom.push('Add banana'); }
      if (co.noHoney) custom.push('No honey');
    }
    if (co.pay === 'wallet' && !payWallet(total, 'Café order')) return;
    const code = 'C-' + (1000 + Math.floor(Math.random() * 9000));
    const items = ids.map((id) => { const m = menu.find((x) => x.id === id); return { n: m.name, qty: cart[id], price: m.price, kcal: m.cal || 0, p: m.p || 0 }; });
    const allergens = [...new Set(items.map((i) => menu.find((m) => m.name === i.n).allerg).filter(Boolean).join(' · ').split(' · ').filter(Boolean))];
    const busId = GymBus.send('cafe-order', {
      member: state.memberName, code, items, custom, allergens, total,
      declaredAllergies: state.allergies || [],
      pay: co.pay, pickup: co.pickup,
    }, 'member-app');
    state.order = {
      busId, code, total, pay: co.pay, custom, itemsArr: items,
      items: items.map((i) => (i.qty > 1 ? i.qty + '× ' : '') + i.n).join(', '),
      status: co.pay === 'wallet' ? 'Sent to café — waiting for them to start' : 'Waiting for payment at reception — café starts after you pay',
    };
    if (state.checkedIn) state.sessionEvents.push({ time: fmtTime(Date.now()), title: 'Café order ' + code, sub: `${state.order.items} · $${total}${co.pay === 'wallet' ? ' wallet' : ' — pay at reception'}` });
    cart = {}; cafeCheckout = null;
    save(); renderFood();
    toast(co.pay === 'wallet' ? `Order ${code} sent · $${total} from wallet` : `Order ${code} sent — pay $${total} at reception`);
  }
  if (a === 'sub-accept') {
    const o = state.order; if (!o || !o.subOffer) return;
    GymBus.update(o.busId, 'sub-accepted', state.memberName, o.subOffer);
    o.items = o.subOffer; o.custom = []; o.subOffer = null;
    o.status = 'Substitution accepted — waiting for café';
    save(); renderFood();
    toast('Swapped — the café will confirm shortly');
  }
  if (a === 'reorder') {
    const h = (state.orderHistory || [])[0];
    if (!h || !h.itemsArr || state.order) return;
    if (state.cafeOpen === false) { toast('The café is paused right now'); return; }
    cart = {};
    let missing = null;
    h.itemsArr.forEach((i) => {
      const m = menu.find((x) => x.name === i.n);
      if (!m) { missing = i.n; return; }
      if (((state.cafeAv || {})[m.name] || 'ok') === 'out') { missing = i.n; return; }
      cart[m.id] = i.qty;
    });
    if (missing && !Object.keys(cart).length) { toast(missing + ' is unavailable right now'); return; }
    cafeCheckout = { milk: 'Regular milk', banana: false, noHoney: false, pickup: 'Ready after workout', pay: 'wallet' };
    renderFood();
    toast(missing ? missing + ' is unavailable — rest of the order loaded' : 'Loaded — review and pay');
  }
  if (a === 'sub-decline') {
    const o = state.order; if (!o || !o.subOffer) return;
    GymBus.update(o.busId, 'sub-declined', state.memberName);
    o.subOffer = null; save(); renderFood();
    toast('Declined — the café will cancel and refund');
  }
  if (a === 'buy') {
    const s = shop.find((x) => x.id === el.dataset.s);
    if (!payWallet(s.price, s.name)) return;
    pushNotif('Ready for pickup', `${s.name} is waiting at reception — collect it on your next visit.`);
    toast(`${s.name} — collect at reception`);
  }
  if (a === 'book-nutritionist') {
    if (!payWallet(PRICES.nutritionist, 'Nutritionist consultation')) return;
    GymBus.send('nutri-consult', { member: state.memberName, slot: 'Sat · 11:00 AM' }, 'member-app');
    pushNotif('Consultation booked', 'Nutritionist consultation — Saturday 11:00 AM. It is on Rima D.’s schedule.');
    save();
    toast('Nutritionist booked · Sat 11:00 AM');
  }
  if (a === 'plan-ack') {
    const lp = state.mealPlanLive; if (!lp || lp.status !== 'sent') return;
    if (GymBus.isProcessed(lp.busId + ':ack', 'member')) return;
    GymBus.markProcessed(lp.busId + ':ack', 'member');
    GymBus.update(lp.busId, 'acknowledged', state.memberName);
    lp.status = 'active'; lp.startedAt = 'today';
    state.todayLog = {};
    save(); renderFood();
    pushNotif('Plan v' + lp.v + ' active', `${lp.by} is notified — next review ${lp.review}.`);
    toast('Plan v' + lp.v + ' is now active');
  }
  if (a === 'nlog-set') {
    state.todayLog = state.todayLog || {};
    if (el.dataset.meal === 'water') state.todayLog.water = !state.todayLog.water;
    else state.todayLog[el.dataset.meal] = el.dataset.v;
    save(); renderFood();
  }
  if (a === 'nlog-send') {
    const lp = state.mealPlanLive; if (!lp) return;
    const log = state.todayLog || {};
    const total = lp.meals.length;
    const followed = lp.meals.filter((m) => log[m.name] === 'followed').length + lp.meals.filter((m) => log[m.name] === 'partly').length * 0.5;
    GymBus.send('nutri-log', { member: state.memberName, followed, total, water: !!log.water }, 'member-app');
    state.todayLog = {};
    save(); renderFood();
    pushNotif('Log sent', `${followed} of ${total} meals followed${log.water ? ' · water goal met' : ''} — ${lp.by} sees it instantly.`);
    toast('Log sent to ' + lp.by);
  }
  if (a === 'nutri-discomfort') {
    const lp = state.mealPlanLive; if (!lp) return;
    const text = prompt('What feels wrong? (goes straight to ' + lp.by + '):', '');
    if (!text) return;
    GymBus.send('nutri-issue', { member: state.memberName, text }, 'member-app');
    pushNotif('Report sent', lp.by + ' will review your plan and adjust it as a new version — the current one stays in history.');
    toast('Sent — expect an adjusted plan');
  }
  if (a === 'reco-add') {
    const rec = state.cafeReco; if (!rec) return;
    const m = menu.find((x) => x.name === rec.item);
    if (!m) { toast(rec.item + ' is not on the menu right now'); return; }
    cart[m.id] = (cart[m.id] || 0) + 1;
    state.cafeReco = null; save();
    segFood = 'cafe'; renderFood();
    toast(rec.item + ' added to your cart — checkout when ready');
  }
  if (a === 'reco-dismiss') { state.cafeReco = null; save(); renderFood(); }

  if (a === 'topup') {
    const amt = Number(el.dataset.amt);
    const bonus = amt >= 100 ? 10 : 0;
    state.wallet += amt + bonus;
    state.walletTx.unshift({ label: `Top-up${bonus ? ` (+${bonus} bonus)` : ''}`, when: 'Today', amount: amt + bonus });
    save(); renderAccount();
    toast(`Wallet topped up +$${amt + bonus}`);
  }
  if (a === 'redeem') {
    const r = redeemOptions.find((x) => x.id === el.dataset.r);
    if (state.points < r.pts) return;
    state.points -= r.pts;
    save(); renderAccount();
    pushNotif('Reward redeemed', `${r.name} — show this at reception or the café.`);
    toast(`Redeemed: ${r.name}`);
  }
  if (a === 'auto-renew') {
    state.autoRenew = !state.autoRenew;
    save(); renderAccount();
    toast(state.autoRenew ? 'Auto-renew on' : 'Auto-renew off');
  }
  if (a === 'renew-sub') {
    state.subEnds = 'Jun 28, 2027';
    state.invoices.unshift({ label: '6-Month membership renewal', date: 'Today', amount: PRICES.renewal });
    save(); renderAccount();
    pushNotif('Membership renewed', 'Your plan now runs until Jun 28, 2027.');
    toast('Renewed until Jun 28, 2027');
  }
  if (a === 'freeze') {
    if (state.frozen) { state.frozen = false; toast('Membership unfrozen'); }
    else {
      const limit = Number(CONFIG.freeze_days_per_year) || 30;
      if (state.freezeDaysUsed + 7 > limit) { toast(`Freeze limit reached (${limit} days/year)`); return; }
      state.frozen = true; state.freezeDaysUsed += 7; state.problemLogged = false;
      toast('Frozen for 7 days — entry paused');
    }
    save(); renderAccount();
  }
  if (a === 'theme') {
    state.theme = el.dataset.t;
    save();
    const t = applyTheme(state.theme);
    renderAccount();
    toast(`Theme: ${t.name}`);
  }
  if (a === 'renew-request') {
    GymBus.send('renewal', { member: state.memberName, plan: (state.subPlan || 'Monthly membership') + ' · $95/month', price: 95 }, 'member-app');
    pushNotif('Renewal requested', 'Reception will prepare your renewal — pay at the desk on your next visit.');
    toast('Request sent to reception');
  }
  if (a === 'copy-ref') toast('Referral link shared');
  if (a === 'export-data') toast('Data export requested — link arrives by email');
  if (a === 'delete-data') toast('Deletion request logged — reception will confirm identity');
  if (a === 'signout') { state.loggedIn = false; save(); show('login'); }
});

/* ================= auth & boot ================= */

document.getElementById('loginBtn').onclick = () => {
  const nameIn = (document.getElementById('loginName')?.value || '').trim().toLowerCase();
  const passIn = (document.getElementById('loginPassword')?.value || '').trim();
  const errEl = document.getElementById('loginError');
  const fail = (msg) => { if (errEl) { errEl.textContent = msg; errEl.hidden = false; } };

  if (!memberRows.length) {
    // sheet not loaded (offline / still fetching) — allow the default demo identity
    if (!nameIn || nameIn === 'samer khanji') { state.loggedIn = true; save(); show('home'); return; }
    fail('Member data is still loading — try again in a moment.');
    return;
  }
  const row = memberRows.find((m) => (m.name || '').trim().toLowerCase() === nameIn);
  if (!row) { fail('No member with that name. Check the spelling.'); return; }
  // Demo auth: if the sheet has a password column it is checked; if the column
  // is removed (recommended — plaintext credentials don't belong in data sheets)
  // any non-empty password works. The value is never stored in app state.
  if (row.password) { if (row.password !== passIn) { fail('Wrong password.'); return; } }
  else if (!passIn) { fail('Enter any password (demo mode).'); return; }

  if (errEl) errEl.hidden = true;
  applyMemberSeed(row);
  state.loggedIn = true;
  save();
  show('home');
  toast(`Welcome, ${(row.name || '').split(' ')[0]}`);
};
/* ---------- onboarding wizard (join journey) ---------- */
let obStep = 0;
const obData = {};
function renderOnboard() {
  const steps = [
    { t: 'Your invitation', s: 'The gym sent this link to your phone', body: `
      <label class="ob-label">Invitation code</label>
      <input class="input" id="obCode" value="GYM-INV-2481" />
      <label class="ob-label">Your phone number</label>
      <input class="input" id="obPhone" placeholder="Phone" value="03 555123" />` },
    { t: 'Verify your number', s: 'We sent a code by SMS', body: `
      <label class="ob-label">Verification code</label>
      <input class="input" id="obOtp" value="4821" style="letter-spacing:8px; text-align:center; font-weight:700;" />` },
    { t: 'Profile photo', s: 'Reception uses this to recognize you at the gate', body: `
      <div class="ob-photo">${icon('user', 44)}</div>
      <button class="book-btn wide" onclick="toast('Camera opens on a real phone')">Take photo</button>` },
    { t: 'Rules & waiver', s: 'Required before your first visit', body: `
      <div class="checkline-app"><input type="checkbox" id="obRules"> I accept the gym rules</div>
      <div class="checkline-app"><input type="checkbox" id="obWaiver"> I sign the liability waiver</div>
      <label class="ob-label">Type your full name as signature</label>
      <input class="input" id="obSign" placeholder="Full name" />` },
    { t: 'Health questionnaire', s: 'Kept private · not medical advice', body: `
      <div class="checkline-app"><input type="checkbox" id="obQ1"> Heart condition or chest pain during exercise</div>
      <div class="checkline-app"><input type="checkbox" id="obQ2"> Injury that limits training</div>
      <div class="checkline-app"><input type="checkbox" id="obQ3"> Currently pregnant or post-surgery</div>
      <div class="dim small">Answering yes doesn't block you — staff will confirm safe training before your first session.</div>` },
    { t: 'Emergency contact', s: 'Who we call if something happens', body: `
      <input class="input" id="obEcName" placeholder="Contact name" />
      <input class="input" id="obEcPhone" placeholder="Contact phone" style="margin-top:8px;" />` },
    { t: 'How should we reach you?', s: 'Change anytime in Account', body: `
      <div class="checkline-app"><input type="checkbox" checked> Push notifications</div>
      <div class="checkline-app"><input type="checkbox" checked> Email receipts</div>
      <div class="checkline-app"><input type="checkbox"> SMS</div>
      <div class="checkline-app"><input type="checkbox"> WhatsApp</div>` },
  ];
  if (obStep >= steps.length) {
    document.getElementById('c-onboard').innerHTML = `
      <div class="ob-done">
        <div class="done-line" style="font-size:20px; justify-content:center;">${icon('check', 26)} Membership activated</div>
        <p class="dim small center">Welcome${obData.sign ? ', ' + obData.sign.split(' ')[0] : ''}! Reception has your profile.
        Set up Face ID at first login, and your phone becomes your key.</p>
        <button class="accent-btn" data-action="ob-finish">Go to login</button>
      </div>`;
    return;
  }
  const st = steps[obStep];
  document.getElementById('c-onboard').innerHTML = `
    <div class="ob-wrap">
      <div class="ob-progress">${steps.map((_, i) => `<span class="${i <= obStep ? 'on' : ''}"></span>`).join('')}</div>
      <h2 class="ob-title">${st.t}</h2>
      <p class="dim small">${st.s}</p>
      <div class="ob-body">${st.body}</div>
      <div class="ob-err dim small" id="obErr" hidden style="color:#bb3a2a"></div>
      <button class="accent-btn" data-action="ob-next">Continue</button>
      <button class="ghost-btn" data-action="ob-back">${obStep === 0 ? 'Back to login' : 'Back'}</button>
    </div>`;
}
function obNext() {
  const err = (m) => { const e = document.getElementById('obErr'); e.textContent = m; e.hidden = false; };
  if (obStep === 3) {
    const sign = (document.getElementById('obSign')?.value || '').trim();
    if (!document.getElementById('obRules').checked || !document.getElementById('obWaiver').checked || sign.length < 3) {
      err('Accept the rules, sign the waiver, and type your name.'); return;
    }
    obData.sign = sign;
  }
  if (obStep === 4 && (document.getElementById('obQ1').checked || document.getElementById('obQ3').checked)) {
    pushNotif('Health check flagged', 'A staff member will confirm safe training before your first session.');
  }
  obStep++;
  renderOnboard();
}
document.getElementById('activateBtn').onclick = () => { obStep = 0; show('onboard'); renderOnboard(); };
document.getElementById('forgotBtn').onclick = () => toast('Reset link sent to your phone number on file');

/* ---------- support tickets & safe SOS ---------- */
function appOverlay(html) {
  closeAppOverlay();
  const d = document.createElement('div');
  d.className = 'app-overlay'; d.id = 'appOverlay';
  d.innerHTML = `<div class="app-modal">${html}</div>`;
  d.addEventListener('click', (e) => { if (e.target === d) closeAppOverlay(); });
  document.getElementById('screen').appendChild(d);
}
function closeAppOverlay() { document.getElementById('appOverlay')?.remove(); }

function openSupport() {
  appOverlay(`
    <h3>How can we help?</h3>
    ${['Call reception', 'Chat with reception', 'WhatsApp', 'Report a payment problem', 'Report an access problem', 'Report a lost item', 'Membership help'].map((o) =>
      `<button class="support-opt" data-sup="${o}">${o}</button>`).join('')}
    <button class="ghost-btn" onclick="closeAppOverlay()">Close</button>`);
  document.querySelectorAll('[data-sup]').forEach((b) => b.onclick = () => {
    const tkt = 'TKT-' + String(Date.now()).slice(-5);
    closeAppOverlay();
    GymBus.send('ticket', { member: state.memberName, subject: b.dataset.sup, tkt });
    pushNotif('Request received · ' + tkt, `"${b.dataset.sup}" — status: Open. Reception replies here.`);
    toast(`Ticket ${tkt} sent to reception`);
  });
}

let sosTimer = null;
function startSOS() {
  appOverlay(`
    <h3 style="color:#bb3a2a;">Emergency — hold on</h3>
    <p class="dim small">Pick what's happening. The alert sends automatically in <b id="sosCount">4</b>s — Cancel if this was an accident.</p>
    ${['Injury', 'Equipment danger', 'Harassment', 'Other emergency'].map((t) =>
      `<button class="support-opt sos-type" data-sostype="${t}">${t}</button>`).join('')}
    <button class="accent-btn" style="background:#bb3a2a;" id="sosCancel">Cancel — accidental</button>`);
  let type = 'Emergency', left = 4;
  document.querySelectorAll('[data-sostype]').forEach((b) => b.onclick = () => {
    type = b.dataset.sostype;
    document.querySelectorAll('[data-sostype]').forEach((x) => x.style.outline = x === b ? '2px solid #bb3a2a' : 'none');
  });
  sosTimer = setInterval(() => {
    left--;
    const c = document.getElementById('sosCount');
    if (c) c.textContent = left;
    if (left <= 0) {
      clearInterval(sosTimer);
      closeAppOverlay();
      const zone = state.checkedIn ? 'inside the gym' : 'at the gym entrance';
      GymBus.send('sos', { member: state.memberName, sosType: type, zone });
      pushNotif('SOS sent', `${type} — you are ${zone}. Waiting for staff acknowledgment…`);
      state.problems.push(`SOS — ${type} · ${todayLabel()}`);
      save();
      toast('SOS sent — waiting for staff…');
    }
  }, 1000);
  document.getElementById('sosCancel').onclick = () => { clearInterval(sosTimer); closeAppOverlay(); toast('SOS cancelled — nothing sent'); };
}

document.getElementById('resetDemo').onclick = () => {
  localStorage.removeItem(KEY);
  state = load(); cart = {};
  show('login');
  loadSheetData(); // re-seed the fresh state from the sheet
};

setInterval(() => {
  if (state.checkedIn) {
    const active = views.find((v) => document.getElementById('view-' + v).classList.contains('active'));
    if (active === 'home') renderHome();
    if (active === 'gym') renderGym();
  }
}, 30000);

/* ---------- cross-dashboard receiver: staff actions reach the member ---------- */
function rerenderActive() {
  const active = views.find((v) => document.getElementById('view-' + v)?.classList.contains('active'));
  if (active === 'home') renderHome();
  if (active === 'gym') renderGym();
  if (active === 'account') renderAccount();
  if (active === 'food') renderFood();
}
function handleBus(kind, ev) {
  const mine = ev.payload && ev.payload.member === state.memberName;
  const last = ev.history[ev.history.length - 1] || {};
  if (kind === 'event' && ev.type === 'announcement') {
    CONFIG.announcement = ev.payload.text;
    pushNotif('Gym announcement', ev.payload.text);
    rerenderActive();
    return;
  }
  if (kind === 'event' && ev.type === 'cafe-menu') {
    state.cafeAv = {};
    (ev.payload.items || []).forEach((i) => { state.cafeAv[i.name] = i.av; });
    save();
    if (document.getElementById('view-food')?.classList.contains('active')) renderFood();
    return;
  }
  if (kind === 'event' && ev.type === 'asset-status') {
    state.assetStatus = state.assetStatus || {};
    if (ev.payload.status === 'Available') delete state.assetStatus[ev.payload.asset];
    else state.assetStatus[ev.payload.asset] = { status: ev.payload.status, alt: ev.payload.alt || null };
    save();
    if (document.getElementById('view-gym')?.classList.contains('active')) renderGym();
    return;
  }
  if (kind === 'event' && ev.type === 'cafe-status') {
    state.cafeOpen = ev.payload.open !== false;
    save();
    if (!state.cafeOpen) pushNotif('Café paused', 'The café is not taking orders right now — check back shortly.');
    if (document.getElementById('view-food')?.classList.contains('active')) renderFood();
    return;
  }
  if (kind === 'event' && ev.type === 'trainer-avail') {
    state.trainerSlots = state.trainerSlots || {};
    state.trainerSlots[ev.payload.trainer] = ev.payload.slots;
    if (state.pickSlot && state.pickSlot.trainer === ev.payload.trainer) state.pickSlot.slots = ev.payload.slots.length ? ev.payload.slots : state.pickSlot.slots;
    save();
    if (document.getElementById('view-train')?.classList.contains('active')) renderTrain();
    return;
  }
  if (kind === 'event' && ev.type === 'program-update' && mine) {
    if (GymBus.isProcessed(ev.id, 'member')) return;
    GymBus.markProcessed(ev.id, 'member');
    state.customWorkout = { program: ev.payload.title, day: 'Updated today', by: ev.payload.by, exercises: ev.payload.exercises };
    save();
    pushNotif('Workout updated', `${ev.payload.by} adjusted your ${ev.payload.title} program — see Train → Workouts.`);
    toast('Your ' + ev.payload.title + ' program was updated');
    if (document.getElementById('view-train')?.classList.contains('active')) renderTrain();
    return;
  }
  if (kind === 'event' && ev.type === 'class-offer' && mine) {
    if (GymBus.isProcessed(ev.id, 'member')) return;
    GymBus.markProcessed(ev.id, 'member');
    state.classOffer = { busId: ev.id, name: ev.payload.name, expires: ev.payload.expires || '30 min' };
    save();
    pushNotif('Waitlist offer — ' + ev.payload.name, `A space opened up! Accept within ${ev.payload.expires || '30 min'} in Train → Classes or it goes to the next person.`);
    toast('Waitlist offer: ' + ev.payload.name);
    if (document.getElementById('view-train')?.classList.contains('active')) renderTrain();
    return;
  }
  if (kind === 'event' && ev.type === 'class-done') {
    if (GymBus.isProcessed(ev.id, 'member')) return;
    GymBus.markProcessed(ev.id, 'member');
    const cd = classes.find((x) => x.name === ev.payload.name);
    const hadBooking = cd && state.classState[cd.id];
    const attended = (ev.payload.attendees || []).includes(state.memberName);
    if (ev.payload.cancelled && hadBooking) {
      delete state.classState[cd.id];
      pushNotif(ev.payload.name + ' cancelled', ev.payload.notes || 'The class was cancelled — your credit is not used.');
    } else if (attended) {
      if (cd) delete state.classState[cd.id];
      pushNotif(ev.payload.name + ' — nice work!', `${ev.payload.instructor}: ${ev.payload.notes || 'Thanks for coming.'} Rate the class in Train → Classes.`);
    } else if (hadBooking) {
      delete state.classState[cd.id];
      pushNotif(ev.payload.name + ' — marked absent', 'You were booked but not checked in. Repeated no-shows pause booking for 48 h.');
    }
    save();
    if (document.getElementById('view-train')?.classList.contains('active')) renderTrain();
    return;
  }
  if (kind === 'event' && ev.type === 'meal-plan' && mine) {
    if (GymBus.isProcessed(ev.id, 'member')) return;
    GymBus.markProcessed(ev.id, 'member');
    state.mealPlanLive = { busId: ev.id, v: ev.payload.v, by: ev.payload.by, goal: ev.payload.goal, kcalT: ev.payload.kcalT, pT: ev.payload.pT, review: ev.payload.review, changelog: ev.payload.changelog, meals: ev.payload.meals, status: 'sent' };
    save();
    pushNotif('Meal plan v' + ev.payload.v + (ev.payload.v > 1 ? ' — updated' : ''), `${ev.payload.by} sent your ${ev.payload.v > 1 ? 'adjusted ' : ''}plan — review and acknowledge it in Food → Meal plan.`);
    if (document.getElementById('view-food')?.classList.contains('active')) renderFood();
    return;
  }
  if (kind === 'event' && ev.type === 'nutri-reco' && mine) {
    if (GymBus.isProcessed(ev.id, 'member')) return;
    GymBus.markProcessed(ev.id, 'member');
    state.cafeReco = { item: ev.payload.item, note: ev.payload.note, by: ev.payload.by };
    save();
    pushNotif('Café suggestion from ' + ev.payload.by, `${ev.payload.item} — ${ev.payload.note}. Ordering is entirely up to you.`);
    if (document.getElementById('view-food')?.classList.contains('active')) renderFood();
    return;
  }
  if (kind === 'event' && ev.type === 'nutri-booked' && mine) {
    if (GymBus.isProcessed(ev.id, 'member')) return;
    GymBus.markProcessed(ev.id, 'member');
    pushNotif('Nutrition appointment', `${ev.payload.by} booked you in — ${ev.payload.slot}.`);
    save();
    return;
  }
  if (kind === 'event' && ev.type === 'pt-booked' && mine) {
    if (GymBus.isProcessed(ev.id, 'member')) return;
    GymBus.markProcessed(ev.id, 'member');
    state.booking = { trainer: ev.payload.trainer, when: ev.payload.slot, status: 'accepted' };
    save();
    pushNotif('Session added', `${ev.payload.trainer} booked you in — ${ev.payload.slot}. It's on both calendars.`);
    if (document.getElementById('view-train')?.classList.contains('active')) renderTrain();
    return;
  }
  if (kind === 'event' && ev.type === 'pt-session' && mine) {
    if (GymBus.isProcessed(ev.id + ':pending', 'member')) return;
    GymBus.markProcessed(ev.id + ':pending', 'member');
    state.pendingPt = { busId: ev.id, trainer: ev.payload.trainer, summary: ev.payload.summary, notes: ev.payload.notes, prs: ev.payload.prs };
    save();
    pushNotif('Confirm your session', `${ev.payload.trainer} marked your session complete — confirm it in Train → Trainers. Nothing is deducted until you do.`);
    toast('Session complete — please confirm');
    if (document.getElementById('view-train')?.classList.contains('active')) renderTrain();
    return;
  }
  if (kind !== 'update' || !mine) return;
  // idempotency: one guard for EVERY staff update — live delivery followed by
  // catch-up replay (or double catch-up) can never re-apply the same transition
  const upKey = ev.id + ':' + ev.status + ':' + ev.history.length;
  if (GymBus.isProcessed(upKey, 'member')) return;
  GymBus.markProcessed(upKey, 'member');
  if (ev.type === 'pt-request' && state.booking && state.booking.busId === ev.id) {
    if (ev.status === 'accepted' && last.by !== state.memberName) {
      state.booking.status = 'accepted'; state.booking.note = null;
      pushNotif('Session confirmed', `${last.by} accepted — ${state.booking.when}. It's on both calendars.`);
      toast('✓ ' + last.by + ' accepted your session');
    }
    if (ev.status === 'proposed') {
      state.booking.status = 'proposed'; state.booking.when = last.note;
      state.booking.note = `${last.by} can't make the requested time and proposed ${last.note}.`;
      pushNotif('New time proposed', state.booking.note);
    }
    if (ev.status === 'declined') {
      state.booking = null;
      pushNotif('Session declined', `${last.by}: “${last.note}” — pick another trainer or time in Train → Trainers.`);
    }
    save();
    if (document.getElementById('view-train')?.classList.contains('active')) renderTrain();
    return;
  }
  if (ev.type === 'sos') {
    if (ev.status === 'acknowledged') { pushNotif('Staff acknowledged', `${last.by} confirmed your alert — help is on the way.`); toast('✓ ' + last.by + ' acknowledged — help is coming'); }
    if (ev.status === 'closed') pushNotif('Incident closed', `Closed by ${last.by}${last.note ? ' — ' + last.note : ''}.`);
  }
  if (ev.type === 'report') {
    const r = state.reports.find((x) => x.busId === ev.id);
    if (r) { r.status = ev.status; save(); }
    if (ev.status === 'Under review') pushNotif(ev.payload.ref + ' under review', `${last.by} is looking at ${ev.payload.machine}.`);
    if (ev.status === 'Repaired') pushNotif(ev.payload.ref + ' repaired', `${ev.payload.machine} back in service — fixed by ${last.by}${last.note ? ': ' + last.note : ''}.`);
    rerenderActive();
  }
  if (ev.type === 'ticket' && ev.status === 'resolved') {
    if (String(ev.payload.tkt).startsWith('GST-') && state.guestPass && state.guestPass.code === ev.payload.tkt) {
      state.guestPass.status = 'used'; save();
      pushNotif('Your guest checked in', `${state.guestPass.name} arrived — waiver signed, entry logged under your account. The pass is now used.`);
      toast(state.guestPass.name + ' is in the gym');
      rerenderActive();
      return;
    }
    if ((ev.payload.subject || '').includes('Cancellation')) { state.pendingPlanChange = null; save(); }
    state.lastResolved = { tkt: ev.payload.tkt, rated: 0 }; save();
    pushNotif(ev.payload.tkt + ' resolved', `By ${last.by}${last.note ? ' — "' + last.note + '"' : ''}. Rate it or reopen from the Gym tab.`);
    toast('Ticket resolved by ' + last.by);
    rerenderActive();
  }
  if (ev.type === 'renewal' && ev.status === 'done') {
    if (GymBus.isProcessed(ev.id + ':done', 'member')) return;
    GymBus.markProcessed(ev.id + ':done', 'member');
    if ((ev.payload.plan || '').toLowerCase().includes('package')) {
      state.pkgUsed = 0;
      state.invoices.unshift({ label: 'PT package (10 sessions)', date: 'Today', amount: ev.payload.price || 300 });
      pushNotif('PT package renewed', `Processed by ${last.by} — 10 fresh sessions. 0 used · 10 remaining.`);
    } else {
      state.subEnds = last.note || state.subEnds;
      state.userStatus = 'active'; state.frozen = false;
      state.pendingPlanChange = null;
      if ((ev.payload.plan || '').toLowerCase().includes('upgrade')) {
        state.subPlan = '12-Month · Performance';
        state.invoices.unshift({ label: 'Plan upgrade — 12-Month', date: 'Today', amount: ev.payload.price || 720 });
        pushNotif('Plan upgraded', `Processed by ${last.by} — you're on 12-Month · Performance, valid until ${state.subEnds}.`);
      } else {
        state.invoices.unshift({ label: 'Renewal (paid at desk)', date: 'Today', amount: ev.payload.price || 95 });
        pushNotif('Membership renewed', `Processed by ${last.by} — valid until ${state.subEnds}.`);
      }
    }
    save();
    rerenderActive();
  }
  if (ev.type === 'cafe-order' && state.order && state.order.busId === ev.id) {
    const o = state.order;
    if (ev.status === 'paid') { o.status = 'Paid at reception ✓ — café can start now'; pushNotif('Café order paid', `${last.by} took $${o.total} at the desk — the café was told to start.`); }
    if (ev.status === 'accepted') { o.status = `Accepted by ${last.by} · ready ~${last.note || 'soon'}`; pushNotif('Order ' + o.code + ' accepted', `${last.by} is on it — ready around ${last.note || 'soon'}.`); }
    if (ev.status === 'preparing') {
      const firstTime = !o.prepNotified;
      o.prepNotified = true;
      o.status = `Being prepared by ${last.by}${last.note ? ' · ready ~' + last.note : ''}`;
      if (firstTime) pushNotif('Order ' + o.code + ' in preparation', `${last.by} started — ready around ${last.note || 'soon'}.`);
      else pushNotif('Order ' + o.code + ' — new time', `Ready around ${last.note} now.`);
    }
    if (ev.status === 'price-adjust') {
      const m = (last.note || '').match(/(Refund|Extra) \$(\d+(?:\.\d+)?)/);
      if (m) {
        const amt = Number(m[2]) * (m[1] === 'Refund' ? 1 : -1);
        state.wallet = Math.round((state.wallet + amt) * 100) / 100;
        state.walletTx.unshift({ label: 'Café ' + o.code + ' price adjustment', when: 'Today', amount: amt });
        o.total = Math.round((o.total - amt) * 100) / 100;
      }
      pushNotif('Order ' + o.code + ' price adjusted', last.note || 'Substitution price difference settled to your wallet.');
    }
    if (ev.status === 'ready') {
      o.status = 'READY — show code ' + o.code + ' at the counter';
      pushNotif('Order ' + o.code + ' is ready 🥤', 'Collect at the café counter — they will ask for your code ' + o.code + '.');
      toast('Order ready — code ' + o.code);
    }
    if (ev.status === 'collected') {
      earnPoints(POINTS.cafe_order, 'café order');
      state.orderHistory = state.orderHistory || [];
      state.orderHistory.unshift({ code: o.code, items: o.items, itemsArr: o.itemsArr || null, total: o.total, when: 'Today' });
      if (state.checkedIn) state.sessionEvents.push({ time: fmtTime(Date.now()), title: 'Café order collected', sub: `${o.items} · $${o.total}` });
      pushNotif('Receipt — ' + o.code, `${o.items} · $${o.total}${o.pay === 'wallet' ? ' paid from wallet' : ' paid at reception'} · +${POINTS.cafe_order} pts. Enjoy!`);
      state.order = null;
    }
    if (ev.status === 'rejected') {
      if (o.pay === 'wallet') {
        state.wallet += o.total;
        state.walletTx.unshift({ label: 'Refund — café ' + o.code, when: 'Today', amount: o.total });
      }
      pushNotif('Order ' + o.code + ' cancelled', `${last.by}: ${last.note || 'Not available.'}${o.pay === 'wallet' ? ` $${o.total} refunded to your wallet.` : ''}`);
      state.order = null;
    }
    if (ev.status === 'sub-offer') {
      o.subOffer = last.note;
      pushNotif('Substitution offered', `${last.by}: they suggest ${last.note} instead — accept or decline in Food → Café.`);
    }
    save();
    if (document.getElementById('view-food')?.classList.contains('active')) renderFood();
    rerenderActive();
    return;
  }
  if (ev.type === 'gate-resolved') {
    state.userStatus = 'active'; state.frozen = false; save();
    pushNotif('Entry resolved', `${last.by} sorted it at the desk — ${last.note || 'you can enter now'}.`);
    rerenderActive();
  }
}
GymBus.on(handleBus);
/* catch-up: apply staff resolutions that happened while this app was closed */
(function busCatchUp() {
  state.busSeen = state.busSeen || {};
  GymBus.all().forEach((ev) => {
    if (ev.history.length && ev.payload?.member === state.memberName && state.busSeen[ev.id] !== ev.history.length) {
      handleBus('update', ev);
    }
    if (ev.type === 'pt-session' && ev.status === 'open' && ev.payload?.member === state.memberName && !state.pendingPt
        && !GymBus.isProcessed(ev.id + ':pending', 'member')) {
      GymBus.markProcessed(ev.id + ':pending', 'member');
      state.pendingPt = { busId: ev.id, trainer: ev.payload.trainer, summary: ev.payload.summary, notes: ev.payload.notes, prs: ev.payload.prs };
    }
    if (ev.type === 'trainer-avail') { // later events overwrite → latest published set wins
      state.trainerSlots = state.trainerSlots || {};
      state.trainerSlots[ev.payload.trainer] = ev.payload.slots;
    }
    if (ev.type === 'cafe-menu') { // latest availability snapshot wins
      state.cafeAv = {};
      (ev.payload.items || []).forEach((i) => { state.cafeAv[i.name] = i.av; });
    }
    if (ev.type === 'cafe-status') state.cafeOpen = ev.payload.open !== false; // latest wins
    if (ev.type === 'asset-status') { // latest status per asset wins
      state.assetStatus = state.assetStatus || {};
      if (ev.payload.status === 'Available') delete state.assetStatus[ev.payload.asset];
      else state.assetStatus[ev.payload.asset] = { status: ev.payload.status, alt: ev.payload.alt || null };
    }
    if (ev.type === 'program-update' && ev.payload?.member === state.memberName && !GymBus.isProcessed(ev.id, 'member')) {
      GymBus.markProcessed(ev.id, 'member');
      state.customWorkout = { program: ev.payload.title, day: 'Updated today', by: ev.payload.by, exercises: ev.payload.exercises };
    }
    if (ev.type === 'class-offer' && ev.payload?.member === state.memberName && ev.status === 'open' && !GymBus.isProcessed(ev.id, 'member')) {
      GymBus.markProcessed(ev.id, 'member');
      state.classOffer = { busId: ev.id, name: ev.payload.name, expires: ev.payload.expires || '30 min' };
    }
    if (ev.type === 'meal-plan' && ev.payload?.member === state.memberName && !GymBus.isProcessed(ev.id, 'member')) {
      GymBus.markProcessed(ev.id, 'member');
      state.mealPlanLive = { busId: ev.id, v: ev.payload.v, by: ev.payload.by, goal: ev.payload.goal, kcalT: ev.payload.kcalT, pT: ev.payload.pT, review: ev.payload.review, changelog: ev.payload.changelog, meals: ev.payload.meals, status: ev.status === 'acknowledged' ? 'active' : 'sent' };
    }
    if (ev.type === 'nutri-reco' && ev.payload?.member === state.memberName && !GymBus.isProcessed(ev.id, 'member')) {
      GymBus.markProcessed(ev.id, 'member');
      state.cafeReco = { item: ev.payload.item, note: ev.payload.note, by: ev.payload.by };
    }
    if (ev.type === 'pt-booked' && ev.payload?.member === state.memberName && !GymBus.isProcessed(ev.id, 'member')) {
      GymBus.markProcessed(ev.id, 'member');
      state.booking = { trainer: ev.payload.trainer, when: ev.payload.slot, status: 'accepted' };
    }
    state.busSeen[ev.id] = ev.history.length;
  });
  save();
})();

applyTheme(state.theme || 'Club Green');
show(state.loggedIn ? 'home' : 'login');
loadSheetData().then(() => { if (!state.theme && CONFIG.theme) applyTheme(CONFIG.theme); });
