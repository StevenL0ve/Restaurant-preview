import type { AppState, CommunityEvent, MenuItem, SessionClass } from "../types";

// Demo dataset so the app is alive the moment it opens — real menus, a live
// class schedule, and a punch card that's part-way to a free drink. Class times
// are generated relative to "now" so the schedule always looks current.

const day = 86400000;

// Build an ISO datetime `daysFromNow`, at a given local hour/minute.
function at(daysFromNow: number, hour: number, min = 0): string {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return new Date(d.getTime() + daysFromNow * day).toISOString();
}

// ---- Menus ----

// The real Common Grounds drinks menu. `noPunch` marks the freebies for the
// littles & fur babies — everything else stamps the punch card.
const CAFE: (Omit<MenuItem, "id" | "venue" | "earnsPunch"> & { noPunch?: boolean })[] = [
  { category: "Specials", name: "Knafehgato", description: "Knafeh-style affogato — vanilla ice cream, crisp kataifi, hot espresso poured tableside.", price: 7.5, tags: ["seasonal", "popular"], image: "/photos/special-knafehgato.jpeg" },
  { category: "Specials", name: "Fig Vanilla Matcha", description: "Iced ceremonial matcha, fig jam, madagascar vanilla bean, milk of choice.", price: 7.0, tags: ["seasonal"], image: "/photos/special-fig-matcha.jpeg" },
  { category: "Specials", name: "Jamaica Sumac Soda", description: "Sparkling hibiscus (jamaica) with a bright sumac dust, over ice.", price: 5.5, tags: ["seasonal", "vegan", "gf"], image: "/photos/special-jamaica-soda.jpeg" },
  { category: "Signature", name: "Ube Latte", description: "Ube, coconut condensed milk, milk of choice.", price: 5.75, tags: ["popular"] },
  { category: "Signature", name: "CGP Matcha Latte", description: "Ceremonial grade matcha, agave, persian pistachio cold foam, milk of choice.", price: 6.25, tags: ["popular"] },
  { category: "Signature", name: "Tres Leches Cold Brew", description: "Cold brew, madagascar vanilla bean cold foam, coconut condensed milk, cinnamon dust.", price: 6.75, tags: [] },
  { category: "Signature", name: "Baklava Latte", description: "Double espresso, algerian baklava syrup, persian pistachio cold foam, milk of choice, crushed rosebuds & pistachio garnish.", price: 7.0, tags: ["popular"] },
  { category: "Signature", name: "Haldi Doodh", description: "Turmeric, ginger, cinnamon, cardamom, black pepper, milk of choice.", price: 6.25, tags: [] },
  { category: "Signature", name: "Mississippi Masala Chai Latte", description: "Assam black tea, ginger, cinnamon, cardamom, black pepper, cloves, star anise, milk of choice.", price: 6.0, tags: [] },
  { category: "Signature", name: "Coco Caramiso", description: "Double espresso, miso salted caramel syrup, milk of choice, cinnamon dust & coconut flake garnish.", price: 6.5, tags: [] },
  { category: "Tea", name: "Happy Tea", description: "Guayusa green tea, rosehips, hibiscus, jasmine green tea, green rooibos, apple bits, raspberries. Cup 4.00 / pot 6.25.", price: 4.0, tags: ["vegan", "gf"] },
  { category: "Tea", name: "Shaken Passion Happy Iced Tea", description: "Happy tea, passionfruit syrup, shaken.", price: 5.5, tags: ["vegan", "gf"] },
  { category: "Tea", name: "Masala Chai", description: "Assam black tea, ginger, cinnamon, cardamom, black pepper, cloves, star anise. Cup 4.00 / pot 6.25.", price: 4.0, tags: ["vegan"] },
  { category: "Tea", name: "Moroccan Mint Tea", description: "Fair trade certified mint tea. Cup 4.00 / pot 6.25.", price: 4.0, tags: ["vegan", "gf"] },
  { category: "Tea", name: "Lavender Mint Sweet Tea", description: "French lavender madeline syrup, mint garnish, black tea.", price: 5.5, tags: ["vegan"] },
  { category: "Coffee", name: "Espresso (single)", description: "Straight shot of the house roast.", price: 2.0, tags: [] },
  { category: "Coffee", name: "Espresso (double)", description: "Double shot of the house roast.", price: 4.0, tags: [] },
  { category: "Coffee", name: "Americano 12oz", description: "Espresso over hot water.", price: 4.0, tags: ["vegan"] },
  { category: "Coffee", name: "Pour Over 12oz", description: "Hand-brewed single origin.", price: 4.5, tags: ["vegan"] },
  { category: "Coffee", name: "Flat White", description: "Double espresso, velvet-steamed milk.", price: 4.75, tags: [] },
  { category: "Coffee", name: "Cappuccino", description: "Equal parts espresso, steamed milk & foam.", price: 4.5, tags: [] },
  { category: "Coffee", name: "Cold Brew", description: "Slow-steeped, served over ice.", price: 5.35, tags: ["vegan"] },
  { category: "Coffee", name: "Cortado", description: "Double shot cut with a splash of steamed milk.", price: 4.5, tags: ["popular"] },
  { category: "Coffee", name: "Latte", description: "Double espresso, steamed milk of choice.", price: 5.0, tags: [], image: "/photos/latte.jpeg" },
  { category: "Kids + Fur Babies", name: "Babycino / Puppuccino", description: "On the house for the littles and the fur babies.", price: 0, tags: [], noPunch: true },
  { category: "Kids + Fur Babies", name: "Hot Chocolate", description: "Steamed chocolate, milk of choice.", price: 4.0, tags: [], noPunch: true },
];

