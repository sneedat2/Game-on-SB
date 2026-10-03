import type { ComingSoonItem, MenuItem, MenuSection, MenuSubgroup } from '@/types';
import { menuItems, menuSections } from '@/data/menu';
import { descriptionFor } from '@/data/menuDescriptions';
import { comingSoon } from '@/data/mock/menu';
import { apiConfigured, apiFetch } from './api';
import { loadContent } from './content';
import { mockDelay } from './storage';

export interface MenuService {
  getMenu(): Promise<{ sections: MenuSection[]; subgroups: MenuSubgroup[]; items: MenuItem[]; live: boolean }>;
  getComingSoon(): Promise<ComingSoonItem[]>;
}

interface LiveMenu {
  items: MenuItem[];
  subgroups: MenuSubgroup[];
}

// Live menu comes from our own server (server/index.mjs on Railway), which holds the Toast credentials.
async function fetchLiveMenu(): Promise<LiveMenu | null> {
  try {
    const body = await apiFetch<{ items?: MenuItem[]; subgroups?: MenuSubgroup[] }>('/api/menu');
    if (!Array.isArray(body.items) || body.items.length === 0) return null;
    return { items: body.items, subgroups: Array.isArray(body.subgroups) ? body.subgroups : [] };
  } catch {
    return null; // offline, Toast not configured, or not deployed with the server (e.g. local dev)
  }
}

/**
 * Adds website descriptions where none was given. The live menu already arrives with admin edits
 * and descriptions applied; an empty string there means "no description" on purpose.
 */
const withDescriptions = (items: MenuItem[]) =>
  items.map((i) => (i.description !== undefined ? i : { ...i, description: descriptionFor(i.name) }));

export const menuService: MenuService = {
  async getMenu() {
    const live = await fetchLiveMenu();
    if (live) return { sections: menuSections, subgroups: live.subgroups, items: withDescriptions(live.items), live: true };
    // Fallback: the menu copied from Toast into src/data/menu.ts.
    if (!apiConfigured) await mockDelay();
    return { sections: menuSections, subgroups: [], items: withDescriptions(menuItems), live: false };
  },

  // Edited at /admin → Coming Soon (Toast has no concept of "not on the menu yet").
  async getComingSoon() {
    const content = await loadContent();
    if (content) return content.comingSoon;
    await mockDelay();
    return comingSoon;
  },
};
