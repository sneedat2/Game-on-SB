// SAMPLE DATA - "Coming Soon" items for mock mode. The real menu lives in src/data/menu.ts.
import type { ComingSoonItem } from '@/types';

export const comingSoon: ComingSoonItem[] = [
  {
    id: 'cs1',
    kind: 'food',
    title: 'October Burger of the Month',
    description: 'Skyline Chili Cheeseburger is leading the vote. Your pick hits the grill when voting closes.',
    eta: 'After voting closes',
    fromPoll: true,
  },
  {
    id: 'cs2',
    kind: 'drink',
    title: 'Graeter’s Black Raspberry Shot',
    description: 'The shot-flavor poll winner. The bar team is dialing in the recipe.',
    eta: 'Mid-October',
    fromPoll: true,
  },
  {
    id: 'cs3',
    kind: 'drink',
    title: 'Fall Seasonal Drafts',
    description: 'Oktoberfest and pumpkin ales rotating onto the taps.',
    eta: 'Early October',
  },
  {
    id: 'cs4',
    kind: 'food',
    title: 'Nashville Hot Chicken Sandwich',
    description: 'Crispy thigh, Nashville hot oil, slaw & pickles on a brioche bun.',
    eta: 'November',
  },
];
