import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, rackWines, wishlistWines, cellarValue } from "../state/store";
import { BottleCard } from "../components/BottleCard";
import { ALL_COLORS, COLOR_META, priceLabel } from "../lib/wine";
import type { WineColor } from "../types";

type Filter = "all" | "rack" | "wishlist";

export function Cellar() {
  const { state } = useStore();
  const [filter, setFilter] = useState<Filter>("all");

  const wines = useMemo(() => {
    if (filter === "rack") return rackWines(state);
    if (filter === "wishlist") return wishlistWines(state);
    return state.wines;
  }, [state, filter]);

  // Group bottles onto shelves by style, light → bold, so the cellar reads like
  // a real one: a sparkling shelf, a white shelf, a red shelf, and so on.
  const shelves = useMemo(() => {
    const byColor = new Map<WineColor, typeof wines>();
    for (const c of ALL_COLORS) byColor.set(c, []);
    for (const w of wines) byColor.get(w.color)!.push(w);
    return ALL_COLORS
      .map((c) => ({ color: c, bottles: byColor.get(c)! }))
      .filter((s) => s.bottles.length > 0);
  }, [wines]);

  return (
    <div className="page cellar-page">
      <section className="cellar-stats">
        <Stat label="Bottles owned" value={String(rackWines(state).length)} />
        <Stat label="On the wishlist" value={String(wishlistWines(state).length)} />
        <Stat label="Cellar value" value={priceLabel(cellarValue(state))} />
      </section>

      <div className="seg">
        {(["all", "rack", "wishlist"] as Filter[]).map((f) => (
          <button
            key={f}
            className={"seg-btn" + (filter === f ? " active" : "")}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Whole cellar" : f === "rack" ? "My rack" : "Wishlist"}
          </button>
        ))}
      </div>

      {wines.length === 0 ? (
        <div className="empty">
          <div className="empty-art">🍷</div>
          <h2>Your cellar is waiting</h2>
          <p>Snap a photo of a bottle and it'll appear here, racked and ready.</p>
          <Link to="/add" className="btn btn-primary">＋ Log your first wine</Link>
        </div>
      ) : (
        <div className="cellar">
          {shelves.map(({ color, bottles }) => (
            <section className="shelf" key={color}>
              <header className="shelf-head">
                <span className="shelf-dot" style={{ background: COLOR_META[color].hex }} />
                <h2>{COLOR_META[color].label}</h2>
                <span className="shelf-count">{bottles.length}</span>
              </header>
              <div className="shelf-rack">
                <div className="shelf-bottles">
                  {bottles.map((w) => (
                    <BottleCard key={w.id} wine={w} />
                  ))}
                </div>
                <div className="shelf-board" aria-hidden />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
