import { BAR } from '@/constants/bar';
import { getSettings, toSeconds, type BarSettings } from '@/services/settings';

// All bar logic (happy hour, flash deal window) runs on the bar's wall clock, not the phone's,
// so a fan checking the app from out of town still sees the right countdown.

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BAR.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function barWallClock(now: Date = new Date()): WallClock {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** YYYY-MM-DD for "today" at the bar. */
export function barDateKey(now: Date = new Date()): string {
  const c = barWallClock(now);
  return `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
}

const DAY_S = 24 * 60 * 60;

function barWeekday(c: WallClock): number {
  return new Date(Date.UTC(c.year, c.month - 1, c.day)).getUTCDay();
}

/** Bar-local weekday (0 = Sunday) for `now`. */
export const barWeekdayNow = (now: Date = new Date()) => barWeekday(barWallClock(now));

const secondsIntoBarDay = (now: Date) => {
  const c = barWallClock(now);
  return c.hour * 3600 + c.minute * 60 + c.second;
};

/** Days from today until the first listed weekday whose `atSeconds` hasn't passed yet (7 if none). */
function daysUntilWeekdayAt(days: number[], weekday: number, secondsIntoDay: number, atSeconds: number): number {
  for (let d = 0; d <= 7; d++) {
    if (days.includes((weekday + d) % 7) && (d > 0 || secondsIntoDay < atSeconds)) return d;
  }
  return 7;
}

// ---------------- Happy hour (tiers) ----------------

/**
 * On a happy-hour day: 'before' → 'on' (one tier at a time, e.g. 3–4, 4–5, 5–6) → 'off'.
 * Non-happy-hour days are 'off' until the next happy hour.
 */
export type HappyHourStage = 'before' | 'on' | 'off';

export interface HappyHourState {
  stage: HappyHourStage;
  /** Current tier while 'on'. During a gap between tiers it's the next tier, with `waiting` set. */
  phaseIndex: number;
  waiting: boolean;
  /** ms until happy hour starts (before/off), or until the current tier ends (or starts, if waiting). */
  msRemaining: number;
  /** Days until the next happy hour (0 = today). */
  daysUntilNext: number;
}

export function getHappyHourState(now: Date = new Date(), settings: BarSettings = getSettings()): HappyHourState {
  const { days, phases, start } = settings.happyHour;
  const weekday = barWeekdayNow(now);
  const sid = secondsIntoBarDay(now);
  const ms = (s: number) => s * 1000 - now.getMilliseconds();
  const startS = toSeconds(start);

  if (days.includes(weekday)) {
    if (sid < startS) return { stage: 'before', phaseIndex: 0, waiting: false, msRemaining: ms(startS - sid), daysUntilNext: 0 };
    for (let i = 0; i < phases.length; i++) {
      const pStart = toSeconds(phases[i].start);
      const pEnd = toSeconds(phases[i].end);
      if (sid < pEnd) {
        const waiting = sid < pStart;
        return { stage: 'on', phaseIndex: i, waiting, msRemaining: ms((waiting ? pStart : pEnd) - sid), daysUntilNext: 0 };
      }
    }
  }
  const wait = daysUntilWeekdayAt(days, weekday, sid, startS);
  return { stage: 'off', phaseIndex: 0, waiting: false, msRemaining: ms(wait * DAY_S - sid + startS), daysUntilNext: wait };
}

// ---------------- Promos (own days & times) ----------------

export interface PromoWindow {
  days: number[];
  start: string;
  end: string;
}

/** Where a promo stands today (only meaningful when today is one of its days). */
export function promoTiming(p: PromoWindow, now: Date = new Date()): { state: 'upcoming' | 'live' | 'ended'; msRemaining: number } {
  const sid = secondsIntoBarDay(now);
  const ms = (s: number) => s * 1000 - now.getMilliseconds();
  const s = toSeconds(p.start);
  const e = toSeconds(p.end);
  if (sid < s) return { state: 'upcoming', msRemaining: ms(s - sid) };
  if (sid < e) return { state: 'live', msRemaining: ms(e - sid) };
  return { state: 'ended', msRemaining: 0 };
}

/** The soonest promo that hasn't started yet (today later on, or in the next week). */
export function nextPromoStart<T extends PromoWindow>(promos: T[], now: Date = new Date()): { promo: T; daysAhead: number; at: Date } | null {
  const weekday = barWeekdayNow(now);
  const sid = secondsIntoBarDay(now);
  let best: { promo: T; daysAhead: number; at: Date } | null = null;
  for (const promo of promos) {
    const startS = toSeconds(promo.start);
    const d = daysUntilWeekdayAt(promo.days, weekday, sid, startS);
    if (d === 7 && !promo.days.includes(weekday)) continue;
    const at = new Date(now.getTime() + (d * DAY_S - sid + startS) * 1000 - now.getMilliseconds());
    if (!best || at < best.at) best = { promo, daysAhead: d, at };
  }
  return best;
}

/** Upcoming start times across all promos (for alerts), soonest first. */
export function upcomingPromoStarts<T extends PromoWindow>(promos: T[], count: number, now: Date = new Date()): { promo: T; at: Date }[] {
  const out: { promo: T; at: Date }[] = [];
  const weekday = barWeekdayNow(now);
  const sid = secondsIntoBarDay(now);
  for (let d = 0; d < 14 && out.length < count * 4; d++) {
    for (const promo of promos) {
      const startS = toSeconds(promo.start);
      if (!promo.days.includes((weekday + d) % 7) || (d === 0 && sid >= startS)) continue;
      out.push({ promo, at: new Date(now.getTime() + (d * DAY_S - sid + startS) * 1000 - now.getMilliseconds()) });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, count);
}

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "tomorrow" / "Monday" for the next happy hour, relative to the bar's today. */
export function nextHappyHourLabel(daysAhead: number, now: Date = new Date()): string {
  if (daysAhead <= 0) return 'today';
  if (daysAhead === 1) return 'tomorrow';
  return weekdayNames[(barWeekday(barWallClock(now)) + daysAhead) % 7];
}

export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / DAY_S),
    hours: Math.floor((total % DAY_S) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatClock(ms: number): string {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  const h = days * 24 + hours;
  return `${pad2(h)}:${pad2(minutes)}:${pad2(seconds)}`;
}

/** MM:SS with minutes uncapped (e.g. "60:00" at the start of a 1-hour window). */
export function formatMinSec(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

const kickoffFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BAR.timeZone,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatKickoff(iso: string): string {
  return kickoffFormatter.format(new Date(iso));
}

const gameDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BAR.timeZone,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

/** "Sat, Oct 17" in bar time - for games whose kickoff time isn't set yet. */
export function formatGameDate(iso: string): string {
  return gameDateFormatter.format(new Date(iso));
}

/**
 * Builds a Date for a given bar-local wall time `daysFromNow` days out. Used by the mock data
 * so sample games/polls are always in the near future. DST edge cases are fine for mocks.
 */
export function barLocalDate(daysFromNow: number, hour: number, minute = 0, now: Date = new Date()): Date {
  const c = barWallClock(now);
  const secondsIntoDay = c.hour * 3600 + c.minute * 60 + c.second;
  const target = daysFromNow * DAY_S + hour * 3600 + minute * 60;
  return new Date(now.getTime() + (target - secondsIntoDay) * 1000 - now.getMilliseconds());
}

/** Days from `now` (bar-local) until the next given weekday (0 = Sunday). Returns 0 if it's today. */
export function daysUntilWeekday(weekday: number, now: Date = new Date()): number {
  const c = barWallClock(now);
  const todayWeekday = new Date(Date.UTC(c.year, c.month - 1, c.day)).getUTCDay();
  return (weekday - todayWeekday + 7) % 7;
}
