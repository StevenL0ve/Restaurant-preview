import type { TasteProfile } from "../types";
import { TASTE_AXES } from "../lib/taste";
import { TASTE_LABELS } from "../lib/wine";

// Visualises a wine's body / sweetness / tannin / acidity. Read-only meters by
// default; pass onChange to turn each axis into a 1–5 picker for logging.
export function TasteBars({
  taste,
  onChange,
  compact = false,
}: {
  taste: TasteProfile;
  onChange?: (axis: keyof TasteProfile, value: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={"taste" + (compact ? " compact" : "")}>
      {TASTE_AXES.map((axis) => {
        const [low, high] = TASTE_LABELS[axis];
        const pct = ((taste[axis] - 1) / 4) * 100;
        return (
          <div className="taste-row" key={axis}>
            <span className="taste-name">{axisName(axis)}</span>
            {onChange ? (
              <div className="taste-steps" role="radiogroup" aria-label={axisName(axis)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={"taste-step" + (Math.round(taste[axis]) >= n ? " on" : "")}
                    onClick={() => onChange(axis, n)}
                    aria-label={`${axisName(axis)} ${n}`}
                  />
                ))}
              </div>
            ) : (
              <div className="taste-meter">
                <span className="taste-fill" style={{ width: `${pct}%` }} />
              </div>
            )}
            <span className="taste-ends">
              <span>{low}</span>
              <span>{high}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function axisName(axis: keyof TasteProfile): string {
  return axis.charAt(0).toUpperCase() + axis.slice(1);
}
