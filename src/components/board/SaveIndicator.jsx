import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, CircleDot, Loader2 } from 'lucide-react';

const STATES = {
  saved: { icon: CheckCircle2, text: 'Guardado en este navegador', cls: 'text-emerald-700 bg-emerald-50' },
  saving: { icon: Loader2, text: 'Guardando…', cls: 'text-indigo-700 bg-indigo-50', spin: true },
  dirty: { icon: CircleDot, text: 'Cambios sin guardar', cls: 'text-amber-700 bg-amber-50' },
  error: { icon: AlertCircle, text: 'Error al guardar', cls: 'text-rose-700 bg-rose-50' },
};

export default function SaveIndicator({ status }) {
  const s = STATES[status] || STATES.saved;
  const Icon = s.icon;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, y: 4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}
        aria-live="polite"
      >
        {status === 'saved' ? (
          <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
            <Icon size={14} />
          </motion.span>
        ) : (
          <Icon size={14} className={s.spin ? 'animate-spin' : ''} />
        )}
        <span className="hidden md:inline">{s.text}</span>
      </motion.span>
    </AnimatePresence>
  );
}
