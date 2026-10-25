import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../state/auth";
import { FacilityJoinForm } from "../components/FacilityJoin";
import { Mascot } from "../components/Mascot";

// Opened from a facility password email (or any shared join link):
// #/join?f=<facility>&p=<password>. The form arrives filled in; one tap
// reconnects (after a password change) or sends a join request.
export function JoinLinkPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const name = params.get("f") ?? "";
  const pw = params.get("p") ?? "";

  return (
    <div className="page gate">
      <div className="gate-hero">
        <Mascot size={96} className="auth-mascot" />
        <h1>{name ? `Connect to ${name}` : "Connect to your facility"}</h1>
        <p className="muted">
          {pw
            ? "The facility password from your email is filled in. Tap Join facility to reconnect."
            : "Enter the facility name and password from your charge desk or admin."}
        </p>
      </div>
      <div className="card gate-card">
        {user?.uid ? (
          <FacilityJoinForm
            uid={user.uid}
            userName={user.name}
            email={user.email}
            initialName={name}
            initialPassword={pw}
            compact
            onJoined={(_n, status) => { if (status === "joined") navigate("/"); }}
          />
        ) : (
          <p className="muted">Sign in to your ORSync account first, then open this link again.</p>
        )}
      </div>
    </div>
  );
}
