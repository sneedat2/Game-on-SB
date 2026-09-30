import { Platform } from 'react-native';
import type { ComingSoonItem, MenuItem, MenuSection } from '@/types';
import { menuItems, menuSections } from '@/data/menu';
import { comingSoon } from '@/data/mock/menu';
import { isLive } from './config';
import { mockDelay } from './storage';
import { supabase } from './supabase';

export interface MenuService {
  getMenu(): Promise<{ sections: MenuSection[]; items: MenuItem[]; live: boolean }>;
  getComingSoon(): Promise<ComingSoonItem[]>;
}

// Live menu comes from our own server (server/index.mjs on Railway), which holds the Toast
// credentials. The website calls it on the same domain; the phone app needs the full URL.
const MENU_API_URL = process.env.EXPO_PUBLIC_MENU_API_URL || (Platform.OS === 'web' ? '/api/menu' : '');
const TIMEOUT_MS = 6000;

async function fetchLiveItems(): Promise<MenuItem[] | null> {
  if (!MENU_API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(MENU_API_URL, { signal: controller.signal });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    const body = (await res.json()) as { items?: MenuItem[] };
    return Array.isArray(body.items) && body.items.length > 0 ? body.items : null;
  } catch {
    return null; // offline, timed out, or not deployed with the server (e.g. local dev)
  } finally {
    clearTimeout(timer);
  }
}

export const menuService: MenuService = {
  async getMenu() {
    const live = await fetchLiveItems();
    if (live) return { sections: menuSections, items: live, live: true };
    // Fallback: the menu copied from Toast into src/data/menu.ts.
    if (!MENU_API_URL) await mockDelay();
    return { sections: menuSections, items: menuItems, live: false };
  },

  // Staff-curated in Supabase (coming_soon_items) - Toast has no concept of "not on the menu yet".
  async getComingSoon() {
    if (!isLive) {
      await mockDelay();
      return comingSoon;
    }
    const { data, error } = await supabase()
      .from('coming_soon_items')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      description: r.description,
      eta: r.eta_label,
      fromPoll: r.from_poll,
    }));
  },
};
