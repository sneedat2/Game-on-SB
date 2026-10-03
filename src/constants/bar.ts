export const BAR = {
  name: 'Game On Sports Bar & Grill',
  shortName: 'Game On',
  address: {
    street: '5880 Cheviot Rd',
    city: 'Cincinnati',
    state: 'OH',
    zip: '45247',
  },
  phone: '(513) 385-9999',
  phoneE164: '+15133859999',
  timeZone: 'America/New_York',
  orderingUrl: 'https://order.toasttab.com/online/game-on-bar-and-grill',
  // Toast Rewards pages for Game On. Toast doesn't let apps read balances, so guests check their
  // real points (by email or phone) on Toast's own page, opened inside the app.
  rewards: {
    lookupUrl: 'https://www.toasttab.com/game-on-bar-and-grill/rewardsLookup',
    signupUrl: 'https://www.toasttab.com/game-on-bar-and-grill/rewardsSignup',
    program: 'Earn 1 point for every $1 spent and unlock $4 off every 100 points.', // as shown on Toast's signup page
  },
  social: {
    facebook: 'https://www.facebook.com/gameonwestside',
    // TikTok is set in the admin (/admin → Hours & Happy Hour) - see services/settings.ts.
  },
  // Hours and happy hour are edited in the admin - see services/settings.ts for the defaults.
} as const;

export const fullAddress = `${BAR.address.street}, ${BAR.address.city}, ${BAR.address.state} ${BAR.address.zip}`;

export const TEAMS = {
  bengals: { name: 'Bengals', league: 'NFL', color: '#FB4F14', accent: '#000000' },
  bearcats: { name: 'Bearcats', league: 'NCAA', color: '#E00122', accent: '#000000' },
  reds: { name: 'Reds', league: 'MLB', color: '#C6011F', accent: '#FFFFFF' },
  fcc: { name: 'FC Cincinnati', league: 'MLS', color: '#F05323', accent: '#263B80' },
} as const;
