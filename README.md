# Game On Sports Bar & Grill — Mobile App

Expo (SDK 57) + TypeScript + Expo Router + NativeWind. Runs entirely on mock data out of the box;
flip one env var to go live on Supabase + Toast.

**5880 Cheviot Rd, Cincinnati, OH 45247 · (513) 385-9999**

## Quick start

```bash
npm install
npx expo start          # press i / a for simulators, or scan with Expo Go
npx expo start --web    # browser preview
npm run typecheck
```

Mock mode needs no accounts. On the Rewards tab, the demo number `(513) 555-0142` returns a sample
All-Star member; any 10-digit number returns a generated guest.

> Note: `package.json` pins `source-map-js` to 1.2.1 via `overrides` because the 1.2.2 tarball
> returned 404 from the npm registry at scaffold time. Remove the override once that's resolved.

## What's in the app

| Tab | Features |
| --- | --- |
| **Home** | Gameday countdown banner (Bengals / Bearcats / Reds / FC Cincinnati) with bucket & souvenir-cup specials · **6 PM Surprise** widget (countdown → 1-hour unlock → "next unlock" state, alert toggle) · quick actions · featured poll |
| **Menu** | **Food** tab: Appetizers → Traditional Wings → Boneless Wings → Entrées → Sandwiches → Salads & Soups → Kids Meals → Sides → Beverages · **Bar 21+** tab: draft (16 oz / 22 oz stadium pours), bottles & cans, seltzers · **Coming Soon** new food & drinks (incl. poll winners) · Toast online ordering in an in-app browser |
| **Polls** | "Game On Wants to Know" feed with category filters, animated result bars on vote, **"We Made It Happen"** showcase of winners |
| **Rewards** | Phone-number loyalty lookup (points, tier, progress, redeemable rewards) · coupon stash with timed, single-use QR codes + short fallback code |
| **Info** | Address, Call Bar, Directions, hours, ordering & social links |

All bar-time logic (happy hour, 6 PM unlock) uses the bar's time zone (`America/New_York`), not the phone's.

**Dev tip:** in development builds, long-press the 6 PM Surprise card to cycle through its
`live` / `ended` / `counting-down` states without waiting for 6 PM.

## Project layout

```
src/
  app/                 Expo Router routes
    (tabs)/            index (Home), menu, polls, rewards, info
    coupon/[id].tsx    modal: confirm → timed QR
  components/          GamedayBanner, FlashDealWidget, PollCard, CouponCard, RedemptionQR, ui primitives
  services/            one interface per domain, with mock + live implementations
    config.ts          EXPO_PUBLIC_DATA_SOURCE switch (mock | live)
    supabase.ts        client, anonymous session, Edge Function invoker
    polls.ts gameday.ts menu.ts rewards.ts notifications.ts ordering.ts
  data/mock/           sample menu, polls, games, rewards (clearly labeled SAMPLE DATA)
  lib/time.ts          bar-timezone clock, flash-deal state machine, formatters
supabase/
  migrations/0001_init.sql   tables, RLS, RPCs (cast_vote, issue_redemption_code, redeem_code)
  seed.sql
  functions/toast-proxy      Toast menu + loyalty lookup gateway
  functions/flash-deal-push  6 PM Expo push blast (pg_cron)
```

Screens only talk to `services/*`. Each service exports a single object that is either the mock or
the live implementation, so going live changes no UI code.

## Going live

1. **Supabase**: create a project, enable *Anonymous sign-ins* (Auth → Providers), then
   `supabase db push` (or paste `migrations/0001_init.sql`) and optionally `seed.sql`.
2. **Env**: copy `.env.example` → `.env`, set `EXPO_PUBLIC_DATA_SOURCE=live`, URL and anon key.
3. **Edge Functions**: `supabase functions deploy toast-proxy flash-deal-push` and set secrets
   listed at the top of each file (`supabase secrets set TOAST_CLIENT_ID=...`).
4. **Push**: `npx eas-cli@latest init` → put the project id in `EXPO_PUBLIC_EAS_PROJECT_ID`.
   Remote push needs a development build (`npx expo run:ios|android` or `eas build --profile development`) —
   Expo Go on Android doesn't support remote push. Local 6 PM alerts work everywhere except web.
5. **Staff**: insert bar staff user ids into `public.staff` so they can manage polls/deals and call
   `redeem_code()` when scanning a guest's QR.

### Security model

- Guests are anonymous Supabase users; RLS limits votes, push tokens, redemptions and coupon
  progress to `auth.uid()`.
- Vote counts are a trigger-maintained counter on `poll_options` (public + Realtime). Individual
  votes stay private.
- `flash_deals` rows are invisible to guests until 6 PM bar time, so the surprise can't be read early.
- Coupon codes are generated server-side, expire after 10 minutes, and single-use coupons are
  enforced in `issue_redemption_code` / `redeem_code`.
- Toast credentials live only in Edge Function secrets. `flash-deal-push` requires the
  service-role key, so app users can't trigger a push blast.

## ⚠️ Toast integration — read before promising "check your Toast points"

- **Online ordering** works today: it opens `https://order.toasttab.com/online/game-on-bar-and-grill`.
- **Menu sync** uses Toast's Menus API (`/menus/v2/menus`) with machine-client auth. It needs Toast
  API credentials for this restaurant (Toast developer portal / Partner Connect). Adjust `SECTION_MAP`
  in `toast-proxy` to the bar's real menu groups.
- **Loyalty lookup is not wired**: Toast's documented loyalty integration API is *inbound*. Toast
  calls a loyalty provider's service; I found no documented endpoint for reading a guest's native
  Toast Loyalty balance. Two options:
  - **A.** Ask Toast whether read access to Toast Loyalty balances is available for this restaurant,
    then implement `lookupLoyalty()` in `toast-proxy`.
  - **B.** Run the points program in Supabase and register it as a Toast loyalty integration, so the POS
    accrues and redeems against your data. The app then reads points straight from Supabase.
  Until then, live mode returns HTTP 501 for lookups; mock mode demos the full UX.
- **Coupon redemption at the POS**: Toast won't read these QR codes natively. Staff scan or key in
  the code via a staff screen that calls `redeem_code()`, then apply the matching Toast discount
  (`coupons.toast_discount_guid`).

## Before launch checklist

- [ ] Replace sample menu, prices and Coming Soon items (`src/data/mock/*`) or go live
- [ ] Confirm real **hours** (`src/constants/bar.ts` — currently placeholders)
- [x] Facebook: https://www.facebook.com/gameonwestside
- [ ] Set real **Instagram** URL (`BAR.social.instagram` — currently a search fallback)
- [ ] App icon / splash (`assets/`), bundle ids in `app.json`
- [ ] Decide loyalty path A or B above
- [ ] Responsible-service review of drink promos per Ohio liquor rules (e.g. happy-hour restrictions)
