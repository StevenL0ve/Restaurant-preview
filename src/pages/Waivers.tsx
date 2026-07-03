import { useState } from "react";
import { useAuth } from "../state/auth";
import { useStore } from "../state/store";
import { VENUES, type WaiverVenue } from "../types";
import { WAIVER_TEXT, WAIVER_TITLE } from "../lib/waiverText";
import { fullDate } from "../lib/format";
import { notifySuccess, tapLight } from "../lib/haptics";

const venues: WaiverVenue[] = ["yoga", "pilates", "zenden", "massage"];

export function Waivers() {
  const { user } = useAuth();
  const { state, signWaiver } = useStore();
  const [open, setOpen] = useState<WaiverVenue | null>(null);
  const [sigName, setSigName] = useState(user?.name ?? "");
  const [agree, setAgree] = useState(false);

  function start(v: WaiverVenue) {
    setSigName(user?.name ?? "");
    setAgree(false);
    setOpen(v);
    tapLight();
  }

  function sign() {
    if (!open || !agree || !sigName.trim()) return;
    signWaiver(open, sigName);
    notifySuccess();
    setOpen(null);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Waivers</h1>
          <p className="page-sub">Sign once per activity. Required before booking yoga, the Zen Den &amp; massage.</p>
        </div>
      </div>

      <div className="photo-banner">
        <img src="/photos/yoga-doors.jpeg" alt="The carved doors into the yoga studio" />
      </div>

      <div className="stack">
        {venues.map((v) => {
          const signed = state.waivers.find((w) => w.venue === v);
          return (
            <div key={v} className="card waiver-row">
              <div className="waiver-row-body">
                <div className="row-title">{VENUES[v].icon} {WAIVER_TITLE[v]}</div>
                {signed ? (
                  <div className="row-sub">Signed by {signed.signedName} · {fullDate(signed.signedAt)}</div>
                ) : (
                  <div className="row-sub">Not signed yet.</div>
                )}
              </div>
              {signed ? (
                <span className="pill pill-ok">Signed ✓</span>
              ) : (
                <button className="btn btn-add" onClick={() => start(v)}>Sign</button>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <div className="modal-scrim" onClick={() => setOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="modal-title">{WAIVER_TITLE[open]}</h2>
            <div className="waiver-text">{WAIVER_TEXT[open]}</div>
            <label className="field">
              <span>Type your full name to sign</span>
              <input value={sigName} onChange={(e) => setSigName(e.target.value)} placeholder="Alex Rivera" />
            </label>
            <label className="check">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I have read and agree to the waiver above.</span>
            </label>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setOpen(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!agree || !sigName.trim()} onClick={sign}>Sign waiver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
