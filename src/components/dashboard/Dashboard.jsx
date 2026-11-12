import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, PenLine, Plus, Search, SearchX, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { boardService } from '../../services';
import ProfileMenu from '../profile/ProfileMenu';
import ThemeToggle from '../ui/ThemeToggle';
import { Skeleton } from '../ui/Loader';
import BoardCard from './BoardCard';
import NewBoardModal from './NewBoardModal';
import { ConfirmDialog, PromptDialog } from '../ui/Dialogs';
import { pluralize } from '../../utils/format';
import SiteFooter from '../legal/SiteFooter';

const SORTS = [
  ['recent', 'Recientes'],
  ['name', 'Nombre'],
];

export default function Dashboard({ onOpenBoard }) {
  const { user, isCloud } = useAuth();
  const toast = useToast();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const firstLoad = useRef(true);

  const refresh = useCallback(async () => {
    try {
      // En la primera carga se deja ver el esqueleto animado un instante en lugar de un parpadeo.
      const minDelay = firstLoad.current ? new Promise((r) => setTimeout(r, 550)) : null;
      firstLoad.current = false;
      const [list] = await Promise.all([boardService.listBoards(user.id), minDelay]);
      setBoards(list);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener('pd:boards-changed', onChanged);
    return () => window.removeEventListener('pd:boards-changed', onChanged);
  }, [refresh]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? boards.filter((b) => b.name.toLowerCase().includes(q)) : [...boards];
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return list;
  }, [boards, query, sort]);

  const handleCreate = async (data) => {
    try {
      const board = await boardService.createBoard(user.id, data);
      setCreating(false);
      toast('Pizarra creada');
      onOpenBoard(board.id);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleRename = async (name) => {
    try {
      await boardService.renameBoard(user.id, renaming.id, name);
      toast('Pizarra renombrada');
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDuplicate = async (board) => {
    try {
      await boardService.duplicateBoard(user.id, board.id);
      toast('Pizarra duplicada');
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    const target = deleting;
    try {
      setBoards((list) => list.filter((b) => b.id !== target.id));
      await boardService.deleteBoard(user.id, target.id);
      toast('Pizarra eliminada', 'info');
    } catch (err) {
      toast(err.message, 'error');
      refresh();
    }
  };

  const firstName = user.name.split(' ')[0];

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(ellipse_at_top,_#eef0ff,_#f5f6fb_55%)] dark:bg-[radial-gradient(ellipse_at_top,_#1d1f3a,_#0e0f15_55%)]">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-500/30" aria-hidden="true">
              <PenLine size={18} />
            </div>
            <span className="hidden text-lg font-bold tracking-tight sm:block">Pizarra</span>
          </div>

          <div role="search" className="relative mx-auto w-full min-w-0 max-w-md">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="search"
              aria-label="Buscar pizarras por nombre"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pizarras…"
              className="w-full rounded-xl border border-transparent bg-slate-100/80 py-2.5 pl-10 pr-9 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-600 hover:bg-slate-200 hover:text-slate-600"
                aria-label="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>

      <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Hola, {firstName} 👋</h1>
            <p className="mt-1.5 text-slate-600" aria-live="polite">
              {loading ? 'Cargando tus pizarras…' : `Tienes ${pluralize(boards.length, 'pizarra guardada', 'pizarras guardadas')} ${isCloud ? 'en tu cuenta' : 'en este navegador'}.`}
            </p>
          </div>
          <button className="btn-primary self-start sm:self-auto" onClick={() => setCreating(true)}>
            <Plus size={18} /> Nueva pizarra
          </button>
        </motion.div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-600">
            <LayoutGrid size={15} aria-hidden="true" /> Mis pizarras
          </h2>
          <div role="group" aria-label="Ordenar pizarras" className="relative flex rounded-xl bg-slate-200/60 p-0.5 text-xs font-semibold">
            {SORTS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={sort === id}
                onClick={() => setSort(id)}
                className={`relative z-10 rounded-lg px-3 py-1.5 transition-colors ${sort === id ? 'text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
              >
                {sort === id && <motion.span layoutId="sort-pill" className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {!query && (
            <motion.button
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setCreating(true)}
              className="group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 bg-white/50 text-slate-600 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50/60 hover:text-indigo-700"
            >
              <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110">
                <Plus size={26} />
              </span>
              <span className="font-semibold">Crear pizarra</span>
            </motion.button>
          )}

          {loading &&
            Array.from({ length: 3 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white"
              >
                <Skeleton className="aspect-[16/10] rounded-none" />
                <div className="space-y-2.5 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </motion.div>
            ))}

          <AnimatePresence>
            {visible.map((board, i) => (
              <BoardCard
                key={board.id}
                board={board}
                index={i}
                onOpen={(b) => onOpenBoard(b.id)}
                onRename={setRenaming}
                onDuplicate={handleDuplicate}
                onDelete={setDeleting}
              />
            ))}
          </AnimatePresence>
        </div>

        {!loading && query && !visible.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-16 flex flex-col items-center text-center text-slate-600">
            <SearchX size={40} aria-hidden="true" className="text-slate-600" />
            <p className="mt-3 font-semibold text-slate-700">Sin resultados para “{query}”</p>
            <p className="text-sm">Prueba con otro nombre.</p>
          </motion.div>
        )}
      </main>

      <NewBoardModal open={creating} onClose={() => setCreating(false)} onCreate={handleCreate} />
      <PromptDialog
        open={!!renaming}
        title="Renombrar pizarra"
        label="Nuevo nombre"
        initialValue={renaming?.name || ''}
        onSubmit={handleRename}
        onClose={() => setRenaming(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="¿Eliminar pizarra?"
        message={`“${deleting?.name || ''}” se eliminará ${isCloud ? 'de tu cuenta en todos tus dispositivos' : 'de este navegador'} junto con sus imágenes. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
      <SiteFooter />
    </div>
  );
}
