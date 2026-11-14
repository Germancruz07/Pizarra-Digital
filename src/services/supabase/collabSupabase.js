import { supabase, translateError } from './client';
import { setSharedImageOwner } from './assetSupabase';

/**
 * Pizarras compartidas: código de acceso, solicitudes, permisos y sesión en tiempo real.
 * Requiere haber ejecutado supabase/collab.sql. Solo existe en modo nube.
 */

/** Fila de board_members → objeto de la app. */
function memberFromRow(row) {
  if (!row) return null;
  return {
    boardId: row.board_id,
    userId: row.user_id,
    name: row.display_name || 'Estudiante',
    avatar: row.avatar,
    status: row.status,
    canWrite: !!row.can_write,
    canUpload: !!row.can_upload,
    requestedAt: Date.parse(row.requested_at),
  };
}

/** Normaliza lo que escribe el estudiante: mayúsculas, sin espacios ni guiones. */
export function normalizeCode(code) {
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

let channelSeq = 0;

export const supabaseCollabAdapter = {
  normalizeCode,

  /** Código actual de la pizarra (solo el propietario lo ve) o null si nunca se compartió. */
  async getShare(boardId) {
    const { data, error } = await supabase.from('board_shares').select('code, enabled').eq('board_id', boardId).maybeSingle();
    if (error) throw translateError(error);
    return data ? { code: data.code, enabled: data.enabled } : null;
  },

  async enableCode(boardId, regenerate = false) {
    const { data, error } = await supabase.rpc('enable_board_code', { p_board_id: boardId, p_regenerate: regenerate });
    if (error) throw translateError(error);
    return { code: data, enabled: true };
  },

  async disableCode(boardId) {
    const { error } = await supabase.rpc('disable_board_code', { p_board_id: boardId });
    if (error) throw translateError(error);
  },

  /** Estudiante: solicita unirse. Devuelve { boardId, boardName, status: 'owner'|'pending'|'approved' }. */
  async requestJoin(code) {
    const { data, error } = await supabase.rpc('request_board_join', { p_code: normalizeCode(code) });
    if (error) throw translateError(error);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Código no válido o desactivado.');
    return { boardId: row.joined_board_id, boardName: row.board_name, status: row.member_status };
  },

  async getMembership(boardId, userId) {
    const { data, error } = await supabase
      .from('board_members')
      .select('*')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw translateError(error);
    return memberFromRow(data);
  },

  /** Lee una pizarra ajena a la que el usuario tiene acceso aprobado (lo valida RLS). */
  async getSharedBoard(boardId) {
    const { data, error } = await supabase
      .from('boards')
      .select('id, owner_id, name, background, elements, viewport')
      .eq('id', boardId)
      .maybeSingle();
    if (error) throw translateError(error);
    if (!data) return null;
    return {
      id: data.id,
      ownerId: data.owner_id,
      name: data.name,
      background: data.background,
      elements: data.elements || [],
      viewport: data.viewport,
    };
  },

  async listMembers(boardId) {
    const { data, error } = await supabase
      .from('board_members')
      .select('*')
      .eq('board_id', boardId)
      .order('requested_at', { ascending: true });
    if (error) throw translateError(error);
    return data.map(memberFromRow);
  },

  /** Profesor: cambia estado y/o permisos. patch = { status?, canWrite?, canUpload? } */
  async updateMember(boardId, userId, patch) {
    const update = {};
    if (patch.status !== undefined) {
      update.status = patch.status;
      update.decided_at = new Date().toISOString();
    }
    if (patch.canWrite !== undefined) update.can_write = patch.canWrite;
    if (patch.canUpload !== undefined) update.can_upload = patch.canUpload;
    const { data, error } = await supabase
      .from('board_members')
      .update(update)
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw translateError(error);
    if (!data) throw new Error('No se encontró al estudiante.');
    return memberFromRow(data);
  },

  /** Persiste cambios por elemento de forma atómica (ver apply_board_ops en collab.sql). */
  async applyOps(boardId, { upserts = [], deletes = [], order = null }) {
    const { error } = await supabase.rpc('apply_board_ops', {
      p_board_id: boardId,
      p_upserts: upserts,
      p_deletes: deletes,
      p_order: order,
    });
    if (error) throw translateError(error);
  },

  /** Las imágenes de una pizarra compartida viven en la carpeta del profesor. */
  setImageOwner(ownerId) {
    setSharedImageOwner(ownerId);
  },

  /** Avisos en vivo de board_members (solicitudes nuevas, aprobaciones, permisos). RLS filtra lo visible. */
  subscribeMembers(boardId, onChange) {
    const channel = supabase
      .channel(`members:${boardId}:${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_members', filter: `board_id=eq.${boardId}` }, (payload) => {
        if (payload.eventType === 'DELETE') onChange(null, 'DELETE', payload.old);
        else onChange(memberFromRow(payload.new), payload.eventType);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  /**
   * Canal privado de la pizarra: difusión de cambios (ops), trazos en curso (draft),
   * metadatos (nombre/fondo) y presencia. Devuelve { sendOps, sendDraft, sendMeta, close }.
   */
  openBoardChannel(boardId, handlers) {
    // El nombre del canal debe ser exactamente "board:<id>" (lo valida RLS en realtime.messages).
    // Como removeChannel es asíncrono, se reutiliza el canal si se reabre enseguida
    // (remontajes, StrictMode) en lugar de crear uno que choque con el que se está cerrando.
    let entry = liveChannels.get(boardId);
    if (entry) {
      clearTimeout(entry.closeTimer);
      entry.refs += 1;
      entry.handlers = handlers;
      if (entry.subscribed) {
        handlers.onStatus?.('SUBSCRIBED');
        handlers.onPresence?.(new Set(Object.keys(entry.channel.presenceState())));
      }
    } else {
      const channel = supabase.channel(`board:${boardId}`, {
        config: { private: true, broadcast: { self: false }, presence: { key: handlers.user.id } },
      });
      entry = { channel, handlers, refs: 1, closeTimer: null, subscribed: false };
      const current = entry;
      liveChannels.set(boardId, entry);
      channel
        .on('broadcast', { event: 'ops' }, ({ payload }) => current.handlers.onOps?.(payload))
        .on('broadcast', { event: 'meta' }, ({ payload }) => current.handlers.onMeta?.(payload))
        .on('broadcast', { event: 'draft' }, ({ payload }) => current.handlers.onDraft?.(payload))
        .on('presence', { event: 'sync' }, () => current.handlers.onPresence?.(new Set(Object.keys(channel.presenceState()))))
        .subscribe(async (status) => {
          current.subscribed = status === 'SUBSCRIBED';
          current.handlers.onStatus?.(status);
          if (status === 'SUBSCRIBED') {
            const { user, role } = current.handlers;
            await channel.track({ userId: user.id, name: user.name, role });
          }
        });
    }
    const own = entry;
    let closed = false;
    return {
      sendOps: (payload) => own.channel.send({ type: 'broadcast', event: 'ops', payload }),
      sendMeta: (payload) => own.channel.send({ type: 'broadcast', event: 'meta', payload }),
      // Trazo en curso (no se guarda): se envía varias veces por segundo mientras se dibuja.
      sendDraft: (payload) => own.channel.send({ type: 'broadcast', event: 'draft', payload }),
      close: () => {
        if (closed) return;
        closed = true;
        own.refs -= 1;
        if (own.refs > 0) return;
        own.closeTimer = setTimeout(() => {
          if (liveChannels.get(boardId) === own) liveChannels.delete(boardId);
          supabase.removeChannel(own.channel);
        }, 1500);
      },
    };
  },
};

const liveChannels = new Map();
