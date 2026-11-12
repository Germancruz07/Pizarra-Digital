import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { uid } from '../utils/id';

const ToastContext = createContext(() => {});

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-emerald-500' },
  error: { icon: XCircle, cls: 'text-rose-500' },
  warning: { icon: AlertTriangle, cls: 'text-amber-500' },
  info: { icon: Info, cls: 'text-indigo-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, type = 'success', duration = 2800) => {
      const id = uid('t_');
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-20 z-[100] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { icon: Icon, cls } = STYLES[t.type] || STYLES.info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700"
              >
                <Icon size={18} className={`shrink-0 ${cls}`} />
                <span className="flex-1">{t.message}</span>
                <button
                  onClick={() => dismiss(t.id)}
                  className="rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Cerrar notificación"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
