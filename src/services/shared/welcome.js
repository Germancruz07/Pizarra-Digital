import { buildWelcomeElements, WELCOME_IMAGE_SVG, WELCOME_IMAGE_SIZE } from '../../data/welcomeBoard';
import { createThumbnail } from '../../canvas/renderer';
import { loadImageFromBlob } from '../../utils/image';

/**
 * Crea la pizarra de bienvenida con cualquier adaptador (local o nube).
 * `boards` debe tener createBoard(ownerId, data) y saveBoard(ownerId, id, patch).
 */
export async function seedWelcome(ownerId, { assets, boards }) {
  const blob = new Blob([WELCOME_IMAGE_SVG], { type: 'image/svg+xml' });
  const imageId = await assets.saveImage(ownerId, blob, WELCOME_IMAGE_SIZE);
  const elements = buildWelcomeElements(imageId);
  const summary = await boards.createBoard(ownerId, {
    name: '👋 Pizarra de bienvenida',
    background: 'grid',
    elements,
    // Desplazada a la derecha para que el panel de propiedades no tape el contenido.
    viewport: { x: 280, y: 90, zoom: 0.8 },
  });
  try {
    const img = await loadImageFromBlob(blob);
    const thumbnail = createThumbnail(elements, 'grid', () => img);
    URL.revokeObjectURL(img.src);
    if (thumbnail) return await boards.saveBoard(ownerId, summary.id, { thumbnail });
  } catch {
    /* La miniatura se generará en el primer guardado. */
  }
  return summary;
}
