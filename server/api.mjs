// Content API for the app + admin editor.
//
// Public (the app):
//   GET  /api/content                  hours, happy hour tiers, home layout, promo schedule, games, Coming Soon, showcase
//   GET  /api/promos/today             today's promos (surprise details only once they start)
//   GET  /api/polls?device=<id>        open polls with vote counts + this device's votes
//   POST /api/polls/<id>/vote          { deviceId, optionId }
//   GET  /api/checkin?device=<id>      checked in today? + visit count
//   POST /api/checkin                  { deviceId, lat, lng, accuracy } - once per day, at the bar
// Admin (X-Admin-Token: <token from /api/admin/login>):
//   POST /api/admin/login              { password } -> { token }
//   GET  /api/admin/content            everything, including all polls and vote totals
//   POST /api/admin/logout             clears the admin cookie
//   PUT  /api/admin/<section>          replace one section (home, menuOverrides, maintenance, settings, promos, polls, gamedaySettings, gameday, comingSoon, coupons, showcase)
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { adminEnabled, checkPassword, issueToken, loginAllowed, recordFailure, verifyToken } from './auth.mjs';
import { checkinStats, evaluateCheckin, recordCheckin } from './checkins.mjs';
import { validateHome } from './home.mjs';
import { promoSchedule, todaysPromos, validatePhases, validatePromos } from './promos.mjs';
import { BAR_SECTION_IDS, MENU_SECTION_IDS, MENU_SECTIONS, sectionOfKey, withBase } from './menuOverrides.mjs';
import { upcomingAutoGames } from './schedule.mjs';
import { getCachedMenu, ToastConfigError } from './toastMenu.mjs';
import { getContent, storageIsPersistent, update } from './store.mjs';

const BAR_TZ = 'America/New_York';
const newId = () => randomUUID().slice(0, 8);

// ---------------- HTTP helpers ----------------

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body, { cors = false, cache = 'no-store' } = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cache,
    ...(cors ? { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' } : {}),
  });
  res.end(status === 204 ? '' : JSON.stringify(body));
}

async function readJson(req, limit = 256 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Request too large');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

const ADMIN_COOKIE = 'gameon_admin';

function adminCookie(req, value, maxAgeSeconds) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

/** True if the request carries a valid admin sign-in cookie (maintenance-mode bypass). */
export function hasAdminCookie(req) {
  const match = new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`).exec(req.headers.cookie ?? '');
  return Boolean(match && verifyToken(decodeURIComponent(match[1])));
}

const clientIp = (req) => String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();

// ---------------- Validation ----------------

const fail = (msg) => {
  throw new HttpError(400, msg);
};
const str = (v, field, max, { required = true } = {}) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) fail(`${field} is required`);
  if (s.length > max) fail(`${field} must be ${max} characters or less`);
  return s;
};
const oneOf = (v, field, allowed) => (allowed.includes(v) ? v : fail(`${field} must be one of: ${allowed.join(', ')}`));
const isoDate = (v, field) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : fail(`${field} must be a date`));
const list = (v, field, max) => (Array.isArray(v) ? (v.length <= max ? v : fail(`${field}: at most ${max}`)) : fail(`${field} must be a list`));
const keepId = (v) => (typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : newId());

const TEAMS = ['bengals', 'bearcats', 'reds', 'fcc'];
const POLL_CATEGORIES = ['food', 'drinks', 'events', 'debates'];
const COUPON_ICONS = ['food', 'wings', 'kids', 'drink', 'deal'];

/** TikTok link for the Info tab: a tiktok.com link or just the @handle. '' = no TikTok row. */
function tiktokUrl(value) {
  const raw = str(value, 'TikTok link', 200, { required: false }).trim();
  if (!raw) return '';
  const handle = /^@?([\w.]{2,24})$/.exec(raw)?.[1];
  if (handle) return `https://www.tiktok.com/@${handle}`;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    fail('TikTok link should look like https://www.tiktok.com/@yourname');
  }
  if (!/(^|\.)tiktok\.com$/i.test(url.hostname)) fail('TikTok link should be a tiktok.com link (or just your @name)');
  url.protocol = 'https:';
  return url.toString();
}

