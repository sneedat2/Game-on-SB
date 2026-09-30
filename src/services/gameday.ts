import type { FlashDeal, GamedayEvent } from '@/types';
import { buildMockGamedayEvents, mockFlashDealFor } from '@/data/mock/gameday';
import { apiFetch, ApiUnavailable } from './api';
import { loadContent } from './content';
import { mockDelay } from './storage';

export interface GamedayService {
  upcoming(limit?: number): Promise<GamedayEvent[]>;
  /** The "6 PM Surprise" for a bar-local date (YYYY-MM-DD). */
  flashDeal(dateKey: string): Promise<FlashDeal | null>;
}

// Games and surprise deals are edited at /admin. Without the server (local dev), sample data is used.
export const gamedayService: GamedayService = {
  async upcoming(limit = 4) {
    const content = await loadContent();
    if (content) return content.gameday.slice(0, limit);
    await mockDelay();
    return buildMockGamedayEvents().slice(0, limit);
  },

  async flashDeal(dateKey) {
    try {
      // The server only reveals the deal once it has unlocked.
      const { deal } = await apiFetch<{ deal: Omit<FlashDeal, 'id' | 'date'> | null }>('/api/flash-deal');
      return deal ? { id: `fd-${dateKey}`, date: dateKey, ...deal } : null;
    } catch (e) {
      if (!(e instanceof ApiUnavailable)) throw e;
      await mockDelay(200);
      return mockFlashDealFor(dateKey);
    }
  },
};
