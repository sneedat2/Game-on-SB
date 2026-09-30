// Admin sign-in: one shared password (Railway variable ADMIN_PASSWORD, 8+ characters).
// Signing in returns a short-lived signed token; the password itself is never stored in the browser.
import { Buffer } from 'node:buffer';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 12 * 3600_000;
const password = () => process.env.ADMIN_PASSWORD ?? '';

export const adminEnabled = () => password().length >= 8;

const digest = (s) => createHash('sha256').update(s).digest();
// Key derives from the password, so changing ADMIN_PASSWORD signs everyone out.
const key = () => digest(`game-on-admin:${password()}`);
const sign = (payload) => createHmac('sha256', key()).update(payload).digest('base64url');

export function checkPassword(input) {
  if (!adminEnabled() || typeof input !== 'string') return false;
  return timingSafeEqual(digest(input), digest(password()));
}

export function issueToken() {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token) {
  if (!adminEnabled() || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ---------------- Tester lock ----------------
// While testing, SITE_USERS locks the whole site behind the browser's sign-in prompt.
// Format: "name:password,name2:password2" - one login per tester, so access can be removed per
// person. Delete the variable to open the site to everyone.

function siteUsers() {
  const users = new Map();
  for (const pair of (process.env.SITE_USERS ?? '').split(',')) {
    const i = pair.indexOf(':');
    if (i > 0 && pair.slice(i + 1).trim()) users.set(pair.slice(0, i).trim().toLowerCase(), pair.slice(i + 1).trim());
  }
  return users;
}

export const siteLocked = () => siteUsers().size > 0;

/** Checks an "Authorization: Basic ..." header against SITE_USERS. */
export function checkSiteLogin(header) {
  const m = /^Basic\s+(.+)$/i.exec(header ?? '');
  if (!m) return false;
  const decoded = Buffer.from(m[1], 'base64').toString('utf8');
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  const expected = siteUsers().get(decoded.slice(0, i).trim().toLowerCase());
  return expected !== undefined && timingSafeEqual(digest(decoded.slice(i + 1)), digest(expected));
}

// Basic brute-force protection: 10 failed attempts per IP per 15 minutes.
const attempts = new Map();
const WINDOW_MS = 15 * 60_000;

export function loginAllowed(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) return true;
  return entry.count < 10;
}

export function recordFailure(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) attempts.set(ip, { first: now, count: 1 });
  else entry.count++;
}
