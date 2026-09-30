// Game On's real menu, copied from the Toast online ordering page
// (https://order.toasttab.com/online/game-on-bar-and-grill) on 2026-09-30.
// Edit prices/items here until the live Toast menu sync (toast-proxy) is connected.
// Not included: NICOTINE (app-store rules restrict promoting nicotine products).
import type { MenuItem, MenuSection, MenuSectionId } from '@/types';

// Display order within each Menu tab: Food tab = food then Beverages; Bar tab = alcohol.
export const menuSections: MenuSection[] = [
  { id: 'apps', title: 'Appetizers', kind: 'food' },
  { id: 'wings-traditional', title: 'Traditional Wings', kind: 'food' },
  { id: 'wings-boneless', title: 'Boneless Wings', kind: 'food' },
  { id: 'entrees', title: 'Entrées', kind: 'food' },
  { id: 'sandwiches', title: 'Sandwiches', kind: 'food' },
  { id: 'soups-salads', title: 'Salads & Soups', kind: 'food' },
  { id: 'kids', title: 'Kids Meals', kind: 'food' },
  { id: 'sides', title: 'Sides', kind: 'food' },
  { id: 'seasonal', title: 'Seasonal Menu', kind: 'food', blurb: 'Here for a limited time' },
  { id: 'lent', title: 'Lent Menu', kind: 'food' },
  { id: 'beverages', title: 'Beverages', kind: 'beverage' },
  { id: 'summer', title: 'Summer Sips', kind: 'alcohol' },
  { id: 'growlers', title: 'Growler Fills', kind: 'alcohol', blurb: 'Take your favorite tap home · 32 oz or 64 oz' },
  { id: 'togo', title: 'To-Go Cases', kind: 'alcohol' },
];

type Row = [name: string, price?: number, soldOut?: boolean];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const section = (sectionId: MenuSectionId, rows: Row[]): MenuItem[] =>
  rows.map(([name, price, soldOut]) => ({ id: `${sectionId}-${slug(name)}`, sectionId, name, price, soldOut }));

// [beer, 32 oz price, 64 oz price]. A missing size isn't offered, or its Toast price looked
// like a typo (see README "Menu" notes) - add it back once confirmed.
const growler = (name: string, oz32?: number, oz64?: number): MenuItem => ({
  id: `growlers-${slug(name)}`,
  sectionId: 'growlers',
  name,
  sizes: [
    ...(oz32 !== undefined ? [{ label: '32 oz', price: oz32 }] : []),
    ...(oz64 !== undefined ? [{ label: '64 oz', price: oz64 }] : []),
  ],
});

