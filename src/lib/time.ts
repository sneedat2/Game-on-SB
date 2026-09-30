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

/**
 * Happy-hour-day flow (default Mon–Fri): before happy hour → happy hour (3–6 PM) → surprise
 * (6–7 PM). After that, and on non-happy-hour days, it's 'off' until the next happy hour.
 */
export type FlashDealPhase = 'before' | 'happy-hour' | 'live' | 'off';

export interface FlashDealState {
  phase: FlashDealPhase;
  /** Milliseconds until the next phase change. */
  msRemaining: number;
  /** Absolute time of the next surprise unlock (a weekday 6 PM); used for local notifications. */
  nextUnlockAt: Date;
  /** Days until the next happy hour starts (0 = today); only meaningful when phase is 'off'. */
  daysUntilNextHappyHour: number;
}

const DAY_S = 24 * 60 * 60;

function barWeekday(c: WallClock): number {
  return new Date(Date.UTC(c.year, c.month - 1, c.day)).getUTCDay();
}

/** Days from today until the first happy-hour day whose `atSeconds` hasn't passed yet. */
function daysUntilWeekdayAt(days: number[], weekday: number, secondsIntoDay: number, atSeconds: number): number {
  for (let d = 0; d <= 7; d++) {
    if (days.includes((weekday + d) % 7) && (d > 0 || secondsIntoDay < atSeconds)) return d;
  }
  return 7; // only when no happy-hour days are set
}

/** Happy hour days/times come from the admin-editable settings (services/settings.ts). */
export function getFlashDealState(now: Date = new Date(), settings: BarSettings = getSettings()): FlashDealState {
  const { days } = settings.happyHour;
  const c = barWallClock(now);
  const weekday = barWeekday(c);
  const sid = c.hour * 3600 + c.minute * 60 + c.second;
  const startS = toSeconds(settings.happyHour.start);
  const unlockS = toSeconds(settings.happyHour.end);
  const endS = unlockS + settings.surpriseMinutes * 60;
  const isHappyHourDay = (d: number) => days.includes(d);
  const daysUntilWeekdayAtFor = (at: number) => daysUntilWeekdayAt(days, weekday, sid, at);
  const ms = (s: number) => s * 1000 - now.getMilliseconds();

  const unlockDays = daysUntilWeekdayAtFor(unlockS);
  const nextUnlockAt = new Date(now.getTime() + ms(unlockDays * DAY_S - sid + unlockS));
  const base = { nextUnlockAt, daysUntilNextHappyHour: 0 };

  if (isHappyHourDay(weekday)) {
    if (sid < startS) return { ...base, phase: 'before', msRemaining: ms(startS - sid) };
    if (sid < unlockS) return { ...base, phase: 'happy-hour', msRemaining: ms(unlockS - sid) };
    if (sid < endS) return { ...base, phase: 'live', msRemaining: ms(endS - sid) };
  }
  const waitDays = daysUntilWeekdayAtFor(startS);
  return { ...base, phase: 'off', msRemaining: ms(waitDays * DAY_S - sid + startS), daysUntilNextHappyHour: waitDays };
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
