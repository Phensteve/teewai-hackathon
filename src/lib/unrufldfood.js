// unrufldfood™ — teewai's proprietary food identification & stain-scoring engine.
//
// HOW IT WORKS (Cal AI-inspired, dental-stain-specialized):
//   1. The LLM is asked to IDENTIFY the food (not score it) and assess its
//      chromogenic / acidity / tannin properties — the three factors that
//      determine extrinsic tooth staining per dental literature.
//   2. A food-validation gate rejects photos that aren't food or drink
//      (packaging, menus, scenery, people, empty plates) so the user gets a
//      clear "not food" message instead of a bogus stain score.
//   3. Category-aware fuzzy matching finds the closest calibrated catalog
//      entry. The LLM's category is used to narrow the search first, then
//      the whole catalog is searched as fallback.
//   4. When a catalog match is found, the research-grounded scores are used.
//   5. When NO match is found, a deterministic stain score is computed from
//      the LLM's property assessments + the category baseline (averaged from
//      the catalog). This replaces the old arbitrary "20" fallback — every
//      unmatched food now gets a score grounded in its actual properties.
//
// Pure functions, no PII, no side effects — safe client-side and server-side.

import { STAIN_CATALOG, CATEGORY_LABEL } from './stainCatalog';
import { getCalories } from './foodCalories';

// --- Helpers ----------------------------------------------------------------

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

// Normalize a food name for matching: lowercase, strip punctuation, collapse
// spaces.
function normalize(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove common filler words that don't help identification.
const FILLER_WORDS = new Set([
  'the', 'a', 'an', 'some', 'with', 'and', 'or', 'of', 'in', 'on', 'plate',
  'bowl', 'cup', 'glass', 'bottle', 'piece', 'pieces', 'slice', 'slices',
  'serving', 'portion', 'food', 'drink', 'beverage', 'hot', 'cold', 'fresh',
  'homemade', 'restaurant', 'made', 'cooked', 'raw', 'fried', 'baked',
  'grilled', 'boiled', 'steamed', 'roasted', 'barbecue', 'bbq',
]);

function removeFiller(str) {
  return str.split(' ').filter((w) => !FILLER_WORDS.has(w)).join(' ');
}

// --- Fuzzy matching ---------------------------------------------------------

// Levenshtein distance (iterative, capped at maxDist for performance).
function levenshtein(a, b, maxDist = Infinity) {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const prev = new Array(lb + 1);
  const curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    for (let j = 0; j <= lb; j++) [prev[j], curr[j]] = [curr[j], prev[j]];
  }
  return prev[lb];
}

// Token similarity: fraction of query tokens found in target (order-independent).
function tokenOverlap(query, target) {
  const qTokens = new Set(query.split(' ').filter(Boolean));
  const tTokens = new Set(target.split(' ').filter(Boolean));
  if (!qTokens.size) return 0;
  let hits = 0;
  for (const t of qTokens) if (tTokens.has(t)) hits++;
  return hits / qTokens.size;
}

// --- Catalog index + category baselines -------------------------------------

const CATALOG_INDEX = STAIN_CATALOG.map((item) => {
  const norm = normalize(item.name);
  const tokens = removeFiller(norm);
  return { item, norm, tokens };
});

