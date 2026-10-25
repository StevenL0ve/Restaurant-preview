import { useEffect, useState } from "react";
import { getWorkspace, onWorkspaceChange } from "./workspace";
import { getProfile, onProfileChange } from "./profile";
import { isOrsyncOwner } from "./owner";
import type { TeamRole } from "../types";

// Who may do what at a facility. On your own (no facility) everything is
// yours. At a facility: admins run the board; everyone else asks for case
// additions and cancellations; trainees and Phase II students pull carts
// and read cards but don't QC, book, cancel, or edit facility cards.
export interface Permissions {
  facility: boolean;
  isAdmin: boolean;
  isTrainee: boolean;
  role: TeamRole | undefined;
  canAddCase: boolean;
  canCancelCase: boolean;
  /** Additions and cancellations go to an admin first. */
  needsApproval: boolean;
  canQc: boolean;
  canEditCards: boolean;
}

export function computePermissions(uid: string | undefined, email: string | undefined): Permissions {
  const ws = getWorkspace();
  const facility = !!ws && ws.role !== "rep";
  const role = uid ? getProfile(uid)?.role : undefined;
  const isAdmin = facility && (ws!.role === "admin" || isOrsyncOwner(email));
  const isTrainee = role === "trainee" || role === "phase2";
  return {
    facility, isAdmin, isTrainee, role,
    canAddCase: !facility || !isTrainee,
    canCancelCase: !facility || !isTrainee,
    needsApproval: facility && !isAdmin,
    canQc: !facility || !isTrainee,
    canEditCards: !facility || !isTrainee,
  };
}

export function usePermissions(uid: string | undefined, email: string | undefined): Permissions {
  const [p, setP] = useState(() => computePermissions(uid, email));
  useEffect(() => {
    const fn = () => setP(computePermissions(uid, email));
    fn();
    const a = onWorkspaceChange(fn);
    const b = onProfileChange(fn);
    return () => { a(); b(); };
  }, [uid, email]);
  return p;
}

export const ADMIN_POWERS = [
  "Approve or deny people asking to join, and remove anyone",
  "Change the facility password and choose who stays connected",
  "Add and cancel cases directly, and approve others' requests",
  "Make other members admins, or remove admin access",
  "Everything a member can do: cards, carts, QC, on-call, loaners",
] as const;
