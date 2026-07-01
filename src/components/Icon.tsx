import type { ReactNode } from "react";

// A small, consistent line-icon set (24px grid, 2px stroke, round caps) so the
// app's chrome reads like a native app instead of a wall of emoji. Monochrome
// and currentColor so icons inherit text color and theme cleanly.

export type IconName =
  | "home" | "cards" | "surgeon" | "truck" | "building" | "search" | "settings"
  | "plus" | "star" | "star-fill" | "back" | "next" | "check" | "close"
  | "share" | "copy" | "edit" | "trash" | "phone" | "chat" | "calendar"
  | "clock" | "download" | "upload" | "filter" | "pin" | "sun" | "moon";

const gearTeeth = Array.from({ length: 6 }).map((_, i) => (
  <rect key={i} x="10.4" y="1.6" width="3.2" height="3.6" rx="1.2" fill="currentColor" stroke="none" transform={`rotate(${i * 60} 12 12)`} />
));

const PATHS: Record<IconName, ReactNode> = {
  home: <>
    <path d="M4 11 12 4l8 7v8.2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.2z" />
    <path d="M9.5 21v-6h5v6" />
  </>,
  cards: <>
    <rect x="8" y="7" width="11" height="12" rx="2" />
    <path d="M6 15.5V6.5a2 2 0 0 1 2-2h7" />
  </>,
  surgeon: <>
    <circle cx="12" cy="9" r="3.4" />
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
  </>,
  truck: <>
    <rect x="2.5" y="7" width="11" height="8" rx="1.5" />
    <path d="M13.5 9.5h3.4l2.6 3V15h-6z" />
    <circle cx="6.8" cy="17.4" r="1.8" />
    <circle cx="16.6" cy="17.4" r="1.8" />
  </>,
  building: <>
    <path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h6A1.5 1.5 0 0 1 14 4.5V21" />
    <path d="M14 9.5h3.5A1.5 1.5 0 0 1 19 11v10" />
    <path d="M3 21h18" />
    <path d="M8 7h2M8 11h2M8 15h2" />
  </>,
  search: <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </>,
  settings: <>
    {gearTeeth}
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="2" />
  </>,
  plus: <path d="M12 5v14M5 12h14" />,
  star: <path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.6l5.9-.8z" />,
  "star-fill": <path d="M12 3.4l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.6l5.9-.8z" fill="currentColor" stroke="none" />,
  back: <path d="m14 6-6 6 6 6" />,
  next: <path d="m10 6 6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  share: <>
    <circle cx="18" cy="5" r="2.4" />
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="18" cy="19" r="2.4" />
    <path d="M8.1 10.8 15.9 6.2M8.1 13.2 15.9 17.8" />
  </>,
  copy: <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </>,
  edit: <path d="M4 20l1-4L16.4 4.6a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8 19l-4 1zM14.5 6.5l3 3" />,
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 12a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-12" />,
  phone: <path d="M6.5 3.5c1 0 1.8.7 2 1.7l.6 2.3a2 2 0 0 1-.5 1.9l-1 1a12 12 0 0 0 4.5 4.5l1-1a2 2 0 0 1 1.9-.5l2.3.6c1 .2 1.7 1 1.7 2v2.4a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" />,
  chat: <path d="M20 13a2 2 0 0 1-2 2H9l-4 4V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z" />,
  calendar: <>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M4 10h16" />
  </>,
  clock: <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4.4l3 1.8" />
  </>,
  download: <path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 19.5h14" />,
  upload: <path d="M12 20V9M7.5 12.5 12 8l4.5 4.5M5 4.5h14" />,
  filter: <path d="M4 5h16l-6 8v5l-4 2v-7z" />,
  pin: <>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </>,
  sun: <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" />
  </>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />,
};

export function Icon({
  name,
  size = 22,
  className,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
