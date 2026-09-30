import type { Coupon, LoyaltyAccount, RedemptionCode } from '@/types';
import { mockCoupons, mockLoyaltyLookup } from '@/data/mock/rewards';
import { isLive } from './config';
import { mockDelay, randomId, readJSON, writeJSON } from './storage';
import { ensureSession, invokeFunction, supabase } from './supabase';

export const REDEMPTION_TTL_MINUTES = 10;

export interface RewardsService {
  /** Toast Loyalty lookup by phone. Returns null if no guest is enrolled with that number. */
  lookupByPhone(phone: string): Promise<LoyaltyAccount | null>;
  listCoupons(): Promise<Coupon[]>;
  /** Issues a short-lived, single-use code for staff to scan or key in at the POS. */
  issueRedemption(couponId: string): Promise<RedemptionCode>;
  /** Coupon ids this guest has already redeemed. */
  redeemedIds(): Promise<string[]>;
}

// ---------------- Mock ----------------

// Mock mode has no staff scanner, so a single-use coupon counts as used once its code expires.
const ISSUED_KEY = 'issued-codes';
type IssuedCodes = Record<string, RedemptionCode>;
const isExpired = (r: RedemptionCode) => new Date(r.expiresAt).getTime() <= Date.now();

const mockRewards: RewardsService = {
  async lookupByPhone(phone) {
    await mockDelay(600);
    return mockLoyaltyLookup(phone);
  },
  async listCoupons() {
    await mockDelay();
    return mockCoupons();
  },
  async issueRedemption(couponId) {
    await mockDelay(300);
    const issued = await readJSON<IssuedCodes>(ISSUED_KEY, {});
    const existing = issued[couponId];
    if (existing && !isExpired(existing)) return existing; // reopening the QR shows the same code
    const coupon = mockCoupons().find((c) => c.id === couponId);
    if (existing && coupon?.singleUse) throw new Error('This coupon has already been used.');

    const code = `GO-${randomId(6)}`;
    const issuedAt = new Date();
    const redemption: RedemptionCode = {
      couponId,
      code,
      payload: `gameon://redeem?c=${encodeURIComponent(couponId)}&code=${code}`,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + REDEMPTION_TTL_MINUTES * 60_000).toISOString(),
    };
    await writeJSON(ISSUED_KEY, { ...issued, [couponId]: redemption });
    return redemption;
  },
  async redeemedIds() {
    const issued = await readJSON<IssuedCodes>(ISSUED_KEY, {});
    const singleUse = new Set(mockCoupons().filter((c) => c.singleUse).map((c) => c.id));
    return Object.values(issued)
      .filter((r) => singleUse.has(r.couponId) && isExpired(r))
      .map((r) => r.couponId);
  },
};

// ---------------- Live ----------------

const liveRewards: RewardsService = {
  lookupByPhone: (phone) =>
    invokeFunction<LoyaltyAccount | null>('toast-proxy', { action: 'loyalty.lookup', phone: phone.replace(/\D/g, '') }),
  async listCoupons() {
    await ensureSession();
    // coupon_progress is RLS-scoped to the current guest, so the embed returns only their row.
    const { data, error } = await supabase()
      .from('coupons')
      .select('*, coupon_progress(current)')
      .eq('active', true)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      description: r.description,
      finePrint: r.fine_print,
      expiresOn: r.expires_on,
      singleUse: r.single_use,
      tracker: r.tracker_goal
        ? { current: r.coupon_progress?.[0]?.current ?? 0, goal: r.tracker_goal, unit: r.tracker_unit }
        : undefined,
    }));
  },
  async issueRedemption(couponId) {
    const { data, error } = await supabase().rpc('issue_redemption_code', {
      p_coupon_id: couponId,
      p_ttl_minutes: REDEMPTION_TTL_MINUTES,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return {
      couponId,
      code: row.code,
      payload: `gameon://redeem?c=${encodeURIComponent(couponId)}&code=${row.code}`,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
    };
  },
  async redeemedIds() {
    const { data, error } = await supabase().from('coupon_redemptions').select('coupon_id').eq('status', 'redeemed');
    if (error) throw error;
    return (data ?? []).map((r) => r.coupon_id);
  },
};

export const rewardsService: RewardsService = isLive ? liveRewards : mockRewards;
