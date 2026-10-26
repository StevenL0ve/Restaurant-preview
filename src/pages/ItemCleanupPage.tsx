import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { NavIcon } from "../components/NavIcon";
import { useStore } from "../state/store";
import { useAuth } from "../state/auth";
import { usePermissions } from "../lib/permissions";
import { findDuplicates, type DuplicateGroup } from "../lib/itemCleanup";

// Find the same item spelled different ways across the library (or sharing a
// REF number) and merge them under one standard name.
const DISMISSED_KEY = "orsync.cleanup.dismissed.v1";
function loadDismissed(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]")); } catch { return new Set(); }
}

export function ItemCleanupPage() {
  const { state } = useStore();
  const { user } = useAuth();
  const perms = usePermissions(user?.uid, user?.email);
  const [dismissed, setDismissed] = useState(loadDismissed);
  const [done, setDone] = useState<string | null>(null);
  const groups = useMemo(() => findDuplicates(state.cards).filter((g) => !dismissed.has(g.key)), [state.cards, dismissed]);

  function dismiss(key: string) {
    const next = new Set(dismissed);
    next.add(key);
    setDismissed(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch { /* private mode */ }
  }

  return (
    <div className="page page-narrow">
      <div className="detail-top"><Link className="link" to="/cards">← Cards</Link></div>
      <h1 className="page-title"><NavIcon name="cards" size={40} />Clean up items</h1>
      <p className="muted">
        The same item spelled different ways across your cards (or sharing a REF number). Pick the standard
        name and merge: every card updates, and the familiar name can stay beside it so nobody's lost.
      </p>
      {done && <p className="pos small">{done}</p>}
      {!perms.canEditCards && <p className="muted small">Your position can view these but not merge them.</p>}
      {groups.length === 0 ? (
        <div className="card form-card"><p>No duplicates found. Your item names are consistent.</p></div>
      ) : (
        groups.map((g) => (
          <CleanupGroup key={g.key} group={g} canEdit={perms.canEditCards} onDismiss={() => dismiss(g.key)} onDone={setDone} />
        ))
      )}
    </div>
  );
}

function CleanupGroup({ group, canEdit, onDismiss, onDone }: {
  group: DuplicateGroup;
  canEdit: boolean;
  onDismiss: () => void;
  onDone: (msg: string) => void;
}) {
  const { mergeItemNames } = useStore();
  const [pick, setPick] = useState(group.variants[0].name);
  const [custom, setCustom] = useState("");
  const [keepAlias, setKeepAlias] = useState(true);
  const standard = (pick === "__custom" ? custom : pick).trim();
  const ref = group.variants.flatMap((v) => v.refs)[0];
  const cardCount = group.variants.reduce((n, v) => n + v.cards, 0);

  function merge() {
    const n = mergeItemNames(group.variants.map((v) => v.name), standard, keepAlias, ref);
    onDone(`Merged into “${standard}” on ${n} ${n === 1 ? "card" : "cards"}.`);
  }

  return (
    <div className="card form-card cleanup-group">
      <div className="card-head">
        <h2>{group.variants[0].name}</h2>
        <span className="pill">{group.reason === "ref" ? `Same REF ${ref ?? ""}` : "Spelling"}</span>
      </div>
      <p className="muted small">{group.total} items on {cardCount} cards. Pick the standard name:</p>
      <div className="cleanup-variants">
        {group.variants.map((v) => (
          <label key={v.name} className={"pos-check" + (pick === v.name ? " on" : "")}>
            <input type="radio" name={group.key} checked={pick === v.name} onChange={() => setPick(v.name)} disabled={!canEdit} />
            <span>{v.name} <span className="muted">· {v.count}{v.refs.length ? ` · REF ${v.refs.join(", ")}` : ""}</span></span>
          </label>
        ))}
        <label className={"pos-check" + (pick === "__custom" ? " on" : "")}>
          <input type="radio" name={group.key} checked={pick === "__custom"} onChange={() => setPick("__custom")} disabled={!canEdit} />
          <span>Another name</span>
        </label>
        {pick === "__custom" && (
          <input className="cleanup-custom" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Standard name" autoFocus />
        )}
      </div>
      <label className="toggle-row">
        <span>Keep the old names as nicknames beside it</span>
        <input type="checkbox" checked={keepAlias} onChange={(e) => setKeepAlias(e.target.checked)} disabled={!canEdit} />
      </label>
      <div className="form-actions">
        {canEdit && <button className="btn btn-primary" disabled={!standard} onClick={merge}>Merge</button>}
        <button className="btn" onClick={onDismiss}>Not the same item</button>
      </div>
    </div>
  );
}
