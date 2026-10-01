// Starting content for a brand-new admin store (first boot). Everything here is editable at /admin.
// Sample polls, deals, Coming Soon and showcase entries are placeholders - replace them in the admin.
import { randomUUID } from 'node:crypto';
import { defaultCheckins } from './checkins.mjs';
import { defaultHome } from './home.mjs';
import { defaultPhases, promosFromOldFlashDeals } from './promos.mjs';

const DAY_MS = 86_400_000;
const id = () => randomUUID().slice(0, 8);

const poll = (category, question, labels, { featured = false, days = 7 } = {}) => ({
  id: id(),
  category,
  question,
  featured,
  hidden: false,
  closesAt: new Date(Date.now() + days * DAY_MS).toISOString(),
  options: labels.map(([emoji, label]) => ({ id: id(), emoji, label })),
});

/** "Closed for maintenance" switch (admin → App Status). Off by default. */
export const defaultMaintenance = () => ({
  enabled: false,
  message: 'We’re making some upgrades. Be right back - come see us at 5880 Cheviot Rd in the meantime!',
});

/** Admin menu edits (/admin → Menu), keyed by "section|item name". Empty = Toast as-is. */
export const defaultMenuOverrides = () => ({ items: {}, hiddenSections: [] });

/** Automatic schedules on, plus the gameday specials shown under each team's games. */
export const defaultGamedaySettings = () => ({
  auto: true,
  teamSpecials: {
    bengals: ['Drink bucket specials all game', 'Souvenir cup refills'],
    bearcats: ['Drink bucket specials all game', 'Souvenir cup refills'],
    reds: ['Drink bucket specials all game', 'Souvenir cup refills'],
    fcc: ['Drink bucket specials all game', 'Souvenir cup refills'],
  },
});

// The sample games the first version seeded into every store - removed on upgrade.
const SEEDED_SAMPLES = [
  ['bengals', 'Steelers', '$20 domestic buckets'],
  ['bearcats', 'Kansas State', '$15 seltzer buckets'],
  ['fcc', 'Columbus Crew', '$3 souvenir cup refills'],
];

/** Brings a store saved by an older version up to date. Returns true if anything changed. */
export function migrateContent(c) {
  let changed = false;
  if (!c.maintenance) {
    c.maintenance = defaultMaintenance();
    changed = true;
  }
  // Old fixed "6 PM Surprise" -> promo list (Mon/Tue/Wed kept), and happy hour gets its 3 tiers.
  if (!Array.isArray(c.promos)) {
    c.promos = promosFromOldFlashDeals(c.flashDeals, c.settings?.happyHour?.end, c.settings?.surpriseMinutes ?? 60);
    delete c.flashDeals;
    if (c.settings) delete c.settings.surpriseMinutes;
    changed = true;
  }
  if (c.settings?.happyHour && !Array.isArray(c.settings.happyHour.phases)) {
    c.settings.happyHour.phases = defaultPhases();
    c.settings.happyHour.start = c.settings.happyHour.phases[0].start;
    c.settings.happyHour.end = c.settings.happyHour.phases.at(-1).end;
    changed = true;
  }
  if (c.home && !c.home.blocks?.some((b) => b.type === 'promos')) {
    // New Home card: promos, placed right after Happy Hour.
    const at = c.home.blocks.findIndex((b) => b.type === 'happyHour') + 1 || c.home.blocks.length;
    c.home.blocks.splice(at, 0, { id: 'promos', type: 'promos', visible: true, title: 'Today’s Promos' });
    changed = true;
  }
  if (!c.home) {
    c.home = defaultHome();
    changed = true;
  }
  if (!c.checkins) {
    c.checkins = defaultCheckins();
    changed = true;
  }
  if (!c.menuOverrides) {
    c.menuOverrides = defaultMenuOverrides();
    changed = true;
  }
  if (!c.gamedaySettings) {
    c.gamedaySettings = defaultGamedaySettings();
    c.gameday = (c.gameday ?? []).filter(
      (g) => !SEEDED_SAMPLES.some(([team, opponent, special]) => g.team === team && g.opponent === opponent && g.specials?.[0] === special),
    );
    changed = true;
  }
  return changed;
}

export function defaultContent() {
  const polls = [
    poll('food', 'Burger of the Month for October?', [['🍳', 'Goetta & Egg Smash'], ['🌶️', 'Skyline Chili Cheeseburger'], ['🥨', 'Pretzel Bun Beer Cheese'], ['🥓', 'Peanut Butter Bacon']], { featured: true }),
    poll('events', 'What should Wednesday nights be?', [['🧠', 'Trivia'], ['🎯', 'Darts League'], ['🎤', 'Karaoke']]),
    poll('drinks', 'Next Cincinnati shot flavor?', [['🍇', 'Graeter’s Black Raspberry'], ['🍊', 'Who Dey Orange Crush'], ['🥜', 'Buckeye (PB & Chocolate)']]),
    poll('debates', 'Wings: ranch or blue cheese?', [['🥛', 'Ranch'], ['🧀', 'Blue Cheese'], ['💪', 'Naked, like a pro']]),
    poll('debates', 'Pineapple on pizza?', [['🍍', 'Absolutely'], ['🚫', 'Never. Ever.']]),
  ];

  return {
    version: 1,
    maintenance: defaultMaintenance(),
    menuOverrides: defaultMenuOverrides(),
    checkins: defaultCheckins(),
    home: defaultHome(),
    settings: {
      hours: [
        { days: 'Mon–Sat', open: '11 AM', close: '9:30 PM' },
        { days: 'Sun', open: '11 AM', close: '9 PM' },
      ],
      happyHour: { days: [1, 2, 3, 4, 5], start: '15:00', end: '18:00', phases: defaultPhases() },
    },
    // Promos with their own days & times (/admin → Promos). Starts empty.
    promos: [],
    polls,
    votes: {}, // pollId -> optionId -> count
    voters: {}, // pollId -> deviceId -> optionId (one vote per device)
    // Real games come from ESPN automatically (server/schedule.mjs); these are the admin's extras.
    gamedaySettings: defaultGamedaySettings(),
    gameday: [],
    comingSoon: [
      { id: id(), kind: 'food', title: 'October Burger of the Month', description: 'Your pick hits the grill when voting closes.', eta: 'After voting closes', fromPoll: true },
      { id: id(), kind: 'drink', title: 'Fall Seasonal Drafts', description: 'Oktoberfest and pumpkin ales rotating onto the taps.', eta: 'Early October', fromPoll: false },
    ],
    showcase: [
      { id: id(), title: 'Thursday Trivia Night', description: 'Trivia beat karaoke by a nose. First round starts at 7:30.', pollQuestion: 'Trivia vs. Darts vs. Karaoke', winningShare: 47, launchedOn: '2026-09-18', status: 'event-booked' },
    ],
  };
}
