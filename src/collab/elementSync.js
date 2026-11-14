/**
 * Sincronización por elemento para pizarras compartidas.
 *
 * Un "op" describe un cambio entre dos versiones del array de elementos:
 *   { upserts: Element[], deletes: string[], order: string[] | null }
 * - upserts: elementos nuevos o modificados (los elementos son inmutables: cambio = referencia nueva).
 * - deletes: ids eliminados.
 * - order:   orden completo de ids, solo si cambió el orden relativo (traer al frente, deshacer…).
 *
 * `applyOps` sigue exactamente el mismo algoritmo que apply_board_ops en supabase/collab.sql,
 * para que todos los clientes y la base de datos converjan al mismo resultado.
 */

export const isEmptyOps = (ops) => !ops || (!ops.upserts?.length && !ops.deletes?.length && !ops.order);

/** Cambios para pasar de `base` a `next`. */
export function diffElements(base, next) {
  const baseMap = new Map(base.map((el) => [el.id, el]));
  const upserts = [];
  const seen = new Set();
  for (const el of next) {
    seen.add(el.id);
    if (baseMap.get(el.id) !== el) upserts.push(el);
  }
  const deletes = [];
  for (const id of baseMap.keys()) if (!seen.has(id)) deletes.push(id);

  // Orden esperado si solo hubiera altas al final: los que siguen + los nuevos.
  const nextIds = next.map((el) => el.id);
  const expected = [...base.map((el) => el.id).filter((id) => seen.has(id)), ...nextIds.filter((id) => !baseMap.has(id))];
  const orderChanged = nextIds.some((id, i) => id !== expected[i]);

  return { upserts, deletes, order: orderChanged ? nextIds : null };
}

/** Aplica un op a un array de elementos (devuelve el mismo array si no cambia nada). */
export function applyOps(elements, { upserts = [], deletes = [], order = null } = {}) {
  if (!upserts.length && !deletes.length && !order) return elements;
  const del = new Set(deletes);
  const up = new Map(upserts.map((el) => [el.id, el]));
  const out = [];
  const present = new Set();
  for (const el of elements) {
    if (del.has(el.id)) continue;
    present.add(el.id);
    out.push(up.get(el.id) || el);
  }
  for (const el of upserts) if (!present.has(el.id) && !del.has(el.id)) out.push(el);
  if (order) {
    const pos = new Map(order.map((id, i) => [id, i]));
    const rank = (el) => (pos.has(el.id) ? pos.get(el.id) : Infinity);
    out.sort((a, b) => rank(a) - rank(b)); // sort estable: los no listados conservan su orden
  }
  return out;
}

/** Acumula ops pendientes de guardar (el último cambio de cada elemento gana). */
export function mergePending(pending, ops) {
  for (const el of ops.upserts || []) {
    pending.deletes.delete(el.id);
    pending.upserts.set(el.id, el);
  }
  for (const id of ops.deletes || []) {
    pending.upserts.delete(id);
    pending.deletes.add(id);
  }
  if (ops.order) pending.order = ops.order;
  return pending;
}

export const emptyPending = () => ({ upserts: new Map(), deletes: new Set(), order: null });

export const pendingToOps = (p) => ({ upserts: [...p.upserts.values()], deletes: [...p.deletes], order: p.order });
