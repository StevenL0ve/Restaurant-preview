import { useState } from "react";
import { useStore } from "../state/store";
import { asset } from "../lib/asset";
import { useAuth } from "../state/auth";

// One-time family setup after account creation: replace the demo family with
// the user's real names, or keep exploring with demo data.
export function Welcome({ onDone }: { onDone: () => void }) {
  const { initFamily, resetDemo } = useStore();
  const { user } = useAuth();
  const [myName, setMyName] = useState(user?.name ?? "");
  const [coName, setCoName] = useState("");
  const [kids, setKids] = useState<string[]>([""]);

  function setKid(i: number, v: string) {
    setKids((k) => k.map((x, j) => (j === i ? v : x)));
  }

  function start() {
    initFamily(myName, coName, kids);
    onDone();
  }

  function explore() {
    resetDemo();
    onDone();
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <img className="auth-logo" src={asset("brand/logo-mark.png")} alt="CoParent" width={64} height={64} />
        <h1 className="auth-title">Set up your family</h1>
        <p className="auth-sub">A minute now, organized forever.</p>

        <div className="auth-form">
          <label className="field">
            <span>Your name</span>
            <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Alex Rivera" />
          </label>
          <label className="field">
            <span>Co-parent's name</span>
            <input value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="Jordan Rivera" />
          </label>
          {kids.map((k, i) => (
            <label className="field" key={i}>
              <span>{i === 0 ? "Child's name" : `Child ${i + 1}`}</span>
              <input value={k} onChange={(e) => setKid(i, e.target.value)} placeholder="First name" />
            </label>
          ))}
          {kids.length < 6 && (
            <button className="link add-kid" type="button" onClick={() => setKids((k) => [...k, ""])}>
              + Add another child
            </button>
          )}

          <button
            className="btn btn-primary auth-submit"
            onClick={start}
            disabled={!myName.trim() || !coName.trim()}
          >
            Start with my family
          </button>
          <button className="btn auth-faceid" type="button" onClick={explore}>
            Explore with demo data instead
          </button>
        </div>

        <p className="auth-foot">
          You can invite {coName.trim() || "your co-parent"} once accounts sync is enabled.
        </p>
      </div>
    </div>
  );
}
