import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { friendly } from "./FacilityJoin";
import {
  allowMember, approveMember, blockMember, changeFacilityPassword, denyMember, listBlocked, listMembers, setMemberRole,
  type BlockedEntry, type FacilityMember,
} from "../state/cloudSync";
import { relativeTime } from "../lib/format";
import { formatPhone } from "../lib/oncall";
import { facilityJoinAppLink, facilityJoinLink } from "../lib/links";

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
  const pending = (members ?? []).filter((m) => m.status === "pending");
  const out = (members ?? []).filter((m) => m.status === "blocked" || m.status === "denied");
  const blockedOnly = blocked.filter((b) => !out.some((m) => m.email === b.email));

  return (
    <div className="facility-admin">
      <h3 className="facility-admin-title"><Icon name="shield" size={18} /> Facility admin</h3>
      <p className="muted small">
        Everyone who enters the facility password waits here until an admin approves them. Blocking
        someone shuts their account out of {facilityName} right away: no reading cards, no marking
        carts, no edits, and the password alone won't get them back in. Their own account and the
        cards on their device stay theirs.
      </p>
      {err && <p className="neg small">{err}</p>}

      {members === null ? (
        <p className="muted small">Loading members…</p>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <h4 className="facility-admin-sub">Waiting for approval ({pending.length})</h4>
              <div className="member-list">
                {pending.map((m) => (
                  <div key={m.uid} className="member-row member-pending">
                    <div className="member-main">
                      <strong>{m.name}</strong>
                      {m.position && <span className="pill">{m.position}</span>}
                      <div className="muted small">
                        {m.email}
                        {m.phone ? ` · ${formatPhone(m.phone)}` : ""}
                        {m.requestedAt ? ` · asked ${relativeTime(m.requestedAt)}` : ""}
                      </div>
                    </div>
                    <div className="member-actions">
                      <button className="btn btn-sm btn-primary" disabled={busy !== null} onClick={() => run("approve:" + m.uid, () => approveMember(facilityId, m.uid, meUid))}>Approve</button>
                      <button className="btn btn-sm btn-danger-outline" disabled={busy !== null} onClick={() => run("deny:" + m.uid, () => denyMember(facilityId, m.uid, meUid))}>Deny</button>
                    </div>
                  </div>
                ))}
              </div>
              <h4 className="facility-admin-sub">Members</h4>
            </>
          )}
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
              <h4 className="facility-admin-sub">Blocked or denied</h4>
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

      <ChangePassword facilityId={facilityId} facilityName={facilityName} meUid={meUid} members={active} />
    </div>
  );
}

function ChangePassword({ facilityId, facilityName, meUid, members }: { facilityId: string; facilityName: string; meUid: string; members: FacilityMember[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState<{ password: string; emails: string[] } | null>(null);

  function start() {
    setOpen(true); setStep(1); setMsg(null); setDone(null);
    setKeep(new Set(members.map((m) => m.uid)));
  }

  function next() {
    setMsg(null);
    if (pw.length < 6) { setMsg({ ok: false, text: "Use at least 6 characters." }); return; }
    if (pw !== pw2) { setMsg({ ok: false, text: "The two entries don't match." }); return; }
    setStep(2);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const keepUids = members.filter((m) => keep.has(m.uid) || m.uid === meUid).map((m) => m.uid);
      const removeUids = members.filter((m) => !keep.has(m.uid) && m.uid !== meUid).map((m) => m.uid);
      await changeFacilityPassword(facilityId, facilityName, pw, meUid, keepUids, removeUids);
      const emails = members.filter((m) => keepUids.includes(m.uid) && m.uid !== meUid).map((m) => m.email);
      setDone({ password: pw, emails });
      setPw(""); setPw2("");
      setOpen(false);
    } catch (e) {
      setMsg({ ok: false, text: friendly(e) });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const link = facilityJoinLink(facilityName, done.password);
    const appLink = facilityJoinAppLink(facilityName, done.password);
    const subject = `${facilityName}: new ORSync facility password`;
    const body = [
      `The ORSync password for ${facilityName} changed.`,
      "",
      "You're still connected. Within 30 days, open this link on your phone and tap Join facility; the new password is filled in for you:",
      link,
      "",
      "If ORSync is installed, this one opens the app directly:",
      appLink,
      "",
      `New facility password: ${done.password}`,
      "",
      "After 30 days without entering it, your phone is signed out of the facility until you do.",
    ].join("\n");
    const mailto = `mailto:?bcc=${encodeURIComponent(done.emails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return (
      <div className="auth-notice" style={{ alignItems: "flex-start", textAlign: "left", marginTop: 10 }}>
        <strong>Password changed.</strong>
        <span>
          {done.emails.length} {done.emails.length === 1 ? "person stays" : "people stay"} connected and
          {" "}{done.emails.length === 1 ? "has" : "have"} 30 days to enter the new password. Send them the
          email now: it carries a link that opens ORSync with the password filled in. They'll also see
          a reminder in the app until they do.
        </span>
        <div className="form-actions">
          <a className="btn btn-primary btn-sm" href={mailto}>Email everyone ({done.emails.length})</a>
          <button className="btn btn-sm" type="button" onClick={() => { void navigator.clipboard?.writeText(link); setMsg({ ok: true, text: "Link copied." }); }}>Copy link</button>
          <button className="btn btn-sm" type="button" onClick={() => setDone(null)}>Done</button>
        </div>
        {msg && <span className={(msg.ok ? "pos" : "neg") + " small"}>{msg.text}</span>}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="form-actions" style={{ marginTop: 10 }}>
        <button className="btn btn-sm" onClick={start}>Change facility password</button>
        {msg && <span className={(msg.ok ? "pos" : "neg") + " small"}>{msg.text}</span>}
      </div>
    );
  }

  if (step === 2) {
    const others = members.filter((m) => m.uid !== meUid);
    return (
      <div style={{ marginTop: 10 }}>
        <h4 className="facility-admin-sub">Who stays connected?</h4>
        <p className="muted small" style={{ margin: "0 0 4px" }}>
          Everyone checked stays signed in and gets 30 days to enter the new password (you'll email it
          to them next). Uncheck anyone who should be signed out of {facilityName} now.
        </p>
        <div className="keep-list">
          {others.map((m) => (
            <label key={m.uid} className="keep-row">
              <input type="checkbox" checked={keep.has(m.uid)} onChange={(e) => {
                const n = new Set(keep);
                if (e.target.checked) n.add(m.uid); else n.delete(m.uid);
                setKeep(n);
              }} />
              <span><strong>{m.name}</strong>{m.position ? ` · ${m.position}` : ""} <span className="muted small">{m.email}</span></span>
            </label>
          ))}
          {others.length === 0 && <p className="muted small">No one else has joined yet.</p>}
        </div>
        {msg && <p className={(msg.ok ? "pos" : "neg") + " small"} style={{ margin: 0 }}>{msg.text}</p>}
        <div className="form-actions">
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? "Saving…" : `Change password, keep ${others.filter((m) => keep.has(m.uid)).length} of ${others.length}`}</button>
          <button className="btn btn-sm" onClick={() => setStep(1)}>Back</button>
        </div>
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
        <button className="btn btn-primary btn-sm" disabled={busy || !pw || !pw2} onClick={next}>Next: who stays</button>
        <button className="btn btn-sm" onClick={() => { setOpen(false); setPw(""); setPw2(""); }}>Cancel</button>
      </div>
    </div>
  );
}
