// SAMPLE DATA - placeholder items and prices so the UI is testable before the Toast menu sync is wired.
// Replace via services/menu.ts -> live implementation (Toast Menus API through the toast-proxy Edge Function).
import type { ComingSoonItem, MenuItem, MenuSection } from '@/types';

// Display order within each tab: Food tab = food then Beverages; Bar tab = alcohol.
export const menuSections: MenuSection[] = [
  { id: 'apps', title: 'Appetizers', kind: 'food', blurb: 'Half off during happy hour' },
  { id: 'wings-traditional', title: 'Traditional Wings', kind: 'food', blurb: 'Bone-in, tossed in any sauce or dry rub' },
  { id: 'wings-boneless', title: 'Boneless Wings', kind: 'food', blurb: 'All-white-meat, tossed in any sauce or dry rub' },
  { id: 'entrees', title: 'Entrées', kind: 'food' },
  { id: 'sandwiches', title: 'Sandwiches', kind: 'food', blurb: 'Burgers & handhelds served with fries or tots' },
  { id: 'soups-salads', title: 'Salads & Soups', kind: 'food' },
  { id: 'kids', title: 'Kids Meals', kind: 'food', blurb: '12 & under · served with a side and a drink' },
  { id: 'sides', title: 'Sides', kind: 'food' },
  { id: 'beverages', title: 'Beverages', kind: 'beverage', blurb: 'Free refills on fountain drinks & tea' },
  { id: 'draft', title: 'Draft Beer', kind: 'alcohol', blurb: '16 oz pint or 22 oz stadium pour' },
  { id: 'bottles', title: 'Bottles & Cans', kind: 'alcohol' },
  { id: 'seltzers', title: 'Seltzers', kind: 'alcohol' },
];

const stadium = (pint: number, stadiumPour: number) => [
  { label: '16 oz', price: pint },
  { label: '22 oz', price: stadiumPour },
];

const wingSizes = (six: number, ten: number, twenty: number) => [
  { label: '6 pc', price: six },
  { label: '10 pc', price: ten },
  { label: '20 pc', price: twenty },
];

const WING_FLAVORS = 'Mild · Medium · Hot · Who Dey Garlic Parm · Honey Gold BBQ · Nashville Hot · Skyline-Style Chili Dry Rub';

