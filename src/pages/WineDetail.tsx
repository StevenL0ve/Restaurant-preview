import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useStore } from "../state/store";
import { COLOR_META, priceLabel, vintageLabel } from "../lib/wine";
import { StarRating } from "../components/StarRating";
import { TasteBars } from "../components/TasteBars";

export function WineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, updateWine, markPurchased, deleteWine } = useStore();
  const wine = state.wines.find((w) => w.id === id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!wine) {
    return (
      <div className="page">
        <div className="empty">
          <h2>Bottle not found</h2>
          <Link to="/" className="btn btn-primary">Back to cellar</Link>
        </div>
      </div>
    );
  }

  const meta = COLOR_META[wine.color];

  return (
    <div className="page detail-page">
      {/* The bottle, resting in an elegant cellar niche. */}
      <div className="detail-hero">
        <div className="niche">
          <div className="niche-arch" />
          {wine.photo ? (
            <img className="niche-photo" src={wine.photo} alt={`${wine.producer} ${wine.name}`} />
          ) : (
            <div className="niche-bottle" style={{ ["--wine" as string]: meta.hex }}>
              <span className="niche-emoji">{meta.emoji}</span>
            </div>
          )}
        </div>
        <div className="detail-title">
          <span className="detail-vintage">{vintageLabel(wine.vintage)}</span>
          <h1>{wine.name}</h1>
          <p className="detail-producer">{wine.producer}</p>
          <p className="detail-meta">
            {[wine.varietal, wine.region, wine.country].filter(Boolean).join(" · ")}
          </p>
          <span className={"badge " + (wine.status === "rack" ? "rack" : "wish")}>
            {wine.status === "rack" ? "🗄️ In your rack" : "✨ On your wishlist"}
          </span>
        </div>
      </div>

      <div className="detail-grid">
        <section className="card">
          <h3>Your rating</h3>
          <StarRating value={wine.rating} onChange={(v) => updateWine(wine.id, { rating: v })} size={26} />
          <div className="kv">
            <span>Price</span>
            <strong>{priceLabel(wine.price)}</strong>
          </div>
          <div className="kv">
            <span>Style</span>
            <strong>{meta.label}</strong>
          </div>
        </section>

        {wine.likes && (
          <section className="card">
            <h3>What you love</h3>
            <p className="quote">“{wine.likes}”</p>
            {wine.likeTags.length > 0 && (
              <div className="chip-row wrap">
                {wine.likeTags.map((t) => (
                  <span key={t} className="chip sm static">{t}</span>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="card">
          <h3>Taste profile</h3>
          <TasteBars taste={wine.taste} />
        </section>

        {wine.notes && (
          <section className="card">
            <h3>Tasting notes</h3>
            <p>{wine.notes}</p>
          </section>
        )}

        {wine.pairing && (
          <section className="card">
            <h3>Pairs with</h3>
            <p>{wine.pairing}</p>
          </section>
        )}
      </div>

      <div className="detail-actions">
        {wine.status === "wishlist" && (
          <button className="btn btn-primary" onClick={() => markPurchased(wine.id)}>
            🗄️ I bought it — move to rack
          </button>
        )}
        {!confirmDelete ? (
          <button className="btn btn-ghost" onClick={() => setConfirmDelete(true)}>
            Remove
          </button>
        ) : (
          <span className="confirm">
            Remove this bottle?
            <button className="btn btn-danger" onClick={() => { deleteWine(wine.id); navigate("/"); }}>
              Yes, remove
            </button>
            <button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </span>
        )}
      </div>
    </div>
  );
}
