// ORSync (the company) accounts. Owners assign facility admins and can step
// into any facility's member list. The same list lives in the Firestore
// rules (firestore.rules), which is where it's actually enforced; this copy
// only decides what the app shows.
export const ORSYNC_OWNER_EMAILS = ["stevenlnelson24@gmail.com"];

export function isOrsyncOwner(email: string | null | undefined): boolean {
  return !!email && ORSYNC_OWNER_EMAILS.includes(email.trim().toLowerCase());
}
