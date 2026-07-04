import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../state/auth";
import { useStore } from "../state/store";
import { activePuzzle, contributors, isComplete, pieceStyle, puzzleSlots, unplacedIndices } from "../lib/puzzle";
import { postableVenues } from "../lib/roles";
import { fullDate } from "../lib/format";
import { notifySuccess, tapLight } from "../lib/haptics";

// The community café puzzles: a rotation of boards. The first unfinished one
// is on the table; completed puzzles hang in the gallery below. Admins
// (owners, IT, café staff) add fresh boards from any photo.

function pickRandom(list: number[]): number | null {
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function Puzzle() {
  const { user } = useAuth();
  const { state, placePuzzlePiece, startNewPuzzle, restartPuzzle } = useStore();
  const active = activePuzzle(state.puzzles);
  const completed = state.puzzles.filter(isComplete);
  const open = useMemo(() => (active ? unplacedIndices(active) : []), [active]);

  // The piece in your hand — re-dealt after every placement and whenever the
  // rotation moves to the next board.
  const [hand, setHand] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [lastPlaced, setLastPlaced] = useState<string | null>(null);
  const activeId = active?.id;
  useEffect(() => {
    setHand(active ? pickRandom(unplacedIndices(active)) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Admin: add a puzzle to the rotation
  const canAdmin = !!user && (user.role === "it" || user.role === "owner" || postableVenues(user.role, user.venues).includes("cafe"));
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const placedBy = useMemo(() => {
    const map = new Map<number, string>();
    if (active) for (const p of active.placed) map.set(p.idx, p.by);
    return map;
  }, [active]);

  function tapSlot(idx: number) {
    if (!active || hand === null || placedBy.has(idx)) return;
    if (idx === hand) {
      const ok = placePuzzlePiece(idx, user?.name ?? "A friend");
      if (ok) {
        notifySuccess();
        setLastPlaced(`${user?.name ?? "You"} placed piece ${idx + 1} ☕️`);
        setHand(pickRandom(open.filter((i) => i !== idx)));
      }
    } else {
      tapLight();
      setWrong(idx);
      setTimeout(() => setWrong(null), 450);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(f);
  }

  function launch() {
    if (!image) return;
    startNewPuzzle(image, title, user?.name ?? "Café");
    setFormOpen(false);
    setTitle("");
    setImage(null);
    notifySuccess();
  }

  const crew = active ? contributors(active) : [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Café Puzzle</h1>
          <p className="page-sub">
            {active
              ? `${active.title} · started ${fullDate(active.startedAt)}`
              : "All puzzles solved — a fresh one is coming soon!"}
          </p>
        </div>
      </div>

      {active && (
        <>
          <div className="card row-card">
            <div>
              <div className="row-title">🧩 {active.placed.length} / {puzzleSlots(active)} pieces placed</div>
              <div className="row-sub">Match the piece in your hand to its spot on the board.</div>
            </div>
            {crew.length > 0 && <span className="pill pill-ok">{crew.length} solver{crew.length > 1 ? "s" : ""}</span>}
          </div>

          <div
            className="puzzle-board"
            style={{ gridTemplateColumns: `repeat(${active.cols}, 1fr)`, aspectRatio: `${active.cols} / ${active.rows}` }}
          >
            {Array.from({ length: puzzleSlots(active) }, (_, i) => {
              const isPlaced = placedBy.has(i);
              return (
                <button
                  key={`${active.id}-${i}`}
                  className={"puzzle-slot" + (isPlaced ? " placed" : "") + (wrong === i ? " wrong" : "")}
                  style={isPlaced ? pieceStyle(active, i) : undefined}
                  onClick={() => tapSlot(i)}
                  aria-label={isPlaced ? `Piece ${i + 1}, placed by ${placedBy.get(i)}` : `Empty slot ${i + 1}`}
                  title={isPlaced ? `Placed by ${placedBy.get(i)}` : undefined}
                >
                  {!isPlaced && <span className="puzzle-num">{i + 1}</span>}
                </button>
              );
            })}
          </div>

          {hand !== null && (
            <div className="card puzzle-hand-card">
              <div
                key={`${active.id}-${hand}`}
                className="puzzle-hand"
                style={pieceStyle(active, hand)}
                aria-label="The piece in your hand"
              />
              <div className="puzzle-hand-info">
                <div className="row-title">Your piece</div>
                <div className="row-sub">Find its spot on the board and tap it.</div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { tapLight(); setHand(pickRandom(open.filter((i) => i !== hand)) ?? hand); }}
                >
                  🔀 Different piece
                </button>
              </div>
            </div>
          )}

          {lastPlaced && <p className="wallet-status">{lastPlaced}</p>}

          {crew.length > 0 && (
            <section className="section">
              <h2 className="section-title">Solvers</h2>
              <div className="form-actions">
                {crew.map((c) => (
                  <span key={c.name} className="pill pill-ok">
                    {c.name} · {c.pieces} piece{c.pieces > 1 ? "s" : ""}
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Completed gallery */}
      {completed.length > 0 && (
        <section className="section">
          <h2 className="section-title">🏆 Completed puzzles</h2>
          <div className="puzzle-gallery">
            {completed.map((p) => (
              <div key={p.id} className="card puzzle-trophy">
                <img src={p.image} alt={`${p.title} — completed puzzle`} />
                <div className="puzzle-trophy-body">
                  <div className="row-title">{p.title}</div>
                  <div className="row-sub">
                    {contributors(p).length} solver{contributors(p).length === 1 ? "" : "s"} · finished {fullDate(p.placed[p.placed.length - 1]?.at ?? p.startedAt)}
                  </div>
                  {canAdmin && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 8 }}
                      onClick={() => { tapLight(); restartPuzzle(p.id); }}
                    >
                      🔁 Restart puzzle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="footnote">
        Tap any placed piece to see who set it. Once accounts sync to the cloud
        (Phase 2), everyone at the café works the same boards live.
      </p>

      {canAdmin && (
        <section className="section">
          <div className="card">
            <button className="btn btn-ghost btn-block" onClick={() => setFormOpen((o) => !o)}>
              {formOpen ? "Close" : "🖼️ Add a puzzle to the rotation"}
            </button>
            {formOpen && (
              <div className="auth-form" style={{ marginTop: 14 }}>
                <label className="field">
                  <span>Title</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="August at Common Ground" />
                </label>
                <label className="field">
                  <span>Puzzle image</span>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onFile} />
                </label>
                {image && <img src={image} alt="New puzzle preview" style={{ width: "100%", borderRadius: 12 }} />}
                <p className="footnote">
                  The photo becomes a 4×5 jigsaw at the end of the rotation.
                  Completed boards stay in the gallery.
                </p>
                <button className="btn btn-primary btn-block" disabled={!image} onClick={launch}>
                  Add puzzle
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
