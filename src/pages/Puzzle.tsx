import { useMemo, useRef, useState } from "react";
import { useAuth } from "../state/auth";
import { useStore } from "../state/store";
import { contributors, isComplete, pieceStyle, puzzleSlots, unplacedIndices } from "../lib/puzzle";
import { postableVenues } from "../lib/roles";
import { fullDate } from "../lib/format";
import { notifySuccess, tapLight } from "../lib/haptics";

// The community café puzzle: one image, everyone places pieces while they
// wait in line or sip. Admins (owners, IT, café staff) start a fresh puzzle
// from any photo — usually once a month.

function pickRandom(list: number[]): number | null {
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function Puzzle() {
  const { user } = useAuth();
  const { state, placePuzzlePiece, startNewPuzzle } = useStore();
  const puzzle = state.puzzle;
  const done = isComplete(puzzle);
  const open = useMemo(() => unplacedIndices(puzzle), [puzzle]);

  // The piece in your hand — a random open slot; re-dealt after each placement.
  const [hand, setHand] = useState<number | null>(() => pickRandom(unplacedIndices(state.puzzle)));
  const [wrong, setWrong] = useState<number | null>(null);
  const [lastPlaced, setLastPlaced] = useState<string | null>(null);

  // Admin: start a new puzzle
  const canAdmin = !!user && (user.role === "it" || user.role === "owner" || postableVenues(user.role, user.venues).includes("cafe"));
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const placedBy = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of puzzle.placed) map.set(p.idx, p.by);
    return map;
  }, [puzzle]);

  function tapSlot(idx: number) {
    if (done || hand === null || placedBy.has(idx)) return;
    if (idx === hand) {
      const ok = placePuzzlePiece(idx, user?.name ?? "A friend");
      if (ok) {
        notifySuccess();
        setLastPlaced(`${user?.name ?? "You"} placed piece ${idx + 1} ☕️`);
        const remaining = open.filter((i) => i !== idx);
        setHand(pickRandom(remaining));
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
    setHand(0); // fresh board — deal any piece
    setTimeout(() => setHand(pickRandom(Array.from({ length: puzzleSlots(puzzle) }, (_, i) => i))), 0);
    notifySuccess();
  }

  const crew = contributors(puzzle);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Café Puzzle</h1>
          <p className="page-sub">
            {puzzle.title} · started {fullDate(puzzle.startedAt)}
          </p>
        </div>
      </div>

      <div className="card row-card">
        <div>
          <div className="row-title">🧩 {puzzle.placed.length} / {puzzleSlots(puzzle)} pieces placed</div>
          <div className="row-sub">
            {done
              ? "Complete! A fresh puzzle is coming soon."
              : "Match the piece in your hand to its spot on the board."}
          </div>
        </div>
        {crew.length > 0 && <span className="pill pill-ok">{crew.length} solver{crew.length > 1 ? "s" : ""}</span>}
      </div>

      {/* The board */}
      <div
        className={"puzzle-board" + (done ? " puzzle-done" : "")}
        style={{ gridTemplateColumns: `repeat(${puzzle.cols}, 1fr)`, aspectRatio: `${puzzle.cols} / ${puzzle.rows}` }}
      >
        {Array.from({ length: puzzleSlots(puzzle) }, (_, i) => {
          const isPlaced = placedBy.has(i);
          return (
            <button
              key={`${puzzle.id}-${i}`}
              className={
                "puzzle-slot" +
                (isPlaced ? " placed" : "") +
                (wrong === i ? " wrong" : "")
              }
              style={isPlaced || done ? pieceStyle(puzzle, i) : undefined}
              onClick={() => tapSlot(i)}
              aria-label={isPlaced ? `Piece ${i + 1}, placed by ${placedBy.get(i)}` : `Empty slot ${i + 1}`}
              title={isPlaced ? `Placed by ${placedBy.get(i)}` : undefined}
            >
              {!isPlaced && !done && <span className="puzzle-num">{i + 1}</span>}
            </button>
          );
        })}
      </div>

      {done ? (
        <div className="card success-banner">🎉 Puzzle complete — nice work, everyone!</div>
      ) : (
        hand !== null && (
          <div className="card puzzle-hand-card">
            <div
              className="puzzle-hand"
              style={pieceStyle(puzzle, hand)}
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
        )
      )}

      {lastPlaced && <p className="wallet-status">{lastPlaced}</p>}

      {/* Solvers */}
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

      <p className="footnote">
        Tap any placed piece to see who set it. Once accounts sync to the cloud
        (Phase 2), everyone at the café works this same board live.
      </p>

      {/* Admin: new monthly puzzle */}
      {canAdmin && (
        <section className="section">
          <div className="card">
            <button className="btn btn-ghost btn-block" onClick={() => setFormOpen((o) => !o)}>
              {formOpen ? "Close" : "🖼️ Start a new puzzle"}
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
                  Starting a new puzzle clears the current board. The photo
                  becomes a {puzzle.cols}×{puzzle.rows} jigsaw for everyone.
                </p>
                <button className="btn btn-primary btn-block" disabled={!image} onClick={launch}>
                  Launch puzzle
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
