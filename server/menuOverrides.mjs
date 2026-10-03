// Admin edits layered on top of the live Toast menu (/admin → Menu): hide items or whole sections,
// rename items, and set or remove descriptions. Prices and sold-out status always come from Toast.
//
// Description priority: admin edit > Toast's own description > website description
// (src/data/menuDescriptions.json, shared with the app).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const websiteDescriptions = JSON.parse(readFileSync(join(root, 'src', 'data', 'menuDescriptions.json'), 'utf8'));

/** Menu sections in app order (titles match src/data/menu.ts). */
export const MENU_SECTIONS = [
  { id: 'apps', title: 'Appetizers', tab: 'Food' },
  { id: 'wings-traditional', title: 'Traditional Wings', tab: 'Food' },
  { id: 'wings-boneless', title: 'Boneless Wings', tab: 'Food' },
  { id: 'entrees', title: 'Entrées', tab: 'Food' },
  { id: 'sandwiches', title: 'Sandwiches', tab: 'Food' },
  { id: 'soups-salads', title: 'Salads & Soups', tab: 'Food' },
  { id: 'kids', title: 'Kids Meals', tab: 'Food' },
  { id: 'sides', title: 'Sides', tab: 'Food' },
  { id: 'seasonal', title: 'Seasonal Menu', tab: 'Food' },
  { id: 'lent', title: 'Lent Menu', tab: 'Food' },
  { id: 'beverages', title: 'Beverages', tab: 'Food' },
  { id: 'draft', title: 'On Tap', tab: 'Bar 21+' },
  { id: 'bottles', title: 'Bottles & Cans', tab: 'Bar 21+' },
  { id: 'seltzers', title: 'Seltzers', tab: 'Bar 21+' },
  { id: 'cocktails', title: 'Cocktails & Shots', tab: 'Bar 21+' },
  { id: 'wine', title: 'Wine', tab: 'Bar 21+' },
];
export const MENU_SECTION_IDS = MENU_SECTIONS.map((s) => s.id);

/** Same rule as the app: "Steak N' Melt Single" -> "steak n melt single". */
export const normalizeName = (name) =>
  String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Stable id for an item across Toast refreshes: section + name as it comes from Toast. */
export const itemKey = (item) => `${item.sectionId}|${normalizeName(item.name)}`;

function websiteDescription(name) {
  const key = normalizeName(name);
  if (key.startsWith('jr ') || key.startsWith('_')) return undefined;
  return websiteDescriptions[key];
}

/** Adds the stable key and the base description (Toast's, else the website's). */
export function withBase(items) {
  return items.map((i) => ({ ...i, key: itemKey(i), description: i.description || websiteDescription(i.name) }));
}

export const BAR_SECTION_IDS = MENU_SECTIONS.filter((s) => s.tab === 'Bar 21+').map((s) => s.id);
const isBar = (id) => BAR_SECTION_IDS.includes(id);

/** The section part of an item key ("bottles|bud light" -> "bottles"). */
export const sectionOfKey = (key) => String(key).split('|')[0];

/**
 * The menu guests see: base menu with the admin's edits applied. Returns the items plus the Bar 21+
 * sub-categories (e.g. On Tap → Domestics, IPAs), in the admin's order; grouped items carry `subgroup`.
 */
export function applyOverrides(items, overrides) {
  const hiddenSections = new Set(overrides?.hiddenSections ?? []);
  const edits = overrides?.items ?? {};
  const groups = overrides?.barGroups ?? [];
  const parentOf = new Map(groups.map((g) => [g.id, g.parent]));
  const hideBarPrices = Boolean(overrides?.hideBarPrices);
  const out = [];
  for (const item of withBase(items)) {
    const edit = edits[item.key];
    if (hiddenSections.has(item.sectionId) || edit?.hidden) continue;
    const { key: _key, ...rest } = item;
    const bar = isBar(rest.sectionId);
    // A drink can sit in one of its section's sub-categories (On Tap → Domestics, IPAs, ...).
    const subgroup = bar && edit?.group && parentOf.get(edit.group) === rest.sectionId ? edit.group : undefined;
    const next = {
      ...rest,
      ...(subgroup && { subgroup }),
      name: edit?.name || rest.name,
      // '' tells the app "no description" (so it doesn't fill one back in).
      description: edit?.noDescription ? '' : edit?.description || rest.description,
    };
    if (bar && hideBarPrices) {
      // Names only: prices and pour sizes aren't sent at all.
      delete next.price;
      delete next.sizes;
    }
    out.push(next);
  }
  const subgroups = groups
    .filter((g) => out.some((i) => i.subgroup === g.id))
    .map((g) => ({ id: g.id, title: g.name, sectionId: g.parent }));
  return { items: out, subgroups };
}
