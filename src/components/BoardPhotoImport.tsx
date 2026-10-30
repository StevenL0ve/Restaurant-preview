import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { emptyCard, getPullerName, useStore } from "../state/store";
import { boardGaps, mergeBoards, niceName, readBoard, type BoardRead } from "../lib/boardImport";
import { openQuestions, planBoard, type BoardAnswers, type LaterStarts, type PlannedCase, type PlannedPerson } from "../lib/boardPlan";
import { dayDate, longDate } from "../lib/dayPdf";
import { getWorkspace } from "../lib/workspace";
import type { CaseEntry } from "../types";

// Photo of the OR board -> the day's lineup. The photo is read on the phone
// (nothing is uploaded), patient columns are dropped as it's read, and the
// review asks about anything it isn't sure of before a case is added.

/** How complete a read is: the header, then cases with a room, then cases. */
const score = (r: BoardRead) => (r.headerFound ? 1000 : 0) + r.cases.filter((c) => c.room).length * 10 + r.cases.length;

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** "SMITH, T" -> "Dr. T. Smith" (a starting point; the person can edit it). */
function surgeonFromBoard(raw: string): string {
  const [last, first] = raw.split(",").map((s) => s.trim());
  if (!first) return `Dr. ${niceName(raw)}`;
  return `Dr. ${first.length === 1 ? `${first.toUpperCase()}.` : niceName(first)} ${niceName(last)}`;
}

