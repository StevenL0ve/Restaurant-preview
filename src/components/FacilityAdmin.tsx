import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { friendly } from "./FacilityJoin";
import {
  allowMember, blockMember, changeFacilityPassword, listBlocked, listMembers, setMemberRole,
  type BlockedEntry, type FacilityMember,
} from "../state/cloudSync";
import { formatPhone } from "../lib/oncall";

// Facility admin tools: who's in, who's out, and the password. Shown to a
// facility's admins (Settings → Facility) and to ORSync owners for any
// facility (Settings → ORSync admin). Blocking is enforced by the cloud's
// rules the moment it's saved; the blocked device is shut out on its next
// read or write, whether or not it still knows the password.
export function FacilityAdmin({ facilityId, facilityName, meUid, canAssignAdmins }: {
  facilityId: string;
  facilityName: string;
  meUid: string;
  canAssignAdmins: boolean;
}) {
  const [members, setMembers] = useState<FacilityMember[] | null>(null);
  const [blocked, setBlocked] = useState<BlockedEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const [m, b] = await Promise.all([listMembers(facilityId), listBlocked(facilityId)]);
      setMembers(m);
      setBlocked(b);
    } catch (e) {
      setErr(friendly(e));
      setMembers([]);
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [facilityId]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  const active = (members ?? []).filter((m) => m.status === "active");
  const out = (members ?? []).filter((m) => m.status !== "active");
  const blockedOnly = blocked.filter((b) => !out.some((m) => m.email === b.email));

  return (
    <div className="facility-admin">
      <h3 className="facility-admin-title"><Icon name="shield" size={18} /> Facility admin</h3>
      <p className="muted small">
        Blocking someone shuts their account out of {facilityName} right away: no reading cards, no
        marking carts, no edits, and the password alone won't get them back in. Their own account and
        the cards on their device stay theirs.
      </p>
      {err && <p className="neg small">{err}</p>}

      {members === null ? (
        <p className="muted small">Loading members…</p>
      ) : (
        <>
          <div className="member-list">
            {active.map((m) => (
              <div key={m.uid} className="member-row">
                <div className="member-main">
                  <strong>{m.name}</strong>
                  {m.role === "admin" && <span className="pill pill-brand">Admin</span>}
                  {m.uid === meUid && <span className="pill">You</span>}
                  <div className="muted small">
                    {m.email}
                    {m.position ? ` · ${m.position}` : ""}
                    {m.phone ? ` · ${formatPhone(m.phone)}` : ""}
                  </div>
                </div>
                {m.uid !== meUid && (
                  <div className="member-actions">
                    {canAssignAdmins && (
                      <button
                        className="btn btn-sm"
                        disabled={busy !== null}
                        onClick={() => run("role:" + m.uid, () => setMemberRole(facilityId, m.uid, m.role === "admin" ? "member" : "admin"))}
                      >
                        {m.role === "admin" ? "Remove admin" : "Make admin"}
                      </button>
                    )}
                    {confirm === m.uid ? (
                      <span className="confirm">
                        Block {m.name}?
                        <button className="btn btn-danger btn-sm" disabled={busy !== null} onClick={() => run("block:" + m.uid, () => blockMember(facilityId, m, meUid))}>Block</button>
                        <button className="btn btn-sm" onClick={() => setConfirm(null)}>Keep</button>
                      </span>
                    ) : (
                      <button className="btn btn-sm btn-danger-outline" disabled={busy !== null} onClick={() => setConfirm(m.uid)}>Block</button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {active.length === 0 && <p className="muted small">No active members.</p>}
          </div>

          {(out.length > 0 || blockedOnly.length > 0) && (
            <>
              <h4 className="facility-admin-sub">Blocked</h4>
              <div className="member-list">
                {out.map((m) => (
                  <div key={m.uid} className="member-row">
                    <div className="member-main">
                      <strong>{m.name}</strong>
                      <div className="muted small">{m.email}{m.position ? ` · ${m.position}` : ""}</div>
                    </div>
                    <div className="member-actions">
                      <button className="btn btn-sm" disabled={busy !== null} onClick={() => run("allow:" + m.uid, () => allowMember(facilityId, m))}>Allow back</button>
                    </div>
                  </div>
                ))}
                {blockedOnly.map((b) => (
                  <div key={b.email} className="member-row">
                    <div className="member-main">
                      <strong>{b.name || b.email}</strong>
                      <div className="muted small">{b.email}</div>
                    </div>
                    <div className="member-actions">
                      <button className="btn btn-sm" disabled={busy !== null} onClick={() => run("allow:" + b.email, () => allowMember(facilityId, b))}>Allow back</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <ChangePassword facilityId={facilityId} facilityName={facilityName} meUid={meUid} />
    </div>
  );
}

function ChangePassword({ facilityId, facilityName, meUid }: { facilityId: string; facilityName: string; meUid: string }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setMsg(null);
    if (pw.length < 6) { setMsg({ ok: false, text: "Use at least 6 characters." }); return; }
    if (pw !== pw2) { setMsg({ ok: false, text: "The two entries don't match." }); return; }
    setBusy(true);
    try {
      await changeFacilityPassword(facilityId, facilityName, pw, meUid);
      setPw(""); setPw2("");
      setOpen(false);
      setMsg({ ok: true, text: "Password changed. Everyone already joined keeps working; new joiners need the new password." });
    } catch (e) {
      setMsg({ ok: false, text: friendly(e) });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="form-actions" style={{ marginTop: 10 }}>
        <button className="btn btn-sm" onClick={() => { setOpen(true); setMsg(null); }}>Change facility password</button>
        {msg && <span className={(msg.ok ? "pos" : "neg") + " small"}>{msg.text}</span>}
      </div>
    );
  }
  return (
    <div className="form-grid" style={{ marginTop: 10 }}>
      <label className="field"><span>New facility password</span>
        <span className="pw-wrap">
          <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <button type="button" className="pw-eye" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)}>
            <Icon name={show ? "eye-off" : "eye"} size={20} />
          </button>
        </span>
      </label>
      <label className="field"><span>Again</span>
        <input type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </label>
      {msg && <p className={(msg.ok ? "pos" : "neg") + " small"} style={{ gridColumn: "1 / -1", margin: 0 }}>{msg.text}</p>}
      <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
        <button className="btn btn-primary btn-sm" disabled={busy || !pw || !pw2} onClick={save}>{busy ? "Saving…" : "Save new password"}</button>
        <button className="btn btn-sm" onClick={() => { setOpen(false); setPw(""); setPw2(""); }}>Cancel</button>
      </div>
    </div>
  );
}
