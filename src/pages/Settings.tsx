import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../state/store";
import { useAuth } from "../state/auth";
import { APP_VERSION } from "../version";

export function Settings() {
  const { state, exportAll, importCards, importCsv, downloadCsvTemplate, resetDemo, wipeAll } = useStore();
  const { user, signOut, bioAvailable, bioEnabled, setBioEnabled } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const added = importCards(String(reader.result));
        setMsg(`Imported ${added} ${added === 1 ? "card" : "cards"} into your library.`);
      } catch {
        setMsg("That file didn’t look like a CaseReady card file.");
      }
      setTimeout(() => setMsg(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function onCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const added = importCsv(String(reader.result));
        setMsg(`Imported ${added} ${added === 1 ? "card" : "cards"} from the spreadsheet.`);
      } catch (err) {
        const m = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Couldn’t read that CSV.";
        setMsg(m);
      }
      setTimeout(() => setMsg(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="page page-narrow">
      <div className="page-head"><h1>Settings</h1></div>

      <div className="card settings-card">
        <h2>Account</h2>
        {user?.guest ? (
          <p>You’re using CaseReady <strong>without an account</strong> — everything is saved on this device. Create an account anytime to add a Face&nbsp;ID lock.</p>
        ) : (
          <p>Signed in as <strong>{user?.name}</strong> ({user?.email}).</p>
        )}
        {bioAvailable && !user?.guest && (
          <div className="toggle-row">
            <span>Require Face ID to open</span>
            <input type="checkbox" checked={bioEnabled} onChange={(e) => setBioEnabled(e.target.checked)} />
          </div>
        )}
        <div className="form-actions">
          <button className="btn" onClick={signOut}>{user?.guest ? "Switch / create account" : "Sign out"}</button>
        </div>
      </div>

      <div className="card settings-card">
        <h2>Facilities & locations</h2>
        <p>
          Manage your per-hospital location sets (carts, cabinets, rooms). Edit a location once and it
          updates on every card that uses it.
        </p>
        <Link className="btn" to="/facilities">Manage facilities & locations →</Link>
      </div>

      <div className="card settings-card">
        <h2>Your data</h2>
        <p>
          Your whole library lives on this device. Export it to back it up or move to a new phone, and
          <strong> import cards a colleague shared</strong> — they merge into your library as your own
          editable copies (surgeons, facilities, and locations are matched by name, never duplicated).
        </p>
        <ul className="data-counts">
          <li><strong>{state.cards.length}</strong> cards</li>
          <li><strong>{state.surgeons.length}</strong> surgeons</li>
          <li><strong>{state.locations.length}</strong> locations</li>
        </ul>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={exportAll}>Export library</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import cards…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
          <button className="btn" onClick={resetDemo}>Reset demo data</button>
        </div>
        {msg && <p className="muted small" style={{ marginTop: 10 }}>{msg}</p>}
      </div>

      <div className="card settings-card">
        <h2>Bulk import from a spreadsheet</h2>
        <p>
          Already have preference cards in Genesis, SIS / S3, or Excel? Export them to CSV and import
          here — one row per item (Facility, Surgeon, Procedure, Section, Item, Detail, Area, Spot).
          Surgeons, facilities, and locations are created automatically and matched by name.
        </p>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => csvRef.current?.click()}>Import CSV…</button>
          <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={onCsvFile} />
          <button className="btn" onClick={downloadCsvTemplate}>Download template</button>
        </div>
      </div>

      <div className="card settings-card danger-zone">
        <h2>Wipe everything</h2>
        <p>Remove all surgeons and cards from this device. This can’t be undone — export first.</p>
        {confirmWipe ? (
          <div className="confirm">
            Delete all your data?
            <button className="btn btn-danger btn-sm" onClick={() => { wipeAll(); setConfirmWipe(false); }}>Wipe</button>
            <button className="btn btn-sm" onClick={() => setConfirmWipe(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmWipe(true)}>Wipe all data</button>
        )}
      </div>

      <div className="card settings-card">
        <h2>About</h2>
        <p>
          CaseReady is a personal surgical preference-card library for scrub techs and circulating
          nurses — including travelers who move between facilities. It’s the tool the old apps wouldn’t
          let you use for yourself.
        </p>
        <p className="muted small">CaseReady v{APP_VERSION}</p>
      </div>
    </div>
  );
}
