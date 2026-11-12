import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeftToLine,
  ArrowRightToLine,
  Bold,
  BringToFront,
  ChevronDown,
  Copy,
  Eraser,
  Hand,
  ImagePlus,
  MousePointer2,
  Scissors,
  SendToBack,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import ColorPicker from './ColorPicker';
import { ERASER_PRESETS, FONT_PRESETS, LINE_TOOLS, SHAPE_TOOLS, SHAPE_TYPES, STROKE_PRESETS } from '../../canvas/constants';

const TOOL_TITLES = {
  select: 'Selección',
  hand: 'Mano',
  pen: 'Lápiz',
  eraser: 'Borrador',
  rect: 'Rectángulo',
  ellipse: 'Elipse',
  triangle: 'Triángulo',
  line: 'Línea',
  arrow: 'Flecha',
  biarrow: 'Flecha doble',
  text: 'Texto',
};

function Section({ title, children, right }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</h4>
        {right}
      </div>
      {children}
    </div>
  );
}

function Slider({ value, min, max, step = 1, onChange, suffix = '' }) {
  return (
    <div className="flex items-center gap-2.5">
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-600">
        {Math.round(value)}
        {suffix}
      </span>
    </div>
  );
}

function Segmented({ options, value, onChange, id }) {
  return (
    <div className="relative flex rounded-xl bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          title={o.title || o.label}
          onClick={() => onChange(o.value)}
          className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${value === o.value ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
          )}
          {o.icon && <o.icon size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Presets({ values, value, onChange, render }) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`grid h-8 min-w-8 place-items-center rounded-lg px-1 text-[11px] font-semibold transition active:scale-90 ${Math.round(value) === v ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          title={`${v}px`}
        >
          {render ? render(v, Math.round(value) === v) : v}
        </button>
      ))}
    </div>
  );
}

function capabilitiesFor(mode, tool, selection) {
  if (mode === 'textedit') return { stroke: true, text: true, opacity: true, strokeLabel: 'Color del texto' };
  if (mode === 'selection') {
    const types = new Set(selection.map((e) => e.type));
    const onlyText = types.size === 1 && types.has('text');
    return {
      stroke: [...types].some((t) => t !== 'image'),
      strokeLabel: onlyText ? 'Color del texto' : 'Color del trazo',
      width: [...types].some((t) => ['freedraw', 'line', 'arrow', ...SHAPE_TYPES].includes(t)),
      fill: [...types].some((t) => SHAPE_TYPES.includes(t)),
      text: types.has('text'),
      arrows: types.has('line') || types.has('arrow'),
      opacity: true,
      layers: true,
    };
  }
  if (tool === 'pen') return { stroke: true, width: true, opacity: true, strokeLabel: 'Color del trazo' };
  if (SHAPE_TOOLS.includes(tool)) return { stroke: true, width: true, fill: true, opacity: true, strokeLabel: 'Color del borde' };
  if (LINE_TOOLS.includes(tool)) return { stroke: true, width: true, opacity: true, strokeLabel: 'Color de la línea' };
  if (tool === 'text') return { stroke: true, text: true, opacity: true, strokeLabel: 'Color del texto' };
  return {};
}

export default function PropertiesPanel({
  tool,
  style,
  eraser,
  onEraserChange,
  onStyleChange,
  selection,
  textEdit,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onPickImage,
}) {
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  const mode = textEdit ? 'textedit' : selection.length ? 'selection' : tool;
  const values = textEdit ? { ...style, ...textEdit.element } : selection.length ? { ...style, ...selection[selection.length - 1] } : style;
  const caps = capabilitiesFor(mode, tool, selection);
  const title =
    mode === 'textedit' ? 'Editando texto' : mode === 'selection' ? `Selección (${selection.length})` : TOOL_TITLES[tool] || 'Propiedades';

  const set = (patch, mergeKey) => onStyleChange(patch, mergeKey);

  return (
    <motion.aside
      data-keep-text-edit
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260, delay: 0.1 }}
      className="glass pointer-events-auto absolute left-3 top-[76px] z-20 w-[248px] overflow-hidden rounded-2xl"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <SlidersHorizontal size={15} className="text-indigo-500" />
        <AnimatePresence mode="wait">
          <motion.span
            key={title}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex-1 truncate text-sm font-semibold text-slate-800"
          >
            {title}
          </motion.span>
        </AnimatePresence>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="scroll-thin max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto border-t border-slate-100 px-4 pb-4 pt-3"
              >
                {mode === 'eraser' && (
                  <>
                    <Section title="Modo">
                      <Segmented
                        id="eraser-mode"
                        value={eraser.mode}
                        onChange={(m) => onEraserChange({ mode: m })}
                        options={[
                          { value: 'object', label: 'Objeto', icon: Eraser, title: 'Borra trazos y objetos completos' },
                          { value: 'area', label: 'Área', icon: Scissors, title: 'Borra solo la zona por la que pasas' },
                        ]}
                      />
                      <p className="text-[11px] leading-snug text-slate-500">
                        {eraser.mode === 'object'
                          ? 'Elimina por completo cada trazo, figura, texto o imagen que toques.'
                          : 'Borra únicamente la zona por la que pasa el cursor, como una goma real.'}
                      </p>
                    </Section>
                    <Section title="Tamaño">
                      <div className="grid h-24 place-items-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
                        <motion.div
                          animate={{ width: Math.min(eraser.size, 88), height: Math.min(eraser.size, 88) }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                          className="rounded-full border-2 border-slate-700 bg-white shadow-sm"
                        />
                      </div>
                      <Slider value={eraser.size} min={4} max={120} onChange={(v) => onEraserChange({ size: v })} suffix="px" />
                      <Presets values={ERASER_PRESETS} value={eraser.size} onChange={(v) => onEraserChange({ size: v })} />
                    </Section>
                  </>
                )}

                {mode === 'hand' && (
                  <Hint icon={Hand}>
                    Arrastra para moverte por la pizarra. También puedes mantener <Kbd>Espacio</Kbd> y arrastrar, o usar la rueda del ratón.
                  </Hint>
                )}

                {mode === 'select' && (
                  <Hint icon={MousePointer2}>
                    Haz clic en un elemento para seleccionarlo o arrastra para seleccionar varios. <Kbd>Shift</Kbd> añade a la selección y{' '}
                    <Kbd>Supr</Kbd> elimina. Doble clic crea un texto.
                  </Hint>
                )}

                {mode === 'image' && (
                  <div className="space-y-2">
                    <button type="button" onClick={onPickImage} className="btn-primary w-full">
                      <Upload size={16} /> Subir imagen
                    </button>
                    <Hint icon={ImagePlus}>O arrastra y suelta archivos PNG, JPG o WEBP directamente sobre la pizarra.</Hint>
                  </div>
                )}

                {caps.stroke && (
                  <Section title={caps.strokeLabel}>
                    <ColorPicker value={values.strokeColor} mergeKey="color:stroke" onChange={(c, mk) => set({ strokeColor: c }, mk)} />
                  </Section>
                )}

                {caps.width && (
                  <Section title="Grosor">
                    <Presets
                      values={STROKE_PRESETS}
                      value={values.strokeWidth}
                      onChange={(v) => set({ strokeWidth: v })}
                      render={(v, active) => (
                        <span
                          className={`block rounded-full ${active ? 'bg-white' : 'bg-slate-600'}`}
                          style={{ width: Math.max(3, Math.min(v, 18)), height: Math.max(3, Math.min(v, 18)) }}
                        />
                      )}
                    />
                    <Slider value={values.strokeWidth} min={1} max={30} onChange={(v) => set({ strokeWidth: v }, 'slider:width')} suffix="px" />
                  </Section>
                )}

                {caps.fill && (
                  <Section title="Relleno">
                    <Segmented
                      id="fill"
                      value={!!values.fillEnabled}
                      onChange={(v) => set({ fillEnabled: v })}
                      options={[
                        { value: false, label: 'Transparente' },
                        { value: true, label: 'Sólido' },
                      ]}
                    />
                    <AnimatePresence initial={false}>
                      {values.fillEnabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-2 overflow-hidden pt-1"
                        >
                          <ColorPicker value={values.fillColor} mergeKey="color:fill" onChange={(c, mk) => set({ fillColor: c }, mk)} />
                          <div>
                            <span className="text-[11px] font-medium text-slate-500">Opacidad del relleno</span>
                            <Slider
                              value={(values.fillOpacity ?? 1) * 100}
                              min={5}
                              max={100}
                              onChange={(v) => set({ fillOpacity: v / 100 }, 'slider:fillOpacity')}
                              suffix="%"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Section>
                )}

                {caps.text && (
                  <Section title="Texto">
                    <Presets values={FONT_PRESETS} value={values.fontSize} onChange={(v) => set({ fontSize: v })} />
                    <Slider value={values.fontSize} min={10} max={120} onChange={(v) => set({ fontSize: v }, 'slider:font')} suffix="px" />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => set({ fontWeight: values.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        className={`grid h-8 w-10 place-items-center rounded-xl transition ${values.fontWeight === 'bold' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        title="Negrita"
                      >
                        <Bold size={15} />
                      </button>
                      <div className="flex-1">
                        <Segmented
                          id="align"
                          value={values.textAlign}
                          onChange={(v) => set({ textAlign: v })}
                          options={[
                            { value: 'left', icon: AlignLeft, title: 'Izquierda' },
                            { value: 'center', icon: AlignCenter, title: 'Centro' },
                            { value: 'right', icon: AlignRight, title: 'Derecha' },
                          ]}
                        />
                      </div>
                    </div>
                  </Section>
                )}

                {caps.arrows && (
                  <Section title="Puntas de flecha">
                    <div className="flex gap-2">
                      <ToggleButton active={!!values.arrowStart} onClick={() => set({ arrowStart: !values.arrowStart })} icon={ArrowLeftToLine}>
                        Inicio
                      </ToggleButton>
                      <ToggleButton active={!!values.arrowEnd} onClick={() => set({ arrowEnd: !values.arrowEnd })} icon={ArrowRightToLine}>
                        Fin
                      </ToggleButton>
                    </div>
                  </Section>
                )}

                {caps.opacity && (
                  <Section title={caps.stroke ? 'Opacidad del trazo' : 'Opacidad'}>
                    <Slider value={(values.opacity ?? 1) * 100} min={5} max={100} onChange={(v) => set({ opacity: v / 100 }, 'slider:opacity')} suffix="%" />
                  </Section>
                )}

                {caps.layers && (
                  <Section title="Acciones">
                    <div className="grid grid-cols-2 gap-1.5">
                      <ActionButton icon={BringToFront} onClick={onBringToFront}>
                        Al frente
                      </ActionButton>
                      <ActionButton icon={SendToBack} onClick={onSendToBack}>
                        Al fondo
                      </ActionButton>
                      <ActionButton icon={Copy} onClick={onDuplicate}>
                        Duplicar
                      </ActionButton>
                      <ActionButton icon={Trash2} onClick={onDelete} danger>
                        Eliminar
                      </ActionButton>
                    </div>
                  </Section>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

function Hint({ icon: Icon, children }) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-indigo-50/70 p-3 text-xs leading-relaxed text-slate-600">
      <Icon size={16} className="mt-0.5 shrink-0 text-indigo-500" />
      <p>{children}</p>
    </div>
  );
}

function Kbd({ children }) {
  return <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-700 shadow-sm">{children}</kbd>;
}

function ToggleButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition active:scale-95 ${active ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
    >
      <Icon size={14} /> {children}
    </button>
  );
}

function ActionButton({ icon: Icon, onClick, children, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition active:scale-95 ${danger ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
    >
      <Icon size={14} /> {children}
    </button>
  );
}
