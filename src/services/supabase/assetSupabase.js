import { supabase, currentUserId, translateError } from './client';
import { uid } from '../../utils/id';

const BUCKET = 'images';
const path = (ownerId, id) => `${ownerId}/${id}`;

async function listIds(ownerId) {
  const ids = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(ownerId, { limit: 1000, offset });
    if (error) throw translateError(error);
    ids.push(...data.filter((f) => f.id).map((f) => f.name));
    if (data.length < 1000) return ids;
  }
}

async function removeIds(ownerId, ids) {
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(ids.slice(i, i + 100).map((id) => path(ownerId, id)));
    if (error) throw translateError(error);
  }
}

/** Imágenes en Supabase Storage (bucket privado "images", una carpeta por usuario). */
export const supabaseAssetAdapter = {
  async saveImage(ownerId, blob, meta = {}, id = uid('img_')) {
    const { error } = await supabase.storage.from(BUCKET).upload(path(ownerId, id), blob, {
      contentType: blob.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) throw translateError(error);
    return id;
  },

  async getImageBlob(id) {
    const ownerId = await currentUserId();
    const { data, error } = await supabase.storage.from(BUCKET).download(path(ownerId, id));
    if (error) return null;
    return data;
  },

  async listImages(ownerId) {
    const ids = await listIds(ownerId);
    const out = [];
    for (const id of ids) {
      const { data, error } = await supabase.storage.from(BUCKET).download(path(ownerId, id));
      if (!error && data) out.push({ id, ownerId, type: data.type, blob: data });
    }
    return out;
  },

  async deleteAllForOwner(ownerId) {
    await removeIds(ownerId, await listIds(ownerId));
  },

  async cleanupUnreferenced(ownerId, referencedIds) {
    const orphan = (await listIds(ownerId)).filter((id) => !referencedIds.has(id));
    if (orphan.length) await removeIds(ownerId, orphan);
    return orphan.length;
  },
};
