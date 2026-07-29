/* ============================================================================
   GYM demo-data engine — one shared mock "backend" for every page.

   Why this exists: pages used to hold their own seeds, so the same person or
   asset existed in several unrelated copies (audit finding F-DQ-2), and
   ownership was keyed by display name (F-ID-1). Everything here is keyed by an
   IMMUTABLE ID, related by ID, persisted, resettable, and scenario-driven.

   Service interfaces (MemberService, AccessService, …) are deliberately shaped
   like a real API so each method body can later call Supabase without any page
   changing. Cross-department propagation reuses the existing GymBus events the
   dashboards already consume — this layer does not replace the bus, it feeds it.
   ========================================================================== */
const DemoData = (() => {
  const DB_KEY = 'gym_demo_db_v1';
  const CLOCK_KEY = 'gym_demo_clock';      // optional simulated-time offset (ms)

  /* ---------- clock: one time source every page can share ---------- */
  const offset = () => Number(localStorage.getItem(CLOCK_KEY) || 0);
  const now = () => Date.now() + offset();
  const at = (h, m) => { const d = new Date(now()); d.setHours(h, m || 0, 0, 0); return d.getTime(); };
  const fmtTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const iso = (ms) => new Date(ms).toISOString();

  /* ---------- seed: stable IDs, real relationships ---------- */
  function seed() {
    const members = [
      { id: 'mbr_0001', name: 'Samer Khanji', phone: '+961 70 123 456', email: 'samer@example.com', tier: 'Performance', planId: 'pln_6mo', status: 'active', subEnds: '2026-12-28', wallet: 68, points: 340, trainerId: 'stf_0002', allergies: ['peanuts'], injuries: ['Right shoulder impingement'], memberSince: '2026-03-01' },
      { id: 'mbr_0002', name: 'Jawad', phone: '+961 3 234 567', email: 'jawad@example.com', tier: 'Access', planId: 'pln_1mo', status: 'active', subEnds: '2026-09-01', wallet: 20, points: 90, trainerId: null, allergies: [], injuries: [], memberSince: '2026-05-12' },
      { id: 'mbr_0003', name: 'Mohamad', phone: '+961 71 345 678', email: 'mohamad@example.com', tier: 'Access', planId: 'pln_1mo', status: 'expired', subEnds: '2026-07-01', wallet: 5, points: 40, trainerId: null, allergies: [], injuries: [], memberSince: '2026-01-20' },
      { id: 'mbr_0004', name: 'Pamela <3', phone: '+961 76 456 789', email: 'pamela@example.com', tier: 'Performance', planId: 'pln_6mo', status: 'frozen', subEnds: '2027-01-15', wallet: 42, points: 210, trainerId: null, allergies: [], injuries: [], memberSince: '2026-02-08' },
      /* people who previously existed only inside staff dashboards — now real members (fixes the roster-orphan finding) */
      { id: 'mbr_0005', name: 'Lina Saab', phone: '+961 71 222 333', email: 'lina@example.com', tier: 'Access', planId: 'pln_1mo', status: 'active', subEnds: '2026-11-02', wallet: 15, points: 60, trainerId: 'stf_0002', allergies: [], injuries: [], memberSince: '2026-06-01' },
      { id: 'mbr_0006', name: 'Omar Khal', phone: '+961 76 444 555', email: 'omar@example.com', tier: 'Access', planId: 'pln_1mo', status: 'active', subEnds: '2026-10-20', wallet: 30, points: 75, trainerId: 'stf_0002', allergies: [], injuries: ['ACL reconstruction (2025)'], memberSince: '2026-04-18' },
      { id: 'mbr_0007', name: 'Maya Haddad', phone: '+961 71 555 777', email: 'maya@example.com', tier: 'Performance', planId: 'pln_6mo', status: 'active', subEnds: '2027-02-01', wallet: 55, points: 130, trainerId: null, allergies: ['milk'], injuries: [], memberSince: '2026-06-22' },
      { id: 'mbr_0008', name: 'Jad Rahal', phone: '+961 76 888 999', email: 'jad@example.com', tier: 'Access', planId: 'pln_1mo', status: 'active', subEnds: '2026-09-30', wallet: 12, points: 25, trainerId: null, allergies: [], injuries: [], memberSince: '2026-07-02' },
    ];
    const staff = [
      { id: 'stf_0001', name: 'Lara', role: 'reception', locationId: 'loc_01' },
      { id: 'stf_0002', name: 'Karim H.', role: 'trainer', locationId: 'loc_01', certs: ['Strength', 'Rehab'] },
      { id: 'stf_0003', name: 'Nour A.', role: 'cafe', locationId: 'loc_01' },
      { id: 'stf_0004', name: 'Rima D.', role: 'nutritionist', locationId: 'loc_01', certs: ['Licensed dietitian'] },
      { id: 'stf_0005', name: 'Suhail M.', role: 'maintenance', locationId: 'loc_01' },
      { id: 'stf_0006', name: 'Tony A.', role: 'instructor', locationId: 'loc_01', certs: ['HIIT', 'Boxing'] },
      { id: 'stf_0007', name: 'Rita S.', role: 'instructor', locationId: 'loc_01', certs: ['Aqua', 'Pilates'] },
    ];
    const plans = [
      { id: 'pln_1mo', name: 'Monthly', price: 95, months: 1, guestsPerMonth: 1, freezeDays: 14 },
      { id: 'pln_6mo', name: '6-Month · Performance', price: 480, months: 6, guestsPerMonth: 2, freezeDays: 30 },
      { id: 'pln_12mo', name: '12-Month · Performance', price: 720, months: 12, guestsPerMonth: 4, freezeDays: 45 },
    ];
    const assets = [
      { id: 'ast_0001', name: 'Treadmill #3', category: 'Cardio', locationId: 'loc_01', zone: 'Gym floor · row 1', status: 'available', altAssetId: 'ast_0011', lastInspection: '2026-07-20', nextInspection: '2026-08-20' },
      { id: 'ast_0002', name: 'Leg press', category: 'Strength', locationId: 'loc_01', zone: 'Strength zone', status: 'available', altAssetId: null, lastInspection: '2026-07-18', nextInspection: '2026-08-18' },
      { id: 'ast_0003', name: 'Cable station A', category: 'Strength', locationId: 'loc_01', zone: 'Centre', status: 'available', altAssetId: null, lastInspection: '2026-07-15', nextInspection: '2026-08-15' },
      { id: 'ast_0005', name: 'Rowing machine #1', category: 'Cardio', locationId: 'loc_01', zone: 'Cardio mezzanine', status: 'waiting_parts', altAssetId: null, lastInspection: '2026-07-10', nextInspection: '2026-08-10' },
      { id: 'ast_0006', name: 'Main gate scanner', category: 'Access', locationId: 'loc_01', zone: 'Entrance', status: 'limited', altAssetId: null, lastInspection: '2026-07-25', nextInspection: '2026-08-25' },
      { id: 'ast_0009', name: 'Pool', category: 'Aquatics', locationId: 'loc_01', zone: 'Lower level', status: 'available', altAssetId: null, lastInspection: '2026-07-26', nextInspection: '2026-08-02' },
      { id: 'ast_0011', name: 'Treadmill #1', category: 'Cardio', locationId: 'loc_01', zone: 'Gym floor · row 1', status: 'available', altAssetId: null, lastInspection: '2026-07-20', nextInspection: '2026-08-20' },
    ];
    const classes = [
      { id: 'cls_0001', name: 'HIIT Burn', instructorId: 'stf_0006', roomId: 'rm_02', startsAt: at(19, 0), capacity: 18, status: 'scheduled' },
      { id: 'cls_0002', name: 'Spin 45', instructorId: 'stf_0006', roomId: 'rm_01', startsAt: at(18, 0), capacity: 20, status: 'scheduled' },
      { id: 'cls_0003', name: 'Aqua Fit', instructorId: 'stf_0007', roomId: 'rm_pool', startsAt: at(17, 30), capacity: 12, status: 'scheduled' },
    ];
    const bookings = [
      { id: 'bkg_0001', type: 'class', classId: 'cls_0001', memberId: 'mbr_0005', state: 'booked', createdAt: now() - 36e5 },
      { id: 'bkg_0002', type: 'class', classId: 'cls_0001', memberId: 'mbr_0002', state: 'booked', createdAt: now() - 30e5 },
      { id: 'bkg_0003', type: 'pt', trainerId: 'stf_0002', memberId: 'mbr_0001', startsAt: at(18, 0), state: 'scheduled', packageId: 'pkg_0001' },
    ];
    const packages = [{ id: 'pkg_0001', memberId: 'mbr_0001', trainerId: 'stf_0002', total: 10, used: 7, price: 300 }];
    return {
      version: 1, createdAt: iso(now()), scenario: 'normal-day',
      organizations: [{ id: 'org_01', name: 'GYM' }],
      locations: [{ id: 'loc_01', orgId: 'org_01', name: 'City Center', capacity: 120, opens: '06:00', closes: '23:00' }],
      rooms: [{ id: 'rm_01', name: 'Studio B', capacity: 20 }, { id: 'rm_02', name: 'Functional Zone', capacity: 18 }, { id: 'rm_pool', name: 'Pool', capacity: 12 }],
      plans, members, staff, assets, classes, bookings, packages,
      visits: [], entryAttempts: [], orders: [], payments: [], incidents: [], workOrders: [], tasks: [], notifications: [], events: [],
      leads: [
        { id: 'led_0001', name: 'Rami Chidiac', phone: '+961 3 987 654', source: 'Instagram', stage: 'contacted', ownerStaffId: 'stf_0001', createdAt: now() - 864e5 },
        { id: 'led_0002', name: 'Nadia F.', phone: '+961 71 111 222', source: 'Walk-in', stage: 'tour_scheduled', ownerStaffId: 'stf_0001', createdAt: now() - 1728e5 },
      ],
    };
  }

  /* ---------- persistence ---------- */
  let db = null;
  function load() {
    if (db) return db;
    try { const raw = localStorage.getItem(DB_KEY); if (raw) { db = JSON.parse(raw); return db; } } catch (e) {}
    db = seed(); persist(); return db;
  }
  function persist() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
  const nextId = (prefix, coll) => prefix + '_' + String((load()[coll] || []).length + 1).padStart(4, '0');

  /* ---------- append-only event log + audit ---------- */
  function emit(type, payload, actorId, subjectId) {
    const d = load();
    const ev = { id: 'evt_' + now().toString(36) + Math.random().toString(36).slice(2, 6), type, orgId: 'org_01', locationId: 'loc_01',
      actorId: actorId || null, subjectId: subjectId || null, at: iso(now()), payload: payload || {} };
    d.events.unshift(ev); d.events = d.events.slice(0, 300); persist();
    /* propagate to the live dashboards through the bus they already consume */
    if (typeof GymBus !== 'undefined' && payload && payload.__bus) {
      GymBus.send(payload.__bus.type, payload.__bus.payload, 'demo-data');
    }
    return ev;
  }

  /* ---------- services (same shape a Supabase client would take) ---------- */
  const MemberService = {
    list: () => load().members.slice(),
    byId: (id) => load().members.find((m) => m.id === id) || null,
    byName: (name) => load().members.find((m) => m.name.trim().toLowerCase() === String(name).trim().toLowerCase()) || null,
    search: (q) => { const s = String(q).toLowerCase(); return load().members.filter((m) => m.name.toLowerCase().includes(s) || (m.phone || '').replace(/\s/g, '').includes(s.replace(/\s/g, '')) || m.id.includes(s)); },
    setStatus(id, status, actorId, reason) {
      const m = MemberService.byId(id); if (!m) return null;
      const from = m.status; m.status = status; persist();
      emit('member.status_changed', { from, to: status, reason }, actorId, id);
      return m;
    },
  };

  const AccessService = {
    /* server-shaped validation: the SAME rules a backend must enforce.
       Returns { ok, reason }. Callers must not bypass this. */
    validate(memberId) {
      const m = MemberService.byId(memberId);
      if (!m) return { ok: false, reason: 'unknown_member' };
      if (m.status === 'frozen') return { ok: false, reason: 'frozen' };
      if (m.status === 'expired') return { ok: false, reason: 'expired' };
      if (m.status === 'suspended') return { ok: false, reason: 'suspended' };
      const open = AccessService.insideNow().some((v) => v.memberId === memberId);
      if (open) return { ok: false, reason: 'duplicate_visit' };
      const loc = load().locations[0];
      if (AccessService.insideNow().length >= loc.capacity) return { ok: false, reason: 'at_capacity' };
      return { ok: true };
    },
    insideNow: () => load().visits.filter((v) => !v.exitedAt),
    checkIn(memberId, actorId) {
      const v = AccessService.validate(memberId);
      const d = load();
      if (!v.ok) {
        const att = { id: nextId('att', 'entryAttempts'), memberId, at: iso(now()), result: 'denied', reason: v.reason };
        d.entryAttempts.unshift(att); persist();
        emit('member.entry_denied', { reason: v.reason }, actorId, memberId);
        return { ok: false, reason: v.reason, attempt: att };
      }
      const visit = { id: nextId('vst', 'visits'), memberId, enteredAt: iso(now()), exitedAt: null, locationId: 'loc_01' };
      d.visits.unshift(visit); persist();
      emit('member.entry_admitted', { visitId: visit.id, __bus: { type: 'gate-entry', payload: { member: MemberService.byId(memberId).name, memberId, time: fmtTime(now()) } } }, actorId, memberId);
      return { ok: true, visit };
    },
    checkOut(memberId) {
      const open = load().visits.find((v) => v.memberId === memberId && !v.exitedAt);
      if (!open) return { ok: false, reason: 'no_open_visit' };
      open.exitedAt = iso(now()); persist();
      emit('member.exited', { visitId: open.id }, null, memberId);
      return { ok: true, visit: open };
    },
  };

  const MaintenanceService = {
    assets: () => load().assets.slice(),
    assetById: (id) => load().assets.find((a) => a.id === id) || null,
    isolate(assetId, actorId, reason) {
      const a = MaintenanceService.assetById(assetId); if (!a) return null;
      a.status = 'out_of_service'; persist();
      const alt = a.altAssetId ? MaintenanceService.assetById(a.altAssetId) : null;
      emit('maintenance.asset_isolated', { reason, __bus: { type: 'asset-status', payload: { asset: a.name, assetId: a.id, status: 'Out of service', alt: alt ? alt.name : null } } }, actorId, assetId);
      return a;
    },
    returnToService(assetId, actorId, verifiedBy) {
      const a = MaintenanceService.assetById(assetId); if (!a) return null;
      a.status = 'available'; a.lastInspection = iso(now()).slice(0, 10); persist();
      emit('maintenance.asset_restored', { verifiedBy, __bus: { type: 'asset-status', payload: { asset: a.name, assetId: a.id, status: 'Available', alt: null } } }, actorId, assetId);
      return a;
    },
    createWorkOrder({ assetId, problem, severity, reporterId }) {
      const d = load();
      const wo = { id: nextId('wo', 'workOrders'), assetId, problem, severity: severity || 'normal', reporterId: reporterId || null,
        status: 'reported', assigneeId: null, createdAt: iso(now()), history: [{ at: iso(now()), status: 'reported', by: reporterId }] };
      d.workOrders.unshift(wo); persist();
      emit('maintenance.work_order_created', { workOrderId: wo.id, severity: wo.severity }, reporterId, assetId);
      if (severity === 'safety') MaintenanceService.isolate(assetId, reporterId, 'auto-isolated: safety report');
      return wo;
    },
  };

  const IncidentService = {
    list: () => load().incidents.slice(),
    raiseSOS({ memberId, type, zone }) {
      const d = load();
      const inc = { id: nextId('inc', 'incidents'), kind: 'sos', memberId, type, zone, status: 'active', createdAt: iso(now()), acknowledgedBy: null, closedAt: null, actions: [] };
      d.incidents.unshift(inc); persist();
      const m = MemberService.byId(memberId);
      emit('member.sos_started', { incidentId: inc.id, __bus: { type: 'sos', payload: { member: m ? m.name : memberId, memberId, sosType: type, zone } } }, null, memberId);
      return inc;
    },
    acknowledge(incidentId, staffId) {
      const inc = load().incidents.find((i) => i.id === incidentId); if (!inc) return null;
      inc.status = 'acknowledged'; inc.acknowledgedBy = staffId; inc.actions.push({ at: iso(now()), by: staffId, action: 'acknowledged' }); persist();
      emit('member.sos_acknowledged', { incidentId }, staffId, inc.memberId);
      return inc;
    },
    /* closing an SOS does NOT close the incident until a report exists */
    close(incidentId, staffId, report) {
      const inc = load().incidents.find((i) => i.id === incidentId); if (!inc) return null;
      if (!report || String(report).trim().length < 5) return { error: 'incident_report_required' };
      inc.status = 'closed'; inc.closedAt = iso(now()); inc.report = report;
      inc.actions.push({ at: iso(now()), by: staffId, action: 'closed' }); persist();
      emit('incident.closed', { incidentId }, staffId, inc.memberId);
      return inc;
    },
  };

  const PaymentService = {
    ledger: () => load().payments.slice(),
    take({ memberId, amount, method, what, staffId }) {
      const d = load();
      const p = { id: nextId('pay', 'payments'), memberId, amount, method, what, staffId, at: iso(now()), status: 'paid' };
      d.payments.unshift(p); persist();
      emit('payment.taken', { paymentId: p.id, amount, method }, staffId, memberId);
      return p;
    },
    todayTotal: () => load().payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
  };

  const BookingService = {
    list: () => load().bookings.slice(),
    forClass: (classId) => load().bookings.filter((b) => b.classId === classId && b.state === 'booked'),
    bookClass(memberId, classId) {
      const d = load();
      const cls = d.classes.find((c) => c.id === classId); if (!cls) return { error: 'unknown_class' };
      if (BookingService.forClass(classId).length >= cls.capacity) return { error: 'full' };
      const clash = d.bookings.find((b) => b.memberId === memberId && b.state === 'booked' && b.classId && d.classes.find((c) => c.id === b.classId && Math.abs(c.startsAt - cls.startsAt) < 45 * 60000));
      if (clash) return { error: 'time_conflict' };
      const b = { id: nextId('bkg', 'bookings'), type: 'class', classId, memberId, state: 'booked', createdAt: now() };
      d.bookings.unshift(b); persist();
      emit('class.booked', { bookingId: b.id, classId }, memberId, memberId);
      return b;
    },
  };

  const NotificationService = {
    /* notifications derive FROM events, so no module invents its own */
    forMember(memberId) { return load().notifications.filter((n) => n.memberId === memberId); },
    push({ memberId, title, body, channel }) {
      const d = load();
      const n = { id: nextId('ntf', 'notifications'), memberId, title, body, channel: channel || 'push', at: iso(now()), read: false };
      d.notifications.unshift(n); persist();
      return n;
    },
  };

  /* ---------- scenarios: deterministic demo states ---------- */
  const SCENARIOS = {
    'normal-day': () => { /* seed as-is, a few members inside */
      ['mbr_0002', 'mbr_0005', 'mbr_0006'].forEach((id) => AccessService.checkIn(id, 'stf_0001'));
    },
    'morning-rush': () => { ['mbr_0001', 'mbr_0002', 'mbr_0005', 'mbr_0006', 'mbr_0007', 'mbr_0008'].forEach((id) => AccessService.checkIn(id, 'stf_0001')); },
    'full-capacity': () => { const d = load(); d.locations[0].capacity = 4; persist(); ['mbr_0002', 'mbr_0005', 'mbr_0006', 'mbr_0007'].forEach((id) => AccessService.checkIn(id, 'stf_0001')); },
    'medical-emergency': () => { AccessService.checkIn('mbr_0001', 'stf_0001'); IncidentService.raiseSOS({ memberId: 'mbr_0001', type: 'Injury — needs first aid', zone: 'Free-weights area' }); },
    'equipment-breakdown': () => { MaintenanceService.createWorkOrder({ assetId: 'ast_0001', problem: 'Belt slipping under load', severity: 'safety', reporterId: 'mbr_0001' }); },
    'payment-failure': () => { MemberService.setStatus('mbr_0003', 'expired', 'stf_0001', 'card declined'); AccessService.checkIn('mbr_0003', 'stf_0001'); },
    'class-cancellation': () => { const d = load(); const c = d.classes.find((x) => x.id === 'cls_0001'); c.status = 'cancelled'; persist(); emit('class.cancelled', { classId: c.id, reason: 'Instructor unavailable' }, 'stf_0006', null); },
    'end-of-day': () => {
      ['mbr_0002', 'mbr_0005'].forEach((id) => { AccessService.checkIn(id, 'stf_0001'); AccessService.checkOut(id); });
      PaymentService.take({ memberId: 'mbr_0002', amount: 95, method: 'cash', what: 'Monthly renewal', staffId: 'stf_0001' });
      PaymentService.take({ memberId: 'mbr_0001', amount: 300, method: 'card', what: 'PT package · 10 sessions', staffId: 'stf_0001' });
    },
  };

  function reset(scenario) {
    db = seed();
    db.scenario = scenario || 'normal-day';
    persist();
    localStorage.removeItem(CLOCK_KEY);
    (SCENARIOS[db.scenario] || SCENARIOS['normal-day'])();
    emit('demo.reset', { scenario: db.scenario });
    return db;
  }

  return {
    /* data */ load, persist, reset, seed,
    /* time  */ now, fmtTime, setClockOffset: (ms) => localStorage.setItem(CLOCK_KEY, String(ms)), clockOffset: offset,
    /* log   */ emit, events: () => load().events.slice(),
    /* svc   */ MemberService, AccessService, MaintenanceService, IncidentService, PaymentService, BookingService, NotificationService,
    /* demo  */ scenarios: () => Object.keys(SCENARIOS), runScenario: (n) => reset(n),
  };
})();
if (typeof window !== 'undefined') window.DemoData = DemoData;
