/** Colored initials chip for a surgeon or on-call person — soft gradient +
 *  ring for depth. Accepts any record with a name, color, and initials. */
export function Avatar({
  surgeon,
  size = 36,
}: {
  surgeon: { name: string; color: string; initials: string };
  size?: number;
}) {
  return (
    <span
      className="avatar"
      style={{
        background: `linear-gradient(135deg, ${surgeon.color}, color-mix(in srgb, ${surgeon.color} 62%, #0b1220))`,
        boxShadow: `0 2px 8px -2px color-mix(in srgb, ${surgeon.color} 55%, transparent), inset 0 1px 0 rgba(255,255,255,0.25)`,
        width: size,
        height: size,
        fontSize: size * 0.34,
      }}
      title={surgeon.name}
      aria-hidden
    >
      {surgeon.initials}
    </span>
  );
}
