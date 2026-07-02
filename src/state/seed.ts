import type { AppState } from "../types";

// A demo dataset so the app is useful the moment it opens — no empty screens,
// no sign-up wall. Dates are generated relative to "now" so the calendar always
// looks live.

const day = 86400000;
function at(daysFromNow: number, hour = 9, min = 0): string {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return new Date(d.getTime() + daysFromNow * day).toISOString();
}
function ago(mins: number): string {
  return new Date(Date.now() - mins * 60000).toISOString();
}

const ME = "p-me";
const CO = "p-co";
const KID1 = "p-ava";
const KID2 = "p-leo";

export function buildSeed(): AppState {
  return {
    meId: ME,
    coParentId: CO,
    people: [
      { id: ME, name: "You", role: "me", color: "#0f766e", initials: "YO" },
      { id: CO, name: "Jordan", role: "coparent", color: "#7c3aed", initials: "JD" },
      { id: KID1, name: "Ava", role: "child", color: "#db2777", initials: "AV" },
      { id: KID2, name: "Leo", role: "child", color: "#2563eb", initials: "LE" },
    ],
    draft: null,
    messages: [
      {
        id: "m1", fromId: CO, body: "Ava has a dentist appointment Thursday at 3:30. Can you take her? I have a work thing I can't move.",
        createdAt: ago(60 * 26), readAt: ago(60 * 25), tone: "calm", edited: false,
      },
      {
        id: "m2", fromId: ME, body: "Yes, I can take her. I'll pick her up from school. Thanks for the heads up.",
        createdAt: ago(60 * 25), readAt: ago(60 * 24), tone: "calm", edited: false,
      },
      {
        id: "m3", fromId: CO, body: "Great, thank you. I'll send the insurance card details to the Info Bank.",
        createdAt: ago(60 * 24), readAt: ago(60 * 23), tone: "calm", edited: false,
      },
      {
        id: "m4", fromId: ME, body: "Sounds good. Also — Leo's soccer registration is due Friday, it's $90. I'll log it in expenses and we can split it.",
        createdAt: ago(190), readAt: ago(120), tone: "calm", edited: false,
      },
      {
        id: "m5", fromId: CO, body: "Works for me. I'll approve it when it comes through.",
        createdAt: ago(95), readAt: null, tone: "calm", edited: false,
      },
    ],
    events: [
      {
        id: "e1", title: "Parenting time — with You", category: "parenting-time",
        start: at(-1, 0), end: at(3, 0), allDay: true, withId: ME,
        requestStatus: "none",
      },
      {
        id: "e2", title: "Parenting time — with Jordan", category: "parenting-time",
        start: at(3, 0), end: at(7, 0), allDay: true, withId: CO,
        requestStatus: "none",
      },
      {
        id: "e3", title: "Ava — Dentist", category: "medical",
        start: at(2, 15, 30), end: at(2, 16, 30), allDay: false,
        notes: "Bright Smiles Dental, 1200 Oak St. You are taking her.",
        requestStatus: "none",
      },
      {
        id: "e4", title: "Leo — Soccer practice", category: "activity",
        start: at(1, 17, 0), end: at(1, 18, 30), allDay: false,
        notes: "Riverside fields. Bring cleats + water.", requestStatus: "none",
      },
      {
        id: "e5", title: "School closed — Teacher in-service", category: "school",
        start: at(5, 0), end: at(5, 0), allDay: true, requestStatus: "none",
      },
      {
        id: "e6", title: "Swap request: I take Sat instead of Sun", category: "parenting-time",
        start: at(6, 0), end: at(7, 0), allDay: true, withId: ME,
        requestStatus: "pending", requestedById: CO,
        notes: "Jordan asked to swap so they can attend a wedding Sunday.",
      },
    ],
    expenses: [
      {
        id: "x1", description: "Leo — Soccer registration", amount: 90, paidById: ME,
        splitOtherShare: 0.5, date: ago(60 * 3), category: "Activities",
        status: "reimbursement-requested", note: "Spring season. Receipt attached.",
        receiptName: "soccer-receipt.pdf",
      },
      {
        id: "x2", description: "Ava — Winter coat", amount: 64.5, paidById: CO,
        splitOtherShare: 0.5, date: ago(60 * 24 * 6), category: "Clothing",
        status: "settled",
      },
      {
        id: "x3", description: "Pediatrician copay (both kids)", amount: 50, paidById: ME,
        splitOtherShare: 0.5, date: ago(60 * 24 * 10), category: "Medical",
        status: "settled", receiptName: "copay.jpg",
      },
      {
        id: "x4", description: "Ava — Field trip fee", amount: 25, paidById: CO,
        splitOtherShare: 0.5, date: ago(60 * 24 * 2), category: "School",
        status: "open",
      },
    ],
    journal: [
      {
        id: "j1", title: "Exchange went smoothly",
        body: "Picked up the kids at 6pm at the agreed spot. Both kids in good spirits. Jordan was on time. Ava mentioned she left her math book — texted Jordan and it's being dropped tomorrow.",
        createdAt: ago(60 * 20), mood: "good", shared: false,
      },
      {
        id: "j2", title: "Leo's reading is improving",
        body: "Spent 30 min reading together. He's getting more confident with longer words. Want to keep this going on both households' nights.",
        createdAt: ago(60 * 24 * 3), mood: "good", shared: false,
      },
    ],
    info: [
      { id: "i1", childId: KID1, kind: "medical", label: "Allergy", value: "Penicillin (mild rash)" },
      { id: "i2", childId: KID1, kind: "medical", label: "Insurance ID", value: "BCBS — XJ4920185" },
      { id: "i3", childId: KID1, kind: "school", label: "Teacher", value: "Ms. Rivera, Room 14" },
      { id: "i4", childId: KID2, kind: "medical", label: "Blood type", value: "O+" },
      { id: "i5", childId: KID2, kind: "school", label: "Bus route", value: "Route 7, pickup 7:45am" },
      { id: "i6", childId: KID2, kind: "clothing", label: "Shoe size", value: "Youth 1" },
    ],
  };
}
