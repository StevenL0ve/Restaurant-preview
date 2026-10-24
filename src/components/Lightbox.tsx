// Full-screen photo viewer: tap anywhere to close. Used for item photos
// (tap a REF chip) and the Mayo stand / back table setup shots.
export function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div className="lightbox" role="dialog" aria-label={alt} onClick={onClose}>
      <img src={src} alt={alt} />
      <span className="lightbox-caption">{alt}</span>
      <button className="lightbox-close" aria-label="Close" onClick={onClose}>✕</button>
    </div>
  );
}
