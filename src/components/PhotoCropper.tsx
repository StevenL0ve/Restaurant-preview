import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Frame your profile photo: pinch or slide to zoom, drag to move, then
// Use photo. Everything happens on the device; the result is a 256px JPEG.
const OUT = 256;
const VIEW = 260;
const MAX_SRC = 1600; // big library photos are shrunk first so phones don't run out of memory

type Pt = { x: number; y: number };

// Decodes through <img>, which on iPhone handles HEIC photos and applies
// the photo's rotation, then draws it into a small canvas.
function loadPhoto(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, MAX_SRC / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.naturalWidth * k));
      c.height = Math.max(1, Math.round(im.naturalHeight * k));
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(im, 0, 0, c.width, c.height);
      resolve(c);
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    im.src = url;
  });
}

export function PhotoCropper({ file, onDone, onCancel }: { file: File; onDone: (dataUrl: string) => void; onCancel: () => void }) {
  const [img, setImg] = useState<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  // Center of the view, in image pixels.
  const [center, setCenter] = useState<Pt | null>(null);
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ start: Pt; center: Pt; dist: number; zoom: number } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    setImg(null); setFailed(false); setZoom(1); setCenter(null);
    loadPhoto(file).then((c) => { if (alive) setImg(c); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [file]);

  // Keep the page behind from scrolling while framing.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const base = img ? VIEW / Math.min(img.width, img.height) : 1;
  const scale = base * zoom;
  const clampCenter = (c: Pt, s = scale): Pt => {
    if (!img) return c;
    const half = VIEW / 2 / s;
    return {
      x: Math.min(img.width - half, Math.max(half, c.x)),
      y: Math.min(img.height - half, Math.max(half, c.y)),
    };
  };
  const cur = img ? clampCenter(center ?? { x: img.width / 2, y: img.height / 2 }) : { x: 0, y: 0 };

  function draw(ctx: CanvasRenderingContext2D, size: number) {
    if (!img) return;
    const k = size / VIEW;
    const s = scale * k;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, size / 2 - cur.x * s, size / 2 - cur.y * s, img.width * s, img.height * s);
  }

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) draw(ctx, c.width);
  });

  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const mid = (): Pt => {
    const ps = [...pointers.current.values()];
    return { x: ps.reduce((n, p) => n + p.x, 0) / ps.length, y: ps.reduce((n, p) => n + p.y, 0) / ps.length };
  };
  function begin() {
    gesture.current = { start: mid(), center: cur, dist: dist(), zoom };
  }
  function down(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    begin();
  }
  function move(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId) || !gesture.current || !img) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    let z = zoom;
    if (pointers.current.size >= 2 && g.dist > 0) {
      z = Math.min(4, Math.max(1, g.zoom * (dist() / g.dist)));
      setZoom(z);
    }
    const s = base * z;
    const m = mid();
    setCenter(clampCenter({ x: g.center.x - (m.x - g.start.x) / s, y: g.center.y - (m.y - g.start.y) / s }, s));
  }
  function up(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) begin(); else gesture.current = null;
  }

  function use() {
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = OUT; out.height = OUT;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    draw(ctx, OUT);
    onDone(out.toDataURL("image/jpeg", 0.85));
  }

  const px = Math.round(VIEW * Math.min(3, window.devicePixelRatio || 1));
  return createPortal(
    <div className="cropper-scrim" role="dialog" aria-modal="true" aria-label="Frame your photo">
      <div className="cropper-card">
        <h3>Frame your photo</h3>
        <p className="muted small">Drag to move, pinch or slide to zoom. Just you, no patients.</p>
        <div className="cropper-view">
          {failed ? (
            <p className="cropper-msg">That photo couldn't be opened. Try another one, or a screenshot of it.</p>
          ) : !img ? (
            <p className="cropper-msg">Loading photo…</p>
          ) : (
            <canvas ref={canvas} width={px} height={px} style={{ width: VIEW, height: VIEW }}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          )}
          <div className="cropper-ring" />
        </div>
        <label className="cropper-zoom">
          <span className="muted small">Zoom</span>
          <input type="range" min={1} max={4} step={0.01} value={zoom} disabled={!img}
            onChange={(e) => { const z = Number(e.target.value); setZoom(z); setCenter(clampCenter(cur, base * z)); }} />
        </label>
        <div className="form-actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" disabled={!img} onClick={use}>Use photo</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
