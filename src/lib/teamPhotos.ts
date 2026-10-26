import { getWorkspace } from "./workspace";
import { listMembers } from "../state/cloudSync";
import type { OnCallPerson } from "../types";

// Profile photos for a case's room team, matched by name: the on-call
// roster (which carries linked accounts' photos), your own profile, and the
// facility's member list (fetched once per facility when first asked).

export function normName(n: string): string {
  return n.toLowerCase().replace(/^dr\.?\s+/, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

const memberCache = new Map<string, Promise<Map<string, string>>>();

function facilityPhotos(): Promise<Map<string, string>> {
  const ws = getWorkspace();
  if (!ws || ws.pending || ws.role === "rep") return Promise.resolve(new Map());
  let p = memberCache.get(ws.id);
  if (!p) {
    p = listMembers(ws.id)
      .then((ms) => new Map(ms.filter((m) => m.photo && m.status === "active").map((m) => [normName(m.name), m.photo as string])))
      .catch(() => { memberCache.delete(ws.id); return new Map<string, string>(); });
    memberCache.set(ws.id, p);
  }
  return p;
}

export async function teamPhotos(people: OnCallPerson[], me?: { name?: string; photo?: string }): Promise<Map<string, string>> {
  const out = new Map(await facilityPhotos());
  for (const p of people) if (p.photo) out.set(normName(p.name), p.photo);
  if (me?.name && me.photo) out.set(normName(me.name), me.photo);
  return out;
}
