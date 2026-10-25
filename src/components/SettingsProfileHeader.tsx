import { ProfilePhotoPicker } from "./ProfilePhoto";
import { useStore } from "../state/store";
import { roleLabel, useProfile } from "../lib/profile";
import { useAuth } from "../state/auth";

// Top of Settings: your photo (tap to add or change), name, email, and
// position. Guests get the generic initials chip and no photo controls.
export function SettingsProfileHeader() {
  const { user } = useAuth();
  const { saveProfile } = useStore();
  const profile = useProfile(user?.uid);
  const name = profile?.name || user?.name || "You";
  const position = roleLabel(profile?.role, profile?.level);

  return (
    <div className="settings-profile">
      {user?.uid ? (
        <ProfilePhotoPicker
          compact
          size={72}
          value={profile?.photo}
          name={name}
          onChange={(photo) => saveProfile({ ...(profile ?? { uid: user.uid!, name, email: user.email }), photo, completedAt: profile?.completedAt ?? new Date().toISOString() })}
        />
      ) : (
        <span className="profile-photo-btn" style={{ width: 72, height: 72, cursor: "default" }}>
          <span className="profile-photo-initials" style={{ fontSize: 24 }}>{name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?"}</span>
        </span>
      )}
      <div className="settings-profile-text">
        <h1>{name}</h1>
        {user?.email && <span className="muted small">{user.email}</span>}
        {position && <span className="muted small">{position}</span>}
        {user?.uid && !profile?.photo && <span className="muted small">Tap the circle to add a photo so the team knows your face.</span>}
      </div>
    </div>
  );
}
