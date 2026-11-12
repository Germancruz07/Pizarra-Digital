import { useEffect, useRef } from 'react';
import { FONT_FAMILY, LINE_HEIGHT } from '../../canvas/constants';
import { measureText } from '../../canvas/elements';
import { withAlpha } from '../../utils/color';

/** <textarea> superpuesto al lienzo para escribir/editar textos en su posición exacta. */
export default function TextEditorOverlay({ element, viewport, onChange, onFinish }) {
  const ref = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const t = ref.current;
      if (!t) return;
      t.focus({ preventScroll: true });
      t.setSelectionRange(t.value.length, t.value.length);
    });
    return () => cancelAnimationFrame(id);
  }, [element.id]);

  const z = viewport.zoom;
  const m = measureText(element.text || '', element.fontSize, element.fontWeight);
  const width = element.text ? m.width + element.fontSize * 0.6 : element.fontSize * 7;

  return (
    <textarea
      ref={ref}
      value={element.text}
      wrap="off"
      spellCheck={false}
      placeholder="Escribe aquí…"
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        if (e.relatedTarget?.closest?.('[data-keep-text-edit]')) return;
        onFinish();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
          e.preventDefault();
          onFinish();
        }
      }}
      className="absolute z-20 m-0 resize-none overflow-hidden whitespace-pre border-0 bg-transparent p-0 outline-none placeholder:text-slate-600"
      style={{
        left: element.x * z + viewport.x,
        top: element.y * z + viewport.y,
        width: width * z,
        height: m.height * z,
        fontSize: element.fontSize * z,
        lineHeight: LINE_HEIGHT,
        fontFamily: FONT_FAMILY,
        fontWeight: element.fontWeight === 'bold' ? 700 : 400,
        color: withAlpha(element.strokeColor, element.opacity ?? 1),
        caretColor: element.strokeColor,
        textAlign: element.textAlign,
        outline: '1.5px dashed rgba(99, 102, 241, 0.7)',
        outlineOffset: 6,
        borderRadius: 4,
      }}
    />
  );
}
