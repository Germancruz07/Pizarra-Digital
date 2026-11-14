import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownAZ, ArrowUpAZ, CalendarClock, ChevronRight, Crown, GraduationCap, History, Lock, X } from 'lucide-react';
import { historyService } from '../../services';
import { readJSON, writeJSON } from '../../services/storage/localStore';
import { formatDate, pluralize, timeAgo } from '../../utils/format';
import { Skeleton } from '../ui/Loader';

/** Ordenamientos disponibles (la elección se recuerda por usuario en este navegador). */
const SORTS = [
  { id: 'recent', label: 'Más recientes', icon: CalendarClock },
  { id: 'oldest', label: 'Más antiguas', icon: CalendarClock },
  { id: 'az', label: 'Nombre A–Z', icon: ArrowDownAZ },
  { id: 'za', label: 'Nombre Z–A', icon: ArrowUpAZ },
];
const SORT_IDS = new Set(SORTS.map((s) => s.id));
const sortKey = (userId) => `pd:past-classes-sort:${userId}`;

const byName = (a, b) => a.boardName.localeCompare(b.boardName, 'es', { sensitivity: 'base' });
const byDate = (a, b) => (a.lastAccessAt || 0) - (b.lastAccessAt || 0);
const COMPARATORS = {
  recent: (a, b) => byDate(b, a),
  oldest: byDate,
  az: byName,
  za: (a, b) => byName(b, a),
};

/**
 * "Clases pasadas": todas las pizarras en las que ha participado el usuario
 * (las que creó y a las que se unió con código), con nombre, profesor y fechas.
 * Las pizarras propias se completan con la lista de "Mis pizarras", así que también
 * aparecen las que existían antes de que hubiera historial.
 */
export default function PastClasses({ user, boards, boardsLoading, query, onOpenBoard }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState(() => {
    const saved = readJSON(sortKey(user.id), 'recent');
    return SORT_IDS.has(saved) ? saved : 'recent';
  });

  const refresh = useCallback(async () => {
    try {
      setHistory(await historyService.list(user.id));
    } catch {
      setHistory([]); // sin history.sql en la nube: se muestran solo las pizarras propias
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener('pd:boards-changed', onChanged);
    return () => window.removeEventListener('pd:boards-changed', onChanged);
  }, [refresh]);

  const changeSort = (id) => {
    setSort(id);
    try {
      writeJSON(sortKey(user.id), id);
    } catch {
      /* preferencia opcional */
    }
  };

  const hide = async (entry) => {
    setHistory((list) => list.filter((e) => e.boardId !== entry.boardId));
    await historyService.remove(user.id, entry.boardId).catch(() => refresh());
  };

  const entries = useMemo(() => {
    const own = new Map(boards.map((b) => [b.id, b]));
    const map = new Map();
    for (const e of history) {
      if (e.role === 'owner') {
        const b = own.get(e.boardId);
        if (!b) continue; // pizarra propia eliminada
        map.set(e.boardId, { ...e, boardName: b.name, teacherName: user.name, createdAt: b.createdAt || e.createdAt });
      } else {
        map.set(e.boardId, e);
      }
    }
    // Pizarras propias que aún no están en el historial (creadas antes de esta función o nunca abiertas).
    for (const b of boards) {
      if (map.has(b.id)) continue;
      map.set(b.id, {
        boardId: b.id,
        role: 'owner',
        boardName: b.name,
        teacherName: user.name,
        createdAt: b.createdAt,
        lastAccessAt: b.updatedAt || b.createdAt,
        hasAccess: true,
        implicit: true,
      });
    }
    const q = query.trim().toLowerCase();
    const list = [...map.values()].filter(
      (e) => !q || e.boardName.toLowerCase().includes(q) || e.teacherName.toLowerCase().includes(q)
    );
    return list.sort(COMPARATORS[sort]);
  }, [history, boards, user.name, query, sort]);

  const busy = loading || boardsLoading;

  return (
    <section aria-labelledby="clases-pasadas" className="mt-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="clases-pasadas" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-600">
            <History size={15} aria-hidden="true" /> Clases pasadas
          </h2>
          <p className="mt-1 text-xs text-slate-600" aria-live="polite">
            {busy ? 'Cargando tu historial…' : pluralize(entries.length, 'pizarra en la que has participado', 'pizarras en las que has participado')}
          </p>
        </div>
        <div role="group" aria-label="Ordenar clases pasadas" className="relative flex flex-wrap self-start rounded-xl bg-slate-200/60 p-0.5 text-xs font-semibold sm:self-auto">
          {SORTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={sort === id}
              onClick={() => changeSort(id)}
              className={`relative z-10 flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors ${sort === id ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
            >
              {sort === id && <motion.span layoutId="past-sort-pill" className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm" />}
              <Icon size={13} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        {busy && (
          <ul aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 border-b border-slate-200/70 px-4 py-3.5 last:border-b-0">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!busy && !entries.length && (
          <div className="flex flex-col items-center px-6 py-10 text-center text-slate-600">
            <History size={32} aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-700">{query ? `Sin clases que coincidan con “${query}”` : 'Aún no hay clases en tu historial'}</p>
            {!query && <p className="mt-1 text-sm">Las pizarras que crees o a las que te unas con un código aparecerán aquí.</p>}
          </div>
        )}

        {!busy && entries.length > 0 && (
          <ul>
            <AnimatePresence initial={false}>
              {entries.map((e) => (
                <motion.li
                  key={e.boardId}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group flex items-center gap-1 border-b border-slate-200/70 pr-2 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => onOpenBoard(e.boardId)}
                    disabled={!e.hasAccess}
                    title={e.hasAccess ? `Abrir “${e.boardName}”` : 'Ya no tienes acceso a esta pizarra'}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-100/70 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${e.role === 'owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {e.role === 'owner' ? <Crown size={18} /> : <GraduationCap size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold text-slate-900">{e.boardName}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {e.role === 'owner' ? 'Creada por ti' : 'Invitado'}
                        </span>
                        {!e.hasAccess && <Lock size={13} aria-label="Sin acceso" className="shrink-0 text-slate-600" />}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600">
                        <span>Profesor: {e.teacherName || '—'}</span>
                        {e.lastAccessAt && (
                          <span title={formatDate(e.lastAccessAt)}>
                            {e.implicit ? 'Modificada' : 'Último acceso'} {timeAgo(e.lastAccessAt)}
                          </span>
                        )}
                        {e.createdAt && <span className="hidden sm:inline">Creada el {formatDate(e.createdAt)}</span>}
                      </span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  {e.role === 'guest' && (
                    <button
                      type="button"
                      onClick={() => hide(e)}
                      aria-label={`Quitar “${e.boardName}” de Clases pasadas`}
                      title="Quitar del historial"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-600 opacity-70 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                    >
                      <X size={15} />
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
