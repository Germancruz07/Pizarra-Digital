import { idbGet, idbPut, idbDelete, idbGetAllByIndex } from '../storage/indexedDb';
import { uid } from '../../utils/id';
import { localAssetAdapter } from './assetLocal';
import { buildWelcomeElements, WELCOME_IMAGE_SVG, WELCOME_IMAGE_SIZE } from '../../data/welcomeBoard';
import { createThumbnail } from '../../canvas/renderer';
import { loadImageFromBlob } from '../../utils/image';

const DEFAULT_NAME = 'Pizarra sin título';

export function countElements(elements = []) {
  return elements.reduce((n, el) => (el.type === 'erase' ? n : n + 1), 0);
}

function toSummary(board) {
  const { elements, ...meta } = board;
  return meta;
}

async function getOwned(ownerId, id) {
  const board = await idbGet('boards', id);
  if (!board || board.ownerId !== ownerId) return null;
  return board;
}

async function listBoards(ownerId) {
  const all = await idbGetAllByIndex('boards', 'ownerId', ownerId);
  return all.map(toSummary).sort((a, b) => b.updatedAt - a.updatedAt);
}

async function getBoard(ownerId, id) {
  return getOwned(ownerId, id);
}

async function createBoard(ownerId, { name, background = 'white', elements = [], viewport } = {}) {
  const now = Date.now();
  const board = {
    id: uid('brd_'),
    ownerId,
    name: (name || '').trim() || DEFAULT_NAME,
    background,
    elements,
    viewport: viewport || { x: 0, y: 0, zoom: 1 },
    thumbnail: null,
    elementCount: countElements(elements),
    createdAt: now,
    updatedAt: now,
  };
  await idbPut('boards', board);
  return toSummary(board);
}

async function saveBoard(ownerId, id, patch) {
  const board = await getOwned(ownerId, id);
  if (!board) throw new Error('La pizarra no existe o no pertenece a tu cuenta.');
  const next = { ...board, ...patch, id: board.id, ownerId: board.ownerId, updatedAt: Date.now() };
  if (patch.elements) next.elementCount = countElements(patch.elements);
  await idbPut('boards', next);
  return toSummary(next);
}

async function renameBoard(ownerId, id, name) {
  return saveBoard(ownerId, id, { name: (name || '').trim() || DEFAULT_NAME });
}

async function duplicateBoard(ownerId, id) {
  const board = await getOwned(ownerId, id);
  if (!board) throw new Error('La pizarra no existe o no pertenece a tu cuenta.');
  const now = Date.now();
  const copy = { ...board, id: uid('brd_'), name: `${board.name} (copia)`, createdAt: now, updatedAt: now };
  await idbPut('boards', copy);
  return toSummary(copy);
}

async function cleanupAssets(ownerId) {
  const boards = await idbGetAllByIndex('boards', 'ownerId', ownerId);
  const referenced = new Set();
  boards.forEach((b) => (b.elements || []).forEach((el) => el.imageId && referenced.add(el.imageId)));
  await localAssetAdapter.cleanupUnreferenced(ownerId, referenced);
}

async function deleteBoard(ownerId, id) {
  const board = await getOwned(ownerId, id);
  if (!board) throw new Error('La pizarra no existe o no pertenece a tu cuenta.');
  await idbDelete('boards', id);
  await cleanupAssets(ownerId);
}

async function seedWelcomeBoard(ownerId) {
  const blob = new Blob([WELCOME_IMAGE_SVG], { type: 'image/svg+xml' });
  const imageId = await localAssetAdapter.saveImage(ownerId, blob, WELCOME_IMAGE_SIZE);
  const elements = buildWelcomeElements(imageId);
  const summary = await createBoard(ownerId, {
    name: '👋 Pizarra de bienvenida',
    background: 'grid',
    elements,
    // Desplazada a la derecha para que el panel de propiedades no tape el contenido.
    viewport: { x: 280, y: 90, zoom: 0.8 },
  });
  try {
    const img = await loadImageFromBlob(blob);
    const thumbnail = createThumbnail(elements, 'grid', () => img);
    if (thumbnail) await idbPut('boards', { ...(await idbGet('boards', summary.id)), thumbnail });
    URL.revokeObjectURL(img.src);
  } catch {
    /* La miniatura se generará en el primer guardado. */
  }
  return summary;
}

export const localBoardAdapter = {
  listBoards,
  getBoard,
  createBoard,
  saveBoard,
  renameBoard,
  duplicateBoard,
  deleteBoard,
  seedWelcomeBoard,
};
