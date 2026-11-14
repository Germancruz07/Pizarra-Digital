import { assetService, authService, boardService, historyService } from '../services';
import { downloadBlob } from './image';

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Descarga en un archivo JSON todos los datos de la cuenta guardados en este navegador:
 * perfil, registro de aceptación de términos, pizarras e imágenes (en base64).
 */
export async function downloadUserData(userId) {
  const [profile, boards, images] = await Promise.all([
    authService.exportProfile(userId),
    boardService.exportBoards(userId),
    assetService.listImages(userId),
  ]);
  // "Clases pasadas" (si en modo nube aún no se ejecutó history.sql, se omite).
  const history = await historyService.list(userId).catch(() => []);

  const exportedImages = [];
  for (const img of images) {
    const { blob, ...meta } = img;
    exportedImages.push({ ...meta, dataUrl: blob ? await blobToDataUrl(blob) : null });
  }

  let deviceConsent = null;
  try {
    deviceConsent = JSON.parse(localStorage.getItem('pd:consent') || 'null');
  } catch {
    deviceConsent = null;
  }

  const payload = {
    formato: 'pizarra-digital/export',
    version: 1,
    exportadoEl: new Date().toISOString(),
    nota: 'Datos guardados únicamente en este navegador. La contraseña no se incluye.',
    perfil: profile,
    consentimientoDeCookiesEnEsteDispositivo: deviceConsent,
    pizarras: boards,
    imagenes: exportedImages,
    clasesPasadas: history,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `pizarra-mis-datos-${date}.json`);
}
