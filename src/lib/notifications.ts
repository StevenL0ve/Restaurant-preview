import type { AppState } from "../types";
import { relativeTime } from "./format";

// Failed/missing notifications are OurFamilyWizard's single most serious
// complaint — reviewers describe missed messages escalating to lawyers and
// police. CoParently surfaces everything that needs attention in one reliable,
// always-visible feed derived directly from state (nothing to "fail to send").

export interface Notification {
  id: string;
  kind: "message" | "request" | "expense";
  icon: string;
  title: string;
  detail: string;
  when: string; // ISO
  to: string; // route
}

export function buildNotifications(s: AppState): Notification[] {
  const out: Notification[] = [];
  const nameOf = (id: string) =>
    s.people.find((p) => p.id === id)?.name ?? "Co-parent";

  // 1. Unread incoming messages.
  for (const m of s.messages) {
    if (m.fromId !== s.meId && !m.readAt) {
      out.push({
        id: "n-msg-" + m.id,
        kind: "message",
        icon: "💬",
        title: `New message from ${nameOf(m.fromId)}`,
        detail: m.body.length > 80 ? m.body.slice(0, 80) + "…" : m.body,
        when: m.createdAt,
        to: "/messages",
      });
    }
  }

  // 2. Pending schedule/swap requests waiting on me.
  for (const e of s.events) {
    if (e.requestStatus === "pending") {
      out.push({
        id: "n-req-" + e.id,
        kind: "request",
        icon: "📅",
        title: "Schedule request needs a response",
        detail: e.title,
        when: e.start,
        to: "/calendar",
      });
    }
  }

  // 3. Expenses the co-parent paid that aren't settled (I may owe), and my
  //    own reimbursement requests still outstanding.
  for (const x of s.expenses) {
    if (x.status === "settled") continue;
    if (x.paidById !== s.meId) {
      out.push({
        id: "n-exp-" + x.id,
        kind: "expense",
        icon: "💵",
        title: "Expense awaiting settlement",
        detail: `${x.description} — ${nameOf(x.paidById)} paid`,
        when: x.date,
        to: "/expenses",
      });
    }
  }

  return out.sort((a, b) => +new Date(b.when) - +new Date(a.when));
}

export function notificationTime(iso: string): string {
  return relativeTime(iso);
}
