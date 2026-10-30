import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, getRepMode, setRepMode } from "../state/store";
import { parseStaffList } from "../lib/staffImport";
import { TEAM_ROLES, teamMemberLabel } from "../types";
import { cloudEnabled, getCloudStatus, onCloudStatus, type CloudStatus } from "../lib/cloud";
import {
  facilityId, forgetFacility, getFacilities, getFacilityNotice, getWorkspace, onWorkspaceChange,
  setFacilityNotice, setWorkspace, type JoinedWorkspace, type MemberRole,
} from "../lib/workspace";
import { checkPendingFacilities, facilityInfo, myMembership, workspaceMemberCount } from "../state/cloudSync";
import { FacilityAdmin } from "../components/FacilityAdmin";
import { isOrsyncOwner } from "../lib/owner";
import { RekeyReminder } from "../components/RekeyReminder";
import { AccountSecurity } from "../components/AccountSecurity";
import { SettingsProfileHeader } from "../components/SettingsProfileHeader";
import { HelpContactCard } from "../components/HelpContact";
import { LocalAccountUpgrade } from "../components/LocalAccountUpgrade";
import { FacilityJoinForm } from "../components/FacilityJoin";
import { ProfileForm } from "../components/ProfileForm";
import { roleLabel, useProfile } from "../lib/profile";
import { formatPhone } from "../lib/oncall";
import { useAuth } from "../state/auth";
import { APP_VERSION } from "../version";
import { BETA_UNLOCKED, hasPersonalCloud, hasPro } from "../lib/tier";
import { WEB_APP_LABEL, WEB_APP_URL } from "../lib/links";

// ORSync Cloud status: where the library primarily lives once an account is
// signed in, with live updates across devices.
function CloudCard({ guest, signedIn }: { guest: boolean; signedIn: boolean }) {
  const [status, setStatus] = useState<CloudStatus>(getCloudStatus());
  useEffect(() => onCloudStatus(setStatus), []);
  const [joinedFacility, setJoinedFacility] = useState(getWorkspace());
  useEffect(() => onWorkspaceChange(() => setJoinedFacility(getWorkspace())), []);

  return (
    <div className="card settings-card">
      <h2>ORSync Cloud</h2>
      {!cloudEnabled() ? (
        <p className="muted">
          Cloud sync is built and ships as soon as the project keys are connected. Until then your
          library saves on this device, and Export / Import moves it between devices.
        </p>
      ) : guest || !signedIn ? (
        <p>
          You're using ORSync without an account, so everything stays on this device.{" "}
          <strong>Create an account</strong> (Settings → Account → Switch) to join your facility and
          put your name on what you pull. Your cards still stay on this phone.
        </p>
      ) : !joinedFacility && !hasPersonalCloud() ? (
        <p>
          Your library is <strong>on this phone</strong>. Join your facility and its shared library
          syncs live to every member under the facility's package. Want your own cards backed up and
          on every device too? That's <Link to="/upgrade">Pro</Link>.
        </p>
      ) : (
        <>
          <p>
            {joinedFacility
              ? <>Synced with <strong>{joinedFacility.name}</strong>: the shared library updates live on every member's device, and this phone keeps its own copy. It works fully offline; changes sync when you're back online.</>
              : <>Your library lives in <strong>ORSync Cloud</strong> (Pro) and updates live on every device you're signed in to. It still works fully offline; changes sync when you're back online.</>}
          </p>
          <p className="muted small">
            {status.state === "live" && `Live. Last synced ${new Date(status.lastSyncAt).toLocaleTimeString()}.`}
            {status.state === "connecting" && "Connecting…"}
            {status.state === "error" && `Sync issue: ${status.message} (your data is safe on this device; it retries automatically.)`}
            {status.state === "signed-out" && "Waiting for sign-in."}
          </p>
          <p className="muted small">Tray layer photos stay on the device that took them for now.</p>
        </>
      )}
    </div>
  );
}

function importMessage(added: number, skipped: number, source: string, carts = 0, loaners = 0, loanerOutcome?: string): string {
  if (loaners > 0) {
    return loanerOutcome === "merged"
      ? "Loaner update received. The request's sets, statuses, and rep info are refreshed on the Loaners tab."
      : "Loaner request imported. It's waiting on the Loaners tab.";
  }
  const cards = (n: number) => `${n} ${n === 1 ? "card" : "cards"}`;
  const cartNote = carts > 0 ? ` Set up ${carts} case cart${carts === 1 ? "" : "s"}. See the Carts tab.` : "";
  if (added === 0 && skipped > 0) return `Already had all of it. Skipped ${cards(skipped)} you already have.${cartNote}`;
  const base = `Imported ${cards(added)} from ${source}.`;
  return (skipped > 0 ? `${base} Skipped ${cards(skipped)} you already had.` : base) + cartNote;
}

