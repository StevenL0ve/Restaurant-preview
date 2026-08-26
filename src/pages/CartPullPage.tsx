import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useStore,
  surgeonOf,
  groupByArea,
  cartProgress,
  openMissing,
  getPullerName,
  setPullerName,
} from "../state/store";
import { accentStyle } from "../lib/accent";
import { tapLight, tapMedium } from "../lib/haptics";
import type { CaseCart, MissingEntry } from "../types";

const COMMENT_PRESETS = [
  "Waiting on rep delivery",
  "In SPD being prepared",
  "On order",
  "Backordered — sub approved",
];

function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Pull one case cart. Every checkmark records who pulled it, so two people on
// the same cart see each other's progress and nobody double-pulls. "I'm done"
// turns the unpulled remainder into the cart's missing list, each line taking
// a comment (waiting on rep / in SPD / ETA / alternative pulled…).
export function CartPullPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const { state, toggleCartPull, finishCartPull, resumeCartPull, deleteCart } = store;
  const [puller, setPuller] = useState(getPullerName());
  const [editingName, setEditingName] = useState(!getPullerName());
  const [confirmDel, setConfirmDel] = useState(false);

  const cart = state.carts.find((c) => c.id === id);
  const card = cart ? state.cards.find((c) => c.id === cart.cardId) : undefined;
  if (!cart || !card) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-emoji">🛒</span>
          <p>That cart doesn’t exist. <Link className="link" to="/carts">Back to carts</Link>.</p>
        </div>
      </div>
    );
  }

  const sg = surgeonOf(state, card.surgeonId);
  const groups = groupByArea(state, card);
  const { pulled, total } = cartProgress(state, cart);
  const pct = total ? Math.round((pulled / total) * 100) : 0;
  const missing = openMissing(cart);
  const me = puller.trim() || "Someone";

  function commitName(v: string) {
    setPuller(v);
    setPullerName(v);
    setEditingName(false);
  }

  return (
    <div className="page page-narrow setup" style={accentStyle(card.specialty)}>
      <div className="detail-top">
        <Link className="link" to="/carts">← Carts</Link>
        {confirmDel ? (
          <span className="confirm small">
            Delete cart?
            <button className="btn btn-danger btn-sm" onClick={() => { deleteCart(cart.id); navigate("/carts"); }}>Yes</button>
            <button className="btn btn-sm" onClick={() => setConfirmDel(false)}>No</button>
          </span>
        ) : (
          <button className="link" onClick={() => setConfirmDel(true)}>Delete</button>
        )}
      </div>

      <div className="page-head">
        <div>
          <h1>{card.procedure}</h1>
          <p className="muted">
            {cart.label && <strong>{cart.label} · </strong>}{sg?.name} · Case cart
          </p>
          {cart.note && <p className="cart-note">📩 {cart.note}</p>}
        </div>
      </div>

      <div className="puller-row">
        {editingName ? (
          <span className="puller-edit">
            <span>Pulling as</span>
            <input
              value={puller}
              placeholder="Your name"
              autoFocus
              onChange={(e) => setPuller(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitName(puller)}
            />
            <button className="btn btn-sm btn-primary" onClick={() => commitName(puller)}>OK</button>
          </span>
        ) : (
          <span className="muted small">
            Pulling as <strong>{me}</strong>{" "}
            <button className="link small" onClick={() => setEditingName(true)}>change</button>
            {" "}— your name is stamped on each item so co-pullers don’t double-pull.
          </span>
        )}
      </div>

      <div className={"progress-card" + (pulled === total && total > 0 ? " ready" : "")}>
        <div className="progress-top">
          <span className="progress-count">{pulled} / {total} in the cart</span>
          {cart.donePulling
            ? <span className={missing.length ? "cart-badge cart-badge-missing" : "ready-badge"}>{missing.length ? `${missing.length} missing` : "✓ Complete"}</span>
            : <span className="muted">{pct}%</span>}
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {!cart.donePulling ? (
        <>
          {groups.map((g) => (
            <div className="card section-card" key={g.area || "none"}>
              <div className="card-head">
                <h2>📍 {g.area || "No location set"}</h2>
                <span className="pill">{g.rows.filter((r) => cart.pulls[r.item.id]).length}/{g.rows.length}</span>
              </div>
              <ul className="check-list">
                {g.rows.map(({ item, sectionIcon }) => {
                  const rec = cart.pulls[item.id];
                  return (
                    <li key={item.id} className={rec ? "done" : ""}>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={!!rec}
                          onChange={() => { tapLight(); toggleCartPull(cart.id, item.id, me); }}
                        />
                        <span className="check-main">
                          <span className="check-line">
                            <span className="check-name">{sectionIcon} {item.name}</span>
                            {item.detail && <span className="item-detail">{item.detail}</span>}
                          </span>
                          {rec && <span className="pulled-by">pulled · {rec.by} {timeShort(rec.at)}</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={() => { tapMedium(); finishCartPull(cart.id, me); }}
            >
              I’m done pulling {pulled < total ? `(${total - pulled} left → missing list)` : "— cart complete"}
            </button>
          </div>
        </>
      ) : (
        <DoneView cart={cart} me={me} onResume={() => resumeCartPull(cart.id)} />
      )}
    </div>
  );
}

// After "done": the missing list with comments and resolve, or a clean bill.
function DoneView({ cart, me, onResume }: { cart: CaseCart; me: string; onResume: () => void }) {
  const { setMissingComment, resolveMissing, unresolveMissing } = useStore();
  const open = openMissing(cart);
  const resolved = cart.missing.filter((m) => m.resolvedAt);

  return (
    <>
      <div className="card form-card">
        <div className="card-head">
          <h2>{open.length ? `⚠️ Missing (${open.length})` : "✓ Nothing missing"}</h2>
          <span className="muted small">done by {cart.doneBy}</span>
        </div>
        {open.length === 0 && resolved.length === 0 && (
          <p className="muted small">Everything on the card made it into the cart. Nice.</p>
        )}
        {open.map((m) => (
          <MissingRow
            key={m.itemId}
            entry={m}
            onComment={(v) => setMissingComment(cart.id, m.itemId, v)}
            onResolve={() => { tapLight(); resolveMissing(cart.id, m.itemId, me); }}
          />
        ))}
        {resolved.length > 0 && (
          <div className="resolved-block">
            <span className="muted small">Resolved — now in the cart:</span>
            {resolved.map((m) => (
              <div key={m.itemId} className="resolved-row">
                <span className="resolved-name">✓ {m.name}</span>
                <span className="muted small">by {m.resolvedBy}</span>
                <button className="link small" onClick={() => unresolveMissing(cart.id, m.itemId)}>undo</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button className="btn" onClick={onResume}>← Resume pulling</button>
        <Link className="btn" to="/carts/missing">Day’s missing list (ops) →</Link>
      </div>
    </>
  );
}

export function MissingRow({
  entry,
  onComment,
  onResolve,
}: {
  entry: MissingEntry;
  onComment: (v: string) => void;
  onResolve: () => void;
}) {
  const [draft, setDraft] = useState(entry.comment ?? "");
  return (
    <div className="missing-row">
      <div className="missing-main">
        <span className="missing-name">{entry.name}{entry.detail && <span className="item-detail"> {entry.detail}</span>}</span>
        <span className="muted small">{entry.sectionLabel}</span>
      </div>
      <input
        className="missing-comment"
        placeholder="Comment — waiting on rep, in SPD, ETA, alternative pulled…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() !== (entry.comment ?? "") && onComment(draft)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <div className="missing-actions">
        <span className="chips chips-tight">
          {COMMENT_PRESETS.map((p) => (
            <button key={p} className="chip chip-sm" onClick={() => { setDraft(p); onComment(p); }}>{p}</button>
          ))}
        </span>
        <button className="btn btn-sm btn-primary" onClick={onResolve} title="The item made it into the cart">
          ✓ In the cart
        </button>
      </div>
    </div>
  );
}