// By the Fig & the Olive — the real printed menu (figandtheolive.com).
// Their dishes use ghee, organic extra virgin olive oil and organic chicken.
const KITCHEN: Omit<MenuItem, "id" | "venue" | "earnsPunch">[] = [
  { category: "Börek & Beyönd", name: "Spinach Börek (2)", description: "Filo pastry, feta, spinach, chili fig jam.", price: 6.0, tags: ["veg"] },
  { category: "Börek & Beyönd", name: "Potato Börek (2)", description: "Filo pastry, spiced potatoes, spicy house sauce.", price: 6.0, tags: ["veg"] },
  { category: "Börek & Beyönd", name: "Zeit o Zataar", description: "Pita, sumac, thyme, olive oil, marinated olive.", price: 6.0, tags: ["veg", "vegan"] },
  { category: "Börek & Beyönd", name: "Pani Puri (3)", description: "Semolina hollow puffs, chickpea salad, spiced water.", price: 8.0, tags: ["veg", "vegan"] },
  { category: "Börek & Beyönd", name: "Samosas (2)", description: "Fried pastry, spiced potatoes, tamarind chutney, chickpea salad.", price: 8.0, tags: ["veg", "vegan"] },
  { category: "Börek & Beyönd", name: "Lamb Börek (2)", description: "Filo pastry, lamb, cacik.", price: 10.0, tags: [] },
  { category: "Boards", name: "Mezze", description: "Hummus, muhammara, baba ganoush, labneh, dolma, cacik, charred & marinated olives, pita.", price: 18.0, tags: ["veg", "gf option", "popular"], image: "/photos/figolive-mezze.jpeg" },
  { category: "Boards", name: "Fig & Goat Cheese Flatbread", description: "Brie, caramelized red onions, walnuts, fig glaze, microgreens.", price: 18.0, tags: ["veg", "popular"] },
  { category: "Boards", name: "BBQ Chicken Flatbread", description: "Jalapeño, cilantro, cheddar, slaw.", price: 18.0, tags: [] },
  { category: "Boards", name: "Falafel Board", description: "Harissa, hummus, olives, pickled vegetables, tahini sauce, pita.", price: 18.0, tags: ["vegan", "veg", "gf option"] },
  { category: "Boards", name: "Avocado Board", description: "Egg salad, pico de gallo, pickled onions, dukkah, olive oil, artisan bread.", price: 18.0, tags: ["veg option", "gf option"] },
  { category: "Breads", name: "Rainbow Sandwich", description: "Seasonal farm fresh vegetables, hummus spread.", price: 12.0, tags: ["veg", "vegan", "gf option"] },
  { category: "Breads", name: "Roasted Veggie Sandwich", description: "Eggplant, zucchini, squash, bell pepper, fresh greens, mushrooms, pesto.", price: 14.0, tags: ["veg", "vegan", "gf option"] },
  { category: "Breads", name: "Tandoori Chicken Sandwich", description: "Omelette, tomato, cucumber, in-house spicy sauce, seasonal side.", price: 18.0, tags: ["gf option"] },
  { category: "Breads", name: "Shawarma Wrap", description: "House-marinated chicken, pickles, garlic sauce, baked potato fries.", price: 18.0, tags: ["gf option", "popular"] },
  { category: "Bowls", name: "Greek Salad", description: "Artichoke, pepperoncini, kalamata olives, tomatoes, cucumber, red onions, feta cheese. Half 7.00 / full 12.00.", price: 12.0, tags: ["veg", "gf option"] },
  { category: "Bowls", name: "Fattoush Salad", description: "Fresh greens, cucumber, tomato, radish, bell pepper, mint, parsley. Half 7.00 / full 12.00.", price: 12.0, tags: ["veg", "vegan"] },
  { category: "Bowls", name: "Soba Noodle Salad", description: "Buckwheat noodles, edamame, seasonal veggies, roasted peanuts, coconut tamarind dressing. Half 8.00 / full 16.00.", price: 16.0, tags: ["veg", "vegan"] },
  { category: "Bowls", name: "Shawarma Bowl", description: "Saffron rice, chicken, greens, pickled vegetables, tahini sauce, roasted pepper sauce.", price: 18.0, tags: ["gf", "popular"] },
  { category: "Bowls", name: "Thali", description: "Basmati rice, assorted daals, vegetables, dessert, lassi, roti.", price: 20.0, tags: ["veg", "vegan option"] },
  { category: "By the Fire", name: "Kebab Paratha Roll", description: "Beef kebab, flaky bread, onions, green chutney, tamarind sauce.", price: 12.0, tags: ["veg option"] },
  { category: "By the Fire", name: "Seekh Kebab Platter", description: "Spiced beef, saffron vermicelli rice, grilled vegetables, garlic yogurt sauce.", price: 22.0, tags: ["gf option", "popular"], image: "/photos/figolive-food.jpeg" },
  { category: "By the Fire", name: "Lamb Chops", description: "Roasted cajun potato, mint chimichuri.", price: 25.0, tags: ["gf"] },
  { category: "Because You Deserve It!", name: "Baklava (3)", description: "Filo sheet, walnut, simple syrup.", price: 6.0, tags: ["veg"] },
  { category: "Because You Deserve It!", name: "Stuffed Dates (4)", description: "Feta cheese, walnuts, preserved orange, gold flakes, rose preserve, pistachios.", price: 8.0, tags: ["veg", "gf option", "popular"] },
  { category: "Because You Deserve It!", name: "Kulfi (2)", description: "Cream, rose petals, pistachios.", price: 10.0, tags: ["veg"] },
  { category: "Because You Deserve It!", name: "Knafeh", description: "Kataifi, nabulsi cheese, orange blossom syrup.", price: 14.0, tags: ["veg", "popular"] },
];

