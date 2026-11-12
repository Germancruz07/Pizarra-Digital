import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Download, Layers, Loader2, MoreHorizontal, Redo2, Save, Trash2, Undo2 } from 'lucide-react';
import IconButton from '../ui/IconButton';
import SaveIndicator from './SaveIndicator';
import ProfileMenu from '../profile/ProfileMenu';
import ThemeToggle from '../ui/ThemeToggle';
import { BACKGROUNDS, backgroundCss } from '../../canvas/constants';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTheme } from '../../context/ThemeContext';

function Dropdown({ label, icon, children, width = 'w-52' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  return (
    <div ref={ref} className="relative">
      <IconButton icon={icon} label={label} onClick={() => setOpen((o) => !o)} active={open} aria-expanded={open} aria-haspopup="true" />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 top-full z-50 mt-2 ${width} origin-top-right rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-900/5`}
          >
            {children(close)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuHeading({ children }) {
  return <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">{children}</p>;
}

function MenuButton({ icon: Icon, children, onClick, active, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active === undefined ? undefined : active}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition disabled:opacity-50 ${
        active ? 'bg-indigo-50 text-indigo-800' : danger ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
      {active && <Check size={15} aria-hidden="true" className="ml-auto" />}
    </button>
  );
}

function BackgroundOptions({ value, onChange, close }) {
  return (
    <>
      <MenuHeading>Fondo de la pizarra</MenuHeading>
      {Object.entries(BACKGROUNDS).map(([key, bg]) => (
        <MenuButton
          key={key}
          active={value === key}
          onClick={() => {
            onChange(key);
            close();
          }}
        >
          <span aria-hidden="true" className="h-6 w-8 rounded-md ring-1 ring-slate-900/10" style={backgroundCss(key, 6)} />
          {bg.label}
        </MenuButton>
      ))}
    </>
  );
}

const Divider = ({ className = '' }) => <span aria-hidden="true" className={`mx-0.5 h-6 w-px shrink-0 bg-slate-200 ${className}`} />;

const THEME_LABELS = { light: 'Tema: claro', dark: 'Tema: oscuro', system: 'Tema: del sistema' };

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
  const { preference, cycleTheme } = useTheme();

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-30 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
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
          className="w-[clamp(70px,24vw,260px)] min-w-0 rounded-lg bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-100 focus:bg-slate-100"
        />
        <SaveIndicator status={saveStatus} />
      </motion.div>

      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260, delay: 0.05 }}
        className="glass pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-2xl p-1.5"
      >
        <IconButton icon={Undo2} label="Deshacer (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
        <IconButton icon={Redo2} label="Rehacer (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} />

        {/* Escritorio y tablet horizontal: todas las acciones visibles */}
        <div className="hidden items-center gap-0.5 md:flex">
          <Divider />
          <Dropdown label="Fondo" icon={Layers}>
            {(close) => <BackgroundOptions value={background} onChange={onBackgroundChange} close={close} />}
          </Dropdown>
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
            aria-keyshortcuts="Control+S"
            className="ml-1 flex items-center gap-1.5 rounded-xl bg-linear-to-br from-indigo-600 to-violet-700 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:brightness-110 active:scale-95"
            title="Guardar (Ctrl+S)"
          >
            <Save size={15} aria-hidden="true" /> Guardar
          </button>
          <Divider />
          <ThemeToggle />
        </div>

        {/* Móvil y tablet vertical: acciones secundarias en un menú */}
        <div className="md:hidden">
          <Dropdown label="Más opciones" icon={MoreHorizontal} width="w-60">
            {(close) => (
              <>
                <MenuButton
                  icon={Save}
                  onClick={() => {
                    onSave();
                    close();
                  }}
                >
                  Guardar
                </MenuButton>
                <MenuButton
                  icon={exporting ? Loader2 : Download}
                  disabled={exporting}
                  onClick={() => {
                    onExport();
                    close();
                  }}
                >
                  Exportar PNG
                </MenuButton>
                <MenuButton
                  icon={Trash2}
                  danger
                  onClick={() => {
                    onClear();
                    close();
                  }}
                >
                  Limpiar pizarra
                </MenuButton>
                <MenuButton onClick={cycleTheme}>{THEME_LABELS[preference]} (cambiar)</MenuButton>
                <div className="my-1 h-px bg-slate-200" aria-hidden="true" />
                <BackgroundOptions value={background} onChange={onBackgroundChange} close={close} />
              </>
            )}
          </Dropdown>
        </div>

        <Divider />
        <ProfileMenu compact beforeLogout={beforeLogout} />
      </motion.div>
    </div>
  );
}
