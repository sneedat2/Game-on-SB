import type { ComingSoonItem, MenuItem, MenuSection } from '@/types';
import { menuItems, menuSections } from '@/data/menu';
import { comingSoon } from '@/data/mock/menu';
import { apiConfigured, apiFetch } from './api';
import { loadContent } from './content';
import { mockDelay } from './storage';

export interface MenuService {
  getMenu(): Promise<{ sections: MenuSection[]; items: MenuItem[]; live: boolean }>;
  getComingSoon(): Promise<ComingSoonItem[]>;
}

// Live menu comes from our own server (server/index.mjs on Railway), which holds the Toast credentials.
async function fetchLiveItems(): Promise<MenuItem[] | null> {
  try {
    const body = await apiFetch<{ items?: MenuItem[] }>('/api/menu');
    return Array.isArray(body.items) && body.items.length > 0 ? body.items : null;
  } catch {
    return null; // offline, Toast not configured, or not deployed with the server (e.g. local dev)
  }
}

export const menuService: MenuService = {
  async getMenu() {
    const live = await fetchLiveItems();
    if (live) return { sections: menuSections, items: live, live: true };
    // Fallback: the menu copied from Toast into src/data/menu.ts.
    if (!apiConfigured) await mockDelay();
    return { sections: menuSections, items: menuItems, live: false };
  },

  // Edited at /admin → Coming Soon (Toast has no concept of "not on the menu yet").
  async getComingSoon() {
    const content = await loadContent();
    if (content) return content.comingSoon;
    await mockDelay();
    return comingSoon;
  },
};
