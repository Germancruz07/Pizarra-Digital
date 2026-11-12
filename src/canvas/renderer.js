import { BACKGROUNDS, LINE_HEIGHT } from './constants';
import { fontString, getVisualBounds, trianglePoints } from './elements';
import { clamp, unionBounds } from './geometry';
import { withAlpha } from '../utils/color';

/* ----------------------------------------------------------------- fondo */

/** Dibuja el fondo en coordenadas de pantalla (ctx con la transformación del dpr ya aplicada). */
export function drawBackground(ctx, key, vp, width, height) {
  const bg = BACKGROUNDS[key] || BACKGROUNDS.white;
  ctx.fillStyle = bg.color;
  ctx.fillRect(0, 0, width, height);
  if (!bg.pattern) return;

  let step = 24 * vp.zoom;
  while (step < 12) step *= 2;
  const ox = ((vp.x % step) + step) % step;
  const oy = ((vp.y % step) + step) % step;

  if (bg.pattern === 'grid') {
    ctx.strokeStyle = bg.patternColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox; x < width; x += step) {
      const px = Math.round(x) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
    }
    for (let y = oy; y < height; y += step) {
      const py = Math.round(y) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
    }
    ctx.stroke();
  } else {
    const r = clamp(1.3 * vp.zoom, 0.8, 2.2);
    ctx.fillStyle = bg.patternColor;
    ctx.beginPath();
    for (let x = ox; x < width; x += step) {
      for (let y = oy; y < height; y += step) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }
}

/* ------------------------------------------------------------- elementos */

function strokeFreehand(ctx, pts, width, color) {
  if (!pts?.length) return;
  const isDot =
    pts.length === 1 || (pts.length === 2 && pts[0][0] === pts[1][0] && pts[0][1] === pts[1][1]);
  if (isDot) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], Math.max(width / 2, 0.5), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }
  // Suavizado con curvas cuadráticas de Bézier pasando por los puntos medios.
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function arrowHead(ctx, fx, fy, tx, ty, size) {
  const len = Math.hypot(tx - fx, ty - fy);
  if (len < 1) return;
  const s = Math.min(size, len * 0.6);
  const a = Math.atan2(ty - fy, tx - fx);
  const spread = Math.PI / 7;
  ctx.beginPath();
  ctx.moveTo(tx - s * Math.cos(a - spread), ty - s * Math.sin(a - spread));
  ctx.lineTo(tx, ty);
  ctx.lineTo(tx - s * Math.cos(a + spread), ty - s * Math.sin(a + spread));
  ctx.stroke();
}

function shapePath(ctx, el) {
  ctx.beginPath();
  if (el.type === 'rect') {
    ctx.rect(el.x, el.y, el.width, el.height);
  } else if (el.type === 'ellipse') {
    ctx.ellipse(
      el.x + el.width / 2,
      el.y + el.height / 2,
      Math.max(el.width / 2, 0.5),
      Math.max(el.height / 2, 0.5),
      0,
      0,
      Math.PI * 2
    );
  } else {
    const pts = trianglePoints(el);
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.closePath();
  }
}

export function drawElement(ctx, el, { getImage, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (el.type) {
    case 'erase':
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      strokeFreehand(ctx, el.points, el.strokeWidth, '#000');
      break;

    case 'freedraw':
      strokeFreehand(ctx, el.points, el.strokeWidth, withAlpha(el.strokeColor, el.opacity));
      break;

    case 'rect':
    case 'ellipse':
    case 'triangle':
      shapePath(ctx, el);
      if (el.fillEnabled) {
        ctx.fillStyle = withAlpha(el.fillColor, el.fillOpacity ?? 1);
        ctx.fill();
      }
      if (el.strokeWidth > 0) {
        ctx.strokeStyle = withAlpha(el.strokeColor, el.opacity);
        ctx.lineWidth = el.strokeWidth;
        ctx.stroke();
      }
      break;

    case 'line':
    case 'arrow': {
      const [[x1, y1], [x2, y2]] = el.points;
      ctx.strokeStyle = withAlpha(el.strokeColor, el.opacity);
      ctx.lineWidth = el.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const head = Math.max(12, el.strokeWidth * 3);
      if (el.arrowEnd) arrowHead(ctx, x1, y1, x2, y2, head);
      if (el.arrowStart) arrowHead(ctx, x2, y2, x1, y1, head);
      break;
    }

    case 'text': {
      ctx.font = fontString(el.fontSize, el.fontWeight);
      ctx.textBaseline = 'top';
      ctx.textAlign = el.textAlign || 'left';
      ctx.fillStyle = withAlpha(el.strokeColor, el.opacity);
      const lh = el.fontSize * LINE_HEIGHT;
      const ax =
        el.textAlign === 'center' ? el.x + el.width / 2 : el.textAlign === 'right' ? el.x + el.width : el.x;
      const offset = (lh - el.fontSize) / 2;
      (el.text || '').split('\n').forEach((line, i) => ctx.fillText(line, ax, el.y + i * lh + offset));
      break;
    }

    case 'image': {
      const img = getImage?.(el.imageId);
      if (img) {
        ctx.globalAlpha = alpha * (el.opacity ?? 1);
        ctx.drawImage(img, el.x, el.y, el.width, el.height);
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      }
      break;
    }

    default:
      break;
  }
  ctx.restore();
}

export function drawElements(ctx, elements, opts) {
  for (const el of elements) drawElement(ctx, el, opts);
}

/* ---------------------------------------------------- exportar/miniatura */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function contentBounds(elements) {
  return unionBounds(elements.filter((e) => e.type !== 'erase').map(getVisualBounds));
}

/**
 * Compone fondo + capa de elementos. Los trazos de borrado por área solo
 * recortan la capa de elementos, nunca el fondo.
 */
function composite(elements, background, vp, w, h, getImage) {
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d');
  drawBackground(octx, background, vp, out.width, out.height);
  const layer = makeCanvas(w, h);
  const lctx = layer.getContext('2d');
  lctx.setTransform(vp.zoom, 0, 0, vp.zoom, vp.x, vp.y);
  drawElements(lctx, elements, { getImage });
  octx.drawImage(layer, 0, 0);
  return out;
}

export function exportBoardToCanvas(elements, background, { scale = 2, padding = 48, getImage } = {}) {
  const b = contentBounds(elements) || { x: 0, y: 0, width: 800, height: 600 };
  const w0 = b.width + padding * 2;
  const h0 = b.height + padding * 2;
  const s = Math.min(scale, 8192 / Math.max(w0, h0));
  const vp = { x: (padding - b.x) * s, y: (padding - b.y) * s, zoom: s };
  return composite(elements, background, vp, w0 * s, h0 * s, getImage);
}

export function createThumbnail(elements, background, getImage, W = 480, H = 300) {
  const b = contentBounds(elements);
  let vp = { x: 0, y: 0, zoom: 0.6 };
  if (b) {
    const pad = 22;
    const s = Math.min((W - pad * 2) / Math.max(b.width, 1), (H - pad * 2) / Math.max(b.height, 1), 1.5);
    vp = { zoom: s, x: W / 2 - (b.x + b.width / 2) * s, y: H / 2 - (b.y + b.height / 2) * s };
  }
  try {
    return composite(elements, background, vp, W, H, getImage).toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}
