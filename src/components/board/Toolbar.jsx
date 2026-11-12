import { Fragment } from 'react';
import { motion } from 'framer-motion';
import {
  Circle,
  Eraser,
  Hand,
  ImagePlus,
  Minus,
  MousePointer2,
  MoveHorizontal,
  MoveRight,
  Pencil,
  Square,
  Triangle,
  Type,
} from 'lucide-react';

export const TOOL_ITEMS = [
  { id: 'select', icon: MousePointer2, label: 'Selección', key: 'V' },
  { id: 'hand', icon: Hand, label: 'Mano', key: 'H' },
  'sep',
  { id: 'pen', icon: Pencil, label: 'Lápiz', key: 'P' },
  { id: 'eraser', icon: Eraser, label: 'Borrador', key: 'E' },
  'sep',
  { id: 'rect', icon: Square, label: 'Rectángulo', key: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Elipse', key: 'O' },
  { id: 'triangle', icon: Triangle, label: 'Triángulo', key: 'G' },
  { id: 'line', icon: Minus, label: 'Línea', key: 'L' },
  { id: 'arrow', icon: MoveRight, label: 'Flecha', key: 'A' },
  { id: 'biarrow', icon: MoveHorizontal, label: 'Flecha doble', key: 'D' },
  'sep',
  { id: 'text', icon: Type, label: 'Texto', key: 'T' },
  { id: 'image', icon: ImagePlus, label: 'Imagen', key: 'I' },
];

export default function Toolbar({ tool, onToolChange, onPickImage }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 240, delay: 0.05 }}
        role="toolbar"
        aria-label="Herramientas de dibujo"
        className="glass scroll-thin pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl p-1.5"
      >
        {TOOL_ITEMS.map((item, i) => {
          if (item === 'sep') return <span key={`sep-${i}`} aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-slate-200" />;
          const active = tool === item.id;
          const Icon = item.icon;
          const isAction = item.id === 'image';
          return (
            <Fragment key={item.id}>
              <button
                type="button"
                onClick={() => (isAction ? onPickImage() : onToolChange(item.id))}
                aria-label={isAction ? `Subir imagen (${item.key})` : `${item.label} (${item.key})`}
                aria-pressed={isAction ? undefined : active}
                aria-keyshortcuts={item.key}
                title={`${item.label} — ${item.key}`}
                className={`group relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-150 ${
                  active ? 'text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-xl bg-linear-to-br from-indigo-600 to-violet-700 shadow-lg shadow-indigo-500/35"
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <motion.span whileTap={{ scale: 0.82 }} className="relative z-10" aria-hidden="true">
                  <Icon size={19} strokeWidth={active ? 2.3 : 2} />
                </motion.span>
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0.5 right-1 z-10 text-[9px] font-bold ${active ? 'text-white' : 'text-slate-600'}`}
                >
                  {item.key}
                </span>
              </button>
            </Fragment>
          );
        })}
      </motion.div>
    </div>
  );
}
