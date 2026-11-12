import { AnimatePresence, motion } from 'framer-motion';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const META = {
  light: { icon: Sun, label: 'Tema claro', next: 'oscuro' },
  dark: { icon: Moon, label: 'Tema oscuro', next: 'del sistema' },
  system: { icon: Monitor, label: 'Tema del sistema', next: 'claro' },
};

/** Botón que alterna claro → oscuro → sistema con un giro animado del icono. */
export default function ThemeToggle({ className = '', tipSide = 'bottom' }) {
  const { preference, cycleTheme } = useTheme();
  const { icon: Icon, label, next } = META[preference];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`${label}. Cambiar a ${next}`}
      className={`group relative grid h-9 w-9 place-items-center rounded-xl text-slate-600 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-90 ${className}`}
    >
      <span className="relative grid h-6 w-6 place-items-center overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={preference}
          initial={{ y: 18, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -18, rotate: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          className="grid place-items-center"
        >
          <Icon size={18} />
        </motion.span>
      </AnimatePresence>
      </span>
      <span
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#111827] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 ${
          tipSide === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
