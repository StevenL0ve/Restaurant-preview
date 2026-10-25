// The illustrated navigation icons (home, whiteboard, clipboards, case
// cart, scalpel, loaner tray, ringing phone, hospital, magnifier, gear).
// Full-color art, so they don't tint with the theme; the active tab is
// shown by the pill behind the icon instead.
export type NavIconName =
  | "home" | "myday" | "cards" | "carts" | "surgeons"
  | "loaners" | "oncall" | "facilities" | "search" | "settings";

export function NavIcon({ name, size = 28 }: { name: NavIconName; size?: number }) {
  return (
    <img
      className="nav-art"
      src={`${import.meta.env.BASE_URL}icons/nav/${name}.png`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      draggable={false}
    />
  );
}
