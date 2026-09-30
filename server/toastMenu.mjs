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

// ---------------- Sizes (draft beer pours) ----------------
// Beers show as one row - "Astra Baja Black" - with each pour listed small by its price
// ("16 oz $5.50", "20 oz $6.50"). Toast can hold sizes two ways; both are handled:
//   1. Size pricing: one item whose sizes live in a Size modifier group.
//   2. Separate items per size: "Astra Baja Black 16oz", "16 oz Astra Baja Black", "Truth (20 oz)".

const SIZE = String.raw`(?:\d{1,2}(?:\.\d)?\s*(?:oz|ounces?)\.?|pint|pitcher)`;
const SIZE_PREFIX = new RegExp(String.raw`^\(?(${SIZE})\)?\s*[-–:]?\s+(.+)$`, 'i');
const SIZE_SUFFIX = new RegExp(String.raw`^(.+?)\s*[-–:]?\s*\(?(${SIZE})\)?$`, 'i');

/** "16oz" -> "16 oz", "pint" -> "Pint" */
function sizeLabel(raw) {
  const s = String(raw).trim();
  const oz = /^(\d{1,2}(?:\.\d)?)\s*(?:oz|ounces?)\.?$/i.exec(s);
  return oz ? `${oz[1]} oz` : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
const sizeOrder = (label) => parseFloat(label) || { pint: 16, pitcher: 60 }[label.toLowerCase()] || 999;

/** Splits "Truth 16oz" into { base: "Truth", size: "16 oz" }; null if the name has no size. */
function splitSize(name) {
  const pre = SIZE_PREFIX.exec(name);
  if (pre) return { base: pre[2].trim(), size: sizeLabel(pre[1]) };
  const suf = SIZE_SUFFIX.exec(name);
  if (suf && suf[1].trim().length > 1) return { base: suf[1].trim(), size: sizeLabel(suf[2]) };
  return null;
}

/** Sizes from Toast size pricing (pricingStrategy SIZE_PRICE -> Size modifier group), if any. */
function makeSizeLookup(menusPayload) {
  const groups = new Map(Object.values(menusPayload.modifierGroupReferences ?? {}).map((g) => [g.guid, g]));
  const options = menusPayload.modifierOptionReferences ?? {};
  return (item) => {
    const group = groups.get(item.pricingRules?.sizeSpecificPricingGuid);
    if (!group) return null;
    const sizes = (group.modifierOptionReferences ?? [])
      .map((ref) => options[ref])
      .filter((o) => o && typeof o.price === 'number')
      .map((o) => ({ label: sizeLabel(o.name), price: o.price }))
      .sort((a, b) => sizeOrder(a.label) - sizeOrder(b.label));
    return sizes.length ? sizes : null;
  };
}

export function mapToastMenu(menusPayload, outOfStockGuids = new Set()) {
  const items = [];
  const sizesOf = makeSizeLookup(menusPayload);
  const pours = new Map(); // "draft|astra baja black" -> merged row

  const visitGroup = (group, inheritedSection) => {
    const sectionId = SECTION_FOR[norm(group.name)] ?? inheritedSection;
    if (sectionId) {
      for (const item of group.menuItems ?? []) {
        if (!isShown(item, sectionId)) continue;
        const name = item.name.trim();
        const soldOut = outOfStockGuids.has(item.guid);

        // Separate items per pour size -> one row per beer.
        const split = sectionId === 'draft' && priceOf(item) !== undefined ? splitSize(name) : null;
        if (split) {
          const key = `${sectionId}|${split.base.toLowerCase()}`;
          let row = pours.get(key);
          if (!row) {
            row = { id: item.guid, toastGuid: item.guid, sectionId, name: split.base, sizes: [], soldSizes: 0, totalSizes: 0 };
            pours.set(key, row);
            items.push(row); // keeps Toast's order
          }
          row.totalSizes++;
          if (soldOut) row.soldSizes++;
          else row.sizes.push({ label: split.size, price: priceOf(item) });
          if (!row.description && item.description?.trim()) row.description = item.description.trim();
          continue;
        }

        items.push({
          id: item.guid,
          toastGuid: item.guid,
          sectionId,
          name,
          description: item.description?.trim() || undefined,
          price: priceOf(item),
          sizes: sizesOf(item) ?? undefined,
          soldOut: soldOut || undefined,
        });
      }
    }
    for (const child of group.menuGroups ?? []) visitGroup(child, sectionId);
  };

  for (const menu of menusPayload.menus ?? []) {
    const menuSection = SECTION_FOR[norm(menu.name)]; // e.g. "LENT MENU" with items directly under it
    for (const group of menu.menuGroups ?? []) visitGroup(group, menuSection);
  }

  // Finish merged pour rows: sort sizes small -> large; sold out only when every size is.
  for (const row of pours.values()) {
    row.sizes.sort((a, b) => sizeOrder(a.label) - sizeOrder(b.label));
    row.soldOut = row.soldSizes === row.totalSizes || undefined;
    delete row.soldSizes;
    delete row.totalSizes;
    if (row.sizes.length === 0) delete row.sizes;
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
