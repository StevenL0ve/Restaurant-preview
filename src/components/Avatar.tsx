import type { Surgeon } from "../types";

/** Colored initials chip for a surgeon. */
export function Avatar({ surgeon, size = 36 }: { surgeon: Surgeon; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ background: surgeon.color, width: size, height: size, fontSize: size * 0.34 }}
      title={surgeon.name}
      aria-hidden
    >
      {surgeon.initials}
    </span>
  );
}
