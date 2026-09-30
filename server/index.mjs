// Production web server (Railway): serves the exported web app from dist/ and a small API.
//   GET /api/menu    live Toast menu (cached 5 min; keeps serving the last good copy if Toast is down)
//   GET /api/menu/groups  setup helper: Toast group names and where each lands in the app
//   GET /api/health  health check for Railway
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from 'serve-handler';
import { fetchToastGroups, fetchToastMenu, ToastConfigError } from './toastMenu.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const MENU_TTL_MS = 5 * 60_000;

let menuCache = null; // { at, body }
let inflight = null;

async function getMenu() {
  if (menuCache && Date.now() - menuCache.at < MENU_TTL_MS) return menuCache.body;
  inflight ??= fetchToastMenu()
    .then((body) => {
      menuCache = { at: Date.now(), body };
      return body;
    })
    .finally(() => {
      inflight = null;
    });
  try {
    return await inflight;
  } catch (e) {
    if (menuCache) {
      console.warn('[menu] Toast refresh failed, serving cached menu:', e.message);
      return { ...menuCache.body, stale: true };
    }
    throw e;
  }
}

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*', // the phone app calls this from outside the website
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;

  if (path === '/api/health') return sendJson(res, 200, { ok: true });

  if (path === '/api/menu') {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {}, { 'Access-Control-Allow-Headers': 'content-type' });
    try {
      return sendJson(res, 200, await getMenu(), { 'Cache-Control': 'public, max-age=60' });
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

  if (path.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' });

  // Everything else: the exported web app. Unknown paths fall back to index.html (client-side routes).
  return handler(req, res, {
    public: join(root, 'dist'),
    rewrites: [{ source: '**', destination: '/index.html' }],
    headers: [{ source: '_expo/static/**', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }],
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Game On web server listening on :${PORT}`));
