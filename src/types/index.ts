// Domain types shared by the UI, mock data and live service implementations.
// Field names mirror the Supabase schema in supabase/migrations (snake_case is mapped at the service edge).

export type Team = 'bengals' | 'bearcats' | 'reds' | 'fcc';

export interface GamedayEvent {
  id: string;
  team: Team;
  opponent: string;
  homeAway: 'home' | 'away';
  startsAt: string; // ISO timestamp
  broadcast?: string;
  specials: string[]; // e.g. "$20 domestic buckets"
}

export interface FlashDeal {
  id: string;
  date: string; // YYYY-MM-DD in the bar's time zone
  title: string;
  description: string;
  finePrint?: string;
}

// ---------- Polls ----------

export type PollCategory = 'food' | 'drinks' | 'events' | 'debates';

export interface PollOption {
  id: string;
  label: string;
  emoji?: string;
  votes: number;
}

export interface Poll {
  id: string;
  category: PollCategory;
  question: string;
  options: PollOption[];
  closesAt: string;
  featured?: boolean;
}

export interface ShowcaseItem {
  id: string;
  title: string;
  description: string;
  pollQuestion: string;
  winningShare: number; // 0-100
  launchedOn: string; // ISO date
  status: 'on-menu' | 'coming-soon' | 'event-booked';
}

// ---------- Menu ----------

export type MenuSectionId =
  | 'apps'
  | 'wings-traditional'
  | 'wings-boneless'
  | 'entrees'
  | 'sandwiches'
  | 'soups-salads'
  | 'kids'
  | 'sides'
  | 'seasonal'
  | 'lent'
  | 'beverages'
  | 'draft'
  | 'bottles'
  | 'seltzers'
  | 'cocktails'
  | 'wine';

export interface MenuItem {
  id: string;
  sectionId: MenuSectionId;
  name: string;
  description?: string;
  price?: number;
  /** Items sold in sizes (draft pours, wing counts) list each size instead of a single price. */
  sizes?: { label: string; price: number }[];
  soldOut?: boolean; // mirrors Toast's "OUT OF STOCK"
  tags?: string[]; // "Local", "Spicy", "New", "Fan Pick"
  toastGuid?: string; // Toast menu item GUID once synced from the POS
}

export interface MenuSection {
  id: MenuSectionId;
  title: string;
  /** 'food' and 'beverage' (non-alcoholic) show on the Food tab; 'alcohol' on the Bar tab. */
  kind: 'food' | 'beverage' | 'alcohol';
  blurb?: string;
}

export interface ComingSoonItem {
  id: string;
  kind: 'food' | 'drink';
  title: string;
  description: string;
  eta: string; // free text, e.g. "Mid-October", "After voting closes"
  fromPoll?: boolean; // came from a "Game On Wants to Know" poll
}

// ---------- Rewards ----------

export type RewardsTier = 'Rookie' | 'Starter' | 'All-Star' | 'Hall of Fame';

export interface LoyaltyAccount {
  guestId: string;
  firstName: string;
  phoneLast4: string;
  points: number;
  tier: RewardsTier;
  nextTier?: { name: RewardsTier; pointsNeeded: number };
  availableRewards: { id: string; name: string; pointsCost: number }[];
}

export type CouponKind = 'free-app' | 'kids-meal' | 'wings-bogo' | 'half-apps';

export interface Coupon {
  id: string;
  kind: CouponKind;
  title: string;
  description: string;
  finePrint: string;
  expiresOn: string; // ISO date
  singleUse: boolean;
  /** For tracker-style promos (e.g. half-off apps): progress toward unlocking. */
  tracker?: { current: number; goal: number; unit: string };
}

export interface RedemptionCode {
  couponId: string;
  code: string; // short code staff can key in if scanning isn't available
  payload: string; // what gets encoded in the QR
  issuedAt: string;
  expiresAt: string;
}
