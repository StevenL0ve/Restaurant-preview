import { firebase, authErrorMessage } from "./cloud";
import { SYNCED_KEYS } from "../state/cloudSync";
import { getFacilities } from "./workspace";

// Account self-service for ORSync Cloud accounts. Every change starts by
// re-entering the current password (Firebase requires a recent sign-in for
// these), so a phone left unlocked can't change the email or wipe the data.

async function reauth(currentPassword: string) {
  const { auth } = await firebase();
  const fa = await import("firebase/auth");
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Sign in again, then retry.");
  try {
    await fa.reauthenticateWithCredential(user, fa.EmailAuthProvider.credential(user.email, currentPassword));
  } catch (e) {
    throw new Error(authErrorMessage(e));
  }
  return { user, fa };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (newPassword.length < 6) throw new Error("Use at least 6 characters.");
  const { user, fa } = await reauth(currentPassword);
  try {
    await fa.updatePassword(user, newPassword);
  } catch (e) {
    throw new Error(authErrorMessage(e));
  }
}

/** Changing the email is the one change that can lock the real owner out,
 *  so it takes three proofs: the current password, the CURRENT inbox
 *  (the address on the account must be verified; if it isn't, a link goes
 *  there first), and the NEW inbox (a link goes there; the address changes
 *  only when it's opened). Firebase also mails the old address a one-tap
 *  "undo this change and reset the password" link whenever an email
 *  changes, so a hijack can be reversed from the original inbox. */
export async function requestEmailChange(currentPassword: string, newEmail: string): Promise<void> {
  const key = newEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) throw new Error("Enter a valid email.");
  const { user, fa } = await reauth(currentPassword);
  if (key === (user.email ?? "").toLowerCase()) throw new Error("That's already the email on this account.");
  await user.reload().catch(() => undefined);
  if (!user.emailVerified) {
    try {
      await fa.sendEmailVerification(user);
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
    throw new Error(`First confirm you own ${user.email}: we just sent a link there. Open it, then try the email change again.`);
  }
  try {
    await fa.verifyBeforeUpdateEmail(user, key);
  } catch (e) {
    throw new Error(authErrorMessage(e));
  }
}

/** Deletes the personal cloud library, the account's memberships at every
 *  facility this device knows about, and then the sign-in itself. The
 *  facility libraries themselves are untouched (they belong to the OR). */
export async function deleteAccountAndData(currentPassword: string): Promise<void> {
  const { user, fa } = await reauth(currentPassword);
  const { db } = await firebase();
  const fs = await import("firebase/firestore");
  const uid = user.uid;

  let batch = fs.writeBatch(db);
  let ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = fs.writeBatch(db); ops = 0; } };
  const del = async (ref: import("firebase/firestore").DocumentReference) => { batch.delete(ref); if (++ops >= 400) await flush(); };

  for (const key of SYNCED_KEYS) {
    const snap = await fs.getDocs(fs.collection(db, "users", uid, key));
    for (const d of snap.docs) await del(d.ref);
  }
  await del(fs.doc(db, "users", uid, "meta", "setups"));
  await del(fs.doc(db, "users", uid, "meta", "account"));
  for (const f of getFacilities()) {
    await del(fs.doc(db, "workspaces", f.id, "members", uid));
  }
  await flush();

  try {
    await fa.deleteUser(user);
  } catch (e) {
    throw new Error(authErrorMessage(e));
  }
}
