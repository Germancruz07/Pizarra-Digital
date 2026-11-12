export function isValidHex(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function normalizeHex(value) {
  if (!isValidHex(value)) return null;
  let hex = value.toLowerCase();
  if (hex.length === 4) hex = '#' + hex.slice(1).split('').map((c) => c + c).join('');
  return hex;
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex) || '#000000';
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

export function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(Number(v) || 0))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

const alphaCache = new Map();

export function withAlpha(hex, alpha = 1) {
  const key = hex + '|' + alpha;
  let v = alphaCache.get(key);
  if (!v) {
    const { r, g, b } = hexToRgb(hex);
    v = `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
    if (alphaCache.size > 500) alphaCache.clear();
    alphaCache.set(key, v);
  }
  return v;
}

export function isLightColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
}
