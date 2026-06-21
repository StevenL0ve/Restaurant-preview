// Builds the CoParent brand mark as an SVG: a heart formed by two parent
// figures (cyan→blue and purple) cradling a coral child with raised arms and a
// small heart above. Exported so the icon generator and previews share one source.

// Outer heart outline as cubic segments [c1x,c1y, c2x,c2y, x,y], starting at the
// top-center dip and travelling clockwise. Center of mass ≈ (256, 285).
const HEART_START = [256, 202];
const HEART_SEGS = [
  [232, 168, 198, 152, 152, 152],
  [96, 152, 86, 214, 96, 254],
  [110, 312, 178, 372, 256, 432],
  [334, 372, 402, 312, 416, 254],
  [426, 214, 416, 152, 360, 152],
  [314, 152, 280, 168, 256, 202],
];
const CENTER = [256, 288];
const INNER_K = 0.6;

function scale([x, y], k, [cx, cy]) {
  return [cx + (x - cx) * k, cy + (y - cy) * k];
}
function heartPath(k = 1) {
  const s = k === 1 ? HEART_START : scale(HEART_START, k, CENTER);
  let d = `M${s[0].toFixed(1)},${s[1].toFixed(1)}`;
  for (const seg of HEART_SEGS) {
    const c1 = scale([seg[0], seg[1]], k, CENTER);
    const c2 = scale([seg[2], seg[3]], k, CENTER);
    const p = scale([seg[4], seg[5]], k, CENTER);
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  }
  return d + "Z";
}

// Band = outer heart with the inner heart cut out (even-odd), split L/R by clip.
const BAND = `${heartPath(1)} ${heartPath(INNER_K)}`;

function smallHeart(cx, cy, w) {
  const r = w / 2;
  return (
    `M${cx},${cy + r * 0.9} ` +
    `C${cx - r * 0.2},${cy + r * 0.4} ${cx - r},${cy + r * 0.1} ${cx - r},${cy - r * 0.35} ` +
    `C${cx - r},${cy - r * 0.95} ${cx - r * 0.35},${cy - r} ${cx},${cy - r * 0.45} ` +
    `C${cx + r * 0.35},${cy - r} ${cx + r},${cy - r * 0.95} ${cx + r},${cy - r * 0.35} ` +
    `C${cx + r},${cy + r * 0.1} ${cx + r * 0.2},${cy + r * 0.4} ${cx},${cy + r * 0.9}Z`
  );
}

export function buildMarkSVG({ size = 512, bg = "transparent", pad = 0 } = {}) {
  const bgRect =
    bg === "transparent"
      ? ""
      : `<rect width="512" height="512" fill="${bg}"/>`;
  // `pad` (0..0.2) shrinks the mark toward the center — used for maskable icons
  // so the design survives the platform's safe-zone crop.
  const s = 1 - pad * 2;
  const t = (pad * 512).toFixed(1);
  const open = pad > 0 ? `<g transform="translate(${t},${t}) scale(${s.toFixed(3)})">` : "";
  const close = pad > 0 ? `</g>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gBlue" x1="90" y1="120" x2="256" y2="430" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="gPurple" x1="422" y1="120" x2="256" y2="430" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="gCoral" x1="256" y1="240" x2="256" y2="380" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#f43f5e"/>
    </linearGradient>
    <clipPath id="clipL"><rect x="0" y="0" width="256" height="512"/></clipPath>
    <clipPath id="clipR"><rect x="256" y="0" width="256" height="512"/></clipPath>
  </defs>
  ${bgRect}
  ${open}
  <!-- heart body, two-tone -->
  <path d="${BAND}" fill="url(#gBlue)" fill-rule="evenodd" clip-path="url(#clipL)"/>
  <path d="${BAND}" fill="url(#gPurple)" fill-rule="evenodd" clip-path="url(#clipR)"/>
  <!-- parent heads -->
  <circle cx="150" cy="120" r="42" fill="url(#gBlue)"/>
  <circle cx="362" cy="120" r="42" fill="url(#gPurple)"/>
  <!-- child: small heart, raised arms, head, trunk -->
  <path d="${smallHeart(256, 250, 52)}" fill="url(#gCoral)"/>
  <g stroke="url(#gCoral)" stroke-width="22" stroke-linecap="round" fill="none">
    <path d="M256,340 L210,300"/>
    <path d="M256,340 L302,300"/>
    <path d="M256,338 L256,372"/>
  </g>
  <circle cx="256" cy="312" r="26" fill="url(#gCoral)"/>
  ${close}
</svg>`;
}
