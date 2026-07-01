import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// Thin, fire-and-forget haptics wrapper. On iOS this drives the Taptic Engine;
// on the web it falls back to navigator.vibrate where available and silently
// no-ops everywhere else — so call sites never need to care about platform.

const quiet = () => {
  /* haptics are a progressive enhancement */
};

/** Small tick — checking an item off a pull-list, starring a card. */
export function tapLight(): void {
  Haptics.impact({ style: ImpactStyle.Light }).catch(quiet);
}

/** Firmer tap — advancing a loaner tray's status. */
export function tapMedium(): void {
  Haptics.impact({ style: ImpactStyle.Medium }).catch(quiet);
}

/** Success flourish — the pull-list hits "Case ready". */
export function successBuzz(): void {
  Haptics.notification({ type: NotificationType.Success }).catch(quiet);
}
