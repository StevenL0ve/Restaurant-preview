import type { AppState, MenuItem, SessionClass } from "../types";

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

const CAFE: Omit<MenuItem, "id" | "venue" | "earnsPunch">[] = [
  { category: "Espresso", name: "Cortado", description: "Double shot cut with a splash of steamed milk.", price: 4.25, tags: ["popular"] },
  { category: "Espresso", name: "Oat Latte", description: "House espresso + creamy oat milk.", price: 5.5, tags: ["vegan", "popular"] },
  { category: "Espresso", name: "Cappuccino", description: "Equal parts espresso, steamed milk & foam.", price: 4.75, tags: [] },
  { category: "Espresso", name: "Americano", description: "Espresso over hot water. Clean and bright.", price: 3.75, tags: ["vegan"] },
  { category: "Espresso", name: "Maple Cold Brew", description: "18-hour cold brew, local maple, oat milk.", price: 5.75, tags: ["seasonal", "vegan"] },
  { category: "Not Coffee", name: "Matcha Latte", description: "Ceremonial matcha whisked with your milk of choice.", price: 5.5, tags: ["vegan"] },
  { category: "Not Coffee", name: "Golden Turmeric Tonic", description: "Turmeric, ginger, black pepper & honey.", price: 5.0, tags: ["gf"] },
  { category: "Not Coffee", name: "Loose-Leaf Tea", description: "Ask about today's rotating selection.", price: 3.5, tags: ["vegan", "gf"] },
  { category: "Pastries", name: "Sourdough Morning Bun", description: "Laminated, cardamom sugar, orange zest.", price: 4.5, tags: ["popular"] },
  { category: "Pastries", name: "Almond Croissant", description: "Twice-baked, house frangipane.", price: 4.75, tags: [] },
  { category: "Pastries", name: "GF Banana Bread", description: "Toasted, cultured butter.", price: 4.0, tags: ["gf"] },
];

const KITCHEN: Omit<MenuItem, "id" | "venue" | "earnsPunch">[] = [
  { category: "Bowls", name: "Grounding Grain Bowl", description: "Farro, roasted squash, kale, tahini, seeds.", price: 15.0, tags: ["vegan", "popular"] },
  { category: "Bowls", name: "Harvest Buddha Bowl", description: "Quinoa, chickpeas, beets, avocado, green goddess.", price: 16.0, tags: ["vegan", "gf"] },
  { category: "Plates", name: "Wild Mushroom Toast", description: "Sourdough, herbed ricotta, thyme, chili oil.", price: 14.0, tags: ["popular"] },
  { category: "Plates", name: "Seasonal Frittata", description: "Pasture eggs, greens, side salad.", price: 15.0, tags: ["gf"] },
  { category: "Plates", name: "Cedar Salmon", description: "Cedar-planked salmon, lentils, salsa verde.", price: 24.0, tags: ["gf"] },
  { category: "Bites", name: "Marinated Olives", description: "Citrus, rosemary, fennel.", price: 7.0, tags: ["vegan", "gf"] },
  { category: "Bites", name: "House Hummus", description: "Warm flatbread, dukkah, olive oil.", price: 10.0, tags: ["vegan"] },
  { category: "Sweets", name: "Olive Oil Cake", description: "Citrus glaze, crème fraîche.", price: 9.0, tags: ["popular"] },
];

function buildMenu(): MenuItem[] {
  const cafe = CAFE.map((m, i) => ({
    ...m,
    id: `mc-${i + 1}`,
    venue: "cafe" as const,
    // Every café drink earns a punch; pastries don't.
    earnsPunch: m.category !== "Pastries",
  }));
  const kitchen = KITCHEN.map((m, i) => ({
    ...m,
    id: `mk-${i + 1}`,
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

const ZENDEN: Omit<SessionClass, "id" | "venue" | "requiresWaiver">[] = [
  { name: "Infrared Sauna (45 min)", instructor: "Zen Den", description: "Private infrared sauna session. Cool-down lounge access.", start: at(0, 12), durationMin: 45, capacity: 4, booked: 2, price: 35, level: "Sauna" },
  { name: "Cedar Hot Soak", instructor: "Zen Den", description: "Mineral soak in a private cedar tub.", start: at(1, 15), durationMin: 60, capacity: 3, booked: 1, price: 45, level: "Soak" },
  { name: "Glow Facial", instructor: "Nadia F.", description: "Custom facial with botanical steam & massage.", start: at(2, 11), durationMin: 60, capacity: 2, booked: 1, price: 95, level: "Facial" },
  { name: "Contrast Therapy Circuit", instructor: "Zen Den", description: "Guided sauna + cold plunge rounds.", start: at(3, 16), durationMin: 75, capacity: 6, booked: 4, price: 40, level: "Circuit" },
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

export function buildSeed(): AppState {
  return {
    menu: buildMenu(),
    classes: buildClasses(),
    cart: [],
    orders: [],
    bookings: [],
    punch: { goal: 10, punches: 6, rewards: 0, lifetimePunches: 6, redeemed: 0 },
    waivers: [],
  };
}
