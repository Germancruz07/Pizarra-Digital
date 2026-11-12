import { motion } from 'framer-motion';
import { PenLine } from 'lucide-react';

/** Trazo a mano alzada que se dibuja y se borra en bucle, con el logo "escribiendo" encima. */
export function DrawingLoader({ size = 160 }) {
  return (
    <div className="relative" style={{ width: size, height: size * 0.5 }}>
      <svg viewBox="0 0 160 80" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="loader-ink" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="0.5" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <motion.path
          d="M8 52 C 26 14, 44 14, 52 40 S 76 70, 88 40 S 116 8, 128 34 S 146 60, 152 40"
          fill="none"
          stroke="url(#loader-ink)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0, pathOffset: 0 }}
          animate={{ pathLength: [0, 1, 1], pathOffset: [0, 0, 1] }}
          transition={{ duration: 2, times: [0, 0.55, 1], ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.15 }}
        />
      </svg>
      <motion.div
        className="absolute grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/40"
        style={{ top: -10, left: 0 }}
        animate={{ x: [0, size * 0.28, size * 0.52, size * 0.76, size * 0.86, 0], y: [size * 0.2, 0, size * 0.28, 0, size * 0.14, size * 0.2], rotate: [-8, 6, -6, 8, -4, -8] }}
        transition={{ duration: 2.15, ease: 'easeInOut', repeat: Infinity }}
      >
        <PenLine size={16} />
      </motion.div>
    </div>
  );
}

/** Texto con puntos suspensivos animados. */
export function LoadingText({ children, className = '' }) {
  return (
    <p className={`flex items-baseline gap-0.5 text-sm font-medium text-slate-500 ${className}`}>
      {children}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        >
          .
        </motion.span>
      ))}
    </p>
  );
}

/** Pantalla completa de carga (arranque de la app y apertura de pizarras). */
export function FullScreenLoader({ label = 'Cargando', overlay = false }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      className={`grid place-items-center ${overlay ? 'absolute inset-0 z-50 bg-white/80 backdrop-blur-md' : 'h-full'}`}
    >
      <motion.div
        initial={{ scale: 0.92, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col items-center gap-5"
      >
        <DrawingLoader />
        <LoadingText>{label}</LoadingText>
      </motion.div>
    </motion.div>
  );
}

/** Bloque "esqueleto" con brillo que recorre la superficie. */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}
