import type { ComingSoonItem, GamedayEvent, HomeLayout, Promo, ShowcaseItem } from '@/types';
import { apiFetch, ApiUnavailable } from './api';
import { setSettings, type BarSettings } from './settings';

// Admin-edited content from GET /api/content, shared by several screens. Fetched at most every
// 30 seconds; `null` means the server isn't reachable and callers use built-in sample data.
export interface PublicContent {
  settings: BarSettings;
  home?: HomeLayout;
  /** All promos' days & times (surprises without details) - for "next promo" and alerts. */
  promoSchedule?: Promo[];
  gameday: GamedayEvent[];
  comingSoon: ComingSoonItem[];
  showcase: ShowcaseItem[];
}

const TTL_MS = 30_000;
let cache: { at: number; promise: Promise<PublicContent | null> } | null = null;

export function loadContent(force = false): Promise<PublicContent | null> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.promise;
  const promise = apiFetch<PublicContent>('/api/content')
    .then((c) => {
      setSettings(c.settings);
      return c;
    })
    .catch((e) => {
      if (e instanceof ApiUnavailable) return null;
      throw e;
    });
  cache = { at: Date.now(), promise };
  return promise;
}
