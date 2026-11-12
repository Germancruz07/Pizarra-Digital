import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pipette } from 'lucide-react';
import { PALETTE } from '../../canvas/constants';
import { hexToRgb, isLightColor, normalizeHex, rgbToHex } from '../../utils/color';

/** Paleta amplia + selector personalizado HEX / RGB / nativo. */
export default function ColorPicker({ value, onChange, mergeKey }) {
  const [custom, setCustom] = useState(false);
  const [hex, setHex] = useState(value);
  const rgb = hexToRgb(value);

  useEffect(() => setHex(value), [value]);

  const emit = (color, merge = false) => {
    const n = normalizeHex(color);
    if (n) onChange(n, merge ? mergeKey : undefined);
  };

  const inPalette = PALETTE.includes(value);

  return (
    <div>
      <div className="grid grid-cols-8 gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => emit(c)}
            title={c}
            className={`relative h-6 w-6 rounded-full ring-1 ring-slate-900/10 transition-transform duration-150 hover:scale-115 active:scale-95 ${value === c ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2' : ''}`}
            style={{ background: c }}
          >
            {value === c && (
              <Check size={12} strokeWidth={3} className={`absolute inset-0 m-auto ${isLightColor(c) ? 'text-slate-800' : 'text-white'}`} />
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCustom((v) => !v)}
        className={`mt-2.5 flex w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${custom || !inPalette ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
      >
        <span className="h-4 w-4 rounded-md ring-1 ring-slate-900/10" style={{ background: value }} />
        Personalizado
        <span className="ml-auto font-mono text-[11px] uppercase text-slate-600">{value}</span>
        <Pipette size={13} />
      </button>

      <AnimatePresence initial={false}>
        {custom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => emit(e.target.value, true)}
                  className="h-9 w-11 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
                  aria-label="Selector de color"
                />
                <label className="flex flex-1 items-center rounded-lg border border-slate-200 bg-white px-2">
                  <span className="text-xs font-semibold text-slate-600">HEX</span>
                  <input
                    value={hex}
                    onChange={(e) => {
                      const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                      setHex(v);
                      if (normalizeHex(v)) emit(v, true);
                    }}
                    onBlur={() => setHex(value)}
                    maxLength={7}
                    spellCheck={false}
                    className="w-full bg-transparent px-1.5 py-1.5 font-mono text-xs uppercase outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {['r', 'g', 'b'].map((ch) => (
                  <label key={ch} className="flex items-center rounded-lg border border-slate-200 bg-white px-2">
                    <span className="text-xs font-semibold uppercase text-slate-600">{ch}</span>
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={rgb[ch]}
                      onChange={(e) => {
                        const next = { ...rgb, [ch]: e.target.value };
                        emit(rgbToHex(next.r, next.g, next.b), true);
                      }}
                      className="w-full bg-transparent px-1 py-1.5 text-xs outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
