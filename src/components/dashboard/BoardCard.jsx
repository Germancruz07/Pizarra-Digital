import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Copy, MoreVertical, PenLine, Shapes, Trash2 } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { BACKGROUNDS, backgroundCss } from '../../canvas/constants';
import { formatDate, pluralize, timeAgo } from '../../utils/format';

export default function BoardCard({ board, index, onOpen, onRename, onDuplicate, onDelete }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setMenu(false), []);
  useClickOutside(ref, close, menu);

  const bg = BACKGROUNDS[board.background] || BACKGROUNDS.white;
  const action = (fn) => () => {
    setMenu(false);
    fn(board);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay: Math.min(index * 0.04, 0.4) }}
      className={`group relative rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-[box-shadow,translate] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 ${menu ? 'z-30' : ''}`}
    >
      <button
        type="button"
        onClick={() => onOpen(board)}
        aria-label={`Abrir la pizarra «${board.name}», fondo ${bg.label.toLowerCase()}`}
        className="relative block aspect-[16/10] w-full overflow-hidden rounded-t-3xl"
        style={backgroundCss(board.background, 12)}
      >
        {board.thumbnail ? (
          <img
            src={board.thumbnail}
            alt={`Vista previa de la pizarra «${board.name}»`}
            draggable={false}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`grid h-full w-full place-items-center ${bg.dark ? 'text-slate-400' : 'text-slate-300'}`} aria-hidden="true">
            <PenLine size={36} />
          </div>
        )}
        <div aria-hidden="true" className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/25 group-hover:opacity-100 group-focus-visible:bg-black/25 group-focus-visible:opacity-100">
          <span className="translate-y-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg transition-transform duration-300 group-hover:translate-y-0">
            Abrir pizarra
          </span>
        </div>
        <span aria-hidden="true" className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
          {bg.label}
        </span>
      </button>

      <div className="flex items-start gap-2 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900" title={board.name}>
            {board.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            <span className="flex items-center gap-1" title={formatDate(board.updatedAt)}>
              <Clock size={12} aria-hidden="true" /> Editada {timeAgo(board.updatedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Shapes size={12} aria-hidden="true" /> {pluralize(board.elementCount || 0, 'elemento', 'elementos')}
            </span>
          </div>
        </div>

        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            className={`grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-700 ${menu ? 'bg-slate-100 text-slate-700' : ''}`}
            aria-label={`Opciones de la pizarra «${board.name}»`}
            aria-expanded={menu}
            aria-haspopup="true"
          >
            <MoreVertical size={17} aria-hidden="true" />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 top-full z-40 mt-1.5 w-44 origin-top-right rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-900/5"
              >
                <MenuItem icon={PenLine} onClick={action(onRename)}>
                  Renombrar
                </MenuItem>
                <MenuItem icon={Copy} onClick={action(onDuplicate)}>
                  Duplicar
                </MenuItem>
                <MenuItem icon={Trash2} danger onClick={action(onDelete)}>
                  Eliminar
                </MenuItem>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function MenuItem({ icon: Icon, children, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
        danger ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      <Icon size={15} /> {children}
    </button>
  );
}
