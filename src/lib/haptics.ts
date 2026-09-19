import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// Tiny haptics helpers. On iOS/Android these hit the real haptic engine; on the
// web the plugin falls back to navigator.vibrate or throws — every call is
// wrapped so haptics are always a silent no-op when unavailable.

export async function tapLight(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* no haptics on this platform */
  }
}

export async function tapMedium(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* no haptics on this platform */
  }
}

export async function notifySuccess(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* no haptics on this platform */
  }
}