export function BoardPhotoImport({ needsApproval }: { needsApproval: boolean }) {
  const navigate = useNavigate();
  const { state, addSurgeon, saveCard, addCases, updateCase } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reads, setReads] = useState<BoardRead[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<BoardAnswers>({ date: "", later: "follow", rooms: {}, surgeons: {}, cards: {}, people: {} });
  const [newSurgeons, setNewSurgeons] = useState<Record<string, { name: string; specialty: string }>>({});

  const board = useMemo(() => mergeBoards(reads), [reads]);
  const date = answers.date || board.date || tomorrow();
  const plan = useMemo(
    () => planBoard(board.cases, { ...answers, date }, { cards: state.cards, surgeons: state.surgeons, staff: state.staff, cases: state.cases }),
    [board, answers, date, state.cards, state.surgeons, state.staff, state.cases],
  );
  const set = (patch: Partial<BoardAnswers>) => setAnswers((a) => ({ ...a, ...patch }));
  const isNew = (p: PlannedCase) => !p.surgeonId && !!newSurgeons[p.board.surgeon];
  const included = (p: PlannedCase) => !!p.room && (isNew(p) ? answers.cards[p.index] !== "" : !!p.cardId);
  const ready = plan.filter(included);
  const adds = ready.filter((p) => !p.existingId).length;
  const updates = ready.length - adds;
  const questions = openQuestions(plan.filter(included)).length;
  const gaps = boardGaps(board);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    setErr(null);
    const { ocrImageBoxes, ocrPdfBoxes } = await import("../lib/ocr");
    const fresh: BoardRead[] = [];
    try {
      for (const [i, f] of files.entries()) {
        const label = files.length > 1 ? `Reading photo ${i + 1} of ${files.length}` : "Reading the board";
        setBusy(label);
        const progress = (pct: number) => setBusy(`${label}… ${pct}%`);
        if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
          for (const page of await ocrPdfBoxes(f, progress)) fresh.push(readBoard(page));
        } else {
          // Read it, and if the board says there's more than was found, read
          // it again another way; keep the fullest read.
          let best: BoardRead | null = null;
          for (let pass = 0; ; pass++) {
            const boxes = await ocrImageBoxes(f, progress, pass);
            if (!boxes) break;
            const r = readBoard(boxes);
            if (!best || score(r) > score(best)) best = r;
            if (best.headerFound && best.cases.length && (best.total === undefined || best.cases.length >= best.total) && !boardGaps(best).length) break;
            setBusy(`${label}: taking a closer look`);
          }
          if (best) fresh.push(best);
        }
      }
    } catch {
      setErr("Couldn't read that photo on this device. Try again, or use the ORSync app on your phone.");
    } finally {
      setBusy(null);
    }
    const good = fresh.filter((r) => r.headerFound && r.cases.length);
    if (fresh.length && !good.length) {
      setErr("Couldn't find the board's columns (Start, Surgeon, Procedure). Take the photo straight on, with the heading row in it.");
    }
    if (good.length) setReads((r) => [...r, ...good]);
  }

  function startOver() {
    setReads([]);
    setAnswers({ date: "", later: "follow", rooms: {}, surgeons: {}, cards: {}, people: {} });
    setNewSurgeons({});
    setErr(null);
  }

  function onAdd() {
    const facility = getWorkspace()?.name ?? state.facilities[0]?.name;
    const facilityId = state.facilities[0]?.id;
    const madeSurgeon: Record<string, { id: string; specialty: string }> = {};
    const madeCard: Record<string, string> = {};
    const approval = needsApproval ? { kind: "add" as const, by: getPullerName() || undefined, at: new Date().toISOString() } : undefined;
    const list: Omit<CaseEntry, "id">[] = [];
    let updated = 0;
    for (const p of ready) {
      let surgeonId = p.surgeonId;
      let specialty = state.surgeons.find((s) => s.id === surgeonId)?.specialty ?? "";
      if (!surgeonId) {
        const want = newSurgeons[p.board.surgeon];
        madeSurgeon[p.board.surgeon] ??= (() => {
          const s = addSurgeon({ name: want.name.trim() || surgeonFromBoard(p.board.surgeon), specialty: want.specialty.trim() || "General Surgery", facility });
          return { id: s.id, specialty: s.specialty };
        })();
        ({ id: surgeonId, specialty } = madeSurgeon[p.board.surgeon]);
      }
      let cardId = isNew(p) || p.cardId === "new" ? undefined : p.cardId;
      if (!cardId) {
        // One new card per surgeon and procedure (two Nasal Endoscopy
        // cases share it).
        const k = `${surgeonId}|${p.board.procedure.toLowerCase()}`;
        if (!madeCard[k]) {
          const fac = state.cards.find((c) => c.surgeonId === surgeonId)?.facilityId ?? facilityId;
          const card = { ...emptyCard(surgeonId!, specialty || "General Surgery", fac), procedure: p.board.procedure };
          saveCard(card);
          madeCard[k] = card.id;
        }
        cardId = madeCard[k];
      }
      const title = state.cards.find((c) => c.id === cardId)?.procedure ?? p.board.procedure;
      const entry = {
        date, time: p.time, notBefore: p.notBefore, room: p.room, cardId,
        procedure: p.board.procedure && p.board.procedure !== title ? p.board.procedure : undefined,
        team: p.team.length ? p.team : undefined,
        notes: p.notes,
      };
      if (p.existingId) {
        const before = state.cases.find((c) => c.id === p.existingId);
        updateCase(p.existingId, {
          time: entry.time, notBefore: entry.notBefore, procedure: entry.procedure,
          ...(entry.team ? { team: entry.team } : {}),
          ...(entry.notes && !before?.notes?.includes(entry.notes) ? { notes: [before?.notes, entry.notes].filter(Boolean).join("\n") } : {}),
        });
        updated++;
      } else {
        list.push({ ...entry, ...(approval ? { approval } : {}) });
      }
    }
    const n = addCases(list, `Schedule: board photo, ${list.length} ${list.length === 1 ? "case" : "cases"} for ${date}${updated ? `, ${updated} updated` : ""}${approval ? " (waiting for admin approval)" : ""}`);
    if (n || updated) navigate(`/today?d=${date}`);
  }

  const surgeonName = (id?: string) => state.surgeons.find((s) => s.id === id)?.name;
  const cardName = (id: string) => state.cards.find((c) => c.id === id)?.procedure ?? "";
  const surgeonsSorted = [...state.surgeons].sort((a, b) => a.name.localeCompare(b.name));
  const specialties = [...new Set(state.surgeons.map((s) => s.specialty).filter(Boolean))].sort();
  const roomsSeen = [...new Set(plan.map((p) => p.room).filter(Boolean) as string[])];

  return (
    <>
      <div className="card form-card board-photo">
        <h2>Photo of the OR board</h2>
        <p className="muted small">
          Take a picture of the board (the Periop Tracking screen) and ORSync fills the day: rooms, surgeons, cases and
          the room team. It's read on this device; patient names, case numbers and comments are <strong>never read or saved</strong>.
          Scrolled board? Add a photo of each part.
        </p>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            {reads.length ? "Add another photo" : "Take or choose photos"}
          </button>
          {reads.length > 0 && <button className="btn" disabled={!!busy} onClick={startOver}>Start over</button>}
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={onFiles} />
        </div>
        {busy && <p className="muted small">{busy}</p>}
        {err && <p className="neg small">{err}</p>}
        {reads.length > 0 && (
          <p className="muted small" style={{ margin: 0 }}>
            {reads.length} {reads.length === 1 ? "photo" : "photos"} · {board.cases.length} {board.cases.length === 1 ? "case" : "cases"} read
            {board.total !== undefined ? ` of ${board.total} on the board` : ""}
          </p>
        )}
      </div>

      {board.cases.length > 0 && (
        <div className="card form-card">
          <h2>Check the day</h2>
          <label className="field field-wide"><span>These cases are for</span>
            <input type="date" value={date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <p className="muted small" style={{ margin: 0 }}>
            {board.shownDate
              ? `The board shows ${longDate(dayDate(board.shownDate))}${board.plusDays ? ` and its filter says +${board.plusDays}` : ""}, so this is ${longDate(dayDate(board.date!))}.`
              : board.plusDays
                ? `The board's filter says +${board.plusDays} (tomorrow's schedule). Check the day.`
                : "The photo doesn't show the date. Check the day."}
          </p>
          {gaps.length > 0 && (
            <ul className="board-gaps">
              {gaps.map((g) => <li key={g}>{g}</li>)}
            </ul>
          )}
          <div className="field field-wide"><span>Later cases in each room</span>
            <div className="log-ranges">
              {([["follow", "To follow"], ["notBefore", "Not before the board's time"]] as [LaterStarts, string][]).map(([k, label]) => (
                <button key={k} type="button" className={"chip" + (answers.later === k ? " active" : "")} onClick={() => set({ later: k })}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {board.cases.length > 0 && (
        <div className="card form-card">
          <h2>Review the cases</h2>
          <p className="muted small">
            {ready.length} of {plan.length} ready{updates ? ` (${updates} already on My day get updated)` : ""}.
            {questions > 0 && <strong className="schedule-problem"> {questions} {questions === 1 ? "name needs" : "names need"} an answer.</strong>}
          </p>
          <ul className="schedule-rows">
            {plan.map((p) => {
              const on = included(p);
              const newS = newSurgeons[p.board.surgeon];
              return (
                <li key={p.index} className={on ? "on" : "off"}>
                  <div className="schedule-when">
                    <strong>{p.time ?? (p.notBefore ? `Not before ${p.notBefore}` : "To follow")}</strong>
                    {p.room ? <span> · {p.room}</span> : (
                      <select className="board-room" value="" onChange={(e) => setAnswers((a) => ({ ...a, rooms: { ...a.rooms, [p.index]: e.target.value } }))}>
                        <option value="">Which room?</option>
                        {roomsSeen.map((r) => <option key={r} value={r}>{r}</option>)}
                        {Array.from({ length: 12 }, (_, i) => `OR ${i + 1}`).filter((r) => !roomsSeen.includes(r)).map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                    <span className="muted small"> · board {p.board.time}{p.board.minutes ? `, ${p.board.minutes} min` : ""}</span>
                  </div>
                  <div className="schedule-what">
                    <span>{surgeonName(p.surgeonId) ?? (newS ? newS.name : p.board.surgeon)}</span>
                    <span className="muted"> · {p.board.procedure}</span>
                  </div>

                  {!p.surgeonId && (
                    <select
                      value={newS ? "new" : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "new") setNewSurgeons((m) => ({ ...m, [p.board.surgeon]: { name: surgeonFromBoard(p.board.surgeon), specialty: "" } }));
                        else {
                          setNewSurgeons((m) => { const { [p.board.surgeon]: _, ...rest } = m; return rest; });
                          if (v) setAnswers((a) => ({ ...a, surgeons: { ...a.surgeons, [p.board.surgeon]: v } }));
                        }
                      }}
                    >
                      <option value="">Who is {p.board.surgeon}?</option>
                      <option value="new">+ Add {surgeonFromBoard(p.board.surgeon)} as a new surgeon</option>
                      {surgeonsSorted.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.specialty}</option>)}
                    </select>
                  )}
                  {newS && (
                    <div className="board-new-surgeon">
                      <label className="field"><span>Surgeon's name</span>
                        <input value={newS.name} onChange={(e) => setNewSurgeons((m) => ({ ...m, [p.board.surgeon]: { ...newS, name: e.target.value } }))} />
                      </label>
                      <label className="field"><span>Specialty</span>
                        <input value={newS.specialty} list="board-specialties" placeholder="General Surgery" onChange={(e) => setNewSurgeons((m) => ({ ...m, [p.board.surgeon]: { ...newS, specialty: e.target.value } }))} />
                      </label>
                    </div>
                  )}

                  {newS ? (
                    <select value={answers.cards[p.index] === "" ? "" : "new"} onChange={(e) => setAnswers((a) => ({ ...a, cards: { ...a.cards, [p.index]: e.target.value } }))}>
                      <option value="new">+ New card “{p.board.procedure}”</option>
                      <option value="">Skip this case</option>
                    </select>
                  ) : p.surgeonId && (
                    <select value={p.cardId ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, cards: { ...a.cards, [p.index]: e.target.value } }))}>
                      <option value="">Skip this case</option>
                      {p.candidates.map((c) => <option key={c.cardId} value={c.cardId}>{cardName(c.cardId)}</option>)}
                      {state.cards
                        .filter((c) => c.surgeonId === p.surgeonId && !p.candidates.some((x) => x.cardId === c.id))
                        .map((c) => <option key={c.id} value={c.id}>{c.procedure}</option>)}
                      <option value="new">+ New card “{p.board.procedure}”</option>
                    </select>
                  )}

                  {p.people.length > 0 && (
                    <div className="board-team">
                      {p.people.map((x) => <PersonPick key={x.key} person={x} onPick={(v) => setAnswers((a) => ({ ...a, people: { ...a.people, [x.key]: v } }))} />)}
                    </div>
                  )}
                  {p.existingId && on && <span className="muted small">Already on My day: updates its team and times.</span>}
                  {p.problem && !on && !newS && <span className="schedule-problem small">{p.problem}</span>}
                </li>
              );
            })}
          </ul>
          <datalist id="board-specialties">{specialties.map((s) => <option key={s} value={s} />)}</datalist>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={!ready.length} onClick={onAdd}>
              {[
                adds ? `${needsApproval ? "Request" : "Add"} ${adds} ${adds === 1 ? "case" : "cases"}` : "",
                updates ? `${adds ? "update" : "Update"} ${updates}${adds ? "" : updates === 1 ? " case" : " cases"}` : "",
              ].filter(Boolean).join(", ") || "Add cases"}
            </button>
            {needsApproval && <span className="muted small">An admin approves them before carts are queued.</span>}
          </div>
        </div>
      )}
    </>
  );
}

/** One name from the board's Circulator or Tech column, as a pick: the
 *  staff it could be, the name as written, or leave them off. */
function PersonPick({ person, onPick }: { person: PlannedPerson; onPick: (v: string) => void }) {
  const { state } = useStore();
  const { read, column, choice } = person;
  const roleGroup = column === "circulator" ? ["nurse"] : ["tech", "trainee", "phase2"];
  const others = state.staff
    .filter((m) => roleGroup.includes(m.role) && !read.matches.some((x) => x.id === m.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const label = column === "circulator" ? "RN" : "Tech";
  return (
    <select className={"board-person" + (choice === undefined ? " ask" : "")} value={choice ?? "?"} onChange={(e) => onPick(e.target.value)}>
      {choice === undefined && <option value="?">{label}: which {read.text}?</option>}
      {read.matches.map((m) => <option key={m.id} value={m.id}>{label}: {m.name}</option>)}
      <option value="asis">{label}: {niceName(read.text)}{read.roleOnly ? "" : read.matches.length ? " (as written)" : " (not in staff list)"}</option>
      <option value="">{label}: leave off ({read.text})</option>
      {others.length > 0 && (
        <optgroup label={read.roleOnly ? `Who is the ${read.text}?` : "Someone else"}>
          {others.map((m) => <option key={m.id} value={m.id}>{label}: {m.name}</option>)}
        </optgroup>
      )}
    </select>
  );
}