// Local & variant-spelling aliases → canonical catalog name. The LLM is great
// at identifying regional foods, but a user's spelling ("moimoi", "ogi") rarely
// matches the catalog's ("Moin moin", "Pap / ogi") exactly. Resolving these
// before matching lets local foods hit their calibrated catalog entry instead
// of falling through to the property-based fallback.
const FOOD_ALIASES = {
  // === West Africa ===
  moimoi: 'Moin moin', moinmoin: 'Moin moin', moimoin: 'Moin moin',
  'moi moi': 'Moin moin', 'moin moi': 'Moin moin',
  akara: 'Akara', akla: 'Akara', koose: 'Akara', acaraje: 'Akara',
  pap: 'Pap / ogi', ogi: 'Pap / ogi', akamu: 'Pap / ogi', koko: 'Pap / ogi',
  puffpuff: 'Puff puff', 'puff-puff': 'Puff puff', bofrot: 'Puff puff', mandazi: 'Puff puff',
  jollof: 'Jollof rice', jolof: 'Jollof rice', jolloof: 'Jollof rice', 'jollof rice': 'Jollof rice',
  suya: 'Suya / grilled meat', tsire: 'Suya / grilled meat',
  dodo: 'Dodo (fried plantain)', 'fried plantain': 'Dodo (fried plantain)', boli: 'Boli (roasted plantain)',
  egusi: 'Egusi soup', 'egusi soup': 'Egusi soup',
  waakye: 'Waakye',
  fura: 'Fura da nono', 'fura da nono': 'Fura da nono',
  zobo: 'Zobo (hibiscus drink)', 'hibiscus drink': 'Zobo (hibiscus drink)',
  kunu: 'Kunu (millet drink)', 'kunu zaki': 'Kunu (millet drink)',
  'chin chin': 'Chin chin', chinchin: 'Chin chin',
  'meat pie': 'Meat pie', 'nigerian meat pie': 'Meat pie',
  gizdodo: 'Gizdodo',
  'palm oil soup': 'Palm oil soup', banga: 'Banga soup', 'banga soup': 'Banga soup',
  'pounded yam': 'Pounded yam + egusi', 'pounded yam and egusi': 'Pounded yam + egusi',
  'jollof spaghetti': 'Jollof spaghetti', 'coconut jollof': 'Coconut jollof', 'coconut rice': 'Coconut jollof',
  'pepper soup': 'Pepper soup', 'okra soup': 'Okra soup', 'efo riro': 'Efo riro',
  'groundnut soup': 'Groundnut soup', 'light soup': 'Light soup',
  gbegiri: 'Gbegiri', 'gbegiri soup': 'Gbegiri', 'bean soup': 'Gbegiri',
  ewedu: 'Ewedu', 'ewedu soup': 'Ewedu', 'jute soup': 'Ewedu', 'jute leaf soup': 'Ewedu',
  stew: 'Nigerian stew', 'nigerian stew': 'Nigerian stew', 'tomato stew': 'Nigerian stew',
  'boiled egg': 'Eggs', 'whisked egg': 'Eggs', 'scrambled egg': 'Eggs', 'fried egg': 'Eggs',
  // Nigerian & West African swallows (distinct foods, often paired with a soup)
  amala: 'Amala', 'amala lafun': 'Amala', 'amala isu': 'Amala', elubo: 'Amala',
  eba: 'Eba', 'garri swallow': 'Eba', 'cassava swallow': 'Eba',
  fufu: 'Fufu (cassava)', akpu: 'Fufu (cassava)', 'cassava fufu': 'Fufu (cassava)',
  semo: 'Semovita', semovita: 'Semovita', semolina: 'Semovita', 'semolina swallow': 'Semovita',
  tuwo: 'Tuwo', 'tuwo shinkafa': 'Tuwo', 'tuwo masara': 'Tuwo',
  banku: 'Banku', bankye: 'Banku',
  kenkey: 'Kenkey', komi: 'Kenkey', 'dokonu': 'Kenkey',
  kelewele: 'Kelewele',
  ugali: 'Ugali', sima: 'Ugali', posho: 'Ugali', ngima: 'Ugali',
  'nyama choma': 'Nyama choma',
  'sukuma wiki': 'Sukuma wiki',
  gari: 'Gari', garri: 'Gari',
  beans: 'Beans (ewa)', 'honey beans': 'Beans (ewa)', ewa: 'Beans (ewa)',
  'beans porridge': 'Beans (ewa)', 'ewa agoyin': 'Beans (ewa)', 'ewa aganyin': 'Beans (ewa)',
  asaro: 'Yam porridge (asaro)', 'yam pottage': 'Yam porridge (asaro)', 'yam porridge': 'Yam porridge (asaro)',
  'ofada rice': 'Ofada rice', ofada: 'Ofada rice',

  // === United States ===
  'hot dog': 'Hot dog', hotdog: 'Hot dog', frankfurter: 'Hot dog', corndog: 'Hot dog', 'corn dog': 'Hot dog',
  burger: 'Burger', hamburger: 'Burger', cheeseburger: 'Burger', 'beef burger': 'Burger',
  pizza: 'Pizza', 'pepperoni pizza': 'Pizza', 'cheese pizza': 'Pizza', margherita: 'Pizza', 'margherita pizza': 'Pizza', pepperoni: 'Pizza',
  fries: 'French fries', 'french fries': 'French fries', chips: 'French fries', 'potato chips': 'French fries', crisps: 'French fries',
  'mac and cheese': 'Pasta / pasta sauce', 'macaroni and cheese': 'Pasta / pasta sauce',
  'bbq ribs': 'Beef (grilled)', 'grilled ribs': 'Beef (grilled)', bbq: 'Beef (grilled)',
  pancakes: 'Bread (white)', waffles: 'Bread (white)', bagel: 'Bread (white)',
  cheesesteak: 'Beef (grilled)', 'philly cheesesteak': 'Beef (grilled)',
  'clam chowder': 'Pepper soup',

  // === United Kingdom ===
  'fish and chips': 'Fish and chips', fishandchips: 'Fish and chips', 'fish chips': 'Fish and chips',
  'full english': 'Full English breakfast', 'full english breakfast': 'Full English breakfast', 'english breakfast': 'Full English breakfast',
  'shepherds pie': "Shepherd's pie", 'shepherd pie': "Shepherd's pie", 'cottage pie': "Shepherd's pie",
  'bangers and mash': 'Bangers and mash', bangers: 'Bangers and mash',
  'sunday roast': 'Beef (grilled)', 'roast dinner': 'Beef (grilled)', 'steak and kidney pie': 'Beef (grilled)',
  scone: 'Bread (white)', scones: 'Bread (white)',
  trifle: 'Sweets / candy', 'sticky toffee pudding': 'Sweets / candy',

  // === China ===
  'dim sum': 'Dumplings / dim sum', dumplings: 'Dumplings / dim sum', dumpling: 'Dumplings / dim sum',
  potstickers: 'Dumplings / dim sum', jiaozi: 'Dumplings / dim sum', wonton: 'Dumplings / dim sum', wontons: 'Dumplings / dim sum',
  'spring rolls': 'Spring rolls', 'egg rolls': 'Spring rolls', springrolls: 'Spring rolls', 'spring roll': 'Spring rolls',
  'kung pao': 'Kung pao chicken', 'kung pao chicken': 'Kung pao chicken', kungpao: 'Kung pao chicken',
  'mapo tofu': 'Mapo tofu', mapotofu: 'Mapo tofu',
  'peking duck': 'Peking duck', pekingduck: 'Peking duck', 'roast duck': 'Peking duck',
  'hot pot': 'Hotpot', hotpot: 'Hotpot', 'chinese hot pot': 'Hotpot',
  'chow mein': 'Chow mein', chowmein: 'Chow mein', 'lo mein': 'Chow mein',
  'fried rice': 'Fried rice (soy)', 'egg fried rice': 'Fried rice (soy)', friedrice: 'Fried rice (soy)',
  congee: 'Rice (plain)', 'rice porridge': 'Rice (plain)', jook: 'Rice (plain)',
  'char siu': 'Suya / grilled meat', 'bbq pork': 'Suya / grilled meat',
  noodles: 'Noodles (soy-based)', 'chinese noodles': 'Noodles (soy-based)', 'chow fun': 'Noodles (soy-based)',

  // === Japan ===
  sushi: 'Sushi (soy sauce)', 'sushi roll': 'Sushi (soy sauce)', maki: 'Sushi (soy sauce)', nigiri: 'Sushi (soy sauce)', sashimi: 'Sushi (soy sauce)',
  ramen: 'Ramen', 'tonkotsu ramen': 'Ramen', 'miso ramen': 'Ramen',
  udon: 'Udon / soba', soba: 'Udon / soba', 'udon noodles': 'Udon / soba',
  tempura: 'Tempura', 'shrimp tempura': 'Tempura',
  'miso soup': 'Pepper soup', miso: 'Pepper soup',
  teriyaki: 'Suya / grilled meat', 'teriyaki chicken': 'Suya / grilled meat',
  onigiri: 'Rice (plain)', 'rice ball': 'Rice (plain)',
  takoyaki: 'Sushi (soy sauce)',
  matcha: 'Matcha latte', 'matcha tea': 'Matcha latte',
  edamame: 'Celery / raw veg',

  // === Korea ===
  kimchi: 'Kimchi', 'kimchi stew': 'Kimchi', 'kimchi jjigae': 'Kimchi',
  bibimbap: 'Bibimbap', 'bibimbap bowl': 'Bibimbap',
  bulgogi: 'Bulgogi', 'bulgogi beef': 'Bulgogi',
  tteokbokki: 'Sweets / candy', 'spicy rice cakes': 'Sweets / candy',
  japchae: 'Noodles (soy-based)', 'glass noodles': 'Noodles (soy-based)',
  gochujang: 'Chilli sauce',

  // === Thailand ===
  'pad thai': 'Pad thai', padthai: 'Pad thai',
  'tom yum': 'Tom yum', 'tom yum goong': 'Tom yum', tomyum: 'Tom yum',
  'green curry': 'Thai green curry', 'thai green curry': 'Thai green curry', 'green curry chicken': 'Thai green curry',
  'massaman curry': 'Curry / turmeric', 'red curry': 'Curry / turmeric', 'panang curry': 'Curry / turmeric',
  'som tam': 'Carrot (raw)', 'papaya salad': 'Carrot (raw)',
  'mango sticky rice': 'Sweets / candy',

  // === Vietnam ===
  pho: 'Pho', 'pho bo': 'Pho', 'pho ga': 'Pho', 'pho noodles': 'Pho',
  'banh mi': 'Burger', 'banh mi sandwich': 'Burger',
  'summer rolls': 'Spring rolls', 'fresh spring rolls': 'Spring rolls', 'goi cuon': 'Spring rolls',
  'bun cha': 'Suya / grilled meat', 'bun bo': 'Ramen',

  // === India ===
  biryani: 'Biryani', 'chicken biryani': 'Biryani', 'mutton biryani': 'Biryani', 'veg biryani': 'Biryani',
  curry: 'Curry / turmeric', 'chicken curry': 'Curry / turmeric', 'indian curry': 'Curry / turmeric',
  dosa: 'Bread (white)', 'masala dosa': 'Bread (white)', 'plain dosa': 'Bread (white)',
  idli: 'Rice (plain)', idly: 'Rice (plain)',
  samosa: 'Samosa', samosas: 'Samosa',
  naan: 'Naan', 'garlic naan': 'Naan', 'butter naan': 'Naan', roti: 'Naan', chapati: 'Naan', paratha: 'Naan',
  tandoori: 'Tandoori chicken', 'tandoori chicken': 'Tandoori chicken', 'chicken tikka': 'Tandoori chicken',
  'tikka masala': 'Curry / turmeric', 'chicken tikka masala': 'Curry / turmeric', 'butter chicken': 'Curry / turmeric',
  paneer: 'Cheese', 'palak paneer': 'Curry / turmeric', 'saag paneer': 'Curry / turmeric',
  dal: 'Pepper soup', 'dal soup': 'Pepper soup', 'lentil soup': 'Pepper soup',
  vindaloo: 'Curry / turmeric',
  pakora: 'Samosa', bhajji: 'Samosa', 'onion bhaji': 'Samosa',
  lassi: 'Yoghurt (plain)', 'mango lassi': 'Yoghurt (plain)',
  'gulab jamun': 'Sweets / candy', kulfi: 'Sweets / candy', jalebi: 'Sweets / candy',
  chai: 'Chai latte', 'masala chai': 'Chai latte', 'indian tea': 'Chai latte',

  // === Middle East ===
  falafel: 'Falafel', 'falafel wrap': 'Falafel', 'falafel sandwich': 'Falafel',
  shawarma: 'Shawarma', 'chicken shawarma': 'Shawarma', 'beef shawarma': 'Shawarma',
  'doner kebab': 'Shawarma', gyro: 'Shawarma', gyros: 'Shawarma',
  kebab: 'Suya / grilled meat', 'shish kebab': 'Suya / grilled meat', kofta: 'Suya / grilled meat',
  hummus: 'Hummus', 'hummus dip': 'Hummus',
  baklava: 'Sweets / candy', knafeh: 'Sweets / candy', kunafa: 'Sweets / candy',
  tabbouleh: 'Celery / raw veg', tabouli: 'Celery / raw veg', fattoush: 'Celery / raw veg',
  'baba ganoush': 'Hummus', 'baba ghanoush': 'Hummus',
  mansaf: 'Suya / grilled meat', kibbeh: 'Suya / grilled meat',

  // === Russia & Eastern Europe ===
  borscht: 'Borscht', borsch: 'Borscht', borsht: 'Borscht',
  pelmeni: 'Dumplings / dim sum', vareniki: 'Dumplings / dim sum', pierogi: 'Dumplings / dim sum', pierogies: 'Dumplings / dim sum',
  blini: 'Bread (white)', blinis: 'Bread (white)', blintzes: 'Bread (white)',
  'beef stroganoff': 'Suya / grilled meat', stroganoff: 'Suya / grilled meat',
  kvass: 'Kvass', kvas: 'Kvass',
  kefir: 'Yoghurt (plain)', 'kefir drink': 'Yoghurt (plain)',
  solyanka: 'Pepper soup',

  // === Italy ===
  pasta: 'Pasta / pasta sauce', spaghetti: 'Pasta / pasta sauce', bolognese: 'Pasta / pasta sauce', 'spaghetti bolognese': 'Pasta / pasta sauce',
  lasagna: 'Lasagna', lasagne: 'Lasagna',
  risotto: 'Risotto', 'mushroom risotto': 'Risotto',
  carbonara: 'Carbonara', 'spaghetti carbonara': 'Carbonara',
  gnocchi: 'Pasta (plain)', ravioli: 'Pasta / pasta sauce', tortellini: 'Pasta / pasta sauce',
  tiramisu: 'Sweets / candy', gelato: 'Sweets / candy', 'ice cream': 'Sweets / candy', icecream: 'Sweets / candy',
  focaccia: 'Bread (white)', bruschetta: 'Bread (white)', panettone: 'Bread (white)',

  // === Mexico & Latin America ===
  tacos: 'Tacos', taco: 'Tacos', 'fish tacos': 'Tacos',
  burrito: 'Burrito', 'burrito bowl': 'Burrito', quesadilla: 'Burrito', enchiladas: 'Burrito', fajitas: 'Tacos',
  nachos: 'Nachos (loaded)', 'loaded nachos': 'Nachos (loaded)',
  guacamole: 'Guacamole', guac: 'Guacamole',
  salsa: 'Salsa', 'pico de gallo': 'Salsa',
  tamales: 'Dumplings / dim sum', tamale: 'Dumplings / dim sum',
  mole: 'Mole sauce', 'mole poblano': 'Mole sauce',
  ceviche: 'Fish (grilled)',
  churros: 'Sweets / candy', churro: 'Sweets / candy',
  feijoada: 'Palm oil soup', 'pao de queijo': 'Bread (white)', brigadeiro: 'Sweets / candy', moqueca: 'Palm oil soup',
  'jerk chicken': 'Jerk chicken', jerk: 'Jerk chicken',
  'ackee and saltfish': 'Eggs', callaloo: 'Efo riro',

  // === France ===
  croissant: 'Croissant', croissants: 'Croissant', 'pain au chocolat': 'Croissant',
  baguette: 'Bread (white)', 'french bread': 'Bread (white)',
  crepe: 'Bread (white)', crepes: 'Bread (white)', 'french crepe': 'Bread (white)',
  quiche: 'Eggs', 'quiche lorraine': 'Eggs',
  ratatouille: 'Efo riro', 'coq au vin': 'Suya / grilled meat',
  bouillabaisse: 'Pepper soup', escargot: 'Fish (grilled)',
  macaron: 'Sweets / candy', macarons: 'Sweets / candy', 'creme brulee': 'Sweets / candy',
  'french onion soup': 'Pepper soup',

  // === Spain ===
  paella: 'Paella', 'seafood paella': 'Paella', 'chicken paella': 'Paella',
  tapas: 'Tacos', 'spanish tapas': 'Tacos',
  gazpacho: 'Tomato sauce', 'spanish omelette': 'Eggs', 'tortilla espanola': 'Eggs',
  jamon: 'Suya / grilled meat', 'jamon iberico': 'Suya / grilled meat', chorizo: 'Chorizo',
  sangria: 'Sangria',

  // === Germany ===
  bratwurst: 'Hot dog', 'german sausage': 'Hot dog', sausage: 'Hot dog', wurst: 'Hot dog', currywurst: 'Hot dog',
  pretzel: 'Bread (white)', 'soft pretzel': 'Bread (white)',
  sauerkraut: 'Celery / raw veg', schnitzel: 'Chicken (grilled)', 'wiener schnitzel': 'Chicken (grilled)',
  spatzle: 'Pasta (plain)', spaetzle: 'Pasta (plain)',

  // === Greece ===
  moussaka: 'Curry / turmeric', tzatziki: 'Yoghurt (plain)', souvlaki: 'Suya / grilled meat',
  spanakopita: 'Bread (white)', dolmades: 'Celery / raw veg', dolma: 'Celery / raw veg',
  'greek salad': 'Celery / raw veg', feta: 'Cheese',

  // === Ethiopia ===
  injera: 'Bread (white)',
  'doro wat': 'Curry / turmeric', dorowat: 'Curry / turmeric', 'doro wot': 'Curry / turmeric',
  tibs: 'Suya / grilled meat', kitfo: 'Beef (grilled)', shiro: 'Pepper soup',

  // === Common generic ===
  sandwich: 'Burger', sub: 'Burger', panini: 'Burger', wrap: 'Burger',
  salad: 'Celery / raw veg', 'green salad': 'Celery / raw veg', 'caesar salad': 'Celery / raw veg',
  steak: 'Beef (grilled)', 'grilled steak': 'Beef (grilled)',
  soup: 'Pepper soup', 'chicken soup': 'Pepper soup', 'vegetable soup': 'Pepper soup',
  bread: 'Bread (white)', toast: 'Bread (white)',
  cheese: 'Cheese', 'cheese platter': 'Cheese',
  egg: 'Eggs', eggs: 'Eggs', omelette: 'Eggs', omelet: 'Eggs', 'scrambled eggs': 'Eggs',
  'fried chicken': 'Chicken (grilled)', 'roast chicken': 'Chicken (grilled)', 'grilled chicken': 'Chicken (grilled)',
  'grilled fish': 'Fish (grilled)', salmon: 'Fish (grilled)', 'smoked salmon': 'Fish (grilled)',
  'chocolate cake': 'Sweets / candy', brownie: 'Sweets / candy', cookie: 'Sweets / candy', cookies: 'Sweets / candy',
  cake: 'Sweets / candy', cupcake: 'Sweets / candy', donut: 'Sweets / candy', doughnut: 'Sweets / candy', pastry: 'Sweets / candy',
  sundae: 'Sweets / candy', milkshake: 'Sweets / candy',
  'dark chocolate': 'Dark chocolate (70%+)', 'milk chocolate': 'Chocolate', 'chocolate bar': 'Chocolate',
  candy: 'Sweets / candy', gummy: 'Sweets / candy', gummies: 'Sweets / candy', lollipop: 'Sweets / candy',
  'potato wedges': 'French fries', 'mashed potatoes': 'Bread (white)', mash: 'Bread (white)',
  rice: 'Rice (plain)', 'plain rice': 'Rice (plain)', 'white rice': 'Rice (plain)', 'steamed rice': 'Rice (plain)',
};

