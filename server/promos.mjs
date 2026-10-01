// Happy hour tiers and promos, both edited in the admin.
//
// Happy hour (Hours & Happy Hour tab): days + a list of hour-by-hour phases, e.g.
//   3-4 PM  $1 bottles · $2 drafts   4-5 PM  $2 bottles · $3 drafts   5-6 PM  $3 bottles · $4 drafts
// Promos (Promos tab): any number of deals, each with its own days and start/end time. A promo
// marked "surprise" stays hidden from guests (and from the API) until it starts.
import { randomUUID } from 'node:crypto';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const defaultPhases = () => [
  { start: '15:00', end: '16:00', deals: ['$1 bottles', '$2 drafts'] },
  { start: '16:00', end: '17:00', deals: ['$2 bottles', '$3 drafts'] },
  { start: '17:00', end: '18:00', deals: ['$3 bottles', '$4 drafts'] },
];

const newId = () => `p-${randomUUID().slice(0, 8)}`;

/**
 * Upgrade from the old fixed "6 PM Surprise" (one deal per weekday, right after happy hour) to the
 * promo list. Only Mon/Tue/Wed are kept - Game On runs promos those days.
 */
export function promosFromOldFlashDeals(flashDeals = {}, start = '18:00', minutes = 60) {
  const endMinutes = Math.min(toMinutes(start) + minutes, 23 * 60 + 59);
  const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  return [1, 2, 3]
    .filter((d) => flashDeals[d]?.title)
    .map((d) => ({
      id: newId(),
      days: [d],
      start,
      end,
      title: flashDeals[d].title,
      description: flashDeals[d].description ?? '',
      finePrint: flashDeals[d].finePrint ?? '',
      surprise: true,
    }));
}

// ---------------- Validation ----------------

function time(v, field, fail) {
  return typeof v === 'string' && HHMM.test(v) ? v : fail(`${field} must be a time like 3:00 PM`);
}

function dayList(v, field, fail) {
  const days = [...new Set((Array.isArray(v) ? v : []).map(Number))];
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) fail(`${field}: pick valid days`);
  return days.sort();
}

/** Happy hour phases: in order, back to back or with gaps, never overlapping. */
export function validatePhases(v, fail) {
  if (!Array.isArray(v) || v.length > 8) fail('Happy hour can have up to 8 parts');
  const phases = v.map((p, i) => {
    const start = time(p?.start, `Happy hour part ${i + 1} start`, fail);
    const end = time(p?.end, `Happy hour part ${i + 1} end`, fail);
    if (end <= start) fail(`Happy hour part ${i + 1} must end after it starts`);
    const deals = (Array.isArray(p?.deals) ? p.deals : [])
      .map((d) => (typeof d === 'string' ? d.trim() : ''))
      .filter(Boolean);
    if (deals.length > 6 || deals.some((d) => d.length > 60)) fail(`Happy hour part ${i + 1}: up to 6 deals, 60 characters each`);
    return { start, end, deals };
  });
  phases.sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < phases.length; i++) {
    if (phases[i].start < phases[i - 1].end) fail('Happy hour parts can’t overlap');
  }
  return phases;
}

export function validatePromos(v, fail) {
  if (!Array.isArray(v) || v.length > 30) fail('Up to 30 promos');
  return v.map((p, i) => {
    const label = `Promo ${i + 1}`;
    const title = typeof p?.title === 'string' ? p.title.trim() : '';
    if (!title) fail(`${label} needs a title`);
    if (title.length > 60) fail(`${label} title must be 60 characters or less`);
    const text = (s, field, max) => {
      const t = typeof s === 'string' ? s.trim() : '';
      if (t.length > max) fail(`${label} ${field} must be ${max} characters or less`);
      return t;
    };
    const days = dayList(p?.days, label, fail);
    if (days.length === 0) fail(`${label} needs at least one day`);
    const start = time(p?.start, `${label} start`, fail);
    const end = time(p?.end, `${label} end`, fail);
    if (end <= start) fail(`${label} must end after it starts`);
    return {
      id: typeof p?.id === 'string' && /^p-[\w-]{4,40}$/.test(p.id) ? p.id : newId(),
      days,
      start,
      end,
      title,
      description: text(p?.description, 'details', 200),
      finePrint: text(p?.finePrint, 'fine print', 200),
      surprise: Boolean(p?.surprise),
    };
  });
}

// ---------------- Guest views ----------------

/** Hides a surprise promo's details until it starts. */
function redact(p, revealed) {
  const base = { id: p.id, days: p.days, start: p.start, end: p.end, surprise: p.surprise };
  return revealed || !p.surprise ? { ...base, title: p.title, description: p.description, finePrint: p.finePrint } : base;
}

/** Schedule for the app (countdowns, alerts): surprises have no details. */
export const promoSchedule = (promos) => promos.map((p) => redact(p, false));

/** Today's promos for the app, with surprise details only once they've started. */
export function todaysPromos(promos, { weekday, minutes }) {
  return promos
    .filter((p) => p.days.includes(weekday))
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((p) => redact(p, minutes >= toMinutes(p.start)));
}
