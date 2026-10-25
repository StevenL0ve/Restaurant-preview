import { useEffect, useRef, useState } from "react";

// Frame your profile photo: pinch or slide to zoom, drag to move, then
// Use photo. Everything happens on the device; the result is a 256px JPEG.
const OUT = 256;
const VIEW = 260;

export function PhotoCropper({ file, onDone, onCancel }: { file: File; onDone: (dataUrl: string) => void; onCancel: () => void }) {
  const [img, setImg] = useState<ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    createImageBitmap(file).then((b) => { if (alive) setImg(b); else b.close?.(); });
    return () => { alive = false; };
  }, [file]);

  // Base scale fills the square; zoom multiplies it.
  const base = img ? VIEW / Math.min(img.width, img.height) : 1;
  const scale = base * zoom;
  const w = img ? img.width * scale : 0;
  const h = img ? img.height * scale : 0;
  const clamp = (o: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(VIEW - w, o.x)),
    y: Math.min(0, Math.max(VIEW - h, o.y)),
  });

  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, VIEW, VIEW);
    const o = clamp({ x: off.x || (VIEW - w) / 2, y: off.y || (VIEW - h) / 2 });
    ctx.drawImage(img, o.x, o.y, w, h);
  });

  function start(e: React.PointerEvent) {
    const o = clamp({ x: off.x || (VIEW - w) / 2, y: off.y || (VIEW - h) / 2 });
    drag.current = { x: e.clientX, y: e.clientY, ox: o.x, oy: o.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    setOff(clamp({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) }));
  }
  function end() { drag.current = null; }

  function use() {
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = OUT; out.height = OUT;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    const o = clamp({ x: off.x || (VIEW - w) / 2, y: off.y || (VIEW - h) / 2 });
    const k = OUT / VIEW;
    ctx.drawImage(img, o.x * k, o.y * k, w * k, h * k);
    onDone(out.toDataURL("image/jpeg", 0.85));
  }

  return (
    <div className="cropper-scrim" role="dialog" aria-modal="true" aria-label="Frame your photo">
      <div className="cropper-card">
        <h3>Frame your photo</h3>
        <p className="muted small">Drag to move, slide to zoom. Just you, no patients.</p>
        <div className="cropper-view">
          <canvas ref={canvas} width={VIEW} height={VIEW} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
          <div className="cropper-ring" />
        </div>
        <label className="cropper-zoom">
          <span className="muted small">Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => { setZoom(Number(e.target.value)); }} />
        </label>
        <div className="form-actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" disabled={!img} onClick={use}>Use photo</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
