// Content API for the app + admin editor.
//
// Public (the app):
//   GET  /api/content                  hours, happy hour, upcoming games, Coming Soon, showcase
//   GET  /api/flash-deal               today's 6 PM Surprise - only once it has unlocked
//   GET  /api/polls?device=<id>        open polls with vote counts + this device's votes
//   POST /api/polls/<id>/vote          { deviceId, optionId }
// Admin (X-Admin-Token: <token from /api/admin/login>):
//   POST /api/admin/login              { password } -> { token }
//   GET  /api/admin/content            everything, including all polls and vote totals
//   POST /api/admin/logout             clears the admin cookie
//   PUT  /api/admin/<section>          replace one section (maintenance, settings, flashDeals, polls, gameday, comingSoon, showcase)
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { adminEnabled, checkPassword, issueToken, loginAllowed, recordFailure, verifyToken } from './auth.mjs';
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
const hhmm = (v, field) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fail(`${field} must be a time like 15:00`));

const TEAMS = ['bengals', 'bearcats', 'reds', 'fcc'];
const POLL_CATEGORIES = ['food', 'drinks', 'events', 'debates'];

const validators = {
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
    const start = hhmm(hh.start, 'Happy hour start');
    const end = hhmm(hh.end, 'Happy hour end');
    if (end <= start) fail('Happy hour must end after it starts');
    const surpriseMinutes = Number(v?.surpriseMinutes);
    if (!Number.isInteger(surpriseMinutes) || surpriseMinutes < 0 || surpriseMinutes > 240) fail('Surprise length must be 0–240 minutes');
    return {
      hours: list(v?.hours, 'Hours', 10).map((h, i) => ({
        days: str(h?.days, `Hours row ${i + 1} days`, 30),
        open: str(h?.open, `Hours row ${i + 1} open`, 20),
        close: str(h?.close, `Hours row ${i + 1} close`, 20),
      })),
      happyHour: { days: days.sort(), start, end },
      surpriseMinutes,
    };
  },

  flashDeals(v) {
    const out = {};
    for (let d = 0; d <= 6; d++) {
      const deal = v?.[d];
      if (!deal || !String(deal.title ?? '').trim()) continue;
      out[d] = {
        title: str(deal.title, 'Deal title', 60),
        description: str(deal.description, 'Deal description', 200, { required: false }),
        finePrint: str(deal.finePrint, 'Fine print', 200, { required: false }),
      };
    }
    return out;
  },

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

  gameday(v) {
    return list(v, 'Games', 30).map((g, i) => ({
      id: keepId(g?.id),
      team: oneOf(g?.team, `Game ${i + 1} team`, TEAMS),
      opponent: str(g?.opponent, `Game ${i + 1} opponent`, 40),
      homeAway: oneOf(g?.homeAway, `Game ${i + 1} home/away`, ['home', 'away']),
      startsAt: isoDate(g?.startsAt, `Game ${i + 1} start time`),
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

const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function pollView(poll, c) {
  const counts = c.votes[poll.id] ?? {};
  return { ...poll, options: poll.options.map((o) => ({ ...o, votes: counts[o.id] ?? 0 })) };
}

const openPolls = (c) =>
  c.polls
    .filter((p) => !p.hidden && Date.parse(p.closesAt) > Date.now())
    .sort((a, b) => Number(b.featured) - Number(a.featured) || Date.parse(a.closesAt) - Date.parse(b.closesAt));

function publicContent(c) {
  const since = Date.now() - 4 * 3600_000; // keep a game up for ~4h after kickoff
  return {
    settings: c.settings,
    gameday: c.gameday.filter((g) => Date.parse(g.startsAt) > since).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0, 6),
    comingSoon: c.comingSoon,
    showcase: c.showcase,
  };
}

// ---------------- Router ----------------

const deviceIdOk = (v) => typeof v === 'string' && /^[\w-]{8,64}$/.test(v);

/** Handles /api/content, /api/flash-deal, /api/polls*, /api/admin*. Returns false if not ours. */
export async function handleContentApi(req, res, path) {
  try {
    if (!path.startsWith('/api/content') && !path.startsWith('/api/flash-deal') && !path.startsWith('/api/polls') && !path.startsWith('/api/admin')) {
      return false;
    }
    const c = getContent();
    const isPublic = !path.startsWith('/api/admin');
    if (isPublic && req.method === 'OPTIONS') return send(res, 204, null, { cors: true }), true;

    if (path === '/api/content' && req.method === 'GET') {
      return send(res, 200, publicContent(c), { cors: true, cache: 'public, max-age=30' }), true;
    }

    if (path === '/api/flash-deal' && req.method === 'GET') {
      // The surprise stays a surprise: nothing is returned before it unlocks.
      const { weekday, minutes } = barClock();
      const hh = c.settings.happyHour;
      const unlocked = hh.days.includes(weekday) && minutes >= toMinutes(hh.end) && minutes < toMinutes(hh.end) + c.settings.surpriseMinutes;
      return send(res, 200, { deal: unlocked ? (c.flashDeals[weekday] ?? null) : null }, { cors: true }), true;
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
        return send(res, 200, { ...c, polls: c.polls.map((p) => pollView(p, c)), voters: undefined, storageIsPersistent }), true;
      }

      const section = /^\/api\/admin\/(maintenance|settings|flashDeals|polls|gameday|comingSoon|showcase)$/.exec(path)?.[1];
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
