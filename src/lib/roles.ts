import type { Venue } from "../types";

// Admin tiers for the app. The family who owns The Common Ground Projects are
// "owners" — full admin across every venue. Employees are "staff", assigned to
// one or more venues (plenty work more than one section). IT administers
// everything, and everyone else is a member.
export type Role = "member" | "staff" | "owner" | "it";

export const ROLE_LABEL: Record<Role, string> = {
  member: "Member",
  staff: "Staff",
  owner: "Owner",
  it: "IT Support",
};

export const ALL_VENUES: Venue[] = ["cafe", "restaurant", "yoga", "zenden", "massage"];

// Which venues someone may administer (post community events, manage class &
// session schedules): owners and IT everywhere, staff only where they work.
export function postableVenues(role: Role | undefined, venues?: Venue[]): Venue[] {
  if (!role || role === "member") return [];
  if (role === "it" || role === "owner") return ALL_VENUES;
  return venues ?? [];
}