const EQUIVALENT_ALIASES = new Set(['moimoi', 'moinmoin', 'moimoin', 'moi moi', 'moin moi', 'ogi', 'akamu', 'pap', 'koko', 'jollof', 'jolof', 'jolloof', 'jollof rice', 'ewa', 'honey beans', 'beans porridge', 'ewa agoyin', 'ewa aganyin', 'elubo', 'akpu', 'semo', 'semolina swallow', 'semovita', 'ofada', 'asaro', 'yam porridge', 'yam pottage', 'boiled egg', 'fried egg', 'scrambled egg', 'scrambled eggs', 'omelette', 'omelet', 'eggs', 'egg', 'hotdog', 'hamburger', 'pho', 'pho bo', 'pho ga', 'ramen', 'borsch', 'borsht', 'lasagne', 'hummus', 'guac', 'chai']);
function resolveAlias(name) {
  const n = normalize(name);
  // Spelling/synonym equivalence only, not a vaguely similar recipe.
  // A sandwich is not a burger, pancakes are not bread, soup is not pepper soup.
  return EQUIVALENT_ALIASES.has(n) ? FOOD_ALIASES[n] || null : null;
}

// Precomputed category baselines: the average stain_level, chromogenic,
// acidity and tannin across all catalog items in each category. Used as the
// deterministic fallback when no catalog match is found, so unmatched foods
// still get a research-grounded score instead of an arbitrary number.
const CATEGORY_BASELINES = (() => {
  const acc = {};
  for (const item of STAIN_CATALOG) {
    const c = item.category;
    if (!acc[c]) acc[c] = { stain: [], chromogenic: [], acidity: [], tannin: [] };
    acc[c].stain.push(item.stain_level);
    acc[c].chromogenic.push(item.chromogenic);
    acc[c].acidity.push(item.acidity);
    acc[c].tannin.push(item.tannin);
  }
  const out = {};
  for (const [cat, vals] of Object.entries(acc)) {
    const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    out[cat] = {
      stain: avg(vals.stain),
      chromogenic: avg(vals.chromogenic),
      acidity: avg(vals.acidity),
      tannin: avg(vals.tannin),
    };
  }
  return out;
})();

