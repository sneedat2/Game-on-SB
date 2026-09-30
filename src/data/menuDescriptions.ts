// Item descriptions from Game On's website menu (https://gameonsb.com/menu/, copied 2026-09-30).
// Toast has no descriptions for these items, so the app adds them here, matched by the item name
// as it appears in Toast. If a description is ever entered in Toast, Toast's wins.
// To add or change one: use the item's name exactly as it shows in the app.

// Wing descriptions show once at the top of each wing section (src/data/menu.ts), not on every size.
export const WINGS_TRADITIONAL = 'Our popular chicken wings tossed in one of many sauces. Served with homemade ranch or bleu cheese.';
export const WINGS_BONELESS = 'Hand-cut chicken chunks, breaded to order, tossed in any sauce. Served with homemade ranch or bleu cheese.';
const CHEESE_CURDS = 'A blend of cheeses, deep fried, with your choice of regular or spicy breading. Served with marinara and Reaper Ranch.';
const CHICKEN_SALAD = 'Fresh lettuce, tomato, cheese & homemade croutons.';
const CHEF_SALAD = 'Fresh lettuce, ham, bacon, cheese, tomato, turkey & egg.';
const HOUSE_SALAD = 'Fresh lettuce, tomato, cucumber, carrots, cheddar cheese & homemade croutons.';
const STEAK_MELT = 'Golden toasted bread with Swiss and cheddar cheeses topped with our Frisco sauce made in house, all covering an Angus beef patty.';
const BRISKET = 'Slow-cooked, tender brisket with your choice of sauce.';

