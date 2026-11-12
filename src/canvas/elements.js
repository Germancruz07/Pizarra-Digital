import { uid } from '../utils/id';
import { FONT_FAMILY, LINE_HEIGHT, SHAPE_TYPES } from './constants';
import { clamp, distToSegment, normalizeRect, pointInPolygon, pointInRect } from './geometry';

/**
 * Modelo de elementos (inmutable). El orden del array define el z-index.
 *  - Caja:   rect | ellipse | triangle | text | image  -> x, y, width, height
 *  - Puntos: freedraw | line | arrow | erase           -> points: [[x, y], ...] en coordenadas de mundo
 */

const boundsCache = new WeakMap();

export const isLinear = (el) => el.type === 'line' || el.type === 'arrow';
export const isShape = (el) => SHAPE_TYPES.includes(el.type);

export function fontString(size, weight) {
  return `${weight === 'bold' ? 700 : 400} ${size}px ${FONT_FAMILY}`;
}

let measureCtx = null;
export function measureText(text, fontSize, fontWeight) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = fontString(fontSize, fontWeight);
  const lines = (text || '').split('\n');
  let width = 0;
  for (const line of lines) width = Math.max(width, measureCtx.measureText(line || ' ').width);
  return { width: Math.ceil(width) + 2, height: Math.ceil(lines.length * fontSize * LINE_HEIGHT) };
}

/** Propiedades de estilo relevantes para cada tipo. */
const STYLE_KEYS = {
  freedraw: ['strokeColor', 'strokeWidth', 'opacity'],
  line: ['strokeColor', 'strokeWidth', 'opacity', 'arrowStart', 'arrowEnd'],
  arrow: ['strokeColor', 'strokeWidth', 'opacity', 'arrowStart', 'arrowEnd'],
  rect: ['strokeColor', 'strokeWidth', 'opacity', 'fillColor', 'fillEnabled', 'fillOpacity'],
  ellipse: ['strokeColor', 'strokeWidth', 'opacity', 'fillColor', 'fillEnabled', 'fillOpacity'],
  triangle: ['strokeColor', 'strokeWidth', 'opacity', 'fillColor', 'fillEnabled', 'fillOpacity'],
  text: ['strokeColor', 'opacity', 'fontSize', 'fontWeight', 'textAlign'],
  image: ['opacity'],
  erase: ['strokeWidth'],
};

export function styleFor(type, style) {
  const out = {};
  for (const key of STYLE_KEYS[type] || []) if (style[key] !== undefined) out[key] = style[key];
  return out;
}

export function createElement(type, style = {}, geometry = {}) {
  const base = { id: uid('el_'), type, ...styleFor(type, style), ...geometry };
  if (type === 'image' && base.opacity === undefined) base.opacity = 1;
  if (type === 'text') {
    const m = measureText(base.text || '', base.fontSize, base.fontWeight);
    base.width = m.width;
    base.height = m.height;
  }
  return base;
}

/** Aplica un cambio de estilo solo con las claves que tienen sentido para el elemento. */
export function applyStylePatch(el, patch) {
  const keys = STYLE_KEYS[el.type] || [];
  let changed = false;
  const next = { ...el };
  for (const key of Object.keys(patch)) {
    if (keys.includes(key) && el[key] !== patch[key]) {
      next[key] = patch[key];
      changed = true;
    }
  }
  if (!changed) return el;
  if (el.type === 'text' && ('fontSize' in patch || 'fontWeight' in patch)) {
    Object.assign(next, measureText(next.text, next.fontSize, next.fontWeight));
  }
  return next;
}

export function getElementBounds(el) {
  let b = boundsCache.get(el);
  if (b) return b;
  if (el.points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of el.points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    b = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  } else {
    b = { x: el.x, y: el.y, width: el.width, height: el.height };
  }
  boundsCache.set(el, b);
  return b;
}