// --- Match scoring ----------------------------------------------------------

function matchScore(query, candidate) {
  const q = normalize(query);
  const c = candidate.norm;
  const ct = candidate.tokens;
  if (!q) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) {
    const shorter = Math.min(q.length, c.length);
    const longer = Math.max(q.length, c.length);
    return 0.85 + (shorter / longer) * 0.1;
  }
  const qTokens = removeFiller(q);
  const overlap = tokenOverlap(qTokens, ct);
  // Require a MAJORITY of tokens to overlap. Exactly 50% — one shared word
  // between two-word names — is what relabels "black beans" as "black tea" on
  // the shared word "black". A bare majority avoids that false match while
  // still matching legit near-synonyms (e.g. 2 of 3 tokens shared).
  if (overlap > 0.5) return 0.6 + overlap * 0.2;
  const dist = levenshtein(q, c, 4);
  if (dist <= 2) return 0.7 - dist * 0.1;
  const qTokArr = qTokens.split(' ').filter(Boolean);
  const cTokArr = ct.split(' ').filter(Boolean);
  // Count how many query tokens find an exact or near-exact match in the
  // candidate. A SINGLE shared token (e.g. "black" in "black beans" vs
  // "black tea") must NOT override the LLM's identification — it turns solid
  // foods into beverages. Require either a one-token query (the whole name)
  // or at least two matched tokens, and scale the score by the matched
  // fraction so partial matches stay below the catalog-override threshold.
  let matched = 0;
  for (const qt of qTokArr) {
    let found = false;
    for (const ct2 of cTokArr) {
      if (qt === ct2) { found = true; break; }
      const td = levenshtein(qt, ct2, 3);
      if (td <= 2 && qt.length >= 4) { found = true; break; }
    }
    if (found) matched++;
  }
  let bestTokScore = 0;
  if (matched > 0 && (qTokArr.length === 1 || matched >= 2)) {
    bestTokScore = 0.65 * (matched / qTokArr.length);
  }
  return Math.max(bestTokScore, overlap * 0.3);
}

