import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NavIcon } from "../components/NavIcon";
import { BoardPhotoImport } from "../components/BoardPhotoImport";
import { useStore, getPullerName } from "../state/store";
import { useAuth } from "../state/auth";
import { usePermissions } from "../lib/permissions";
import {
  buildScheduleRows, detectColumns, PHI_HEADER, readScheduleFile, SCHEDULE_FIELDS,
  type Cell, type ColumnMap, type ScheduleField,
} from "../lib/scheduleImport";

// Batch schedule upload: an EHR export or spreadsheet of the OR schedule in,
// a day's (or week's) cases out, after a review of every match.
export function ScheduleUploadPage() {
  const navigate = useNavigate();
  const { state, addCases } = useStore();
  const { user } = useAuth();
  const perms = usePermissions(user?.uid, user?.email);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Cell[][] | null>(null);
  const [map, setMap] = useState<ColumnMap>({});
  const [picks, setPicks] = useState<Record<number, string>>({}); // line -> cardId ("" = skip)
  const [err, setErr] = useState<string | null>(null);

  const header = rows?.[0]?.map((c) => String(c ?? "").trim()) ?? [];
  const phiCols = header.filter((h) => PHI_HEADER.test(h));
  const preview = useMemo(
    () => (rows ? buildScheduleRows(rows, map, { cards: state.cards, surgeons: state.surgeons, cases: state.cases }) : []),
    [rows, map, state.cards, state.surgeons, state.cases],
  );
  const chosen = (line: number, fallback?: string) => (line in picks ? picks[line] : fallback ?? "");
  const ready = preview.filter((r) => r.date && chosen(r.line, r.cardId));
  const missingRequired = SCHEDULE_FIELDS.filter((f) => f.required && map[f.key] === undefined);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(null);
    try {
      const data = await readScheduleFile(f);
      if (data.length < 2) throw new Error("empty");
      setRows(data);
      setFileName(f.name);
      setPicks({});
      setMap(detectColumns(data[0].map((c) => String(c ?? ""))));
    } catch {
      setErr("Couldn't read that file. Save the schedule as .csv or .xlsx and try again.");
    }
  }

  function onAdd() {
    const approval = perms.needsApproval ? { kind: "add" as const, by: getPullerName() || undefined, at: new Date().toISOString() } : undefined;
    const list = ready.map((r) => ({
      date: r.date!, time: r.time, room: r.room, cardId: chosen(r.line, r.cardId),
      // The schedule's own wording names the case; the card is what's pulled.
      procedure: r.procedureText.trim() && r.procedureText.trim() !== cardName(chosen(r.line, r.cardId) ?? "") ? r.procedureText.trim() : undefined,
      ...(approval ? { approval } : {}),
    }));
    const days = [...new Set(list.map((c) => c.date))].sort();
    const n = addCases(list, `Schedule: uploaded ${list.length} ${list.length === 1 ? "case" : "cases"} for ${days.length === 1 ? days[0] : `${days[0]} to ${days[days.length - 1]}`} from ${fileName}${approval ? " (waiting for admin approval)" : ""}`);
    if (n) navigate(`/today?d=${days[0]}`);
  }

  if (!perms.canAddCase) {
    return (
      <div className="page page-narrow">
        <h1 className="page-title"><NavIcon name="myday" size={40} />Upload schedule</h1>
        <p className="muted">Your position can't add cases. Ask your charge nurse or an admin to upload the schedule.</p>
        <Link className="btn" to="/today">Back to My day</Link>
      </div>
    );
  }

  const cardName = (id: string) => state.cards.find((c) => c.id === id)?.procedure ?? "";
  const surgeonName = (id?: string) => state.surgeons.find((s) => s.id === id)?.name;

  return (
    <div className="page page-narrow schedule-upload">
      <div className="detail-top"><Link className="link" to="/today">← My day</Link></div>
      <h1 className="page-title"><NavIcon name="myday" size={40} />Upload schedule</h1>
      <p className="muted">
        Bring a day of cases in at once from a photo of the OR board, or a day or a week from your EHR
        (Epic, Cerner, MHS GENESIS) or a spreadsheet. Each case is matched to the surgeon's preference card;
        you review every match before anything is added.
      </p>

      <BoardPhotoImport needsApproval={perms.needsApproval} />

      <div className="card form-card">
        <h2>Or a schedule file</h2>
        <p className="muted small">
          A .csv or .xlsx with a header row: date, start time, room, surgeon, procedure. Patient names, MRNs and
          other patient columns are <strong>ignored and never saved</strong>.
        </p>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>{rows ? "Choose another file" : "Choose file"}</button>
          {fileName && <span className="muted small">{fileName}</span>}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={onFile} />
        </div>
        {err && <p className="neg small">{err}</p>}
      </div>

      {rows && (
        <div className="card form-card">
          <h2>Check the columns</h2>
          <div className="schedule-map">
            {SCHEDULE_FIELDS.map((f) => (
              <label key={f.key} className="field">
                <span>{f.label}{f.required ? "" : " (optional)"}</span>
                <select
                  value={map[f.key] ?? ""}
                  onChange={(e) => setMap((m) => ({ ...m, [f.key as ScheduleField]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                >
                  <option value="">Not in this file</option>
                  {header.map((h, i) => (PHI_HEADER.test(h) ? null : <option key={i} value={i}>{h || `Column ${i + 1}`}</option>))}
                </select>
              </label>
            ))}
          </div>
          {phiCols.length > 0 && <p className="muted small">Ignored (patient information): {phiCols.join(", ")}.</p>}
          {missingRequired.length > 0 && <p className="neg small">Pick the {missingRequired.map((f) => f.label.toLowerCase()).join(", ")} column to continue.</p>}
        </div>
      )}

      {rows && missingRequired.length === 0 && (
        <div className="card form-card">
          <h2>Review the cases</h2>
          <p className="muted small">
            {ready.length} of {preview.length} ready. Rows without a card are skipped; pick one to include them.
          </p>
          <ul className="schedule-rows">
            {preview.map((r) => {
              const pick = chosen(r.line, r.cardId);
              return (
                <li key={r.line} className={pick ? "on" : "off"}>
                  <div className="schedule-when">
                    <strong>{r.date ?? "No date"}</strong>
                    {r.time && <span> · {r.time}</span>}
                    {r.room && <span> · {r.room}</span>}
                  </div>
                  <div className="schedule-what">
                    <span>{surgeonName(r.surgeonId) ?? r.surgeonText}</span>
                    <span className="muted"> · {r.procedureText}</span>
                  </div>
                  <select
                    value={pick}
                    disabled={!r.date || r.duplicate}
                    onChange={(e) => setPicks((p) => ({ ...p, [r.line]: e.target.value }))}
                  >
                    <option value="">Skip this case</option>
                    {r.candidates.map((c) => <option key={c.cardId} value={c.cardId}>{cardName(c.cardId)}</option>)}
                    {state.cards
                      .filter((c) => (!r.surgeonId || c.surgeonId === r.surgeonId) && !r.candidates.some((x) => x.cardId === c.id))
                      .map((c) => <option key={c.id} value={c.id}>{c.procedure}{r.surgeonId ? "" : ` (${surgeonName(c.surgeonId) ?? ""})`}</option>)}
                  </select>
                  {r.problem && !pick && <span className="schedule-problem small">{r.problem}</span>}
                </li>
              );
            })}
          </ul>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={!ready.length} onClick={onAdd}>
              {perms.needsApproval ? `Request ${ready.length} cases` : `Add ${ready.length} ${ready.length === 1 ? "case" : "cases"}`}
            </button>
            {perms.needsApproval && <span className="muted small">An admin approves them before carts are queued.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
