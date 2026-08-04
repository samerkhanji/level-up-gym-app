/*
 * Level Up Black/Lime color audit.
 *
 * Renders every page of the demo against a local server, walks every VISIBLE
 * element, and reads its computed background-color, color, border colors, and
 * (for SVG) fill/stroke. Fails (exit 1) if any banned legacy color is actually
 * rendered — this catches stale page-local palettes, hardcoded hex leftovers,
 * and components a token remap missed, which "the CSS variables exist" cannot.
 *
 * Usage:  node color-audit.js            (expects http://127.0.0.1:5500 serving web-demo/)
 *         BASE=http://host:port node color-audit.js
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:5500';
const EXEC = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/* Banned rendered colors, as [r,g,b] with a small tolerance.
   Old warm-beige theme family + old greens/ink/red/amber + unauthorized hue families. */
const BANNED = [
  { name: 'old paper beige #f2ece0', rgb: [242, 236, 224] },
  { name: 'old paper grey-green #f3f4ef', rgb: [243, 244, 239] },
  { name: 'old mint beige #efe6d2', rgb: [239, 230, 210] },
  { name: 'old line beige #e6ddc9', rgb: [230, 221, 201] },
  { name: 'old seg-track beige #e9e2d2', rgb: [233, 226, 210] },
  { name: 'old amber-soft #fdf3ec', rgb: [253, 243, 236] },
  { name: 'old red-soft #fbeaea', rgb: [251, 234, 234] },
  { name: 'old ink #18140f', rgb: [24, 20, 15] },
  { name: 'old ink green #1b2a22', rgb: [27, 42, 34] },
  { name: 'old racing green #1e6b52', rgb: [30, 107, 82] },
  { name: 'old deep green #124a38', rgb: [18, 74, 56] },
  { name: 'old bright green #2c8465', rgb: [44, 132, 101] },
  { name: 'old mint green #dff0e6', rgb: [223, 240, 230] },
  { name: 'old red #bb3a2a', rgb: [187, 58, 42] },
  { name: 'old amber #a86408', rgb: [168, 100, 8] },
  { name: 'purple #7c6ce0', rgb: [124, 108, 224] },
  { name: 'purple #4a3fae', rgb: [74, 63, 174] },
];
const TOL = 2; // per-channel tolerance — tight, because e.g. old paper #f3f4ef sits within 3 of Level White #f5f6f2

const PAGES = [
  'index.html', 'reception.html', 'trainer.html', 'instructor.html', 'owner.html',
  'maintenance.html', 'nutritionist.html', 'cafe.html', 'staff.html', 'demo.html',
  'features.html', 'motion.html',
];

function parseRgb(s) {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/.exec(s || '');
  if (!m) return null;
  const a = m[4] === undefined ? 1 : parseFloat(m[4]);
  if (a < 0.4) return null; // near-transparent colors can't carry the old theme visually
  return [+m[1], +m[2], +m[3]];
}
function bannedName(rgb) {
  if (!rgb) return null;
  for (const b of BANNED) {
    if (Math.abs(rgb[0] - b.rgb[0]) <= TOL && Math.abs(rgb[1] - b.rgb[1]) <= TOL && Math.abs(rgb[2] - b.rgb[2]) <= TOL) return b.name;
  }
  return null;
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const violations = [];

  for (const p of PAGES) {
    await page.goto(`${BASE}/${p}`, { waitUntil: 'load' });
    await page.waitForTimeout(700);

    // member app: drive past login so inner views get audited too
    if (p === 'index.html') {
      const onLogin = await page.evaluate(() => document.getElementById('view-login')?.classList.contains('active'));
      if (onLogin) {
        await page.fill('#loginId', '+961 70 123 456').catch(() => {});
        await page.click('#loginContinueBtn').catch(() => {});
        await page.waitForTimeout(1300);
      }
      for (const v of ['home', 'train', 'book', 'club', 'account']) {
        await page.evaluate((view) => { if (typeof show === 'function') show(view); }, v);
        await page.waitForTimeout(350);
        const found = await collect(page, `index.html#${v}`);
        violations.push(...found);
      }
      continue;
    }

    const found = await collect(page, p);
    violations.push(...found);
  }

  async function collect(pg, label) {
    const raw = await pg.evaluate(() => {
      const out = [];
      const els = document.querySelectorAll('body *');
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
        const path = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
        const entry = { path, bg: cs.backgroundColor, color: cs.color, border: cs.borderTopColor };
        if (el instanceof SVGElement) { entry.fill = cs.fill; entry.stroke = cs.stroke; }
        out.push(entry);
      }
      return out;
    });
    const found = [];
    for (const e of raw) {
      for (const [prop, val] of Object.entries({ bg: e.bg, color: e.color, border: e.border, fill: e.fill, stroke: e.stroke })) {
        if (!val) continue;
        const name = bannedName(parseRgb(val));
        if (name) found.push({ page: label, el: e.path, prop, val, name });
      }
    }
    return found;
  }

  await browser.close();

  if (violations.length) {
    // dedupe by page+element+banned-color for a readable report
    const seen = new Set();
    const uniq = violations.filter((v) => { const k = v.page + '|' + v.el + '|' + v.name + '|' + v.prop; if (seen.has(k)) return false; seen.add(k); return true; });
    console.log(`FAIL — ${uniq.length} banned-color usages rendered:`);
    uniq.slice(0, 80).forEach((v) => console.log(`  [${v.page}] ${v.el} ${v.prop}=${v.val} → ${v.name}`));
    if (uniq.length > 80) console.log(`  …and ${uniq.length - 80} more`);
    process.exit(1);
  }
  console.log(`PASS — no banned legacy colors rendered across ${PAGES.length} pages (member app audited per-tab).`);
})();
