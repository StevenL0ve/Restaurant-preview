// A 0–5 star rating. Read-only by default; pass onChange to make it editable.
export function StarRating({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];
  if (!onChange) {
    return (
      <span className="stars" style={{ fontSize: size }} aria-label={`${value} of 5 stars`}>
        {stars.map((s) => (
          <span key={s} className={s <= value ? "star on" : "star"}>★</span>
        ))}
      </span>
    );
  }
  return (
    <span className="stars editable" style={{ fontSize: size }} role="radiogroup" aria-label="Rating">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          className={s <= value ? "star on" : "star"}
          aria-label={`${s} star${s > 1 ? "s" : ""}`}
          aria-checked={s === value}
          role="radio"
          onClick={() => onChange(s === value ? 0 : s)}
        >
          ★
        </button>
      ))}
    </span>
  );
}
