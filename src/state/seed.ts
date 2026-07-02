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
  { category: "Coffee", name: "Latte", description: "Double espresso, steamed milk of choice.", price: 5.0, tags: [] },
  { category: "Kids + Fur Babies", name: "Babycino / Puppuccino", description: "On the house for the littles and the fur babies.", price: 0, tags: [], noPunch: true },
  { category: "Kids + Fur Babies", name: "Hot Chocolate", description: "Steamed chocolate, milk of choice.", price: 4.0, tags: [], noPunch: true },
];

// By the Fig & the Olive — the Mediterranean restaurant under the CGP roof
// (figandtheolive.com). Dishes are the ones regulars rave about; prices are
// placeholders until the printed menu is provided.
const KITCHEN: Omit<MenuItem, "id" | "venue" | "earnsPunch">[] = [
  { category: "Mezze & Starters", name: "Mezze Platter", description: "Five house dips — roasted & fried eggplant baba ghanoush, two styles of hummus, yogurt sauce — with warm pita.", price: 16.0, tags: ["popular"] },
  { category: "Mezze & Starters", name: "Stuffed Dates", description: "Sweet dates, stuffed and finished house-style. A cult favorite.", price: 9.0, tags: ["gf", "popular"] },
  { category: "Mezze & Starters", name: "Samosas", description: "Hand-folded and fried, spiced potato & peas.", price: 7.0, tags: ["vegan"] },
  { category: "Mezze & Starters", name: "Za'atar Pie", description: "Flaky hand pie brushed with za'atar and olive oil.", price: 6.5, tags: ["vegan"] },
  { category: "Flatbreads", name: "Goat Cheese & Fig Flatbread", description: "Warm flatbread, whipped goat cheese, figs, honey drizzle.", price: 14.0, tags: ["popular"] },
  { category: "Flatbreads", name: "BBQ Chicken Flatbread", description: "Sweet-tangy barbecue chicken, jalapeño, red onion & cilantro on a soft pita base.", price: 14.0, tags: [] },
  { category: "Wraps & Sandwiches", name: "Chicken Shawarma Wrap", description: "House-marinated chicken off the spinning skewer, pickles, garlic sauce.", price: 13.0, tags: ["popular"] },
  { category: "Wraps & Sandwiches", name: "Falafel Wrap", description: "Crisp falafel, fresh herbs, tahini & pickles.", price: 12.0, tags: ["vegan"] },
  { category: "Wraps & Sandwiches", name: "Roasted Vegetable Sandwich", description: "Roasted seasonal vegetables with house spreads.", price: 12.0, tags: ["vegan"] },
  { category: "Plates", name: "Chicken Kabob Plate", description: "Char-grilled chicken kabobs, cilantro chutney, jeera rice, tangy slaw.", price: 16.0, tags: ["popular", "gf"], image: "/photos/figolive-food.jpeg" },
  { category: "Plates", name: "Seekh Kabob Plate", description: "Spiced beef & lamb kabobs, vermicelli rice, pita and tzatziki.", price: 17.0, tags: ["popular"] },
  { category: "Plates", name: "Beef Keema", description: "Slow-simmered spiced ground beef with rice and pita.", price: 16.0, tags: [] },
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

const YOGA: Omit<SessionClass, "id" | "venue" | "requiresWaiver">[] = [
  { name: "Sunrise Vinyasa", instructor: "Maya R.", description: "A warming flow to start the day open and steady.", start: at(0, 7), durationMin: 60, capacity: 18, booked: 11, price: 20, level: "All levels" },
  { name: "Community Flow", instructor: "Dev P.", description: "Donation-based all-levels flow. Everyone welcome.", start: at(1, 9, 30), durationMin: 75, capacity: 24, booked: 8, price: 12, level: "All levels" },
  { name: "Restorative & Yin", instructor: "Sana K.", description: "Slow, floor-based, deeply relaxing. Props provided.", start: at(1, 18), durationMin: 60, capacity: 16, booked: 14, price: 22, level: "Gentle" },
  { name: "Power Vinyasa", instructor: "Maya R.", description: "Strong, breath-linked flow. Bring a towel.", start: at(2, 17, 30), durationMin: 60, capacity: 18, booked: 5, price: 22, level: "Intermediate" },
  { name: "Slow Flow & Meditation", instructor: "Dev P.", description: "Gentle movement into a guided sit.", start: at(3, 8), durationMin: 75, capacity: 20, booked: 3, price: 20, level: "All levels" },
];

// The Zen Den (zendenms.com) — a Nordic cycle spa: infrared sauna with red
// light, hot & cold plunge, and a Himalayan salt chamber.
const ZENDEN: Omit<SessionClass, "id" | "venue" | "requiresWaiver">[] = [
  { name: "Infrared Sauna + Red Light (45 min)", instructor: "Zen Den", description: "Radiant infrared heat with red light therapy — warms you from the inside out.", start: at(0, 12), durationMin: 45, capacity: 4, booked: 2, price: 35, level: "Sauna", image: "/photos/zenden-red.jpeg" },
  { name: "Nordic Cycle: Hot & Cold Plunge", instructor: "Zen Den", description: "Guided contrast rounds through the hot and cold plunge tubs. Reset and recharge.", start: at(1, 15), durationMin: 60, capacity: 6, booked: 3, price: 40, level: "Plunge" },
  { name: "Himalayan Salt Chamber (45 min)", instructor: "Zen Den", description: "Rest in the salt room — stress relief, energy, and easier breathing.", start: at(2, 11), durationMin: 45, capacity: 6, booked: 2, price: 30, level: "Salt room", image: "/photos/zenden-salt2.jpeg" },
  { name: "Full Zen Circuit (90 min)", instructor: "Zen Den", description: "The complete Nordic cycle: sauna, plunge, and salt chamber, at your pace.", start: at(3, 16), durationMin: 90, capacity: 6, booked: 4, price: 65, level: "Circuit", image: "/photos/zenden.jpeg" },
];

const MASSAGE: Omit<SessionClass, "id" | "venue" | "requiresWaiver">[] = [
  { name: "Swedish Massage (60 min)", instructor: "Theo M.", description: "Classic full-body relaxation massage.", start: at(0, 14), durationMin: 60, capacity: 1, booked: 0, price: 110, level: "Relaxation" },
  { name: "Deep Tissue (60 min)", instructor: "Priya S.", description: "Focused work for tension and knots.", start: at(1, 13), durationMin: 60, capacity: 1, booked: 0, price: 125, level: "Therapeutic" },
  { name: "Prenatal Massage (60 min)", instructor: "Theo M.", description: "Safe, supported bodywork for expecting parents.", start: at(2, 10), durationMin: 60, capacity: 1, booked: 0, price: 120, level: "Specialty" },
  { name: "Hot Stone (90 min)", instructor: "Priya S.", description: "Warm basalt stones melt away deep tension.", start: at(4, 15), durationMin: 90, capacity: 1, booked: 0, price: 160, level: "Specialty" },
];

function buildClasses(): SessionClass[] {
  const y = YOGA.map((c, i) => ({ ...c, id: `cy-${i + 1}`, venue: "yoga" as const, requiresWaiver: true }));
  const z = ZENDEN.map((c, i) => ({ ...c, id: `cz-${i + 1}`, venue: "zenden" as const, requiresWaiver: true }));
  const m = MASSAGE.map((c, i) => ({ ...c, id: `cm-${i + 1}`, venue: "massage" as const, requiresWaiver: true }));
  return [...y, ...z, ...m].sort((a, b) => a.start.localeCompare(b.start));
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
    gift: { number: "GC-000000", balance: 0, history: [] },
    eventAlerts: false,
  };
}
