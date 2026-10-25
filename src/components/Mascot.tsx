// Jolie, the ORSync mascot: a cheerful surgical scrub sponge (the kind
// with the bristle brush on the bottom) giving a thumbs up. She's the
// app's friendly assistant: she appears at friendly moments (welcome,
// onboarding, empty screens, a finished setup), one per screen, so the
// app stays calm, and later she fronts the app's AI help. `animate` lets
// her bob and tilt a little so she reads as alive, not as a logo.
export const MASCOT_NAME = "Jolie";

export function Mascot({ size = 96, className, animate = false }: { size?: number; className?: string; animate?: boolean }) {
  const src = `${import.meta.env.BASE_URL}brand/${size <= 110 ? "mascot-sm.png" : "mascot.png"}`;
  return (
    <img
      className={"mascot" + (animate ? " mascot-live" : "") + (className ? ` ${className}` : "")}
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={Math.round(size * 0.951)}
      loading="lazy"
    />
  );
}
