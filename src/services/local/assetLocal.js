import { idbGet, idbPut, idbGetAllByIndex, idbGetAllKeysByIndex, idbDeleteMany } from '../storage/indexedDb';
import { uid } from '../../utils/id';

export const localAssetAdapter = {
  async saveImage(ownerId, blob, meta = {}) {
    const id = uid('img_');
    await idbPut('images', { id, ownerId, blob, type: blob.type, ...meta, createdAt: Date.now() });
    return id;
  },

  async getImageBlob(id) {
    const record = await idbGet('images', id);
    return record?.blob || null;
  },

  /** Todas las imágenes del usuario (para la descarga de datos). */
  async listImages(ownerId) {
    return idbGetAllByIndex('images', 'ownerId', ownerId);
  },

  /** Borra todas las imágenes del usuario (al eliminar la cuenta). */
  async deleteAllForOwner(ownerId) {
    const keys = await idbGetAllKeysByIndex('images', 'ownerId', ownerId);
    if (keys.length) await idbDeleteMany('images', keys);
  },

  /** Borra las imágenes del usuario que ya no usa ninguna de sus pizarras. */
  async cleanupUnreferenced(ownerId, referencedIds) {
    const keys = await idbGetAllKeysByIndex('images', 'ownerId', ownerId);
    const orphan = keys.filter((k) => !referencedIds.has(k));
    if (orphan.length) await idbDeleteMany('images', orphan);
    return orphan.length;
  },
};
