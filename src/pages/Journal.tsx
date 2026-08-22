import { useState } from "react";
import { useStore } from "../state/store";
import { fullDate } from "../lib/format";
import type { JournalEntry } from "../types";

const MOODS: { value: NonNullable<JournalEntry["mood"]>; label: string; emoji: string }[] = [
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "hard", label: "Hard", emoji: "😕" },
];

export function Journal() {
  const { state, addJournal, deleteJournal } = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<JournalEntry["mood"]>("neutral");

  function submit() {
    if (!title.trim() && !body.trim()) return;
    addJournal({
      title: title.trim() || "Untitled entry",
      body: body.trim(),
      createdAt: new Date().toISOString(),
      mood,
      shared: false,
    });
    setTitle("");
    setBody("");
    setMood("neutral");
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Journal</h1>
          <p className="muted">
            A private, timestamped log of events and exchanges. Entries are
            yours alone — nothing is shared unless you export it.
          </p>
        </div>
      </div>

      <div className="card form-card">
        <label className="field field-wide">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened?" />
        </label>
        <label className="field field-wide">
          <span>Details</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Facts as you observed them — times, who was present, what was said." />
        </label>
        <div className="form-actions">
          <div className="mood-pick">
            {MOODS.map((m) => (
              <button
                key={m.value}
                className={"mood " + (mood === m.value ? "active" : "")}
                onClick={() => setMood(m.value)}
                type="button"
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={submit}>Add entry</button>
        </div>
      </div>

      <div className="journal-list">
        {state.journal.length === 0 && (
          <div className="card empty-state">
            <span className="empty-emoji">📔</span>
            <p>No entries yet. Jot down what happened — it stays private to you.</p>
          </div>
        )}
        {state.journal.map((j) => (
          <article key={j.id} className="card journal-entry">
            <div className="journal-head">
              <h3>
                {j.mood && MOODS.find((m) => m.value === j.mood)?.emoji}{" "}
                {j.title}
              </h3>
              <button className="link danger" onClick={() => deleteJournal(j.id)}>Delete</button>
            </div>
            <div className="muted small">{fullDate(j.createdAt)} · 🔒 Private</div>
            <p>{j.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
