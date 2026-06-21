// An inline SVG wordmark/mark so the brand is crisp at any size and needs no
// image assets. A wine bottle resting in a cellar arch.
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="cellarArch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2230" />
          <stop offset="1" stopColor="#1c1018" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#cellarArch)" />
      <path
        d="M16 10h16v6a8 8 0 0 1-8 8 8 8 0 0 1-8-8z"
        fill="#7b1f2b"
        opacity="0.9"
      />
      <rect x="22" y="22" width="4" height="10" fill="#e9c46a" opacity="0.85" />
      <ellipse cx="24" cy="37" rx="9" ry="3" fill="#e9c46a" opacity="0.25" />
      <circle cx="24" cy="15" r="2.2" fill="#e9c46a" />
    </svg>
  );
}
