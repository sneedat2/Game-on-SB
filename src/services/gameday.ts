import type { GamedayEvent } from '@/types';
import { buildMockGamedayEvents } from '@/data/mock/gameday';
import { loadContent } from './content';
import { mockDelay } from './storage';

export interface GamedayService {
  upcoming(limit?: number): Promise<GamedayEvent[]>;
}

// Games come from ESPN + /admin → Gameday. Without the server (local dev), sample games are used.
export const gamedayService: GamedayService = {
  async upcoming(limit = 4) {
    const content = await loadContent();
    if (content) return content.gameday.slice(0, limit);
    await mockDelay();
    return buildMockGamedayEvents().slice(0, limit);
  },
};
