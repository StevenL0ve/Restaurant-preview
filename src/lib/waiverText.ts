import type { WaiverVenue } from "../types";

// Plain-language liability waivers shown before a member's first booking at a
// venue involving physical activity or bodywork. Signing records the member's
// typed name and a timestamp.

export const WAIVER_TEXT: Record<WaiverVenue, string> = {
  yoga:
    "I understand that yoga includes physical movement and carries risk of injury. " +
    "I confirm I am physically able to participate, will work within my own limits, " +
    "and will tell my instructor about any injuries, conditions, or pregnancy. " +
    "I assume responsibility for my participation and release The Common Ground Projects, " +
    "its instructors, and staff from liability for any injury sustained during class.",
  zenden:
    "I understand that infrared sauna, red light therapy, hot and cold plunge, and " +
    "salt chamber sessions at the Zen Den carry inherent risks, including heat and cold exposure. " +
    "I confirm I have no medical condition (including heart conditions or pregnancy) " +
    "that makes these services unsafe without a doctor's approval, and I will exit any " +
    "session if I feel unwell. I release The Common Ground Projects and its staff from " +
    "liability for any injury or reaction arising from these services.",
  massage:
    "I understand that massage therapy involves physical touch and manipulation of soft " +
    "tissue. I have disclosed any medical conditions, injuries, allergies, or pregnancy to " +
    "my therapist, and I understand massage is not a substitute for medical care. I consent " +
    "to treatment and release The Common Ground Projects and its therapists from liability " +
    "for any injury or reaction arising from my session.",
};

export const WAIVER_TITLE: Record<WaiverVenue, string> = {
  yoga: "Yoga Studio Liability Waiver",
  zenden: "Zen Den Wellness Waiver",
  massage: "Massage Therapy Consent & Waiver",
};
