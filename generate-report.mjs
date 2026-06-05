import { jsPDF } from 'jspdf';
import fs from 'node:fs';

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const PAGE_W = doc.internal.pageSize.getWidth();
const PAGE_H = doc.internal.pageSize.getHeight();
const M = 50;                 // margin
const CW = PAGE_W - M * 2;    // content width
let y = M;

const COLORS = {
  ink: [25, 28, 36],
  sub: [90, 96, 110],
  rule: [210, 214, 222],
  crit: [176, 0, 32],
  high: [200, 80, 0],
  med: [150, 120, 0],
  low: [70, 100, 70],
  accent: [40, 60, 120],
};

function ensure(space) {
  if (y + space > PAGE_H - M) {
    doc.addPage();
    y = M;
  }
}

function text(str, { size = 10.5, style = 'normal', color = COLORS.ink, gap = 4, indent = 0 } = {}) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(str, CW - indent);
  for (const line of lines) {
    ensure(size + gap);
    doc.text(line, M + indent, y);
    y += size + gap;
  }
}

function rule() {
  ensure(12);
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.6);
  doc.line(M, y, PAGE_W - M, y);
  y += 12;
}

function h1(str) {
  ensure(34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...COLORS.ink);
  doc.text(str, M, y);
  y += 8;
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(1.4);
  doc.line(M, y, PAGE_W - M, y);
  y += 16;
}

function h2(str) {
  ensure(26);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...COLORS.accent);
  const lines = doc.splitTextToSize(str, CW);
  for (const line of lines) {
    ensure(16);
    doc.text(line, M, y);
    y += 16;
  }
  y += 2;
}

const SEV = {
  CRITICAL: COLORS.crit,
  HIGH: COLORS.high,
  MEDIUM: COLORS.med,
  LOW: COLORS.low,
  INFO: COLORS.sub,
};

function finding(id, title, severity) {
  ensure(40);
  y += 6;
  // severity chip
  const label = severity;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const tw = doc.getTextWidth(label) + 12;
  doc.setFillColor(...SEV[severity]);
  doc.roundedRect(M, y - 9, tw, 13, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(label, M + 6, y);
  // title
  doc.setFontSize(11.5);
  doc.setTextColor(...COLORS.ink);
  const titleX = M + tw + 8;
  const titleLines = doc.splitTextToSize(`${id}. ${title}`, CW - tw - 8);
  doc.text(titleLines[0], titleX, y);
  y += 14;
  if (titleLines.length > 1) {
    for (let i = 1; i < titleLines.length; i++) {
      ensure(14);
      doc.text(titleLines[i], M, y);
      y += 14;
    }
  }
  y += 2;
}

function field(label, body) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.sub);
  ensure(13);
  doc.text(label, M, y);
  const lw = doc.getTextWidth(label) + 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  const lines = doc.splitTextToSize(body, CW - lw);
  doc.text(lines[0], M + lw, y);
  y += 13;
  for (let i = 1; i < lines.length; i++) {
    ensure(13);
    doc.text(lines[i], M, y);
    y += 13;
  }
  y += 3;
}

function bullet(str) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  const lines = doc.splitTextToSize(str, CW - 14);
  ensure(13);
  doc.text('•', M + 2, y);
  doc.text(lines[0], M + 14, y);
  y += 13;
  for (let i = 1; i < lines.length; i++) {
    ensure(13);
    doc.text(lines[i], M + 14, y);
    y += 13;
  }
}

/* ───────────────────────── COVER ───────────────────────── */
doc.setFillColor(...COLORS.accent);
doc.rect(0, 0, PAGE_W, 150, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(24);
doc.setTextColor(255, 255, 255);
doc.text('Meridian TCE', M, 70);
doc.setFontSize(14);
doc.setFont('helvetica', 'normal');
doc.text('Pre-Deployment Review: Frontend & Backend Shortcomings', M, 96);
doc.setFontSize(10);
doc.text('Prepared for VPS self-hosting', M, 120);
y = 185;
doc.setTextColor(...COLORS.sub);
doc.setFontSize(10);
doc.text(`Date: 2 June 2026`, M, y); y += 15;
doc.text('Scope: Express + SQLite backend (server/) and Vite/React frontend (src/)', M, y); y += 25;

doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...COLORS.ink);
doc.text('Severity summary', M, y); y += 18;

