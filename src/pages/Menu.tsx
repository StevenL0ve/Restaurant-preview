import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, cartCount, cartSubtotal } from "../state/store";
import { VENUES, type MenuItem } from "../types";
import { money } from "../lib/format";
import { tapLight } from "../lib/haptics";

type Filter = "all" | "cafe" | "restaurant";

const tagLabel: Record<string, string> = {
  vegan: "Vegan",
  gf: "GF",
  seasonal: "Seasonal",
  popular: "Popular",
};

export function Menu() {
  const { state, addToCart } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const count = cartCount(state);
  const subtotal = cartSubtotal(state);

  const grouped = useMemo(() => {
    const items = state.menu.filter((m) => filter === "all" || m.venue === filter);
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const key = `${item.venue}:${item.category}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  }, [state.menu, filter]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Menu &amp; Order</h1>
          <p className="page-sub">Common Grounds Café + By the Fig &amp; the Olive. Pickup or dine-in.</p>
        </div>
      </div>

      <div className="segmented">
        {(["all", "cafe", "restaurant"] as Filter[]).map((f) => (
          <button
            key={f}
            className={"seg" + (filter === f ? " active" : "")}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Everything" : f === "cafe" ? "☕️ Café" : "🍽️ Fig + Olive"}
          </button>
        ))}
      </div>

      <div className="photo-banner">
        <img
          src={filter === "cafe" ? "/photos/cafe-team.jpeg" : filter === "restaurant" ? "/photos/figolive-food.jpeg" : "/photos/food.jpeg"}
          alt={filter === "cafe" ? "The Common Grounds Café team at the bar" : "A kabob plate at By the Fig & the Olive"}
        />
      </div>

      {filter === "restaurant" && (
        <div className="venue-banner card">
          <img className="venue-logo" src={VENUES.restaurant.logo} alt="Fig + Olive logo" />
          <div>
            <div className="row-title">{VENUES.restaurant.name}</div>
            <div className="row-sub">🕐 {VENUES.restaurant.hours}</div>
          </div>
          <Link to="/reserve" className="btn btn-add">Reserve</Link>
        </div>
      )}
      {filter === "cafe" && (
        <div className="venue-banner card">
          <img className="venue-logo" src="/brand/logo.png" alt="Common Ground logo" />
          <div>
            <div className="row-title">{VENUES.cafe.name}</div>
            <div className="row-sub">🕐 {VENUES.cafe.hours}</div>
          </div>
        </div>
      )}

      {filter !== "restaurant" && (
        <div className="card menu-note">
          <strong>Make it yours</strong> — syrups +$0.75 (madagascar vanilla bean,
          miso salted caramel, french lavender madeline, persian pistachio, dutch
          speculaas cookie, blue agave nectar, honey, jaggery) · alt milks +$0.50
          (oat, coconut, almond).
        </div>
      )}

      {grouped.map(([key, items]) => {
        const [venue, category] = key.split(":");
        return (
          <section key={key} className="section">
            <h2 className="section-title">
              <span className="cat-venue">{venue === "cafe" ? "Café" : "Fig + Olive"}</span>
              {category}
            </h2>
            <div className="stack">
              {items.map((item) => (
                <div key={item.id} className="card menu-item">
                  {item.image && <img className="menu-item-photo" src={item.image} alt={item.name} />}
                  <div className="menu-item-body">
                    <div className="menu-item-top">
                      <span className="menu-item-name">{item.name}</span>
                      <span className="menu-item-price">{item.price === 0 ? "Free" : money(item.price)}</span>
                    </div>
                    <p className="menu-item-desc">{item.description}</p>
                    <div className="menu-item-tags">
                      {item.earnsPunch && <span className="tag tag-punch">☕️ +1 punch</span>}
                      {item.tags.map((t) => (
                        <span key={t} className="tag">{tagLabel[t] ?? t}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="btn btn-add"
                    onClick={() => { addToCart(item.id); tapLight(); }}
                    aria-label={`Add ${item.name} to cart`}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {count > 0 && (
        <Link to="/cart" className="cart-bar">
          <span className="cart-bar-count">{count}</span>
          <span>View cart</span>
          <span className="cart-bar-total">{money(subtotal)}</span>
        </Link>
      )}
    </div>
  );
}