export const menuItems: MenuItem[] = [
  ...section('apps', [
    ['Cajun Queso Dip w/ Pretzel Sticks', 10],
    ['Cajun Queso Dip w/ Tortilla Chips', 8],
    ['Cheese Fries', 9],
    ['Cheese Quesadilla', 7.5],
    ['Cheese Sticks', 10],
    ['Cheese Tots', 9],
    ['Chicken Tenders', 10.5],
    ['Cinnamon Pretzel Sticks', 10],
    ['Grilled Chicken Tenders', 10],
    ['Jalapeño Poppers', 10],
    ['Loaded Potato Skins', 10],
    ['Mini Corn Dogs', 9],
    ['Nachos', 9],
    ['Original Cheese Curds', 13],
    ['Philly Steak Fries', 10],
    ['Pick 3', 14],
    ['Pickle Spears', 8],
    ['Reuben Skins', 10],
    ['Spicy Cheese Curds', 13],
    ['Taco Tots', 12],
    ['Tavern Pretzel', 8],
  ]),

  ...section('wings-traditional', [
    ['5 Traditional Wings', 7.5],
    ['10 Traditional Wings', 15],
    ['15 Traditional Wings', 22],
    ['20 Traditional Wings', 29],
    ['50 Traditional Wings', 70],
    ['75 Traditional Wings', 105, true],
    ['100 Traditional Wings', 135, true],
  ]),

  ...section('wings-boneless', [
    ['5 Boneless Wings', 6],
    ['10 Boneless Wings', 12],
    ['15 Boneless Wings', 17],
    ['20 Boneless Wings', 23],
    ['50 Boneless Wings', 45],
  ]),

  ...section('entrees', [
    ['Bacon Egg Burger', 15],
    ['Breakfast Wrap', 8],
    ['Buffalo Chicken Mac', 13],
    ['Build Your Own Burger', 12],
    ['Chicken Philly', 12],
    ['Crispy Chicken Bacon Ranch Wrap', 13],
    ['Grilled Chicken Bacon Ranch Wrap', 13],
    ['Mexi Mac', 13],
    ['Philly Steak Mac', 13],
    ['Philly Wrap', 12],
    ["Steak N' Melt Single", 12],
    ["Steak N' Melt Double", 16],
  ]),

  ...section('sandwiches', [
    ['BLT', 10],
    ['Club Sandwich', 13],
    ['Grilled Chicken Sandwich', 13],
    ['Haddock Sandwich', 14],
    ['Ham N Swiss', 12],
    ['Italian Grinder', 12],
    ['Pizza Hoagie', 14],
    ['Reuben', 12],
  ]),

  ...section('soups-salads', [
    ['Cup Chili', 5.5],
    ['Bowl Chili', 6.5],
    ['Cup Loaded Potato Soup', 5.5],
    ['Bowl Loaded Potato Soup', 7.5],
    ['Small House Salad', 7],
    ['Large House Salad', 12],
    ['Large Caesar Salad', 12],
    ['Small Chef Salad', 9],
    ['Large Chef Salad', 13.5],
    ['Small Crispy Chicken Salad', 8],
    ['Large Crispy Chicken Salad', 13],
    ['Small Grilled Chicken Salad', 8],
    ['Large Grilled Chicken Salad', 13],
    ['Salmon Salad', 14],
  ]),

  ...section('kids', [
    ['Jr Boneless Wings', 7],
    ['Jr Burger', 7],
    ['Jr Corn Dogs', 7],
    ['Jr Grilled Cheese', 7],
    ['Jr Mac N Cheese', 7],
    ['Jr Tenders', 7],
    ['Jr Grilled Tenders', 7],
  ]),

  ...section('sides', [
    ['Apple Sauce', 1],
    ['Celery', 2],
    ['Cheese Fries Side', 4.5],
    ['Cheese Tots Side', 4.5],
    ['Coleslaw', 3],
    ['Fries', 3],
    ['Fries Basket', 6],
    ['Maple Potato Bites', 5, true],
    ['Onion Rings', 4],
    ['Pretzel Sticks', 3],
    ['Saratoga Chips', 3],
    ['Side of Mac', 3],
    ['Side of Queso', 2],
    ['Sweet Potato Fries', 3],
    ['Tater Tots', 3],
    ['Tater Tot Basket', 6],
    ['Veggies', 3.5],
  ]),

  ...section('seasonal', [
    ['Fried Green Beans', 11],
    ['Cucumber Salad', 9],
    ['Taco Salad', 12],
    ['Kids Hot Dog', 7],
    ['Brisket Platter', 14, true],
    ['Brisket Nachos', 12, true],
    ['Brisket Fries', 12, true],
    ['Lava Cake', 9, true],
  ]),

  ...section('lent', [
    ['Haddock Sandwich', 14],
    ['Hushpuppies', 10],
    ['Pollock Bites', 13],
    ['Jumbo Shrimp', 12],
    ['Popcorn Shrimp', 13, true],
    ['Alaskan Rockfish Gyro', 14, true],
    ['Alaskan Bites', 13, true],
  ]),

  ...section('beverages', [
    ['Soda', 2.75],
    ['Tea', 2.75],
    ['Lemonade', 2.75],
    ['Shirley Temple', 3],
    ['Red Bull', 3],
    ['Sugar Free Red Bull', 3],
    ['Coconut Red Bull', 4],
    ['Milk', 2],
    ['Orange Juice', 2],
    ['Cranberry Juice', 2],
    ['Pineapple Juice', 2],
    ['Kid Drink', 1],
    ['Water'],
  ]),

  ...section('summer', [
    ['Rosé', 8],
    ['On & Off Again', 6.5],
    ['Loverboy', 7],
  ]),

  growler('312', undefined, 13),
  growler('Blue Moon', 8.5, 16),
  growler('Bubbles', 9.5, 18),
  growler('Bud Light', undefined, 11),
  growler('Budweiser', 6.5, 14),
  growler('Coors Light', 6, 12),
  growler('Grand Mimosa', 8.5, 16),
  growler('Guinness', 8.5, 16),
  growler('Mich Ultra', 5.5, 10),
  growler('Miller Lite', 6, 11),
  growler('Pilgrim', 9, 17),
  growler('Psychopathy', undefined, 17),
  growler('Sam Adams', undefined, 17),
  growler('Space Dust', 10, 19),
  growler('Truth', 11, 21),
  growler('Yuengling Lager', 6.5, 12),
  growler('Yum Yum', 10, 19),

  ...section('togo', [
    ['Bud Light Case', 30],
    ['Miller Lite Case', 30],
    ['Coors Light Case', 30],
    ['Mich Ultra Case', 30],
  ]),
];
