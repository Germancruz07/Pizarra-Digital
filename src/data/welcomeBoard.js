import { createElement } from '../canvas/elements';

export const WELCOME_IMAGE_SIZE = { width: 520, height: 340 };

export const WELCOME_IMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="340" viewBox="0 0 520 340">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="520" height="340" rx="28" fill="url(#g)"/>
  <circle cx="430" cy="78" r="44" fill="#fde68a" opacity="0.95"/>
  <path d="M0 268 L130 150 L240 250 L330 176 L520 300 L520 312 Q520 340 492 340 L28 340 Q0 340 0 312 Z" fill="#ffffff" opacity="0.28"/>
  <path d="M0 300 L150 210 L280 290 L400 230 L520 320 L520 312 Q520 340 492 340 L28 340 Q0 340 0 312 Z" fill="#ffffff" opacity="0.25"/>
  <text x="36" y="80" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#ffffff">Imagen de ejemplo</text>
  <text x="36" y="118" font-family="Arial, Helvetica, sans-serif" font-size="19" fill="#ffffff" opacity="0.92">Muévela, redimensiónala o sube la tuya</text>
</svg>`;

function wave(x0, x1, y, amp, freq) {
  const pts = [];
  for (let x = x0; x <= x1; x += 6) pts.push([x, y + Math.sin((x - x0) * freq) * amp]);
  return pts;
}

/** Contenido de la pizarra de bienvenida que se crea con cada cuenta nueva. */
export function buildWelcomeElements(imageId) {
  const ink = { strokeColor: '#1e1e2e', opacity: 1 };
  return [
    createElement('text', { ...ink, fontSize: 44, fontWeight: 'bold', textAlign: 'left' }, {
      x: 80, y: 50, text: '¡Bienvenido a tu pizarra! 👋',
    }),
    createElement('text', { strokeColor: '#64748b', opacity: 1, fontSize: 20, fontWeight: 'normal', textAlign: 'left' }, {
      x: 82, y: 116,
      text: 'Todo es editable: selecciona, mueve, redimensiona o cambia colores desde el panel lateral.',
    }),

    createElement('rect', {
      strokeColor: '#f59e0b', strokeWidth: 2, opacity: 1, fillColor: '#fde68a', fillEnabled: true, fillOpacity: 1,
    }, { x: 80, y: 180, width: 310, height: 220 }),
    createElement('text', { ...ink, fontSize: 20, fontWeight: 'normal', textAlign: 'left' }, {
      x: 104, y: 200,
      text: 'Atajos rápidos\nV  Selección   ·   P  Lápiz\nE  Borrador    ·   T  Texto\nR  Rectángulo ·   O  Elipse\nCtrl+Z deshacer · Ctrl+Y rehacer',
    }),

    createElement('arrow', { strokeColor: '#6366f1', strokeWidth: 4, opacity: 1, arrowStart: false, arrowEnd: true }, {
      points: [[405, 290], [460, 278]],
    }),
    createElement('ellipse', {
      strokeColor: '#6366f1', strokeWidth: 3, opacity: 1, fillColor: '#c7d2fe', fillEnabled: true, fillOpacity: 1,
    }, { x: 475, y: 200, width: 220, height: 150 }),
    createElement('text', { strokeColor: '#3730a3', opacity: 1, fontSize: 22, fontWeight: 'bold', textAlign: 'center' }, {
      x: 532, y: 260, text: 'Figuras',
    }),

    createElement('arrow', { strokeColor: '#16a34a', strokeWidth: 4, opacity: 1, arrowStart: true, arrowEnd: true }, {
      points: [[712, 275], [790, 275]],
    }),
    createElement('triangle', {
      strokeColor: '#16a34a', strokeWidth: 3, opacity: 1, fillColor: '#bbf7d0', fillEnabled: true, fillOpacity: 1,
    }, { x: 805, y: 185, width: 180, height: 160 }),

    createElement('freedraw', { strokeColor: '#ec4899', strokeWidth: 6, opacity: 1 }, {
      points: wave(100, 600, 490, 28, 0.03),
    }),
    createElement('text', { strokeColor: '#be185d', opacity: 1, fontSize: 22, fontWeight: 'normal', textAlign: 'left' }, {
      x: 250, y: 535, text: 'Dibujo a mano alzada ✍️',
    }),

    createElement('image', { opacity: 1 }, { imageId, x: 720, y: 400, width: 286, height: 187 }),

    createElement('line', { strokeColor: '#cbd5e1', strokeWidth: 2, opacity: 1, arrowStart: false, arrowEnd: false }, {
      points: [[80, 630], [1006, 630]],
    }),
    createElement('text', { strokeColor: '#64748b', opacity: 1, fontSize: 17, fontWeight: 'normal', textAlign: 'left' }, {
      x: 80, y: 648,
      text: 'Doble clic en un texto para editarlo  ·  Rueda del ratón para desplazarte  ·  Ctrl + rueda para zoom  ·  Espacio + arrastrar para moverte',
    }),
  ];
}
