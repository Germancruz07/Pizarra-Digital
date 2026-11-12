import { motion } from 'framer-motion';
import { Maximize, Minus, Plus } from 'lucide-react';
import IconButton from '../ui/IconButton';

export default function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset, onFit }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass pointer-events-auto absolute bottom-[84px] right-3 z-30 flex items-center gap-0.5 rounded-2xl p-1 lg:bottom-4"
    >
      <IconButton icon={Minus} label="Alejar (Ctrl -)" onClick={onZoomOut} tipSide="top" size={16} />
      <button
        type="button"
        onClick={onReset}
        title="Restablecer al 100%"
        className="h-9 min-w-[58px] rounded-xl px-1 text-xs font-semibold tabular-nums text-slate-700 transition hover:bg-slate-100"
      >
        {Math.round(zoom * 100)}%
      </button>
      <IconButton icon={Plus} label="Acercar (Ctrl +)" onClick={onZoomIn} tipSide="top" size={16} />
      <span className="mx-0.5 h-5 w-px bg-slate-200" />
      <IconButton icon={Maximize} label="Ajustar al contenido" onClick={onFit} tipSide="top" size={16} />
    </motion.div>
  );
}