const validators = {
  home: (v) => validateHome(v, fail),

  menuOverrides(v) {
    // Bar 21+ sub-categories, each inside one section (On Tap → Domestics, IPAs), in display order.
    const seenNames = new Set();
    const barGroups = list(v?.barGroups ?? [], 'Sub-categories', 40).map((g, i) => {
      const parent = BAR_SECTION_IDS.includes(g?.parent) ? g.parent : fail(`Sub-category ${i + 1} needs a section`);
      const section = MENU_SECTIONS.find((s) => s.id === parent).title;
      const name = str(g?.name, `A ${section} sub-category name`, 30);
      const dupKey = `${parent}|${name.toLowerCase()}`;
      if (seenNames.has(dupKey)) fail(`${section} has two sub-categories called “${name}”`);
      seenNames.add(dupKey);
      return { id: typeof g?.id === 'string' && /^g-[\w-]{4,40}$/.test(g.id) ? g.id : `g-${newId()}`, name, parent };
    });
    const parentOf = new Map(barGroups.map((g) => [g.id, g.parent]));
    const entries = Object.entries(v?.items ?? {});
    if (entries.length > 1000) fail('Too many menu edits');
    const items = {};
    for (const [key, o] of entries) {
      if (typeof key !== 'string' || key.length > 160 || !key.includes('|')) continue;
      const name = str(o?.name, 'Item name', 80, { required: false });
      const description = str(o?.description, 'Description', 600, { required: false });
      const hidden = Boolean(o?.hidden);
      const noDescription = Boolean(o?.noDescription);
      // Only a sub-category of the drink's own section (a bottle can't go under On Tap).
      const group = typeof o?.group === 'string' && parentOf.get(o.group) === sectionOfKey(key) ? o.group : '';
      // Only keep items that actually have an edit.
      if (name || description || hidden || noDescription || group) {
        items[key] = { ...(name && { name }), ...(description && { description }), ...(hidden && { hidden }), ...(noDescription && { noDescription }), ...(group && { group }) };
      }
    }
    const hiddenSections = [...new Set(list(v?.hiddenSections ?? [], 'Hidden sections', 50).filter((s) => MENU_SECTION_IDS.includes(s)))];
    return { items, hiddenSections, barGroups, hideBarPrices: Boolean(v?.hideBarPrices) };
  },

  maintenance(v) {
    return {
      enabled: Boolean(v?.enabled),
      message: str(v?.message, 'Closed message', 300, { required: false }),
    };
  },

  settings(v) {
    const hh = v?.happyHour ?? {};
    const days = [...new Set(list(hh.days, 'Happy hour days', 7).map(Number))];
    if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) fail('Happy hour days must be 0–6');
    // Happy hour runs from the first tier's start to the last tier's end.
    const phases = validatePhases(hh.phases ?? [], fail);
    if (phases.length === 0) fail('Happy hour needs at least one part (e.g. 3–4 PM)');
    return {
      hours: list(v?.hours, 'Hours', 10).map((h, i) => ({
        days: str(h?.days, `Hours row ${i + 1} days`, 30),
        open: str(h?.open, `Hours row ${i + 1} open`, 20),
        close: str(h?.close, `Hours row ${i + 1} close`, 20),
      })),
      happyHour: { days: days.sort(), start: phases[0].start, end: phases.at(-1).end, phases },
      social: { tiktok: tiktokUrl(v?.social?.tiktok) },
    };
  },

  promos: (v) => validatePromos(v, fail),

  polls(v) {
    return list(v, 'Polls', 50).map((p, i) => {
      const label = `Poll ${i + 1}`;
      const options = list(p?.options, `${label} options`, 6).map((o, j) => ({
        id: keepId(o?.id),
        emoji: str(o?.emoji, `${label} option ${j + 1} emoji`, 8, { required: false }),
        label: str(o?.label, `${label} option ${j + 1}`, 60),
      }));
      if (options.length < 2) fail(`${label} needs at least 2 options`);
      return {
        id: keepId(p?.id),
        category: oneOf(p?.category, `${label} category`, POLL_CATEGORIES),
        question: str(p?.question, `${label} question`, 140),
        featured: Boolean(p?.featured),
        hidden: Boolean(p?.hidden),
        closesAt: isoDate(p?.closesAt, `${label} closing date`),
        options,
      };
    });
  },

  gamedaySettings(v) {
    const specials = {};
    for (const team of TEAMS) {
      specials[team] = list(v?.teamSpecials?.[team] ?? [], `${team} specials`, 6)
        .map((s, j) => str(s, `${team} special ${j + 1}`, 80, { required: false }))
        .filter(Boolean);
    }
    return { auto: Boolean(v?.auto), teamSpecials: specials };
  },

  gameday(v) {
    return list(v, 'Games', 30).map((g, i) => ({
      id: keepId(g?.id),
      team: oneOf(g?.team, `Game ${i + 1} team`, TEAMS),
      opponent: str(g?.opponent, `Game ${i + 1} opponent`, 40),
      homeAway: oneOf(g?.homeAway, `Game ${i + 1} home/away`, ['home', 'away']),
      startsAt: isoDate(g?.startsAt, `Game ${i + 1} start time`),
      timeTBA: Boolean(g?.timeTBA) || undefined,
      broadcast: str(g?.broadcast, `Game ${i + 1} TV channel`, 40, { required: false }),
      specials: list(g?.specials ?? [], `Game ${i + 1} specials`, 6)
        .map((s, j) => str(s, `Game ${i + 1} special ${j + 1}`, 80, { required: false }))
        .filter(Boolean),
    }));
  },

  comingSoon(v) {
    return list(v, 'Coming Soon', 20).map((c, i) => ({
      id: keepId(c?.id),
      kind: oneOf(c?.kind, `Coming Soon ${i + 1} type`, ['food', 'drink']),
      title: str(c?.title, `Coming Soon ${i + 1} title`, 60),
      description: str(c?.description, `Coming Soon ${i + 1} description`, 200, { required: false }),
      eta: str(c?.eta, `Coming Soon ${i + 1} timing`, 40),
      fromPoll: Boolean(c?.fromPoll),
    }));
  },

  coupons(v) {
    return list(v, 'Coupons', 30).map((c, i) => {
      const n = `Coupon ${i + 1}`;
      const expiresOn = typeof c?.expiresOn === 'string' && c.expiresOn ? c.expiresOn : '';
      if (expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) fail(`${n} expiration must be a date`);
      return {
        id: keepId(c?.id),
        kind: oneOf(c?.kind, `${n} icon`, COUPON_ICONS),
        title: str(c?.title, `${n} title`, 60),
        description: str(c?.description, `${n} description`, 200, { required: false }),
        finePrint: str(c?.finePrint, `${n} fine print`, 200, { required: false }),
        expiresOn, // '' = no expiration
        singleUse: Boolean(c?.singleUse),
        hidden: Boolean(c?.hidden),
      };
    });
  },

  showcase(v) {
    return list(v, 'Showcase', 20).map((s, i) => {
      const share = Number(s?.winningShare);
      if (!Number.isFinite(share) || share < 0 || share > 100) fail(`Showcase ${i + 1} vote share must be 0–100`);
      return {
        id: keepId(s?.id),
        title: str(s?.title, `Showcase ${i + 1} title`, 60),
        description: str(s?.description, `Showcase ${i + 1} description`, 200, { required: false }),
        pollQuestion: str(s?.pollQuestion, `Showcase ${i + 1} poll question`, 140),
        winningShare: Math.round(share),
        launchedOn: isoDate(s?.launchedOn, `Showcase ${i + 1} date`).slice(0, 10),
        status: oneOf(s?.status, `Showcase ${i + 1} status`, ['on-menu', 'coming-soon', 'event-booked']),
      };
    });
  },
};

