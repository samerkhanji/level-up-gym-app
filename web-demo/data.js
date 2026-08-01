/* ============================================================================
   Level Up OS demo-data engine — one shared mock "backend" for every page.

   Everything is keyed by an IMMUTABLE ID, related by ID, persisted,
   resettable, and scenario-driven. Service interfaces are deliberately shaped
   like a real API so each method body can later call Supabase without any
   page changing. Cross-department propagation reuses the GymBus events the
   dashboards already consume — this layer feeds the bus, it does not replace it.

   Multi-branch model (Level Up Beirut): Hamra, Badaro, Gemmayzeh, Hazmieh
   (Hazmieh unconfirmed — flagged in seed). Members carry a homeBranchId;
   their plan's branchAccess ('single'|'all') decides admission elsewhere.
   Zone-level access (free-weight, strength, cardio, TRX studio, spin studio,
   group room, PT zone, Fuel Bar, lockers, staff-only) sits one layer below
   branch entry — ZoneService. Every override-style mutation REQUIRES a
   reason and is audit-logged through emit().

   Plan catalog, prices, and the Hazmieh branch are demo placeholders — the
   real packages must come from Level Up, not be invented here.
   ========================================================================== */
const DemoData = (() => {
  const DB_KEY = 'levelup_demo_db_v4';
  const CLOCK_KEY = 'levelup_demo_clock';   // optional simulated-time offset (ms)

  /* ---------- clock: one time source every page can share ---------- */
  const offset = () => Number(localStorage.getItem(CLOCK_KEY) || 0);
  const now = () => Date.now() + offset();
  const at = (h, m) => { const d = new Date(now()); d.setHours(h, m || 0, 0, 0); return d.getTime(); };
  const daysFromNow = (n) => now() + n * 864e5;
  const fmtTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const iso = (ms) => new Date(ms).toISOString();
  const isToday = (ms) => { const a = new Date(ms), b = new Date(now()); return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear(); };

  /* Beirut-traffic travel time between branches, minutes. Symmetric. */
  const TRAVEL_MINUTES = {
    'loc_hamra|loc_badaro': 25, 'loc_hamra|loc_gemmayzeh': 15, 'loc_hamra|loc_hazmieh': 35,
    'loc_badaro|loc_gemmayzeh': 20, 'loc_badaro|loc_hazmieh': 15, 'loc_gemmayzeh|loc_hazmieh': 25,
  };
  const travelMinutes = (a, b) => (a === b ? 0 : (TRAVEL_MINUTES[a + '|' + b] || TRAVEL_MINUTES[b + '|' + a] || 30));

  /* ---------- seed: stable IDs, real relationships ---------- */
  function seed() {
    const locations = [
      { id: 'loc_hamra', orgId: 'org_01', name: 'Hamra', capacity: 140, opens: '06:00', closes: '23:00', phone: '+961 1 350 000', address: 'Hamra Main St, Beirut', announcements: [{ at: iso(now() - 72e5), msg: 'New dumbbell range up to 60 kg now on the free-weight floor.' }], closure: null },
      { id: 'loc_badaro', orgId: 'org_01', name: 'Badaro', capacity: 100, opens: '06:00', closes: '23:00', phone: '+961 1 380 000', address: 'Badaro St 54, Beirut', announcements: [], closure: null },
      { id: 'loc_gemmayzeh', orgId: 'org_01', name: 'Gemmayzeh', capacity: 90, opens: '06:00', closes: '23:00', phone: '+961 1 440 000', address: 'Gouraud St, Gemmayzeh', announcements: [], closure: null },
      { id: 'loc_hazmieh', orgId: 'org_01', name: 'Hazmieh', capacity: 70, opens: '07:00', closes: '22:00', phone: '+961 5 450 000', address: 'Hazmieh Blvd', announcements: [], closure: null, unconfirmed: true },
    ];
    /* Level Up zone catalog, generated per branch. `access` drives ZoneService. */
    const ZONE_TEMPLATE = [
      { key: 'freeweight', name: 'Free-weight area', access: 'member' },
      { key: 'strength', name: 'Strength machines', access: 'member' },
      { key: 'cable', name: 'Cable machines', access: 'member' },
      { key: 'cardio', name: 'Cardio area', access: 'member' },
      { key: 'functional', name: 'Functional training', access: 'member' },
      { key: 'trx', name: 'TRX studio', access: 'class' },
      { key: 'spin', name: 'Spinning studio', access: 'class' },
      { key: 'group', name: 'Group class room', access: 'class' },
      { key: 'pt', name: 'PT zone', access: 'pt' },
      { key: 'fuelbar', name: 'Fuel Bar & Retail', access: 'member' },
      { key: 'locker', name: 'Locker rooms', access: 'member' },
      { key: 'reception', name: 'Reception', access: 'member' },
      { key: 'plant', name: 'Electrical & generator', access: 'staff' },
      { key: 'staff', name: 'Staff only', access: 'staff' },
    ];
    const zones = [];
    locations.forEach((loc) => ZONE_TEMPLATE.forEach((z) => {
      zones.push({ id: `zn_${loc.id.slice(4)}_${z.key}`, locationId: loc.id, key: z.key, name: z.name, access: z.access });
    }));

    /* Plan catalog — DEMO PLACEHOLDER prices/terms; the real packages come from
       Level Up. accessHours null = any time the branch is open. */
    const plans = [
      { id: 'pln_day', kind: 'day_pass', name: 'Day Pass', price: 12, days: 1, branchAccess: 'single', classesIncluded: false, guestsPerMonth: 0, freezeDays: 0, ptCredits: 0, joiningFee: 0 },
      { id: 'pln_trial', kind: 'trial', name: 'Trial Pass · 3 days', price: 0, days: 3, branchAccess: 'single', classesIncluded: false, guestsPerMonth: 0, freezeDays: 0, ptCredits: 0, joiningFee: 0 },
      { id: 'pln_1mo_single', kind: 'standard', name: 'Monthly · Single Branch', price: 95, months: 1, branchAccess: 'single', classesIncluded: false, guestsPerMonth: 1, freezeDays: 7, ptCredits: 0, joiningFee: 25 },
      { id: 'pln_1mo_all', kind: 'standard', name: 'Monthly · All Branches', price: 120, months: 1, branchAccess: 'all', classesIncluded: false, guestsPerMonth: 1, freezeDays: 7, ptCredits: 0, joiningFee: 25 },
      { id: 'pln_3mo_single', kind: 'standard', name: 'Quarterly · Single Branch', price: 255, months: 3, branchAccess: 'single', classesIncluded: false, guestsPerMonth: 1, freezeDays: 14, ptCredits: 0, joiningFee: 0 },
      { id: 'pln_6mo_all', kind: 'standard', name: '6-Month · All Branches', price: 600, months: 6, branchAccess: 'all', classesIncluded: true, guestsPerMonth: 2, freezeDays: 30, ptCredits: 0, joiningFee: 0 },
      { id: 'pln_12mo_all', kind: 'standard', name: 'Annual · All Branches', price: 1080, months: 12, branchAccess: 'all', classesIncluded: true, guestsPerMonth: 4, freezeDays: 45, ptCredits: 0, joiningFee: 0 },
      { id: 'pln_student', kind: 'student', name: 'Student Monthly', price: 65, months: 1, branchAccess: 'single', classesIncluded: false, guestsPerMonth: 0, freezeDays: 7, ptCredits: 0, joiningFee: 0, requiresId: 'student card' },
      { id: 'pln_offpeak', kind: 'offpeak', name: 'Off-Peak Monthly', price: 70, months: 1, branchAccess: 'single', classesIncluded: false, accessHours: { from: 9, to: 16 }, guestsPerMonth: 0, freezeDays: 7, ptCredits: 0, joiningFee: 0 },
      { id: 'pln_corp', kind: 'corporate', name: 'Corporate Annual · per seat', price: 900, months: 12, branchAccess: 'all', classesIncluded: true, guestsPerMonth: 2, freezeDays: 30, ptCredits: 0, joiningFee: 0 },
      { id: 'pln_couple', kind: 'family', name: 'Couple · 6-Month · All Branches', price: 1050, months: 6, branchAccess: 'all', classesIncluded: true, guestsPerMonth: 2, freezeDays: 30, ptCredits: 0, joiningFee: 0, seats: 2 },
      { id: 'pln_gymclass_1mo', kind: 'standard', name: 'Monthly + Classes · All Branches', price: 140, months: 1, branchAccess: 'all', classesIncluded: true, guestsPerMonth: 1, freezeDays: 7, ptCredits: 0, joiningFee: 25 },
      { id: 'pln_gympt_1mo', kind: 'standard', name: 'Monthly + 4 PT · All Branches', price: 260, months: 1, branchAccess: 'all', classesIncluded: true, guestsPerMonth: 1, freezeDays: 7, ptCredits: 4, joiningFee: 0 },
    ];

    const members = [
      { id: 'mbr_0001', name: 'Samer Khanji', phone: '+961 70 123 456', email: 'samer@example.com', planId: 'pln_6mo_all', homeBranchId: 'loc_hamra', status: 'active', subEnds: '2026-12-28', wallet: 68, points: 340, trainerId: 'stf_tr_karim', qrVersion: 1, memberSince: '2026-03-01' },
      { id: 'mbr_0002', name: 'Jawad Itani', phone: '+961 3 234 567', email: 'jawad@example.com', planId: 'pln_1mo_single', homeBranchId: 'loc_hamra', status: 'active', subEnds: '2026-08-09', wallet: 20, points: 90, trainerId: null, qrVersion: 1, memberSince: '2026-05-12' },
      { id: 'mbr_0003', name: 'Mohamad Sleiman', phone: '+961 71 345 678', email: 'mohamad@example.com', planId: 'pln_1mo_single', homeBranchId: 'loc_badaro', status: 'expired', subEnds: '2026-07-01', wallet: 5, points: 40, trainerId: null, qrVersion: 1, memberSince: '2026-01-20' },
      { id: 'mbr_0004', name: 'Pamela Aoun', phone: '+961 76 456 789', email: 'pamela@example.com', planId: 'pln_6mo_all', homeBranchId: 'loc_gemmayzeh', status: 'frozen', subEnds: '2027-01-15', wallet: 42, points: 210, trainerId: null, qrVersion: 1, memberSince: '2026-02-08' },
      { id: 'mbr_0005', name: 'Lina Saab', phone: '+961 71 222 333', email: 'lina@example.com', planId: 'pln_gympt_1mo', homeBranchId: 'loc_badaro', status: 'active', subEnds: '2026-08-14', wallet: 15, points: 60, trainerId: 'stf_tr_karim', qrVersion: 1, memberSince: '2026-06-01' },
      { id: 'mbr_0006', name: 'Omar Khal', phone: '+961 76 444 555', email: 'omar@example.com', planId: 'pln_1mo_all', homeBranchId: 'loc_hamra', status: 'active', subEnds: '2026-08-06', wallet: 30, points: 75, trainerId: 'stf_tr_yara', qrVersion: 1, memberSince: '2026-04-18' },
      { id: 'mbr_0007', name: 'Maya Haddad', phone: '+961 71 555 777', email: 'maya@example.com', planId: 'pln_12mo_all', homeBranchId: 'loc_gemmayzeh', status: 'active', subEnds: '2027-02-01', wallet: 55, points: 130, trainerId: null, qrVersion: 1, memberSince: '2026-06-22' },
      { id: 'mbr_0008', name: 'Jad Rahal', phone: '+961 76 888 999', email: 'jad@example.com', planId: 'pln_student', homeBranchId: 'loc_hamra', status: 'active', subEnds: '2026-08-25', wallet: 12, points: 25, trainerId: null, qrVersion: 1, memberSince: '2026-07-02' },
      { id: 'mbr_0009', name: 'Hassan Mansour', phone: '+961 3 777 111', email: 'hassan@example.com', planId: 'pln_offpeak', homeBranchId: 'loc_hazmieh', status: 'active', subEnds: '2026-08-30', wallet: 18, points: 55, trainerId: null, qrVersion: 1, memberSince: '2026-05-30' },
      { id: 'mbr_0010', name: 'Rana Fakhry', phone: '+961 70 909 090', email: 'rana@example.com', planId: 'pln_corp', homeBranchId: 'loc_badaro', status: 'active', subEnds: '2027-05-01', wallet: 90, points: 410, trainerId: 'stf_tr_nadim', qrVersion: 1, memberSince: '2025-05-01', corporate: 'Alpha Bank' },
      { id: 'mbr_0011', name: 'Tarek & Dina Nassif', phone: '+961 71 616 161', email: 'nassif@example.com', planId: 'pln_couple', homeBranchId: 'loc_gemmayzeh', status: 'active', subEnds: '2026-11-20', wallet: 25, points: 88, trainerId: null, qrVersion: 1, memberSince: '2026-05-20' },
      { id: 'mbr_0012', name: 'Nour Chami', phone: '+961 76 121 212', email: 'nour.c@example.com', planId: 'pln_1mo_all', homeBranchId: 'loc_hamra', status: 'suspended', subEnds: '2026-09-15', wallet: 0, points: 12, trainerId: null, qrVersion: 1, memberSince: '2026-06-10', restriction: 'Unpaid balance — see reception' },
    ];

    const staff = [
      /* reception, one per branch */
      { id: 'stf_rc_lara', name: 'Lara Gh.', role: 'reception', locationId: 'loc_hamra' },
      { id: 'stf_rc_joelle', name: 'Joelle M.', role: 'reception', locationId: 'loc_badaro' },
      { id: 'stf_rc_marc', name: 'Marc B.', role: 'reception', locationId: 'loc_gemmayzeh' },
      { id: 'stf_rc_dana', name: 'Dana K.', role: 'reception', locationId: 'loc_hazmieh' },
      /* trainers — worksAt lists every branch they cover */
      { id: 'stf_tr_karim', name: 'Karim H.', role: 'trainer', locationId: 'loc_hamra', worksAt: ['loc_hamra', 'loc_badaro'], specialties: ['Bodybuilding', 'Strength & conditioning'], availability: [{ branchId: 'loc_hamra', fromH: 8, toH: 14 }, { branchId: 'loc_badaro', fromH: 16, toH: 21 }] },
      { id: 'stf_tr_nadim', name: 'Nadim K.', role: 'trainer', locationId: 'loc_badaro', worksAt: ['loc_badaro', 'loc_hazmieh'], specialties: ['Weight loss', 'Functional training'], availability: [{ branchId: 'loc_badaro', fromH: 9, toH: 15 }, { branchId: 'loc_hazmieh', fromH: 17, toH: 21 }] },
      { id: 'stf_tr_yara', name: 'Yara S.', role: 'trainer', locationId: 'loc_gemmayzeh', worksAt: ['loc_gemmayzeh', 'loc_hamra'], specialties: ['Post-rehabilitation', 'Beginner coaching'], availability: [{ branchId: 'loc_gemmayzeh', fromH: 8, toH: 13 }, { branchId: 'loc_hamra', fromH: 15, toH: 20 }] },
      { id: 'stf_tr_elie', name: 'Elie F.', role: 'trainer', locationId: 'loc_hazmieh', worksAt: ['loc_hazmieh'], specialties: ['Sports performance', 'Strength & conditioning'], availability: [{ branchId: 'loc_hazmieh', fromH: 10, toH: 20 }] },
      /* instructors — class program is a separate workflow from PT */
      { id: 'stf_in_tony', name: 'Tony A.', role: 'instructor', locationId: 'loc_gemmayzeh', certs: ['TRX', 'Functional'] },
      { id: 'stf_in_rita', name: 'Rita S.', role: 'instructor', locationId: 'loc_badaro', certs: ['Spinning', 'Abs & Core'] },
      { id: 'stf_in_mayak', name: 'Maya K.', role: 'instructor', locationId: 'loc_hamra', certs: ['Yoga', 'Abs & Core'] },
      /* other roles */
      { id: 'stf_nu_rima', name: 'Rima D.', role: 'nutritionist', locationId: 'loc_hamra', certs: ['Licensed dietitian'], note: 'Covers all branches by appointment' },
      { id: 'stf_mt_suhail', name: 'Suhail M.', role: 'maintenance', locationId: 'loc_hamra', note: 'Covers all branches' },
      { id: 'stf_fb_nour', name: 'Nour A.', role: 'fuelbar', locationId: 'loc_badaro' },
      { id: 'stf_fb_sara', name: 'Sara T.', role: 'fuelbar', locationId: 'loc_hamra' },
      { id: 'stf_own_samer', name: 'Samer K.', role: 'owner', locationId: null },
    ];

    /* assets — full technical record; zone strings match the zone catalog names */
    const assets = [
      { id: 'ast_0001', name: 'Leg Press', category: 'Strength machines', brand: 'Hammer Strength', model: 'Plate-Loaded LP', locationId: 'loc_hamra', floor: 'Floor 1', zone: 'Strength machines', status: 'available', altAssetId: 'ast_0002', purchaseDate: '2024-03-10', warrantyUntil: '2027-03-10', lastInspection: '2026-07-18', nextInspection: '2026-08-18', history: [] },
      { id: 'ast_0002', name: 'Hack Squat', category: 'Strength machines', brand: 'Hammer Strength', model: 'HS-HSQ', locationId: 'loc_hamra', floor: 'Floor 2', zone: 'Strength machines', status: 'available', altAssetId: null, purchaseDate: '2024-03-10', warrantyUntil: '2027-03-10', lastInspection: '2026-07-18', nextInspection: '2026-08-18', history: [] },
      { id: 'ast_0003', name: 'Cable Crossover A', category: 'Cable machines', brand: 'Life Fitness', model: 'Dual Adjustable', locationId: 'loc_hamra', floor: 'Floor 1', zone: 'Cable machines', status: 'available', altAssetId: null, purchaseDate: '2023-11-02', warrantyUntil: '2026-11-02', lastInspection: '2026-07-15', nextInspection: '2026-08-15', history: [] },
      { id: 'ast_0004', name: 'Treadmill #3', category: 'Cardio', brand: 'Technogym', model: 'Run 600', locationId: 'loc_hamra', floor: 'Mezzanine', zone: 'Cardio area', status: 'available', altAssetId: 'ast_0005', purchaseDate: '2024-06-01', warrantyUntil: '2027-06-01', lastInspection: '2026-07-20', nextInspection: '2026-08-20', history: [{ at: '2026-05-11', what: 'Belt replaced', by: 'stf_mt_suhail' }] },
      { id: 'ast_0005', name: 'Treadmill #1', category: 'Cardio', brand: 'Technogym', model: 'Run 600', locationId: 'loc_hamra', floor: 'Mezzanine', zone: 'Cardio area', status: 'available', altAssetId: null, purchaseDate: '2024-06-01', warrantyUntil: '2027-06-01', lastInspection: '2026-07-20', nextInspection: '2026-08-20', history: [] },
      { id: 'ast_0006', name: 'Main gate scanner', category: 'Access', brand: 'ZKTeco', model: 'SBTL8000', locationId: 'loc_hamra', floor: 'Ground', zone: 'Reception', status: 'limited', altAssetId: null, purchaseDate: '2025-01-15', warrantyUntil: '2027-01-15', lastInspection: '2026-07-25', nextInspection: '2026-08-25', history: [{ at: '2026-07-25', what: 'Reader intermittent — manual fallback active', by: 'stf_mt_suhail' }] },
      { id: 'ast_0007', name: 'Free-weight rack · dumbbells to 60 kg', category: 'Free weights', brand: 'Eleiko', model: 'Prime rack', locationId: 'loc_hamra', floor: 'Floor 1', zone: 'Free-weight area', status: 'available', altAssetId: null, purchaseDate: '2026-06-20', warrantyUntil: '2029-06-20', lastInspection: '2026-07-22', nextInspection: '2026-08-22', history: [] },
      { id: 'ast_0008', name: 'Generator — main', category: 'Plant', brand: 'Perkins', model: '150 kVA', locationId: 'loc_hamra', floor: 'Basement', zone: 'Electrical & generator', status: 'available', altAssetId: null, purchaseDate: '2023-02-01', warrantyUntil: '2026-02-01', lastInspection: '2026-07-01', nextInspection: '2026-08-01', history: [{ at: '2026-07-01', what: 'Oil + filter service', by: 'stf_mt_suhail' }] },
      { id: 'ast_0101', name: 'Rowing machine #1', category: 'Cardio', brand: 'Concept2', model: 'RowErg', locationId: 'loc_badaro', floor: 'Ground', zone: 'Cardio area', status: 'waiting_parts', altAssetId: null, purchaseDate: '2024-09-14', warrantyUntil: '2026-09-14', lastInspection: '2026-07-10', nextInspection: '2026-08-10', history: [{ at: '2026-07-10', what: 'Chain worn — part on order', by: 'stf_mt_suhail' }] },
      { id: 'ast_0102', name: 'Spin Bike #1', category: 'Cardio', brand: 'Keiser', model: 'M3i', locationId: 'loc_badaro', floor: 'Studio', zone: 'Spinning studio', status: 'available', altAssetId: null, purchaseDate: '2025-03-05', warrantyUntil: '2028-03-05', lastInspection: '2026-07-22', nextInspection: '2026-08-22', history: [] },
      { id: 'ast_0103', name: 'Smith Machine', category: 'Strength machines', brand: 'Matrix', model: 'Magnum', locationId: 'loc_badaro', floor: 'Ground', zone: 'Strength machines', status: 'available', altAssetId: null, purchaseDate: '2024-01-25', warrantyUntil: '2027-01-25', lastInspection: '2026-07-12', nextInspection: '2026-08-12', history: [] },
      { id: 'ast_0201', name: 'TRX Station #1', category: 'Functional', brand: 'TRX', model: 'Pro 4', locationId: 'loc_gemmayzeh', floor: 'Studio', zone: 'TRX studio', status: 'available', altAssetId: 'ast_0203', purchaseDate: '2025-02-11', warrantyUntil: '2027-02-11', lastInspection: '2026-07-26', nextInspection: '2026-08-26', history: [] },
      { id: 'ast_0202', name: 'TRX Station #2', category: 'Functional', brand: 'TRX', model: 'Pro 4', locationId: 'loc_gemmayzeh', floor: 'Studio', zone: 'TRX studio', status: 'available', altAssetId: 'ast_0203', purchaseDate: '2025-02-11', warrantyUntil: '2027-02-11', lastInspection: '2026-07-26', nextInspection: '2026-08-26', history: [] },
      { id: 'ast_0203', name: 'TRX Station #3', category: 'Functional', brand: 'TRX', model: 'Pro 4', locationId: 'loc_gemmayzeh', floor: 'Studio', zone: 'TRX studio', status: 'available', altAssetId: null, purchaseDate: '2025-02-11', warrantyUntil: '2027-02-11', lastInspection: '2026-07-26', nextInspection: '2026-08-26', history: [] },
      { id: 'ast_0204', name: 'Battle ropes + sled lane', category: 'Functional', brand: 'Rogue', model: '—', locationId: 'loc_gemmayzeh', floor: 'Ground', zone: 'Functional training', status: 'available', altAssetId: null, purchaseDate: '2025-05-30', warrantyUntil: '2027-05-30', lastInspection: '2026-07-19', nextInspection: '2026-08-19', history: [] },
      { id: 'ast_0301', name: 'Free-weight rack', category: 'Free weights', brand: 'Eleiko', model: 'XF rack', locationId: 'loc_hazmieh', floor: 'Ground', zone: 'Free-weight area', status: 'available', altAssetId: null, purchaseDate: '2026-01-14', warrantyUntil: '2029-01-14', lastInspection: '2026-07-14', nextInspection: '2026-08-14', history: [] },
      { id: 'ast_0302', name: 'Elliptical #2', category: 'Cardio', brand: 'Precor', model: 'EFX 885', locationId: 'loc_hazmieh', floor: 'Ground', zone: 'Cardio area', status: 'out_of_service', altAssetId: null, purchaseDate: '2023-08-08', warrantyUntil: '2025-08-08', lastInspection: '2026-07-08', nextInspection: '2026-08-08', history: [{ at: '2026-07-24', what: 'Drive fault — awaiting quote', by: 'stf_mt_suhail' }] },
    ];

    const rooms = [
      { id: 'rm_group_hamra', name: 'Group Class Room', locationId: 'loc_hamra', capacity: 18 },
      { id: 'rm_spin_badaro', name: 'Spin Studio', locationId: 'loc_badaro', capacity: 20 },
      { id: 'rm_trx_gemmayzeh', name: 'TRX Studio', locationId: 'loc_gemmayzeh', capacity: 14 },
      { id: 'rm_group_hazmieh', name: 'Group Class Room', locationId: 'loc_hazmieh', capacity: 12 },
    ];

    /* classes — difficulty, equipment, cancellation deadline, waitlist */
    const classes = [
      { id: 'cls_trx_gem', name: 'TRX Circuit', instructorId: 'stf_in_tony', roomId: 'rm_trx_gemmayzeh', locationId: 'loc_gemmayzeh', startsAt: at(19, 0), durationMins: 50, capacity: 14, difficulty: 'Intermediate', equipment: ['TRX station'], cancelDeadlineMins: 120, status: 'scheduled', waitlist: [], checkins: [], safetyCheck: null, report: null },
      { id: 'cls_spin_bad', name: 'Spin 45', instructorId: 'stf_in_rita', roomId: 'rm_spin_badaro', locationId: 'loc_badaro', startsAt: at(18, 0), durationMins: 45, capacity: 20, difficulty: 'All levels', equipment: ['Spin bike'], cancelDeadlineMins: 120, status: 'scheduled', waitlist: [], checkins: [], safetyCheck: null, report: null },
      { id: 'cls_abs_ham', name: 'Abs & Core', instructorId: 'stf_in_mayak', roomId: 'rm_group_hamra', locationId: 'loc_hamra', startsAt: at(17, 30), durationMins: 30, capacity: 18, difficulty: 'All levels', equipment: ['Mat'], cancelDeadlineMins: 60, status: 'scheduled', waitlist: [], checkins: [], safetyCheck: null, report: null },
      { id: 'cls_yoga_ham', name: 'Power Yoga', instructorId: 'stf_in_mayak', roomId: 'rm_group_hamra', locationId: 'loc_hamra', startsAt: at(20, 0), durationMins: 60, capacity: 16, difficulty: 'Intermediate', equipment: ['Mat', 'Block'], cancelDeadlineMins: 120, status: 'scheduled', waitlist: [], checkins: [], safetyCheck: null, report: null },
      { id: 'cls_wksp_ham', name: 'Workshop · Deadlift Technique', instructorId: 'stf_tr_karim', roomId: 'rm_group_hamra', locationId: 'loc_hamra', startsAt: at(16, 0), durationMins: 60, capacity: 12, difficulty: 'Open', equipment: ['Barbell'], cancelDeadlineMins: 180, status: 'scheduled', waitlist: [], checkins: [], safetyCheck: null, report: null },
      { id: 'cls_spin_gem', name: 'Spin 45', instructorId: 'stf_in_rita', roomId: 'rm_trx_gemmayzeh', locationId: 'loc_gemmayzeh', startsAt: at(9, 0), durationMins: 45, capacity: 12, difficulty: 'All levels', equipment: ['Spin bike'], cancelDeadlineMins: 120, status: 'completed', waitlist: [], checkins: ['mbr_0007'], safetyCheck: { at: iso(at(8, 40)), roomOk: true, equipmentOk: true, by: 'stf_in_rita', issues: [] }, report: { at: iso(at(10, 0)), attended: 9, notes: 'Full house energy, no issues.', by: 'stf_in_rita' } },
    ];

    const bookings = [
      { id: 'bkg_0001', type: 'class', classId: 'cls_trx_gem', memberId: 'mbr_0007', state: 'booked', createdAt: now() - 36e5 },
      { id: 'bkg_0002', type: 'class', classId: 'cls_trx_gem', memberId: 'mbr_0001', state: 'booked', createdAt: now() - 30e5 },
      { id: 'bkg_0003', type: 'class', classId: 'cls_abs_ham', memberId: 'mbr_0006', state: 'booked', createdAt: now() - 20e5 },
      { id: 'bkg_0004', type: 'class', classId: 'cls_yoga_ham', memberId: 'mbr_0011', state: 'booked', createdAt: now() - 10e5 },
    ];

    /* PT packages + sessions */
    const packages = [
      { id: 'pkg_0001', memberId: 'mbr_0001', trainerId: 'stf_tr_karim', total: 10, used: 7, price: 300, soldAt: '2026-06-02', soldBy: 'stf_rc_lara' },
      { id: 'pkg_0002', memberId: 'mbr_0005', trainerId: 'stf_tr_karim', total: 4, used: 1, price: 140, soldAt: '2026-07-12', soldBy: 'stf_rc_joelle' },
      { id: 'pkg_0003', memberId: 'mbr_0010', trainerId: 'stf_tr_nadim', total: 12, used: 4, price: 420, soldAt: '2026-06-20', soldBy: 'stf_rc_joelle' },
    ];
    const ptSessions = [
      { id: 'pts_0001', memberId: 'mbr_0001', trainerId: 'stf_tr_karim', packageId: 'pkg_0001', branchId: 'loc_hamra', startsAt: at(18, 0), durationMins: 60, status: 'scheduled', exercises: [], notes: '', memberConfirmed: false, smallGroup: false },
      { id: 'pts_0002', memberId: 'mbr_0005', trainerId: 'stf_tr_karim', packageId: 'pkg_0002', branchId: 'loc_badaro', startsAt: at(19, 30), durationMins: 60, status: 'scheduled', exercises: [], notes: '', memberConfirmed: false, smallGroup: false },
      { id: 'pts_0003', memberId: 'mbr_0001', trainerId: 'stf_tr_karim', packageId: 'pkg_0001', branchId: 'loc_hamra', startsAt: at(18, 0) - 864e5 * 2, durationMins: 60, status: 'completed', exercises: [{ name: 'Deadlift', sets: [{ reps: 5, kg: 120 }, { reps: 5, kg: 130 }, { reps: 3, kg: 140 }] }, { name: 'Front squat', sets: [{ reps: 8, kg: 70 }, { reps: 8, kg: 75 }] }], notes: 'PB on deadlift — 140×3. Shoulder felt fine; keep pressing light one more week.', pb: 'Deadlift 140 kg × 3', memberConfirmed: true, smallGroup: false },
      { id: 'pts_0004', memberId: 'mbr_0010', trainerId: 'stf_tr_nadim', packageId: 'pkg_0003', branchId: 'loc_badaro', startsAt: at(11, 0), durationMins: 60, status: 'no_show', exercises: [], notes: 'Client stuck at work; offered evening slot.', memberConfirmed: false, smallGroup: false },
    ];

    /* ONE health record per member — the single source of truth for safety
       facts, role-scoped via HealthService.visibleTo. (audit F-SAFE-1) */
    const healthRecords = [
      { memberId: 'mbr_0001', facts: [
        { id: 'hf_0001', kind: 'allergy', label: 'peanuts', severity: 'high', source: 'member_declared', recordedBy: 'mbr_0001', recordedAt: '2026-03-01', precedence: 2, note: 'Declared in the onboarding health questionnaire.' },
        { id: 'hf_0002', kind: 'injury', label: 'Right shoulder impingement', severity: 'medium', source: 'trainer_assessment', recordedBy: 'stf_tr_karim', recordedAt: '2026-07-19', precedence: 3, note: 'Avoid overhead / behind-neck pressing at end range; stop on any pinch.' },
      ] },
      { memberId: 'mbr_0006', facts: [
        { id: 'hf_0003', kind: 'injury', label: 'ACL reconstruction (2025)', severity: 'high', source: 'physio_clearance', recordedBy: 'stf_nu_rima', recordedAt: '2026-04-18', precedence: 4, note: 'No deep jumps; leg extensions cleared by physio.' },
      ] },
      { memberId: 'mbr_0007', facts: [
        { id: 'hf_0004', kind: 'allergy', label: 'milk', severity: 'high', source: 'member_declared', recordedBy: 'mbr_0007', recordedAt: '2026-06-22', precedence: 2, note: 'Declared at intake.' },
      ] },
    ];

    /* Fuel Bar & Retail — per-branch stock, allergens where food is sold */
    const retailItems = [
      { id: 'rtl_shake_choc', name: 'Protein Shake · Chocolate', cat: 'Fuel Bar', price: 6, allergens: ['milk'], img: 'img/menu-protein-shake.svg', lowAt: 8, stock: { loc_hamra: 24, loc_badaro: 14, loc_gemmayzeh: 18, loc_hazmieh: 9 } },
      { id: 'rtl_shake_van', name: 'Protein Shake · Vanilla', cat: 'Fuel Bar', price: 6, allergens: ['milk'], img: 'img/menu-protein-shake.svg', lowAt: 8, stock: { loc_hamra: 16, loc_badaro: 6, loc_gemmayzeh: 12, loc_hazmieh: 7 } },
      { id: 'rtl_bar', name: 'Protein Bar', cat: 'Fuel Bar', price: 3.5, allergens: ['peanuts', 'milk'], img: 'img/menu-protein-bar.svg', lowAt: 12, stock: { loc_hamra: 40, loc_badaro: 22, loc_gemmayzeh: 10, loc_hazmieh: 15 } },
      { id: 'rtl_water', name: 'Water 500 ml', cat: 'Fuel Bar', price: 1, allergens: [], img: 'img/menu-water.svg', lowAt: 24, stock: { loc_hamra: 120, loc_badaro: 60, loc_gemmayzeh: 48, loc_hazmieh: 30 } },
      { id: 'rtl_energy', name: 'Energy Drink', cat: 'Fuel Bar', price: 3, allergens: [], img: 'img/menu-energy.svg', lowAt: 12, stock: { loc_hamra: 30, loc_badaro: 18, loc_gemmayzeh: 20, loc_hazmieh: 8 } },
      { id: 'rtl_electrolyte', name: 'Electrolyte Drink', cat: 'Fuel Bar', price: 2.5, allergens: [], img: 'img/menu-energy.svg', lowAt: 12, stock: { loc_hamra: 26, loc_badaro: 15, loc_gemmayzeh: 14, loc_hazmieh: 10 } },
      { id: 'rtl_whey', name: 'Whey Isolate 2 kg', cat: 'Supplements', price: 55, allergens: ['milk'], img: 'img/retail-whey.svg', lowAt: 3, stock: { loc_hamra: 8, loc_badaro: 4, loc_gemmayzeh: 5, loc_hazmieh: 2 } },
      { id: 'rtl_creatine', name: 'Creatine Monohydrate 500 g', cat: 'Supplements', price: 24, allergens: [], img: 'img/retail-creatine.svg', lowAt: 3, stock: { loc_hamra: 10, loc_badaro: 6, loc_gemmayzeh: 4, loc_hazmieh: 3 } },
      { id: 'rtl_preworkout', name: 'Pre-Workout 300 g', cat: 'Supplements', price: 32, allergens: [], img: 'img/retail-preworkout.svg', lowAt: 3, stock: { loc_hamra: 6, loc_badaro: 2, loc_gemmayzeh: 5, loc_hazmieh: 2 } },
      { id: 'rtl_shaker', name: 'Level Up Shaker 700 ml', cat: 'Merch', price: 9, allergens: [], img: 'img/retail-shaker.svg', lowAt: 5, stock: { loc_hamra: 20, loc_badaro: 12, loc_gemmayzeh: 9, loc_hazmieh: 6 } },
      { id: 'rtl_tee', name: 'Level Up Training Tee', cat: 'Merch', price: 18, allergens: [], img: 'img/retail-tee.svg', lowAt: 5, stock: { loc_hamra: 15, loc_badaro: 8, loc_gemmayzeh: 11, loc_hazmieh: 4 } },
      { id: 'rtl_gloves', name: 'Training Gloves', cat: 'Accessories', price: 14, allergens: [], img: 'img/retail-gloves.svg', lowAt: 4, stock: { loc_hamra: 9, loc_badaro: 5, loc_gemmayzeh: 3, loc_hazmieh: 4 } },
      { id: 'rtl_bands', name: 'Resistance Bands Set', cat: 'Accessories', price: 22, allergens: [], img: 'img/retail-bands.svg', lowAt: 4, stock: { loc_hamra: 7, loc_badaro: 6, loc_gemmayzeh: 5, loc_hazmieh: 2 } },
    ];

    /* CRM — pipeline: new → contacted → tour_booked → trial → offer → follow_up → won | lost */
    const leads = [
      { id: 'led_0001', name: 'Rami Chidiac', phone: '+961 3 987 654', source: 'Instagram', interest: 'All-branch membership', stage: 'contacted', branchId: 'loc_hamra', ownerStaffId: 'stf_rc_lara', createdAt: now() - 864e5, nextFollowUpAt: now() + 432e5, notes: [{ at: iso(now() - 6e5), by: 'stf_rc_lara', txt: 'DM answered — wants evening tour this week.' }] },
      { id: 'led_0002', name: 'Nadia F.', phone: '+961 71 111 222', source: 'Walk-in', interest: 'PT + membership', stage: 'tour_booked', branchId: 'loc_badaro', ownerStaffId: 'stf_rc_joelle', createdAt: now() - 1728e5, nextFollowUpAt: at(17, 0), notes: [] },
      { id: 'led_0003', name: 'Charbel A.', phone: '+961 70 333 444', source: 'WhatsApp', interest: 'Classes', stage: 'trial', branchId: 'loc_gemmayzeh', ownerStaffId: 'stf_rc_marc', createdAt: now() - 3456e5, nextFollowUpAt: now() - 432e5, notes: [{ at: iso(now() - 864e5), by: 'stf_rc_marc', txt: 'Took TRX trial — loved it. Follow up on 6-month offer.' }] },
      { id: 'led_0004', name: 'Alpha Bank HR', phone: '+961 1 900 900', source: 'Corporate partnership', interest: 'Corporate seats ×15', stage: 'offer', branchId: 'loc_badaro', ownerStaffId: 'stf_rc_joelle', createdAt: now() - 6048e5, nextFollowUpAt: now() + 864e5, notes: [] },
      { id: 'led_0005', name: 'Yasmina K.', phone: '+961 76 555 000', source: 'Referral', interest: 'Student plan', stage: 'new', branchId: 'loc_hamra', ownerStaffId: 'stf_rc_lara', createdAt: now() - 36e5, nextFollowUpAt: now() + 864e5, notes: [] },
      { id: 'led_0006', name: 'Georges T.', phone: '+961 3 222 999', source: 'Website', interest: 'Off-peak', stage: 'lost', branchId: 'loc_hazmieh', ownerStaffId: 'stf_rc_dana', createdAt: now() - 12096e5, lostReason: 'Moved abroad', notes: [] },
    ];

    /* Owner approvals queue */
    const approvals = [
      { id: 'apr_0001', type: 'discount_large', subject: 'Corporate deal — Alpha Bank ×15 seats', amount: 2025, reason: '15% multi-seat discount on corporate annual', requestedBy: 'stf_rc_joelle', branchId: 'loc_badaro', status: 'pending', createdAt: iso(now() - 72e5), decidedBy: null, decidedAt: null, note: null },
      { id: 'apr_0002', type: 'major_repair', subject: 'Elliptical #2 — Hazmieh drive assembly', amount: 850, reason: 'Out of warranty; quote from Precor distributor', requestedBy: 'stf_mt_suhail', branchId: 'loc_hazmieh', status: 'pending', createdAt: iso(now() - 32e5), decidedBy: null, decidedAt: null, note: null },
    ];

    /* Reception shifts + cash drawer */
    const shifts = [
      { id: 'sh_0001', branchId: 'loc_hamra', staffId: 'stf_rc_lara', openedAt: iso(at(8, 0)), closedAt: null, floatUSD: 100, countedUSD: null, varianceUSD: null },
    ];

    /* Lightweight nutrition — consults, body comp, meal-plan uploads */
    const consults = [
      { id: 'ncs_0001', memberId: 'mbr_0001', staffId: 'stf_nu_rima', branchId: 'loc_hamra', startsAt: at(15, 0), status: 'scheduled', kind: 'consultation', notes: '' },
      { id: 'ncs_0002', memberId: 'mbr_0010', staffId: 'stf_nu_rima', branchId: 'loc_badaro', startsAt: at(12, 0) - 864e5 * 7, status: 'completed', kind: 'follow_up', notes: 'Down 1.1 kg; keep protein at 1.8 g/kg. Next check in 4 weeks.' },
    ];
    const bodyComp = [
      { id: 'bc_0001', memberId: 'mbr_0001', at: '2026-07-01', weightKg: 82.4, bodyFatPct: 18.2, muscleKg: 36.1, by: 'stf_nu_rima' },
      { id: 'bc_0002', memberId: 'mbr_0001', at: '2026-06-01', weightKg: 84.0, bodyFatPct: 19.5, muscleKg: 35.6, by: 'stf_nu_rima' },
      { id: 'bc_0003', memberId: 'mbr_0010', at: '2026-07-20', weightKg: 66.8, bodyFatPct: 24.1, muscleKg: 26.0, by: 'stf_nu_rima' },
    ];
    const mealPlans = [
      { id: 'mp_0001', memberId: 'mbr_0001', filename: 'samer-cut-phase-2.pdf', uploadedAt: '2026-07-02', by: 'stf_nu_rima' },
    ];

    const guestPasses = [
      { id: 'gst_0001', hostMemberId: 'mbr_0001', guestName: 'Walid R.', branchId: 'loc_hamra', fee: 10, status: 'expected', createdAt: iso(now() - 36e5), redeemedAt: null },
    ];

    /* ---------- Train: exercise library, machine-aware ---------- */
    const exerciseLibrary = [
      { id: 'ex_bench', name: 'Barbell Bench Press', muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Barbell', category: 'Strength', instructions: 'Lie flat, grip slightly wider than shoulders, lower to chest, press up.', machineAssetIds: [], altExerciseIds: ['ex_dbbench'] },
      { id: 'ex_dbbench', name: 'Dumbbell Bench Press', muscles: ['Chest', 'Triceps', 'Shoulders'], equipment: 'Dumbbells + bench', category: 'Strength', instructions: 'Press dumbbells from chest level to lockout, controlled descent.', machineAssetIds: [], altExerciseIds: ['ex_bench'] },
      { id: 'ex_squat', name: 'Back Squat', muscles: ['Quads', 'Glutes', 'Hamstrings'], equipment: 'Barbell + rack', category: 'Strength', instructions: 'Bar on upper back, feet shoulder-width, squat to depth, drive up.', machineAssetIds: [], altExerciseIds: ['ex_legpress', 'ex_hacksquat'] },
      { id: 'ex_frontsquat', name: 'Front Squat', muscles: ['Quads', 'Core'], equipment: 'Barbell + rack', category: 'Strength', instructions: 'Bar racked on front delts, elbows high, squat to depth.', machineAssetIds: [], altExerciseIds: ['ex_legpress'] },
      { id: 'ex_deadlift', name: 'Deadlift', muscles: ['Back', 'Glutes', 'Hamstrings'], equipment: 'Barbell', category: 'Strength', instructions: 'Hinge at hips, flat back, drive through the floor to lockout.', machineAssetIds: [] },
      { id: 'ex_legpress', name: 'Leg Press', muscles: ['Quads', 'Glutes'], equipment: 'Leg Press machine', category: 'Strength', instructions: 'Feet shoulder-width on platform, lower to 90°, press back up.', machineAssetIds: ['ast_0001'], altExerciseIds: ['ex_hacksquat', 'ex_squat'] },
      { id: 'ex_hacksquat', name: 'Hack Squat', muscles: ['Quads'], equipment: 'Hack Squat machine', category: 'Strength', instructions: 'Shoulders under pads, feet forward, squat within the sled.', machineAssetIds: ['ast_0002'], altExerciseIds: ['ex_legpress', 'ex_squat'] },
      { id: 'ex_cablerow', name: 'Seated Cable Row', muscles: ['Back', 'Biceps'], equipment: 'Cable machine', category: 'Strength', instructions: 'Sit tall, pull handle to torso, squeeze shoulder blades.', machineAssetIds: ['ast_0003'], altExerciseIds: ['ex_latpulldown'] },
      { id: 'ex_latpulldown', name: 'Lat Pulldown', muscles: ['Back', 'Biceps'], equipment: 'Cable machine', category: 'Strength', instructions: 'Wide grip, pull bar to upper chest, control the return.', machineAssetIds: [], altExerciseIds: ['ex_cablerow', 'ex_pullup'] },
      { id: 'ex_ohp', name: 'Overhead Press', muscles: ['Shoulders', 'Triceps'], equipment: 'Barbell', category: 'Strength', instructions: 'Press bar from shoulders to lockout overhead, ribs down.', machineAssetIds: [], altExerciseIds: ['ex_dbshoulderpress'] },
      { id: 'ex_dbshoulderpress', name: 'Dumbbell Shoulder Press', muscles: ['Shoulders', 'Triceps'], equipment: 'Dumbbells', category: 'Strength', instructions: 'Press dumbbells overhead from shoulder height, controlled path.', machineAssetIds: [], altExerciseIds: ['ex_ohp'] },
      { id: 'ex_pullup', name: 'Pull-Up', muscles: ['Back', 'Biceps'], equipment: 'Bodyweight', category: 'Strength', instructions: 'Dead hang to chin over bar, control the descent.', machineAssetIds: [] },
      { id: 'ex_dbcurl', name: 'Dumbbell Bicep Curl', muscles: ['Biceps'], equipment: 'Dumbbells', category: 'Isolation', instructions: 'Elbows pinned, curl to shoulder, controlled lowering.', machineAssetIds: [] },
      { id: 'ex_tricepext', name: 'Triceps Pushdown', muscles: ['Triceps'], equipment: 'Cable machine', category: 'Isolation', instructions: 'Elbows pinned to sides, extend to lockout, control the return.', machineAssetIds: ['ast_0003'] },
      { id: 'ex_legcurl', name: 'Leg Curl', muscles: ['Hamstrings'], equipment: 'Leg Curl machine', category: 'Isolation', instructions: 'Curl heels to glutes, controlled negative.', machineAssetIds: [] },
      { id: 'ex_legext', name: 'Leg Extension', muscles: ['Quads'], equipment: 'Leg Extension machine', category: 'Isolation', instructions: 'Extend knees to lockout, pause, controlled return.', machineAssetIds: [] },
      { id: 'ex_plank', name: 'Plank', muscles: ['Core'], equipment: 'Bodyweight', category: 'Core', instructions: 'Forearms + toes, straight line head to heels, brace.', machineAssetIds: [] },
      { id: 'ex_treadmill', name: 'Treadmill Run', muscles: ['Cardio'], equipment: 'Treadmill', category: 'Cardio', instructions: 'Steady-state or intervals per program.', machineAssetIds: ['ast_0004', 'ast_0005'] },
      { id: 'ex_rowerg', name: 'Rowing Machine', muscles: ['Cardio', 'Back'], equipment: 'Rower', category: 'Cardio', instructions: 'Legs-back-arms drive, reverse the sequence on the return.', machineAssetIds: ['ast_0101'] },
      { id: 'ex_spinbike', name: 'Spin Bike', muscles: ['Cardio', 'Legs'], equipment: 'Spin Bike', category: 'Cardio', instructions: 'Cadence + resistance per program.', machineAssetIds: ['ast_0102'] },
      { id: 'ex_trxrow', name: 'TRX Row', muscles: ['Back', 'Core'], equipment: 'TRX', category: 'Functional', instructions: 'Lean back, pull chest to hands, controlled return.', machineAssetIds: ['ast_0201', 'ast_0202', 'ast_0203'] },
      { id: 'ex_battlerope', name: 'Battle Ropes', muscles: ['Shoulders', 'Core', 'Cardio'], equipment: 'Battle Ropes', category: 'Functional', instructions: 'Alternating or double waves for the interval duration.', machineAssetIds: ['ast_0204'] },
      { id: 'ex_bulgariansplit', name: 'Bulgarian Split Squat', muscles: ['Quads', 'Glutes'], equipment: 'Dumbbells + bench', category: 'Strength', instructions: 'Rear foot elevated, front leg does the work, controlled descent.', machineAssetIds: [], altExerciseIds: ['ex_reverselunge'] },
      { id: 'ex_reverselunge', name: 'Reverse Lunge', muscles: ['Quads', 'Glutes'], equipment: 'Dumbbells', category: 'Strength', instructions: 'Step back, both knees to 90°, drive through the front heel.', machineAssetIds: [], altExerciseIds: ['ex_bulgariansplit'] },
    ];

    /* Trainer-assigned programs — versioned, never overwritten. Version 2 shows
       a real before/after tied to Samer's shoulder-impingement health fact. */
    const programs = [
      {
        id: 'prg_0001', memberId: 'mbr_0001', trainerId: 'stf_tr_karim', name: 'Upper / Lower Strength Split', status: 'active', currentVersion: 2,
        versions: [
          {
            version: 1, at: '2026-06-01', changedBy: 'stf_tr_karim', reason: 'Initial program', changeSummary: null,
            days: [
              { name: 'Upper Body Strength', exercises: [
                { exerciseId: 'ex_bench', targetSets: 4, targetReps: 8 }, { exerciseId: 'ex_cablerow', targetSets: 3, targetReps: 10 },
                { exerciseId: 'ex_ohp', targetSets: 3, targetReps: 8 }, { exerciseId: 'ex_dbcurl', targetSets: 3, targetReps: 12 },
                { exerciseId: 'ex_tricepext', targetSets: 3, targetReps: 12 },
              ] },
              { name: 'Lower Body Strength', exercises: [
                { exerciseId: 'ex_squat', targetSets: 4, targetReps: 6 }, { exerciseId: 'ex_legcurl', targetSets: 3, targetReps: 12 },
                { exerciseId: 'ex_legext', targetSets: 3, targetReps: 12 }, { exerciseId: 'ex_plank', targetSets: 3, targetReps: 45 },
              ] },
            ],
          },
          {
            version: 2, at: '2026-07-19', changedBy: 'stf_tr_karim',
            reason: 'Right shoulder impingement — avoid overhead pressing at end range',
            changeSummary: 'Overhead Press replaced with Dumbbell Shoulder Press (partial range); Bench Press sets reduced 4 -> 3.',
            days: [
              { name: 'Upper Body Strength', exercises: [
                { exerciseId: 'ex_bench', targetSets: 3, targetReps: 8, notes: 'Stop on any pinch — partial range if needed.' }, { exerciseId: 'ex_cablerow', targetSets: 3, targetReps: 10 },
                { exerciseId: 'ex_dbshoulderpress', targetSets: 3, targetReps: 10, notes: 'Partial range, no lockout overhead.' }, { exerciseId: 'ex_dbcurl', targetSets: 3, targetReps: 12 },
                { exerciseId: 'ex_tricepext', targetSets: 3, targetReps: 12 },
              ] },
              { name: 'Lower Body Strength', exercises: [
                { exerciseId: 'ex_squat', targetSets: 4, targetReps: 6 }, { exerciseId: 'ex_legcurl', targetSets: 3, targetReps: 12 },
                { exerciseId: 'ex_legext', targetSets: 3, targetReps: 12 }, { exerciseId: 'ex_plank', targetSets: 3, targetReps: 45 },
              ] },
            ],
          },
        ],
      },
    ];

    /* logged workout instances — separate from ptSessions (trainer time-slot
       records); a workout can happen solo, from an assigned program, or
       alongside a PT session (optional ptSessionId link) */
    const workoutSessions = [
      {
        id: 'wko_0001', memberId: 'mbr_0001', programId: 'prg_0001', dayName: 'Upper Body Strength', trainerId: 'stf_tr_karim',
        branchId: 'loc_hamra', ptSessionId: null, status: 'completed',
        assignedFor: iso(now() - 864e5 * 8).slice(0, 10), startedAt: iso(now() - 864e5 * 8), endedAt: iso(now() - 864e5 * 8 + 39e5),
        readiness: { energy: 'normal', soreness: ['Shoulders'], pain: null },
        exercises: [
          { exerciseId: 'ex_bench', targetSets: 3, targetReps: 8, sets: [
            { type: 'warmup', targetWeight: 40, targetReps: 10, actualWeight: 40, actualReps: 10, rpe: null, status: 'completed' },
            { type: 'normal', targetWeight: 72.5, targetReps: 10, actualWeight: 70, actualReps: 10, rpe: 8, status: 'completed' },
            { type: 'normal', targetWeight: 72.5, targetReps: 10, actualWeight: 70, actualReps: 9, rpe: 9, status: 'completed' },
            { type: 'normal', targetWeight: 72.5, targetReps: 8, actualWeight: 70, actualReps: 8, rpe: 9, status: 'completed' },
          ] },
          { exerciseId: 'ex_cablerow', targetSets: 3, targetReps: 10, sets: [
            { type: 'normal', targetWeight: 55, targetReps: 10, actualWeight: 55, actualReps: 10, rpe: 7, status: 'completed' },
            { type: 'normal', targetWeight: 55, targetReps: 10, actualWeight: 55, actualReps: 10, rpe: 7, status: 'completed' },
            { type: 'normal', targetWeight: 55, targetReps: 10, actualWeight: 57.5, actualReps: 9, rpe: 8, status: 'completed' },
          ] },
          { exerciseId: 'ex_dbshoulderpress', targetSets: 3, targetReps: 10, sets: [
            { type: 'normal', targetWeight: 16, targetReps: 10, actualWeight: 16, actualReps: 10, rpe: 6, status: 'completed' },
            { type: 'normal', targetWeight: 16, targetReps: 10, actualWeight: 16, actualReps: 10, rpe: 7, status: 'completed' },
            { type: 'normal', targetWeight: 16, targetReps: 10, actualWeight: 16, actualReps: 10, rpe: 7, status: 'completed' },
          ] },
        ],
        totalVolumeKg: 70 * 27 + 55 * 20 + 57.5 * 9 + 16 * 30 + 40 * 10,
        prsHit: [], notes: 'Shoulder felt fine at partial range.',
        trainerFeedback: { summary: 'Good session — bench holding steady, shoulder pain-free at this range.', difficulty: 7, enjoyment: 8, pain: 'None reported', homework: 'Band pull-aparts, 2x15, before next session.', nextTarget: 'ex_bench 72.5kg x10 for all 3 sets', visibility: 'shared' },
      },
      {
        id: 'wko_0002', memberId: 'mbr_0001', programId: 'prg_0001', dayName: 'Upper Body Strength', trainerId: 'stf_tr_karim',
        branchId: 'loc_hamra', ptSessionId: null, status: 'assigned',
        assignedFor: iso(now()).slice(0, 10), startedAt: null, endedAt: null,
        readiness: null,
        exercises: [
          { exerciseId: 'ex_bench', targetSets: 3, targetReps: 10, sets: [] },
          { exerciseId: 'ex_cablerow', targetSets: 3, targetReps: 10, sets: [] },
          { exerciseId: 'ex_dbshoulderpress', targetSets: 3, targetReps: 10, sets: [] },
          { exerciseId: 'ex_dbcurl', targetSets: 3, targetReps: 12, sets: [] },
          { exerciseId: 'ex_tricepext', targetSets: 3, targetReps: 12, sets: [] },
        ],
        totalVolumeKg: 0, prsHit: [], notes: '', trainerFeedback: null,
      },
    ];

    const personalRecords = [
      { id: 'pr_0001', memberId: 'mbr_0001', exerciseId: 'ex_deadlift', kind: 'max_weight', valueKg: 140, reps: 3, achievedAt: iso(now() - 864e5 * 2).slice(0, 10), sessionId: null, source: 'pt_session:pts_0003' },
      { id: 'pr_0002', memberId: 'mbr_0001', exerciseId: 'ex_bench', kind: 'max_weight', valueKg: 70, reps: 10, achievedAt: iso(now() - 864e5 * 8).slice(0, 10), sessionId: 'wko_0001' },
    ];

    /* broader body tracking (weight/measurements/photos) — distinct from the
       nutritionist's clinical bodyComp; recorded by member, trainer, reception,
       or a connected scale/InBody, each entry keeps who recorded it */
    const bodyLogs = [
      { id: 'bl_0001', memberId: 'mbr_0001', at: iso(now() - 864e5 * 30).slice(0, 10), recordedBy: 'stf_tr_karim', recordedByRole: 'trainer', weightKg: 84.0, measurements: { waist: 86, chest: 104, arms: 37, hips: 98, thighs: 60, calves: 39, neck: 40 }, photoNote: null, source: 'trainer' },
      { id: 'bl_0002', memberId: 'mbr_0001', at: iso(now() - 864e5 * 2).slice(0, 10), recordedBy: 'mbr_0001', recordedByRole: 'member', weightKg: 82.4, measurements: { waist: 83, chest: 105, arms: 38, hips: 97, thighs: 61, calves: 39, neck: 40 }, photoNote: 'front + side, gym mirror', source: 'member' },
    ];

    const goals = [
      { id: 'gl_0001', memberId: 'mbr_0001', kind: 'lift', label: 'Bench Press 80 kg x 5', exerciseId: 'ex_bench', startValue: 70, targetValue: 80, unit: 'kg', targetDate: iso(now() + 864e5 * 56).slice(0, 10), trainerApproved: true, createdAt: iso(now() - 864e5 * 20).slice(0, 10), status: 'active', milestones: [{ at: iso(now() - 864e5 * 8).slice(0, 10), note: 'Hit 70kg x10 — on track.' }] },
      { id: 'gl_0002', memberId: 'mbr_0001', kind: 'frequency', label: 'Train 4x weekly', startValue: 2, targetValue: 4, unit: 'sessions/wk', targetDate: iso(now() + 864e5 * 30).slice(0, 10), trainerApproved: true, createdAt: iso(now() - 864e5 * 40).slice(0, 10), status: 'active', milestones: [] },
    ];

    return {
      version: 4, createdAt: iso(now()), scenario: 'normal-day', healthRecords,
      organizations: [{ id: 'org_01', name: 'Level Up' }],
      locations, zones, rooms,
      plans, members, staff, assets, classes, bookings, packages, ptSessions,
      retailItems, leads, approvals, shifts, consults, bodyComp, mealPlans, guestPasses,
      exerciseLibrary, programs, workoutSessions, personalRecords, bodyLogs, goals,
      visits: [], entryAttempts: [], orders: [], payments: [], incidents: [], workOrders: [], tasks: [], notifications: [], events: [],
    };
  }

  /* ---------- persistence ---------- */
  let db = null;
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
    /* truly fresh browser — no scenario has ever run, so seed AND populate a
       normal-day network instead of an empty gym with nobody inside */
    return reset('normal-day');
  }
  function persist() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
  const nextId = (prefix, coll) => prefix + '_' + String((load()[coll] || []).length + 1).padStart(4, '0') + Math.random().toString(36).slice(2, 5);

  /* ---------- append-only event log + audit ---------- */
  function emit(type, payload, actorId, subjectId, locationId) {
    const d = load();
    const ev = { id: 'evt_' + now().toString(36) + Math.random().toString(36).slice(2, 6), type, orgId: 'org_01', locationId: locationId || null,
      actorId: actorId || null, subjectId: subjectId || null, at: iso(now()), payload: payload || {} };
    d.events.unshift(ev); d.events = d.events.slice(0, 400); persist();
    if (typeof GymBus !== 'undefined' && payload && payload.__bus) {
      GymBus.send(payload.__bus.type, payload.__bus.payload, 'demo-data');
    }
    return ev;
  }
  const requireReason = (reason) => !reason || String(reason).trim().length < 3;

  /* ---------- services (same shape a Supabase client would take) ---------- */
  const BranchService = {
    list: () => load().locations.slice(),
    byId: (id) => load().locations.find((l) => l.id === id) || null,
    /* live occupancy snapshot for every branch — powers the member "Hamra is
       busy, Gemmayzeh is quieter" nudge and the owner comparison table */
    occupancy() {
      return BranchService.list().map((l) => {
        const inside = AccessService.insideNow(l.id).length;
        return { branchId: l.id, name: l.name, inside, capacity: l.capacity, pct: Math.round((inside / l.capacity) * 100), closure: l.closure };
      });
    },
    announce(branchId, msg, staffId) {
      const l = BranchService.byId(branchId); if (!l) return { error: 'unknown_branch' };
      l.announcements.unshift({ at: iso(now()), msg, by: staffId }); persist();
      emit('branch.announcement', { msg, __bus: { type: 'announce', payload: { branch: l.name, msg } } }, staffId, null, branchId);
      return l;
    },
    setClosure(branchId, closure, staffId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const l = BranchService.byId(branchId); if (!l) return { error: 'unknown_branch' };
      l.closure = closure; persist();
      emit('branch.closure_changed', { closure, reason }, staffId, null, branchId);
      return l;
    },
    trainersAt: (branchId) => load().staff.filter((s) => s.role === 'trainer' && (s.worksAt || [s.locationId]).includes(branchId)),
    classesToday: (branchId) => load().classes.filter((c) => c.locationId === branchId && isToday(c.startsAt)),
  };

  const PlanService = {
    list: () => load().plans.slice(),
    byId: (id) => load().plans.find((p) => p.id === id) || null,
  };

  const MemberService = {
    list: () => load().members.slice(),
    byId: (id) => load().members.find((m) => m.id === id) || null,
    byName: (name) => load().members.find((m) => m.name.trim().toLowerCase() === String(name).trim().toLowerCase()) || null,
    search: (q) => { const s = String(q).toLowerCase(); return load().members.filter((m) => m.name.toLowerCase().includes(s) || (m.phone || '').replace(/\s/g, '').includes(s.replace(/\s/g, '')) || m.id.includes(s)); },
    planFor: (id) => { const m = MemberService.byId(id); return m ? PlanService.byId(m.planId) : null; },
    lastVisit(memberId) {
      const v = load().visits.filter((x) => x.memberId === memberId && x.exitedAt).sort((a, b) => b.enteredAt.localeCompare(a.enteredAt))[0];
      return v ? { branch: (BranchService.byId(v.locationId) || {}).name, at: v.enteredAt } : null;
    },
    setStatus(id, status, actorId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const m = MemberService.byId(id); if (!m) return { error: 'unknown_member' };
      const from = m.status; m.status = status; persist();
      emit('member.status_changed', { from, to: status, reason }, actorId, id, m.homeBranchId);
      return m;
    },
    freeze: (id, actorId, reason) => MemberService.setStatus(id, 'frozen', actorId, reason),
    unfreeze: (id, actorId, reason) => MemberService.setStatus(id, 'active', actorId, reason),
    resetQR(id, actorId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const m = MemberService.byId(id); if (!m) return { error: 'unknown_member' };
      m.qrVersion = (m.qrVersion || 1) + 1; persist();
      emit('member.qr_reset', { qrVersion: m.qrVersion, reason }, actorId, id, m.homeBranchId);
      return m;
    },
    /* home-branch transfer needs owner approval — creates the request */
    requestBranchTransfer(id, toBranchId, actorId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const m = MemberService.byId(id); if (!m) return { error: 'unknown_member' };
      if (!BranchService.byId(toBranchId)) return { error: 'unknown_branch' };
      return ApprovalService.request({ type: 'branch_transfer', subject: `${m.name} → ${BranchService.byId(toBranchId).name}`, amount: 0, reason, requestedBy: actorId, branchId: m.homeBranchId, meta: { memberId: id, toBranchId } });
    },
    sell({ name, phone, email, planId, homeBranchId, staffId, method, leadId }) {
      const d = load();
      const plan = PlanService.byId(planId); if (!plan) return { error: 'unknown_plan' };
      if (!BranchService.byId(homeBranchId)) return { error: 'unknown_branch' };
      const ends = new Date(now()); if (plan.months) ends.setMonth(ends.getMonth() + plan.months); else ends.setDate(ends.getDate() + (plan.days || 1));
      const m = { id: nextId('mbr', 'members'), name, phone: phone || '', email: email || '', planId, homeBranchId, status: 'active', subEnds: ends.toISOString().slice(0, 10), wallet: 0, points: 0, trainerId: null, qrVersion: 1, memberSince: iso(now()).slice(0, 10) };
      d.members.push(m); persist();
      const total = plan.price + (plan.joiningFee || 0);
      if (total > 0) PaymentService.take({ memberId: m.id, amount: total, method: method || 'card', what: plan.name + (plan.joiningFee ? ' + joining fee' : ''), staffId, branchId: homeBranchId });
      emit('member.sold', { planId, leadId: leadId || null, __bus: { type: 'member-joined', payload: { member: m.name, plan: plan.name, branch: BranchService.byId(homeBranchId).name } } }, staffId, m.id, homeBranchId);
      return m;
    },
    renew(id, staffId, method) {
      const m = MemberService.byId(id); if (!m) return { error: 'unknown_member' };
      const plan = PlanService.byId(m.planId); if (!plan) return { error: 'unknown_plan' };
      const base = Math.max(new Date(m.subEnds + 'T00:00:00').getTime(), now());
      const ends = new Date(base); if (plan.months) ends.setMonth(ends.getMonth() + plan.months); else ends.setDate(ends.getDate() + (plan.days || 1));
      m.subEnds = ends.toISOString().slice(0, 10); if (m.status === 'expired') m.status = 'active'; persist();
      PaymentService.take({ memberId: id, amount: plan.price, method: method || 'card', what: plan.name + ' · renewal', staffId, branchId: m.homeBranchId });
      emit('member.renewed', { until: m.subEnds }, staffId, id, m.homeBranchId);
      return m;
    },
    renewalsDue: (branchId, withinDays = 14) => load().members.filter((m) => (!branchId || m.homeBranchId === branchId) && m.status === 'active' && (new Date(m.subEnds + 'T00:00:00').getTime() - now()) < withinDays * 864e5),
  };

  const AccessService = {
    /* server-shaped validation — the SAME rules a backend must enforce:
       status, allowed branch, allowed hours, restriction, duplicate visit,
       capacity, branch closure. Returns { ok, branchId } or { ok:false, reason }. */
    validate(memberId, branchId) {
      const m = MemberService.byId(memberId);
      if (!m) return { ok: false, reason: 'unknown_member' };
      if (m.status === 'frozen') return { ok: false, reason: 'frozen' };
      if (m.status === 'expired') return { ok: false, reason: 'expired' };
      if (m.status === 'suspended') return { ok: false, reason: 'suspended' };
      if (m.restriction) return { ok: false, reason: 'access_restricted' };
      if (new Date(m.subEnds + 'T23:59:59').getTime() < now()) return { ok: false, reason: 'expired' };
      const resolvedBranch = branchId || m.homeBranchId;
      const loc = BranchService.byId(resolvedBranch);
      if (!loc) return { ok: false, reason: 'unknown_branch' };
      if (loc.closure) return { ok: false, reason: 'branch_closed' };
      const plan = PlanService.byId(m.planId);
      if (plan && plan.branchAccess === 'single' && resolvedBranch !== m.homeBranchId) return { ok: false, reason: 'branch_not_allowed' };
      if (plan && plan.accessHours) {
        const h = new Date(now()).getHours();
        if (h < plan.accessHours.from || h >= plan.accessHours.to) return { ok: false, reason: 'outside_allowed_hours' };
      }
      if (AccessService.insideNow().some((v) => v.memberId === memberId)) return { ok: false, reason: 'duplicate_visit' };
      if (AccessService.insideNow(resolvedBranch).length >= loc.capacity) return { ok: false, reason: 'at_capacity' };
      return { ok: true, branchId: resolvedBranch };
    },
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
      const m = MemberService.byId(memberId);
      emit('member.entry_admitted', { visitId: visit.id, __bus: { type: 'gate-entry', payload: { member: m.name, memberId, branch: BranchService.byId(v.branchId).name, plan: (PlanService.byId(m.planId) || {}).name, time: fmtTime(now()) } } }, actorId, memberId, v.branchId);
      return { ok: true, visit };
    },
    checkOut(memberId) {
      const open = load().visits.find((v) => v.memberId === memberId && !v.exitedAt);
      if (!open) return { ok: false, reason: 'no_open_visit' };
      open.exitedAt = iso(now()); persist();
      emit('member.exited', { visitId: open.id }, null, memberId, open.locationId);
      return { ok: true, visit: open };
    },
    /* staff manual override — reason mandatory, fully audit-logged */
    manualOverride(memberId, actorId, branchId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const d = load();
      const visit = { id: nextId('vst', 'visits'), memberId, enteredAt: iso(now()), exitedAt: null, locationId: branchId, override: { by: actorId, reason } };
      d.visits.unshift(visit); persist();
      emit('member.entry_override', { reason, __bus: { type: 'gate-entry', payload: { member: (MemberService.byId(memberId) || {}).name, memberId, branch: (BranchService.byId(branchId) || {}).name, override: true, time: fmtTime(now()) } } }, actorId, memberId, branchId);
      return { ok: true, visit };
    },
    deniedToday: (branchId) => load().entryAttempts.filter((a) => a.result === 'denied' && isToday(new Date(a.at).getTime()) && (!branchId || a.locationId === branchId)),
  };

  /* zone-level access — one layer below branch entry. Checks presence in THIS
     branch (member is already inside), then the zone's own rule. */
  const ZoneService = {
    forBranch: (locationId) => load().zones.filter((z) => z.locationId === locationId),
    byId: (id) => load().zones.find((z) => z.id === id) || null,
    canAccess(zoneId, { memberId, staffId } = {}) {
      const zone = ZoneService.byId(zoneId);
      if (!zone) return { ok: false, reason: 'unknown_zone' };
      if (staffId) {
        const st = load().staff.find((s) => s.id === staffId);
        if (!st) return { ok: false, reason: 'unknown_staff' };
        return { ok: true };
      }
      if (!memberId) return { ok: false, reason: 'no_subject' };
      const m = MemberService.byId(memberId);
      if (!m) return { ok: false, reason: 'unknown_member' };
      if (['frozen', 'expired', 'suspended'].includes(m.status)) return { ok: false, reason: m.status };
      const insideHere = AccessService.insideNow(zone.locationId).some((v) => v.memberId === memberId);
      if (!insideHere) return { ok: false, reason: 'not_checked_in_here' };
      if (zone.access === 'staff') return { ok: false, reason: 'staff_only_zone' };
      if (zone.access === 'pt') {
        const hasPackage = load().packages.some((p) => p.memberId === memberId && p.used < p.total);
        const hasSessionNow = load().ptSessions.some((s) => s.memberId === memberId && s.status === 'live');
        if (!hasPackage && !hasSessionNow) return { ok: false, reason: 'no_active_pt_package' };
      }
      if (zone.access === 'class') {
        const soon = load().classes.filter((c) => c.locationId === zone.locationId && Math.abs(c.startsAt - now()) < 90 * 60000);
        const hasBooking = load().bookings.some((b) => b.memberId === memberId && b.state === 'booked' && soon.some((c) => c.id === b.classId));
        if (!hasBooking) return { ok: false, reason: 'no_class_booking' };
      }
      return { ok: true };
    },
  };

  /* single source of truth for safety facts, with role-scoped visibility */
  const HealthService = {
    forMember(memberId) { return (load().healthRecords.find((r) => r.memberId === memberId) || { facts: [] }).facts.slice(); },
    visibleTo(memberId, role) {
      const facts = HealthService.forMember(memberId);
      if (role === 'nutritionist') return facts;
      if (role === 'trainer') return facts.filter((f) => f.kind !== 'condition');
      if (role === 'instructor') return facts.filter((f) => f.kind === 'injury');
      if (role === 'fuelbar' || role === 'cafe') return facts.filter((f) => f.kind === 'allergy');
      if (role === 'reception') return facts.filter((f) => f.severity === 'high').map((f) => ({ ...f, note: '' }));
      return [];
    },
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

  /* ---------- personal training ---------- */
  const TrainerService = {
    list: () => load().staff.filter((s) => s.role === 'trainer'),
    byId: (id) => load().staff.find((s) => s.id === id && s.role === 'trainer') || null,
    byBranch: (branchId) => BranchService.trainersAt(branchId),
    sessions: (trainerId) => load().ptSessions.filter((s) => !trainerId || s.trainerId === trainerId),
    sessionsToday: (trainerId, branchId) => load().ptSessions.filter((s) => isToday(s.startsAt) && (!trainerId || s.trainerId === trainerId) && (!branchId || s.branchId === branchId)),
    clientRoster(trainerId) {
      const ids = new Set(load().packages.filter((p) => p.trainerId === trainerId).map((p) => p.memberId));
      load().ptSessions.filter((s) => s.trainerId === trainerId).forEach((s) => ids.add(s.memberId));
      return [...ids].map((id) => MemberService.byId(id)).filter(Boolean);
    },
    /* booking guard: same-branch overlap + cross-branch travel time (Beirut
       traffic) — refuses physically impossible schedules */
    validateSlot(trainerId, branchId, startsAt, durationMins = 60) {
      const t = TrainerService.byId(trainerId); if (!t) return { ok: false, reason: 'unknown_trainer' };
      if (!(t.worksAt || [t.locationId]).includes(branchId)) return { ok: false, reason: 'trainer_not_at_branch' };
      const end = startsAt + durationMins * 60000;
      const day = load().ptSessions.filter((s) => s.trainerId === trainerId && ['scheduled', 'live'].includes(s.status));
      for (const s of day) {
        const sEnd = s.startsAt + (s.durationMins || 60) * 60000;
        const gapNeeded = travelMinutes(s.branchId, branchId) * 60000;
        if (startsAt < sEnd + (s.branchId === branchId ? 0 : gapNeeded) && s.startsAt < end + (s.branchId === branchId ? 0 : gapNeeded)) {
          return { ok: false, reason: s.branchId === branchId ? 'trainer_busy' : 'travel_time_conflict', conflictWith: s.id, travelMins: travelMinutes(s.branchId, branchId) };
        }
      }
      /* instructor-led classes the trainer also teaches count too */
      const cls = load().classes.filter((c) => c.instructorId === trainerId && c.status === 'scheduled');
      for (const c of cls) {
        const cEnd = c.startsAt + (c.durationMins || 60) * 60000;
        const gapNeeded = travelMinutes(c.locationId, branchId) * 60000;
        if (startsAt < cEnd + (c.locationId === branchId ? 0 : gapNeeded) && c.startsAt < end + (c.locationId === branchId ? 0 : gapNeeded)) {
          return { ok: false, reason: 'class_conflict', conflictWith: c.id };
        }
      }
      return { ok: true };
    },
    book({ memberId, trainerId, branchId, startsAt, durationMins = 60, actorId }) {
      const m = MemberService.byId(memberId); if (!m) return { error: 'unknown_member' };
      const plan = PlanService.byId(m.planId);
      if (plan && plan.branchAccess === 'single' && branchId !== m.homeBranchId) return { error: 'branch_not_allowed' };
      const slot = TrainerService.validateSlot(trainerId, branchId, startsAt, durationMins);
      if (!slot.ok) return { error: slot.reason, detail: slot };
      const pkg = load().packages.find((p) => p.memberId === memberId && p.trainerId === trainerId && p.used < p.total)
        || load().packages.find((p) => p.memberId === memberId && p.used < p.total);
      if (!pkg && !(plan && plan.ptCredits > 0)) return { error: 'no_pt_credits' };
      const d = load();
      const s = { id: nextId('pts', 'ptSessions'), memberId, trainerId, packageId: pkg ? pkg.id : null, branchId, startsAt, durationMins, status: 'scheduled', exercises: [], notes: '', memberConfirmed: false, smallGroup: false };
      d.ptSessions.unshift(s); persist();
      emit('pt.booked', { sessionId: s.id, __bus: { type: 'pt-booked', payload: { member: m.name, trainer: TrainerService.byId(trainerId).name, branch: BranchService.byId(branchId).name, time: fmtTime(startsAt) } } }, actorId || memberId, memberId, branchId);
      return s;
    },
    reschedule(sessionId, startsAt, actorId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const s = load().ptSessions.find((x) => x.id === sessionId); if (!s) return { error: 'unknown_session' };
      const slot = TrainerService.validateSlot(s.trainerId, s.branchId, startsAt, s.durationMins);
      if (!slot.ok) return { error: slot.reason };
      const from = s.startsAt; s.startsAt = startsAt; persist();
      emit('pt.rescheduled', { from, to: startsAt, reason }, actorId, s.memberId, s.branchId);
      return s;
    },
    cancel(sessionId, actorId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const s = load().ptSessions.find((x) => x.id === sessionId); if (!s) return { error: 'unknown_session' };
      s.status = 'cancelled'; s.cancelReason = reason; persist();
      emit('pt.cancelled', { reason }, actorId, s.memberId, s.branchId);
      return s;
    },
    /* live session — one live 1:1 per trainer unless explicitly small-group */
    startSession(sessionId, trainerId) {
      const s = load().ptSessions.find((x) => x.id === sessionId); if (!s) return { error: 'unknown_session' };
      if (s.trainerId !== trainerId) return { error: 'not_your_session' };
      const live = load().ptSessions.find((x) => x.trainerId === trainerId && x.status === 'live' && !x.smallGroup);
      if (live && !s.smallGroup) return { error: 'session_already_live', liveId: live.id };
      s.status = 'live'; s.startedAt = iso(now()); persist();
      emit('pt.session_started', { sessionId }, trainerId, s.memberId, s.branchId);
      return s;
    },
    logExercise(sessionId, exercise) {
      const s = load().ptSessions.find((x) => x.id === sessionId); if (!s) return { error: 'unknown_session' };
      s.exercises.push(exercise); persist();
      return s;
    },
    endSession(sessionId, trainerId, { notes, pb, flag } = {}) {
      const s = load().ptSessions.find((x) => x.id === sessionId); if (!s) return { error: 'unknown_session' };
      s.status = 'completed'; s.endedAt = iso(now()); if (notes) s.notes = notes; if (pb) s.pb = pb; if (flag) s.flag = flag;
      const pkg = load().packages.find((p) => p.id === s.packageId);
      if (pkg && pkg.used < pkg.total) pkg.used += 1;
      persist();
      if (flag) HealthService.record(s.memberId, { kind: 'injury', label: flag, severity: 'medium', source: 'trainer_assessment', precedence: 3, note: 'Flagged during PT session ' + sessionId }, trainerId);
      emit('pt.session_completed', { sessionId, pb: pb || null, __bus: { type: 'pt-completed', payload: { member: (MemberService.byId(s.memberId) || {}).name, pb: pb || null } } }, trainerId, s.memberId, s.branchId);
      return s;
    },
    confirmSession(sessionId, memberId) {
      const s = load().ptSessions.find((x) => x.id === sessionId); if (!s) return { error: 'unknown_session' };
      if (s.memberId !== memberId) return { error: 'not_your_session' };
      s.memberConfirmed = true; persist();
      emit('pt.session_confirmed', { sessionId }, memberId, memberId, s.branchId);
      return s;
    },
    markNoShow(sessionId, trainerId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const s = load().ptSessions.find((x) => x.id === sessionId); if (!s) return { error: 'unknown_session' };
      s.status = 'no_show'; s.notes = reason; persist();
      emit('pt.no_show', { reason }, trainerId, s.memberId, s.branchId);
      return s;
    },
    /* balanced scorecard — delivery + retention alongside revenue, deliberately
       NOT a sales-only ranking */
    performance(trainerId) {
      const ss = load().ptSessions.filter((s) => s.trainerId === trainerId);
      const done = ss.filter((s) => s.status === 'completed').length;
      const cancelled = ss.filter((s) => s.status === 'cancelled').length;
      const noShow = ss.filter((s) => s.status === 'no_show').length;
      const pkgs = load().packages.filter((p) => p.trainerId === trainerId);
      const revenue = pkgs.reduce((t, p) => t + p.price, 0);
      const clients = TrainerService.clientRoster(trainerId).length;
      const confirmed = ss.filter((s) => s.memberConfirmed).length;
      return { trainerId, delivered: done, cancelled, noShow, clients, revenue,
        cancellationRate: ss.length ? Math.round((cancelled / ss.length) * 100) : 0,
        noShowRate: ss.length ? Math.round((noShow / ss.length) * 100) : 0,
        confirmationRate: done ? Math.round((confirmed / done) * 100) : 0 };
    },
    /* everything a trainer needs to see at a glance — feeds the "My Trainer"
       side of the coaching relationship back to the trainer's own dashboard */
    clientDashboard(trainerId) {
      const d = load();
      const clients = TrainerService.clientRoster(trainerId);
      const todaysWorkouts = d.workoutSessions.filter((w) => w.trainerId === trainerId && w.assignedFor === iso(now()).slice(0, 10));
      const completed = todaysWorkouts.filter((w) => w.status === 'completed').map((w) => w.memberId);
      const missed = todaysWorkouts.filter((w) => w.status === 'assigned' && w.assignedFor < iso(now()).slice(0, 10)).map((w) => w.memberId);
      const painFlags = d.workoutSessions.filter((w) => w.trainerId === trainerId && w.status === 'completed' && w.trainerFeedback && w.trainerFeedback.pain && !/none/i.test(w.trainerFeedback.pain))
        .map((w) => ({ memberId: w.memberId, sessionId: w.id, pain: w.trainerFeedback.pain, at: w.endedAt }));
      const recentPRs = d.personalRecords.filter((p) => clients.some((c) => c.id === p.memberId) && p.achievedAt >= iso(now() - 864e5 * 14).slice(0, 10));
      const lowCredits = clients.filter((c) => PackageService.remaining(c.id) <= 2 && PackageService.remaining(c.id) > 0);
      const staleClients = clients.filter((c) => {
        const last = d.workoutSessions.filter((w) => w.memberId === c.id && w.status === 'completed').sort((a, b) => (b.endedAt || '').localeCompare(a.endedAt || ''))[0];
        return !last || (now() - Date.parse(last.endedAt)) > 12 * 864e5;
      });
      return { todaysClients: todaysWorkouts.map((w) => ({ memberId: w.memberId, status: w.status, workoutId: w.id })), completed, missed, painFlags, recentPRs, lowCredits, staleClients };
    },
  };

  const PackageService = {
    list: () => load().packages.slice(),
    forMember: (memberId) => load().packages.filter((p) => p.memberId === memberId),
    remaining: (memberId) => PackageService.forMember(memberId).reduce((t, p) => t + (p.total - p.used), 0),
    sell({ memberId, trainerId, total, price, staffId, branchId, method }) {
      const d = load();
      const p = { id: nextId('pkg', 'packages'), memberId, trainerId: trainerId || null, total, used: 0, price, soldAt: iso(now()).slice(0, 10), soldBy: staffId };
      d.packages.push(p); persist();
      PaymentService.take({ memberId, amount: price, method: method || 'card', what: `PT package · ${total} sessions`, staffId, branchId });
      emit('pt.package_sold', { packageId: p.id, total, price }, staffId, memberId, branchId);
      return p;
    },
  };

  /* ---------- classes: booking, waitlist, instructor workflow ---------- */
  const BookingService = {
    list: () => load().bookings.slice(),
    forClass: (classId) => load().bookings.filter((b) => b.classId === classId && b.state === 'booked'),
    forMember: (memberId) => load().bookings.filter((b) => b.memberId === memberId && b.state === 'booked'),
    classById: (id) => load().classes.find((c) => c.id === id) || null,
    bookClass(memberId, classId) {
      const d = load();
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      if (cls.status !== 'scheduled') return { error: 'class_not_open' };
      const m = MemberService.byId(memberId); if (!m) return { error: 'unknown_member' };
      const plan = PlanService.byId(m.planId);
      if (plan && plan.branchAccess === 'single' && cls.locationId !== m.homeBranchId) return { error: 'branch_not_allowed' };
      if (plan && !plan.classesIncluded) return { error: 'classes_not_included' };
      if (d.bookings.some((b) => b.memberId === memberId && b.classId === classId && b.state === 'booked')) return { error: 'already_booked' };
      const clash = d.bookings.find((b) => b.memberId === memberId && b.state === 'booked' && b.classId && d.classes.find((c) => c.id === b.classId && Math.abs(c.startsAt - cls.startsAt) < 45 * 60000));
      if (clash) return { error: 'time_conflict' };
      if (BookingService.forClass(classId).length >= cls.capacity) {
        if (!cls.waitlist.includes(memberId)) { cls.waitlist.push(memberId); persist(); emit('class.waitlisted', { classId }, memberId, memberId, cls.locationId); }
        return { waitlisted: true, position: cls.waitlist.indexOf(memberId) + 1 };
      }
      const b = { id: nextId('bkg', 'bookings'), type: 'class', classId, memberId, state: 'booked', createdAt: now() };
      d.bookings.unshift(b); persist();
      emit('class.booked', { bookingId: b.id, classId, __bus: { type: 'class-booked', payload: { member: m.name, cls: cls.name, branch: BranchService.byId(cls.locationId).name } } }, memberId, memberId, cls.locationId);
      return b;
    },
    cancelBooking(memberId, classId, force, actorId, reason) {
      const d = load();
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      const b = d.bookings.find((x) => x.memberId === memberId && x.classId === classId && x.state === 'booked');
      if (!b) return { error: 'no_booking' };
      const pastDeadline = now() > cls.startsAt - (cls.cancelDeadlineMins || 0) * 60000;
      if (pastDeadline && !force) return { error: 'past_cancel_deadline' };
      if (pastDeadline && force && requireReason(reason)) return { error: 'reason_required' };
      b.state = 'cancelled'; persist();
      emit('class.booking_cancelled', { classId, late: pastDeadline, reason: reason || null }, actorId || memberId, memberId, cls.locationId);
      BookingService.promoteWaitlist(classId);
      return b;
    },
    promoteWaitlist(classId) {
      const d = load();
      const cls = BookingService.classById(classId); if (!cls) return;
      while (cls.waitlist.length && BookingService.forClass(classId).length < cls.capacity) {
        const memberId = cls.waitlist.shift();
        const b = { id: nextId('bkg', 'bookings'), type: 'class', classId, memberId, state: 'booked', createdAt: now(), fromWaitlist: true };
        d.bookings.unshift(b);
        emit('class.waitlist_promoted', { classId, __bus: { type: 'waitlist-promoted', payload: { member: (MemberService.byId(memberId) || {}).name, cls: cls.name } } }, null, memberId, cls.locationId);
      }
      persist();
    },
    /* capacity reduction — the instructor→maintenance→booking chain. Excess
       confirmed bookings (latest first) drop to the FRONT of the waitlist. */
    reduceCapacity(classId, newCapacity, actorId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      const from = cls.capacity; cls.capacity = newCapacity;
      const booked = BookingService.forClass(classId).sort((a, b) => b.createdAt - a.createdAt);
      const excess = booked.slice(0, Math.max(0, booked.length - newCapacity));
      excess.forEach((b) => { b.state = 'cancelled'; if (!cls.waitlist.includes(b.memberId)) cls.waitlist.unshift(b.memberId); });
      persist();
      emit('class.capacity_reduced', { from, to: newCapacity, reason, bumped: excess.length, __bus: { type: 'class-capacity', payload: { cls: cls.name, from, to: newCapacity, branch: BranchService.byId(cls.locationId).name } } }, actorId, classId, cls.locationId);
      return { ok: true, bumped: excess.length };
    },
    cancelClass(classId, actorId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      cls.status = 'cancelled'; persist();
      emit('class.cancelled', { classId, reason, __bus: { type: 'class-cancelled', payload: { cls: cls.name, reason } } }, actorId, classId, cls.locationId);
      return cls;
    },
  };

  const InstructorService = {
    myClasses: (instructorId) => load().classes.filter((c) => c.instructorId === instructorId),
    safetyCheck(classId, instructorId, { roomOk, equipmentOk, issues = [] }) {
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      cls.safetyCheck = { at: iso(now()), roomOk, equipmentOk, issues, by: instructorId }; persist();
      emit('class.safety_check', { classId, roomOk, equipmentOk, issues }, instructorId, classId, cls.locationId);
      return cls;
    },
    /* unusable equipment found in the room → work orders + capacity drop + waitlist recalc */
    reportEquipment(classId, instructorId, assetIds, problem, capacityDrop) {
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      const orders = assetIds.map((assetId) => MaintenanceService.createWorkOrder({ assetId, problem, severity: 'safety', reporterId: instructorId }));
      let reduced = null;
      if (capacityDrop && capacityDrop > 0) reduced = BookingService.reduceCapacity(classId, cls.capacity - capacityDrop, instructorId, `${assetIds.length} station(s) unusable: ${problem}`);
      return { workOrders: orders, reduced };
    },
    checkInMember(classId, memberId, instructorId) {
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      if (cls.report) return { error: 'attendance_locked' };
      if (!BookingService.forClass(classId).some((b) => b.memberId === memberId)) return { error: 'not_booked' };
      if (!cls.checkins.includes(memberId)) { cls.checkins.push(memberId); persist(); }
      emit('class.member_checked_in', { classId }, instructorId, memberId, cls.locationId);
      return cls;
    },
    requestCover(classId, instructorId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      cls.coverRequested = { at: iso(now()), by: instructorId, reason }; persist();
      emit('class.cover_requested', { classId, reason, __bus: { type: 'cover-request', payload: { cls: cls.name, reason } } }, instructorId, classId, cls.locationId);
      return cls;
    },
    proposeRoomChange(classId, instructorId, toRoomId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      cls.roomChangeProposal = { at: iso(now()), by: instructorId, toRoomId, reason }; persist();
      emit('class.room_change_proposed', { classId, toRoomId, reason }, instructorId, classId, cls.locationId);
      return cls;
    },
    postClassReport(classId, instructorId, { attended, notes }) {
      const cls = BookingService.classById(classId); if (!cls) return { error: 'unknown_class' };
      cls.report = { at: iso(now()), attended: attended != null ? attended : cls.checkins.length, notes: notes || '', by: instructorId };
      cls.status = 'completed'; persist();
      emit('class.report_completed', { classId, attended: cls.report.attended }, instructorId, classId, cls.locationId);
      return cls;
    },
  };

  /* ---------- maintenance ---------- */
  const MaintenanceService = {
    assets: (branchId) => load().assets.filter((a) => !branchId || a.locationId === branchId),
    assetById: (id) => load().assets.find((a) => a.id === id) || null,
    offline: (branchId) => MaintenanceService.assets(branchId).filter((a) => ['out_of_service', 'waiting_parts'].includes(a.status)),
    /* member-facing view is deliberately simple: status + alternative only */
    memberView(assetId) {
      const a = MaintenanceService.assetById(assetId); if (!a) return null;
      const alt = a.altAssetId ? MaintenanceService.assetById(a.altAssetId) : null;
      return { name: a.name, branch: (BranchService.byId(a.locationId) || {}).name, available: a.status === 'available', alternative: alt && alt.status === 'available' ? `${alt.name} — ${alt.floor}` : null, expectedReview: a.expectedReviewAt || null };
    },
    isolate(assetId, actorId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const a = MaintenanceService.assetById(assetId); if (!a) return { error: 'unknown_asset' };
      a.status = 'out_of_service'; a.expectedReviewAt = iso(daysFromNow(1)).slice(0, 10);
      a.history.unshift({ at: iso(now()).slice(0, 10), what: 'Isolated: ' + reason, by: actorId }); persist();
      const alt = a.altAssetId ? MaintenanceService.assetById(a.altAssetId) : null;
      emit('maintenance.asset_isolated', { reason, __bus: { type: 'asset-status', payload: { asset: a.name, assetId: a.id, branch: (BranchService.byId(a.locationId) || {}).name, status: 'Out of service', alt: alt ? alt.name : null } } }, actorId, assetId, a.locationId);
      return a;
    },
    returnToService(assetId, actorId, verifiedBy) {
      const a = MaintenanceService.assetById(assetId); if (!a) return { error: 'unknown_asset' };
      a.status = 'available'; a.lastInspection = iso(now()).slice(0, 10); a.expectedReviewAt = null;
      a.history.unshift({ at: iso(now()).slice(0, 10), what: 'Returned to service (verified by ' + (verifiedBy || actorId) + ')', by: actorId }); persist();
      emit('maintenance.asset_restored', { verifiedBy, __bus: { type: 'asset-status', payload: { asset: a.name, assetId: a.id, branch: (BranchService.byId(a.locationId) || {}).name, status: 'Available', alt: null } } }, actorId, assetId, a.locationId);
      return a;
    },
    createWorkOrder({ assetId, problem, severity, reporterId }) {
      const d = load();
      const asset = MaintenanceService.assetById(assetId);
      const wo = { id: nextId('wo', 'workOrders'), assetId, locationId: asset ? asset.locationId : null, problem, severity: severity || 'normal', reporterId: reporterId || null,
        status: 'reported', assigneeId: null, createdAt: iso(now()), parts: [], history: [{ at: iso(now()), status: 'reported', by: reporterId }] };
      d.workOrders.unshift(wo); persist();
      emit('maintenance.work_order_created', { workOrderId: wo.id, severity: wo.severity, __bus: { type: 'work-order', payload: { asset: asset ? asset.name : assetId, branch: asset ? (BranchService.byId(asset.locationId) || {}).name : '', severity: wo.severity } } }, reporterId, assetId, wo.locationId);
      if (severity === 'safety') MaintenanceService.isolate(assetId, reporterId, 'auto-isolated: safety report');
      return wo;
    },
    advanceWorkOrder(woId, status, actorId, note) {
      const wo = load().workOrders.find((w) => w.id === woId); if (!wo) return { error: 'unknown_work_order' };
      wo.status = status; wo.history.push({ at: iso(now()), status, by: actorId, note: note || null }); persist();
      emit('maintenance.work_order_' + status, { workOrderId: woId }, actorId, wo.assetId, wo.locationId);
      return wo;
    },
    /* major repairs above threshold need an owner approval before work starts */
    requestMajorRepair(woId, amount, actorId, reason) {
      const wo = load().workOrders.find((w) => w.id === woId); if (!wo) return { error: 'unknown_work_order' };
      return ApprovalService.request({ type: 'major_repair', subject: (MaintenanceService.assetById(wo.assetId) || {}).name + ' — ' + wo.problem, amount, reason, requestedBy: actorId, branchId: wo.locationId, meta: { workOrderId: woId } });
    },
  };

  const IncidentService = {
    list: (branchId) => load().incidents.filter((i) => !branchId || i.locationId === branchId),
    raiseSOS({ memberId, type, zone, branchId }) {
      const d = load();
      const m = MemberService.byId(memberId);
      const resolvedBranch = branchId || (m ? m.homeBranchId : null);
      const inc = { id: nextId('inc', 'incidents'), kind: 'sos', memberId, type, zone, locationId: resolvedBranch, status: 'active', createdAt: iso(now()), acknowledgedBy: null, closedAt: null, sensitive: false, actions: [] };
      d.incidents.unshift(inc); persist();
      emit('member.sos_started', { incidentId: inc.id, __bus: { type: 'sos', payload: { member: m ? m.name : memberId, memberId, sosType: type, zone, branch: (BranchService.byId(resolvedBranch) || {}).name } } }, null, memberId, resolvedBranch);
      return inc;
    },
    report({ kind, note, staffId, branchId, memberId, sensitive }) {
      const d = load();
      const inc = { id: nextId('inc', 'incidents'), kind: kind || 'incident', memberId: memberId || null, note, locationId: branchId, status: 'active', sensitive: !!sensitive, createdAt: iso(now()), acknowledgedBy: null, closedAt: null, actions: [] };
      d.incidents.unshift(inc); persist();
      emit('incident.reported', { incidentId: inc.id, kind: inc.kind }, staffId, memberId || null, branchId);
      return inc;
    },
    acknowledge(incidentId, staffId) {
      const inc = load().incidents.find((i) => i.id === incidentId); if (!inc) return { error: 'unknown_incident' };
      inc.status = 'acknowledged'; inc.acknowledgedBy = staffId; inc.actions.push({ at: iso(now()), by: staffId, action: 'acknowledged' }); persist();
      emit('member.sos_acknowledged', { incidentId }, staffId, inc.memberId, inc.locationId);
      return inc;
    },
    /* sensitive incidents route through owner approval before closing */
    close(incidentId, staffId, report) {
      const inc = load().incidents.find((i) => i.id === incidentId); if (!inc) return { error: 'unknown_incident' };
      if (!report || String(report).trim().length < 5) return { error: 'incident_report_required' };
      if (inc.sensitive) {
        return ApprovalService.request({ type: 'incident_closure', subject: 'Sensitive incident ' + incidentId, amount: 0, reason: report, requestedBy: staffId, branchId: inc.locationId, meta: { incidentId } });
      }
      inc.status = 'closed'; inc.closedAt = iso(now()); inc.report = report;
      inc.actions.push({ at: iso(now()), by: staffId, action: 'closed' }); persist();
      emit('incident.closed', { incidentId }, staffId, inc.memberId, inc.locationId);
      return inc;
    },
  };

  const PaymentService = {
    ledger: (branchId) => load().payments.filter((p) => !branchId || p.locationId === branchId),
    take({ memberId, amount, method, what, staffId, branchId }) {
      const d = load();
      const m = MemberService.byId(memberId);
      const resolvedBranch = branchId || (m ? m.homeBranchId : null);
      const p = { id: nextId('pay', 'payments'), memberId: memberId || null, amount, method, what, staffId, locationId: resolvedBranch, at: iso(now()), status: 'paid' };
      d.payments.unshift(p); persist();
      emit('payment.taken', { paymentId: p.id, amount, method, what }, staffId, memberId, resolvedBranch);
      return p;
    },
    refund(paymentId, staffId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const p = load().payments.find((x) => x.id === paymentId); if (!p) return { error: 'unknown_payment' };
      /* refunds are owner-approval territory */
      return ApprovalService.request({ type: 'refund', subject: p.what + ' — $' + p.amount, amount: p.amount, reason, requestedBy: staffId, branchId: p.locationId, meta: { paymentId } });
    },
    todayTotal: (branchId) => load().payments.filter((p) => p.status === 'paid' && isToday(new Date(p.at).getTime()) && (!branchId || p.locationId === branchId)).reduce((s, p) => s + p.amount, 0),
    monthTotal: (branchId) => { const n = new Date(now()); return load().payments.filter((p) => { const d0 = new Date(p.at); return p.status === 'paid' && d0.getMonth() === n.getMonth() && d0.getFullYear() === n.getFullYear() && (!branchId || p.locationId === branchId); }).reduce((s, p) => s + p.amount, 0); },
  };

  /* ---------- Fuel Bar & Retail ---------- */
  const RetailService = {
    catalog: () => load().retailItems.slice(),
    byId: (id) => load().retailItems.find((i) => i.id === id) || null,
    stockAt: (itemId, branchId) => { const i = RetailService.byId(itemId); return i ? (i.stock[branchId] || 0) : 0; },
    lowStock: (branchId) => load().retailItems.filter((i) => (i.stock[branchId] || 0) <= i.lowAt),
    sell({ itemId, branchId, memberId, qty = 1, staffId, method }) {
      const d = load();
      const item = RetailService.byId(itemId); if (!item) return { error: 'unknown_item' };
      if ((item.stock[branchId] || 0) < qty) return { error: 'out_of_stock' };
      /* allergen guard where food is sold — warn if the buying member has a
         declared allergy matching the item */
      let allergenWarning = null;
      if (memberId && item.allergens.length) {
        const facts = HealthService.visibleTo(memberId, 'fuelbar');
        const hit = facts.find((f) => item.allergens.includes(f.label));
        if (hit) allergenWarning = hit.label;
      }
      item.stock[branchId] -= qty;
      const total = item.price * qty;
      const o = { id: nextId('ord', 'orders'), itemId, name: item.name, qty, total, memberId: memberId || null, staffId, locationId: branchId, at: iso(now()) };
      d.orders.unshift(o); persist();
      PaymentService.take({ memberId, amount: total, method: method || 'card', what: item.name + (qty > 1 ? ` ×${qty}` : ''), staffId, branchId });
      if (item.stock[branchId] <= item.lowAt) emit('retail.low_stock', { itemId, left: item.stock[branchId], __bus: { type: 'low-stock', payload: { item: item.name, branch: (BranchService.byId(branchId) || {}).name, left: item.stock[branchId] } } }, staffId, itemId, branchId);
      emit('retail.sale', { orderId: o.id, total }, staffId, memberId || null, branchId);
      return { order: o, allergenWarning };
    },
    restock({ itemId, branchId, qty, staffId, cost }) {
      const item = RetailService.byId(itemId); if (!item) return { error: 'unknown_item' };
      if (cost && cost > 500) {
        return ApprovalService.request({ type: 'stock_purchase', subject: `${item.name} ×${qty} — ${(BranchService.byId(branchId) || {}).name}`, amount: cost, reason: 'Restock above owner-approval threshold', requestedBy: staffId, branchId, meta: { itemId, qty } });
      }
      item.stock[branchId] = (item.stock[branchId] || 0) + qty; persist();
      emit('retail.restocked', { itemId, qty }, staffId, itemId, branchId);
      return item;
    },
    salesToday: (branchId) => load().orders.filter((o) => isToday(new Date(o.at).getTime()) && (!branchId || o.locationId === branchId)).reduce((s, o) => s + o.total, 0),
  };

  /* ---------- CRM ---------- */
  const LEAD_STAGES = ['new', 'contacted', 'tour_booked', 'trial', 'offer', 'follow_up', 'won', 'lost'];
  const LeadService = {
    STAGES: LEAD_STAGES,
    list: (branchId) => load().leads.filter((l) => !branchId || l.branchId === branchId),
    byId: (id) => load().leads.find((l) => l.id === id) || null,
    create({ name, phone, source, interest, branchId, staffId }) {
      const d = load();
      const l = { id: nextId('led', 'leads'), name, phone: phone || '', source: source || 'Walk-in', interest: interest || '', stage: 'new', branchId, ownerStaffId: staffId, createdAt: now(), nextFollowUpAt: now() + 864e5, notes: [] };
      d.leads.unshift(l); persist();
      emit('lead.created', { leadId: l.id, source: l.source, __bus: { type: 'lead', payload: { name, source: l.source, branch: (BranchService.byId(branchId) || {}).name } } }, staffId, l.id, branchId);
      return l;
    },
    advance(leadId, stage, staffId, note) {
      const l = LeadService.byId(leadId); if (!l) return { error: 'unknown_lead' };
      if (!LEAD_STAGES.includes(stage)) return { error: 'unknown_stage' };
      l.stage = stage; if (note) l.notes.unshift({ at: iso(now()), by: staffId, txt: note });
      l.nextFollowUpAt = stage === 'won' || stage === 'lost' ? null : now() + 864e5; persist();
      emit('lead.stage_changed', { leadId, stage }, staffId, leadId, l.branchId);
      return l;
    },
    lose(leadId, staffId, reason) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const l = LeadService.byId(leadId); if (!l) return { error: 'unknown_lead' };
      l.stage = 'lost'; l.lostReason = reason; l.nextFollowUpAt = null; persist();
      emit('lead.lost', { leadId, reason }, staffId, leadId, l.branchId);
      return l;
    },
    /* trial/offer → membership sold; creates the member + the payment */
    convert(leadId, planId, staffId, method) {
      const l = LeadService.byId(leadId); if (!l) return { error: 'unknown_lead' };
      const m = MemberService.sell({ name: l.name, phone: l.phone, planId, homeBranchId: l.branchId, staffId, method, leadId });
      if (m.error) return m;
      l.stage = 'won'; l.convertedMemberId = m.id; l.nextFollowUpAt = null; persist();
      emit('lead.converted', { leadId, memberId: m.id }, staffId, leadId, l.branchId);
      return { lead: l, member: m };
    },
    metrics() {
      const ls = load().leads;
      const byBranch = {}; const bySource = {};
      ls.forEach((l) => {
        byBranch[l.branchId] = byBranch[l.branchId] || { total: 0, won: 0 }; byBranch[l.branchId].total++; if (l.stage === 'won') byBranch[l.branchId].won++;
        bySource[l.source] = bySource[l.source] || { total: 0, won: 0 }; bySource[l.source].total++; if (l.stage === 'won') bySource[l.source].won++;
      });
      const overdue = ls.filter((l) => l.nextFollowUpAt && l.nextFollowUpAt < now() && !['won', 'lost'].includes(l.stage));
      const trials = ls.filter((l) => ['trial', 'offer', 'follow_up', 'won'].includes(l.stage) || l.stage === 'lost');
      const trialWon = ls.filter((l) => l.stage === 'won');
      const byStaff = {};
      ls.filter((l) => l.stage === 'won').forEach((l) => { byStaff[l.ownerStaffId] = (byStaff[l.ownerStaffId] || 0) + 1; });
      const lost = ls.filter((l) => l.stage === 'lost');
      return { byBranch, bySource, overdue, conversion: trials.length ? Math.round((trialWon.length / trials.length) * 100) : 0, salesByStaff: byStaff, lostReasons: lost.map((l) => l.lostReason).filter(Boolean) };
    },
  };

  /* ---------- owner approvals ---------- */
  const ApprovalService = {
    TYPES: ['discount_large', 'refund', 'writeoff', 'membership_exception', 'free_membership', 'stock_purchase', 'major_repair', 'branch_transfer', 'cash_variance', 'incident_closure'],
    list: (status) => load().approvals.filter((a) => !status || a.status === status),
    request({ type, subject, amount, reason, requestedBy, branchId, meta }) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const d = load();
      const a = { id: nextId('apr', 'approvals'), type, subject, amount: amount || 0, reason, requestedBy, branchId: branchId || null, status: 'pending', createdAt: iso(now()), decidedBy: null, decidedAt: null, note: null, meta: meta || {} };
      d.approvals.unshift(a); persist();
      emit('approval.requested', { approvalId: a.id, type, amount, __bus: { type: 'approval', payload: { what: subject, type, amount } } }, requestedBy, a.id, branchId);
      return a;
    },
    decide(approvalId, approverId, approve, note) {
      const a = load().approvals.find((x) => x.id === approvalId); if (!a) return { error: 'unknown_approval' };
      if (a.status !== 'pending') return { error: 'already_decided' };
      a.status = approve ? 'approved' : 'rejected'; a.decidedBy = approverId; a.decidedAt = iso(now()); a.note = note || null; persist();
      /* apply side effects of approved requests */
      if (approve) {
        if (a.type === 'branch_transfer' && a.meta.memberId) {
          const m = MemberService.byId(a.meta.memberId);
          if (m) { const from = m.homeBranchId; m.homeBranchId = a.meta.toBranchId; persist(); emit('member.branch_transferred', { from, to: a.meta.toBranchId }, approverId, m.id, a.meta.toBranchId); }
        }
        if (a.type === 'incident_closure' && a.meta.incidentId) {
          const inc = load().incidents.find((i) => i.id === a.meta.incidentId);
          if (inc) { inc.status = 'closed'; inc.closedAt = iso(now()); inc.report = a.reason; persist(); }
        }
        if (a.type === 'stock_purchase' && a.meta.itemId) {
          const item = RetailService.byId(a.meta.itemId);
          if (item && a.branchId) { item.stock[a.branchId] = (item.stock[a.branchId] || 0) + (a.meta.qty || 0); persist(); }
        }
      }
      emit('approval.' + a.status, { approvalId, type: a.type }, approverId, a.id, a.branchId);
      return a;
    },
  };

  /* ---------- reception shifts + cash drawer ---------- */
  const ShiftService = {
    open(branchId, staffId, floatUSD) {
      const d = load();
      if (d.shifts.some((s) => s.branchId === branchId && !s.closedAt)) return { error: 'shift_already_open' };
      const s = { id: nextId('sh', 'shifts'), branchId, staffId, openedAt: iso(now()), closedAt: null, floatUSD: floatUSD || 0, countedUSD: null, varianceUSD: null };
      d.shifts.unshift(s); persist();
      emit('shift.opened', { shiftId: s.id }, staffId, null, branchId);
      return s;
    },
    current: (branchId) => load().shifts.find((s) => s.branchId === branchId && !s.closedAt) || null,
    onShiftNow: () => load().shifts.filter((s) => !s.closedAt),
    /* close reconciles cash: expected = float + today's cash payments at this branch */
    close(shiftId, staffId, countedUSD) {
      const s = load().shifts.find((x) => x.id === shiftId); if (!s) return { error: 'unknown_shift' };
      if (s.closedAt) return { error: 'already_closed' };
      const cashToday = load().payments.filter((p) => p.locationId === s.branchId && p.method === 'cash' && isToday(new Date(p.at).getTime())).reduce((t, p) => t + p.amount, 0);
      const expected = s.floatUSD + cashToday;
      s.closedAt = iso(now()); s.countedUSD = countedUSD; s.varianceUSD = +(countedUSD - expected).toFixed(2); persist();
      emit('shift.closed', { shiftId, expected, counted: countedUSD, variance: s.varianceUSD }, staffId, null, s.branchId);
      if (Math.abs(s.varianceUSD) > 20) {
        ApprovalService.request({ type: 'cash_variance', subject: `Drawer variance $${s.varianceUSD} — ${(BranchService.byId(s.branchId) || {}).name}`, amount: Math.abs(s.varianceUSD), reason: 'Variance above $20 threshold at shift close', requestedBy: staffId, branchId: s.branchId, meta: { shiftId } });
      }
      return s;
    },
  };

  /* ---------- guest passes ---------- */
  const GuestService = {
    list: (branchId) => load().guestPasses.filter((g) => !branchId || g.branchId === branchId),
    create({ hostMemberId, guestName, branchId, staffId }) {
      const host = MemberService.byId(hostMemberId); if (!host) return { error: 'unknown_member' };
      const d = load();
      const g = { id: nextId('gst', 'guestPasses'), hostMemberId, guestName, branchId, fee: 10, status: 'expected', createdAt: iso(now()), redeemedAt: null };
      d.guestPasses.unshift(g); persist();
      PaymentService.take({ memberId: hostMemberId, amount: 10, method: 'wallet', what: 'Guest pass · ' + guestName, staffId: staffId || null, branchId });
      emit('guest.pass_created', { guestName, __bus: { type: 'guest-pass', payload: { host: host.name, guest: guestName, branch: (BranchService.byId(branchId) || {}).name } } }, staffId || hostMemberId, hostMemberId, branchId);
      return g;
    },
    redeem(guestPassId, staffId) {
      const g = load().guestPasses.find((x) => x.id === guestPassId); if (!g) return { error: 'unknown_pass' };
      if (g.status !== 'expected') return { error: 'already_used' };
      g.status = 'redeemed'; g.redeemedAt = iso(now()); persist();
      emit('guest.pass_redeemed', { guestPassId }, staffId, g.hostMemberId, g.branchId);
      return g;
    },
  };

  /* ---------- lightweight nutrition (no clinical workflows) ---------- */
  const NutritionService = {
    consults: (staffId) => load().consults.filter((c) => !staffId || c.staffId === staffId),
    book({ memberId, staffId, branchId, startsAt, kind }) {
      const d = load();
      const c = { id: nextId('ncs', 'consults'), memberId, staffId, branchId, startsAt, status: 'scheduled', kind: kind || 'consultation', notes: '' };
      d.consults.unshift(c); persist();
      emit('nutrition.consult_booked', { consultId: c.id }, memberId, memberId, branchId);
      return c;
    },
    complete(consultId, staffId, notes) {
      const c = load().consults.find((x) => x.id === consultId); if (!c) return { error: 'unknown_consult' };
      c.status = 'completed'; c.notes = notes || ''; persist();
      emit('nutrition.consult_completed', { consultId }, staffId, c.memberId, c.branchId);
      return c;
    },
    bodyCompFor: (memberId) => load().bodyComp.filter((b) => b.memberId === memberId).sort((a, b) => b.at.localeCompare(a.at)),
    recordBodyComp({ memberId, weightKg, bodyFatPct, muscleKg, staffId }) {
      const d = load();
      const b = { id: nextId('bc', 'bodyComp'), memberId, at: iso(now()).slice(0, 10), weightKg, bodyFatPct, muscleKg, by: staffId };
      d.bodyComp.unshift(b); persist();
      emit('nutrition.bodycomp_recorded', { memberId }, staffId, memberId);
      return b;
    },
    mealPlansFor: (memberId) => load().mealPlans.filter((m) => m.memberId === memberId),
    uploadMealPlan({ memberId, filename, staffId }) {
      const d = load();
      const m = { id: nextId('mp', 'mealPlans'), memberId, filename, uploadedAt: iso(now()).slice(0, 10), by: staffId };
      d.mealPlans.unshift(m); persist();
      emit('nutrition.mealplan_uploaded', { filename }, staffId, memberId);
      return m;
    },
  };

  /* ---------- owner / network dashboard ---------- */
  const OwnerService = {
    network() {
      const members = load().members;
      const active = members.filter((m) => m.status === 'active');
      const byBranch = {};
      BranchService.list().forEach((l) => { byBranch[l.id] = members.filter((m) => m.homeBranchId === l.id).length; });
      return {
        totalActive: active.length,
        membersByBranch: byBranch,
        insideNow: AccessService.insideNow().length,
        revenueToday: PaymentService.todayTotal(),
        revenueMonth: PaymentService.monthTotal(),
        newThisMonth: members.filter((m) => { const d0 = new Date(m.memberSince); const n = new Date(now()); return d0.getMonth() === n.getMonth() && d0.getFullYear() === n.getFullYear(); }).length,
        expiringSoon: MemberService.renewalsDue(null, 14).length,
        frozen: members.filter((m) => m.status === 'frozen').length,
        ptRevenue: load().packages.reduce((t, p) => t + p.price, 0),
        classAttendanceToday: load().classes.filter((c) => isToday(c.startsAt)).reduce((t, c) => t + (c.report ? c.report.attended : BookingService.forClass(c.id).length), 0),
        retailToday: RetailService.salesToday(),
        openIncidents: load().incidents.filter((i) => i.status !== 'closed').length,
        equipmentOffline: MaintenanceService.offline().length,
        staffOnShift: ShiftService.onShiftNow().length,
        pendingApprovals: ApprovalService.list('pending').length,
      };
    },
    /* the branch comparison table — one row per branch */
    comparison() {
      return BranchService.list().map((l) => {
        const inside = AccessService.insideNow(l.id).length;
        return {
          branchId: l.id, name: l.name, unconfirmed: !!l.unconfirmed,
          inside, capacity: l.capacity, occupancyPct: Math.round((inside / l.capacity) * 100),
          revenueToday: PaymentService.todayTotal(l.id),
          ptSessionsToday: load().ptSessions.filter((s) => isToday(s.startsAt) && s.branchId === l.id).length,
          equipmentOffline: MaintenanceService.offline(l.id).length,
          renewalsDue: MemberService.renewalsDue(l.id).length,
          retailToday: RetailService.salesToday(l.id),
          deniedToday: AccessService.deniedToday(l.id).length,
        };
      });
    },
  };

  const NotificationService = {
    forMember(memberId) { return load().notifications.filter((n) => n.memberId === memberId); },
    push({ memberId, title, body, channel }) {
      const d = load();
      const n = { id: nextId('ntf', 'notifications'), memberId, title, body, channel: channel || 'push', at: iso(now()), read: false };
      d.notifications.unshift(n); persist();
      return n;
    },
  };

  /* ---------- Train: exercise library ---------- */
  const ExerciseService = {
    list: (category) => load().exerciseLibrary.filter((e) => !category || e.category === category),
    byId: (id) => load().exerciseLibrary.find((e) => e.id === id) || null,
    /* est. 1RM via Epley formula */
    estOneRepMax: (weightKg, reps) => reps <= 1 ? weightKg : Math.round(weightKg * (1 + reps / 30) * 10) / 10,
    /* is any of this exercise's machines available at this branch? if not, suggest
       an alternative — checked one level deep only (an alt's OWN direct machine
       availability), never recursing into the alt's alternatives. Two exercises
       that list each other as alternates would otherwise bounce forever. */
    availabilityAt(exerciseId, branchId) {
      const ex = ExerciseService.byId(exerciseId); if (!ex) return { ok: false, reason: 'unknown_exercise' };
      const directCheck = (exercise) => {
        if (!exercise.machineAssetIds || !exercise.machineAssetIds.length) return { ok: true, machine: null }; // bodyweight/free-weight, always available
        const assets = exercise.machineAssetIds.map((id) => MaintenanceService.assetById(id)).filter(Boolean).filter((a) => a.locationId === branchId);
        if (!assets.length) return { ok: false, reason: 'not_at_branch' };
        const available = assets.find((a) => a.status === 'available');
        if (!available) return { ok: false, reason: 'machine_down', machine: assets[0] };
        return { ok: true, machine: available };
      };
      const result = directCheck(ex);
      if (result.ok) return result;
      const alt = (ex.altExerciseIds || []).map((id) => ExerciseService.byId(id)).find((a) => a && directCheck(a).ok);
      return Object.assign({}, result, { suggestion: alt || null });
    },
    /* every set of this exercise this member has ever logged, most recent first */
    historyFor(memberId, exerciseId) {
      const sessions = load().workoutSessions.filter((w) => w.memberId === memberId && w.status === 'completed').sort((a, b) => (b.endedAt || '').localeCompare(a.endedAt || ''));
      const rows = [];
      sessions.forEach((w) => {
        const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
        if (ex) rows.push({ sessionId: w.id, at: w.endedAt, branchId: w.branchId, sets: ex.sets.filter((s) => s.status === 'completed' && s.actualWeight != null) });
      });
      return rows;
    },
    lastPerformance(memberId, exerciseId) {
      const rows = ExerciseService.historyFor(memberId, exerciseId);
      return rows.length ? rows[0] : null;
    },
  };

  /* ---------- Train: programs — versioned, never overwritten ---------- */
  const ProgramService = {
    list: (memberId) => load().programs.filter((p) => p.memberId === memberId),
    byId: (id) => load().programs.find((p) => p.id === id) || null,
    current: (memberId) => load().programs.find((p) => p.memberId === memberId && p.status === 'active') || null,
    currentVersion(program) { return program ? program.versions.find((v) => v.version === program.currentVersion) : null; },
    assign({ memberId, trainerId, name, days, reason }) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const d = load();
      const p = { id: nextId('prg', 'programs'), memberId, trainerId, name, status: 'active', currentVersion: 1, versions: [{ version: 1, at: iso(now()), changedBy: trainerId, reason, changeSummary: null, days }] };
      d.programs.push(p); persist();
      emit('program.assigned', { programId: p.id, name }, trainerId, memberId);
      return p;
    },
    /* pushes a NEW version — old versions stay intact, forming a real changelog */
    update(programId, { days, reason, changeSummary, changedBy }) {
      if (requireReason(reason)) return { error: 'reason_required' };
      const p = ProgramService.byId(programId); if (!p) return { error: 'unknown_program' };
      const version = p.currentVersion + 1;
      p.versions.push({ version, at: iso(now()), changedBy, reason, changeSummary: changeSummary || null, days });
      p.currentVersion = version; persist();
      emit('program.updated', { programId, version, reason }, changedBy, p.memberId);
      return p;
    },
    versionHistory: (programId) => { const p = ProgramService.byId(programId); return p ? p.versions.slice().reverse() : []; },
  };

  /* ---------- Train: workout logging — the core daily-use loop ---------- */
  const WorkoutService = {
    todaysAssigned: (memberId) => load().workoutSessions.find((w) => w.memberId === memberId && w.assignedFor === iso(now()).slice(0, 10) && w.status !== 'completed') || null,
    byId: (id) => load().workoutSessions.find((w) => w.id === id) || null,
    history: (memberId) => load().workoutSessions.filter((w) => w.memberId === memberId && w.status === 'completed').sort((a, b) => (b.endedAt || '').localeCompare(a.endedAt || '')),
    upcoming: (memberId) => load().workoutSessions.filter((w) => w.memberId === memberId && w.status === 'assigned' && w.assignedFor >= iso(now()).slice(0, 10)),
    streak(memberId) {
      const done = WorkoutService.history(memberId).map((w) => w.endedAt.slice(0, 10));
      let streak = 0; let cursor = new Date(now());
      for (;;) {
        const key = cursor.toISOString().slice(0, 10);
        if (done.includes(key)) { streak++; cursor.setDate(cursor.getDate() - 1); continue; }
        cursor.setDate(cursor.getDate() - 1);
        const yKey = cursor.toISOString().slice(0, 10);
        if (streak === 0 && done.includes(yKey)) continue; // allow "today not yet trained" to not break a streak that ended yesterday
        break;
      }
      return streak;
    },
    /* build an ad-hoc session (Quick Workout / repeat-last / from-program-day) */
    startAdHoc({ memberId, branchId, dayExercises, programId, dayName, trainerId, readiness }) {
      const d = load();
      const w = { id: nextId('wko', 'workoutSessions'), memberId, programId: programId || null, dayName: dayName || 'Quick Workout', trainerId: trainerId || null,
        branchId, ptSessionId: null, status: 'in_progress', assignedFor: iso(now()).slice(0, 10), startedAt: iso(now()), endedAt: null,
        readiness: readiness || null, exercises: dayExercises.map((e) => ({ exerciseId: e.exerciseId, targetSets: e.targetSets || 3, targetReps: e.targetReps || 10, sets: [] })),
        totalVolumeKg: 0, prsHit: [], notes: '', trainerFeedback: null };
      d.workoutSessions.unshift(w); persist();
      emit('workout.started', { workoutId: w.id }, memberId, memberId, branchId);
      return w;
    },
    start(sessionId, readiness) {
      const w = WorkoutService.byId(sessionId); if (!w) return { error: 'unknown_workout' };
      w.status = 'in_progress'; w.startedAt = iso(now()); if (readiness) w.readiness = readiness; persist();
      emit('workout.started', { workoutId: sessionId }, w.memberId, w.memberId, w.branchId);
      return w;
    },
    /* logs one set and auto-saves immediately — closing the screen never loses data */
    logSet(sessionId, exerciseIndex, setIndex, patch) {
      const w = WorkoutService.byId(sessionId); if (!w) return { error: 'unknown_workout' };
      const ex = w.exercises[exerciseIndex]; if (!ex) return { error: 'unknown_exercise_row' };
      if (!ex.sets[setIndex]) ex.sets[setIndex] = { type: 'normal', status: 'upcoming' };
      Object.assign(ex.sets[setIndex], patch, { status: 'completed' });
      if (ex.sets[setIndex + 1]) ex.sets[setIndex + 1].status = 'current';
      persist();
      return w;
    },
    addSet(sessionId, exerciseIndex, set) {
      const w = WorkoutService.byId(sessionId); if (!w) return { error: 'unknown_workout' };
      w.exercises[exerciseIndex].sets.push(Object.assign({ type: 'normal', status: 'upcoming' }, set)); persist();
      return w;
    },
    removeSet(sessionId, exerciseIndex, setIndex) {
      const w = WorkoutService.byId(sessionId); if (!w) return { error: 'unknown_workout' };
      w.exercises[exerciseIndex].sets.splice(setIndex, 1); persist();
      return w;
    },
    finish(sessionId, { notes } = {}) {
      const w = WorkoutService.byId(sessionId); if (!w) return { error: 'unknown_workout' };
      w.status = 'completed'; w.endedAt = iso(now()); if (notes) w.notes = notes;
      let totalVolume = 0; const prsHit = [];
      w.exercises.forEach((ex) => {
        ex.sets.filter((s) => s.status === 'completed' && s.actualWeight != null).forEach((s) => {
          totalVolume += (s.actualWeight || 0) * (s.actualReps || 0);
          const pr = PersonalRecordService.checkAndRecord(w.memberId, ex.exerciseId, s.actualWeight, s.actualReps, w.id);
          if (pr.isNewPR) prsHit.push({ exerciseId: ex.exerciseId, kind: pr.kind, valueKg: s.actualWeight });
        });
      });
      w.totalVolumeKg = Math.round(totalVolume); w.prsHit = prsHit; persist();
      emit('workout.completed', { workoutId: sessionId, totalVolumeKg: w.totalVolumeKg, prs: prsHit.length, __bus: { type: 'workout-completed', payload: { memberId: w.memberId, prs: prsHit.length } } }, w.memberId, w.memberId, w.branchId);
      return w;
    },
    trainerFeedback(sessionId, feedback, trainerId) {
      const w = WorkoutService.byId(sessionId); if (!w) return { error: 'unknown_workout' };
      w.trainerFeedback = Object.assign({ visibility: 'shared' }, feedback); persist();
      emit('workout.feedback_added', { workoutId: sessionId }, trainerId, w.memberId, w.branchId);
      return w;
    },
  };

  const PersonalRecordService = {
    forMember: (memberId) => load().personalRecords.filter((p) => p.memberId === memberId),
    forExercise: (memberId, exerciseId) => load().personalRecords.filter((p) => p.memberId === memberId && p.exerciseId === exerciseId),
    checkAndRecord(memberId, exerciseId, weightKg, reps, sessionId) {
      const d = load();
      const existing = d.personalRecords.find((p) => p.memberId === memberId && p.exerciseId === exerciseId && p.kind === 'max_weight');
      if (!existing || weightKg > existing.valueKg) {
        if (existing) { existing.valueKg = weightKg; existing.reps = reps; existing.achievedAt = iso(now()).slice(0, 10); existing.sessionId = sessionId; }
        else d.personalRecords.push({ id: nextId('pr', 'personalRecords'), memberId, exerciseId, kind: 'max_weight', valueKg: weightKg, reps, achievedAt: iso(now()).slice(0, 10), sessionId, source: null });
        persist();
        emit('workout.pr', { exerciseId, weightKg, reps, __bus: { type: 'pr', payload: { memberId, exerciseId, weightKg } } }, memberId, memberId);
        return { isNewPR: true, kind: 'max_weight' };
      }
      return { isNewPR: false };
    },
  };

  const BodyLogService = {
    forMember: (memberId) => load().bodyLogs.filter((b) => b.memberId === memberId).sort((a, b) => b.at.localeCompare(a.at)),
    record({ memberId, weightKg, measurements, photoNote, recordedBy, recordedByRole }) {
      const d = load();
      const b = { id: nextId('bl', 'bodyLogs'), memberId, at: iso(now()).slice(0, 10), recordedBy, recordedByRole: recordedByRole || 'member', weightKg: weightKg || null, measurements: measurements || {}, photoNote: photoNote || null, source: recordedByRole || 'member' };
      d.bodyLogs.unshift(b); persist();
      emit('body.logged', { memberId }, recordedBy, memberId);
      return b;
    },
  };

  const GoalService = {
    forMember: (memberId) => load().goals.filter((g) => g.memberId === memberId),
    create({ memberId, kind, label, exerciseId, startValue, targetValue, unit, targetDate, trainerApproved }) {
      const d = load();
      const g = { id: nextId('gl', 'goals'), memberId, kind, label, exerciseId: exerciseId || null, startValue, targetValue, unit, targetDate, trainerApproved: !!trainerApproved, createdAt: iso(now()).slice(0, 10), status: 'active', milestones: [] };
      d.goals.push(g); persist();
      emit('goal.created', { goalId: g.id, label }, memberId, memberId);
      return g;
    },
    progress(goal) {
      if (!goal) return 0;
      const span = goal.targetValue - goal.startValue;
      if (span === 0) return 100;
      let current = goal.startValue;
      if (goal.kind === 'lift' && goal.exerciseId) {
        const last = ExerciseService.lastPerformance(goal.memberId, goal.exerciseId);
        if (last && last.sets.length) current = Math.max(...last.sets.map((s) => s.actualWeight || 0));
      }
      return Math.max(0, Math.min(100, Math.round(((current - goal.startValue) / span) * 100)));
    },
    addMilestone(goalId, note) {
      const g = load().goals.find((x) => x.id === goalId); if (!g) return { error: 'unknown_goal' };
      g.milestones.push({ at: iso(now()).slice(0, 10), note }); persist();
      return g;
    },
    complete(goalId) {
      const g = load().goals.find((x) => x.id === goalId); if (!g) return { error: 'unknown_goal' };
      g.status = 'done'; persist();
      emit('goal.completed', { goalId }, g.memberId, g.memberId);
      return g;
    },
  };

  /* ---------- scenarios: deterministic demo states ---------- */
  const SCENARIOS = {
    'normal-day': () => {
      ['mbr_0002', 'mbr_0005', 'mbr_0006'].forEach((id) => AccessService.checkIn(id, 'stf_rc_lara'));
      AccessService.checkIn('mbr_0007', 'stf_rc_marc');
    },
    'morning-rush': () => { ['mbr_0001', 'mbr_0002', 'mbr_0005', 'mbr_0006', 'mbr_0007', 'mbr_0008', 'mbr_0010', 'mbr_0011'].forEach((id) => AccessService.checkIn(id, 'stf_rc_lara')); },
    'full-capacity': () => {
      const d = load();
      d.locations.find((l) => l.id === 'loc_hamra').capacity = 4; persist();
      ['mbr_0002', 'mbr_0006', 'mbr_0008', 'mbr_0001'].forEach((id) => AccessService.checkIn(id, 'stf_rc_lara', 'loc_hamra'));
    },
    'medical-emergency': () => { AccessService.checkIn('mbr_0001', 'stf_rc_lara'); IncidentService.raiseSOS({ memberId: 'mbr_0001', type: 'Injury — needs first aid', zone: 'Free-weight area', branchId: 'loc_hamra' }); },
    'equipment-breakdown': () => { MaintenanceService.createWorkOrder({ assetId: 'ast_0004', problem: 'Belt slipping under load', severity: 'safety', reporterId: 'mbr_0001' }); },
    'payment-failure': () => { MemberService.setStatus('mbr_0003', 'expired', 'stf_rc_joelle', 'card declined'); AccessService.checkIn('mbr_0003', 'stf_rc_joelle'); },
    'class-cancellation': () => { BookingService.cancelClass('cls_trx_gem', 'stf_in_tony', 'Instructor unavailable'); },
    'end-of-day': () => {
      ['mbr_0002', 'mbr_0005'].forEach((id) => { AccessService.checkIn(id, 'stf_rc_lara'); AccessService.checkOut(id); });
      PaymentService.take({ memberId: 'mbr_0002', amount: 95, method: 'cash', what: 'Monthly renewal', staffId: 'stf_rc_lara', branchId: 'loc_hamra' });
      PaymentService.take({ memberId: 'mbr_0001', amount: 300, method: 'card', what: 'PT package · 10 sessions', staffId: 'stf_rc_lara', branchId: 'loc_hamra' });
    },
    /* busy network across all four branches — SIMULATED figures for the owner
       dashboard; every page shows real engine state derived from these */
    'busy-network': () => {
      ['mbr_0001', 'mbr_0002', 'mbr_0006', 'mbr_0008'].forEach((id) => AccessService.checkIn(id, 'stf_rc_lara', 'loc_hamra'));
      ['mbr_0005', 'mbr_0010'].forEach((id) => AccessService.checkIn(id, 'stf_rc_joelle', 'loc_badaro'));
      ['mbr_0007', 'mbr_0011'].forEach((id) => AccessService.checkIn(id, 'stf_rc_marc', 'loc_gemmayzeh'));
      AccessService.checkIn('mbr_0009', 'stf_rc_dana', 'loc_hazmieh');
      PaymentService.take({ memberId: 'mbr_0002', amount: 95, method: 'cash', what: 'Monthly renewal', staffId: 'stf_rc_lara', branchId: 'loc_hamra' });
      PaymentService.take({ memberId: 'mbr_0006', amount: 120, method: 'card', what: 'Monthly all-branch renewal', staffId: 'stf_rc_lara', branchId: 'loc_hamra' });
      PaymentService.take({ memberId: 'mbr_0005', amount: 140, method: 'card', what: 'PT package · 4 sessions', staffId: 'stf_rc_joelle', branchId: 'loc_badaro' });
      PaymentService.take({ memberId: 'mbr_0007', amount: 55, method: 'card', what: 'Whey Isolate 2 kg', staffId: 'stf_fb_sara', branchId: 'loc_gemmayzeh' });
      RetailService.sell({ itemId: 'rtl_shake_choc', branchId: 'loc_hamra', memberId: 'mbr_0001', staffId: 'stf_fb_sara' });
      RetailService.sell({ itemId: 'rtl_bar', branchId: 'loc_badaro', memberId: 'mbr_0005', staffId: 'stf_fb_nour' });
      ShiftService.open('loc_badaro', 'stf_rc_joelle', 100);
      ShiftService.open('loc_gemmayzeh', 'stf_rc_marc', 100);
    },
    /* THE sales-demo story — the connected A-to-Z chain from the proposal:
       Instagram lead → Hamra → tour → all-branch membership → QR → enters
       Hamra → books trainer at Badaro → reserves TRX in Gemmayzeh →
       instructor finds 2 dead TRX stations → work orders + capacity 14→12 →
       waitlist recalc → member buys protein → shift close → owner sees it all. */
    'sales-demo-story': () => {
      const lead = LeadService.create({ name: 'Karim Aswad', phone: '+961 3 111 000', source: 'Instagram', interest: 'All-branch membership', branchId: 'loc_hamra', staffId: 'stf_rc_lara' });
      LeadService.advance(lead.id, 'contacted', 'stf_rc_lara', 'Answered IG DM via WhatsApp.');
      LeadService.advance(lead.id, 'tour_booked', 'stf_rc_lara', 'Tour today 5 pm, Hamra.');
      const conv = LeadService.convert(lead.id, 'pln_6mo_all', 'stf_rc_lara', 'card');
      const newMemberId = conv.member.id;
      AccessService.checkIn(newMemberId, 'stf_rc_lara', 'loc_hamra');
      TrainerService.book({ memberId: 'mbr_0001', trainerId: 'stf_tr_karim', branchId: 'loc_badaro', startsAt: at(20, 30), actorId: 'mbr_0001' });
      BookingService.bookClass('mbr_0007', 'cls_trx_gem');
      InstructorService.safetyCheck('cls_trx_gem', 'stf_in_tony', { roomOk: true, equipmentOk: false, issues: ['TRX Station #1 anchor loose', 'TRX Station #2 strap torn'] });
      InstructorService.reportEquipment('cls_trx_gem', 'stf_in_tony', ['ast_0201', 'ast_0202'], 'Unusable — anchor loose / strap torn', 2);
      RetailService.sell({ itemId: 'rtl_shake_choc', branchId: 'loc_hamra', memberId: newMemberId, staffId: 'stf_fb_sara' });
      const sh = ShiftService.current('loc_hamra');
      if (sh) ShiftService.close(sh.id, 'stf_rc_lara', 100 + PaymentService.todayTotal('loc_hamra'));
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
    /* time  */ now, at, fmtTime, isToday, setClockOffset: (ms) => localStorage.setItem(CLOCK_KEY, String(ms)), clockOffset: offset, travelMinutes,
    /* log   */ emit, events: () => load().events.slice(),
    /* svc   */ BranchService, PlanService, MemberService, AccessService, ZoneService, HealthService,
    TrainerService, PackageService, BookingService, InstructorService, MaintenanceService,
    IncidentService, PaymentService, RetailService, LeadService, ApprovalService, ShiftService,
    GuestService, NutritionService, OwnerService, NotificationService,
    /* train */ ExerciseService, ProgramService, WorkoutService, PersonalRecordService, BodyLogService, GoalService,
    /* demo  */ scenarios: () => Object.keys(SCENARIOS), runScenario: (n) => reset(n),
  };
})();
if (typeof window !== 'undefined') window.DemoData = DemoData;
