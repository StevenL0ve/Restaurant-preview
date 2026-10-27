import { useState } from "react";
import { dayKey, monthGrid } from "../lib/oncall";

// Tap days on a month calendar to pick several at once (call for the rest of
// the month, every weekend, a run of nights). Past days can't be picked.

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function DayPicker({ selected, onChange, minDay = dayKey(new Date()) }: {
  selected: string[];
  onChange: (days: string[]) => void;
  minDay?: string;
}) {
  const [y0, m0] = minDay.split("-").map(Number);
  const [view, setView] = useState({ y: y0, m: m0 - 1 });
  const cells = monthGrid(view.y, view.m);
  const inMonth = cells.filter((d): d is string => !!d && d >= minDay);
  const set = new Set(selected);
  const title = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const toggle = (d: string) => {
    const next = new Set(set);
    if (next.has(d)) next.delete(d); else next.add(d);
    onChange([...next].sort());
  };
  const add = (days: string[]) => onChange([...new Set([...selected, ...days])].sort());
  const weekday = (d: string) => new Date(`${d}T12:00:00`).getDay();
  const canGoBack = view.y > y0 || (view.y === y0 && view.m > m0 - 1);

  return (
    <div className="day-picker">
      <div className="day-picker-head">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} disabled={!canGoBack} aria-label="Previous month">‹</button>
        <strong>{title}</strong>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      <div className="day-picker-grid" role="grid">
        {WEEKDAYS.map((w, i) => <span key={i} className="day-picker-wd">{w}</span>)}
        {cells.map((d, i) => d ? (
          <button
            key={d}
            type="button"
            className={"day-picker-day" + (set.has(d) ? " on" : "") + (d === minDay ? " today" : "")}
            disabled={d < minDay}
            onClick={() => toggle(d)}
            aria-pressed={set.has(d)}
            aria-label={new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          >
            {Number(d.slice(8))}
          </button>
        ) : <span key={`x${i}`} />)}
      </div>
      <div className="chips day-picker-quick">
        <button type="button" className="chip" onClick={() => add(inMonth)}>Every day left in {title.split(" ")[0]}</button>
        <button type="button" className="chip" onClick={() => add(inMonth.filter((d) => weekday(d) > 0 && weekday(d) < 6))}>Weekdays</button>
        <button type="button" className="chip" onClick={() => add(inMonth.filter((d) => weekday(d) === 0 || weekday(d) === 6))}>Weekends</button>
        {selected.length > 0 && <button type="button" className="chip" onClick={() => onChange([])}>Clear</button>}
      </div>
    </div>
  );
}