export function Settings() {
  const { state, exportAll, importCards, importCsv, downloadCsvTemplate, resetDemo, wipeAll, removeExampleData } = useStore();
  const { user, signOut, bioAvailable, bioLabel, bioEnabled, setBioEnabled } = useAuth();
  const [bioMsg, setBioMsg] = useState<string | null>(null);
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
        const { added, skipped, carts, loaners, loanerOutcome } = importCards(String(reader.result));
        setMsg(importMessage(added, skipped, "your library", carts, loaners, loanerOutcome));
      } catch {
        setMsg("That file didn’t look like an ORSync card file.");
      }
      setTimeout(() => setMsg(null), 3500);
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
        const { added, skipped } = importCsv(String(reader.result));
        setMsg(importMessage(added, skipped, "the spreadsheet"));
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
      <SettingsProfileHeader />

      <div className="card settings-card">
        <h2>Account</h2>
        {user?.guest ? (
          <p>You’re using ORSync <strong>without an account</strong>. Everything is saved on this device. Create an account anytime to sync it across your devices.</p>
        ) : (
          <p>Signed in as <strong>{user?.name}</strong> ({user?.email}).</p>
        )}
        <LocalAccountUpgrade />
        {user?.uid && <AccountProfile uid={user.uid} email={user.email} fallbackName={user.name} />}
        {user?.uid && <AccountSecurity email={user.email} />}
        {bioAvailable ? (
          <>
            <label className="toggle-row">
              <span>Lock ORSync with {bioLabel}</span>
              <input
                type="checkbox"
                checked={bioEnabled}
                onChange={async (e) => {
                  const want = e.target.checked;
                  setBioMsg(null);
                  const on = await setBioEnabled(want);
                  if (want && !on) setBioMsg(`${bioLabel} didn't confirm, so the lock stayed off. Try again.`);
                }}
              />
            </label>
            <p className="muted small" style={{ margin: "4px 0 0" }}>
              {bioEnabled
                ? `ORSync asks for ${bioLabel} when it opens and after a minute in the background. Your device passcode always works as a backup.`
                : `Asks for ${bioLabel} when ORSync opens, so only you can see your cards.`}
            </p>
            {bioMsg && <p className="neg small" style={{ margin: "4px 0 0" }}>{bioMsg}</p>}
          </>
        ) : (
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Face ID and fingerprint lock are available in the iPhone and Android apps.
          </p>
        )}
        <div className="form-actions">
          <button className="btn" onClick={signOut}>{user?.guest ? "Switch / create account" : "Sign out"}</button>
        </div>
      </div>

      <CloudCard guest={!!user?.guest} signedIn={!!user?.uid} />

      {cloudEnabled() && user?.uid && (
        <FacilityCard uid={user.uid} userName={user.name} email={user.email} />
      )}
      {cloudEnabled() && user?.uid && isOrsyncOwner(user.email) && <OwnerConsole uid={user.uid} />}

      <div className="card settings-card">
        <h2>Plan</h2>
        <p>
          {hasPersonalCloud() ? (
            <>You're on <strong>ORSync Pro</strong>: your library in the cloud, on every device.</>
          ) : BETA_UNLOCKED ? (
            <>You're on the <strong>free plan</strong>, with beta limits lifted. Your cards stay on this phone; a facility's package covers its shared library.</>
          ) : hasPro() ? (
            <>You're on <strong>ORSync Pro</strong>.</>
          ) : (
            <>You're on the <strong>free plan</strong>: cards on this phone, 10 cards, 1 facility.</>
          )}
        </p>
        <Link className="btn" to="/upgrade">See plans →</Link>
      </div>

      <HelpContactCard />

      <div className="card settings-card">
        <h2>Vendor rep mode</h2>
        <p>
          For device and implant reps: the Loaner trays screen regroups to <strong>your sets by
          facility</strong>, and sharing a request sends your update (sets, layer photos, ETA,
          statuses) back to the clinic. When a clinic sends you a request file, just open it and
          ORSync imports it.
        </p>
        <div className="toggle-row">
          <span>I'm a vendor rep</span>
          <input
            type="checkbox"
            defaultChecked={getRepMode()}
            onChange={(e) => { setRepMode(e.target.checked); setMsg(e.target.checked ? "Rep mode on. Check the Loaner trays tab." : "Rep mode off."); setTimeout(() => setMsg(null), 3000); }}
          />
        </div>
        <Link className="btn" to="/loaners/storage">Storage sites & stock counts →</Link>
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
          <strong> import cards a colleague shared</strong>. They merge into your library as your own
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
          <input ref={fileRef} type="file" accept="application/json,.json,.orsync" hidden onChange={onImportFile} />
          <button className="btn" onClick={() => {
            const n = removeExampleData();
            setMsg(n ? `Removed ${n} example item${n === 1 ? "" : "s"}. Everything you made is still here.` : "No example data left to remove.");
            setTimeout(() => setMsg(null), 4000);
          }}>Remove example data</button>
          {!(cloudEnabled() && user?.uid) && (
            <button className="btn" onClick={resetDemo}>Reset demo data</button>
          )}
        </div>
        {msg && <p className="muted small" style={{ marginTop: 10 }}>{msg}</p>}
      </div>

      <div className="card settings-card">
        <h2>ORSync on your computer</h2>
        <p>
          ORSync is also a website. Open it in any browser to <strong>create, edit, and print</strong>
          {" "}cards with a real keyboard:
        </p>
        <p>
          <a className="link" href={`${WEB_APP_URL}/`} target="_blank" rel="noreferrer">
            {WEB_APP_LABEL}
          </a>
        </p>
        <p className="muted small">
          Your library lives on each device. To move it: <strong>Export library</strong> here, send the
          file to yourself, and import it on the computer (and back again after big edits).
        </p>
      </div>

      <div className="card settings-card">
        <h2>Bulk import from a spreadsheet</h2>
        <p>
          Already have preference cards in Genesis, SIS / S3, or Excel? Export them to CSV and import
          here, one row per item (Facility, Surgeon, Procedure, Section, Item, Detail, Area, Spot).
          Surgeons, facilities, and locations are created automatically and matched by name.
        </p>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => csvRef.current?.click()}>Import CSV…</button>
          <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={onCsvFile} />
          <button className="btn" onClick={downloadCsvTemplate}>Download template</button>
        </div>
      </div>

      <StaffRosterCard />

      <div className="card settings-card danger-zone">
        <h2>Wipe everything</h2>
        <p>
          Remove all surgeons and cards. This can’t be undone, so export first.
          {cloudEnabled() && user?.uid && (
            <> You’re signed in to ORSync Cloud, so this wipes your <strong>cloud library and every
            signed-in device</strong>, not just this one.</>
          )}
        </p>
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
          ORSync is a personal surgical preference-card library for scrub techs and circulating
          nurses, including travelers who move between facilities. It’s the tool the old apps wouldn’t
          let you use for yourself.
        </p>
        <p className="muted small">ORSync v{APP_VERSION}</p>
      </div>
    </div>
  );
}

