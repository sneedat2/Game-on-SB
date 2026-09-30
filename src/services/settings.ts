import { useSyncExternalStore } from 'react';

// Bar settings editable in the admin (/admin → Hours & Happy Hour). These defaults are used until
// the server responds, and whenever it can't be reached.
export interface BarSettings {
  hours: { days: string; open: string; close: string }[];
  /** Weekdays (0 = Sunday) and "HH:MM" bar-local times. The 6 PM Surprise unlocks at `end`. */
  happyHour: { days: number[]; start: string; end: string };
  surpriseMinutes: number;
}

export const DEFAULT_SETTINGS: BarSettings = {
  hours: [
    { days: 'Mon–Sat', open: '11 AM', close: '9:30 PM' },
    { days: 'Sun', open: '11 AM', close: '9 PM' },
  ],
  happyHour: { days: [1, 2, 3, 4, 5], start: '15:00', end: '18:00' },
  surpriseMinutes: 60,
};

let current: BarSettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

export const getSettings = () => current;

export function setSettings(next: BarSettings) {
  current = next;
  listeners.forEach((l) => l());
}

export function useSettings(): BarSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSettings,
    getSettings,
  );
}

// ---------------- Labels ----------------

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "15:00" -> "3 PM", "15:30" -> "3:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

/** [1,2,3,4,5] -> "Mon–Fri", [1,3,5] -> "Mon, Wed, Fri" */
export function daysLabel(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 0) return 'No days';
  if (sorted.length === 7) return 'Every day';
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive && sorted.length > 2) return `${DAY_ABBR[sorted[0]]}–${DAY_ABBR[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAY_ABBR[d]).join(', ');
}

/** "Mon–Fri 3–6 PM" */
export function happyHourLabel(s: BarSettings = current): string {
  const start = formatTime(s.happyHour.start);
  const end = formatTime(s.happyHour.end);
  const sameHalf = start.slice(-2) === end.slice(-2);
  return `${daysLabel(s.happyHour.days)} ${sameHalf ? start.slice(0, -3) : start}–${end}`;
}

export const toSeconds = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 3600 + m * 60;
};
