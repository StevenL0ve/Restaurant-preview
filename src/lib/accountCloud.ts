import { firebase } from "./cloud";
import { getProfile, setProfile, type UserProfile } from "./profile";
import { getFacilities, getWorkspace, rememberFacility, setWorkspace, type JoinedWorkspace } from "./workspace";

// Who you are and which facilities you belong to, kept with the account
// (users/{uid}/meta/account) so a new phone, a new browser, or the website
// at a new address opens straight into your setup instead of starting over.
// It's a few hundred bytes of settings, not a library: the personal-library
// backup stays a paid feature, and facility libraries live with the facility.

interface CloudAccount {
  profile?: UserProfile;
  facilities?: JoinedWorkspace[];
  activeId?: string | null;
  updatedAt?: string;
}

const SENT_KEY = "orsync.accountcloud.sent.v1";
// A profile photo is a small JPEG; anything unexpectedly large stays local
// (the document has to stay well under Firestore's 1 MB limit).
const MAX_PHOTO = 300_000;

function snapshot(uid: string): CloudAccount | null {
  const profile = getProfile(uid);
  if (!profile?.completedAt) return null; // nothing worth keeping yet
  const { photo, ...rest } = profile;
  return {
    profile: photo && photo.length <= MAX_PHOTO ? { ...rest, photo } : rest,
    facilities: getFacilities().map(({ id, name, role, pending }) => ({ id, name, ...(role ? { role } : {}), ...(pending ? { pending } : {}) })),
    activeId: getWorkspace()?.id ?? null,
  };
}

/** Save this device's profile and facility list to the account, when they
 *  changed since the last save from here. */
export async function saveAccountSettings(uid: string): Promise<void> {
  const snap = snapshot(uid);
  if (!snap) return;
  const body = JSON.stringify(snap);
  try {
    if (localStorage.getItem(SENT_KEY) === `${uid}:${body}`) return;
  } catch { /* private mode: just send */ }
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  await fs.setDoc(fs.doc(db, "users", uid, "meta", "account"), { ...snap, updatedAt: new Date().toISOString() });
  try { localStorage.setItem(SENT_KEY, `${uid}:${body}`); } catch { /* private mode */ }
}

/** First open on a device that doesn't know this account yet: bring back
 *  the saved profile and the facilities the account is still a member of.
 *  Returns true when there was a finished profile to restore. */
export async function restoreAccountSettings(uid: string): Promise<boolean> {
  if (getProfile(uid)?.completedAt) return true;
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const snap = await fs.getDoc(fs.doc(db, "users", uid, "meta", "account"));
  const saved = snap.exists() ? (snap.data() as CloudAccount) : null;
  if (!saved?.profile?.completedAt) return false;

  // Only facilities that still have this account: an admin may have
  // removed or blocked it since.
  const { myMembership } = await import("../state/cloudSync");
  const known = new Set(getFacilities().map((f) => f.id));
  let active: JoinedWorkspace | null = null;
  for (const f of saved.facilities ?? []) {
    if (known.has(f.id)) continue;
    const m = await myMembership(f.id, uid).catch(() => null);
    if (!m || (m.status !== "active" && m.status !== "pending")) continue;
    const w: JoinedWorkspace = { id: f.id, name: f.name, role: m.role, ...(m.status === "pending" ? { pending: true } : {}) };
    rememberFacility(w);
    if (f.id === saved.activeId && !w.pending) active = w;
  }
  if (active && !getWorkspace()) setWorkspace(active);

  setProfile({ ...saved.profile, uid });
  return true;
}
