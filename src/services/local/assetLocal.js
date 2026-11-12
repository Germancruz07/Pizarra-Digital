import { idbGet, idbPut, idbGetAllKeysByIndex, idbDeleteMany } from '../storage/indexedDb';
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

  /** Borra las imágenes del usuario que ya no usa ninguna de sus pizarras. */
  async cleanupUnreferenced(ownerId, referencedIds) {
    const keys = await idbGetAllKeysByIndex('images', 'ownerId', ownerId);
    const orphan = keys.filter((k) => !referencedIds.has(k));
    if (orphan.length) await idbDeleteMany('images', orphan);
    return orphan.length;
  },
};
