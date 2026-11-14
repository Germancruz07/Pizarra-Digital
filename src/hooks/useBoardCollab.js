import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collabService } from '../services';
import { applyOps, diffElements, emptyPending, isEmptyOps, mergePending, pendingToOps } from '../collab/elementSync';

const FLUSH_DELAY = 350;

/**
 * Sesión colaborativa de una pizarra (solo modo nube).
 *
 * - Profesor (role 'owner'): la sesión se activa cuando la pizarra se ha compartido (tiene código).
 *   Gestiona el código, las solicitudes y los permisos de cada estudiante.
 * - Estudiante (role 'guest'): participante aprobado. Recibe en vivo los cambios y sus permisos.
 *
 * Mientras la sesión está activa, cada cambio local se difunde por el canal en tiempo real y se
 * guarda por elemento con apply_board_ops (en vez de sobrescribir la pizarra entera), de modo que
 * varias personas pueden dibujar a la vez sin pisarse. Sin sesión activa no hace nada: la pizarra
 * funciona exactamente como siempre.
 */
export function useBoardCollab({ boardId, user, access, ready, elements, applyExternal, name, background, onRemoteMeta, onKicked, toast }) {
  const enabled = !!collabService;
  const isOwner = access.role === 'owner';
  const isGuest = access.role === 'guest';

  const [share, setShare] = useState(null);
  const [members, setMembers] = useState([]);
  const [online, setOnline] = useState(() => new Set());
  const [connected, setConnected] = useState(false);

  const active = enabled && ready && ((isOwner && !!share) || isGuest);

  // Permisos del usuario actual (el profesor siempre puede todo).
  const me = isGuest ? members.find((m) => m.userId === user.id) || access.member : null;
  const canWrite = !isGuest || (me?.status === 'approved' && me.canWrite);
  const canUpload = !isGuest || (me?.status === 'approved' && me.canUpload);

  const latest = useRef({});
  latest.current = { elements, members, canWrite, user, access, onRemoteMeta, onKicked, toast, applyExternal };

  const channelRef = useRef(null);
  const baseRef = useRef(elements); // último estado sincronizado (local + remoto)
  const pendingRef = useRef(emptyPending());
  const timerRef = useRef(null);
  const chainRef = useRef(Promise.resolve());

  /* ------------------------------------------------ guardado por elemento */

  const flush = useCallback(() => {
    clearTimeout(timerRef.current);
    const p = pendingRef.current;
    if (!p.upserts.size && !p.deletes.size && !p.order) return chainRef.current;
    const ops = pendingToOps(p);
    pendingRef.current = emptyPending();
    chainRef.current = chainRef.current
      .then(() => collabService.applyOps(boardId, ops))
      .catch((err) => {
        // Se recuperan los cambios no guardados (sin pisar los más recientes) para el próximo intento.
        const newer = pendingToOps(pendingRef.current);
        pendingRef.current = mergePending(mergePending(emptyPending(), ops), newer);
        latest.current.toast(`No se pudo sincronizar: ${err.message}`, 'error');
      });
    return chainRef.current;
  }, [boardId]);

  /* ------------------------------------------------ código (profesor) */

  useEffect(() => {
    if (!enabled || !ready || !isOwner) return undefined;
    let alive = true;
    collabService
      .getShare(boardId)
      .then((s) => alive && setShare(s))
      .catch(() => {}); // si aún no se ejecutó collab.sql, la pizarra sigue funcionando sin compartir
    return () => {
      alive = false;
    };
  }, [enabled, ready, isOwner, boardId]);

  /* ------------------------------------------------ participantes en vivo */

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    collabService
      .listMembers(boardId)
      .then((list) => alive && setMembers(list))
      .catch((err) => latest.current.toast(err.message, 'error'));

    const unsubscribe = collabService.subscribeMembers(boardId, (member, type, old) => {
      if (type === 'DELETE') {
        if (old?.user_id) setMembers((list) => list.filter((m) => m.userId !== old.user_id));
        return;
      }
      if (!member) return;
      const prev = latest.current.members.find((m) => m.userId === member.userId);
      if (isOwner && member.status === 'pending' && prev?.status !== 'pending') {
        latest.current.toast(`${member.name} quiere unirse a la pizarra`, 'info', 6000);
      }
      setMembers((list) => {
        const i = list.findIndex((m) => m.userId === member.userId);
        if (i === -1) return [...list, member];
        const copy = [...list];
        copy[i] = member;
        return copy;
      });
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [active, boardId, isOwner]);

  // Estudiante: avisos al cambiar sus permisos, y salida si el profesor lo retira.
  const prevPerms = useRef(null);
  useEffect(() => {
    if (!isGuest || !me) return;
    if (me.status !== 'approved') {
      latest.current.onKicked?.(me.status);
      return;
    }
    const prev = prevPerms.current;
    prevPerms.current = { canWrite: me.canWrite, canUpload: me.canUpload };
    if (!prev) return;
    const { toast: notify } = latest.current;
    if (prev.canWrite !== me.canWrite) notify(me.canWrite ? 'El profesor te ha permitido dibujar' : 'El profesor ha bloqueado el dibujo', me.canWrite ? 'success' : 'warning');
    if (prev.canUpload !== me.canUpload) notify(me.canUpload ? 'El profesor te ha permitido subir imágenes' : 'El profesor ha bloqueado la subida de imágenes', me.canUpload ? 'success' : 'warning');
  }, [isGuest, me?.status, me?.canWrite, me?.canUpload]);

  /* ------------------------------------------------ canal en tiempo real */

  // Debe declararse ANTES del efecto de difusión: fija la base al abrir la sesión.
  useEffect(() => {
    if (!active) return undefined;
    baseRef.current = latest.current.elements;
    let resynced = false;

    const receive = (payload) => {
      const { user: self, access: acc, members: list } = latest.current;
      if (!payload || payload.from === self.id) return;
      // Solo se aceptan cambios del profesor o de estudiantes con permiso de escritura.
      const allowed = payload.from === acc.ownerId || list.some((m) => m.userId === payload.from && m.status === 'approved' && m.canWrite);
      if (!allowed) return;
      const ops = { upserts: payload.upserts || [], deletes: payload.deletes || [], order: payload.order || null };
      baseRef.current = applyOps(baseRef.current, ops);
      latest.current.applyExternal((els) => applyOps(els, ops));
    };

    const channel = collabService.openBoardChannel(boardId, {
      user: latest.current.user,
      role: isOwner ? 'owner' : 'guest',
      onOps: receive,
      onMeta: (meta) => isGuest && latest.current.onRemoteMeta?.(meta),
      onPresence: setOnline,
      onStatus: async (status) => {
        setConnected(status === 'SUBSCRIBED');
        // Estudiante: al conectar, recarga el contenido por si llegó algo entre la carga y la suscripción.
        if (status === 'SUBSCRIBED' && isGuest && !resynced) {
          resynced = true;
          try {
            const fresh = await collabService.getSharedBoard(boardId);
            if (fresh) {
              baseRef.current = fresh.elements;
              latest.current.applyExternal(() => fresh.elements);
            }
          } catch {
            /* se mantiene lo cargado */
          }
        }
      },
    });
    channelRef.current = channel;

    return () => {
      flush();
      channel.close();
      channelRef.current = null;
      setConnected(false);
      setOnline(new Set());
    };
  }, [active, boardId, isOwner, isGuest, flush]);

  // Cambios locales → difusión inmediata + guardado por elemento (con debounce).
  useEffect(() => {
    if (!active || !channelRef.current) return;
    const base = baseRef.current;
    if (base === elements) return;
    const ops = diffElements(base, elements);
    baseRef.current = elements;
    if (isEmptyOps(ops) || !latest.current.canWrite) return; // nunca se difunde sin permiso
    channelRef.current.sendOps({ from: user.id, ...ops });
    mergePending(pendingRef.current, ops);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, FLUSH_DELAY);
  }, [elements, active, user.id, flush]);

  // Profesor: nombre y fondo de la pizarra en vivo para los estudiantes.
  useEffect(() => {
    if (!active || !isOwner || !connected) return undefined;
    const t = setTimeout(() => channelRef.current?.sendMeta({ name, background }), 250);
    return () => clearTimeout(t);
  }, [active, isOwner, connected, name, background, online.size]);

  /* ------------------------------------------------ acciones del profesor */

  const upsertMember = useCallback((member) => {
    setMembers((list) => list.map((m) => (m.userId === member.userId ? member : m)));
  }, []);

  const act = useCallback(
    async (fn) => {
      try {
        return await fn();
      } catch (err) {
        latest.current.toast(err.message, 'error');
        return null;
      }
    },
    []
  );

  const actions = useMemo(
    () => ({
      enableCode: (regenerate = false) => act(async () => {
        const s = await collabService.enableCode(boardId, regenerate);
        setShare(s);
        return s;
      }),
      disableCode: () => act(async () => {
        await collabService.disableCode(boardId);
        setShare((s) => s && { ...s, enabled: false });
      }),
      approve: (userId) => act(async () => upsertMember(await collabService.updateMember(boardId, userId, { status: 'approved', canWrite: true, canUpload: false }))),
      reject: (userId) => act(async () => upsertMember(await collabService.updateMember(boardId, userId, { status: 'rejected' }))),
      remove: (userId) => act(async () => upsertMember(await collabService.updateMember(boardId, userId, { status: 'removed' }))),
      setPermission: (userId, key, value) => act(async () => {
        // Optimista: el interruptor responde al instante; si falla, se revierte.
        setMembers((list) => list.map((m) => (m.userId === userId ? { ...m, [key]: value } : m)));
        try {
          upsertMember(await collabService.updateMember(boardId, userId, { [key]: value }));
        } catch (err) {
          setMembers((list) => list.map((m) => (m.userId === userId ? { ...m, [key]: !value } : m)));
          throw err;
        }
      }),
    }),
    [act, boardId, upsertMember]
  );

  return {
    available: enabled && (isOwner || isGuest),
    active,
    connected,
    isOwner,
    isGuest,
    canWrite,
    canUpload,
    /** Profesor con sesión activa: los elementos se guardan por elemento, no con saveBoard. */
    persistsElements: active && isOwner,
    /** Carpeta de imágenes de la pizarra (la del profesor). */
    storageOwnerId: access.ownerId || user.id,
    share,
    members,
    pending: members.filter((m) => m.status === 'pending'),
    approved: members.filter((m) => m.status === 'approved'),
    online,
    flush,
    ...actions,
  };
}