// --- Public API -------------------------------------------------------------

const MATCH_THRESHOLD = 0.88;

/**
 * Identify every distinct food/drink item in a photo (Cal AI-style multi-item).
 * The LLM returns an `items` array — one entry per separable item on the plate
 * (rice + stew + chicken, not just "jollof rice"). Each item is resolved
 * independently against the discovered-food cache / calibrated catalog, with
 * portion-aware calories and macros.
 *
 * @param {Object} llmResult — { is_food, items: [{ name, category, portion_multiplier, calories_per_serving, calories, protein_g, carbs_g, fat_g, chromogenic, acidity, tannin }], description, confidence }
 * @returns {Object} —
 *   rejected: true if the photo was not food/drink (with a user-facing message)
 *   items: [{ item, scores, macros, source, confidence }] — one per identified item
 */
export function identifyFood(llmResult) {
  if (llmResult?.image_usable === false) return { rejected: true, reason: 'poor_image', message: 'Food details are unclear. Move closer, use even light and retake, or choose the item in the catalog.' };
  // --- Food validation gate ---
  if (llmResult?.is_food === false) {
    return {
      rejected: true,
      reason: 'not_food',
      message: "That doesn't look like food or drink. Try scanning something you'd eat or sip.",
    };
  }
  let items = Array.isArray(llmResult?.items) ? llmResult.items.filter(Boolean) : [];
  // Single-item schema: the LLM returns one food object directly (name,
  // category, …) rather than an items array. Wrap it so the rest of the
  // pipeline always works with a uniform items list.
  if (items.length === 0 && llmResult && llmResult.name) {
    items = [llmResult];
  }
  if (items.length === 0) {
    return {
      rejected: true,
      reason: 'no_items',
      message: "I couldn't identify any food or drink in that photo. Try scanning something you'd eat or sip.",
    };
  }
  // Unknown identity must not be auto-logged or taught to the food cache.
  const uncertain = items.some((it) => !it.name?.trim() || it.confidence == null || !Number.isFinite(Number(it.confidence)) || Number(it.confidence) < 60);
  if (uncertain) return { rejected: true, reason: 'uncertain_food', message: 'I cannot confidently identify every visible item. Try a closer photo with items separated, or select them from the catalog.' };
  return { rejected: false, items: items.map((it) => identifyFoodItem(it)) };
}

