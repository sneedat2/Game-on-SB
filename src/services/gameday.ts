import type { FlashDeal, GamedayEvent } from '@/types';
import { buildMockGamedayEvents, mockFlashDealFor } from '@/data/mock/gameday';
import { isLive } from './config';
import { mockDelay } from './storage';
import { supabase } from './supabase';

export interface GamedayService {
  upcoming(limit?: number): Promise<GamedayEvent[]>;
  /** The "6 PM Surprise" for a bar-local date (YYYY-MM-DD). */
  flashDeal(dateKey: string): Promise<FlashDeal | null>;
}

const mockGameday: GamedayService = {
  async upcoming(limit = 4) {
    await mockDelay();
    return buildMockGamedayEvents().slice(0, limit);
  },
  async flashDeal(dateKey) {
    await mockDelay(200);
    return mockFlashDealFor(dateKey);
  },
};

const liveGameday: GamedayService = {
  async upcoming(limit = 4) {
    const since = new Date(Date.now() - 4 * 3600_000).toISOString(); // keep games "live" for ~4h after kickoff
    const { data, error } = await supabase()
      .from('gameday_events')
      .select('*')
      .gte('starts_at', since)
      .order('starts_at')
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      team: r.team,
      opponent: r.opponent,
      homeAway: r.home_away,
      startsAt: r.starts_at,
      broadcast: r.broadcast ?? undefined,
      specials: r.specials ?? [],
    }));
  },
  async flashDeal(dateKey) {
    // RLS only exposes a deal's row once its unlock time has passed (see migration), so the
    // surprise can't be spoiled by poking the API before 6 PM.
    const { data, error } = await supabase().from('flash_deals').select('*').eq('deal_date', dateKey).maybeSingle();
    if (error) throw error;
    return data
      ? { id: data.id, date: data.deal_date, title: data.title, description: data.description, finePrint: data.fine_print ?? undefined }
      : null;
  },
};

export const gamedayService: GamedayService = isLive ? liveGameday : mockGameday;
