import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, rackWines, cellarValue } from "../state/store";
import { COLOR_META, priceLabel, vintageLabel } from "../lib/wine";
import { StarRating } from "../components/StarRating";

type Sort = "recent" | "rating" | "price" | "name";

// The wine rack: the bottles the user actually owns, as a scannable list with
// sorting — the inventory view that complements the visual cellar.
export function Rack() {
  const { state } = useStore();
  const [sort, setSort] = useState<Sort>("recent");

  const wines = useMemo(() => {
    const list = [...rackWines(state)];
    switch (sort) {
      case "rating": return list.sort((a, b) => b.rating - a.rating);
      case "price": return list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case "name": return list.sort((a, b) => a.name.localeCompare(b.name));
      default: return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [state, sort]);

  if (wines.length === 0) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-art">🗄️</div>
          <h2>Your rack is empty</h2>
          <p>Bottles you buy land here. Log one and mark it as purchased.</p>
          <Link to="/add" className="btn btn-primary">＋ Add a wine</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page rack-page">
      <div className="rack-summary">
        <span><strong>{wines.length}</strong> bottles</span>
        <span><strong>{priceLabel(cellarValue(state))}</strong> total value</span>
      </div>

      <div className="seg">
        {(["recent", "rating", "price", "name"] as Sort[]).map((s) => (
          <button key={s} className={"seg-btn" + (sort === s ? " active" : "")} onClick={() => setSort(s)}>
            {s === "recent" ? "Recent" : s === "rating" ? "Top rated" : s === "price" ? "Value" : "A–Z"}
          </button>
        ))}
      </div>

      <ul className="rack-list">
        {wines.map((w) => (
          <li key={w.id}>
            <Link to={`/wine/${w.id}`} className="rack-row">
              <span className="rack-swatch" style={{ background: COLOR_META[w.color].hex }} aria-hidden />
              <span className="rack-text">
                <span className="rack-name">{w.name} <span className="rack-vintage">{vintageLabel(w.vintage)}</span></span>
                <span className="rack-sub">{[w.producer, w.region].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="rack-right">
                {w.rating > 0 && <StarRating value={w.rating} size={12} />}
                <span className="rack-price">{priceLabel(w.price)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
