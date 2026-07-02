// Core domain types for CoParent.
// Everything is plain data so it can be serialized to localStorage and exported
// as JSON at any time (one of the things OurFamilyWizard users say they can't do).

export type ID = string;

export interface Person {
  id: ID;
  name: string;
  role: "me" | "coparent" | "child" | "professional";
  color: string;
  initials: string;
}

export type ToneLevel = "calm" | "tense" | "hostile";

export interface Message {
  id: ID;
  fromId: ID;
  body: string;
  createdAt: string; // ISO
  readAt: string | null;
  // Tamper-evident record: tone score captured at send time, immutable thereafter.
  tone: ToneLevel;
  edited: false; // messages are never editable — this is a legal record
}

export interface Draft {
  to: ID;
  body: string;
  updatedAt: string;
}

export type EventCategory =
  | "parenting-time"
  | "school"
  | "medical"
  | "activity"
  | "holiday"
  | "other";

export type ChangeRequestStatus = "none" | "pending" | "accepted" | "declined";

export interface CalEvent {
  id: ID;
  title: string;
  category: EventCategory;
  start: string; // ISO date or datetime
  end: string; // ISO
  allDay: boolean;
  notes?: string;
  // Who "has" the child this block (for parenting-time events).
  withId?: ID;
  // Trade/change-request workflow.
  requestStatus: ChangeRequestStatus;
  requestedById?: ID;
}

export type ExpenseStatus = "open" | "reimbursement-requested" | "settled" | "disputed";

export interface Expense {
  id: ID;
  description: string;
  amount: number; // total cost
  paidById: ID;
  // Share owed by the OTHER parent (e.g. 0.5 for a 50/50 split).
  splitOtherShare: number;
  date: string; // ISO
  category: string;
  receiptName?: string; // demo: filename only
  status: ExpenseStatus;
  note?: string;
}

export interface JournalEntry {
  id: ID;
  title: string;
  body: string;
  createdAt: string;
  mood?: "good" | "neutral" | "hard";
  // Journal entries are private by default — the co-parent cannot see them
  // unless explicitly exported. (OFW journals confuse users on this point.)
  shared: boolean;
}

export interface InfoRecord {
  id: ID;
  childId: ID;
  kind: "medical" | "school" | "contact" | "clothing" | "other";
  label: string;
  value: string;
}

export interface AppState {
  people: Person[];
  messages: Message[];
  draft: Draft | null;
  events: CalEvent[];
  expenses: Expense[];
  journal: JournalEntry[];
  info: InfoRecord[];
  meId: ID;
  coParentId: ID;
}
