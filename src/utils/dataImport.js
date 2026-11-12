import { assetService, boardService } from '../services';

const MAX_FILE_BYTES = 200 * 1024 * 1024;

/**
 * Convierte un dataURL en Blob sin usar fetch(): la Content-Security-Policy (connect-src)
 * bloquea fetch("data:..."), así que se decodifica a mano.
 */
function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) throw new Error('Imagen dañada en la copia.');
  const header = dataUrl.slice(5, comma); // "image/png;base64"
  const type = header.split(';')[0] || 'application/octet-stream';
  const data = dataUrl.slice(comma + 1);
  if (header.includes(';base64')) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type });
  }
  return new Blob([decodeURIComponent(data)], { type });
}

/**
 * Importa un archivo de "Descargar mis datos" a la cuenta actual (sirve para pasar las pizarras
 * de un navegador a la nube o restaurar una copia). Las pizarras se crean como nuevas; no se
 * sobrescribe nada. Devuelve { boards, images }.
 */
export async function importUserData(userId, file, onProgress = () => {}) {
  if (file.size > MAX_FILE_BYTES) throw new Error('El archivo es demasiado grande (máximo 200 MB).');
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('El archivo no es una copia válida de Pizarra Digital.');
  }
  if (payload?.formato !== 'pizarra-digital/export' || !Array.isArray(payload.pizarras)) {
    throw new Error('El archivo no es una copia válida de Pizarra Digital.');
  }

  const images = Array.isArray(payload.imagenes) ? payload.imagenes : [];
  const total = images.length + payload.pizarras.length;
  let done = 0;
  const step = () => onProgress(++done, total);

  // Las imágenes conservan su id para que las pizarras sigan apuntando a ellas.
  let importedImages = 0;
  for (const img of images) {
    if (img?.id && typeof img.dataUrl === 'string' && img.dataUrl.startsWith('data:image/')) {
      try {
        const blob = dataUrlToBlob(img.dataUrl);
        await assetService.saveImage(userId, blob, { width: img.width, height: img.height, name: img.name }, img.id);
        importedImages++;
      } catch {
        /* Si ya existe (importación repetida) se reutiliza la existente. */
      }
    }
    step();
  }

  let importedBoards = 0;
  for (const b of payload.pizarras) {
    if (!b || !Array.isArray(b.elements)) {
      step();
      continue;
    }
    await boardService.createBoard(userId, {
      name: b.name,
      background: b.background,
      elements: b.elements,
      viewport: b.viewport,
      thumbnail: typeof b.thumbnail === 'string' && b.thumbnail.startsWith('data:image/') ? b.thumbnail : null,
    });
    importedBoards++;
    step();
  }
  return { boards: importedBoards, images: importedImages };
}
