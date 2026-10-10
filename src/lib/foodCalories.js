// Calorie estimates for common foods & drinks (typical single serving).
// Used by unrufldfood to give consistent calorie counts for catalog matches.
// For items not listed here, the LLM estimates calories from the photo.
//
// Values are approximate per-typical-serving and meant for wellness tracking,
// not clinical dietary analysis.

export const CALORIE_DB = {
  // Coffee (per cup / shot)
  'Coffee': 2, 'Espresso': 3, 'Iced coffee': 120, 'Cold brew': 5, 'Instant coffee': 2,
  'Decaf coffee': 2, 'Hot chocolate': 192, 'Irish coffee': 210, 'Espresso martini': 230,

  // Tea
  'Black tea': 2, 'Green tea': 2, 'Herbal tea': 2, 'Chai latte': 180, 'Matcha latte': 170,
  'Bubble tea': 280, 'Iced tea (bottled)': 90, 'Pu-erh': 2, 'Oolong': 2, 'Yerba mate': 3,
  'Turmeric latte': 150, 'Hibiscus tea': 2,

  // Wine (per 5oz glass)
  'Red wine': 125, 'White wine': 120, 'Rosé wine': 105, 'Sangria': 150,
  'Prosecco / champagne': 90, 'Palm wine': 160,

  // Soda (per 12oz can)
  'Cola': 140, 'Dark soda': 150, 'Energy drink': 110, 'Ginger ale': 90, 'Tonic water': 80,
  'Kombucha': 30, 'Sports drink': 80, 'Beer (dark)': 200,

  // Juice (per 8oz)
  'Orange juice': 110, 'Grape juice': 150, 'Pomegranate juice': 130, 'Cranberry juice': 115,
  'Carrot juice': 80, 'Beetroot juice': 70, 'Lemonade': 99, 'Lemon water': 6,
  'Coconut water': 45, 'Smoothie (berry)': 230, 'Smoothie (tropical)': 200,
  'Zobo (hibiscus drink)': 50, 'Kunu (millet drink)': 120, 'Fura da nono': 180,

  // Food (per typical serving)
  'Jollof rice': 350, 'Coconut jollof': 340, 'Guacamole': 100, 'Avocado': 240,
  'Curry / turmeric': 400, 'Biryani': 520, 'Pasta / pasta sauce': 380, 'Lasagna': 380,
  'Pizza': 285, 'Burger': 295, 'French fries': 365, 'Chocolate': 145,
  'Dark chocolate (70%+)': 170, 'Sweets / candy': 150, 'Beetroot': 35,
  'Palm oil soup': 450, 'Suya / grilled meat': 300, 'Pounded yam + egusi': 550,
  'Plantain (fried)': 230, 'Dodo (fried plantain)': 230, 'Boli (roasted plantain)': 180,
  'Jollof spaghetti': 380, 'Fried rice (soy)': 400, 'Chow mein': 420, 'Ramen': 436,
  'Pho': 350, 'Noodles (soy-based)': 380, 'Sushi (soy sauce)': 350, 'Tacos': 226,
  'Burrito': 445, 'Nachos (loaded)': 690, 'Chorizo': 273, 'Banga soup': 400,
  'Egusi soup': 450, 'Efo riro': 300, 'Okra soup': 150, 'Pepper soup': 200,
  'Groundnut soup': 380, 'Light soup': 250, 'Ofada sauce (ayamaya)': 300,
  'Moin moin': 280, 'Akara': 250, 'Chin chin': 430, 'Puff puff': 320,
  'Meat pie': 350, 'Gizdodo': 400, 'Waakye': 400, 'Rice (plain)': 205,
  'Bread (white)': 80, 'Pasta (plain)': 220, 'Eggs': 78, 'Fish (grilled)': 175,
  'Chicken (grilled)': 165, 'Beef (grilled)': 250, 'Pasta with squid ink': 400,
  'Borscht': 180,

  // Fruit (per typical serving)
  'Berries': 85, 'Blueberry': 85, 'Blackberry': 62, 'Raspberry': 64,
  'Strawberry': 49, 'Cherry': 87, 'Pomegranate seeds': 83, 'Grapes (dark)': 104,
  'Mango': 99, 'Pineapple': 82, 'Watermelon': 46, 'Banana': 105,
  'Acai bowl': 300, 'Dragon fruit (red)': 102, 'Raisins': 129, 'Dried cranberries': 130,
  'Jam / preserves': 56,

  // Sauce (per 2 tbsp)
  'Tomato sauce': 40, 'Soy sauce': 10, 'Balsamic vinegar': 42, 'Ketchup': 20,
  'Chilli sauce': 15, 'BBQ sauce': 29, 'Mustard': 10, 'Pesto': 120,
  'Hummus': 70, 'Salsa': 10, 'Grenadine': 80, 'Dulce de leche': 120, 'Mole sauce': 90,

  // Habits (0 kcal — not food)
  'Smoking / tobacco': 0, 'Cigarette': 0, 'Chewing tobacco': 0, 'Betel nut': 0,
  'Kola nut': 0, 'Hookah / shisha': 0, 'Vaping (coloured)': 0,
  'Red wine (habit)': 125, 'Coffee (habit)': 2,

  // Protective
  'Water': 0, 'Milk': 103, 'Cheese': 113, 'Yoghurt (plain)': 100,
  'Apple': 95, 'Celery / raw veg': 16, 'Carrot (raw)': 41, 'Broccoli': 55,
  'Cucumber': 16, 'Nuts': 172, 'Hard cheese': 113, 'Sugar-free gum': 5,
};

// Lookup calories by food name (case-insensitive, returns null if unknown).
export function getCalories(name) {
  if (!name) return null;
  return CALORIE_DB[name] ?? null;
}