/**
 * Identify ONE food item from an LLM item description and return calibrated
 * stain scores + portion-aware calories + macros.
 *
 * @param {Object} itemLLM — { name, category, portion_multiplier, calories_per_serving, calories, protein_g, carbs_g, fat_g, chromogenic, acidity, tannin, confidence }
 * @returns {Object} —
 *   identified: true if a catalog match was found
 *   item: { name, category, stain_level, calories } — the final item to log
 *   scores: { stain_level, chromogenic, acidity, tannin }
 *   macros: { protein_g, carbs_g, fat_g }
 *   source: 'catalog' | 'ai_scan'
 *   confidence: match confidence (0-1)
 */
export function identifyFoodItem(itemLLM) {
  const rawName = itemLLM?.name || '';
  const rawCategory = itemLLM?.category || 'food';
  // Resolve common local/variant spellings (e.g. "moimoi" → "Moin moin",
  // "ogi"/"pap" → "Pap / ogi") so regional foods match the calibrated catalog
  // instead of falling through to the property-based fallback.
  const matchName = resolveAlias(rawName) || rawName;

  // Per-item identification confidence from the LLM (0-100, varies per photo).
  // Used to compute a real accuracy instead of the catalog match score, which
  // is 1.0 for every exact match and so always rendered "100%".
  const llmConfRaw = itemLLM?.confidence == null ? NaN : Number(itemLLM.confidence);
  const llmConf = Number.isFinite(llmConfRaw)
    ? Math.max(0, Math.min(100, Math.round(llmConfRaw)))
    : null;

  // Cal AI-style portion awareness: the LLM estimates how many standard
  // servings are visible (portion_multiplier) using the plate/utensils as a
  // size reference. Catalog calories (per-serving) are then scaled by this
  // multiplier, so a 2-cup plate of rice scores ~2× a 1-cup bowl instead of
  // both getting the same fixed number. Bounded to [0.25, 6] to reject absurd
  // estimates. Macros are LLM-estimated for the visible portion directly.
  const mult = Math.max(0.25, Math.min(6, Number(itemLLM?.portion_multiplier) || 1));
  const macros = {
    protein_g: Math.max(0, Math.round(Number(itemLLM?.protein_g) || 0)),
    carbs_g: Math.max(0, Math.round(Number(itemLLM?.carbs_g) || 0)),
    fat_g: Math.max(0, Math.round(Number(itemLLM?.fat_g) || 0)),
  };

  // --- Category-aware matching ---
  // Search the LLM's category first (prevents "green tea" matching "Green tea"
  // in the tea category over something unrelated in another category), then
  // fall back to a full-catalog search if no good match was found.
  let best = null;
  let bestScore = 0;

  for (const candidate of CATALOG_INDEX) {
    if (candidate.item.category !== rawCategory) continue;
    const s = matchScore(matchName, candidate);
    if (s > bestScore) { bestScore = s; best = candidate; }
  }
  if (bestScore < MATCH_THRESHOLD) {
    for (const candidate of CATALOG_INDEX) {
      const beverages = new Set(['coffee', 'tea', 'wine', 'soda', 'juice']);
      if (beverages.has(rawCategory) !== beverages.has(candidate.item.category)) continue;
      const s = matchScore(matchName, candidate);
      if (s > bestScore) { bestScore = s; best = candidate; }
    }
  }

  // Calculated per-item accuracy: blend the LLM's identification confidence
  // with the catalog match score, so an exact match only reads 100% when the
  // LLM was also fully certain — not on every scan. When the LLM didn't supply
  // a confidence (e.g. the manual name-correction flow), the match score alone
  // is used.
  const matchPct = Math.round((bestScore || 0) * 100);
  // A name match is not evidence of correct visual recognition.
  const itemConfidence = llmConf != null ? llmConf : matchPct;

  if (best && bestScore >= MATCH_THRESHOLD) {
    // Portion-aware calories: scale the catalog's per-serving kcal by the
    // LLM's portion_multiplier (Cal AI-style). Falls back to the LLM's
    // per-serving estimate if the food isn't in the calorie DB.
    const baseCal = getCalories(best.item.name);
    const calories = baseCal != null
      ? Math.max(0, Math.round(baseCal * mult))
      : (Math.max(0, Math.round((Number(itemLLM?.calories_per_serving) || 0) * mult)) || null);
    return {
      identified: true,
      rejected: false,
      match: best.item,
      item: {
        name: rawName,
        category: best.item.category,
        stain_level: best.item.stain_level,
        calories,
      },
      scores: {
        stain_level: best.item.stain_level,
        chromogenic: best.item.chromogenic,
        acidity: best.item.acidity,
        tannin: best.item.tannin,
      },
      region: itemLLM?.region || null,
      macros,
      source: 'catalog',
      confidence: itemConfidence,
    };
  }

  // --- Deterministic fallback (no catalog match) ---
  // Compute a research-grounded stain score from the LLM's property
  // assessments + the category baseline. This replaces the old arbitrary "20"
  // — every unmatched food now gets a score that reflects its actual
  // chromogenic, acidity and tannin properties, weighted the same way the
  // catalog's stain_level correlates with those three factors.
  const baseline = CATEGORY_BASELINES[rawCategory] || CATEGORY_BASELINES.food;
  const chromogenic = clamp(itemLLM?.chromogenic ?? baseline.chromogenic);
  const acidity = clamp(itemLLM?.acidity ?? baseline.acidity);
  const tannin = clamp(itemLLM?.tannin ?? baseline.tannin);

  // Weighted formula: pigment is the biggest driver of extrinsic staining,
  // followed by tannin (which binds pigment to enamel) and acidity (which
  // roughens enamel so stains cling). The category baseline acts as a floor
  // so a category that's inherently stainer (e.g. coffee) always scores
  // higher than a neutral one (e.g. protective) even with low properties.
  const computedStain = Math.round(
    0.35 * chromogenic + 0.25 * tannin + 0.20 * acidity + 0.20 * baseline.stain
  );
  const stainLevel = clamp(computedStain);

  // Portion-aware calories for unmatched foods: prefer per-serving × portion
  // multiplier (Cal AI-style); fall back to the LLM's direct estimate.
  const perServing = Number(itemLLM?.calories_per_serving) || 0;
  const calories = perServing
    ? Math.max(0, Math.round(perServing * mult))
    : (Math.max(0, Math.round(itemLLM?.calories ?? 0)) || null);
  return {
    identified: false,
    rejected: false,
    match: null,
    item: {
      name: rawName || 'Unknown item',
      category: rawCategory,
      stain_level: stainLevel,
      calories,
    },
    scores: {
      stain_level: stainLevel,
      chromogenic,
      acidity,
      tannin,
    },
    region: itemLLM?.region || null,
    macros,
    source: 'ai_scan',
    confidence: itemConfidence,
  };
}