// ---------------- Views ----------------

function barClock(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: BAR_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, weekday: new Date(`${date}T12:00:00Z`).getUTCDay(), minutes: Number(p.hour) * 60 + Number(p.minute) };
}

function pollView(poll, c) {
  const counts = c.votes[poll.id] ?? {};
  return { ...poll, options: poll.options.map((o) => ({ ...o, votes: counts[o.id] ?? 0 })) };
}

const openPolls = (c) =>
  c.polls
    .filter((p) => !p.hidden && Date.parse(p.closesAt) > Date.now())
    .sort((a, b) => Number(b.featured) - Number(a.featured) || Date.parse(a.closesAt) - Date.parse(b.closesAt));

/**
 * Games for the Home banner: ESPN schedules (with the admin's per-team specials) plus any games the
 * admin added by hand. A hand-added game for the same team within 6 hours replaces the ESPN one,
 * so the admin can override details like the TV channel or specials for a big game.
 */
async function gamedayGames(c) {
  const since = Date.now() - 4 * 3600_000; // keep a game up for ~4h after kickoff
  const manual = c.gameday.filter((g) => Date.parse(g.startsAt) > since);
  const auto = c.gamedaySettings?.auto
    ? (await upcomingAutoGames())
        .filter((a) => !manual.some((m) => m.team === a.team && Math.abs(Date.parse(m.startsAt) - Date.parse(a.startsAt)) < 6 * 3600_000))
        .map((a) => ({ ...a, specials: c.gamedaySettings.teamSpecials?.[a.team] ?? [] }))
    : [];
  return [...manual, ...auto].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

async function publicContent(c) {
  return {
    settings: c.settings,
    home: c.home,
    promoSchedule: promoSchedule(c.promos), // days/times only for surprises
    // Lets the app know when "today" rolls over / a surprise unlocks without trusting phone clocks.
    barToday: barClock().date,
    gameday: (await gamedayGames(c)).slice(0, 6),
    comingSoon: c.comingSoon,
    showcase: c.showcase,
    // Coupon Stash: hidden and expired coupons stay out of the app.
    coupons: c.coupons
      .filter((x) => !x.hidden && (!x.expiresOn || x.expiresOn >= barClock().date))
      .map(({ hidden: _hidden, ...x }) => x),
  };
}

// ---------------- Router ----------------

const deviceIdOk = (v) => typeof v === 'string' && /^[\w-]{8,64}$/.test(v);

function validateCheckinSettings(v) {
  const radius = Number(v?.radiusMeters);
  if (!Number.isFinite(radius) || radius < 25 || radius > 2000) fail('Check-in distance must be between 25 and 2000 meters');
  const lat = Number(v?.location?.lat);
  const lng = Number(v?.location?.lng);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) fail('Bar location must be a valid latitude and longitude');
  return { enabled: Boolean(v?.enabled), radiusMeters: Math.round(radius), location: { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) } };
}

