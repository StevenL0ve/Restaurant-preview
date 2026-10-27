import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore, onCallPersonOf, positionsByCategory } from "../state/store";
import { dayKey, dayShifts, fromLocalInputValue, monthGrid, shiftHours, toLocalInputValue } from "../lib/oncall";
import { stampLine } from "../lib/user";
import type { OnCallShift } from "../types";

// The call schedule for a month, day by day: who has each position and
// their hours, which positions nobody has yet, and a quick edit or remove on
// every shift. Scheduling happens on the On call board ("Pick days").

export function CallSchedulePage() {
  const { state } = useStore();
  const [params] = useSearchParams();
  const today = dayKey(new Date());
  const [view, setView] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [posId, setPosId] = useState(params.get("pos") ?? "");
  const [showPast, setShowPast] = useState(false);

  const positions = useMemo(() => positionsByCategory(state).flatMap((g) => g.positions), [state]);
  const shown = posId ? positions.filter((p) => p.id === posId) : positions;
  const days = monthGrid(view.y, view.m).filter((d): d is string => !!d).filter((d) => showPast || d >= today);
  const title = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const move = (delta: number) => { const d = new Date(view.y, view.m + delta, 1); setView({ y: d.getFullYear(), m: d.getMonth() }); };
  const isThisMonth = view.y === new Date().getFullYear() && view.m === new Date().getMonth();

  return (
    <div className="page page-narrow">
      <div className="detail-top"><Link className="link" to="/on-call">← On call</Link></div>
      <div className="page-head">
        <div>
          <h1>Call schedule</h1>
          <p className="muted">Who's on call each day. To add someone for several days, use <strong>Set on-call</strong> → <strong>Pick days</strong> on the On call board.</p>
        </div>
      </div>

      <div className="card form-card">
        <div className="day-nav" style={{ margin: 0 }}>
          <button className="icon-btn" onClick={() => move(-1)} aria-label="Previous month">‹</button>
          <span className="day-label" style={{ cursor: "default" }}>{title}</span>
          <button className="icon-btn" onClick={() => move(1)} aria-label="Next month">›</button>
        </div>
        <label className="field field-wide" style={{ marginTop: 10 }}><span>Position</span>
          <select value={posId} onChange={(e) => setPosId(e.target.value)}>
            <option value="">All positions</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        {isThisMonth && (
          <label className="toggle-row"><span>Show earlier days this month</span>
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /></label>
        )}
      </div>

      {days.length === 0 && <p className="muted">No days left in this month. Use › for next month.</p>}
      {days.map((day) => {
        const rows = shown.map((p) => {
          const { scheduled, standing } = dayShifts(state.onCallShifts.filter((s) => s.positionId === p.id), day);
          return { position: p, shifts: scheduled, standing };
        });
        const open = rows.filter((r) => r.shifts.length === 0 && !r.standing).map((r) => r.position.name);
        const label = new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        return (
          <section key={day} className={"call-day" + (day === today ? " today" : "")}>
            <h2 className="room-head">{label}{day === today && <span className="muted small"> · today</span>}</h2>
            <div className="card call-day-card">
              {rows.map((r) => [
                ...r.shifts.map((s) => <ShiftRow key={`${r.position.id}-${s.id}`} positionName={r.position.name} shift={s} />),
                r.standing && (
                  <ShiftRow key={`${r.position.id}-${r.standing.id}`} positionName={r.position.name} shift={r.standing} standing={r.shifts.length > 0} />
                ),
              ])}
              {open.length > 0 && (
                <p className="call-open small">{posId ? "Nobody scheduled." : `Nobody scheduled: ${open.join(", ")}`}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** `standing`: an "until changed" person who covers outside the day's
 *  scheduled shifts, shown quieter. */
function ShiftRow({ positionName, shift, standing }: { positionName: string; shift: OnCallShift; standing?: boolean }) {
  const { state, updateOnCallShift, deleteOnCallShift } = useStore();
  const person = onCallPersonOf(state, shift.personId);
  const [edit, setEdit] = useState<{ start: string; end: string } | null>(null);

  if (edit) {
    return (
      <div className="call-row editing">
        <strong>{positionName} · {person?.name ?? "Someone"}</strong>
        <div className="assign-custom">
          <label className="field"><span>Starts</span>
            <input type="datetime-local" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} /></label>
          <label className="field"><span>Ends (blank = until changed)</span>
            <input type="datetime-local" value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })} /></label>
        </div>
        <div className="form-actions">
          <button className="btn btn-sm btn-primary" disabled={!edit.start} onClick={() => {
            updateOnCallShift(shift.id, { start: fromLocalInputValue(edit.start) ?? shift.start, end: fromLocalInputValue(edit.end) });
            setEdit(null);
          }}>Save</button>
          <button className="btn btn-sm" onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className={"call-row" + (standing ? " standing" : "")}>
      <div className="call-row-main">
        <span className="call-pos">{positionName}</span>
        <span className="call-who">{person?.name ?? "Someone"}</span>
        <span className="call-hours">{shift.end ? shiftHours(shift) : standing ? "Otherwise on, until changed" : `On until changed (since ${new Date(shift.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })})`}</span>
        {shift.note && <span className="muted small">“{shift.note}”</span>}
        {shift.updatedBy && <span className="muted small">Set by {stampLine(shift.updatedBy, shift.updatedAt)}</span>}
      </div>
      <div className="call-row-actions">
        <button className="link small" onClick={() => setEdit({ start: toLocalInputValue(shift.start), end: toLocalInputValue(shift.end) })}>Edit</button>
        <button className="link small" onClick={() => { if (confirm(`Remove ${person?.name ?? "this shift"} from ${positionName} (${shiftHours(shift)})?`)) deleteOnCallShift(shift.id); }}>Remove</button>
      </div>
    </div>
  );
}
