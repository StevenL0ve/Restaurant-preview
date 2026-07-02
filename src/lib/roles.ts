import type { Venue } from "../types";

// Ownership categories for the app. Each business under the roof has an owner
// login, IT support administers everything, and everyone else is a member.
export type Role = "member" | "it" | Venue;

export const ROLE_LABEL: Record<Role, string> = {
  member: "Member",
  it: "IT Support",
  cafe: "Café Owner",
  restaurant: "Fig + Olive Owner",
  yoga: "Studio Owner",
  zenden: "Zen Den Owner",
  massage: "Massage Owner",
};

const ALL_VENUES: Venue[] = ["cafe", "restaurant", "yoga", "zenden", "massage"];

// Which venues a role may post events for: IT posts anywhere, an owner posts
// for their own business, members can't post.
export function postableVenues(role: Role | undefined): Venue[] {
  if (!role || role === "member") return [];
  if (role === "it") return ALL_VENUES;
  return [role];
}
