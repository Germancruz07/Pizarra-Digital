import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collabService } from '../services';
import { applyOps, diffElements, emptyPending, isEmptyOps, mergePending, pendingToOps } from '../collab/elementSync';
import { moveElement } from '../canvas/elements';

const FLUSH_DELAY = 350;
const DRAFT_STALE = 3000; // un trazo remoto sin novedades se descarta (p. ej. se cortó la conexión)
const DRAFT_LINGER = 400; // al soltar, el trazo remoto espera a que llegue el elemento definitivo
const NO_DRAFTS = [];

/**
 * Dibujo en vivo: intervalo entre envíos según cuántas personas hay conectadas.
 * Con pocas personas ~25 envíos/s (fluido); con clases grandes se espacia para no
 * superar la cuota de mensajes de Supabase Realtime (cada envío llega a todos).
 */
const LIVE_MIN_INTERVAL = 40;
const LIVE_MAX_INTERVAL = 120;
const liveInterval = (online) => Math.min(LIVE_MAX_INTERVAL, Math.max(LIVE_MIN_INTERVAL, (online - 1) * 12));

/** Trazos a mano alzada: sus puntos solo crecen, así que se envían por tramos (solo los puntos nuevos). */
const APPENDABLE = new Set(['freedraw', 'erase']);
/** Cada cuántos envíos se manda el trazo completo (para quien entra a mitad de un trazo). */
const FULL_EVERY = 25;
/** Por encima de este total de puntos, mover/redimensionar no se previsualiza en vivo (solo el resultado final). */
const LIVE_MAX_POINTS = 4000;

const round1 = (v) => Math.round(v * 10) / 10;
const compactPoints = (points) => points.map(([x, y]) => [round1(x), round1(y)]);

