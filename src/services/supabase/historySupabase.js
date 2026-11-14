import { supabase, translateError } from './client';

/**
 * "Clases pasadas" en modo nube. Requiere haber ejecutado supabase/history.sql.
 * El servidor calcula el nombre de la pizarra y del profesor y valida el acceso.
 */

const toMs = (v) => (v ? Date.parse(v) : null);

function fromRow(row) {
  return {
    boardId: row.board_id,
    role: row.role,
    boardName: row.board_name || 'Pizarra sin título',
    teacherName: row.teacher_name || 'Profesor',
    createdAt: toMs(row.board_created_at) || toMs(row.first_seen_at),
    firstSeenAt: toMs(row.first_seen_at),
    lastAccessAt: toMs(row.last_access_at),
    hasAccess: row.has_access !== false,
  };
}

export const supabaseHistoryAdapter = {
  /** Registra la pizarra en el historial del usuario o actualiza su último acceso. */
  async touch(_user, { boardId }) {
    const { error } = await supabase.rpc('touch_board_history', { p_board_id: boardId });
    if (error) throw translateError(error);
  },

  async list() {
    const { data, error } = await supabase.rpc('list_board_history');
    if (error) throw translateError(error);
    return (data || []).map(fromRow);
  },

  async remove(userId, boardId) {
    const { error } = await supabase.from('board_history').delete().eq('user_id', userId).eq('board_id', boardId);
    if (error) throw translateError(error);
  },

  /** Al borrar la cuenta las filas se eliminan solas (on delete cascade). */
  async clear() {},
};
