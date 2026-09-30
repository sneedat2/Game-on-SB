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
  // In-house bar menu (usually POS-only in Toast). Add your exact Toast group names here if they
  // differ - GET /api/menu/groups lists them.
  draft: 'draft',
  drafts: 'draft',
  'draft beer': 'draft',
  'draft beers': 'draft',
  'on tap': 'draft',
  'beer on tap': 'draft',
  taps: 'draft',
  bottles: 'bottles',
  'bottled beer': 'bottles',
  'bottle beer': 'bottles',
  'bottles & cans': 'bottles',
  'bottles and cans': 'bottles',
  cans: 'bottles',
  'canned beer': 'bottles',
  'can beer': 'bottles',
  'domestic bottles': 'bottles',
  'import bottles': 'bottles',
  'craft cans': 'bottles',
  seltzers: 'seltzers',
  seltzer: 'seltzers',
  'hard seltzers': 'seltzers',
  cocktails: 'cocktails',
  'mixed drinks': 'cocktails',
  'signature cocktails': 'cocktails',
  shots: 'cocktails',
  wine: 'wine',
  wines: 'wine',
  // Intentionally unmapped (hidden in the app): NICOTINE, and the discontinued Summer, Growler Fill
  // and TOGO groups.
};

const norm = (s) => String(s ?? '').trim().toLowerCase();

// Food follows the online ordering page. Bar drinks are served in-house, so items that only show on
// the register (POS) count too.
const IN_HOUSE_SECTIONS = new Set(['draft', 'bottles', 'seltzers', 'cocktails', 'wine']);
function isShown(item, sectionId) {
  const v = item.visibility;
  if (!Array.isArray(v) || v.length === 0) return true;
  if (v.includes('TOAST_ONLINE_ORDERING')) return true;
  return IN_HOUSE_SECTIONS.has(sectionId) && v.includes('POS');
}
const priceOf = (item) => (typeof item.price === 'number' ? item.price : undefined);

export function mapToastMenu(menusPayload, outOfStockGuids = new Set()) {
  const items = [];

  const visitGroup = (group, inheritedSection) => {
    const sectionId = SECTION_FOR[norm(group.name)] ?? inheritedSection;
    if (sectionId) {
      for (const item of group.menuItems ?? []) {
        if (!isShown(item, sectionId)) continue;
        items.push({
          id: item.guid,
          toastGuid: item.guid,
          sectionId,
          name: item.name.trim(),
          description: item.description?.trim() || undefined,
          price: priceOf(item),
          soldOut: outOfStockGuids.has(item.guid) || undefined,
        });
      }
    }
    for (const child of group.menuGroups ?? []) visitGroup(child, sectionId);
  };

  for (const menu of menusPayload.menus ?? []) {
    const menuSection = SECTION_FOR[norm(menu.name)]; // e.g. "LENT MENU" with items directly under it
    for (const group of menu.menuGroups ?? []) visitGroup(group, menuSection);
  }
  return items;
}

/** Every Toast menu/group name with its item count and which app section it maps to (or null). */
export function listToastGroups(menusPayload) {
  const rows = [];
  const visit = (menuName, group, inherited, depth) => {
    const mappedTo = SECTION_FOR[norm(group.name)] ?? inherited ?? null;
    rows.push({ menu: menuName, group: `${'  '.repeat(depth)}${group.name}`, items: (group.menuItems ?? []).length, mappedTo });
    for (const child of group.menuGroups ?? []) visit(menuName, child, mappedTo ?? undefined, depth + 1);
  };
  for (const menu of menusPayload.menus ?? []) {
    for (const group of menu.menuGroups ?? []) visit(menu.name, group, SECTION_FOR[norm(menu.name)], 0);
  }
  return rows;
}

// ---------------- Public ----------------

export async function fetchToastGroups() {
  return listToastGroups(await toastGet(requireConfig(), '/menus/v2/menus'));
}

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
