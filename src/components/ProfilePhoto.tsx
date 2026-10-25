import { useRef, useState } from "react";
import { fileToAvatarDataUrl } from "../lib/photos";

// Optional profile photo: a clear shot of your face so teammates know who
// you are behind a mask. Picked from the photo library (or the camera via
// the picker), cropped square and shrunk on the device before it goes
// anywhere. Only shared with facilities you're a member of; removable
// anytime, and deleted with the account.
export function ProfilePhotoPicker({ value, name, onChange, size = 96, compact }: {
  value?: string;
  name: string;
  onChange: (photo: string | undefined) => void;
  size?: number;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?";

  async function pick(file: File | undefined) {
    if (!file) return;
    setErr(null);
    try {
      onChange(await fileToAvatarDataUrl(file));
    } catch {
      setErr("That image couldn't be read. Try another photo.");
    }
  }

  return (
    <div className={"profile-photo" + (compact ? " compact" : "")}>
      <button type="button" className="profile-photo-btn" onClick={() => input.current?.click()} aria-label={value ? "Change profile photo" : "Add profile photo"} style={{ width: size, height: size }}>
        {value ? <img src={value} alt="" style={{ width: size, height: size }} /> : <span className="profile-photo-initials" style={{ fontSize: size * 0.34 }}>{initials}</span>}
        <span className="profile-photo-edit">{value ? "Change" : "Add"}</span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      {!compact && (
        <div className="profile-photo-text">
          <strong>Profile photo (optional)</strong>
          <span className="muted small">
            A clear photo of your face helps the team know who you are behind a mask. Just you, no
            patients. Shared only with facilities you're a member of; remove it anytime.
          </span>
          {value && <button type="button" className="link small" onClick={() => onChange(undefined)}>Remove photo</button>}
          {err && <span className="neg small">{err}</span>}
        </div>
      )}
      {compact && value && <button type="button" className="link small" onClick={() => onChange(undefined)}>Remove</button>}
    </div>
  );
}
