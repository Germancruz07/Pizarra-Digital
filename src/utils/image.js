export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('La imagen no es válida.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen.'))), type, quality);
  });
}

/** Valida, reduce (si es enorme) y devuelve la imagen lista para guardarse en IndexedDB. */
export async function prepareImage(file, maxDim = 2560) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato no soportado. Usa PNG, JPG o WEBP.');
  }
  let img = await loadImageFromBlob(file);
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  let blob = file;

  if (Math.max(width, height) > maxDim && file.type !== 'image/gif') {
    const s = maxDim / Math.max(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * s);
    canvas.height = Math.round(height * s);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const type = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    blob = await canvasToBlob(canvas, type, 0.9);
    URL.revokeObjectURL(img.src);
    img = await loadImageFromBlob(blob);
    width = canvas.width;
    height = canvas.height;
  }
  return { blob, width, height, img };
}

/** Recorta al centro y reduce una foto para usarla como avatar (dataURL ligero). */
export async function fileToAvatarDataUrl(file, size = 160) {
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.');
  const img = await loadImageFromBlob(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  URL.revokeObjectURL(img.src);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
