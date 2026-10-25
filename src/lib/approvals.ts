import { useEffect, useState } from "react";
import { getWorkspace, onWorkspaceChange } from "./workspace";
import { isOrsyncOwner } from "./owner";
import { watchPendingMembers, type FacilityMember } from "../state/cloudSync";
import { useAuth } from "../state/auth";

// The admin's approval queue for the active facility, live. Drives the
// Home tile, the badge on the Settings tab, and the in-app toast when a
// new request lands. Non-admins get an empty list and no listener.
export function usePendingRequests(): FacilityMember[] {
  const { user } = useAuth();
  const [ws, setWs] = useState(getWorkspace());
  useEffect(() => onWorkspaceChange(() => setWs(getWorkspace())), []);
  const [list, setList] = useState<FacilityMember[]>([]);
  const canSee = !!ws && !ws.pending && (ws.role === "admin" || isOrsyncOwner(user?.email));

  useEffect(() => {
    if (!canSee || !ws) { setList([]); return; }
    const stop = watchPendingMembers(ws.id, setList, () => setList([]));
    return stop;
  }, [canSee, ws?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return list;
}