const counts = [
  ['CRITICAL', 3, 'Fix before exposing the server to the internet'],
  ['HIGH', 6, 'Fix before real users / real data'],
  ['MEDIUM', 7, 'Should fix soon after launch'],
  ['LOW', 5, 'Quality / hardening / cleanup'],
];
for (const [sev, n, note] of counts) {
  ensure(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const tw = doc.getTextWidth(sev) + 12;
  doc.setFillColor(...SEV[sev]);
  doc.roundedRect(M, y - 9, tw, 13, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(sev, M + 6, y);
  doc.setTextColor(...COLORS.ink);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${n}  —  ${note}`, M + tw + 8, y);
  y += 18;
}
y += 6;
text(
  'This report lists concrete, fixable shortcomings found by reading the source. Items are ordered by severity. ' +
  'The three CRITICAL items are exploitable as written and should be resolved before the app is reachable from the public internet.',
  { color: COLORS.sub, size: 9.5 }
);

/* ───────────────────────── BACKEND ───────────────────────── */
doc.addPage(); y = M;
h1('1. Backend (server/)');

finding('B1', 'A live Anthropic API key is stored in server/.env', 'CRITICAL');
field('Where:', 'server/.env (ANTHROPIC_API_KEY=sk-ant-api03-...).');
field('Problem:', 'A real, working API key is sitting in a plaintext file in the project. Anyone who gets read access to the repo, a backup, a misconfigured deploy, or the VPS filesystem can bill your Anthropic account without limit. Because this file was shared, the key must be treated as already compromised.');
field('Fix:', 'Rotate (revoke + reissue) this key immediately in the Anthropic console. Never commit a real .env. On the VPS, create .env directly on the box with permissions 600, owned by the service user. Confirm .env is gitignored (it is) before the project ever becomes a git repo.');

finding('B2', 'No per-user authorization on entities (broken access control / IDOR)', 'CRITICAL');
field('Where:', 'server/index.js entity routes; server/db.js filterEntities/getEntity/updateEntity.');
field('Problem:', 'Every entity route only checks requireAuth, never ownership. The created_by filter is applied client-side only. Any logged-in user can: (a) POST /api/entities/ConsultationResult/filter with an empty query and read ALL clients’ consultation results, org dossiers, and consultant twins; (b) GET /api/entities/<type>/<id> for any id; (c) PUT /api/entities/<type>/<id> to overwrite anyone’s record. This exposes confidential client data across all accounts.');
field('Fix:', 'Enforce ownership on the server. For non-admins, force query.created_by = req.user.email in filter, and verify rec.created_by === req.user.email (or role admin) before returning/updating in get/update. Do not rely on the frontend to scope data.');

finding('B3', 'Default/placeholder JWT secret will be deployed', 'CRITICAL');
field('Where:', 'server/auth.js (JWT_SECRET fallback) and server/.env.example / .env.');
field('Problem:', 'JWT_SECRET falls back to "change-me-in-production", and the shipped .env contains "some-long-random-string-you-make-up" — a guessable placeholder, not a secret. If deployed as-is, anyone can forge a JWT (e.g. role:"admin") and take over the app. Tokens also last 30 days with no revocation.');
field('Fix:', 'Generate a real secret (e.g. `openssl rand -hex 32`) and set it in the VPS .env. Make the server refuse to start if JWT_SECRET is unset or equals the placeholder, rather than only warning. Consider a shorter TTL plus refresh.');

finding('B4', 'CORS is fully open (Access-Control-Allow-Origin: *)', 'HIGH');
field('Where:', 'server/index.js — app.use(cors()).');
field('Problem:', 'cors() with no options allows any website to call your API from a browser. Combined with token-in-localStorage, this widens CSRF/abuse surface and lets any origin hit your AI endpoints (which cost money).');
field('Fix:', 'Restrict to your own origin: cors({ origin: "https://your-domain.com" }). Since the Express server also serves the SPA in production, you can disable CORS entirely for same-origin.');

finding('B5', 'No rate limiting on auth or AI endpoints', 'HIGH');
field('Where:', 'All routes, especially /api/auth/login, /api/auth/register, and /api/functions/* (Anthropic calls).');
field('Problem:', 'Login has no throttling → unlimited password brute-force. Registration is open to anyone → spam accounts. The AI function routes call the paid Anthropic API with up to 8000 max_tokens and no per-user quota → a single authenticated user can run up a large bill or exhaust your key.');
field('Fix:', 'Add express-rate-limit (strict on login/register, modest on AI routes). Add a per-user daily token/usage cap. Consider gating registration after the first admin (see B6).');

finding('B6', 'Open self-registration; weak/insecure password handling', 'HIGH');
field('Where:', 'server/index.js /api/auth/register; verifyPassword in auth.js.');
field('Problem:', 'Anyone who can reach the server can create an account (role "user") and immediately gain access to all entity routes (compounded by B2). There is no email verification, no password strength rule (a 1-char password is accepted), and no lockout. The "first account becomes admin" rule means if you don’t register first on a fresh deploy, an attacker can claim admin.');
field('Fix:', 'Disable open registration or put it behind an invite/allowlist after the first admin exists. Enforce a minimum password policy server-side. Register the admin account immediately on first boot.');

finding('B7', 'No security headers; SPA fallback + static files unhardened', 'HIGH');
field('Where:', 'server/index.js — no helmet; express.static for /uploads and dist.');
field('Problem:', 'No Content-Security-Policy, X-Content-Type-Options, HSTS, X-Frame-Options, etc. Uploaded files are served publicly from /uploads with their original content; a malicious upload (e.g. an HTML/SVG file) served same-origin can enable stored XSS against logged-in users.');
field('Fix:', 'Add helmet(). Serve uploads with Content-Disposition: attachment and a restrictive Content-Type, or behind auth. Restrict accepted upload types to the ones you actually parse (pdf/docx/txt/csv/md/json).');

finding('B8', 'Unbounded full-table scan + JSON.parse on every filter call', 'HIGH');
field('Where:', 'server/db.js filterEntities — SELECT * then map/JSON.parse/filter in JS.');
field('Problem:', 'Filtering loads every row of a type into memory, JSON.parses each, then filters in JavaScript. With growth this is slow and memory-heavy, and there is no default limit — a filter with no limit returns everything. Combined with B2/B5 it is also a cheap denial-of-service vector.');
field('Fix:', 'Push created_by/type filtering into SQL (you already index both columns). Apply a sane default and maximum limit server-side. For frequently queried JSON fields, store them as real columns.');

finding('B9', 'AI JSON parsing is fragile (regex brace match)', 'MEDIUM');
field('Where:', 'server/ai.js onboardingChat and extractFromText — raw.match(/\\{[\\s\\S]*\\}/).');
field('Problem:', 'Model output is parsed by grabbing the first "{" to the last "}". Any prose around or within (nested braces, code fences, multiple objects) breaks parsing, silently falling back to a 50% calibration stub or dumping raw text. Users see degraded results with no error.');
field('Fix:', 'Use the model’s structured/tool-output mode or request strict JSON, validate against the schema (zod), and surface a real error/retry instead of a silent fallback.');

finding('B10', 'response.content[0].text assumed to always exist', 'MEDIUM');
field('Where:', 'server/ai.js — every handler reads response.content[0].text directly.');
field('Problem:', 'If the API returns a non-text first block, an empty content array, a refusal, or a stop_reason of max_tokens, content[0].text can be undefined and throw, returning a 500 with a stack to the client.');
field('Fix:', 'Defensively read the first text block; handle empty/refusal responses; return a friendly error.');

finding('B11', 'Errors returned to client include raw messages; no structured logging', 'MEDIUM');
field('Where:', 'server/index.js error middleware — res.json({ error: err.message }).');
field('Problem:', 'Internal error messages (including potential file paths or DB details) are sent to the client. There is also no real logging/monitoring, so you will not notice abuse or failures on the VPS.');
field('Fix:', 'Return a generic message for 500s, log details server-side only (with a request id), and add a logger (pino/morgan) plus PM2 log rotation.');

finding('B12', 'Uploaded files are never cleaned up; disk can fill', 'MEDIUM');
field('Where:', 'server/index.js upload handler; UPLOAD_DIR.');
field('Problem:', 'Every upload (up to 25 MB) is stored forever. There is no retention/cleanup and no link between a file and the entity that used it, so a VPS with a small disk will eventually fill, taking the app (and SQLite WAL) down.');
field('Fix:', 'Add a retention/cleanup job or delete after extraction; cap total storage; monitor disk usage.');

finding('B13', 'No request validation on entity type / body shape', 'MEDIUM');
field('Where:', 'server/index.js — req.params.type and req.body passed straight through.');
field('Problem:', 'Any string is accepted as an entity "type", so clients can create arbitrary collections. Bodies are stored as-is (only managed columns stripped), so there is no schema enforcement and inconsistent/garbage data can accumulate.');
field('Fix:', 'Allowlist the known entity types and validate payloads with zod per type.');

/* ───────────────────────── FRONTEND ───────────────────────── */
doc.addPage(); y = M;
h1('2. Frontend (src/)');

finding('F1', 'Auth token stored in localStorage (XSS-exploitable)', 'HIGH');
field('Where:', 'src/api/base44Client.js — getToken/setToken use localStorage.');
field('Problem:', 'The 30-day JWT lives in localStorage, readable by any JavaScript on the page. Any XSS (made more likely by B7 unrestricted uploads and the react-quill rich text) leaks a long-lived token that grants full account access. localStorage tokens are not cleared when the browser/tab closes either.');
field('Fix:', 'Prefer an httpOnly, Secure, SameSite cookie set by the server. If you must keep localStorage, shorten TTL and add CSP + strict upload handling to reduce XSS risk.');

finding('F2', 'Not responsive — viewport hard-locked to 1440px', 'HIGH');
field('Where:', 'index.html — <meta name="viewport" content="width=1440">.');
field('Problem:', 'The viewport is pinned to a fixed 1440px width, so on phones and smaller laptops the whole app is zoomed/scaled and effectively unusable. For a public-facing self-hosted product this is a serious usability gap.');
field('Fix:', 'Use the standard <meta name="viewport" content="width=device-width, initial-scale=1"> and make the layout responsive (the heavy inline fixed-pixel styling will need attention).');

finding('F3', 'Dead/duplicate auth code: Supabase + duplicate Login', 'MEDIUM');
field('Where:', 'src/lib/SupabaseAuthContext.jsx and src/components/auth/Login.jsx (alongside the real src/pages/Login.jsx and src/lib/AuthContext.jsx).');
field('Problem:', 'Leftover Supabase auth context and a second Login component remain from a previous stack. Dead auth code is confusing and risky — it is easy to wire up the wrong one, and it bloats the bundle. base44Client.js naming also still pretends to be a third-party SDK.');
field('Fix:', 'Delete the unused SupabaseAuthContext and the duplicate Login. Rename base44Client.js to something honest (e.g. apiClient.js).');

finding('F4', 'Giant 1,350-line page component (MeridianTCE.jsx)', 'MEDIUM');
field('Where:', 'src/pages/MeridianTCE.jsx (1,350 lines).');
field('Problem:', 'A single file holds routing, state, an event-bus class, markdown/table parsing, entity access, and rendering. This is hard to test, hard to change safely, and re-renders broadly. It also mixes data-access logic that should enforce ownership but cannot (see B2).');
field('Fix:', 'Split into hooks (data fetching), small components, and pure helper modules. Move shared parsing utilities out of the page.');

finding('F5', 'No global error boundary or network-error UX', 'MEDIUM');
field('Where:', 'src/App.jsx, src/main.jsx.');
field('Problem:', 'There is no React error boundary, so a render error white-screens the whole app. API failures throw generic Error objects; many call sites surface raw messages or nothing. On a flaky VPS connection the UX degrades poorly.');
field('Fix:', 'Add an error boundary at the app root and consistent toast-based handling for API errors (react-hot-toast/sonner are already installed).');

finding('F6', 'Client/role model is inconsistent (user vs client)', 'MEDIUM');
field('Where:', 'Backend roles "admin"/"user"/"client"; frontend ClientView and ProtectedRoute logic.');
field('Problem:', 'register creates role "user", setClientRole sets "client", requireAdmin checks "admin". The three roles are not consistently defined or enforced, and ProtectedRoute/ClientView gate on role-ish state that the backend does not authoritatively check per resource. This is a correctness and security smell (ties back to B2).');
field('Fix:', 'Define the role set explicitly, document what each can do, and enforce it server-side on every route.');

finding('F7', 'No tests anywhere in the project', 'LOW');
field('Where:', 'Entire repo (no *.test.* outside node_modules).');
field('Problem:', 'There is no automated test for auth, ownership, entity CRUD, or AI parsing. Regressions (especially around the access-control fixes above) will be easy to introduce and hard to catch.');
field('Fix:', 'Add at least a handful of API tests (auth, ownership enforcement, filter scoping) with vitest/supertest.');

finding('F8', 'Heavy dependencies likely unused / large bundle', 'LOW');
field('Where:', 'package.json (three.js, react-leaflet, embla, recharts, framer-motion, moment + date-fns, etc.).');
field('Problem:', 'The frontend pulls in several large libraries (3D, maps, carousels, charts, two date libraries). If unused they bloat the bundle and slow first load on a modest VPS. moment is also legacy/deprecated alongside date-fns.');
field('Fix:', 'Audit with the build output / a bundle analyzer; drop unused deps; standardize on date-fns and remove moment.');

finding('F9', 'Fixed viewport meta also harms accessibility/SEO', 'LOW');
field('Where:', 'index.html.');
field('Problem:', 'Beyond responsiveness (F2), the fixed width prevents user zoom on mobile and hurts Lighthouse/SEO scores — relevant for a public deployment.');
field('Fix:', 'Covered by F2; ensure zoom is not disabled.');

/* ───────────────────────── DEPLOYMENT ───────────────────────── */
doc.addPage(); y = M;
h1('3. Deployment & operations (VPS)');

finding('D1', 'Server binds and is intended to be hit directly on :8787 over HTTP', 'HIGH');
field('Where:', 'README run instructions; app.listen(PORT).');
field('Problem:', 'The README’s first-pass instructions expose http://<vps-ip>:8787 directly — no TLS, tokens and passwords sent in cleartext. The Nginx+certbot step is presented as optional ("recommended").');
field('Fix:', 'Always terminate TLS (Nginx + certbot, as in the README’s later section). Bind Node to 127.0.0.1 and only expose 443 via the reverse proxy. Add a firewall (ufw) blocking 8787 from the outside.');

finding('D2', 'No process limits, no backups automation, SQLite single-file risk', 'MEDIUM');
field('Where:', 'server/data/meridian.db (WAL), server/uploads.');
field('Problem:', 'All data lives in one SQLite file plus an uploads dir. The README mentions backing these up manually but nothing is automated. A VPS disk failure or a bad deploy can lose everything. PM2 is suggested but there is no memory cap or restart policy tuning.');
field('Fix:', 'Automate a nightly backup of the DB (use the SQLite online-backup/.backup, not a raw copy of WAL) and uploads off-box. Set PM2 max-memory-restart and log rotation.');

finding('D3', 'No environment validation on boot', 'LOW');
field('Where:', 'server startup.');
field('Problem:', 'The server starts even with a missing/placeholder JWT_SECRET (warn only) and only fails on the first AI call if ANTHROPIC_API_KEY is missing. Misconfiguration surfaces late, in front of users.');
field('Fix:', 'Validate required env (JWT_SECRET strength, ANTHROPIC_API_KEY presence) at startup and exit non-zero if invalid.');

/* ───────────────────────── PRIORITY ───────────────────────── */
doc.addPage(); y = M;
h1('4. Recommended fix order');
h2('Before the server is reachable from the internet');
bullet('Rotate the leaked Anthropic key and set a real JWT_SECRET (B1, B3).');
bullet('Enforce per-user ownership on every entity route (B2).');
bullet('Put it behind Nginx + HTTPS, bind Node to localhost, firewall 8787 (D1).');
y += 6;
h2('Before real users / real data');
bullet('Lock down CORS, add rate limiting, restrict registration, add helmet & safe upload serving (B4–B7).');
bullet('Move the token to an httpOnly cookie or tightly scope XSS risk (F1).');
bullet('Make the app responsive (F2).');
y += 6;
h2('Soon after launch');
bullet('Harden AI JSON parsing and API response handling; generic error responses + logging (B9–B11).');
bullet('SQL-side filtering with limits; upload retention; entity-type validation (B8, B12, B13).');
bullet('Automated backups, env validation, PM2 limits (D2, D3).');
y += 6;
h2('Quality / cleanup');
bullet('Remove dead Supabase/duplicate-login code; split MeridianTCE.jsx; add tests; trim dependencies (F3–F8).');

y += 20;
rule();
text(
  'Note: this review is based on reading the source, not on a running penetration test. ' +
  'The CRITICAL items (B1-B3) are confirmed by the code and the contents of server/.env and should be treated as urgent.',
  { color: COLORS.sub, size: 9 }
);

// page numbers
const pages = doc.getNumberOfPages();
for (let i = 1; i <= pages; i++) {
  doc.setPage(i);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.sub);
  doc.text(`Meridian TCE — Pre-Deployment Review`, M, PAGE_H - 24);
  doc.text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 24, { align: 'right' });
}

const out = 'Meridian-TCE-Shortcomings-Report.pdf';
fs.writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
console.log('Wrote', out);
