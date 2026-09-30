// Supabase Edge Function (Deno): Toast loyalty lookup for the Rewards tab (live mode).
// The live MENU is served by server/index.mjs on Railway (GET /api/menu), not by this function.
//
// Actions: { action: 'loyalty.lookup', phone: string }

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
    if (action !== 'loyalty.lookup') {
      return Response.json({ error: `Unknown action ${action}` }, { status: 400, headers: cors });
    }
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.length !== 10) return Response.json({ error: 'Invalid phone' }, { status: 400, headers: cors });
    // Never cached: balances change at the register.
    return Response.json(await lookupLoyalty(digits), { headers: cors });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502;
    return Response.json({ error: (e as Error).message }, { status, headers: cors });
  }
});
