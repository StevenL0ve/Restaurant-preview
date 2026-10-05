// The ORSync mascot: a cheerful scrub brush giving a thumbs up. She appears
// at friendly moments only (welcome, empty screens, a finished setup), one
// per screen, so the app stays calm. Decorative: always aria-hidden.
export function Mascot({ size = 96, className }: { size?: number; className?: string }) {
  const src = `${import.meta.env.BASE_URL}brand/${size <= 110 ? "mascot-sm.png" : "mascot.png"}`;
  return (
    <img
      className={"mascot" + (className ? ` ${className}` : "")}
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={Math.round(size * 0.951)}
      loading="lazy"
    />
  );
}
