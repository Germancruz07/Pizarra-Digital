import { idbGet, idbPut, idbDelete, idbGetAllByIndex, idbGetAllKeysByIndex, idbDeleteMany } from '../storage/indexedDb';
import { uid } from '../../utils/id';
import { localAssetAdapter } from './assetLocal';
import { seedWelcome } from '../shared/welcome';

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

async function createBoard(ownerId, { name, background = 'white', elements = [], viewport, thumbnail = null } = {}) {
  const now = Date.now();
  const board = {
    id: uid('brd_'),
    ownerId,
    name: (name || '').trim() || DEFAULT_NAME,
    background,
    elements,
    viewport: viewport || { x: 0, y: 0, zoom: 1 },
    thumbnail,
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
  return seedWelcome(ownerId, { assets: localAssetAdapter, boards: { createBoard, saveBoard } });
}

/** Todas las pizarras completas del usuario (para la descarga de datos). */
async function exportBoards(ownerId) {
  return idbGetAllByIndex('boards', 'ownerId', ownerId);
}

/** Borra todas las pizarras e imágenes del usuario (al eliminar la cuenta). */
async function deleteAllForOwner(ownerId) {
  const keys = await idbGetAllKeysByIndex('boards', 'ownerId', ownerId);
  if (keys.length) await idbDeleteMany('boards', keys);
  await localAssetAdapter.deleteAllForOwner(ownerId);
}

export const localBoardAdapter = {
  exportBoards,
  deleteAllForOwner,
  listBoards,
  getBoard,
  createBoard,
  saveBoard,
  renameBoard,
  duplicateBoard,
  deleteBoard,
  seedWelcomeBoard,
};
