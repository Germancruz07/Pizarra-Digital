import { worldToScreen } from './viewport';

export const HANDLE_SIZE = 9;
export const SELECTION_PAD = 6;
export const ACCENT = '#6366f1';

export const HANDLE_CURSORS = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

export function screenRect(b, vp, pad = 0) {
  const p = worldToScreen(vp, b.x, b.y);
  return {
    x: p.x - pad,
    y: p.y - pad,
    width: b.width * vp.zoom + pad * 2,
    height: b.height * vp.zoom + pad * 2,
  };
}

export function getHandlePositions(bounds, vp, cornersOnly) {
  const r = screenRect(bounds, vp, SELECTION_PAD);
  const x1 = r.x;
  const y1 = r.y;
  const x2 = r.x + r.width;
  const y2 = r.y + r.height;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const all = [
    ['nw', x1, y1], ['n', mx, y1], ['ne', x2, y1], ['e', x2, my],
    ['se', x2, y2], ['s', mx, y2], ['sw', x1, y2], ['w', x1, my],
  ];
  const showEdges = !cornersOnly && r.width > 44 && r.height > 44;
  return all.filter(([n]) => n.length === 2 || showEdges).map(([name, x, y]) => ({ name, x, y }));
}

/** Nueva caja a partir del manejador arrastrado (puede quedar con ancho/alto negativos). */
export function resizeBox(b, handle, wx, wy, keepAspect) {
  let x1 = b.x;
  let y1 = b.y;
  let x2 = b.x + b.width;
  let y2 = b.y + b.height;
  if (handle.includes('w')) x1 = wx;
  if (handle.includes('e')) x2 = wx;
  if (handle.includes('n')) y1 = wy;
  if (handle.includes('s')) y2 = wy;

  if (keepAspect && handle.length === 2 && b.width > 0 && b.height > 0) {
    const ratio = b.width / b.height;
    let w = x2 - x1;
    let h = y2 - y1;
    if (Math.abs(w) / ratio > Math.abs(h)) h = (Math.sign(h) || 1) * (Math.abs(w) / ratio);
    else w = (Math.sign(w) || 1) * Math.abs(h) * ratio;
    if (handle.includes('w')) x1 = x2 - w;
    else x2 = x1 + w;
    if (handle.includes('n')) y1 = y2 - h;
    else y2 = y1 + h;
  }

  const minSize = 1;
  let width = x2 - x1;
  let height = y2 - y1;
  if (Math.abs(width) < minSize) width = (Math.sign(width) || 1) * minSize;
  if (Math.abs(height) < minSize) height = (Math.sign(height) || 1) * minSize;
  return { x: x1, y: y1, width, height };
}

function roundedSquare(ctx, x, y, size) {
  const h = size / 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - h, y - h, size, size, 2.5);
  else ctx.rect(x - h, y - h, size, size);
  ctx.fill();
  ctx.stroke();
}

export function drawHandles(ctx, handles) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  for (const h of handles) roundedSquare(ctx, h.x, h.y, HANDLE_SIZE);
}

export function drawPointHandles(ctx, points) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
