// Production web server (Railway): serves the exported web app from dist/, the admin editor, and a small API.
//   GET /api/menu         live Toast menu (cached 5 min; keeps serving the last good copy if Toast is down)
//   GET /api/menu/groups  setup helper: Toast group names and where each lands in the app
//   /api/content, /api/polls, /api/promos, /api/checkin, /api/admin/*  admin-editable content (see api.mjs)
//   GET /admin            the admin editor (ADMIN_PASSWORD)
//   GET /api/health       health check for Railway
// While SITE_USERS is set, everything except /api/health requires a tester login (see auth.mjs).
// While /admin → App Status is "Closed", guests get a "be right back" page (see maintenance.mjs).
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from 'serve-handler';
import { handleContentApi, hasAdminCookie } from './api.mjs';
import { bypassesMaintenance, maintenanceOn, sendMaintenance } from './maintenance.mjs';
import { checkSiteLogin, loginAllowed, recordFailure, siteLocked } from './auth.mjs';
import { applyOverrides } from './menuOverrides.mjs';
import { getContent, loadStore } from './store.mjs';
import { fetchToastGroups, getCachedMenu, ToastConfigError } from './toastMenu.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const PORT = Number(process.env.PORT) || 3000;

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*', // the phone app calls this from outside the website
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

const clientIp = (req) => String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();

/** Tester lock: returns true if the request may continue. */
function passesSiteLock(req, res, path) {
  if (!siteLocked() || path === '/api/health') return true;
  if (req.method === 'OPTIONS') return true; // CORS preflight carries no credentials
  const ip = clientIp(req);
  if (checkSiteLogin(req.headers.authorization)) return true;
  if (req.headers.authorization) recordFailure(ip);
  const status = loginAllowed(ip) ? 401 : 429;
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Robots-Tag': 'noindex',
    ...(status === 401 ? { 'WWW-Authenticate': 'Basic realm="Game On - testers only", charset="UTF-8"' } : {}),
  });
  res.end(status === 401 ? 'Game On is in private testing. Ask the bar for a tester login.' : 'Too many attempts. Try again in 15 minutes.');
  return false;
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (!passesSiteLock(req, res, path)) return;
  if (siteLocked()) res.setHeader('X-Robots-Tag', 'noindex');
  if (maintenanceOn() && !bypassesMaintenance(path)) {
    // A signed-in admin still gets the app, flagged so it can show "closed to guests".
    if (hasAdminCookie(req)) res.setHeader('X-Maintenance-Preview', '1');
    else return sendMaintenance(res, path);
  }

  if (path === '/api/health') return sendJson(res, 200, { ok: true });

  if (path === '/api/menu') {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {}, { 'Access-Control-Allow-Headers': 'content-type' });
    try {
      const menu = await getCachedMenu();
      // Admin edits (/admin → Menu) are applied on every request, so they show up right away.
      const items = applyOverrides(menu.items, getContent().menuOverrides);
      return sendJson(res, 200, { ...menu, items }, { 'Cache-Control': 'no-cache' });
    } catch (e) {
      const status = e instanceof ToastConfigError ? 503 : 502;
      console.error('[menu]', e.message);
      // Detail stays in the server log; the app falls back to its built-in menu either way.
      return sendJson(res, status, { error: status === 503 ? 'Live menu not configured' : 'Live menu unavailable' });
    }
  }

  // Setup helper: shows your Toast menu group names and how each maps into the app, so unmatched
  // groups (e.g. a differently named draft list) can be added to SECTION_FOR in toastMenu.mjs.
  if (path === '/api/menu/groups') {
    try {
      return sendJson(res, 200, await fetchToastGroups());
    } catch (e) {
      console.error('[menu/groups]', e.message);
      return sendJson(res, e instanceof ToastConfigError ? 503 : 502, { error: 'Toast menu unavailable' });
    }
  }

  if (await handleContentApi(req, res, path)) return;

  if (path.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' });

  if (path === '/admin' || path === '/admin/') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'X-Robots-Tag': 'noindex',
      'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
    });
    return res.end(await readFile(join(here, 'admin', 'index.html')));
  }

  // Everything else: the exported web app. Unknown paths fall back to index.html (client-side routes).
  // Pages must be re-checked on every visit (so "Closed" takes effect immediately); only the
  // content-hashed bundles under _expo/static are cached long-term.
  if (!path.startsWith('/_expo/static/')) res.setHeader('Cache-Control', 'no-cache');
  return handler(req, res, {
    public: join(root, 'dist'),
    rewrites: [{ source: '**', destination: '/index.html' }],
    headers: [{ source: '_expo/static/**', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }],
  });
});

await loadStore();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Game On web server listening on :${PORT}${siteLocked() ? ' (tester lock ON)' : ''}`);
});
