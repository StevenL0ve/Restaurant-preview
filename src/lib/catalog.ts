import type { Wine } from "../types";

// A small built-in catalogue of well-known wines the app can suggest at a
// restaurant, wine store, or winery. These aren't in the user's cellar — they're
// candidates to *try*, scored against the palate the app has learned. In a
// hosted version this would come from a live wine database / the venue's list.

type Candidate = Omit<Wine, "id" | "photo" | "notes" | "likes" | "rating" | "price" | "status" | "createdAt">;

export const CATALOG: Candidate[] = [
  {
    name: "Brunello di Montalcino", producer: "Altesino", vintage: 2018,
    varietal: "Sangiovese", region: "Tuscany", country: "Italy", color: "red",
    likeTags: ["dark fruit", "earthy", "structured"],
    taste: { body: 5, sweetness: 1, tannin: 4, acidity: 4 },
    pairing: "Braised short rib, aged pecorino",
  },
  {
    name: "Châteauneuf-du-Pape", producer: "Domaine du Vieux Télégraphe", vintage: 2019,
    varietal: "Grenache blend", region: "Rhône", country: "France", color: "red",
    likeTags: ["dark fruit", "spice", "velvety"],
    taste: { body: 5, sweetness: 1, tannin: 3, acidity: 3 },
    pairing: "Lamb, mushroom risotto",
  },
  {
    name: "Pinot Noir, Russian River", producer: "Williams Selyem", vintage: 2021,
    varietal: "Pinot Noir", region: "Sonoma", country: "USA", color: "red",
    likeTags: ["red fruit", "silky", "earthy"],
    taste: { body: 3, sweetness: 1, tannin: 2, acidity: 4 },
    pairing: "Roast duck, salmon",
  },
  {
    name: "Rioja Gran Reserva", producer: "La Rioja Alta", vintage: 2015,
    varietal: "Tempranillo", region: "Rioja", country: "Spain", color: "red",
    likeTags: ["red fruit", "leather", "smoky"],
    taste: { body: 4, sweetness: 1, tannin: 3, acidity: 4 },
    pairing: "Jamón, grilled steak",
  },
  {
    name: "Barossa Shiraz", producer: "Torbreck", vintage: 2020,
    varietal: "Shiraz", region: "Barossa Valley", country: "Australia", color: "red",
    likeTags: ["dark fruit", "spice", "bold"],
    taste: { body: 5, sweetness: 2, tannin: 4, acidity: 3 },
    pairing: "BBQ ribs, blue cheese",
  },
  {
    name: "Sancerre", producer: "Henri Bourgeois", vintage: 2022,
    varietal: "Sauvignon Blanc", region: "Loire", country: "France", color: "white",
    likeTags: ["citrus", "mineral", "crisp"],
    taste: { body: 2, sweetness: 1, tannin: 1, acidity: 5 },
    pairing: "Goat cheese, oysters",
  },
  {
    name: "Chablis 1er Cru", producer: "William Fèvre", vintage: 2021,
    varietal: "Chardonnay", region: "Burgundy", country: "France", color: "white",
    likeTags: ["citrus", "mineral", "crisp"],
    taste: { body: 3, sweetness: 1, tannin: 1, acidity: 4 },
    pairing: "Scallops, sushi",
  },
  {
    name: "Napa Chardonnay", producer: "Far Niente", vintage: 2021,
    varietal: "Chardonnay", region: "Napa Valley", country: "USA", color: "white",
    likeTags: ["stone fruit", "oak", "creamy"],
    taste: { body: 4, sweetness: 2, tannin: 1, acidity: 3 },
    pairing: "Lobster, roast chicken",
  },
  {
    name: "Riesling Kabinett", producer: "Dr. Loosen", vintage: 2022,
    varietal: "Riesling", region: "Mosel", country: "Germany", color: "white",
    likeTags: ["stone fruit", "floral", "zesty"],
    taste: { body: 2, sweetness: 3, tannin: 1, acidity: 5 },
    pairing: "Thai curry, pork belly",
  },
  {
    name: "Provence Rosé", producer: "Domaines Ott", vintage: 2023,
    varietal: "Grenache blend", region: "Provence", country: "France", color: "rosé",
    likeTags: ["red fruit", "floral", "crisp"],
    taste: { body: 2, sweetness: 1, tannin: 1, acidity: 4 },
    pairing: "Salade niçoise, grilled prawns",
  },
  {
    name: "Brut Champagne", producer: "Pol Roger", vintage: null,
    varietal: "Chardonnay / Pinot Noir", region: "Champagne", country: "France", color: "sparkling",
    likeTags: ["citrus", "brioche", "crisp"],
    taste: { body: 2, sweetness: 2, tannin: 1, acidity: 5 },
    pairing: "Oysters, fried chicken",
  },
  {
    name: "Franciacorta Brut", producer: "Ca' del Bosco", vintage: null,
    varietal: "Chardonnay blend", region: "Lombardy", country: "Italy", color: "sparkling",
    likeTags: ["citrus", "brioche", "creamy"],
    taste: { body: 2, sweetness: 2, tannin: 1, acidity: 4 },
    pairing: "Risotto, charcuterie",
  },
  {
    name: "Vintage Port", producer: "Taylor Fladgate", vintage: 2017,
    varietal: "Touriga Nacional", region: "Douro", country: "Portugal", color: "fortified",
    likeTags: ["dark fruit", "rich", "spice"],
    taste: { body: 5, sweetness: 5, tannin: 4, acidity: 3 },
    pairing: "Dark chocolate, stilton",
  },
  {
    name: "Sauternes", producer: "Château Guiraud", vintage: 2016,
    varietal: "Sémillon", region: "Bordeaux", country: "France", color: "dessert",
    likeTags: ["stone fruit", "honey", "rich"],
    taste: { body: 4, sweetness: 5, tannin: 1, acidity: 4 },
    pairing: "Foie gras, fruit tart",
  },
  {
    name: "Etna Rosso", producer: "Pietradolce", vintage: 2021,
    varietal: "Nerello Mascalese", region: "Sicily", country: "Italy", color: "red",
    likeTags: ["red fruit", "smoky", "mineral"],
    taste: { body: 3, sweetness: 1, tannin: 3, acidity: 4 },
    pairing: "Pizza, roast vegetables",
  },
  {
    name: "Grüner Veltliner", producer: "Schloss Gobelsburg", vintage: 2022,
    varietal: "Grüner Veltliner", region: "Kamptal", country: "Austria", color: "white",
    likeTags: ["citrus", "pepper", "crisp"],
    taste: { body: 2, sweetness: 1, tannin: 1, acidity: 4 },
    pairing: "Schnitzel, asparagus",
  },
];
