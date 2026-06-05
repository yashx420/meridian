// Creates the admin account on first deploy so you don't have to register
// through the UI. No-op if the account already exists or no creds are set.
// Reads ADMIN_EMAIL / ADMIN_PASSWORD from server/.env.
import 'dotenv/config';
import { countUsers, getUserByEmail, createUser } from './db.js';
import { hashPassword } from './auth.js';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.log('[seed-admin] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping.');
  process.exit(0);
}

if (getUserByEmail(email)) {
  console.log(`[seed-admin] User ${email} already exists — skipping.`);
  process.exit(0);
}

// First account in an empty DB becomes admin (mirrors the register flow).
const role = countUsers() === 0 ? 'admin' : 'user';
createUser({ email, password_hash: hashPassword(password), role, full_name: 'Administrator' });
console.log(`[seed-admin] Created ${role}: ${email}`);
