import { useEffect, useState } from "react";
import type { TeamRole } from "../types";
import { TEAM_ROLES } from "../types";

// Who you are at the hospital: the details that tie your account to the
// rest of the OR. Saving a profile puts you in the staff directory, creates
// or updates your on-call roster entry (name, phone, position), and stamps
// your name on what you pull and QC. Kept per account on the device, and
// mirrored into the facility's member list once you've joined one.

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role?: TeamRole;
  level?: 1 | 2 | 3; // trainees only
  completedAt?: string; // onboarding finished (or skipped) on this device
}

const KEY = "orsync.profile.v1";

function readAll(): Record<string, UserProfile> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
export function onProfileChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getProfile(uid: string): UserProfile | null {
  return readAll()[uid] ?? null;
}

export function setProfile(p: UserProfile): void {
  try {
    const all = readAll();
    all[p.uid] = p;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* private mode */ }
  for (const fn of listeners) fn();
}

/** Live view of one account's profile. */
export function useProfile(uid: string | undefined): UserProfile | null {
  const [p, setP] = useState(() => (uid ? getProfile(uid) : null));
  useEffect(() => {
    setP(uid ? getProfile(uid) : null);
    return onProfileChange(() => setP(uid ? getProfile(uid) : null));
  }, [uid]);
  return p;
}

export function roleLabel(role?: TeamRole, level?: 1 | 2 | 3): string {
  if (!role) return "";
  const base = TEAM_ROLES.find((r) => r.key === role)?.label ?? role;
  return role === "trainee" && level ? `${base} ${["I", "II", "III"][level - 1]}` : base;
}

/** Digits (plus a leading +) for tel: links; what the roster stores. */
export function normalizePhone(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const digits = t.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return digits.length === 10 ? `+1${digits}` : digits;
}