// The staff roster behind room-team autocomplete: see who's known, paste or
// upload a whole list at once ("Name, role" per line), prune old names.
function StaffRosterCard() {
  const { state, importStaff, deleteStaff } = useStore();
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function runImport(raw: string) {
    const { members, errors } = parseStaffList(raw);
    const added = members.length ? importStaff(members) : 0;
    const bits = [
      added > 0 ? `${added} added` : null,
      members.length - added > 0 ? `${members.length - added} already known` : null,
      ...errors.slice(0, 3),
    ].filter(Boolean);
    setResult(bits.join(" · ") || "Nothing imported.");
    if (added > 0) setText("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) runImport(await f.text());
  }

  const roster = [...state.staff].sort((a, b) => a.name.localeCompare(b.name));
  const shown = showAll ? roster : roster.slice(0, 8);

  return (
    <div className="card settings-card">
      <h2>Staff roster</h2>
      <p>
        Names you can pick when building a case's room team. Anyone typed into a team is added
        automatically; paste or upload a whole roster here, one person per line:{" "}
        <code>Kim Park, nurse</code> · <code>Lee, trainee 2</code> · <code>Dr. Osei, anesthesia</code>.
        Roles: {TEAM_ROLES.map((r) => r.label).join(", ")} (RN, CST, scrub, MD work too).
      </p>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Kim Park, nurse\nMarcus Cole, tech\nJalen Lee, trainee 2"}
      />
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!text.trim()} onClick={() => runImport(text)}>Import pasted list</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Import file…</button>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={onFile} />
      </div>
      {result && <p className="muted small">{result}</p>}
      {roster.length > 0 && (
        <>
          <p className="muted small" style={{ marginBottom: 6 }}>{roster.length} on the roster:</p>
          <div className="team-chips">
            {shown.map((m) => (
              <span key={m.id} className="team-chip">
                {teamMemberLabel(m)}
                <button className="chip-del" aria-label={`Remove ${m.name}`} onClick={() => deleteStaff(m.id)}>✕</button>
              </span>
            ))}
            {roster.length > 8 && (
              <button className="link small" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "show fewer" : `show all ${roster.length}`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}


// One shared library per hospital OR. Everyone signs in with their own
// account (so changes carry their name), then joins the facility once per
// device with the facility's name and password. From then on cards, carts,
// pull status, QC, schedules, teams, and notes are one set for the whole OR.
function FacilityCard({ uid, userName, email }: { uid: string; userName: string; email: string }) {
  const [joined, setJoined] = useState(getWorkspace());
  const [others, setOthers] = useState<JoinedWorkspace[]>(() => getFacilities().filter((f) => f.id !== getWorkspace()?.id && !f.pending));
  const [pendingList, setPendingList] = useState<JoinedWorkspace[]>(() => getFacilities().filter((f) => f.pending));
  const [notice, setNotice] = useState(getFacilityNotice());
  const isOwner = isOrsyncOwner(email);
  useEffect(() => onWorkspaceChange(() => {
    const w = getWorkspace();
    setJoined(w);
    setOthers(getFacilities().filter((f) => f.id !== w?.id && !f.pending));
    setPendingList(getFacilities().filter((f) => f.pending));
    setNotice(getFacilityNotice());
  }), []);

  // Membership as the cloud sees it: member count for the blurb, and your
  // role (an admin promoted since you joined sees the admin tools).
  const [members, setMembers] = useState<number | null>(null);
  const [role, setRole] = useState<MemberRole | null>(joined?.role ?? null);
  useEffect(() => {
    if (!joined) { setMembers(null); setRole(null); return; }
    let on = true;
    setRole(joined.role ?? null);
    myMembership(joined.id, uid).then((m) => {
      if (!on || !m) return;
      setRole(m.role);
      if (m.role !== joined.role) setWorkspace({ ...joined, role: m.role });
    }).catch(() => undefined);
    workspaceMemberCount(joined.id).then((n) => { if (on) setMembers(n); }).catch(() => undefined);
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined?.id, uid]);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [adding, setAdding] = useState(false);

  const noticeBlock = notice && (
    <div className="auth-notice" style={{ alignItems: "flex-start", textAlign: "left", marginBottom: 10 }}>
      <span>{notice}</span>
      <button className="link small" type="button" onClick={() => setFacilityNotice(null)}>Dismiss</button>
    </div>
  );

  const [checking, setChecking] = useState(false);
  const pendingBlock = pendingList.length > 0 && (
    <div className="facility-others">
      <h4 className="facility-admin-sub">Waiting for approval</h4>
      {pendingList.map((f) => (
        <div key={f.id} className="member-row">
          <div className="member-main">
            <strong>{f.name}</strong>
            <div className="muted small">A facility admin has your request. ORSync stays your personal card app until they approve it.</div>
          </div>
          <div className="member-actions">
            <button className="btn btn-sm" disabled={checking} onClick={async () => { setChecking(true); try { await checkPendingFacilities(uid); } finally { setChecking(false); } }}>{checking ? "Checking…" : "Check now"}</button>
            <button className="btn btn-sm" onClick={() => forgetFacility(f.id)}>Withdraw</button>
          </div>
        </div>
      ))}
    </div>
  );

  const othersBlock = others.length > 0 && (
    <div className="facility-others">
      <h4 className="facility-admin-sub">{joined ? "Your other facilities" : "Facilities you've joined"}</h4>
      {others.map((f) => (
        <div key={f.id} className="member-row">
          <div className="member-main">
            <strong>{f.name}</strong>
            {f.role === "admin" && <span className="pill pill-brand">Admin</span>}
          </div>
          <div className="member-actions">
            <button className="btn btn-sm btn-primary" onClick={() => { setWorkspace(f); setConfirmLeave(false); setAdding(false); }}>Switch to</button>
            <button className="btn btn-sm" onClick={() => forgetFacility(f.id)}>Forget</button>
          </div>
        </div>
      ))}
      <p className="muted small" style={{ margin: "6px 0 0" }}>
        Switching changes what this device shows and syncs to. Each facility keeps its own library.
      </p>
    </div>
  );

  if (joined) {
    return (
      <div className="card settings-card">
        <h2>Facility</h2>
        {noticeBlock}
        <RekeyReminder />
        <p>
          This device is synced with <strong>{joined.name}</strong>
          {role === "admin" ? " (you're an admin)" : ""}
          {members !== null ? ` · ${members} ${members === 1 ? "person" : "people"} joined` : ""}.
          Everyone who joins sees the same cards, case carts, pull status, QC, schedules, team
          assignments, and notes, live.
        </p>
        <p className="muted small">
          Changes still carry each person's name. Anyone at the facility joins the same way: sign in
          with their own account, then enter the facility name and password here.
        </p>
        {confirmLeave ? (
          <span className="confirm">
            Leave {joined.name}? Your cards stay on this phone; the facility's carts, roster, loaners, and notes are removed from it. Nothing at the facility is deleted.
            <button className="btn btn-danger btn-sm" onClick={() => { forgetFacility(joined.id); setConfirmLeave(false); }}>Leave</button>
            <button className="btn btn-sm" onClick={() => setConfirmLeave(false)}>Stay</button>
          </span>
        ) : (
          <div className="form-actions">
            <button className="btn" onClick={() => setConfirmLeave(true)}>Leave facility</button>
            <button className="btn" onClick={() => setAdding((v) => !v)}>{adding ? "Cancel" : "Join another facility"}</button>
          </div>
        )}
        {adding && (
          <div style={{ marginTop: 10 }}>
            <FacilityJoinForm uid={uid} userName={userName} email={email} compact onJoined={() => setAdding(false)} />
          </div>
        )}
        {pendingBlock}
        {othersBlock}
        {(role === "admin" || isOwner) && (
          <FacilityAdmin facilityId={joined.id} facilityName={joined.name} meUid={uid} canAssignAdmins />
        )}
      </div>
    );
  }

  return (
    <div className="card settings-card">
      <h2>Facility</h2>
      {noticeBlock}
      <p>
        Join your hospital's OR so everyone works from <strong>one shared library</strong>: cards,
        case carts, pull status, QC, schedules, teams, and notes, live on every device. Ask your
        charge desk for the facility name and password. Work at more than one hospital, or travel?
        Join each one; this device switches between them.
      </p>
      <FacilityJoinForm uid={uid} userName={userName} email={email} />
      {pendingBlock}
      {othersBlock}
    </div>
  );
}

// ORSync (the company): look up any facility by name and manage its
// admins and members, without joining it.
function OwnerConsole({ uid }: { uid: string }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function open() {
    setErr(null);
    setTarget(null);
    if (!name.trim()) return;
    setBusy(true);
    try {
      const id = await facilityId(name);
      const info = await facilityInfo(id);
      if (!info) { setErr(`No facility named "${name.trim()}".`); return; }
      setTarget({ id, name: info.name });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't reach ORSync Cloud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card settings-card">
      <h2>ORSync admin</h2>
      <p className="muted small">
        You're signed in as an ORSync owner. Look up any facility to assign its admins, block or
        allow members, or change its password.
      </p>
      <div className="form-grid">
        <label className="field field-wide"><span>Facility name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mercy General OR" autoCapitalize="words" onKeyDown={(e) => e.key === "Enter" && void open()} />
        </label>
      </div>
      {err && <p className="neg small">{err}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={open}>{busy ? "Looking up…" : "Open facility"}</button>
      </div>
      {target && <FacilityAdmin facilityId={target.id} facilityName={target.name} meUid={uid} canAssignAdmins />}
    </div>
  );
}

// Your details on the account: name, phone, position. Saving updates the
// on-call roster entry and staff directory, and what your pulls are signed as.
function AccountProfile({ uid, email, fallbackName }: { uid: string; email: string; fallbackName: string }) {
  const { saveProfile } = useStore();
  const profile = useProfile(uid);
  const [editing, setEditing] = useState(false);
  const base = profile ?? { uid, name: fallbackName, email };
  if (editing) {
    return (
      <ProfileForm
        initial={base}
        submitLabel="Save"
        onSave={(p) => { saveProfile({ ...p, completedAt: profile?.completedAt ?? new Date().toISOString() }); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <div className="account-profile">
      <div className="meta-row"><span className="meta-label">Phone</span><span className="meta-value">{profile?.phone ? formatPhone(profile.phone) : <span className="muted">not set</span>}</span></div>
      <div className="meta-row"><span className="meta-label">Position</span><span className="meta-value">{roleLabel(profile?.role, profile?.level) || <span className="muted">not set</span>}</span></div>
      <p className="muted small" style={{ margin: "6px 0 0" }}>
        These feed the on-call roster and staff directory; changing your number here updates it there.
      </p>
      <div className="form-actions"><button className="btn btn-sm" onClick={() => setEditing(true)}>Edit profile</button></div>
    </div>
  );
}