// Stable, name-derived ids so a saved cart never re-points to a different
// item when the menu is reordered or extended.
function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildMenu(): MenuItem[] {
  const cafe = CAFE.map(({ noPunch, ...m }) => ({
    ...m,
    id: `mc-${slug(m.name)}`,
    venue: "cafe" as const,
    earnsPunch: !noPunch,
  }));
  const kitchen = KITCHEN.map((m) => ({
    ...m,
    id: `mk-${slug(m.name)}`,
    venue: "restaurant" as const,
    earnsPunch: false,
  }));
  return [...cafe, ...kitchen];
}

// ---- Class & treatment schedule ----

// River Rock Yoga & Pilates (riverrockyoga.com) — 25+ classes a week.
// These mirror their real class types; times & prices are placeholders until
// the studio confirms the live schedule.
const YOGA: Omit<SessionClass, "id" | "venue" | "requiresWaiver">[] = [
  { name: "Gentle Flow Yoga", instructor: "Kim", description: "Slow, welcoming flow — perfect first class.", start: at(0, 8), durationMin: 60, capacity: 18, booked: 11, price: 20, level: "Gentle", image: "/photos/yoga.jpeg" },
  { name: "All-Levels Vinyasa Flow", instructor: "Moira", description: "Breath-linked flow that meets you where you are.", start: at(1, 9, 30), durationMin: 60, capacity: 20, booked: 8, price: 20, level: "All levels", image: "/photos/riverrock-camel.jpeg" },
  { name: "Restorative & Yin", instructor: "Kim", description: "Slow, floor-based, deeply relaxing. Props provided.", start: at(1, 18), durationMin: 60, capacity: 16, booked: 14, price: 22, level: "Gentle", image: "/photos/riverrock-lotus.jpeg" },
  { name: "PiYo", instructor: "Kim", description: "Pilates + yoga fusion — low impact, high energy.", start: at(3, 17, 30), durationMin: 55, capacity: 18, booked: 4, price: 22, level: "Intermediate" },
  { name: "Heated Hatha", instructor: "Moira", description: "Classic postures in a warm room. Bring a towel.", start: at(4, 8), durationMin: 75, capacity: 18, booked: 7, price: 24, level: "Intermediate", image: "/photos/yoga-class.jpeg" },
];

