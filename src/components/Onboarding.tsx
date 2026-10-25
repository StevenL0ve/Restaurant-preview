import { useState } from "react";
import { Mascot } from "./Mascot";
import { ProfileForm } from "./ProfileForm";
import { FacilityJoinForm } from "./FacilityJoin";
import { useAuth } from "../state/auth";
import { useStore } from "../state/store";
import { getWorkspace } from "../lib/workspace";
import { getProfile, roleLabel, type UserProfile } from "../lib/profile";

// Right after Create account: who you are, then (optionally) join your
// hospital. Finishing links the account to the OR: staff directory, on-call
// roster entry, your name on pulls and QC, and the facility's shared library.
export function Onboarding() {
  const { user } = useAuth();
  const { saveProfile } = useStore();
  const uid = user?.uid ?? "";
  const existing = getProfile(uid);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<UserProfile>(
    existing ?? { uid, name: user?.name ?? "", email: user?.email ?? "" },
  );
  const [joined, setJoined] = useState<{ name: string; status: "joined" | "pending" } | null>(
    () => { const w = getWorkspace(); return w ? { name: w.name, status: "joined" } : null; },
  );
  const joinedName = joined?.name ?? null;

  function finish() {
    saveProfile({ ...profile, completedAt: new Date().toISOString() });
  }

  return (
    <div className="auth onboarding">
      <div className="auth-card">
        <Mascot size={80} className="auth-mascot" />
        <div className="onb-steps" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => <span key={n} className={"onb-dot" + (n <= step ? " on" : "")} />)}
        </div>

        {step === 1 && (
          <>
            <h1 className="auth-title">About you</h1>
            <p className="auth-sub">So the OR knows who pulled what, and how to reach you on call.</p>
            <ProfileForm
              initial={profile}
              submitLabel="Next"
              onSave={(p) => { setProfile(p); saveProfile(p); setStep(2); }}
            />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="auth-title">Join your hospital</h1>
            <p className="auth-sub">
              One shared library for the whole OR: cards, case carts, pull status, QC, the schedule,
              teams, and notes, live on every device. Ask the charge desk for the facility name and
              password.
            </p>
            {joined?.status === "joined" ? (
              <div className="auth-notice">
                <strong>Joined {joinedName}</strong>
                <span>The cards on this device merge into the facility's library; your on-call entry and name are set.</span>
              </div>
            ) : (
              <FacilityJoinForm
                uid={uid}
                userName={profile.name}
                email={profile.email}
                compact
                onJoined={(n, status) => setJoined({ name: n, status })}
              />
            )}
            <div className="form-actions" style={{ justifyContent: "center", marginTop: 12 }}>
              <button className={"btn" + (joinedName ? " btn-primary" : "")} type="button" onClick={() => setStep(3)}>
                {joinedName ? "Next" : "Skip for now"}
              </button>
              <button className="link small auth-link" type="button" onClick={() => setStep(1)}>Back</button>
            </div>
            {!joinedName && (
              <p className="auth-foot" style={{ margin: 0 }}>
                You can join later in Settings → Facility.
              </p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="auth-title">You're set, {profile.name.split(/\s+/)[0]}</h1>
            <ul className="onb-summary">
              <li>Your name goes on everything you pull, QC, and change.</li>
              <li>
                {profile.role
                  ? `You're on the on-call roster as ${roleLabel(profile.role, profile.level)}${profile.phone ? " with your number" : " (add a number in Settings so the desk can reach you)"}.`
                  : "Add your position in Settings → Account to show up on the on-call roster."}
              </li>
              <li>
                {joined?.status === "joined"
                  ? `${joinedName}'s library is live on this device, and your cards are part of it.`
                  : joined?.status === "pending"
                    ? `Your request to join ${joinedName} is with its admins. The facility opens up on its own once you're approved.`
                    : "Join your facility anytime in Settings to share cards, carts, and the schedule."}
              </li>
            </ul>
            <button className="btn btn-primary auth-submit" type="button" onClick={finish}>Open ORSync</button>
          </>
        )}
      </div>
    </div>
  );
}