/** Copia ligera del trazo para enviarlo (coordenadas con un decimal). */
const compactDraft = (el) => (el.points ? { ...el, points: compactPoints(el.points) } : { ...el });

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
  const [drafts, setDrafts] = useState(() => new Map()); // remitente → { el, t }
  const [lives, setLives] = useState(() => new Map()); // remitente → { live, t } (mover/redimensionar en curso)

  const active = enabled && ready && ((isOwner && !!share) || isGuest);

  // Permisos del usuario actual (el profesor siempre puede todo).
  const me = isGuest ? members.find((m) => m.userId === user.id) || access.member : null;
  const canWrite = !isGuest || (me?.status === 'approved' && me.canWrite);
  const canUpload = !isGuest || (me?.status === 'approved' && me.canUpload);

  const latest = useRef({});
  latest.current = { elements, members, canWrite, user, access, onRemoteMeta, onKicked, toast, applyExternal, onlineCount: online.size };

  const channelRef = useRef(null);
  const draftOut = useRef({ el: null, timer: null, last: 0, sent: false, id: null, count: 0, n: 0 }); // trazo propio en curso
  const liveOut = useRef({ live: null, timer: null, last: 0, sent: false }); // transformación propia en curso
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

    // Solo se aceptan cambios del profesor o de estudiantes con permiso de escritura.
    const isAllowed = (from) => {
      const { user: self, access: acc, members: list } = latest.current;
      if (!from || from === self.id) return false;
      return from === acc.ownerId || list.some((m) => m.userId === from && m.status === 'approved' && m.canWrite);
    };

    const dropDraft = (from, onlyIfOlderThan) =>
      setDrafts((map) => {
        const cur = map.get(from);
        if (!cur || (onlyIfOlderThan !== undefined && cur.t > onlyIfOlderThan)) return map;
        const next = new Map(map);
        next.delete(from);
        return next;
      });

    const dropLive = (from, onlyIfOlderThan) =>
      setLives((map) => {
        const cur = map.get(from);
        if (!cur || (onlyIfOlderThan !== undefined && cur.t > onlyIfOlderThan)) return map;
        const next = new Map(map);
        next.delete(from);
        return next;
      });

    const receive = (payload) => {
      if (!payload || !isAllowed(payload.from)) return;
      const ops = { upserts: payload.upserts || [], deletes: payload.deletes || [], order: payload.order || null };
      baseRef.current = applyOps(baseRef.current, ops);
      latest.current.applyExternal((els) => applyOps(els, ops));
      dropDraft(payload.from); // llegó el elemento definitivo: el trazo provisional sobra
      dropLive(payload.from); // y la vista previa del arrastre también
    };

    // Mover/redimensionar en curso de otra persona: { move: { ids, dx, dy } } | { elements } | null.
    const receiveLive = (from, live) => {
      if (!live) {
        const stamp = Date.now();
        setTimeout(() => dropLive(from, stamp), DRAFT_LINGER);
        return;
      }
      const m = live.move;
      const validMove = m && Array.isArray(m.ids) && m.ids.length <= 5000 && Number.isFinite(m.dx) && Number.isFinite(m.dy);
      const validEls = Array.isArray(live.elements) && live.elements.length <= 5000;
      if (!validMove && !validEls) return;
      setLives((map) => new Map(map).set(from, { live, t: Date.now() }));
    };

    // Tramo nuevo de un trazo en curso: se añade a lo ya recibido si encaja; si no, se espera al siguiente envío completo.
    const receiveDelta = (from, delta) => {
      if (!delta || typeof delta.id !== 'string' || !Array.isArray(delta.points) || !Number.isInteger(delta.start)) return;
      setDrafts((map) => {
        const cur = map.get(from);
        const pts = cur?.el?.points;
        if (!cur || cur.el.id !== delta.id || !pts || delta.start < 0 || delta.start > pts.length) return map;
        const el = { ...cur.el, points: pts.slice(0, delta.start).concat(delta.points) };
        return new Map(map).set(from, { el, t: Date.now() });
      });
    };

    // Trazo en curso de otra persona: solo se dibuja, nunca entra en el historial ni se guarda.
    const receiveDraft = (payload) => {
      if (!payload || !isAllowed(payload.from)) return;
      if ('live' in payload) {
        receiveLive(payload.from, payload.live);
        return;
      }
      if (payload.delta) {
        receiveDelta(payload.from, payload.delta);
        return;
      }
      if (!payload.draft) {
        const stamp = Date.now();
        setTimeout(() => dropDraft(payload.from, stamp), DRAFT_LINGER);
        return;
      }
      setDrafts((map) => new Map(map).set(payload.from, { el: payload.draft, t: Date.now() }));
    };

    const sweep = setInterval(() => {
      const limit = Date.now() - DRAFT_STALE;
      const prune = (map) => {
        if (![...map.values()].some((d) => d.t < limit)) return map;
        return new Map([...map].filter(([, d]) => d.t >= limit));
      };
      setDrafts(prune);
      setLives(prune);
    }, 1000);

    const channel = collabService.openBoardChannel(boardId, {
      user: latest.current.user,
      role: isOwner ? 'owner' : 'guest',
      onOps: receive,
      onDraft: receiveDraft,
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
      clearInterval(sweep);
      clearTimeout(draftOut.current.timer);
      draftOut.current = { el: null, timer: null, last: 0, sent: false, id: null, count: 0, n: 0 };
      clearTimeout(liveOut.current.timer);
      liveOut.current = { live: null, timer: null, last: 0, sent: false };
      channel.close();
      channelRef.current = null;
      setConnected(false);
      setOnline(new Set());
      setDrafts(new Map());
      setLives(new Map());
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

  /**
   * Trazo propio en curso → los demás lo ven mientras se dibuja (pointermove), sin esperar a soltar.
   * Envíos limitados (liveInterval, siempre con la versión más reciente) y solo si hay alguien más
   * conectado. En trazos a mano alzada solo viajan los puntos nuevos desde el último envío; cada
   * FULL_EVERY envíos se manda el trazo completo para quien se conecte a mitad.
   * `null` = se soltó o se canceló el trazo (el elemento definitivo llega después como op).
   */
  const sendDraft = useCallback(
    (el) => {
      const out = draftOut.current;
      if (!el) {
        clearTimeout(out.timer);
        out.timer = null;
        out.el = null;
        if (out.sent) channelRef.current?.sendDraft({ from: user.id, draft: null });
        out.sent = false;
        out.id = null;
        out.count = 0;
        out.n = 0;
        return;
      }
      if (!channelRef.current || !latest.current.canWrite || latest.current.onlineCount < 2) return;
      out.el = el;
      if (out.timer) return;
      out.timer = setTimeout(() => {
        out.timer = null;
        const cur = out.el;
        const channel = channelRef.current;
        if (!cur || !channel || !latest.current.canWrite) return;
        const pts = cur.points;
        const canAppend = APPENDABLE.has(cur.type) && pts && cur.id === out.id && pts.length >= out.count && out.n < FULL_EVERY;
        if (canAppend) {
          if (pts.length === out.count) return; // nada nuevo que enviar
          channel.sendDraft({ from: user.id, delta: { id: cur.id, start: out.count, points: compactPoints(pts.slice(out.count)) } });
          out.n += 1;
        } else {
          channel.sendDraft({ from: user.id, draft: compactDraft(cur) });
          out.n = 1;
        }
        out.id = cur.id;
        out.count = pts ? pts.length : 0;
        out.last = Date.now();
        out.sent = true;
      }, Math.max(0, liveInterval(latest.current.onlineCount) - (Date.now() - out.last)));
    },
    [user.id]
  );

  /**
   * Mover / redimensionar / editar puntos en curso → vista previa en vivo para los demás.
   * live = { move: { ids, dx, dy } } (muy ligero) | { elements } | null (se soltó o canceló).
   */
  const sendLive = useCallback(
    (live) => {
      const out = liveOut.current;
      if (!live) {
        clearTimeout(out.timer);
        out.timer = null;
        out.live = null;
        if (out.sent) channelRef.current?.sendDraft({ from: user.id, live: null });
        out.sent = false;
        return;
      }
      if (!channelRef.current || !latest.current.canWrite || latest.current.onlineCount < 2) return;
      if (live.elements && live.elements.reduce((n, el) => n + (el.points?.length || 0), 0) > LIVE_MAX_POINTS) return;
      out.live = live;
      if (out.timer) return;
      out.timer = setTimeout(() => {
        out.timer = null;
        const cur = out.live;
        if (!cur || !channelRef.current || !latest.current.canWrite) return;
        const payload = cur.move
          ? { move: { ids: cur.move.ids, dx: round1(cur.move.dx), dy: round1(cur.move.dy) } }
          : { elements: cur.elements.map(compactDraft) };
        channelRef.current.sendDraft({ from: user.id, live: payload });
        out.last = Date.now();
        out.sent = true;
      }, Math.max(0, liveInterval(latest.current.onlineCount) - (Date.now() - out.last)));
    },
    [user.id]
  );

  const remoteDrafts = useMemo(() => (drafts.size ? [...drafts.values()].map((d) => d.el) : NO_DRAFTS), [drafts]);

  /** Elementos que otra persona está moviendo/redimensionando ahora mismo: id → versión provisional. */
  const remoteLive = useMemo(() => {
    if (!lives.size) return null;
    const byId = new Map(elements.map((el) => [el.id, el]));
    const out = new Map();
    for (const { live } of lives.values()) {
      if (live.move) {
        const { ids, dx, dy } = live.move;
        for (const id of ids) {
          const el = byId.get(id);
          if (el) out.set(id, moveElement(el, dx, dy));
        }
      } else {
        for (const el of live.elements) if (el && byId.has(el.id)) out.set(el.id, el);
      }
    }
    return out.size ? out : null;
  }, [lives, elements]);

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
    sendDraft,
    remoteDrafts,
    sendLive,
    remoteLive,
    ...actions,
  };
}
