import type { Promo } from '@/types';
import { apiFetch, ApiUnavailable } from './api';
import { loadContent } from './content';

// Promos from /admin → Promos. Surprise promos come back without details until they start, so
// guests (and anyone poking at the API) can't peek early.

export async function todaysPromos(): Promise<Promo[]> {
  try {
    return (await apiFetch<{ promos: Promo[] }>('/api/promos/today')).promos;
  } catch (e) {
    if (e instanceof ApiUnavailable) return []; // no server (local dev)
    throw e;
  }
}

/** Every promo's days & times, for "next promo" teasers and alerts. */
export async function promoSchedule(): Promise<Promo[]> {
  return (await loadContent().catch(() => null))?.promoSchedule ?? [];
}