// Selah Pilates & Wellness (pilatesgulfcoast.com) — reformer, mat, classical
// and private Pilates. Times & prices are placeholders until Selah confirms.
const PILATES: Omit<SessionClass, "id" | "venue" | "requiresWaiver">[] = [
  { name: "Reformer — Small Group", instructor: "Selah", description: "Dynamic full-body reformer work with individual guidance.", start: at(0, 9), durationMin: 50, capacity: 6, booked: 4, price: 32, level: "All levels" },
  { name: "Pilates Mat", instructor: "Selah", description: "Core strength and alignment with small props — all levels.", start: at(1, 8, 30), durationMin: 50, capacity: 12, booked: 5, price: 22, level: "All levels", image: "/photos/riverrock-lotus.jpeg" },
  { name: "Classical Pilates", instructor: "Selah", description: "Joseph Pilates' original sequence — precision, strength, mobility.", start: at(2, 9), durationMin: 55, capacity: 8, booked: 3, price: 28, level: "Intermediate" },
  { name: "Private Session", instructor: "Selah", description: "One-on-one — injury recovery, athletic conditioning, tailored goals.", start: at(3, 13), durationMin: 55, capacity: 1, booked: 0, price: 75, level: "Private" },
];

// The Zen Den (zendenms.com) — a Nordic cycle spa: infrared sauna with red
// light, hot & cold plunge, and a Himalayan salt chamber.
const ZENDEN: Omit<SessionClass, "id" | "venue" | "requiresWaiver">[] = [
  { name: "Infrared Sauna + Red Light (45 min)", instructor: "Zen Den", description: "Radiant infrared heat with red light therapy — warms you from the inside out.", start: at(0, 12), durationMin: 45, capacity: 4, booked: 2, price: 35, level: "Sauna", image: "/photos/zenden-red.jpeg" },
  { name: "Nordic Cycle: Hot & Cold Plunge", instructor: "Zen Den", description: "Guided contrast rounds through the hot and cold plunge tubs. Reset and recharge.", start: at(1, 15), durationMin: 60, capacity: 6, booked: 3, price: 40, level: "Plunge" },
  { name: "Himalayan Salt Chamber (45 min)", instructor: "Zen Den", description: "Rest in the salt room — stress relief, energy, and easier breathing.", start: at(2, 11), durationMin: 45, capacity: 6, booked: 2, price: 30, level: "Salt room", image: "/photos/zenden-salt2.jpeg" },
  { name: "Full Zen Circuit (90 min)", instructor: "Zen Den", description: "The complete Nordic cycle: sauna, plunge, and salt chamber, at your pace.", start: at(3, 16), durationMin: 90, capacity: 6, booked: 4, price: 65, level: "Circuit", image: "/photos/zenden.jpeg" },
];

