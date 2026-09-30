import { BAR, FLASH_DEAL } from '@/constants/bar';

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

export type FlashDealPhase = 'counting-down' | 'live' | 'ended';

export interface FlashDealState {
  phase: FlashDealPhase;
  /** Milliseconds until the next phase change (unlock, or end of the live window). */
  msRemaining: number;
  /** Absolute time of the next unlock; used for scheduling local notifications. */
  nextUnlockAt: Date;
}

const DAY_S = 24 * 60 * 60;

export function getFlashDealState(now: Date = new Date()): FlashDealState {
  const c = barWallClock(now);
  const secondsIntoDay = c.hour * 3600 + c.minute * 60 + c.second;
  const unlockS = FLASH_DEAL.unlockHour * 3600;
  const endS = unlockS + FLASH_DEAL.durationMinutes * 60;
  const ms = (s: number) => s * 1000 - now.getMilliseconds();

  if (secondsIntoDay < unlockS) {
    const remaining = ms(unlockS - secondsIntoDay);
    return { phase: 'counting-down', msRemaining: remaining, nextUnlockAt: new Date(now.getTime() + remaining) };
  }
  if (secondsIntoDay < endS) {
    const untilTomorrow = ms(DAY_S - secondsIntoDay + unlockS);
    return {
      phase: 'live',
      msRemaining: ms(endS - secondsIntoDay),
      nextUnlockAt: new Date(now.getTime() + untilTomorrow),
    };
  }
  const remaining = ms(DAY_S - secondsIntoDay + unlockS);
  return { phase: 'ended', msRemaining: remaining, nextUnlockAt: new Date(now.getTime() + remaining) };
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
