import type { ComingSoonItem, MenuItem, MenuSection } from '@/types';
import { menuItems, menuSections } from '@/data/menu';
import { comingSoon } from '@/data/mock/menu';
import { isLive } from './config';
import { mockDelay } from './storage';
import { invokeFunction, supabase } from './supabase';

export interface MenuService {
  getMenu(): Promise<{ sections: MenuSection[]; items: MenuItem[] }>;
  getComingSoon(): Promise<ComingSoonItem[]>;
}

const mockMenu: MenuService = {
  async getMenu() {
    await mockDelay();
    return { sections: menuSections, items: menuItems };
  },
  async getComingSoon() {
    await mockDelay();
    return comingSoon;
  },
};

const liveMenu: MenuService = {
  // Goes through the `toast-proxy` Edge Function, which holds the Toast credentials, caches the
  // response, and maps it into these shapes. Never call Toast from the app directly.
  getMenu: () => invokeFunction('toast-proxy', { action: 'menu.get' }),
  // Staff-curated in Supabase (coming_soon_items) - Toast has no concept of "not on the menu yet".
  async getComingSoon() {
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

export const menuService: MenuService = isLive ? liveMenu : mockMenu;
