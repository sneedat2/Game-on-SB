// Reads Game On's live menu + sold-out status from the Toast API and maps it into the app's
// MenuItem shape (see src/types/index.ts). Credentials come from environment variables set in
// Railway -> Variables; they never ship inside the app.
//
//   TOAST_API_HOST          e.g. https://ws-api.toasttab.com (shown with your Toast API credentials)
//   TOAST_CLIENT_ID
//   TOAST_CLIENT_SECRET
//   TOAST_RESTAURANT_GUID   your location's GUID (sent as Toast-Restaurant-External-ID)

const env = (k) => (process.env[k] ?? '').trim();

export class ToastConfigError extends Error {}

function requireConfig() {
  const missing = ['TOAST_API_HOST', 'TOAST_CLIENT_ID', 'TOAST_CLIENT_SECRET', 'TOAST_RESTAURANT_GUID'].filter((k) => !env(k));
  if (missing.length) throw new ToastConfigError(`Toast is not configured (missing ${missing.join(', ')})`);
  return env('TOAST_API_HOST').replace(/\/+$/, '');
}

// ---------------- Auth ----------------

let token = null; // { value, expiresAt }

async function accessToken(host) {
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;
  const res = await fetch(`${host}/authentication/v1/authentication/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: env('TOAST_CLIENT_ID'),
      clientSecret: env('TOAST_CLIENT_SECRET'),
      userAccessType: 'TOAST_MACHINE_CLIENT',
    }),
  });
  if (!res.ok) throw new Error(`Toast login failed (HTTP ${res.status}) - check TOAST_CLIENT_ID / TOAST_CLIENT_SECRET`);
  const body = await res.json();
  token = { value: body.token.accessToken, expiresAt: Date.now() + (body.token.expiresIn ?? 3600) * 1000 };
  return token.value;
}

async function toastGet(host, path) {
  const res = await fetch(`${host}${path}`, {
    headers: {
      Authorization: `Bearer ${await accessToken(host)}`,
      'Toast-Restaurant-External-ID': env('TOAST_RESTAURANT_GUID'),
    },
  });
  if (!res.ok) throw new Error(`Toast ${path} failed (HTTP ${res.status})`);
  return res.json();
}

// ---------------- Mapping ----------------

// Toast menu/group names (lowercased) -> app section ids. Section titles, order and which Menu tab
// they appear on are defined in the app (src/data/menu.ts). Unmapped groups (e.g. NICOTINE) are skipped.
const SECTION_FOR = {
  appetizers: 'apps',
  'traditional wings': 'wings-traditional',
  'boneless wings': 'wings-boneless',
  entrees: 'entrees',
  sandwiches: 'sandwiches',
  'salad & soups': 'soups-salads',
  'salads & soups': 'soups-salads',
  'kids meal': 'kids',
  'kids meals': 'kids',
  sides: 'sides',
  'seasonal menu items': 'seasonal',
  'seasonal menu': 'seasonal',
  'lent menu': 'lent',
  beverages: 'beverages',
  summer: 'summer',
  'growler fill': 'growlers',
  'growler fills': 'growlers',
  togo: 'togo',
  'to go': 'togo',
};

const norm = (s) => String(s ?? '').trim().toLowerCase();
const onlineVisible = (item) => !Array.isArray(item.visibility) || item.visibility.length === 0 || item.visibility.includes('TOAST_ONLINE_ORDERING');
const priceOf = (item) => (typeof item.price === 'number' ? item.price : undefined);

export function mapToastMenu(menusPayload, outOfStockGuids = new Set()) {
  const items = [];
  const growlers = new Map(); // beer name -> item with sizes

  const visitGroup = (group, inheritedSection) => {
    const sectionId = SECTION_FOR[norm(group.name)] ?? inheritedSection;
    if (sectionId) {
      for (const item of group.menuItems ?? []) {
        if (!onlineVisible(item)) continue;
        const soldOut = outOfStockGuids.has(item.guid) || undefined;

        // Growler items are named like "32oz Blue Moon" / "64oz Blue Moon" -> one row with two sizes.
        const size = sectionId === 'growlers' ? /^(\d+)\s*oz\.?\s+(.+)$/i.exec(item.name.trim()) : null;
        if (size && priceOf(item) !== undefined) {
          const beer = size[2].trim();
          const row = growlers.get(beer.toLowerCase()) ?? { id: `growlers-${item.guid}`, sectionId, name: beer, sizes: [] };
          row.sizes.push({ label: `${size[1]} oz`, price: priceOf(item) });
          growlers.set(beer.toLowerCase(), row);
          continue;
        }

        items.push({
          id: item.guid,
          toastGuid: item.guid,
          sectionId,
          name: item.name.trim(),
          description: item.description?.trim() || undefined,
          price: priceOf(item),
          soldOut,
        });
      }
    }
    for (const child of group.menuGroups ?? []) visitGroup(child, sectionId);
  };

  for (const menu of menusPayload.menus ?? []) {
    const menuSection = SECTION_FOR[norm(menu.name)]; // e.g. "LENT MENU" with items directly under it
    for (const group of menu.menuGroups ?? []) visitGroup(group, menuSection);
  }

  for (const row of growlers.values()) {
    row.sizes.sort((a, b) => parseInt(a.label) - parseInt(b.label));
    items.push(row);
  }
  return items;
}

// ---------------- Public ----------------

export async function fetchToastMenu() {
  const host = requireConfig();
  const menus = await toastGet(host, '/menus/v2/menus');

  // Sold-out status is optional: skip quietly if the credentials lack the stock scope.
  let outOfStock = new Set();
  try {
    const inventory = await toastGet(host, '/stock/v1/inventory?status=OUT_OF_STOCK');
    outOfStock = new Set((inventory ?? []).filter((i) => i.status === 'OUT_OF_STOCK').map((i) => i.guid));
  } catch (e) {
    console.warn('[toast] stock lookup skipped:', e.message);
  }

  const items = mapToastMenu(menus, outOfStock);
  if (items.length === 0) throw new Error('Toast returned no menu items that match the app sections');
  return { items, source: 'toast', fetchedAt: new Date().toISOString() };
}
