import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'meridian.db');

// Ensure the directory for the database file exists.
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role          TEXT NOT NULL DEFAULT 'user',
    full_name     TEXT,
    created_date  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entities (
    id            TEXT PRIMARY KEY,
    type          TEXT NOT NULL,
    created_by    TEXT,
    created_date  TEXT NOT NULL,
    updated_date  TEXT NOT NULL,
    data          TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
  CREATE INDEX IF NOT EXISTS idx_entities_owner ON entities(created_by);
`);

const nowIso = () => new Date().toISOString();

/* ───────────────────────── Users ───────────────────────── */

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function countUsers() {
  return db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
}

export function createUser({ email, password_hash = null, role = 'user', full_name = null }) {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, role, full_name, created_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, email, password_hash, role, full_name, nowIso());
  return getUserById(id);
}

export function updateUser(id, fields) {
  const allowed = ['password_hash', 'role', 'full_name'];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }
  if (sets.length === 0) return getUserById(id);
  values.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getUserById(id);
}

// Strip the password hash before returning a user to a client.
export function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

/* ──────────────────────── Entities ──────────────────────── */

// Flatten a stored row into the shape base44 returned: top-level id/created_by/
// timestamps merged with the JSON data blob.
function rowToRecord(row) {
  if (!row) return null;
  const data = JSON.parse(row.data);
  return {
    ...data,
    id: row.id,
    created_by: row.created_by,
    created_date: row.created_date,
    updated_date: row.updated_date,
  };
}

export function createEntity(type, createdBy, data = {}) {
  const id = randomUUID();
  const ts = nowIso();
  // Never let caller-controlled keys overwrite the managed columns.
  const { id: _i, created_by: _c, created_date: _cd, updated_date: _ud, ...clean } = data;
  db.prepare(
    'INSERT INTO entities (id, type, created_by, created_date, updated_date, data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, type, createdBy, ts, ts, JSON.stringify(clean));
  return rowToRecord(db.prepare('SELECT * FROM entities WHERE id = ?').get(id));
}

export function getEntity(type, id) {
  return rowToRecord(db.prepare('SELECT * FROM entities WHERE id = ? AND type = ?').get(id, type));
}

// Delete every entity owned by a given user. Used by the demo reset so each
// session can start the onboarding flow from scratch. Scoped to the caller's
// own records only.
export function deleteEntitiesByOwner(createdBy) {
  const info = db.prepare('DELETE FROM entities WHERE created_by = ?').run(createdBy);
  return info.changes;
}

export function updateEntity(type, id, patch = {}) {
  const row = db.prepare('SELECT * FROM entities WHERE id = ? AND type = ?').get(id, type);
  if (!row) return null;
  const data = JSON.parse(row.data);
  const { id: _i, created_by: _c, created_date: _cd, updated_date: _ud, ...clean } = patch;
  const merged = { ...data, ...clean };
  db.prepare('UPDATE entities SET data = ?, updated_date = ? WHERE id = ?').run(
    JSON.stringify(merged),
    nowIso(),
    id
  );
  return rowToRecord(db.prepare('SELECT * FROM entities WHERE id = ?').get(id));
}

// Mirror base44's entities.filter(query, sort, limit).
//   query: object of field -> exact-match value (matched against the flattened record)
//   sort:  field name, optionally prefixed with '-' for descending
//   limit: max number of records
export function filterEntities(type, query = {}, sort, limit) {
  const rows = db.prepare('SELECT * FROM entities WHERE type = ?').all(type);
  let records = rows.map(rowToRecord);

  if (query && typeof query === 'object') {
    const keys = Object.keys(query);
    records = records.filter((rec) => keys.every((k) => rec[k] === query[k]));
  }

  if (sort && typeof sort === 'string') {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    records.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      return (av < bv ? -1 : 1) * (desc ? -1 : 1);
    });
  } else {
    // Stable default: oldest first, matching base44's creation order.
    records.sort((a, b) => (a.created_date < b.created_date ? -1 : 1));
  }

  if (typeof limit === 'number' && limit >= 0) {
    records = records.slice(0, limit);
  }
  return records;
}
