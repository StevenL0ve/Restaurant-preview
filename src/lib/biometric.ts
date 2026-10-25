import { Capacitor } from "@capacitor/core";
import { BiometricAuth, BiometryType } from "@aparajita/capacitor-biometric-auth";

// Native biometric unlock: Face ID / Touch ID on iPhone, fingerprint or face
// unlock on Android. Only offered inside the installed app; the plugin's web
// implementation is a developer simulator, not real security, so the browser
// version simply doesn't show the option.

export interface BioStatus {
  available: boolean;
  /** What to call it in the UI: "Face ID", "Touch ID", "fingerprint"… */
  label: string;
}

const NONE: BioStatus = { available: false, label: "Face ID" };

function labelFor(t: BiometryType): string {
  switch (t) {
    case BiometryType.faceId: return "Face ID";
    case BiometryType.touchId: return "Touch ID";
    case BiometryType.fingerprintAuthentication: return "fingerprint";
    case BiometryType.faceAuthentication: return "face unlock";
    case BiometryType.irisAuthentication: return "iris unlock";
    default: return "biometrics";
  }
}

export async function bioStatus(): Promise<BioStatus> {
  if (!Capacitor.isNativePlatform()) return NONE;
  try {
    const r = await BiometricAuth.checkBiometry();
    // A passcode-only device can still lock the app (device credential).
    if (!r.isAvailable && !r.deviceIsSecure) return NONE;
    return { available: true, label: r.isAvailable ? labelFor(r.biometryType) : "your passcode" };
  } catch {
    return NONE;
  }
}

/** Prompt the system sheet. Resolves true on success; false on cancel/fail.
 *  The device passcode is always offered as a fallback so nobody gets locked
 *  out of their own cards by a bad Face ID day. */
export async function bioAuthenticate(reason: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      androidTitle: "Unlock ORSync",
      androidSubtitle: reason,
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  }
}
