// SAMPLE DATA - seed polls & showcase for mock mode. In live mode these come from Supabase.
import type { Poll, ShowcaseItem } from '@/types';
import { barLocalDate } from '@/lib/time';

const closes = (days: number) => barLocalDate(days, 23, 59).toISOString();

export const seedPolls: Poll[] = [
  {
    id: 'p-burger-oct',
    category: 'food',
    question: 'Burger of the Month for October?',
    featured: true,
    closesAt: closes(4),
    options: [
      { id: 'o1', label: 'Goetta & Egg Smash', emoji: '🍳', votes: 142 },
      { id: 'o2', label: 'Skyline Chili Cheeseburger', emoji: '🌶️', votes: 188 },
      { id: 'o3', label: 'Pretzel Bun Beer Cheese', emoji: '🥨', votes: 121 },
      { id: 'o4', label: 'Peanut Butter Bacon', emoji: '🥓', votes: 64 },
    ],
  },
  {
    id: 'p-app-battle',
    category: 'food',
    question: 'Appetizer battle: which one goes on the half-off list?',
    closesAt: closes(2),
    options: [
      { id: 'o1', label: 'Loaded Tots', emoji: '🥔', votes: 97 },
      { id: 'o2', label: 'Fried Pickles', emoji: '🥒', votes: 83 },
      { id: 'o3', label: 'Pretzel Sticks', emoji: '🥨', votes: 110 },
    ],
  },
  {
    id: 'p-shot',
    category: 'drinks',
    question: 'Next Cincinnati shot flavor?',
    closesAt: closes(5),
    options: [
      { id: 'o1', label: 'Graeter\'s Black Raspberry', emoji: '🍇', votes: 205 },
      { id: 'o2', label: 'Who Dey Orange Crush', emoji: '🍊', votes: 176 },
      { id: 'o3', label: 'Buckeye (PB & Chocolate)', emoji: '🥜', votes: 131 },
    ],
  },
  {
    id: 'p-draft',
    category: 'drinks',
    question: 'Which local draft should we tap next?',
    closesAt: closes(6),
    options: [
      { id: 'o1', label: 'Rhinegeist Cidergeist', votes: 58 },
      { id: 'o2', label: 'MadTree Happy Amber', votes: 74 },
      { id: 'o3', label: 'Taft\'s Ale House Gavel Banger', votes: 69 },
    ],
  },
  {
    id: 'p-event',
    category: 'events',
    question: 'What should Wednesday nights be?',
    featured: true,
    closesAt: closes(3),
    options: [
      { id: 'o1', label: 'Trivia', emoji: '🧠', votes: 164 },
      { id: 'o2', label: 'Darts League', emoji: '🎯', votes: 92 },
      { id: 'o3', label: 'Karaoke', emoji: '🎤', votes: 139 },
    ],
  },
  {
    id: 'p-pineapple',
    category: 'debates',
    question: 'Pineapple on pizza?',
    closesAt: closes(7),
    options: [
      { id: 'o1', label: 'Absolutely', emoji: '🍍', votes: 211 },
      { id: 'o2', label: 'Never. Ever.', emoji: '🚫', votes: 247 },
    ],
  },
  {
    id: 'p-ranch',
    category: 'debates',
    question: 'Wings: ranch or blue cheese?',
    closesAt: closes(7),
    options: [
      { id: 'o1', label: 'Ranch', emoji: '🥛', votes: 318 },
      { id: 'o2', label: 'Blue Cheese', emoji: '🧀', votes: 176 },
      { id: 'o3', label: 'Naked, like a pro', emoji: '💪', votes: 41 },
    ],
  },
];

export const showcase: ShowcaseItem[] = [
  {
    id: 'sc1',
    title: 'Loaded Buffalo Chicken Fries',
    description: 'You asked for a shareable that hits like wings. Now a permanent starter.',
    pollQuestion: 'New shareable app: what should it be?',
    winningShare: 58,
    launchedOn: '2026-08-15',
    status: 'on-menu',
  },
  {
    id: 'sc2',
    title: 'Skyline-Style Chili Dry Rub Wings',
    description: 'The Cincy flavor battle winner, now on the wing menu.',
    pollQuestion: 'Craziest wing flavor we should try?',
    winningShare: 44,
    launchedOn: '2026-09-05',
    status: 'on-menu',
  },
  {
    id: 'sc3',
    title: 'Thursday Trivia Night',
    description: 'Trivia beat karaoke by a nose. First round starts at 7:30.',
    pollQuestion: 'Trivia vs. Darts vs. Karaoke',
    winningShare: 47,
    launchedOn: '2026-09-18',
    status: 'event-booked',
  },
  {
    id: 'sc4',
    title: 'Graeter\'s Black Raspberry Shot',
    description: 'Leading the shot-flavor poll. The bar team is dialing in the recipe.',
    pollQuestion: 'Next Cincinnati shot flavor?',
    winningShare: 40,
    launchedOn: '2026-10-10',
    status: 'coming-soon',
  },
];
