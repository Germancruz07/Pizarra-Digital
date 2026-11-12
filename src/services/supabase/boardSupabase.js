import { supabase, translateError } from './client';
import { uid } from '../../utils/id';
import { supabaseAssetAdapter } from './assetSupabase';
import { seedWelcome } from '../shared/welcome';

const DEFAULT_NAME = 'Pizarra sin título';
const SUMMARY_COLUMNS = 'id, owner_id, name, background, thumbnail, element_count, created_at, updated_at';

const countElements = (elements = []) => elements.reduce((n, el) => (el.type === 'erase' ? n : n + 1), 0);

/** Fila de la base de datos (snake_case) → objeto de la app (camelCase, fechas en ms). */
function fromRow(row) {
  if (!row) return null;
  const board = {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    background: row.background,
    thumbnail: row.thumbnail,
    elementCount: row.element_count,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
  if ('elements' in row) board.elements = row.elements || [];
  if ('viewport' in row) board.viewport = row.viewport;
  return board;
}

async function listBoards(ownerId) {
  const { data, error } = await supabase
    .from('boards')
    .select(SUMMARY_COLUMNS)
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });
  if (error) throw translateError(error);
  return data.map(fromRow);
}

async function getBoard(ownerId, id) {
  const { data, error } = await supabase.from('boards').select('*').eq('id', id).eq('owner_id', ownerId).maybeSingle();
  if (error) throw translateError(error);
  return fromRow(data);
}

async function createBoard(ownerId, { name, background = 'white', elements = [], viewport, thumbnail = null } = {}) {
  const { data, error } = await supabase
    .from('boards')
    .insert({
      id: uid('brd_'),
      owner_id: ownerId,
      name: (name || '').trim() || DEFAULT_NAME,
      background,
      elements,
      viewport: viewport || { x: 0, y: 0, zoom: 1 },
      thumbnail,
      element_count: countElements(elements),
    })
    .select(SUMMARY_COLUMNS)
    .single();
  if (error) throw translateError(error);
  return fromRow(data);
}

async function saveBoard(ownerId, id, patch) {
  const update = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.background !== undefined) update.background = patch.background;
  if (patch.viewport !== undefined) update.viewport = patch.viewport;
  if (patch.thumbnail !== undefined) update.thumbnail = patch.thumbnail;
  if (patch.elements !== undefined) {
    update.elements = patch.elements;
    update.element_count = countElements(patch.elements);
  }
  const { data, error } = await supabase
    .from('boards')
    .update(update)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select(SUMMARY_COLUMNS)
    .maybeSingle();
  if (error) throw translateError(error);
  if (!data) throw new Error('La pizarra no existe o no pertenece a tu cuenta.');
  return fromRow(data);
}

async function renameBoard(ownerId, id, name) {
  return saveBoard(ownerId, id, { name: (name || '').trim() || DEFAULT_NAME });
}

async function duplicateBoard(ownerId, id) {
  const board = await getBoard(ownerId, id);
  if (!board) throw new Error('La pizarra no existe o no pertenece a tu cuenta.');
  return createBoard(ownerId, {
    name: `${board.name} (copia)`,
    background: board.background,
    elements: board.elements,
    viewport: board.viewport,
    thumbnail: board.thumbnail,
  });
}

async function exportBoards(ownerId) {
  const { data, error } = await supabase.from('boards').select('*').eq('owner_id', ownerId);
  if (error) throw translateError(error);
  return data.map(fromRow);
}

async function cleanupAssets(ownerId) {
  const boards = await exportBoards(ownerId);
  const referenced = new Set();
  boards.forEach((b) => (b.elements || []).forEach((el) => el.imageId && referenced.add(el.imageId)));
  await supabaseAssetAdapter.cleanupUnreferenced(ownerId, referenced);
}

async function deleteBoard(ownerId, id) {
  const { data, error } = await supabase.from('boards').delete().eq('id', id).eq('owner_id', ownerId).select('id');
  if (error) throw translateError(error);
  if (!data.length) throw new Error('La pizarra no existe o no pertenece a tu cuenta.');
  await cleanupAssets(ownerId);
}

/** Al borrar la cuenta: las pizarras se eliminan en cascada en la base de datos; aquí se borran las imágenes. */
async function deleteAllForOwner(ownerId) {
  await supabaseAssetAdapter.deleteAllForOwner(ownerId);
  const { error } = await supabase.from('boards').delete().eq('owner_id', ownerId);
  if (error) throw translateError(error);
}

async function seedWelcomeBoard(ownerId) {
  return seedWelcome(ownerId, { assets: supabaseAssetAdapter, boards: { createBoard, saveBoard } });
}

export const supabaseBoardAdapter = {
  listBoards,
  getBoard,
  createBoard,
  saveBoard,
  renameBoard,
  duplicateBoard,
  deleteBoard,
  seedWelcomeBoard,
  exportBoards,
  deleteAllForOwner,
};
