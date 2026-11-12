import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal accesible: mueve el foco dentro al abrir, lo mantiene dentro con Tab/Shift+Tab,
 * se cierra con Escape y devuelve el foco al elemento que lo abrió.
 */
export default function Modal({ open, onClose, title, subtitle, icon: Icon, children, footer, width = 'max-w-md' }) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;

    const focusFirst = requestAnimationFrame(() => {
      const root = dialogRef.current;
      if (!root || root.contains(document.activeElement)) return;
      const preferred = root.querySelector('[autofocus], input, textarea, select') || root.querySelector(FOCUSABLE);
      (preferred || root).focus();
    });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);

    return () => {
      cancelAnimationFrame(focusFirst);
      window.removeEventListener('keydown', onKey, true);
      const target = returnFocusRef.current;
      if (target && document.contains(target)) requestAnimationFrame(() => target.focus?.());
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[#0b1020]/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={subtitle ? subtitleId : undefined}
            tabIndex={-1}
            className={`relative flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5`}
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          >
            <div className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              {Icon && (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700" aria-hidden="true">
                  <Icon size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                  {title}
                </h2>
                {subtitle && (
                  <p id={subtitleId} className="mt-0.5 text-sm text-slate-600">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Cerrar"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="scroll-thin overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
