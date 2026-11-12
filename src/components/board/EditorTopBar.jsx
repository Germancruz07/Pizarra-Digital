import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Download, Layers, Loader2, Redo2, Save, Trash2, Undo2 } from 'lucide-react';
import IconButton from '../ui/IconButton';
import SaveIndicator from './SaveIndicator';
import ProfileMenu from '../profile/ProfileMenu';
import ThemeToggle from '../ui/ThemeToggle';
import { BACKGROUNDS, backgroundCss } from '../../canvas/constants';
import { useClickOutside } from '../../hooks/useClickOutside';

function BackgroundMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  return (
    <div ref={ref} className="relative">
      <IconButton icon={Layers} label="Fondo" onClick={() => setOpen((o) => !o)} active={open} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-52 origin-top-right rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-900/5"
          >
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fondo de la pizarra</p>
            {Object.entries(BACKGROUNDS).map(([key, bg]) => (
              <button
                key={key}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition ${value === key ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span className="h-6 w-8 rounded-md ring-1 ring-slate-900/10" style={backgroundCss(key, 6)} />
                {bg.label}
                {value === key && <Check size={15} className="ml-auto" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Divider = () => <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />;

export default function EditorTopBar({
  name,
  onNameChange,
  saveStatus,
  onBack,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  background,
  onBackgroundChange,
  onClear,
  onExport,
  exporting = false,
  onSave,
  beforeLogout,
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-2">
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        className="glass pointer-events-auto flex min-w-0 items-center gap-1 rounded-2xl p-1.5"
      >
        <IconButton icon={ArrowLeft} label="Mis pizarras" onClick={onBack} />
        <Divider />
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          onBlur={() => !name.trim() && onNameChange('Pizarra sin título')}
          maxLength={80}
          spellCheck={false}
          aria-label="Nombre de la pizarra"
          className="w-[clamp(90px,22vw,260px)] min-w-0 rounded-lg bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-100 focus:bg-slate-100"
        />
        <SaveIndicator status={saveStatus} />
      </motion.div>

      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260, delay: 0.05 }}
        className="glass pointer-events-auto flex items-center gap-0.5 rounded-2xl p-1.5"
      >
        <IconButton icon={Undo2} label="Deshacer (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
        <IconButton icon={Redo2} label="Rehacer (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} />
        <Divider />
        <BackgroundMenu value={background} onChange={onBackgroundChange} />
        <IconButton icon={Trash2} label="Limpiar pizarra" onClick={onClear} danger />
        <IconButton
          icon={exporting ? Loader2 : Download}
          label={exporting ? 'Exportando…' : 'Exportar PNG'}
          onClick={onExport}
          disabled={exporting}
          className={exporting ? '[&>svg]:animate-spin' : ''}
        />
        <button
          type="button"
          onClick={onSave}
          className="ml-1 hidden items-center gap-1.5 rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:brightness-105 active:scale-95 sm:flex"
          title="Guardar (Ctrl+S)"
        >
          <Save size={15} /> Guardar
        </button>
        <Divider />
        <ThemeToggle />
        <ProfileMenu compact beforeLogout={beforeLogout} />
      </motion.div>
    </div>
  );
}
