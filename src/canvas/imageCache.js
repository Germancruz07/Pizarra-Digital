import { assetService } from '../services';
import { loadImageFromBlob } from '../utils/image';

/** Caché de HTMLImageElement por imageId (los binarios viven en IndexedDB). */
const cache = new Map();
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

function load(id) {
  const entry = { status: 'loading', img: null, promise: null };
  entry.promise = assetService
    .getImageBlob(id)
    .then((blob) => {
      if (!blob) throw new Error('Imagen no encontrada');
      return loadImageFromBlob(blob);
    })
    .then((img) => {
      entry.img = img;
      entry.status = 'loaded';
      notify();
      return img;
    })
    .catch(() => {
      entry.status = 'error';
      notify();
      return null;
    });
  cache.set(id, entry);
  return entry.promise;
}

export function getImage(id) {
  if (!id) return null;
  const entry = cache.get(id);
  if (!entry) {
    load(id);
    return null;
  }
  return entry.status === 'loaded' ? entry.img : null;
}

export function getImageStatus(id) {
  return cache.get(id)?.status || 'idle';
}

export function primeImage(id, img) {
  cache.set(id, { status: 'loaded', img, promise: Promise.resolve(img) });
  notify();
}

export function ensureImagesLoaded(elements) {
  const ids = [...new Set(elements.filter((e) => e.type === 'image').map((e) => e.imageId))];
  return Promise.all(ids.map((id) => cache.get(id)?.promise || load(id)));
}

export function subscribeImages(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
