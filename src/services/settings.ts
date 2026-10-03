import { useSyncExternalStore } from 'react';

// Bar settings editable in the admin (/admin → Hours & Happy Hour). These defaults are used until
// the server responds, and whenever it can't be reached.
export interface HappyHourPhase {
  start: string; // "HH:MM" bar-local
  end: string;
  deals: string[]; // e.g. ["$1 bottles", "$2 drafts"]
}

export interface BarSettings {
  hours: { days: string; open: string; close: string }[];
  /** Weekdays (0 = Sunday). start/end span all phases; each phase has its own prices. */
  happyHour: { days: number[]; start: string; end: string; phases: HappyHourPhase[] };
  /** Social links set in the admin. An empty link hides its row on the Info tab. */
  social?: { tiktok?: string };
}

export const DEFAULT_SETTINGS: BarSettings = {
  hours: [
    { days: 'Mon–Sat', open: '11 AM', close: '9:30 PM' },
    { days: 'Sun', open: '11 AM', close: '9 PM' },
  ],
  happyHour: {
    days: [1, 2, 3, 4, 5],
    start: '15:00',
    end: '18:00',
    phases: [
      { start: '15:00', end: '16:00', deals: ['$1 bottles', '$2 drafts'] },
      { start: '16:00', end: '17:00', deals: ['$2 bottles', '$3 drafts'] },
      { start: '17:00', end: '18:00', deals: ['$3 bottles', '$4 drafts'] },
    ],
  },
};

let current: BarSettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

export const getSettings = () => current;

export function setSettings(next: BarSettings) {
  // Older servers may not send phases yet - fall back to one phase spanning happy hour.
  const hh = next.happyHour;
  const phases = Array.isArray(hh?.phases) && hh.phases.length ? hh.phases : [{ start: hh.start, end: hh.end, deals: [] }];
  current = { ...next, happyHour: { ...hh, phases } };
  listeners.forEach((l) => l());
}

/** "3–4 PM" */
export function timeRange(start: string, end: string): string {
  const a = formatTime(start);
  const b = formatTime(end);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
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
  return `${daysLabel(s.happyHour.days)} ${timeRange(s.happyHour.start, s.happyHour.end)}`;
}

export const toSeconds = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 3600 + m * 60;
};
