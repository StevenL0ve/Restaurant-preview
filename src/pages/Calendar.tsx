import { useMemo, useState } from "react";
import { useStore, triggerDownload } from "../state/store";
import { buildICS } from "../lib/ics";
import { fullDate, time, isoDateInput } from "../lib/format";
import { generateRotation, ROTATION_LABELS, type RotationPattern } from "../lib/rotation";
import type { CalEvent, EventCategory } from "../types";

const CATS: { value: EventCategory; label: string }[] = [
  { value: "parenting-time", label: "Parenting time" },
  { value: "school", label: "School" },
  { value: "medical", label: "Medical" },
  { value: "activity", label: "Activity" },
  { value: "holiday", label: "Holiday" },
  { value: "other", label: "Other" },
];

function startOfMonthGrid(d: Date): Date[] {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export function Calendar() {
  const { state, addEvent, addEvents, respondToRequest, deleteEvent } = useStore();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<string>(isoDateInput(new Date().toISOString()));
  const [showForm, setShowForm] = useState(false);
  const [showRotation, setShowRotation] = useState(false);

  const grid = useMemo(() => startOfMonthGrid(cursor), [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of state.events) {
      const key = isoDateInput(e.start);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [state.events]);

  const selectedEvents = (eventsByDay.get(selected) ?? []).sort(
    (a, b) => +new Date(a.start) - +new Date(b.start),
  );

  function exportICS() {
    const blob = new Blob([buildICS(state.events, state.people)], {
      type: "text/calendar",
    });
    triggerDownload(blob, "coparent-calendar.ics");
  }

  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = isoDateInput(new Date().toISOString());

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p className="muted">
            Shared parenting schedule. Export to your phone's calendar with one tap.
          </p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={exportICS}>⤓ Sync to my phone (.ics)</button>
          <button className="btn" onClick={() => setShowRotation((s) => !s)}>
            🔁 Set up rotation
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            + Add event
          </button>
        </div>
      </div>

      {showRotation && (
        <RotationForm
          defaultDate={selected}
          me={state.people.find((p) => p.id === state.meId)!}
          coParent={state.people.find((p) => p.id === state.coParentId)!}
          onCancel={() => setShowRotation(false)}
          onGenerate={(events) => {
            addEvents(events);
            setShowRotation(false);
          }}
        />
      )}

      {showForm && (
        <EventForm
          defaultDate={selected}
          people={state.people.filter((p) => p.role === "me" || p.role === "coparent")}
          onCancel={() => setShowForm(false)}
          onSave={(e) => {
            addEvent(e);
            setShowForm(false);
          }}
        />
      )}

      <div className="cal-wrap">
        <div className="cal">
          <div className="cal-nav">
            <button className="icon-btn" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
            <h2 aria-live="polite">{monthLabel}</h2>
            <button className="icon-btn" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="cal-dow">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="cal-grid">
            {grid.map((d) => {
              const key = isoDateInput(d.toISOString());
              const evs = eventsByDay.get(key) ?? [];
              const muted = d.getMonth() !== cursor.getMonth();
              return (
                <button
                  key={key}
                  className={
                    "cal-cell" +
                    (muted ? " muted-cell" : "") +
                    (key === selected ? " selected" : "") +
                    (key === today ? " today" : "")
                  }
                  aria-label={`${fullDate(key)}${evs.length ? `, ${evs.length} event${evs.length === 1 ? "" : "s"}` : ""}`}
                  aria-pressed={key === selected}
                  onClick={() => setSelected(key)}
                >
                  <span className="cal-date">{d.getDate()}</span>
                  <span className="cal-dots">
                    {evs.slice(0, 4).map((e) => (
                      <span key={e.id} className={"cal-dot cat-" + e.category} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="cal-day">
          <h3>{fullDate(selected)}</h3>
          {selectedEvents.length === 0 ? (
            <p className="muted">No events. Click “Add event” to schedule something.</p>
          ) : (
            selectedEvents.map((e) => (
              <div key={e.id} className={"event-card cat-border-" + e.category}>
                <div className="event-top">
                  <span className={"cat-tag cat-" + e.category}>
                    {CATS.find((c) => c.value === e.category)?.label}
                  </span>
                  {!e.allDay && <span className="muted small">{time(e.start)}</span>}
                </div>
                <div className="event-title">{e.title}</div>
                {e.notes && <p className="muted small">{e.notes}</p>}

                {e.requestStatus === "pending" && (
                  <div className="request-inline">
                    <span className="pill pill-warn">Swap request</span>
                    <div className="request-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => respondToRequest(e.id, true)}>Accept</button>
                      <button className="btn btn-sm" onClick={() => respondToRequest(e.id, false)}>Decline</button>
                    </div>
                  </div>
                )}
                {e.requestStatus === "accepted" && <span className="pill pill-ok">Swap accepted ✓</span>}
                {e.requestStatus === "declined" && <span className="pill">Swap declined</span>}

                <button className="link danger" onClick={() => deleteEvent(e.id)}>Remove</button>
              </div>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}

function EventForm({
  defaultDate,
  people,
  onSave,
  onCancel,
}: {
  defaultDate: string;
  people: { id: string; name: string }[];
  onSave: (e: Omit<CalEvent, "id">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("activity");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("15:00");
  const [allDay, setAllDay] = useState(false);
  const [withId, setWithId] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    if (!title.trim()) return;
    const start = allDay
      ? new Date(date + "T00:00").toISOString()
      : new Date(date + "T" + startTime).toISOString();
    const end = allDay
      ? start
      : new Date(new Date(start).getTime() + 3600000).toISOString();
    onSave({
      title: title.trim(),
      category,
      start,
      end,
      allDay,
      notes: notes.trim() || undefined,
      withId: withId || undefined,
      requestStatus: "none",
    });
  }

  return (
    <div className="card form-card">
      <div className="form-grid">
        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ava — Dance recital" autoFocus />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>
            {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Time</span>
          <input type="time" value={startTime} disabled={allDay} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label className="field checkbox">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          <span>All day</span>
        </label>
        <label className="field">
          <span>Child is with</span>
          <select value={withId} onChange={(e) => setWithId(e.target.value)}>
            <option value="">— n/a —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field field-wide">
          <span>Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Location, what to bring, etc." />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={submit}>Save event</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function RotationForm({
  defaultDate,
  me,
  coParent,
  onGenerate,
  onCancel,
}: {
  defaultDate: string;
  me: { id: string; name: string };
  coParent: { id: string; name: string };
  onGenerate: (events: Omit<CalEvent, "id">[]) => void;
  onCancel: () => void;
}) {
  const [pattern, setPattern] = useState<RotationPattern>("alternating-weeks");
  const [startDate, setStartDate] = useState(defaultDate);
  const [weeks, setWeeks] = useState(8);
  const [startWith, setStartWith] = useState<"me" | "co">("me");

  const preview = generateRotation({
    pattern, startDate, weeks,
    aId: me.id, bId: coParent.id, aName: me.name, bName: coParent.name,
    startWithA: startWith === "me",
  });

  return (
    <div className="card form-card">
      <h2 style={{ fontSize: 16, marginBottom: 4 }}>Set up a custody rotation</h2>
      <p className="muted small" style={{ margin: "0 0 14px" }}>
        Pick a pattern and we'll fill in the parenting-time blocks for you. You can edit or remove any of them afterward.
      </p>
      <div className="form-grid">
        <label className="field">
          <span>Pattern</span>
          <select value={pattern} onChange={(e) => setPattern(e.target.value as RotationPattern)}>
            {Object.entries(ROTATION_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Starts with</span>
          <select value={startWith} onChange={(e) => setStartWith(e.target.value as "me" | "co")}>
            <option value="me">{me.name}</option>
            <option value="co">{coParent.name}</option>
          </select>
        </label>
        <label className="field">
          <span>Start date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Generate for: {weeks} weeks</span>
          <input type="range" min="2" max="26" step="1" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
        </label>
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>
        Creates <strong>{preview.length}</strong> parenting-time block{preview.length === 1 ? "" : "s"} over {weeks} weeks.
      </p>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={() => onGenerate(preview)}>
          Generate {preview.length} blocks
        </button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
