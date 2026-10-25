import { useEffect, useState } from "react";
import { getWorkspace } from "./workspace";
import { listMembers, type FacilityMember } from "../state/cloudSync";

/** Vendor reps linked to the active facility (members with the rep role),
 *  for the "assign a rep" picker on a case's set request. */
export function useFacilityReps(): FacilityMember[] {
  const [reps, setReps] = useState<FacilityMember[]>([]);
  useEffect(() => {
    const ws = getWorkspace();
    if (!ws || ws.role === "rep") return;
    let on = true;
    listMembers(ws.id)
      .then((m) => { if (on) setReps(m.filter((x) => x.role === "rep" && x.status === "active")); })
      .catch(() => undefined);
    return () => { on = false; };
  }, []);
  return reps;
}