export const menuItems: MenuItem[] = [
  // Appetizers
  { id: 'a1', sectionId: 'apps', name: 'Loaded Buffalo Chicken Fries', description: 'Crispy fries, buffalo chicken, queso, ranch drizzle, green onion', price: 13, tags: ['Fan Pick'] },
  { id: 'a2', sectionId: 'apps', name: 'Bavarian Pretzel Sticks', description: 'Beer cheese & spicy mustard', price: 10 },
  { id: 'a3', sectionId: 'apps', name: 'Loaded Tots', description: 'Cheddar, bacon, sour cream, chives', price: 11 },
  { id: 'a4', sectionId: 'apps', name: 'Goetta Sliders', description: 'Cincinnati goetta, fried egg, American cheese', price: 12, tags: ['Local'] },
  { id: 'a5', sectionId: 'apps', name: 'Fried Pickles', description: 'Cajun ranch', price: 9 },
  { id: 'a6', sectionId: 'apps', name: 'Mozzarella Sticks', description: 'Marinara', price: 9 },

  // Traditional Wings
  { id: 'wt1', sectionId: 'wings-traditional', name: 'Bone-In Wings', description: WING_FLAVORS, sizes: wingSizes(10, 15, 28) },
  { id: 'wt2', sectionId: 'wings-traditional', name: 'Skyline-Style Chili Dry Rub', description: 'Cinnamon, cumin & cocoa rub - a poll winner', sizes: wingSizes(11, 16, 29), tags: ['Local', 'Fan Pick'] },
  { id: 'wt3', sectionId: 'wings-traditional', name: 'Gameday Wing Bucket', description: '50 wings, up to 3 flavors', price: 65, tags: ['Gameday'] },

  // Boneless Wings
  { id: 'wb1', sectionId: 'wings-boneless', name: 'Boneless Wings', description: WING_FLAVORS, sizes: wingSizes(9, 13, 24) },
  { id: 'wb2', sectionId: 'wings-boneless', name: 'Nashville Hot Boneless', description: 'Pickles & white bread, the right way', sizes: wingSizes(10, 14, 25), tags: ['Spicy'] },

  // Entrées
  { id: 'e1', sectionId: 'entrees', name: 'Chicken Tender Platter', description: 'Hand-breaded tenders, fries, coleslaw, choice of sauce', price: 15 },
  { id: 'e2', sectionId: 'entrees', name: 'Fish & Chips', description: 'Beer-battered cod, fries, tartar, lemon', price: 17 },
  { id: 'e3', sectionId: 'entrees', name: 'Buffalo Chicken Mac Bowl', description: 'Cavatappi, four-cheese sauce, buffalo chicken', price: 15, tags: ['Spicy'] },
  { id: 'e4', sectionId: 'entrees', name: 'Bacon Cheeseburger Mac Bowl', price: 15 },
  { id: 'e5', sectionId: 'entrees', name: 'Classic Four-Cheese Mac Bowl', price: 12 },

  // Sandwiches (burgers included)
  { id: 's1', sectionId: 'sandwiches', name: 'The Game On Burger', description: 'Double smash patty, American, pickles, house sauce', price: 14 },
  { id: 's2', sectionId: 'sandwiches', name: 'Burger of the Month', description: 'Voted in by you - check Polls for this month\'s winner', price: 15, tags: ['Fan Pick'] },
  { id: 's3', sectionId: 'sandwiches', name: 'Black & Blue Burger', description: 'Cajun spice, blue cheese crumbles, bacon', price: 15 },
  { id: 's4', sectionId: 'sandwiches', name: 'Buffalo Chicken Sandwich', description: 'Crispy or grilled, lettuce, tomato, ranch', price: 14, tags: ['Spicy'] },
  { id: 's5', sectionId: 'sandwiches', name: 'Philly Cheesesteak', description: 'Shaved steak, peppers, onions, provolone', price: 15 },
  { id: 's6', sectionId: 'sandwiches', name: 'Goetta BLT', description: 'Crispy goetta, bacon, lettuce, tomato, mayo on sourdough', price: 13, tags: ['Local'] },

  // Salads & Soups
  { id: 'ss1', sectionId: 'soups-salads', name: 'Buffalo Chicken Salad', description: 'Crispy chicken, cheddar, tomato, red onion, ranch', price: 13 },
  { id: 'ss2', sectionId: 'soups-salads', name: 'Grilled Chicken Caesar', price: 13 },
  { id: 'ss3', sectionId: 'soups-salads', name: 'House Salad', description: 'Add chicken +$4', price: 8 },
  { id: 'ss4', sectionId: 'soups-salads', name: 'Chili', description: 'Cheddar & onions', sizes: [{ label: 'Cup', price: 5 }, { label: 'Bowl', price: 7 }] },
  { id: 'ss5', sectionId: 'soups-salads', name: 'Soup of the Day', sizes: [{ label: 'Cup', price: 5 }, { label: 'Bowl', price: 7 }] },

  // Kids Meals
  { id: 'k1', sectionId: 'kids', name: 'Chicken Tenders', price: 7 },
  { id: 'k2', sectionId: 'kids', name: 'Cheeseburger Sliders', price: 7 },
  { id: 'k3', sectionId: 'kids', name: 'Grilled Cheese', price: 6 },
  { id: 'k4', sectionId: 'kids', name: 'Mac & Cheese', price: 6 },
  { id: 'k5', sectionId: 'kids', name: 'Boneless Wings (4)', description: 'Plain, mild or BBQ', price: 7 },

  // Sides
  { id: 'sd1', sectionId: 'sides', name: 'Fries', price: 4 },
  { id: 'sd2', sectionId: 'sides', name: 'Tater Tots', price: 4 },
  { id: 'sd3', sectionId: 'sides', name: 'Onion Rings', price: 5 },
  { id: 'sd4', sectionId: 'sides', name: 'Side Mac & Cheese', price: 5 },
  { id: 'sd5', sectionId: 'sides', name: 'Coleslaw', price: 3 },
  { id: 'sd6', sectionId: 'sides', name: 'Side Salad', price: 4 },
  { id: 'sd7', sectionId: 'sides', name: 'Celery & Carrots', description: 'With ranch or blue cheese', price: 2 },

  // Beverages (non-alcoholic)
  { id: 'bv1', sectionId: 'beverages', name: 'Fountain Soda', description: 'Coke · Diet Coke · Sprite · Dr Pepper · Mello Yello', price: 3 },
  { id: 'bv2', sectionId: 'beverages', name: 'Iced Tea', description: 'Sweet or unsweet', price: 3 },
  { id: 'bv3', sectionId: 'beverages', name: 'Lemonade', price: 3.5 },
  { id: 'bv4', sectionId: 'beverages', name: 'Coffee', price: 2.5 },
  { id: 'bv5', sectionId: 'beverages', name: 'Red Bull', description: 'Original · Sugar Free', price: 4.5 },
  { id: 'bv6', sectionId: 'beverages', name: 'Kids Drink', description: 'Milk · Chocolate Milk · Apple Juice', price: 2 },

  // Draft
  { id: 'd1', sectionId: 'draft', name: 'Rhinegeist Truth', description: 'IPA · 7.2%', sizes: stadium(7, 9.5), tags: ['Local'] },
  { id: 'd2', sectionId: 'draft', name: 'MadTree PsycHOPathy', description: 'IPA · 6.9%', sizes: stadium(7, 9.5), tags: ['Local'] },
  { id: 'd3', sectionId: 'draft', name: 'Bud Light', description: 'Light Lager · 4.2%', sizes: stadium(4.5, 6) },
  { id: 'd4', sectionId: 'draft', name: 'Miller Lite', description: 'Light Lager · 4.2%', sizes: stadium(4.5, 6) },
  { id: 'd5', sectionId: 'draft', name: 'Modelo Especial', description: 'Mexican Lager · 4.4%', sizes: stadium(6, 8) },
  { id: 'd6', sectionId: 'draft', name: 'Blue Moon', description: 'Belgian White · 5.4%', sizes: stadium(6, 8) },

  { id: 'b1', sectionId: 'bottles', name: 'Coors Light', price: 4 },
  { id: 'b2', sectionId: 'bottles', name: 'Michelob Ultra', price: 4 },
  { id: 'b3', sectionId: 'bottles', name: 'Corona Extra', price: 5 },
  { id: 'b4', sectionId: 'bottles', name: 'Domestic Bucket (5)', description: 'Gameday bucket special applies', price: 20, tags: ['Gameday'] },

  { id: 'sl1', sectionId: 'seltzers', name: 'White Claw', description: 'Black Cherry · Mango · Lime', price: 5 },
  { id: 'sl2', sectionId: 'seltzers', name: 'High Noon', description: 'Pineapple · Watermelon · Peach', price: 6 },
  { id: 'sl3', sectionId: 'seltzers', name: 'Seltzer Bucket (5)', price: 25, tags: ['Gameday'] },
];

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
