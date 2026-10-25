import { useState } from "react";
import { useAuth } from "../state/auth";
import { usePermissions } from "../lib/permissions";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useStore,
  surgeonOf,
  facilityOf,
  dayNotesFor,
  locationLabelOf,
  groupByArea,
  cartProgress,
  cartsOn,
  cartDisplayName,
  openMissing,
  getPullerName,
  setPullerName,
} from "../state/store";
import { cardPdfBlob, cardPdfFilename } from "../lib/cardPdf";
import { cartLink } from "../lib/links";
import { accentStyle } from "../lib/accent";
import { stampLine } from "../lib/user";
import { ConsiderationsBanner } from "../components/Considerations";
import { cartVerificationBlob, verificationFilename } from "../lib/qcPdf";
import { shareBlobFile } from "../lib/share";
import { tapLight, tapMedium } from "../lib/haptics";
import { SECTIONS, type CaseCart, type MissingEntry, type PrefCard } from "../types";

const COMMENT_PRESETS = [
  "Waiting on rep delivery",
  "In SPD being prepared",
  "On order",
  "Backordered, sub approved",
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
  const { state, toggleCartPull, finishCartPull, resumeCartPull, deleteCart, flagCartItemMissing, unflagCartItemMissing } = store;
  const [puller, setPuller] = useState(getPullerName());
  const [editingName, setEditingName] = useState(!getPullerName());
  const [confirmDel, setConfirmDel] = useState(false);

  const cart = state.carts.find((c) => c.id === id);
  const card = cart ? state.cards.find((c) => c.id === cart.cardId) : undefined;
  if (!cart || !card) {
    return (
      <div className="page">
        <div className="empty-state">
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
          {cart.note && <p className="cart-note">Note: {cart.note}</p>}
        </div>
      </div>

      <ConsiderationsBanner card={card} date={cart.date} />

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
            . Your name is stamped on each item so co-pullers don’t double-pull.
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

      {/* A paper copy for the cart: the card as a PDF whose QR code opens
          this exact cart live, so the printout never goes stale. */}
      {!cart.donePulling && (
        <div className="form-actions" style={{ marginBottom: 4 }}>
          <CartCardPdfButton cart={cart} card={card} />
        </div>
      )}

      {!cart.donePulling ? (
        <>
          {groups.map((g) => (
            <div className="card section-card" key={g.area || "none"}>
              <div className="card-head">
                <h2>{g.area || "No location set"}</h2>
                <span className="pill">{g.rows.filter((r) => cart.pulls[r.item.id]).length}/{g.rows.length}</span>
              </div>
              <ul className="check-list">
                {g.rows.map(({ item }) => {
                  const rec = cart.pulls[item.id];
                  const flagged = cart.missing.some((m) => m.itemId === item.id && !m.resolvedAt);
                  return (
                    <li key={item.id} className={rec ? "done" : ""}>
                      <div className="check-row-wrap">
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={!!rec}
                            onChange={() => { tapLight(); toggleCartPull(cart.id, item.id, me); }}
                          />
                          <span className="check-main">
                            <span className="check-line">
                              <span className="check-name">{(item.qty ?? 1) > 1 && <span className="qty-chip">{item.qty}×</span>}{item.name}</span>
                              {item.detail && <span className="item-detail">{item.detail}</span>}
                              {item.hold && <span className="hold-chip" title="Pull it, keep it unopened unless asked">hold</span>}
                            </span>
                            {rec && <span className="pulled-by">pulled · {rec.by}{rec.byRole === "trainee" ? " (trainee)" : rec.byRole === "phase2" ? " (Phase II)" : ""} {timeShort(rec.at)}</span>}
                            {flagged && <span className="pulled-by neg">on the missing list</span>}
                          </span>
                        </label>
                        {!rec && (
                          flagged ? (
                            <button
                              className="flag-missing on"
                              title="Flagged missing. Tap to undo."
                              onClick={() => { tapLight(); unflagCartItemMissing(cart.id, item.id); }}
                            >
                              undo
                            </button>
                          ) : (
                            <button
                              className="flag-missing"
                              title="The cart doesn't have this; put it on the day's missing list now"
                              onClick={() => { tapLight(); flagCartItemMissing(cart.id, item.id); }}
                            >
                              missing?
                            </button>
                          )
                        )}
                      </div>
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
              I’m done pulling {pulled < total ? `(${total - pulled} left, they go on the missing list)` : "(cart complete)"}
            </button>
          </div>
        </>
      ) : (
        <DoneView cart={cart} card={card} me={me} onResume={() => resumeCartPull(cart.id)} />
      )}
    </div>
  );
}

// After "done": QC first (a second set of eyes verifies the cart), then the
// missing list with comments, turnovers, and resolve.
function DoneView({ cart, card, me, onResume }: { cart: CaseCart; card: PrefCard; me: string; onResume: () => void }) {
  const { state, setMissingComment, setMissingTurnover, setMissingFollowUp, resolveMissing, unresolveMissing } = useStore();
  const open = openMissing(cart);
  const resolved = cart.missing.filter((m) => m.resolvedAt);

  // Other carts on the same day: the turnover sources to pick from.
  const turnoverOptions = cartsOn(state, cart.date)
    .filter((c) => c.id !== cart.id)
    .map((c) => ({ id: c.id, label: cartDisplayName(state, c.id) }));

  return (
    <>
      <QcPanel cart={cart} card={card} me={me} />

      <div className="card form-card">
        <div className="card-head">
          <h2>{open.length ? `Missing (${open.length})` : "✓ Nothing missing"}</h2>
          <span className="muted small">done by {cart.doneBy}</span>
        </div>
        {open.length === 0 && resolved.length === 0 && (
          <p className="muted small">Everything on the card made it into the cart. Nice.</p>
        )}
        {open.map((m) => (
          <MissingRow
            key={m.itemId}
            entry={m}
            turnoverOptions={turnoverOptions}
            onTurnover={(fromId) => setMissingTurnover(cart.id, m.itemId, fromId)}
            onFollowUp={(patch) => setMissingFollowUp(cart.id, m.itemId, patch)}
            onComment={(v) => setMissingComment(cart.id, m.itemId, v)}
            onResolve={() => { tapLight(); resolveMissing(cart.id, m.itemId, me); }}
          />
        ))}
        {resolved.length > 0 && (
          <div className="resolved-block">
            <span className="muted small">Resolved and now in the cart:</span>
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
        <CartCardPdfButton cart={cart} card={card} />
        <VerificationPdfButton cart={cart} card={card} />
      </div>
    </>
  );
}

// The second-check pass: every pulled item gets a verify mark with the
// checker's name. Finishing unpulls anything unverified and sends it to the
// missing list, so the day's ops view updates automatically.
function QcPanel({ cart, card, me }: { cart: CaseCart; card: PrefCard; me: string }) {
  const { toggleCartQc, finishCartQc, reopenCartQc, qcConfirmMissing, qcResolveMissing } = useStore();
  const { user } = useAuth();
  const perms = usePermissions(user?.uid, user?.email);
  const [confirming, setConfirming] = useState(false);
  // QC is a second set of eyes from a tech or nurse. Trainees and Phase II
  // students pull; they don't sign off. And QC should know when they pulled.
  const traineePulls = [...new Set(Object.values(cart.pulls).filter((p) => p.byRole === "trainee" || p.byRole === "phase2").map((p) => p.by))];
  if (!perms.canQc) {
    return (
      <div className="card form-card">
        <div className="card-head"><h2>Quality check</h2></div>
        <p className="muted small">QC is signed off by a surgical technologist or nurse. Your pulls are marked with your name and position so they know to check them.</p>
      </div>
    );
  }

  const pulledItems = SECTIONS.flatMap((sec) =>
    card[sec.key].filter((it) => cart.pulls[it.id]).map((it) => ({ item: it, section: sec.label })),
  );
  const verified = pulledItems.filter(({ item }) => cart.qc?.[item.id]).length;
  const unverified = pulledItems.length - verified;
  // What the pullers flagged as absent: QC double-checks each one.
  const flaggedOpen = cart.missing.filter((m) => !m.resolvedAt);

  if (cart.qcDone) {
    return (
      <div className="card form-card qc-done">
        <div className="card-head">
          <h2>✓ QC complete</h2>
          <span className="muted small">
            by {cart.qcBy} · {timeShort(cart.qcDone)}
          </span>
        </div>
        <p className="muted small">
          Every item in this cart was verified by a second check.{" "}
          <button className="link small" onClick={() => reopenCartQc(cart.id)}>Reopen QC</button>
        </p>
      </div>
    );
  }

  return (
    <div className="card form-card">
      <div className="card-head">
        <h2>Quality control</h2>
        <span className="pill">{verified}/{pulledItems.length} verified</span>
      </div>
      <p className="muted small">
        Second set of eyes: confirm each item is actually in the cart. Your name goes on every
        check, and several people can split the list.
      </p>
      <ul className="check-list">
        {pulledItems.map(({ item, section }) => {
          const q = cart.qc?.[item.id];
          const p = cart.pulls[item.id];
          return (
            <li key={item.id} className={q ? "done" : ""}>
              <label className="check-row">
                <input type="checkbox" checked={!!q} onChange={() => { tapLight(); toggleCartQc(cart.id, item.id, me); }} />
                <span className="check-main">
                  <span className="check-line">
                    <span className="check-name">{(item.qty ?? 1) > 1 && <span className="qty-chip">{item.qty}×</span>}{item.name}</span>
                    {item.detail && <span className="item-detail">{item.detail}</span>}
                  </span>
                  <span className="row-sub">
                    {section} · pulled by {p.by}{p.byRole === "trainee" ? " (trainee)" : p.byRole === "phase2" ? " (Phase II)" : ""}{q ? ` · verified by ${q.by} ${timeShort(q.at)}` : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {flaggedOpen.length > 0 && (
        <div className="qc-flagged">
          <h3>Reported missing ({flaggedOpen.length})</h3>
          <p className="muted small">The pullers couldn't find these. Confirm each one: is it genuinely missing, or did it make it in?</p>
          {flaggedOpen.map((m) => (
            <div className="qc-flagged-row" key={m.itemId}>
              <span className="missing-name">
                {m.name}{m.detail && <span className="item-detail"> {m.detail}</span>}
                {m.qcCheckedAt && <span className="muted small"> · confirmed missing by {m.qcCheckedBy} {timeShort(m.qcCheckedAt)}</span>}
              </span>
              <span className="qc-flagged-actions">
                {!m.qcCheckedAt && (
                  <button className="btn btn-sm" onClick={() => { tapLight(); qcConfirmMissing(cart.id, m.itemId, me); }}>
                    Still missing
                  </button>
                )}
                <button className="btn btn-sm btn-primary" onClick={() => { tapLight(); qcResolveMissing(cart.id, m.itemId, me); }}>
                  It's in the cart
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {traineePulls.length > 0 && (
        <div className="demo-banner" style={{ margin: "0 0 10px" }}>
          <span><strong>Pulled in part by a trainee or Phase II student</strong> ({traineePulls.join(", ")}). Check those items carefully.</span>
        </div>
      )}
      {pulledItems.length === 0 ? (
        <p className="muted small">Nothing is marked pulled yet, so there's nothing to verify.</p>
      ) : confirming ? (
        <div className="confirm">
          {unverified > 0
            ? `${unverified} item${unverified === 1 ? " was" : "s were"} marked pulled but not verified. Finishing unpulls ${unverified === 1 ? "it" : "them"} and adds ${unverified === 1 ? "it" : "them"} to the missing list.`
            : "Everything verified. Sign off?"}
          <button className="btn btn-primary btn-sm" onClick={() => { tapMedium(); finishCartQc(cart.id, me); setConfirming(false); }}>
            Finish QC
          </button>
          <button className="btn btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      ) : (
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => setConfirming(true)}>
            Finish QC {unverified > 0 ? `(${unverified} not verified)` : "(all verified)"}
          </button>
        </div>
      )}
    </div>
  );
}

export function MissingRow({
  entry,
  onComment,
  onResolve,
  turnoverOptions,
  onTurnover,
  onFollowUp,
}: {
  entry: MissingEntry;
  onComment: (v: string) => void;
  onResolve: () => void;
  turnoverOptions?: { id: string; label: string }[];
  onTurnover?: (fromCartId: string | undefined) => void;
  onFollowUp?: (patch: Partial<Pick<MissingEntry, "supplyTracking" | "surgeonNotifiedAt" | "orderedAt" | "alternateItem">>) => void;
}) {
  const [draft, setDraft] = useState(entry.comment ?? "");
  // Only instrument sets and peel-packed instruments turn over between
  // cases; supplies and meds never do, so they don't get the picker.
  const canTurnover = entry.sectionLabel === "Instruments & trays";
  return (
    <div className="missing-row">
      <div className="missing-main">
        <span className="missing-name">{entry.name}{entry.detail && <span className="item-detail"> {entry.detail}</span>}</span>
        <span className="muted small">{entry.sectionLabel}</span>
        {entry.turnoverFromCartId && <span className="turnover-chip" title="Coming off another of today's cases">turnover</span>}
        {entry.qcCheckedAt && <span className="muted small">confirmed missing at QC · {entry.qcCheckedBy}</span>}
      </div>
      <input
        className="missing-comment"
        placeholder="Comment: waiting on rep, in SPD, ETA, alternative pulled…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() !== (entry.comment ?? "") && onComment(draft)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      {entry.comment && entry.commentBy && (
        <span className="muted small">{stampLine(entry.commentBy, entry.commentAt)}</span>
      )}
      <div className="missing-actions">
        <span className="chips chips-tight">
          {COMMENT_PRESETS.map((p) => (
            <button key={p} className="chip chip-sm" onClick={() => { setDraft(p); onComment(p); }}>{p}</button>
          ))}
        </span>
        {canTurnover && onTurnover && turnoverOptions && turnoverOptions.length > 0 && (
          <select
            className="loc-select"
            value={entry.turnoverFromCartId ?? ""}
            onChange={(e) => onTurnover(e.target.value || undefined)}
            title="This item comes off another of today's cases"
          >
            <option value="">Turnover from…</option>
            {turnoverOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        )}
        <button className="btn btn-sm btn-primary" onClick={onResolve} title="The item made it into the cart">
          ✓ In the cart
        </button>
      </div>
      {onFollowUp && (
        <details className="followup">
          <summary>
            Follow-up
            {entry.supplyTracking && <span className="turnover-chip">supply tracking</span>}
            {entry.surgeonNotifiedAt && <span className="turnover-chip">surgeon notified</span>}
            {entry.orderedAt && <span className="turnover-chip">ordered</span>}
            {entry.alternateItem && <span className="turnover-chip">alternate chosen</span>}
          </summary>
          <div className="followup-grid">
            <label className="followup-check">
              <input
                type="checkbox"
                checked={!!entry.supplyTracking}
                onChange={(e) => onFollowUp({ supplyTracking: e.target.checked || undefined })}
              />
              Supply chain is tracking it
            </label>
            <label>
              <span>Surgeon notified</span>
              <input
                type="date"
                value={entry.surgeonNotifiedAt ?? ""}
                onChange={(e) => onFollowUp({ surgeonNotifiedAt: e.target.value || undefined })}
              />
            </label>
            <label>
              <span>Ordered</span>
              <input
                type="date"
                value={entry.orderedAt ?? ""}
                onChange={(e) => onFollowUp({ orderedAt: e.target.value || undefined })}
              />
            </label>
            <label className="followup-wide">
              <span>Not obtained: alternate the surgeon chose</span>
              <input
                defaultValue={entry.alternateItem ?? ""}
                placeholder="e.g. 0 Vicryl instead of 0 PDS"
                onBlur={(e) => onFollowUp({ alternateItem: e.target.value.trim() || undefined })}
              />
            </label>
          </div>
        </details>
      )}
    </div>
  );
}

// One tap replaces the paper sheet: the filled-in Case Pull Verification,
// ready to AirDrop or print. The data behind it clears after the day.
// The paper copy for the cart itself: the preference card as a PDF with a QR
// code up top that opens THIS cart (this card, this case, this day) live, so
// the old-school printout and the digital record never drift apart.
function CartCardPdfButton({ cart, card }: { cart: CaseCart; card: PrefCard }) {
  const { state } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function share() {
    setBusy(true);
    setErr(null);
    try {
      const notes = dayNotesFor(state, card.id, cart.date).map((n) => n.text);
      const blob = await cardPdfBlob(
        card,
        surgeonOf(state, card.surgeonId),
        facilityOf(state, card.facilityId),
        (locId) => locationLabelOf(state, locId),
        notes,
        { url: cartLink(cart.id), label: "Scan for this case's live cart: pulls, missing items, updates" },
      );
      await shareBlobFile(
        cardPdfFilename(card.procedure),
        blob,
        `Preference card: ${card.procedure}${surgeonOf(state, card.surgeonId) ? ` · ${surgeonOf(state, card.surgeonId)!.name}` : ""} (print for the cart; scan the code for live updates)`,
        "application/pdf",
      );
    } catch {
      setErr("Couldn't build the PDF. Try again.");
      setTimeout(() => setErr(null), 4000);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="btn" disabled={busy} onClick={share}>
        {busy ? "Building…" : "Print card"}
      </button>
      {err && <span className="neg small">{err}</span>}
    </>
  );
}

function VerificationPdfButton({ cart, card }: { cart: CaseCart; card: PrefCard }) {
  const { state } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function share() {
    setBusy(true);
    setErr(null);
    try {
      const blob = await cartVerificationBlob(card, cart, surgeonOf(state, card.surgeonId));
      await shareBlobFile(
        verificationFilename(card.procedure, cart.date),
        blob,
        `Case Pull Verification: ${card.procedure}`,
        "application/pdf",
      );
    } catch {
      setErr("Couldn't build the PDF. Try again.");
      setTimeout(() => setErr(null), 4000);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="btn" disabled={busy} onClick={share}>
        {busy ? "Building…" : "Verification PDF"}
      </button>
      {err && <span className="neg small">{err}</span>}
    </>
  );
}
