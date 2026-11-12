import { clamp } from './geometry';
import { MIN_ZOOM, MAX_ZOOM } from './constants';

export const screenToWorld = (vp, sx, sy) => ({ x: (sx - vp.x) / vp.zoom, y: (sy - vp.y) / vp.zoom });
export const worldToScreen = (vp, wx, wy) => ({ x: wx * vp.zoom + vp.x, y: wy * vp.zoom + vp.y });

export function zoomAtPoint(vp, nextZoom, sx, sy) {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const k = zoom / vp.zoom;
  return { zoom, x: sx - (sx - vp.x) * k, y: sy - (sy - vp.y) * k };
}

export function fitBoundsToView(bounds, width, height, padding = 90) {
  const availW = Math.max(100, width - padding * 2);
  const availH = Math.max(100, height - padding * 2 - 80);
  const zoom = clamp(
    Math.min(availW / Math.max(bounds.width, 1), availH / Math.max(bounds.height, 1)),
    MIN_ZOOM,
    2
  );
  return {
    zoom,
    x: width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: height / 2 - (bounds.y + bounds.height / 2) * zoom,
  };
}
