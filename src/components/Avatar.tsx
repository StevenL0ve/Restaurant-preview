/** Who someone is, at a glance: their profile photo when they added one,
 *  else a colored initials chip (soft gradient + ring). Accepts any record
 *  with a name, color, initials, and optional photo. */
export function Avatar({
  surgeon,
  size = 36,
}: {
  surgeon: { name: string; color: string; initials: string; photo?: string };
  size?: number;
}) {
  if (surgeon.photo) {
    return (
      <img
        className="avatar avatar-photo"
        src={surgeon.photo}
        alt=""
        title={surgeon.name}
        aria-hidden
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    );
  }
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
