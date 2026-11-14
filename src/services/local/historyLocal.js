import { readJSON, removeKey, writeJSON } from '../storage/localStore';

/**
 * "Clases pasadas" en modo local: historial por usuario en localStorage.
 * Entrada: { boardId, role, boardName, teacherName, createdAt, firstSeenAt, lastAccessAt }
 */
const key = (userId) => `pd:history:${userId}`;
const MAX_ENTRIES = 500;

const read = (userId) => {
  const list = readJSON(key(userId), []);
  return Array.isArray(list) ? list : [];
};

export const localHistoryAdapter = {
  async touch(user, { boardId, boardName, teacherName, role = 'owner', createdAt }) {
    const now = Date.now();
    const list = read(user.id);
    const prev = list.find((e) => e.boardId === boardId);
    const entry = {
      boardId,
      role,
      boardName: boardName || prev?.boardName || 'Pizarra sin título',
      teacherName: teacherName || prev?.teacherName || user.name || '',
      createdAt: createdAt || prev?.createdAt || now,
      firstSeenAt: prev?.firstSeenAt || now,
      lastAccessAt: now,
    };
    const next = [entry, ...list.filter((e) => e.boardId !== boardId)].slice(0, MAX_ENTRIES);
    try {
      writeJSON(key(user.id), next);
    } catch {
      /* almacenamiento lleno: el historial es secundario, no se interrumpe nada */
    }
  },

  async list(userId) {
    return read(userId).map((e) => ({ ...e, hasAccess: true }));
  },

  async remove(userId, boardId) {
    writeJSON(key(userId), read(userId).filter((e) => e.boardId !== boardId));
  },

  async clear(userId) {
    removeKey(key(userId));
  },
};