/**
 * Build the LLM prompt for food identification.
 * The LLM identifies the food and assesses its staining properties — it does
 * NOT assign a stain score. The engine computes the score from those
 * properties against the calibrated catalog / category baselines.
 */
export function buildFoodPrompt() {
  return `You are a food identification expert working for a dental stain + calorie tracker app.

STEP 1 — IS THIS FOOD?
Look at the photo. Is this actually food or drink that a person would consume?
- YES: a meal, a snack, a beverage, a fruit, a sauce, a piece of food on a plate/in a glass.
- NO: an empty wrapper/carton, a menu, a restaurant sign, an empty plate, scenery, a tooth, or a pet. Food in a container and a recognizable beverage with a readable label are valid; do not reject merely because packaging or people are also present.
Set image_usable=false when blur, occlusion or extreme exposure prevents recognition. Distinguish poor photo quality from not-food. Set is_food=false only when no food or beverage is visible; ambiguity about the specific dish belongs in low item confidence.

STEP 2 — IDENTIFY EVERY DISTINCT ITEM (CRITICAL — THIS IS THE MOST IMPORTANT STEP)
Identify only clearly VISIBLE, separable food/drink items, one entry per visible portion. A meal may contain ONE item or several; never assume a minimum count or add culturally typical side dishes. Do not split a mixed dish into hidden ingredients or count the same portion twice.

CORRECT examples:
- A plate with amala + gbegiri + ewedu + stew + beef → FIVE items: "Amala", "Gbegiri", "Ewedu", "Stew", "Beef"
- Rice + stew + chicken → THREE items: "Rice", "Stew", "Chicken"
- Burger + fries → TWO items: "Burger", "French fries"

WRONG (do NOT do this):
- Returning only "Amala" for a plate that clearly has amala + soups + meat
- Merging everything into one name like "amala with soup"

METHOD: Scan the plate section by section. For each distinct food you see (different color, different texture, different food type, separate pile or section of the plate), add a separate entry. Before returning, COUNT your items — if you see 5 distinct foods in the photo, you MUST return 5 items, not 1 or 2.

- name: the food/drink name supported by visible evidence. When several recipes look alike, use a broader truthful name and lower confidence; never invent ingredients, brands, sauces or origin. Be precise — use the most common name for this exact dish. "Iced latte" not "coffee", "Jollof rice" not "rice", "Espresso" not "coffee", "Amala" not "swallow", "Efo riro" not "soup", "Gbegiri" not "bean soup", "Ewedu" not "jute soup". If it's a brand, use the generic equivalent (Coca-Cola → "Cola").
- LOCAL FOODS: Recognize local, indigenous, street and regional foods from ANY country and use their local name. Examples — Nigeria: amala, eba, fufu, semovita, tuwo, efo riro, egusi soup, gbegiri (bean soup), ewedu (jute soup), moin moin, akara, pap/ogi (akamu), puff puff, suya, jollof rice, beans (ewa), yam porridge (asaro), ofada rice, gari, chin chin, stew (Nigerian tomato stew); Ghana: banku, kenkey, kelewele, waakye; Kenya: ugali, nyama choma, sukuma wiki; Ethiopia: injera, doro wat; India: idli, dosa, biryani, samosa, naan, tikka masala, chai; China: dim sum, dumplings, kung pao, mapo tofu, peking duck, hotpot, congee, chow mein; Japan: sushi, ramen, tempura, udon, miso soup; Korea: kimchi, bibimbap, bulgogi, tteokbokki; Thailand: pad thai, tom yum, green curry; Vietnam: pho, banh mi, summer rolls; Mexico: tacos, burrito, tamales, mole; US: burger, hot dog, fries, pizza, bbq; UK: fish and chips, full english breakfast, shepherd's pie, bangers and mash; Russia: borscht, pelmeni, blini, kvass; Italy: pasta, risotto, carbonara, tiramisu; France: croissant, crepe, quiche; Spain: paella, gazpacho, churros; Germany: bratwurst, pretzel, schnitzel; Middle East: falafel, shawarma, hummus, kebab. If you recognise it, name it precisely.
- category: one of: coffee, tea, wine, soda, juice, food, fruit, sauce, habit, protective
- CATEGORY SANITY (critical — do not get this wrong): tea, coffee, wine, soda and juice are LIQUIDS served in a cup, glass or bottle. If the photo shows a solid, semi-solid, porridge, stew, soup or cooked dish, it is NEVER a beverage — use category food, sauce or fruit. Common mistakes to avoid: cooked beans (Nigerian ewa / honey beans / beans porridge / beans and plantain) → name "Beans (ewa)", category "food" — NOT "black tea"; dark stew → "food" or "sauce", not "tea"; brown pap/ogi → "food", not "coffee"; a swallow (amala, eba, fufu, semovita, tuwo, pounded yam, ugali) → category "food". Only assign a beverage category if the item is clearly a liquid in a drink vessel.

STEP 3 — EGG IDENTIFICATION (critical — do NOT confuse eggs with meat)
Eggs are extremely common and are frequently confused with beef/meat. Learn to distinguish them:
- Boiled egg: a whole or sliced egg with a WHITE exterior and a YELLOW yolk center. May appear as a rounded white/yellow mass.
- Whisked/scrambled egg: YELLOW scrambled curds, often soft and fluffy. NOT beef.
- Fried egg: flat, round, with a white base and yellow yolk center.
- Omelette: a folded or flat yellow-white mass.
- KEY DISTINCTION: Eggs are YELLOW and WHITE, soft, smooth, and often rounded. Beef is BROWN or DARK RED, fibrous, and has a meat texture with visible fibers. A yellow, soft, smooth, rounded mass is almost certainly EGG — not beef. When in doubt between egg and beef: Is it yellow with a smooth texture? → "Eggs". Is it brown/dark red with a fibrous meat texture? → "Beef".
- Always name eggs as "Eggs" (category "food"), never as "Beef" or "Beef (grilled)".

STEP 4 — ESTIMATE THE PORTION PER ITEM (Cal AI-style — this drives calorie accuracy)
Portions and nutrients are approximate, not measurements. Ordinary plates, bowls, utensils and hands have UNKNOWN dimensions, so never treat them as calibrated scale references. Do not infer hidden oil, sugar or fillings as known facts. If no reliable scale is visible, use a conservative typical serving estimate and say 'estimated portion; size unverified' in portion_description.
- portion_description: describe the visible amount (e.g. "2 cups", "1 large slice", "12oz can", "full plate ~3 cups").
- portion_multiplier: how many STANDARD servings of this item are visible, as a decimal (1 = one standard serving, 2 = two servings, 0.5 = half). Reference servings: rice/pasta/swallow ~1 cup (150g), meat/fish ~85g (3oz, palm-sized), bread ~1 slice (30g), pizza ~1 slice (125g), a drink = 12oz can / 5oz wine glass / 1.5oz shot / 8oz juice. Estimate carefully.
- calories_per_serving: kcal in ONE standard serving of this item (integer).
- calories: total kcal for the VISIBLE portion of this item (integer) — should equal calories_per_serving × portion_multiplier.
- protein_g, carbs_g, fat_g: grams of protein, carbs and fat in the VISIBLE portion of this item (already scaled to what's shown — not per serving).

STEP 5 — ASSESS STAINING PROPERTIES PER ITEM (only if is_food is true)
Rate each property 0-100 based on what you see and what you know about this item:
- chromogenic: how intensely colored/pigmented is it? (water=0, milk=0, coffee=70, beetroot=95, red wine=88, cola=75, moin moin=35, pap/ogi=10, amala=18, turmeric=90)
- acidity: how acidic is it? (water=0, milk=25, lemon=95, cola=90, orange juice=95, coffee=50, pap/ogi=60, zobo=55, akara=30, fufu=35)
- tannin: how much tannin does it contain? (water=0, black tea=92, coffee=80, red wine=75, cola=30, suya=45, kunu=22)

Do NOT estimate a "stain level" — the engine computes that from your property assessments.

STEP 5b — LOCATE EACH ITEM (for pixel color calibration)
For each item, give its bounding box as fractions of the full image (0 = left/top edge, 1 = right/bottom edge):
- region: { x, y, w, h } — (x, y) is the top-left corner, w and h are width and height, all as decimals 0-1. The engine samples the REAL pixels of that food to verify its color independently of your guess. Be as tight as possible around the food. If you truly cannot localize it, omit region.

STEP 6 — CONFIDENCE PER ITEM
- confidence: your confidence in the identification of this item (0-100). 0 if you can't identify it at all.

STEP 7 — FINAL VERIFICATION (before returning the JSON)
Count the distinct items in your "items" array. Does the count match the number of distinct foods you can see in the photo? If you see 5 distinct foods but only listed 1 or 2, go back and add the missing items. A plate with multiple foods MUST have multiple entries — this is non-negotiable.

Return JSON with: is_food (boolean), image_usable (boolean), items (array of objects, each with: name, category, portion_description, portion_multiplier, calories_per_serving, calories, protein_g, carbs_g, fat_g, chromogenic, acidity, tannin, region, description, confidence). Always return an items array — even if there is only one item.`;
}

export const FOOD_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    is_food: { type: 'boolean' },
    image_usable: { type: 'boolean' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string' },
          portion_description: { type: 'string' },
          portion_multiplier: { type: 'number' },
          calories_per_serving: { type: 'number' },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          chromogenic: { type: 'number' },
          acidity: { type: 'number' },
          tannin: { type: 'number' },
          region: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              w: { type: 'number' },
              h: { type: 'number' },
            },
          },
          description: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    },
  },
};

// Category icon mapping (re-exported for convenience)
export { CATEGORY_LABEL };