import { Link } from "react-router-dom";
import type { Wine } from "../types";
import { COLOR_META, vintageLabel } from "../lib/wine";
import { StarRating } from "./StarRating";

// A single bottle as it sits on a cellar shelf: photo if we have one, otherwise
// a tinted bottle silhouette in the wine's own colour.
export function BottleCard({ wine }: { wine: Wine }) {
  const meta = COLOR_META[wine.color];
  return (
    <Link to={`/wine/${wine.id}`} className="bottle" title={`${wine.producer} ${wine.name}`}>
      <div className="bottle-art">
        {wine.photo ? (
          <img src={wine.photo} alt={`${wine.producer} ${wine.name}`} loading="lazy" />
        ) : (
          <BottleSilhouette hex={meta.hex} />
        )}
        {wine.status === "wishlist" && <span className="bottle-flag wish">Wishlist</span>}
      </div>
      <div className="bottle-info">
        <span className="bottle-vintage">{vintageLabel(wine.vintage)}</span>
        <span className="bottle-name">{wine.name}</span>
        <span className="bottle-producer">{wine.producer}</span>
        {wine.rating > 0 && <StarRating value={wine.rating} size={12} />}
      </div>
    </Link>
  );
}

function BottleSilhouette({ hex }: { hex: string }) {
  return (
    <svg viewBox="0 0 40 120" className="bottle-svg" aria-hidden>
      <rect x="17" y="4" width="6" height="20" rx="2" fill="#2c1a22" />
      <path
        d="M16 24h8c0 8 6 10 6 22v62a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6V46c0-12 6-14 6-22z"
        fill={hex}
      />
      <rect x="12" y="64" width="16" height="22" rx="2" fill="#fdf6e3" opacity="0.92" />
      <path d="M16 24h8c0 6 3 8 4.5 14H11.5C13 32 16 30 16 24z" fill="#fff" opacity="0.12" />
    </svg>
  );
}
