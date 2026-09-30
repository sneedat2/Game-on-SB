// SAMPLE DATA - mock Toast Loyalty guests and coupon wallet.
// In mock mode, any 10-digit phone number returns a guest; the demo number below returns a richer profile.
import type { Coupon, LoyaltyAccount, RewardsTier } from '@/types';

export const DEMO_PHONE = '5135550142';

export const tiers: { name: RewardsTier; minPoints: number }[] = [
  { name: 'Rookie', minPoints: 0 },
  { name: 'Starter', minPoints: 250 },
  { name: 'All-Star', minPoints: 750 },
  { name: 'Hall of Fame', minPoints: 1500 },
];

export function tierFor(points: number): Pick<LoyaltyAccount, 'tier' | 'nextTier'> {
  let index = 0;
  tiers.forEach((t, i) => {
    if (points >= t.minPoints) index = i;
  });
  const next = tiers[index + 1];
  return {
    tier: tiers[index].name,
    nextTier: next ? { name: next.name, pointsNeeded: next.minPoints - points } : undefined,
  };
}

const rewardsCatalog = [
  { id: 'r1', name: 'Free Fountain Drink', pointsCost: 50 },
  { id: 'r2', name: 'Free Order of Tots', pointsCost: 100 },
  { id: 'r3', name: 'Free 10 Wings', pointsCost: 200 },
  { id: 'r4', name: 'Game On T-Shirt', pointsCost: 400 },
];

export function mockLoyaltyLookup(phone: string): LoyaltyAccount | null {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return null;
  // Deterministic pseudo-random points so the same number always shows the same balance.
  const points = digits === DEMO_PHONE ? 820 : (Number(digits.slice(-4)) * 7) % 1600;
  return {
    guestId: `guest-${digits}`,
    firstName: digits === DEMO_PHONE ? 'Jordan' : 'Fan',
    phoneLast4: digits.slice(-4),
    points,
    ...tierFor(points),
    availableRewards: rewardsCatalog.filter((r) => r.pointsCost <= points),
  };
}

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

export const mockCoupons = (): Coupon[] => [
  {
    id: 'c-free-app',
    kind: 'free-app',
    title: 'Free App with Entrée',
    description: 'Any starter up to $12 free with the purchase of an entrée.',
    finePrint: 'One per table. Not valid with other offers. Dine-in only.',
    expiresOn: inDays(14),
    singleUse: true,
  },
  {
    id: 'c-kids',
    kind: 'kids-meal',
    title: 'Free Kids Meal with Entrée',
    description: 'One free kids meal per adult entrée purchased.',
    finePrint: 'Kids 12 & under. Dine-in only.',
    expiresOn: inDays(30),
    singleUse: true,
  },
  {
    id: 'c-wings',
    kind: 'wings-bogo',
    title: 'Buy 10 Wings, Get 10 Free',
    description: 'Order 10 wings in any flavor, get 10 more on us.',
    finePrint: 'Equal or lesser value. Not valid during gameday specials.',
    expiresOn: inDays(10),
    singleUse: true,
  },
  {
    id: 'c-half-apps',
    kind: 'half-apps',
    title: 'Half-Off Apps Club',
    description: 'Check in during 5 happy hours to unlock a half-off starters voucher.',
    finePrint: 'Voucher valid on one visit, dine-in only.',
    expiresOn: inDays(60),
    singleUse: false,
    tracker: { current: 3, goal: 5, unit: 'happy hour visits' },
  },
];
