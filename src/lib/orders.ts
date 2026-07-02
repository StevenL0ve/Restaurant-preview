import type { Order, OrderStatus } from "../types";

// An order's live status is derived from its age, so order tracking "works"
// end-to-end without a backend: received → preparing → ready → completed.
// When a real kitchen system arrives, this becomes a server-pushed field.
const RECEIVED_MIN = 1.5;
const PREPARING_MIN = 6;
const READY_MIN = 25;

export function orderStatus(o: Pick<Order, "createdAt">, now: number = Date.now()): OrderStatus {
  const ageMin = (now - new Date(o.createdAt).getTime()) / 60000;
  if (ageMin < RECEIVED_MIN) return "received";
  if (ageMin < PREPARING_MIN) return "preparing";
  if (ageMin < READY_MIN) return "ready";
  return "completed";
}
