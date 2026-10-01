// Daily location check-ins (Rewards tab → "Check in").
// A phone (anonymous device id, same one used for poll votes) can check in once per bar-local day,
// only when its location is within the radius of the bar. Points get layered on later.

export const defaultCheckins = () => ({
  settings: {
    enabled: true,
    radiusMeters: 150,
    // 5880 Cheviot Rd (US Census geocoder). Fine-tune in /admin → Check-ins → "Use my current location".
    location: { lat: 39.200425, lng: -84.600679 },
  },
  byDay: {}, // "YYYY-MM-DD" -> { deviceId: ISO time }
  visits: {}, // deviceId -> { count, last: "YYYY-MM-DD" }
});

const KEEP_DAYS = 60;
const MAX_ACCURACY_M = 250; // fixes worse than this can't tell "in the bar" from "down the street"

/** Great-circle distance in meters. */
export function distanceMeters(a, b) {
  const R = 6_371_000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function describeDistance(m) {
  const miles = m / 1609.34;
  return miles >= 0.2 ? `${miles.toFixed(miles < 10 ? 1 : 0)} miles` : `${Math.round(m * 3.281)} feet`;
}

/**
 * Decides whether a check-in counts. Returns { ok: true } or { ok: false, status, error }.
 * Allows a little slack for GPS error (up to 50 m of the reported accuracy).
 */
export function evaluateCheckin(settings, { lat, lng, accuracy }) {
  if (!settings.enabled) return { ok: false, status: 403, error: 'Check-ins are turned off right now.' };
  if (![lat, lng].every((n) => typeof n === 'number' && Number.isFinite(n)) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, status: 400, error: 'We couldn’t read your location.' };
  }
  const acc = typeof accuracy === 'number' && accuracy > 0 ? accuracy : MAX_ACCURACY_M;
  const distance = distanceMeters(settings.location, { lat, lng });
  if (distance <= settings.radiusMeters + Math.min(acc, 50)) return { ok: true, distance };
  if (acc > MAX_ACCURACY_M && distance <= settings.radiusMeters + acc) {
    return { ok: false, status: 422, error: 'Your location isn’t precise enough yet. Turn on precise location (or Wi-Fi) and try again.' };
  }
  return { ok: false, status: 403, error: `You need to be at Game On to check in - you’re about ${describeDistance(distance)} away.` };
}

/** Records a check-in for today (mutates the store's checkins object). */
export function recordCheckin(checkins, deviceId, dateKey, now = new Date()) {
  (checkins.byDay[dateKey] ??= {})[deviceId] = now.toISOString();
  const v = (checkins.visits[deviceId] ??= { count: 0, last: null });
  v.count += 1;
  v.last = dateKey;
  // Keep the per-day log short; visit totals live in `visits`.
  const days = Object.keys(checkins.byDay).sort();
  for (const d of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) delete checkins.byDay[d];
  return v.count;
}

/** Counts for the admin: today and each of the last 14 days. */
export function checkinStats(checkins, todayKey) {
  const days = Object.keys(checkins.byDay).sort().reverse().slice(0, 14);
  return {
    today: Object.keys(checkins.byDay[todayKey] ?? {}).length,
    days: days.map((d) => ({ date: d, count: Object.keys(checkins.byDay[d]).length })),
    uniqueGuests: Object.keys(checkins.visits).length,
  };
}
