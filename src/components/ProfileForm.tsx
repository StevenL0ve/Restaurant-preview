import { useState } from "react";
import { TEAM_ROLES, type TeamRole } from "../types";
import { normalizePhone, type UserProfile } from "../lib/profile";
import { ProfilePhotoPicker } from "./ProfilePhoto";

// Name, phone, position: the three things the rest of the OR needs to know
// about you. Used by onboarding and by Settings → Account → Edit profile.
export function ProfileForm({ initial, submitLabel, onSave, onCancel, busy }: {
  initial: UserProfile;
  submitLabel: string;
  onSave: (p: UserProfile) => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [role, setRole] = useState<TeamRole | "">(initial.role ?? "");
  const [level, setLevel] = useState<1 | 2 | 3>(initial.level ?? 1);
  const [photo, setPhoto] = useState<string | undefined>(initial.photo);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...initial,
      name: name.trim(),
      phone: normalizePhone(phone) || undefined,
      role: role || undefined,
      level: role === "trainee" ? level : undefined,
      photo,
    });
  }

  return (
    <form className="form-grid profile-form" onSubmit={submit}>
      <div className="field field-wide">
        <ProfilePhotoPicker value={photo} name={name} onChange={setPhoto} />
      </div>
      <label className="field field-wide"><span>Your name</span>
        <input name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoCapitalize="words" placeholder="Steven Nelson" />
        <span className="muted small">Shown on everything you pull, QC, and change, as last name + first initial.</span>
      </label>
      <label className="field"><span>Phone</span>
        <input
          name="tel"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="tel"
          placeholder="+1 228 555 0100"
        />
        <span className="muted small">Goes on the on-call roster so the desk can reach you.</span>
      </label>
      <label className="field"><span>Position</span>
        <select value={role} onChange={(e) => setRole(e.target.value as TeamRole | "")}>
          <option value="">Pick one…</option>
          {TEAM_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </label>
      {role === "trainee" && (
        <label className="field"><span>Trainee level</span>
          <select value={level} onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3)}>
            <option value={1}>Level I</option>
            <option value={2}>Level II</option>
            <option value={3}>Level III</option>
          </select>
        </label>
      )}
      <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>{busy ? "Saving…" : submitLabel}</button>
        {onCancel && <button className="btn" type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
