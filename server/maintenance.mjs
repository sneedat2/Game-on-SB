// "Closed for maintenance" page, shown to everyone except a signed-in admin while the switch in
// /admin → App Status is on.
import { getContent } from './store.mjs';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const maintenanceOn = () => Boolean(getContent()?.maintenance?.enabled);

// Still reachable while closed: the admin editor and its API, Railway's health check, the favicon.
const ALWAYS_OPEN = [/^\/admin\/?$/, /^\/api\/admin\//, /^\/api\/health$/, /^\/favicon\.ico$/];
export const bypassesMaintenance = (path) => ALWAYS_OPEN.some((re) => re.test(path));

export function sendMaintenance(res, path) {
  const message = getContent()?.maintenance?.message || 'We’re making some upgrades. Be right back!';
  const headers = { 'Cache-Control': 'no-store', 'Retry-After': '600' };
  if (path.startsWith('/api/')) {
    res.writeHead(503, { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ error: 'maintenance', message }));
  }
  res.writeHead(503, { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="60"><!-- re-check every minute; the app returns as soon as it's reopened -->
<title>Game On · Be right back</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A0A0A;color:#F5F5F5;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;box-sizing:border-box}
  .card{max-width:420px;width:100%;text-align:center}
  .logo{background:#FFC72C;color:#1C1C1C;border-radius:24px;padding:22px 16px;font-weight:900;font-size:40px;letter-spacing:2px}
  .logo small{display:block;font-size:13px;font-weight:600;letter-spacing:3px;margin-top:4px}
  h1{font-size:24px;margin:28px 0 8px} p{color:#A3A3A3;margin:0 0 24px}
  a{display:inline-block;background:#FFC72C;color:#0A0A0A;font-weight:800;text-decoration:none;padding:12px 18px;border-radius:12px;margin:4px}
  a.alt{background:#1F1F1F;color:#F5F5F5}
</style></head>
<body><div class="card">
  <div class="logo">GAME ON<small>WESTSIDE. STRONGSIDE.</small></div>
  <h1>Be right back 🍻</h1>
  <p>${escapeHtml(message)}</p>
  <a href="tel:+15133859999">Call the bar</a><a class="alt" href="https://www.facebook.com/gameonwestside">Facebook</a>
</div></body></html>`);
}
