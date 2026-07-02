// Event notifications. In the native shells this becomes real push (APNs/FCM
// via a server); on the web we use the browser Notification API so the toggle
// does something honest today: permission is requested when alerts are turned
// on, and upcoming events fire local notifications while the app is open.

export type AlertStatus = "granted" | "denied" | "unsupported";

export async function requestEventAlerts(): Promise<AlertStatus> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const perm = await Notification.requestPermission();
    return perm === "granted" ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

export function notify(title: string, body: string): boolean {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
    return true;
  } catch {
    return false;
  }
}
