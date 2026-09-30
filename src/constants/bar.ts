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
  social: {
    facebook: 'https://www.facebook.com/gameonwestside',
    // TODO: replace with the bar's real Instagram profile; falls back to a search until confirmed.
    instagram: 'https://www.instagram.com/explore/search/keyword/?q=game%20on%20bar%20cincinnati',
  },
  hours: [
    // TODO: confirm real hours with the bar.
    { days: 'Mon–Thu', open: '11 AM', close: '12 AM' },
    { days: 'Fri–Sat', open: '11 AM', close: '2:30 AM' },
    { days: 'Sun', open: '11 AM', close: '12 AM' },
  ],
} as const;

export const fullAddress = `${BAR.address.street}, ${BAR.address.city}, ${BAR.address.state} ${BAR.address.zip}`;

/** Happy hour ends and the "6 PM Surprise" unlocks at this hour (bar local time), for this many minutes. */
export const FLASH_DEAL = {
  unlockHour: 18,
  durationMinutes: 60,
} as const;

export const TEAMS = {
  bengals: { name: 'Bengals', league: 'NFL', color: '#FB4F14', accent: '#000000' },
  bearcats: { name: 'Bearcats', league: 'NCAA', color: '#E00122', accent: '#000000' },
  reds: { name: 'Reds', league: 'MLB', color: '#C6011F', accent: '#FFFFFF' },
  fcc: { name: 'FC Cincinnati', league: 'MLS', color: '#F05323', accent: '#263B80' },
} as const;
