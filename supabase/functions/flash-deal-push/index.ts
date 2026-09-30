// Supabase Edge Function (Deno): sends the "6 PM Surprise" push to every registered device.
// Complements the on-device local notifications (which work even without a backend).
//
// Schedule with pg_cron + pg_net. Cron runs in UTC, so schedule both 22:00 and 23:00 UTC and let
// the function no-op unless it's actually 6 PM in Cincinnati (handles EST/EDT automatically):
//
//   select cron.schedule('flash-deal-push', '0 22,23 * * *', $$
//     select net.http_post(
//       url := 'https://<project>.supabase.co/functions/v1/flash-deal-push',
//       headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
//     );
//   $$);
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100; // Expo accepts up to 100 messages per request

function barNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { hour: Number(parts.hour), date: `${parts.year}-${parts.month}-${parts.day}` };
}

Deno.serve(async (req) => {
  // The anon key is a valid JWT too, so require the service-role key explicitly - otherwise any
  // app user could trigger a push blast.
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const force = new URL(req.url).searchParams.get('force') === '1';
  const { hour, date } = barNow();
  if (hour !== 18 && !force) return Response.json({ skipped: true, hour });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  const { data: deal } = await admin.from('flash_deals').select('title').eq('deal_date', date).maybeSingle();
  const { data: tokens, error } = await admin.from('push_tokens').select('token');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const messages = (tokens ?? []).map(({ token }) => ({
    to: token,
    title: '🔓 The 6 PM Surprise is live!',
    body: deal ? `Tonight: ${deal.title}. One hour only at Game On.` : 'Tap to see tonight\'s 1-hour flash deal.',
    data: { url: '/' },
    channelId: 'flash-deals',
    sound: 'default',
  }));

  let sent = 0;
  const invalid: string[] = [];
  for (let i = 0; i < messages.length; i += BATCH) {
    const chunk = messages.slice(i, i + BATCH);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk),
    });
    const body = await res.json();
    (body.data ?? []).forEach((ticket: { status: string; details?: { error?: string } }, j: number) => {
      if (ticket.status === 'ok') sent++;
      else if (ticket.details?.error === 'DeviceNotRegistered') invalid.push(chunk[j].to);
    });
  }

  // Prune uninstalled devices so the list stays clean.
  if (invalid.length) await admin.from('push_tokens').delete().in('token', invalid);

  return Response.json({ sent, pruned: invalid.length, total: messages.length });
});