// Light abuse protection: 20 check-in attempts per phone (and per network) per hour.
const checkinAttempts = new Map();
function checkinAllowed(deviceId, ip) {
  const now = Date.now();
  for (const key of [`d:${deviceId}`, `i:${ip}`]) {
    const e = checkinAttempts.get(key);
    if (!e || now - e.first > 3600_000) checkinAttempts.set(key, { first: now, count: 1 });
    else if (++e.count > (key.startsWith('i:') ? 200 : 20)) return false;
  }
  return true;
}

/** Handles /api/content, /api/flash-deal, /api/polls*, /api/admin*. Returns false if not ours. */
export async function handleContentApi(req, res, path) {
  try {
    if (!['/api/content', '/api/promos', '/api/polls', '/api/checkin', '/api/admin'].some((p) => path.startsWith(p))) {
      return false;
    }
    const c = getContent();
    const isPublic = !path.startsWith('/api/admin');
    if (isPublic && req.method === 'OPTIONS') return send(res, 204, null, { cors: true }), true;

    if (path === '/api/content' && req.method === 'GET') {
      return send(res, 200, await publicContent(c), { cors: true, cache: 'public, max-age=30' }), true;
    }

    if (path === '/api/promos/today' && req.method === 'GET') {
      // Surprise promos come back without details until they start.
      return send(res, 200, { promos: todaysPromos(c.promos, barClock()) }, { cors: true }), true;
    }

    if (path === '/api/polls' && req.method === 'GET') {
      const device = new URL(req.url, 'http://x').searchParams.get('device') ?? '';
      const polls = openPolls(c);
      const myVotes = {};
      if (deviceIdOk(device)) for (const p of polls) if (c.voters[p.id]?.[device]) myVotes[p.id] = c.voters[p.id][device];
      return send(res, 200, { polls: polls.map((p) => pollView(p, c)), myVotes }, { cors: true }), true;
    }

    const vote = /^\/api\/polls\/([\w-]+)\/vote$/.exec(path);
    if (vote && req.method === 'POST') {
      const { deviceId, optionId } = await readJson(req, 2048);
      if (!deviceIdOk(deviceId)) throw new HttpError(400, 'Missing device id');
      const poll = c.polls.find((p) => p.id === vote[1] && !p.hidden);
      if (!poll || Date.parse(poll.closesAt) <= Date.now()) throw new HttpError(404, 'This poll is closed.');
      if (!poll.options.some((o) => o.id === optionId)) throw new HttpError(400, 'Invalid option');
      if (c.voters[poll.id]?.[deviceId]) throw new HttpError(409, 'You already voted in this poll.');
      await update((draft) => {
        (draft.voters[poll.id] ??= {})[deviceId] = optionId;
        const counts = (draft.votes[poll.id] ??= {});
        counts[optionId] = (counts[optionId] ?? 0) + 1;
      });
      return send(res, 200, pollView(poll, getContent()), { cors: true }), true;
    }

    // ---------------- Check-ins ----------------

    if (path === '/api/checkin' && req.method === 'GET') {
      const device = new URL(req.url, 'http://x').searchParams.get('device') ?? '';
      const { date } = barClock();
      const visits = deviceIdOk(device) ? (c.checkins.visits[device]?.count ?? 0) : 0;
      const checkedInToday = deviceIdOk(device) && Boolean(c.checkins.byDay[date]?.[device]);
      return send(res, 200, { enabled: c.checkins.settings.enabled, checkedInToday, visits }, { cors: true }), true;
    }

    if (path === '/api/checkin' && req.method === 'POST') {
      const { deviceId, lat, lng, accuracy } = await readJson(req, 1024);
      if (!deviceIdOk(deviceId)) throw new HttpError(400, 'Missing device id');
      if (!checkinAllowed(deviceId, clientIp(req))) throw new HttpError(429, 'Too many tries - give it a few minutes.');
      const { date } = barClock();
      if (c.checkins.byDay[date]?.[deviceId]) {
        return send(res, 200, { ok: true, alreadyCheckedIn: true, visits: c.checkins.visits[deviceId]?.count ?? 1 }, { cors: true }), true;
      }
      const verdict = evaluateCheckin(c.checkins.settings, { lat, lng, accuracy });
      if (!verdict.ok) throw new HttpError(verdict.status, verdict.error);
      // Re-check inside the (synchronous) update so two quick taps can't both count.
      const visits = await update((draft) => (draft.checkins.byDay[date]?.[deviceId] ? null : recordCheckin(draft.checkins, deviceId, date)));
      const already = visits === null;
      return send(res, 200, { ok: true, alreadyCheckedIn: already, visits: already ? c.checkins.visits[deviceId]?.count ?? 1 : visits }, { cors: true }), true;
    }

    // ---------------- Admin ----------------

    if (path === '/api/admin/login' && req.method === 'POST') {
      if (!adminEnabled()) throw new HttpError(503, 'Admin is off. Set ADMIN_PASSWORD (8+ characters) in Railway → Variables.');
      const ip = clientIp(req);
      if (!loginAllowed(ip)) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
      const { password } = await readJson(req, 1024);
      if (!checkPassword(password)) {
        recordFailure(ip);
        throw new HttpError(401, 'Wrong password');
      }
      const token = issueToken();
      // Cookie lets a signed-in admin keep using the app while it's closed for maintenance.
      res.setHeader('Set-Cookie', adminCookie(req, token, 12 * 3600));
      return send(res, 200, { token }), true;
    }

    if (path === '/api/admin/logout' && req.method === 'POST') {
      res.setHeader('Set-Cookie', adminCookie(req, '', 0));
      return send(res, 200, { ok: true }), true;
    }

    if (path.startsWith('/api/admin/')) {
      // Own header (not Authorization) so it doesn't collide with the site-wide tester lock.
      const token = String(req.headers['x-admin-token'] ?? '');
      if (!verifyToken(token)) throw new HttpError(401, 'Please sign in again');

      if (path === '/api/admin/content' && req.method === 'GET') {
        const autoGames = await upcomingAutoGames();
        // Check-in logs are served separately (/api/admin/checkins) to keep this small.
        return send(res, 200, { ...c, polls: c.polls.map((p) => pollView(p, c)), voters: undefined, checkins: undefined, storageIsPersistent, autoGames }), true;
      }

      if (path === '/api/admin/checkins' && req.method === 'GET') {
        return send(res, 200, { settings: c.checkins.settings, stats: checkinStats(c.checkins, barClock().date) }), true;
      }

      if (path === '/api/admin/checkinSettings' && req.method === 'PUT') {
        const clean = validateCheckinSettings(await readJson(req, 2048));
        await update((draft) => {
          draft.checkins.settings = clean;
        });
        return send(res, 200, { ok: true, settings: clean }), true;
      }

      if (path === '/api/admin/menu' && req.method === 'GET') {
        // The live Toast menu before admin edits, plus the edits, for the Menu tab.
        try {
          const menu = await getCachedMenu();
          const items = withBase(menu.items).map(({ key, sectionId, name, description, price, sizes, soldOut }) => ({ key, sectionId, name, description, price, sizes, soldOut }));
          return send(res, 200, { sections: MENU_SECTIONS, items, overrides: c.menuOverrides, stale: Boolean(menu.stale) }), true;
        } catch (e) {
          console.error('[admin/menu]', e.message);
          throw new HttpError(503, e instanceof ToastConfigError ? 'Connect Toast first: add your Toast variables in Railway, then come back.' : 'Couldn’t reach Toast right now. Try again in a minute.');
        }
      }

      const section = /^\/api\/admin\/(home|menuOverrides|maintenance|settings|promos|polls|gamedaySettings|gameday|comingSoon|coupons|showcase)$/.exec(path)?.[1];
      if (section && req.method === 'PUT') {
        const clean = validators[section](await readJson(req));
        await update((draft) => {
          draft[section] = clean;
          if (section === 'polls') {
            // Keep votes only for polls/options that still exist.
            const live = new Map(clean.map((p) => [p.id, new Set(p.options.map((o) => o.id))]));
            for (const pid of Object.keys(draft.votes)) {
              const opts = live.get(pid);
              if (!opts) {
                delete draft.votes[pid];
                delete draft.voters[pid];
                continue;
              }
              for (const oid of Object.keys(draft.votes[pid])) if (!opts.has(oid)) delete draft.votes[pid][oid];
              for (const [dev, oid] of Object.entries(draft.voters[pid] ?? {})) if (!opts.has(oid)) delete draft.voters[pid][dev];
            }
          }
        });
        return send(res, 200, { ok: true, [section]: section === 'polls' ? clean.map((p) => pollView(p, getContent())) : clean }), true;
      }
    }

    throw new HttpError(404, 'Not found');
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error('[api]', e);
    send(res, status, { error: status === 500 ? 'Server error' : e.message }, { cors: !path.startsWith('/api/admin') });
    return true;
  }
}
