import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

import {
  getUserByEmail,
  createUser,
  updateUser,
  countUsers,
  publicUser,
  createEntity,
  getEntity,
  updateEntity,
  filterEntities,
  deleteEntitiesByOwner,
} from './db.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  attachUser,
  requireAuth,
  requireAdmin,
} from './auth.js';
import { aiFunctions, extractFromText } from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
const DIST_DIR = path.join(__dirname, '..', 'dist');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(attachUser);

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${randomUUID()}_${safe}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Wrap async handlers so thrown errors hit the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ───────────────────────── Auth ───────────────────────── */

app.post(
  '/api/auth/register',
  wrap(async (req, res) => {
    const { email, password, full_name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (getUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    // The very first account to register becomes the admin.
    const role = countUsers() === 0 ? 'admin' : 'user';
    const user = createUser({
      email,
      password_hash: hashPassword(password),
      role,
      full_name: full_name || null,
    });
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

app.post(
  '/api/auth/login',
  wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const user = getUserByEmail(email || '');
    if (!user || !verifyPassword(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

app.post('/api/auth/logout', (_req, res) => {
  // Stateless JWT: the client discards the token. Endpoint exists for parity.
  res.json({ success: true });
});

/* ───────────────────────── Entities ───────────────────────── */

app.post(
  '/api/entities/:type/filter',
  requireAuth,
  wrap(async (req, res) => {
    const { query = {}, sort, limit } = req.body || {};
    res.json(filterEntities(req.params.type, query, sort, limit));
  })
);

app.post(
  '/api/entities/:type',
  requireAuth,
  wrap(async (req, res) => {
    res.json(createEntity(req.params.type, req.user.email, req.body || {}));
  })
);

app.get(
  '/api/entities/:type/:id',
  requireAuth,
  wrap(async (req, res) => {
    const rec = getEntity(req.params.type, req.params.id);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json(rec);
  })
);

app.put(
  '/api/entities/:type/:id',
  requireAuth,
  wrap(async (req, res) => {
    const rec = updateEntity(req.params.type, req.params.id, req.body || {});
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json(rec);
  })
);

/* ───────────────────────── Functions ───────────────────────── */

app.post(
  '/api/functions/:name',
  requireAuth,
  wrap(async (req, res) => {
    const { name } = req.params;

    // Admin-only role assignment (ported from the base44 setClientRole function).
    if (name === 'setClientRole') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Missing email' });
      const target = getUserByEmail(email);
      if (!target) return res.status(404).json({ error: 'User not found' });
      updateUser(target.id, { role: 'client' });
      return res.json({ success: true, message: 'Client role assigned' });
    }

    const handler = aiFunctions[name];
    if (!handler) {
      return res.status(404).json({ error: `Unknown function: ${name}` });
    }
    const result = await handler(req.body || {});
    res.json(result);
  })
);

/* ───────────────────────── Demo ───────────────────────── */

// Wipe the calling user's own data so the demo restarts at Phase 1 onboarding.
// Deletes only entities owned by this user (twins, org, chats, results, threads).
app.post(
  '/api/demo/reset',
  requireAuth,
  wrap(async (req, res) => {
    const deleted = deleteEntitiesByOwner(req.user.email);
    res.json({ success: true, deleted });
  })
);

/* ───────────────────────── Users ───────────────────────── */

app.post(
  '/api/users/invite',
  requireAdmin,
  wrap(async (req, res) => {
    const { email, role = 'user' } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    if (getUserByEmail(email)) {
      return res.status(409).json({ error: 'This email already exists' });
    }
    // Create the account with a temporary password the admin can share.
    // The invited user can later change it (or you can wire up a reset flow).
    const tempPassword = randomUUID().slice(0, 12);
    const user = createUser({
      email,
      password_hash: hashPassword(tempPassword),
      role,
    });
    res.json({ success: true, user: publicUser(user), tempPassword });
  })
);

/* ───────────────────────── Integrations ───────────────────────── */

app.post(
  '/api/integrations/upload',
  requireAuth,
  upload.single('file'),
  wrap(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ file_url: `/uploads/${req.file.filename}`, file_name: req.file.originalname });
  })
);

// Read the text out of an uploaded document (pdf / docx / plain text), then ask
// the model to fill the requested JSON schema. Mirrors base44's extractor.
async function readDocumentText(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  try {
    if (ext === '.pdf') {
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const buf = fs.readFileSync(absPath);
      return (await pdfParse(buf)).text;
    }
    if (ext === '.docx') {
      const { default: mammoth } = await import('mammoth');
      return (await mammoth.extractRawText({ path: absPath })).value;
    }
    if (['.txt', '.csv', '.md', '.html', '.htm', '.json'].includes(ext)) {
      return fs.readFileSync(absPath, 'utf8');
    }
  } catch (e) {
    console.error('[extract] failed to read document text:', e.message);
  }
  return '';
}

app.post(
  '/api/integrations/extract',
  requireAuth,
  wrap(async (req, res) => {
    const { file_url, json_schema } = req.body || {};
    if (!file_url) return res.status(400).json({ error: 'Missing file_url' });

    // Resolve the stored file safely inside the upload directory.
    const filename = path.basename(file_url);
    const absPath = path.join(UPLOAD_DIR, filename);
    if (!absPath.startsWith(path.resolve(UPLOAD_DIR)) || !fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const text = await readDocumentText(absPath);
    if (!text) {
      return res.json({ output: { content: '', summary: '' } });
    }
    const output = await extractFromText(text, json_schema || {});
    res.json({ output });
  })
);

// Serve uploaded files (auth-gated would be stricter, but matches base44's public URLs).
app.use('/uploads', express.static(UPLOAD_DIR));

/* ───────────────────────── Static frontend ───────────────────────── */

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA fallback: anything not matched above returns index.html.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

/* ───────────────────────── Error handler ───────────────────────── */

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Meridian TCE server listening on http://localhost:${PORT}`);
});
