import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserById, publicUser } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const TOKEN_TTL = process.env.JWT_TTL || '30d';

if (JWT_SECRET === 'change-me-in-production') {
  console.warn('[auth] WARNING: JWT_SECRET is not set. Set a strong secret in your .env before going to production.');
}

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

// Resolve the user from a Bearer token, or null.
function userFromRequest(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    return getUserById(payload.sub) || null;
  } catch {
    return null;
  }
}

// Attaches req.user (full row) when a valid token is present; never blocks.
export function attachUser(req, _res, next) {
  req.user = userFromRequest(req);
  next();
}

// Hard gate: 401 if not authenticated.
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Hard gate: 403 unless the user has the admin role.
export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

export { publicUser };
