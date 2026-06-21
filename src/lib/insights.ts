import type { AppState } from "../types";

// Lightweight, derived insights for the dashboard. Pure function over state so
// it's easy to test and never goes stale.

export interface Insights {
  monthLabel: string;
  totalSpend: number; // all shared expenses logged this month
  yourOutOfPocket: number; // what you paid this month
  messagesThisWeek: number;
  eventsNext7Days: number;
}

function startOfMonth(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function computeInsights(state: AppState, now = new Date()): Insights {
  const monthStart = startOfMonth(now);
  const weekAgo = now.getTime() - 7 * 86400000;
  const in7 = now.getTime() + 7 * 86400000;

  let totalSpend = 0;
  let yourOutOfPocket = 0;
  for (const x of state.expenses) {
    if (new Date(x.date).getTime() >= monthStart) {
      totalSpend += x.amount;
      if (x.paidById === state.meId) yourOutOfPocket += x.amount;
    }
  }

  const messagesThisWeek = state.messages.filter(
    (m) => new Date(m.createdAt).getTime() >= weekAgo,
  ).length;

  const eventsNext7Days = state.events.filter((e) => {
    const t = new Date(e.start).getTime();
    return t >= now.getTime() && t <= in7;
  }).length;

  return {
    monthLabel: now.toLocaleDateString("en-US", { month: "long" }),
    totalSpend,
    yourOutOfPocket,
    messagesThisWeek,
    eventsNext7Days,
  };
}
