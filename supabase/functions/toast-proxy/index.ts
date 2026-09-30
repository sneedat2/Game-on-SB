// Supabase Edge Function (Deno): server-side gateway to Toast.
// Keeps all POS credentials off the device, caches responses, and maps vendor payloads into the
// app's domain types (see src/types/index.ts).
//
// Secrets (supabase secrets set ...):
//   TOAST_API_HOST               e.g. https://ws-api.toasttab.com (sandbox host differs - see Toast portal)
//   TOAST_CLIENT_ID / TOAST_CLIENT_SECRET   Partner or Standard API credentials
//   TOAST_RESTAURANT_GUID        sent as Toast-Restaurant-External-ID
//
// Actions: { action: 'menu.get' | 'loyalty.lookup', phone?: string }

const env = (k: string) => Deno.env.get(k) ?? '';
const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

// ---------------- Toast ----------------

let toastToken: { value: string; expiresAt: number } | null = null;

async function toastAuth(): Promise<string> {
  if (toastToken && Date.now() < toastToken.expiresAt - 60_000) return toastToken.value;
  const res = await fetch(`${env('TOAST_API_HOST')}/authentication/v1/authentication/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: env('TOAST_CLIENT_ID'),
      clientSecret: env('TOAST_CLIENT_SECRET'),
      userAccessType: 'TOAST_MACHINE_CLIENT',
    }),
  });
  if (!res.ok) throw new Error(`Toast auth failed: ${res.status}`);
  const body = await res.json();
  toastToken = { value: body.token.accessToken, expiresAt: Date.now() + body.token.expiresIn * 1000 };
  return toastToken.value;
}

async function toastGet(path: string) {
  const res = await fetch(`${env('TOAST_API_HOST')}${path}`, {
    headers: {
      Authorization: `Bearer ${await toastAuth()}`,
      'Toast-Restaurant-External-ID': env('TOAST_RESTAURANT_GUID'),
    },
  });
  if (!res.ok) throw new Error(`Toast ${path} failed: ${res.status}`);
  return res.json();
}

// Map Toast menu group names -> app sections (names as they appear on the bar's Toast ordering page).
// Order here is the display order in the app; unmapped groups are skipped.
// kind: 'food' | 'beverage' (non-alcoholic, Food tab) | 'alcohol' (Bar tab).
const SECTION_MAP: Record<string, { id: string; kind: 'food' | 'beverage' | 'alcohol' }> = {
  appetizers: { id: 'apps', kind: 'food' },
  'traditional wings': { id: 'wings-traditional', kind: 'food' },
  'boneless wings': { id: 'wings-boneless', kind: 'food' },
  entrees: { id: 'entrees', kind: 'food' },
  sandwiches: { id: 'sandwiches', kind: 'food' },
  burgers: { id: 'sandwiches', kind: 'food' },
  'salad & soups': { id: 'soups-salads', kind: 'food' },
  'kids meal': { id: 'kids', kind: 'food' },
  sides: { id: 'sides', kind: 'food' },
  'seasonal menu items': { id: 'seasonal', kind: 'food' },
  'lent menu': { id: 'lent', kind: 'food' },
  beverages: { id: 'beverages', kind: 'beverage' },
  summer: { id: 'summer', kind: 'alcohol' },
  'growler fill': { id: 'growlers', kind: 'alcohol' },
  togo: { id: 'togo', kind: 'alcohol' },
  // 'nicotine cans' intentionally unmapped - app stores restrict nicotine promotion.
};
const SECTION_ORDER = [...new Set(Object.values(SECTION_MAP).map((s) => s.id))];

// deno-lint-ignore no-explicit-any
function mapToastMenu(payload: any) {
  const sections: { id: string; title: string; kind: string }[] = [];
  const items: Record<string, unknown>[] = [];
  for (const menu of payload.menus ?? []) {
    for (const group of menu.menuGroups ?? []) {
      const mapped = SECTION_MAP[String(group.name).toLowerCase()];
      if (!mapped) continue;
      if (!sections.some((s) => s.id === mapped.id)) sections.push({ id: mapped.id, title: group.name, kind: mapped.kind });
      for (const item of group.menuItems ?? []) {
        items.push({
          id: item.guid,
          toastGuid: item.guid,
          sectionId: mapped.id,
          name: item.name,
          description: item.description || undefined,
          price: typeof item.price === 'number' ? item.price : undefined,
        });
      }
    }
  }
  sections.sort((a, b) => SECTION_ORDER.indexOf(a.id) - SECTION_ORDER.indexOf(b.id));
  return { sections, items };
}

// ---------------- Loyalty ----------------
// IMPORTANT: Toast's loyalty integration API is *inbound* - Toast calls a loyalty provider's service
// (LOYALTY_SEARCH / ACCRUE / REDEEM). There is no documented public endpoint to read a guest's
// native Toast Loyalty balance. Two viable paths:
//   A) Ask Toast (Partner Connect) whether read access to Toast Loyalty guest balances is available
//      for this restaurant, then implement lookupLoyalty() against that endpoint.
//   B) Run the loyalty program in Supabase and register it as a Toast loyalty integration, so points
//      accrue at the POS and this function simply reads the guest's row.
async function lookupLoyalty(_phone: string): Promise<unknown> {
  throw Object.assign(new Error('Loyalty lookup is not connected yet. See supabase/functions/toast-proxy/index.ts.'), {
    status: 501,
  });
}

// ---------------- Handler ----------------

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { action, phone } = await req.json();
    let result: unknown;
    switch (action) {
      case 'menu.get':
        result = await cached('menu', async () => mapToastMenu(await toastGet('/menus/v2/menus')));
        break;
      case 'loyalty.lookup': {
        const digits = String(phone ?? '').replace(/\D/g, '');
        if (digits.length !== 10) return Response.json({ error: 'Invalid phone' }, { status: 400, headers: cors });
        result = await lookupLoyalty(digits); // never cached: balances change at the register
        break;
      }
      default:
        return Response.json({ error: `Unknown action ${action}` }, { status: 400, headers: cors });
    }
    return Response.json(result, { headers: cors });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502;
    return Response.json({ error: (e as Error).message }, { status, headers: cors });
  }
});
