import { useState } from "react";
import { useStore } from "../state/store";

// Shared packing / exchange checklist — "never forget the teddy bear."
export function Packing() {
  const { state, addPackingItem, togglePacked, deletePackingItem, clearPacked } = useStore();
  const [label, setLabel] = useState("");

  const items = state.packing;
  const remaining = items.filter((i) => !i.packed).length;
  const packedCount = items.length - remaining;

  function add() {
    if (!label.trim()) return;
    addPackingItem(label);
    setLabel("");
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Packing list</h1>
          <p className="muted">
            What needs to travel with the kids at the next exchange. Check items
            off as they're packed — shared so nothing gets left behind.
          </p>
        </div>
        {packedCount > 0 && (
          <button className="btn" onClick={clearPacked}>Clear packed ({packedCount})</button>
        )}
      </div>

      <div className="card form-card">
        <div className="composer-row">
          <input
            className="assistant-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add an item — e.g. Ava's stuffed rabbit"
            aria-label="New packing item"
          />
          <button className="btn btn-primary" onClick={add} disabled={!label.trim()}>Add</button>
        </div>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">🧸</span>
            <p>Nothing on the list. Add what needs to go to the other home.</p>
          </div>
        ) : (
          <ul className="pack-list">
            {items.map((i) => (
              <li key={i.id} className={"pack-item" + (i.packed ? " done" : "")}>
                <label className="pack-check">
                  <input type="checkbox" checked={i.packed} onChange={() => togglePacked(i.id)} />
                  <span>{i.label}</span>
                </label>
                <button className="link danger" onClick={() => deletePackingItem(i.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <p className="muted small pack-foot">
            {remaining === 0 ? "All packed — you're set. ✅" : `${remaining} item${remaining === 1 ? "" : "s"} still to pack.`}
          </p>
        )}
      </div>
    </div>
  );
}
