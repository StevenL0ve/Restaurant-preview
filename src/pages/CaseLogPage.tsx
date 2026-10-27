import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, localDay, getPullerName } from "../state/store";
import { chronological, countLine, filterLog, logDay, logEntries, logText, specialtyCounts, type LogEntry, type LogFilter } from "../lib/caseLog";
import { copyText, shareBlobFile } from "../lib/share";

// Everyone's personal case history: the cases you were part of, and the ones
// you're scheduled into. Type any name to see a teammate's log instead —
// useful for "what rooms was Lee in this week?" Narrow it to dates or a
// specialty, then share it as a PDF or send it as a text.

type Range = "all" | "month" | "30" | "year" | "custom";

function rangeDates(r: Range): { from?: string; to?: string } {
  const now = new Date();
  const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (r === "month") return { from: day(new Date(now.getFullYear(), now.getMonth(), 1)), to: day(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  if (r === "30") return { from: localDay(-30), to: localDay(0) };
  if (r === "year") return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  return {};
}

const RANGES: [Range, string][] = [["all", "All"], ["month", "This month"], ["30", "Last 30 days"], ["year", "This year"], ["custom", "Dates…"]];

export function CaseLogPage() {
  const { state } = useStore();
  const [who, setWho] = useState(() => getPullerName());
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const today = localDay(0);

  const all = useMemo(() => logEntries(state, who), [state, who]);
  const filter: LogFilter = range === "custom"
    ? { from: from || undefined, to: to || undefined, specialty: specialty || undefined }
    : { ...rangeDates(range), specialty: specialty || undefined };
  const shown = filterLog(all, filter);
  const upcoming = chronological(shown.filter((c) => c.date >= today)); // soonest first
  // Newest day first; within a day, still in case order.
  const past = chronological(shown.filter((c) => c.date < today)).sort((a, b) => b.date.localeCompare(a.date));
  const specialties = specialtyCounts(filterLog(all, { ...filter, specialty: undefined })).map(([s]) => s);

  const names = [...new Set(state.staff.map((m) => m.name))].sort();
  // The full name as the roster has it ("Vargas" -> "Areli Vargas").
  const fullName = names.find((n) => n.toLowerCase() === who.trim().toLowerCase())
    ?? (names.filter((n) => n.toLowerCase().includes(who.trim().toLowerCase())).length === 1
      ? names.find((n) => n.toLowerCase().includes(who.trim().toLowerCase()))
      : undefined)
    ?? who.trim();

  function flash(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(null), 4000);
  }

  async function sharePdf() {
    setBusy(true);
    try {
      const { caseLogPdfBlob, caseLogFilename } = await import("../lib/caseLogPdf");
      const blob = await caseLogPdfBlob(fullName, shown, filter, today);
      const how = await shareBlobFile(caseLogFilename(fullName, filter), blob, `Case log: ${fullName} (${countLine(shown)})`, "application/pdf");
      if (how === "downloaded") flash("Saved the case log PDF.");
    } catch {
      flash("Couldn't build the PDF. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const text = logText(fullName, shown, filter, today);
  async function copy() {
    flash((await copyText(text)) ? "Copied. Paste it into any message." : "Couldn't copy.");
  }

  const row = (c: LogEntry) => (
    <Link key={c.id} className="card log-row" to={`/today?d=${c.date}`}>
      <span className="log-when">
        <strong>{logDay(c.date)}</strong>
        <span className="muted small">{[c.room, c.time ?? "to follow"].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="log-what">
        <span className="log-proc">{c.procedure}</span>
        <span className="muted small">
          {[c.surgeon, c.specialty, c.role ? `as ${c.role}` : null].filter(Boolean).join(" · ")}
        </span>
      </span>
    </Link>
  );

  return (
    <div className="page page-narrow">
      <div className="detail-top">
        <Link className="link" to="/today">← My day</Link>
      </div>
      <div className="page-head">
        <div>
          <h1>Case log</h1>
          <p className="muted">
            Every case this person is on the room team for: what's coming up and what's done.
          </p>
        </div>
      </div>

      <div className="card form-card">
        <label className="field field-wide"><span>Whose log?</span>
          <input
            value={who}
            list="log-names"
            placeholder="Your name, or any teammate's"
            onChange={(e) => setWho(e.target.value)}
          />
          <datalist id="log-names">
            {names.map((n) => <option key={n} value={n} />)}
          </datalist>
        </label>
        {!who.trim() && (
          <p className="muted small" style={{ margin: 0 }}>
            Set your name in Settings and your own log opens here automatically.
          </p>
        )}
        {who.trim() && all.length > 0 && (
          <>
            <div className="field field-wide log-filter"><span>Dates</span>
              <div className="log-ranges">
                {RANGES.map(([k, label]) => (
                  <button key={k} type="button" className={"chip" + (range === k ? " active" : "")} onClick={() => setRange(k)}>{label}</button>
                ))}
              </div>
              {range === "custom" && (
                <div className="log-dates">
                  <label className="field"><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
                  <label className="field"><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
                </div>
              )}
            </div>
            <label className="field field-wide log-filter"><span>Specialty</span>
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                <option value="">All specialties</option>
                {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                {specialty && !specialties.includes(specialty) && <option value={specialty}>{specialty}</option>}
              </select>
            </label>
            <p className="log-count"><strong>{countLine(shown)}</strong></p>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={busy || shown.length === 0} onClick={sharePdf}>{busy ? "Building…" : "Share PDF"}</button>
              <a
                className={"btn" + (shown.length === 0 ? " disabled" : "")}
                href={shown.length ? `sms:?&body=${encodeURIComponent(text)}` : undefined}
                aria-disabled={shown.length === 0}
              >
                Send as text
              </a>
              <button className="btn" disabled={shown.length === 0} onClick={copy}>Copy</button>
            </div>
            {msg && <p className="muted small" style={{ margin: 0 }}>{msg}</p>}
          </>
        )}
      </div>

      {who.trim() && (
        <>
          <h2 className="room-head">Scheduled {upcoming.length > 0 && <span className="muted small">· {upcoming.length}</span>}</h2>
          {upcoming.length === 0 ? (
            <p className="muted small">Nothing on the schedule{all.length ? " in this range" : " yet"}.</p>
          ) : (
            <div className="case-list">{upcoming.map(row)}</div>
          )}

          <h2 className="room-head">Past cases {past.length > 0 && <span className="muted small">· {past.length}</span>}</h2>
          {past.length === 0 ? (
            <p className="muted small">
              {all.length
                ? "No past cases in this range."
                : "No past cases recorded. Cases count once this person is added to a case's room team."}
            </p>
          ) : (
            <div className="case-list">{past.slice(0, 200).map(row)}</div>
          )}
        </>
      )}
    </div>
  );
}
