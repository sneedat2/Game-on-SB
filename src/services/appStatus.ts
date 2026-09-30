import { useSyncExternalStore } from 'react';

// Open/closed state from the server (/admin → App Status). The server answers every API call with
// 503 "maintenance" while closed, and flags responses for a signed-in admin with
// X-Maintenance-Preview so the app can show that it's hidden from guests.
export interface AppStatus {
  closed: boolean;
  message?: string;
  /** App is closed to guests, but this browser is signed in as admin. */
  adminPreview: boolean;
}

let status: AppStatus = { closed: false, adminPreview: false };
const listeners = new Set<() => void>();

function set(next: Partial<AppStatus>) {
  const merged = { ...status, ...next };
  if (merged.closed === status.closed && merged.message === status.message && merged.adminPreview === status.adminPreview) return;
  status = merged;
  listeners.forEach((l) => l());
}

export const markClosed = (message?: string) => set({ closed: true, message, adminPreview: false });
export const markOpen = (adminPreview: boolean) => set({ closed: false, message: undefined, adminPreview });

export function useAppStatus(): AppStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}
