import { AnimatePresence, motion } from 'framer-motion';
import { Lock } from 'lucide-react';

/** Estudiante: aviso discreto de qué herramientas tiene bloqueadas por el profesor. */
export default function PermissionNotice({ canWrite, canUpload }) {
  let text = null;
  if (!canWrite && !canUpload) text = 'Solo lectura: el profesor ha bloqueado el dibujo y la subida de imágenes';
  else if (!canWrite) text = 'El profesor ha bloqueado el dibujo';
  else if (!canUpload) text = 'El profesor ha bloqueado la subida de imágenes';

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          role="status"
          aria-live="polite"
          className="glass pointer-events-none absolute left-1/2 top-[64px] z-20 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700 sm:top-[72px]"
        >
          <Lock size={14} aria-hidden="true" className="shrink-0" />
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
