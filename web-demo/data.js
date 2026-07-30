/* ============================================================================
   Level Up demo-data engine — one shared mock "backend" for every page.

   Why this exists: pages used to hold their own seeds, so the same person or
   asset existed in several unrelated copies (audit finding F-DQ-2), and
   ownership was keyed by display name (F-ID-1). Everything here is keyed by an
   IMMUTABLE ID, related by ID, persisted, resettable, and scenario-driven.

   Service interfaces (MemberService, AccessService, …) are deliberately shaped
   like a real API so each method body can later call Supabase without any page
   changing. Cross-department propagation reuses the existing GymBus events the
   dashboards already consume — this layer does not replace the bus, it feeds it.

   Multi-branch model: every location, staff member, asset, room, class and
   lead carries a branch (`locationId`). Members carry a `homeBranchId`; their
   plan's `branchAccess` ('single' | 'all') decides whether they can be
   admitted anywhere other than home. Zone-level access (gym floor, PT zone,
   Fuel Bar & Retail, group-class room, lockers, staff-only) sits one layer
   below branch-level entry — see `zones` + `ZoneService`.
   ========================================================================== */
const DemoData = (() => {
  const DB_KEY = 'levelup_demo_db_v2';
  const CLOCK_KEY = 'levelup_demo_clock';   // optional simulated-time offset (ms)

  /* ---------- clock: one time source every page can share ---------- */
  const offset = () => Number(localStorage.getItem(CLOCK_KEY) || 0);
  const now = () => Date.now() + offset();
  const at = (h, m) => { const d = new Date(now()); d.setHours(h, m || 0, 0, 0); return d.getTime(); };
  const fmtTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const iso = (ms) => new Date(ms).toISOString();

  /* ---------- seed: stable IDs, real relationships ---------- */
  function seed() {
    const locations = [
      { id: 'loc_hamra', orgId: 'org_01', name: 'Hamra', capacity: 140, opens: '06:00', closes: '23:00' },
      { id: 'loc_badaro', orgId: 'org_01', name: 'Badaro', capacity: 100, opens: '06:00', closes: '23:00' },
      { id: 'loc_gemmayzeh', orgId: 'org_01', name: 'Gemmayzeh', capacity: 90, opens: '06:00', closes: '23:00' },
      { id: 'loc_hazmieh', orgId: 'org_01', name: 'Hazmieh', capacity: 70, opens: '06:00', closes: '23:00', unconfirmed: true },
    ];
    /* zone-level access catalog, generated per branch — see ZoneService */
    const ZONE_TEMPLATE = [
      { key: 'floor', name: 'Gym floor' },
      { key: 'pt', name: 'PT zone' },
      { key: 'fuelbar', name: 'Fuel Bar & Retail' },
      { key: 'group', name: 'Group class room' },
      { key: 'locker', name: 'Locker rooms' },
      { key: 'staff', name: 'Staff only' },
    ];
    const zones = [];
    locations.forEach((loc) => ZONE_TEMPLATE.forEach((z) => {
      zones.push({ id: `zn_${loc.id.slice(4)}_${z.key}`, locationId: loc.id, key: z.key, name: z.name });
    }));

    const members = [
      { id: 'mbr_0001', name: 'Samer Khanji', phone: '+961 70 123 456', email: 'samer@example.com', tier: 'Performance', planId: 'pln_6mo', homeBranchId: 'loc_hamra', status: 'active', subEnds: '2026-12-28', wallet: 68, points: 340, trainerId: 'stf_0002', allergies: ['peanuts'], injuries: ['Right shoulder impingement'], memberSince: '2026-03-01' },
      { id: 'mbr_0002', name: 'Jawad', phone: '+961 3 234 567', email: 'jawad@example.com', tier: 'Access', planId: 'pln_1mo', homeBranchId: 'loc_hamra', status: 'active', subEnds: '2026-09-01', wallet: 20, points: 90, trainerId: null, allergies: [], injuries: [], memberSince: '2026-05-12' },
      { id: 'mbr_0003', name: 'Mohamad', phone: '+961 71 345 678', email: 'mohamad@example.com', tier: 'Access', planId: 'pln_1mo', homeBranchId: 'loc_badaro', status: 'expired', subEnds: '2026-07-01', wallet: 5, points: 40, trainerId: null, allergies: [], injuries: [], memberSince: '2026-01-20' },
      { id: 'mbr_0004', name: 'Pamela <3', phone: '+961 76 456 789', email: 'pamela@example.com', tier: 'Performance', planId: 'pln_6mo', homeBranchId: 'loc_gemmayzeh', status: 'frozen', subEnds: '2027-01-15', wallet: 42, points: 210, trainerId: null, allergies: [], injuries: [], memberSince: '2026-02-08' },
      /* people who previously existed only inside staff dashboards — now real members (fixes the roster-orphan finding) */
      { id: 'mbr_0005', name: 'Lina Saab', phone: '+961 71 222 333', email: 'lina@example.com', tier: 'Access', planId: 'pln_1mo', homeBranchId: 'loc_badaro', status: 'active', subEnds: '2026-11-02', wallet: 15, points: 60, trainerId: 'stf_0002', allergies: [], injuries: [], memberSince: '2026-06-01' },
      { id: 'mbr_0006', name: 'Omar Khal', phone: '+961 76 444 555', email: 'omar@example.com', tier: 'Access', planId: 'pln_1mo', homeBranchId: 'loc_hamra', status: 'active', subEnds: '2026-10-20', wallet: 30, points: 75, trainerId: 'stf_0002', allergies: [], injuries: ['ACL reconstruction (2025)'], memberSince: '2026-04-18' },
      { id: 'mbr_0007', name: 'Maya Haddad', phone: '+961 71 555 777', email: 'maya@example.com', tier: 'Performance', planId: 'pln_6mo', homeBranchId: 'loc_gemmayzeh', status: 'active', subEnds: '2027-02-01', wallet: 55, points: 130, trainerId: null, allergies: ['milk'], injuries: [], memberSince: '2026-06-22' },
      { id: 'mbr_0009', name: 'Hassan M.', phone: '+961 3 777 111', email: 'hassan@example.com', tier: 'Access', planId: 'pln_1mo', homeBranchId: 'loc_hazmieh', status: 'active', subEnds: '2026-10-05', wallet: 18, points: 55, trainerId: null, allergies: [], injuries: [], memberSince: '2026-05-30' },
      { id: 'mbr_0008', name: 'Jad Rahal', phone: '+961 76 888 999', email: 'jad@example.com', tier: 'Access', planId: 'pln_1mo', homeBranchId: 'loc_hamra', status: 'active', subEnds: '2026-09-30', wallet: 12, points: 25, trainerId: null, allergies: [], injuries: [], memberSince: '2026-07-02' },
    ];
    const staff = [
      { id: 'stf_0001', name: 'Lara', role: 'reception', locationId: 'loc_hamra' },
      { id: 'stf_0002', name: 'Karim H.', role: 'trainer', locationId: 'loc_hamra', certs: ['Strength', 'Rehab'] },
      { id: 'stf_0003', name: 'Nour A.', role: 'cafe', locationId: 'loc_badaro' },
      { id: 'stf_0004', name: 'Rima D.', role: 'nutritionist', locationId: 'loc_hamra', certs: ['Licensed dietitian'] },
      { id: 'stf_0005', name: 'Suhail M.', role: 'maintenance', locationId: 'loc_hamra', certs: ['Covers all branches'] },
      { id: 'stf_0006', name: 'Tony A.', role: 'instructor', locationId: 'loc_gemmayzeh', certs: ['TRX', 'Boxing'] },
      { id: 'stf_0007', name: 'Rita S.', role: 'instructor', locationId: 'loc_badaro', certs: ['Spinning', 'Abs & Core'] },
    ];
    /* branchAccess: 'single' = home branch only, 'all' = every Level Up branch */
    const plans = [
      { id: 'pln_1mo', name: 'Monthly · Single Branch', price: 95, months: 1, branchAccess: 'single', guestsPerMonth: 1, freezeDays: 14 },
      { id: 'pln_6mo', name: '6-Month · All Branches', price: 480, months: 6, branchAccess: 'all', guestsPerMonth: 2, freezeDays: 30 },
      { id: 'pln_12mo', name: '12-Month · All Branches', price: 720, months: 12, branchAccess: 'all', guestsPerMonth: 4, freezeDays: 45 },
    ];
    const assets = [
      { id: 'ast_0001', name: 'Treadmill #3', category: 'Cardio', locationId: 'loc_hamra', zone: 'Cardio area', status: 'available', altAssetId: 'ast_0011', lastInspection: '2026-07-20', nextInspection: '2026-08-20' },
      { id: 'ast_0002', name: 'Leg press', category: 'Strength', locationId: 'loc_hamra', zone: 'Strength machines', status: 'available', altAssetId: null, lastInspection: '2026-07-18', nextInspection: '2026-08-18' },
      { id: 'ast_0003', name: 'Cable station A', category: 'Strength', locationId: 'loc_hamra', zone: 'Cable machines', status: 'available', altAssetId: null, lastInspection: '2026-07-15', nextInspection: '2026-08-15' },
      { id: 'ast_0005', name: 'Rowing machine #1', category: 'Cardio', locationId: 'loc_badaro', zone: 'Cardio area', status: 'waiting_parts', altAssetId: null, lastInspection: '2026-07-10', nextInspection: '2026-08-10' },
      { id: 'ast_0006', name: 'Main gate scanner', category: 'Access', locationId: 'loc_hamra', zone: 'Reception', status: 'limited', altAssetId: null, lastInspection: '2026-07-25', nextInspection: '2026-08-25' },
      { id: 'ast_0009', name: 'TRX Station #1', category: 'Functional', locationId: 'loc_gemmayzeh', zone: 'TRX studio', status: 'limited', altAssetId: 'ast_0012', lastInspection: '2026-07-26', nextInspection: '2026-08-02' },
      { id: 'ast_0011', name: 'Treadmill #1', category: 'Cardio', locationId: 'loc_hamra', zone: 'Cardio area', status: 'available', altAssetId: null, lastInspection: '2026-07-20', nextInspection: '2026-08-20' },
      { id: 'ast_0012', name: 'TRX Station #2', category: 'Functional', locationId: 'loc_gemmayzeh', zone: 'TRX studio', status: 'available', altAssetId: null, lastInspection: '2026-07-26', nextInspection: '2026-08-26' },
      { id: 'ast_0013', name: 'Spin Bike #1', category: 'Cardio', locationId: 'loc_badaro', zone: 'Spinning studio', status: 'available', altAssetId: null, lastInspection: '2026-07-22', nextInspection: '2026-08-22' },
      { id: 'ast_0014', name: 'Free-weight rack', category: 'Strength', locationId: 'loc_hazmieh', zone: 'Free-weight area', status: 'available', altAssetId: null, lastInspection: '2026-07-14', nextInspection: '2026-08-14' },
    ];
    const rooms = [
      { id: 'rm_group_hamra', name: 'Group Class Room', locationId: 'loc_hamra', capacity: 18 },
      { id: 'rm_spin_badaro', name: 'Spin Studio', locationId: 'loc_badaro', capacity: 20 },
      { id: 'rm_trx_gemmayzeh', name: 'TRX Studio', locationId: 'loc_gemmayzeh', capacity: 14 },
    ];
    const classes = [
      { id: 'cls_0001', name: 'TRX Circuit', instructorId: 'stf_0006', roomId: 'rm_trx_gemmayzeh', locationId: 'loc_gemmayzeh', startsAt: at(19, 0), capacity: 14, status: 'scheduled' },
      { id: 'cls_0002', name: 'Spin 45', instructorId: 'stf_0007', roomId: 'rm_spin_badaro', locationId: 'loc_badaro', startsAt: at(18, 0), capacity: 20, status: 'scheduled' },
      { id: 'cls_0003', name: 'Abs & Core', instructorId: 'stf_0007', roomId: 'rm_group_hamra', locationId: 'loc_hamra', startsAt: at(17, 30), capacity: 18, status: 'scheduled' },
    ];
    const bookings = [
      { id: 'bkg_0001', type: 'class', classId: 'cls_0001', memberId: 'mbr_0007', state: 'booked', createdAt: now() - 36e5 },
      { id: 'bkg_0002', type: 'class', classId: 'cls_0001', memberId: 'mbr_0001', state: 'booked', createdAt: now() - 30e5 },
      { id: 'bkg_0003', type: 'pt', trainerId: 'stf_0002', memberId: 'mbr_0001', startsAt: at(18, 0), state: 'scheduled', packageId: 'pkg_0001' },
    ];
    const packages = [{ id: 'pkg_0001', memberId: 'mbr_0001', trainerId: 'stf_0002', total: 10, used: 7, price: 300 }];
    /* ONE health record per member — the single source of truth for safety
       facts. Every surface reads these; nothing keeps its own copy. Each fact
       carries provenance (who recorded it, when, from where) and a precedence
       rank so a conflict has a defined winner instead of "whichever page you
       happened to open". (audit F-SAFE-1) */
    const healthRecords = [
      { memberId: 'mbr_0001', facts: [
        { id: 'hf_0001', kind: 'allergy', label: 'peanuts', severity: 'high', source: 'member_declared', recordedBy: 'mbr_0001', recordedAt: '2026-03-01', precedence: 2, note: 'Declared in the onboarding health questionnaire.' },
        { id: 'hf_0002', kind: 'injury', label: 'Right shoulder impingement', severity: 'medium', source: 'trainer_assessment', recordedBy: 'stf_0002', recordedAt: '2026-07-19', precedence: 3, note: 'Avoid overhead / behind-neck pressing at end range; stop on any pinch.' },
      ] },
      { memberId: 'mbr_0006', facts: [
        { id: 'hf_0003', kind: 'injury', label: 'ACL reconstruction (2025)', severity: 'high', source: 'physio_clearance', recordedBy: 'stf_0004', recordedAt: '2026-04-18', precedence: 4, note: 'No deep jumps; leg extensions cleared by physio.' },
      ] },
      { memberId: 'mbr_0007', facts: [
        { id: 'hf_0004', kind: 'allergy', label: 'milk', severity: 'high', source: 'member_declared', recordedBy: 'mbr_0007', recordedAt: '2026-06-22', precedence: 2, note: 'Declared at intake.' },
        { id: 'hf_0005', kind: 'condition', label: 'Pregnancy — 2nd trimester', severity: 'review', source: 'member_declared', recordedBy: 'mbr_0007', recordedAt: '2026-07-01', precedence: 4, note: 'OB guidance on file; conservative targets, refer anything clinical.' },
      ] },
    ];
    return {
      version: 2, createdAt: iso(now()), scenario: 'normal-day', healthRecords,
      organizations: [{ id: 'org_01', name: 'Level Up' }],
      locations, zones, rooms,
      plans, members, staff, assets, classes, bookings, packages,
      visits: [], entryAttempts: [], orders: [], payments: [], incidents: [], workOrders: [], tasks: [], notifications: [], events: [],
      leads: [
        { id: 'led_0001', name: 'Rami Chidiac', phone: '+961 3 987 654', source: 'Instagram', stage: 'contacted', branchId: 'loc_hamra', ownerStaffId: 'stf_0001', createdAt: now() - 864e5 },
        { id: 'led_0002', name: 'Nadia F.', phone: '+961 71 111 222', source: 'Walk-in', stage: 'tour_scheduled', branchId: 'loc_badaro', ownerStaffId: 'stf_0001', createdAt: now() - 1728e5 },
      ],
    };
  }

  /* ---------- persistence ---------- */
  let db = null;
  /* Forward-migrate a persisted DB written by an older build: any collection
     added since is filled from the current seed instead of arriving undefined.
     (A stored DB without `healthRecords` used to crash HealthService.) */
  function migrate(stored) {
    const fresh = seed();
    let changed = false;
    Object.keys(fresh).forEach((k) => {
      if (stored[k] === undefined) { stored[k] = fresh[k]; changed = true; }
    });
    if (changed) { stored.version = fresh.version; }
    return { stored, changed };
  }
  function load() {
    if (db) return db;
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const { stored, changed } = migrate(JSON.parse(raw));
        db = stored;
        if (changed) persist();
        return db;
      }
    } catch (e) {}
    db = seed(); persist(); return db;
  }
  function persist() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
  const nextId = (prefix, coll) => prefix + '_' + String((load()[coll] || []).length + 1).padStart(4, '0');

  /* ---------- append-only event log + audit ---------- */
  function emit(type, payload, actorId, subjectId, locationId) {
    const d = load();
    const ev = { id: 'evt_' + now().toString(36) + Math.random().toString(36).slice(2, 6), type, orgId: 'org_01', locationId: locationId || null,
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
    planFor: (id) => { const m = MemberService.byId(id); return m ? load().plans.find((p) => p.id === m.planId) || null : null; },
    setStatus(id, status, actorId, reason) {
      const m = MemberService.byId(id); if (!m) return null;
      const from = m.status; m.status = status; persist();
      emit('member.status_changed', { from, to: status, reason }, actorId, id, m.homeBranchId);
      return m;
    },
  };

  const BranchService = {
    list: () => load().locations.slice(),
    byId: (id) => load().locations.find((l) => l.id === id) || null,
  };

  const AccessService = {
    /* server-shaped validation: the SAME rules a backend must enforce.
       Returns { ok, reason } or { ok:true, branchId }. Callers must not bypass this. */
    validate(memberId, branchId) {
      const m = MemberService.byId(memberId);
      if (!m) return { ok: false, reason: 'unknown_member' };
      if (m.status === 'frozen') return { ok: false, reason: 'frozen' };
      if (m.status === 'expired') return { ok: false, reason: 'expired' };
      if (m.status === 'suspended') return { ok: false, reason: 'suspended' };
      const resolvedBranch = branchId || m.homeBranchId;
      const loc = BranchService.byId(resolvedBranch);
      if (!loc) return { ok: false, reason: 'unknown_branch' };
      const plan = load().plans.find((p) => p.id === m.planId);
      if (plan && plan.branchAccess === 'single' && resolvedBranch !== m.homeBranchId) {
        return { ok: false, reason: 'branch_not_allowed' };
      }
      const open = AccessService.insideNow().some((v) => v.memberId === memberId);
      if (open) return { ok: false, reason: 'duplicate_visit' };
      if (AccessService.insideNow(resolvedBranch).length >= loc.capacity) return { ok: false, reason: 'at_capacity' };
      return { ok: true, branchId: resolvedBranch };
    },
    /* omit branchId for network-wide, pass one to scope to a single branch */
    insideNow: (branchId) => load().visits.filter((v) => !v.exitedAt && (!branchId || v.locationId === branchId)),
    checkIn(memberId, actorId, branchId) {
      const v = AccessService.validate(memberId, branchId);
      const d = load();
      if (!v.ok) {
        const att = { id: nextId('att', 'entryAttempts'), memberId, at: iso(now()), result: 'denied', reason: v.reason, locationId: branchId || null };
        d.entryAttempts.unshift(att); persist();
        emit('member.entry_denied', { reason: v.reason }, actorId, memberId, branchId || null);
        return { ok: false, reason: v.reason, attempt: att };
      }
      const visit = { id: nextId('vst', 'visits'), memberId, enteredAt: iso(now()), exitedAt: null, locationId: v.branchId };
      d.visits.unshift(visit); persist();
      emit('member.entry_admitted', { visitId: visit.id, __bus: { type: 'gate-entry', payload: { member: MemberService.byId(memberId).name, memberId, time: fmtTime(now()) } } }, actorId, memberId, v.branchId);
      return { ok: true, visit };
    },
    checkOut(memberId) {
      const open = load().visits.find((v) => v.memberId === memberId && !v.exitedAt);
      if (!open) return { ok: false, reason: 'no_open_visit' };
      open.exitedAt = iso(now()); persist();
      emit('member.exited', { visitId: open.id }, null, memberId, open.locationId);
      return { ok: true, visit: open };
    },
  };

  /* zone-level access — one layer below branch entry (gym floor, PT zone,
     Fuel Bar & Retail, group-class room, lockers, staff-only) */
  const ZoneService = {
    forBranch: (locationId) => load().zones.filter((z) => z.locationId === locationId),
    byId: (id) => load().zones.find((z) => z.id === id) || null,
    canAccess(zoneId, { memberId, staffId } = {}) {
      const zone = ZoneService.byId(zoneId);
      if (!zone) return { ok: false, reason: 'unknown_zone' };
      if (staffId) {
        const st = load().staff.find((s) => s.id === staffId);
        if (!st) return { ok: false, reason: 'unknown_staff' };
        return { ok: true }; // staff move freely through their job's zones, including staff-only
      }
      if (!memberId) return { ok: false, reason: 'no_subject' };
      const m = MemberService.byId(memberId);
      if (!m) return { ok: false, reason: 'unknown_member' };
      if (m.status === 'frozen' || m.status === 'expired' || m.status === 'suspended') return { ok: false, reason: m.status };
      /* zone gating happens while the member is already inside — not a fresh
         check-in — so this checks presence in THIS branch, not entry eligibility */
      const insideHere = AccessService.insideNow(zone.locationId).some((v) => v.memberId === memberId);
      if (!insideHere) return { ok: false, reason: 'not_checked_in_here' };
      if (zone.key === 'staff') return { ok: false, reason: 'staff_only_zone' };
      if (zone.key === 'pt') {
        const hasPackage = load().packages.some((p) => p.memberId === memberId && p.used < p.total);
        if (!hasPackage) return { ok: false, reason: 'no_active_pt_package' };
      }
      if (zone.key === 'group') {
        const hasBooking = load().bookings.some((b) => b.memberId === memberId && b.state === 'booked' && b.classId
          && load().classes.some((c) => c.id === b.classId && c.locationId === zone.locationId));
        if (!hasBooking) return { ok: false, reason: 'no_class_booking' };
      }
      return { ok: true }; // gym floor / Fuel Bar & Retail / lockers — open to any admitted member
    },
  };

  /* single source of truth for safety facts, with role-scoped visibility */
  const HealthService = {
    forMember(memberId) { return (load().healthRecords.find((r) => r.memberId === memberId) || { facts: [] }).facts.slice(); },
    /* each role sees only what it needs to keep the member safe */
    visibleTo(memberId, role) {
      const facts = HealthService.forMember(memberId);
      if (role === 'nutritionist') return facts;                                   // full record
      if (role === 'trainer') return facts.filter((f) => f.kind !== 'condition');    // injuries + allergies
      if (role === 'instructor') return facts.filter((f) => f.kind === 'injury');    // movement limits only
      if (role === 'cafe') return facts.filter((f) => f.kind === 'allergy');         // allergens only
      if (role === 'reception') return facts.filter((f) => f.severity === 'high').map((f) => ({ ...f, note: '' })); // flag, no detail
      return [];
    },
    /* conflicts resolve by precedence (clinical > trainer > member-declared) */
    winner(memberId, label) {
      return HealthService.forMember(memberId).filter((f) => f.label === label).sort((a, b) => b.precedence - a.precedence)[0] || null;
    },
    record(memberId, fact, actorId) {
      const d = load();
      let rec = d.healthRecords.find((r) => r.memberId === memberId);
      if (!rec) { rec = { memberId, facts: [] }; d.healthRecords.push(rec); }
      const f = { id: nextId('hf', 'healthRecords'), recordedBy: actorId, recordedAt: iso(now()).slice(0, 10), precedence: 2, ...fact };
      rec.facts.push(f); persist();
      emit('health.fact_recorded', { kind: f.kind, label: f.label }, actorId, memberId);
      return f;
    },
  };

  const MaintenanceService = {
    assets: () => load().assets.slice(),
    assetById: (id) => load().assets.find((a) => a.id === id) || null,
    isolate(assetId, actorId, reason) {
      const a = MaintenanceService.assetById(assetId); if (!a) return null;
      a.status = 'out_of_service'; persist();
      const alt = a.altAssetId ? MaintenanceService.assetById(a.altAssetId) : null;
      emit('maintenance.asset_isolated', { reason, __bus: { type: 'asset-status', payload: { asset: a.name, assetId: a.id, status: 'Out of service', alt: alt ? alt.name : null } } }, actorId, assetId, a.locationId);
      return a;
    },
    returnToService(assetId, actorId, verifiedBy) {
      const a = MaintenanceService.assetById(assetId); if (!a) return null;
      a.status = 'available'; a.lastInspection = iso(now()).slice(0, 10); persist();
      emit('maintenance.asset_restored', { verifiedBy, __bus: { type: 'asset-status', payload: { asset: a.name, assetId: a.id, status: 'Available', alt: null } } }, actorId, assetId, a.locationId);
      return a;
    },
    createWorkOrder({ assetId, problem, severity, reporterId }) {
      const d = load();
      const asset = MaintenanceService.assetById(assetId);
      const wo = { id: nextId('wo', 'workOrders'), assetId, locationId: asset ? asset.locationId : null, problem, severity: severity || 'normal', reporterId: reporterId || null,
        status: 'reported', assigneeId: null, createdAt: iso(now()), history: [{ at: iso(now()), status: 'reported', by: reporterId }] };
      d.workOrders.unshift(wo); persist();
      emit('maintenance.work_order_created', { workOrderId: wo.id, severity: wo.severity }, reporterId, assetId, wo.locationId);
      if (severity === 'safety') MaintenanceService.isolate(assetId, reporterId, 'auto-isolated: safety report');
      return wo;
    },
  };

  const IncidentService = {
    list: () => load().incidents.slice(),
    raiseSOS({ memberId, type, zone, branchId }) {
      const d = load();
      const m = MemberService.byId(memberId);
      const resolvedBranch = branchId || (m ? m.homeBranchId : null);
      const inc = { id: nextId('inc', 'incidents'), kind: 'sos', memberId, type, zone, locationId: resolvedBranch, status: 'active', createdAt: iso(now()), acknowledgedBy: null, closedAt: null, actions: [] };
      d.incidents.unshift(inc); persist();
      emit('member.sos_started', { incidentId: inc.id, __bus: { type: 'sos', payload: { member: m ? m.name : memberId, memberId, sosType: type, zone } } }, null, memberId, resolvedBranch);
      return inc;
    },
    acknowledge(incidentId, staffId) {
      const inc = load().incidents.find((i) => i.id === incidentId); if (!inc) return null;
      inc.status = 'acknowledged'; inc.acknowledgedBy = staffId; inc.actions.push({ at: iso(now()), by: staffId, action: 'acknowledged' }); persist();
      emit('member.sos_acknowledged', { incidentId }, staffId, inc.memberId, inc.locationId);
      return inc;
    },
    /* closing an SOS does NOT close the incident until a report exists */
    close(incidentId, staffId, report) {
      const inc = load().incidents.find((i) => i.id === incidentId); if (!inc) return null;
      if (!report || String(report).trim().length < 5) return { error: 'incident_report_required' };
      inc.status = 'closed'; inc.closedAt = iso(now()); inc.report = report;
      inc.actions.push({ at: iso(now()), by: staffId, action: 'closed' }); persist();
      emit('incident.closed', { incidentId }, staffId, inc.memberId, inc.locationId);
      return inc;
    },
  };

  const PaymentService = {
    ledger: () => load().payments.slice(),
    take({ memberId, amount, method, what, staffId, branchId }) {
      const d = load();
      const m = MemberService.byId(memberId);
      const resolvedBranch = branchId || (m ? m.homeBranchId : null);
      const p = { id: nextId('pay', 'payments'), memberId, amount, method, what, staffId, locationId: resolvedBranch, at: iso(now()), status: 'paid' };
      d.payments.unshift(p); persist();
      emit('payment.taken', { paymentId: p.id, amount, method }, staffId, memberId, resolvedBranch);
      return p;
    },
    todayTotal: (branchId) => load().payments.filter((p) => p.status === 'paid' && (!branchId || p.locationId === branchId)).reduce((s, p) => s + p.amount, 0),
  };

  const BookingService = {
    list: () => load().bookings.slice(),
    forClass: (classId) => load().bookings.filter((b) => b.classId === classId && b.state === 'booked'),
    bookClass(memberId, classId) {
      const d = load();
      const cls = d.classes.find((c) => c.id === classId); if (!cls) return { error: 'unknown_class' };
      const m = MemberService.byId(memberId); if (!m) return { error: 'unknown_member' };
      const plan = d.plans.find((p) => p.id === m.planId);
      if (plan && plan.branchAccess === 'single' && cls.locationId !== m.homeBranchId) return { error: 'branch_not_allowed' };
      if (BookingService.forClass(classId).length >= cls.capacity) return { error: 'full' };
      const clash = d.bookings.find((b) => b.memberId === memberId && b.state === 'booked' && b.classId && d.classes.find((c) => c.id === b.classId && Math.abs(c.startsAt - cls.startsAt) < 45 * 60000));
      if (clash) return { error: 'time_conflict' };
      const b = { id: nextId('bkg', 'bookings'), type: 'class', classId, memberId, state: 'booked', createdAt: now() };
      d.bookings.unshift(b); persist();
      emit('class.booked', { bookingId: b.id, classId }, memberId, memberId, cls.locationId);
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
    'normal-day': () => { /* seed as-is, a few members inside — each at their home branch */
      ['mbr_0002', 'mbr_0005', 'mbr_0006'].forEach((id) => AccessService.checkIn(id, 'stf_0001'));
    },
    'morning-rush': () => { ['mbr_0001', 'mbr_0002', 'mbr_0005', 'mbr_0006', 'mbr_0007', 'mbr_0008'].forEach((id) => AccessService.checkIn(id, 'stf_0001')); },
    'full-capacity': () => {
      const d = load();
      d.locations.find((l) => l.id === 'loc_hamra').capacity = 4; persist();
      ['mbr_0002', 'mbr_0006', 'mbr_0008', 'mbr_0007'].forEach((id) => AccessService.checkIn(id, 'stf_0001', 'loc_hamra'));
    },
    'medical-emergency': () => { AccessService.checkIn('mbr_0001', 'stf_0001'); IncidentService.raiseSOS({ memberId: 'mbr_0001', type: 'Injury — needs first aid', zone: 'Free-weight area' }); },
    'equipment-breakdown': () => { MaintenanceService.createWorkOrder({ assetId: 'ast_0001', problem: 'Belt slipping under load', severity: 'safety', reporterId: 'mbr_0001' }); },
    'payment-failure': () => { MemberService.setStatus('mbr_0003', 'expired', 'stf_0001', 'card declined'); AccessService.checkIn('mbr_0003', 'stf_0001'); },
    'class-cancellation': () => { const d = load(); const c = d.classes.find((x) => x.id === 'cls_0001'); c.status = 'cancelled'; persist(); emit('class.cancelled', { classId: c.id, reason: 'Instructor unavailable' }, 'stf_0006', null, c.locationId); },
    'end-of-day': () => {
      ['mbr_0002', 'mbr_0005'].forEach((id) => { AccessService.checkIn(id, 'stf_0001'); AccessService.checkOut(id); });
      PaymentService.take({ memberId: 'mbr_0002', amount: 95, method: 'cash', what: 'Monthly renewal', staffId: 'stf_0001', branchId: 'loc_hamra' });
      PaymentService.take({ memberId: 'mbr_0001', amount: 300, method: 'card', what: 'PT package · 10 sessions', staffId: 'stf_0001', branchId: 'loc_hamra' });
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
    /* svc   */ MemberService, BranchService, AccessService, ZoneService, MaintenanceService, IncidentService, PaymentService, BookingService, NotificationService, HealthService,
    /* demo  */ scenarios: () => Object.keys(SCENARIOS), runScenario: (n) => reset(n),
  };
})();
if (typeof window !== 'undefined') window.DemoData = DemoData;
