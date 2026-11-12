export const FONT_FAMILY = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';
export const LINE_HEIGHT = 1.25;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;

export const SHAPE_TYPES = ['rect', 'ellipse', 'triangle'];
export const LINEAR_TYPES = ['line', 'arrow'];
export const SHAPE_TOOLS = ['rect', 'ellipse', 'triangle'];
export const LINE_TOOLS = ['line', 'arrow', 'biarrow'];

export const STROKE_PRESETS = [1, 2, 4, 8, 12, 20, 30];
export const FONT_PRESETS = [16, 20, 28, 40, 56, 80];
export const ERASER_PRESETS = [8, 16, 32, 64];

export const PALETTE = [
  '#1e1e2e', '#ffffff', '#6b7280', '#ef4444', '#f97316', '#f59e0b',
  '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#92400e',
  '#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e9d5ff', '#e2e8f0',
];

export const LIGHT_STROKE = '#1e1e2e';
export const DARK_STROKE = '#f4f4f5';

export const BACKGROUNDS = {
  white: { label: 'Blanco', color: '#ffffff', pattern: null, dark: false },
  grid: { label: 'Cuadrícula', color: '#ffffff', pattern: 'grid', patternColor: '#e6e8ef', dark: false },
  dots: { label: 'Puntos', color: '#fbfbfd', pattern: 'dots', patternColor: '#c3c8d4', dark: false },
  dark: { label: 'Oscuro', color: '#16161d', pattern: 'dots', patternColor: '#30303d', dark: true },
};

export const DEFAULT_STYLE = {
  strokeColor: LIGHT_STROKE,
  fillColor: '#a5b4fc',
  fillEnabled: false,
  strokeWidth: 4,
  opacity: 1,
  fillOpacity: 1,
  fontSize: 28,
  fontWeight: 'normal',
  textAlign: 'left',
};

export const DEFAULT_ERASER = { size: 24, mode: 'object' };

/** Estilo CSS que imita el fondo del lienzo (para miniaturas y selectores). */
export function backgroundCss(key, cell = 14) {
  const bg = BACKGROUNDS[key] || BACKGROUNDS.white;
  if (bg.pattern === 'grid') {
    return {
      backgroundColor: bg.color,
      backgroundImage: `linear-gradient(${bg.patternColor} 1px, transparent 1px), linear-gradient(90deg, ${bg.patternColor} 1px, transparent 1px)`,
      backgroundSize: `${cell}px ${cell}px`,
    };
  }
  if (bg.pattern === 'dots') {
    return {
      backgroundColor: bg.color,
      backgroundImage: `radial-gradient(${bg.patternColor} 1.3px, transparent 1.4px)`,
      backgroundSize: `${cell}px ${cell}px`,
    };
  }
  return { backgroundColor: bg.color };
}