const BY_NAME: Record<string, string> = {
  // Appetizers
  'cajun queso dip w pretzel sticks': '4-cheese queso served with pretzel sticks.',
  'cajun queso dip w tortilla chips': '4-cheese queso served with tortilla chips.',
  'cheese fries': 'French fries topped with the perfect amount of cheese, served with ranch.',
  'cheese tots': 'Tater tots topped with the perfect amount of cheese, served with ranch.',
  'cheese quesadilla': 'Melted cheddar jack, sour cream & salsa. Add chicken or onions & jalapeños.',
  'cheese sticks': 'Served with marinara sauce.',
  'chicken tenders': 'Home-style breaded chicken strips served with your choice of dipping sauce.',
  'cinnamon pretzel sticks': 'Pretzel sticks covered in cinnamon and served with glazed icing for dipping.',
  'jalapeno poppers': '8 deep-fried jalapeño poppers stuffed with cream cheese.',
  'loaded potato skins': 'Freshly wedged potatoes layered with a mound of cheese, crispy bacon & chives. Served with sour cream.',
  nachos: 'Tortilla chips covered in cheese sauce, topped with tomatoes, sour cream & salsa. Add chicken, chili, or onions & jalapeños.',
  'original cheese curds': CHEESE_CURDS,
  'spicy cheese curds': CHEESE_CURDS,
  'pick 3': 'Choose 3: (2) chicken tenders, (4) boneless wings, (3) cheese sticks, fried pickle spears, or (4) jalapeño poppers.',
  'pickle spears': 'Breaded and shaped like french fries but with a better taste. Served with ranch and Reaper Ranch.',
  'reuben skins': '(5) potato boats fried and topped with grilled corned beef, sauerkraut and Swiss cheese, melted together. Served with 1000 Island dressing.',
  'taco tots': 'Tater tots topped with Cajun beef, tomatoes, onions, jalapeños & queso cheese, served with salsa & sour cream.',
  'tavern pretzel': 'A large, warm soft pretzel filled with jalapeño-infused cheese, served with ranch.',

  // Entrées
  'bacon egg burger': 'Bacon, pepper jack, fried egg & grilled onions on a brioche bun.',
  'build your own burger':
    'Choice of a handmade Angus beef patty, a turkey burger, or an Impossible burger. Pick 1 cheese (American, Swiss, cheddar, provolone, blue cheese, pepper jack) and up to 4 toppings (lettuce, tomato, pickle, onion, jalapeños, banana peppers, mayo, grilled onions, BBQ sauce, Cajun seasoning). Premiums: bacon, coleslaw, sautéed mushrooms, fried egg, onion rings.',
  'buffalo chicken mac': 'Our homemade mac-n-cheese with perfectly grilled chicken, bacon & buffalo sauce drizzled on top to give it a kick.',
  'chicken philly': 'Grilled seasoned chicken topped with peppers and onions, blanketed with provolone and wrapped in a soft pita.',
  'crispy chicken bacon ranch wrap': 'Crispy chicken, bacon, ranch, lettuce, tomato & cheese.',
  'grilled chicken bacon ranch wrap': 'Grilled chicken, bacon, ranch, lettuce, tomato & cheese.',
  'philly wrap': 'Philly steak sautéed with flame-roasted peppers & onions, mayo, and sprinkled with mozzarella, all wrapped up in a pita.',
  'steak n melt single': STEAK_MELT,
  'steak n melt double': STEAK_MELT,

  // Sandwiches
  blt: 'Simple, yet classic: lettuce, tomato & mayo stacked with strips of bacon.',
  'club sandwich': 'Ham, turkey, bacon, Swiss, mayo, red onion, lettuce & tomato, all served between buttery toasted bread.',
  'grilled chicken sandwich': '6 oz grilled chicken breast served on a brioche bun with your choice of toppings.',
  'haddock sandwich': 'Yuengling beer battered, with lettuce, tomato, pickle, red onion, hoagie bun and choice of cheese. Served with tartar sauce.',
  'ham n swiss': 'Slices of fresh ham & melted Swiss, served on a pretzel bun.',
  'italian grinder': 'Capicola ham, salami, pepperoni, melted provolone cheese topped with lettuce & tomato, served on a hoagie.',
  'pizza hoagie': 'A seasoned beef patty topped with pickles, onions, marinara and gooey mozzarella on a toasted bun.',
  reuben: 'Grilled deli-style corned beef & sauerkraut, served on rye bread with melted Swiss & 1000 Island.',

  // Salads & Soups
  'small chef salad': CHEF_SALAD,
  'large chef salad': CHEF_SALAD,
  'small crispy chicken salad': `Crispy chicken, ${CHICKEN_SALAD.charAt(0).toLowerCase()}${CHICKEN_SALAD.slice(1)}`,
  'large crispy chicken salad': `Crispy chicken, ${CHICKEN_SALAD.charAt(0).toLowerCase()}${CHICKEN_SALAD.slice(1)}`,
  'small grilled chicken salad': `Grilled chicken, ${CHICKEN_SALAD.charAt(0).toLowerCase()}${CHICKEN_SALAD.slice(1)}`,
  'large grilled chicken salad': `Grilled chicken, ${CHICKEN_SALAD.charAt(0).toLowerCase()}${CHICKEN_SALAD.slice(1)}`,
  'small house salad': HOUSE_SALAD,
  'large house salad': HOUSE_SALAD,
  'cup loaded potato soup': 'Topped with bacon & cheese.',
  'bowl loaded potato soup': 'Topped with bacon & cheese.',

  // Sides
  'maple potato bites': 'Bite-size potato fry triangles dusted with maple seasoning.',

  // Seasonal
  'fried green beans': 'Crispy, golden-brown green beans fried to perfection, served with your choice of dipping sauce.',
  'cucumber salad': 'A cool and refreshing mix of cucumbers, tomatoes and red onion tossed in olive oil and red wine vinaigrette. Topped with fresh parsley.',
  'taco salad': 'A crispy deep-fried taco shell filled with seasoned ground beef, lettuce, shredded cheese and diced tomatoes. Served with sour cream and salsa on the side.',
  'kids hot dog': 'Classic hot dog on a soft bun with your choice of condiments. Comes with one side - perfect for the littles.',
  'brisket platter': BRISKET,
  'brisket nachos': BRISKET,
  'brisket fries': BRISKET,

  // Beverages
  soda: 'Coca-Cola, Diet Coke, Cherry Coke, Mello Yello, Sprite, Sprite Zero, Fanta Orange, Barq’s Root Beer, Mr. Pibb.',
};

/** "Steak N' Melt Single" -> "steak n melt single", "Jalapeño" -> "jalapeno" */
const normalize = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function descriptionFor(name: string): string | undefined {
  const key = normalize(name);
  if (key.startsWith('jr ')) return undefined; // kids items have no website descriptions
  return BY_NAME[key];
}

/** Wing sauces & dry rubs from the website, shown with the wing sections. */
export const WING_SAUCES = {
  lessHot: ['Teriyaki', 'Parmesan Garlic', 'Kentucky Bourbon', 'BBQ', 'Asian Ginger', 'Carolina Gold'],
  medium: ['Medium', 'Honey Chipotle', 'Garlic'],
  moreHot: ['Buffalo', '24K Gold', 'Hot', 'Tropical Habanero', 'End Zone', 'Reaper', 'Shut Up BBQ'],
  dryRubs: ['Sweet Heat', 'Kickin’ Ranch', 'Westside Wild Fire', 'Jamaican Jerk', 'Melt Your Face'],
  new: ['Hot Honey', 'Sweet Chili', 'Golden Zing'],
};
