// Item descriptions from Game On's website menu live in menuDescriptions.json (shared with the
// server, which applies them to the live Toast menu). Priority: admin edit (/admin → Menu) >
// Toast's own description > website description. This file covers the app's built-in fallback menu.
import websiteDescriptions from './menuDescriptions.json';

// Wing descriptions show once at the top of each wing section (src/data/menu.ts), not on every size.
export const WINGS_TRADITIONAL = 'Our popular chicken wings tossed in one of many sauces. Served with homemade ranch or bleu cheese.';
export const WINGS_BONELESS = 'Hand-cut chicken chunks, breaded to order, tossed in any sauce. Served with homemade ranch or bleu cheese.';

const BY_NAME = websiteDescriptions as Record<string, string>;

/** "Steak N' Melt Single" -> "steak n melt single", "Jalapeño" -> "jalapeno". Same rule as the server. */
export const normalizeMenuName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function descriptionFor(name: string): string | undefined {
  const key = normalizeMenuName(name);
  if (key.startsWith('jr ') || key.startsWith('_')) return undefined; // kids items have no website descriptions
  return BY_NAME[key];
}

/** Wing sauces & dry rubs from the website, shown with the wing sections. */
export const WING_SAUCES = {
  lessHot: ['Teriyaki', 'Parmesan Garlic', 'Kentucky Bourbon', 'BBQ', 'Asian Ginger', 'Carolina Gold'],
  medium: ['Medium', 'Honey Chipotle', 'Garlic'],
  moreHot: ['Buffalo', '24K Gold', 'Hot', 'Tropical Habanero', 'End Zone', 'Reaper', 'Shut Up BBQ'],
  dryRubs: ['Sweet Heat', 'Kickin’ Ranch', 'Westside Wild Fire', 'Jamaican Jerk', 'Melt Your Face'],
  new: ['Hot Honey', 'Sweet Chili', 'Golden Zing'],
};