/** Límites incluyendo grosor del trazo y puntas de flecha (para exportar/miniaturas). */
export function getVisualBounds(el) {
  const b = getElementBounds(el);
  const pad = (el.strokeWidth || 0) / 2 + (el.type === 'arrow' ? Math.max(12, (el.strokeWidth || 0) * 3) : 0);
  return { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
}

export function trianglePoints(el) {
  return [
    [el.x + el.width / 2, el.y],
    [el.x + el.width, el.y + el.height],
    [el.x, el.y + el.height],
  ];
}

/** ¿El punto (px,py) del mundo toca el elemento? `tol` en unidades de mundo. */
export function hitTest(el, px, py, tol) {
  if (el.type === 'erase') return false;
  const b = getElementBounds(el);
  const t = tol + (el.strokeWidth || 0) / 2;
  if (!pointInRect(px, py, b, t + (el.type === 'arrow' ? 14 : 0))) return false;

  switch (el.type) {
    case 'text':
    case 'image':
      return true;
    case 'rect': {
      if (el.fillEnabled) return true;
      const inner = { x: b.x + t, y: b.y + t, width: b.width - 2 * t, height: b.height - 2 * t };
      return !(inner.width > 0 && inner.height > 0 && pointInRect(px, py, inner));
    }
    case 'ellipse': {
      const rx = b.width / 2;
      const ry = b.height / 2;
      if (rx < 2 || ry < 2) return true;
      const d = Math.hypot((px - (b.x + rx)) / rx, (py - (b.y + ry)) / ry);
      if (el.fillEnabled && d <= 1) return true;
      return Math.abs(d - 1) * Math.min(rx, ry) <= t;
    }
    case 'triangle': {
      const pts = trianglePoints(el);
      if (el.fillEnabled && pointInPolygon(px, py, pts)) return true;
      for (let i = 0; i < 3; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % 3];
        if (distToSegment(px, py, x1, y1, x2, y2) <= t) return true;
      }
      return false;
    }
    case 'line':
    case 'arrow': {
      const [[x1, y1], [x2, y2]] = el.points;
      return distToSegment(px, py, x1, y1, x2, y2) <= t;
    }
    case 'freedraw': {
      const pts = el.points;
      if (pts.length === 1) return Math.hypot(px - pts[0][0], py - pts[0][1]) <= t;
      for (let i = 1; i < pts.length; i++) {
        if (distToSegment(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= t) return true;
      }
      return false;
    }
    default:
      return false;
  }
}

export function moveElement(el, dx, dy) {
  if (el.points) return { ...el, points: el.points.map(([x, y]) => [x + dx, y + dy]) };
  return { ...el, x: el.x + dx, y: el.y + dy };
}

/** Mapea el elemento desde los límites `from` hacia la caja `to` (que puede tener ancho/alto negativos). */
export function transformElement(el, from, to) {
  const sx = from.width ? to.width / from.width : 1;
  const sy = from.height ? to.height / from.height : 1;
  const mx = (x) => (from.width ? to.x + (x - from.x) * sx : x + (to.x - from.x));
  const my = (y) => (from.height ? to.y + (y - from.y) * sy : y + (to.y - from.y));

  if (el.points) return { ...el, points: el.points.map(([x, y]) => [mx(x), my(y)]) };

  const box = normalizeRect(mx(el.x), my(el.y), mx(el.x + el.width), my(el.y + el.height));
  if (el.type === 'text') {
    const scale = from.height ? Math.abs(sy) : Math.abs(sx);
    const fontSize = clamp(el.fontSize * (scale || 1), 4, 2000);
    const m = measureText(el.text, fontSize, el.fontWeight);
    return { ...el, x: box.x, y: box.y, fontSize, width: m.width, height: m.height };
  }
  return { ...el, ...box };
}

export function duplicateElements(elements, dx = 24, dy = 24) {
  return elements.map((el) => ({ ...moveElement(el, dx, dy), id: uid('el_') }));
}