// Elemental Massage (elementalmassageos.com) — Valerie Hamby. Book ahead;
// same-day appointments aren't available. Prices are placeholders until
// Valerie confirms.
const MASSAGE: Omit<SessionClass, "id" | "venue" | "requiresWaiver">[] = [
  { name: "Swedish Massage (60 min)", instructor: "Valerie Hamby", description: "Classic full-body relaxation massage.", start: at(1, 14), durationMin: 60, capacity: 1, booked: 0, price: 110, level: "Relaxation" },
  { name: "Deep Tissue (60 min)", instructor: "Valerie Hamby", description: "Focused work for tension and knots.", start: at(2, 13), durationMin: 60, capacity: 1, booked: 0, price: 125, level: "Therapeutic" },
  { name: "Aromatherapy Massage (60 min)", instructor: "Valerie Hamby", description: "Relaxation massage with essential oils, tuned to how you want to feel.", start: at(3, 10), durationMin: 60, capacity: 1, booked: 0, price: 120, level: "Relaxation" },
  { name: "Lymphatic Drainage (60 min)", instructor: "Valerie Hamby", description: "Gentle rhythmic work that reduces inflammation and supports recovery.", start: at(4, 15), durationMin: 60, capacity: 1, booked: 0, price: 130, level: "Therapeutic" },
  { name: "Hands-On Wellness Class (2 hr)", instructor: "Valerie Hamby", description: "Learn fundamental massage techniques for relaxation and stress relief — bring a partner.", start: at(6, 10), durationMin: 120, capacity: 8, booked: 2, price: 65, level: "Class" },
];

function buildClasses(): SessionClass[] {
  const y = YOGA.map((c, i) => ({ ...c, id: `cy-${i + 1}`, venue: "yoga" as const, requiresWaiver: true }));
  const p = PILATES.map((c, i) => ({ ...c, id: `cp-${i + 1}`, venue: "pilates" as const, requiresWaiver: true }));
  const z = ZENDEN.map((c, i) => ({ ...c, id: `cz-${i + 1}`, venue: "zenden" as const, requiresWaiver: true }));
  const m = MASSAGE.map((c, i) => ({ ...c, id: `cm-${i + 1}`, venue: "massage" as const, requiresWaiver: true }));
  return [...y, ...p, ...z, ...m].sort((a, b) => a.start.localeCompare(b.start));
}

// ---- Community events ----

const EVENTS: Omit<CommunityEvent, "id">[] = [
  {
    title: "Birthday Bash",
    venue: "cafe",
    start: at(4, 10),
    description: "DJ set, live art, baby rave, new merch, cake, drink specials & a birthday raffle. Everyone's invited.",
    image: "/photos/event-birthday.jpeg",
  },
  {
    title: "Full Moon Flow",
    venue: "yoga",
    start: at(6, 19, 30),
    description: "Candle-lit all-levels flow under the full moon. Mats provided; happy tea after.",
  },
  {
    title: "Sound Bath Sunday",
    venue: "zenden",
    start: at(9, 17),
    description: "A restorative hour of singing bowls and gongs in the salt chamber. Arrive early to sauna first.",
    image: "/photos/zenden-red.jpeg",
  },
  {
    title: "Mezze Night: Chef's Table",
    venue: "restaurant",
    start: at(12, 18),
    description: "By the Fig & the Olive after dark — a family-style mezze spread from all four chefs.",
  },
];

function buildEvents(): CommunityEvent[] {
  return EVENTS.map((e, i) => ({ ...e, id: `ev-${i + 1}` }));
}

export function buildSeed(): AppState {
  return {
    menu: buildMenu(),
    classes: buildClasses(),
    cart: [],
    orders: [],
    bookings: [],
    punch: { goal: 10, punches: 6, rewards: 0, lifetimePunches: 6, redeemed: 0 },
    waivers: [],
    events: buildEvents(),
    gift: { number: "GC-000000", balance: 0, history: [], redeemedCodes: [] },
    eventAlerts: false,
    reservations: [],
    puzzles: [
      { id: "pz-1", title: "July at Common Ground", image: "/photos/storefront.jpeg", cols: 4, rows: 5, startedAt: new Date().toISOString(), startedBy: "Common Grounds Café", placed: [] },
      { id: "pz-2", title: "The Common Grounds Logo", image: "/brand/logo.png", cols: 4, rows: 5, startedAt: new Date().toISOString(), startedBy: "Common Grounds Café", placed: [] },
      { id: "pz-3", title: "Latte Art", image: "/photos/puzzle-latte.jpeg", cols: 4, rows: 5, startedAt: new Date().toISOString(), startedBy: "Common Grounds Café", placed: [] },
    ],
  };
}
