import { useCallback, useReducer, useRef } from 'react';

/**
 * Historial de deshacer/rehacer basado en instantáneas inmutables.
 * `mergeKey` agrupa cambios continuos (sliders, selector de color, nudges) en un solo paso.
 */
export function useHistory(initial = [], limit = 150) {
  const ref = useRef({ past: [], present: initial, future: [] });
  const merge = useRef({ key: null, time: 0 });
  const [, rerender] = useReducer((x) => x + 1, 0);

  const commit = useCallback(
    (updater, { mergeKey } = {}) => {
      const s = ref.current;
      const next = typeof updater === 'function' ? updater(s.present) : updater;
      if (next === s.present) return;
      const now = Date.now();
      const canMerge = mergeKey && merge.current.key === mergeKey && now - merge.current.time < 1000;
      merge.current = { key: mergeKey || null, time: now };
      ref.current = canMerge
        ? { ...s, present: next, future: [] }
        : { past: [...s.past, s.present].slice(-limit), present: next, future: [] };
      rerender();
    },
    [limit]
  );

  const undo = useCallback(() => {
    const s = ref.current;
    if (!s.past.length) return;
    ref.current = {
      past: s.past.slice(0, -1),
      present: s.past[s.past.length - 1],
      future: [s.present, ...s.future],
    };
    merge.current = { key: null, time: 0 };
    rerender();
  }, []);

  const redo = useCallback(() => {
    const s = ref.current;
    if (!s.future.length) return;
    ref.current = { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) };
    merge.current = { key: null, time: 0 };
    rerender();
  }, []);

  const reset = useCallback((present) => {
    ref.current = { past: [], present, future: [] };
    merge.current = { key: null, time: 0 };
    rerender();
  }, []);

  /**
   * Cambios que llegan de otra persona (pizarra compartida): se aplican al estado actual y a
   * todo el historial, sin crear un paso de deshacer. Así Ctrl+Z solo deshace lo propio y
   * nunca borra lo que dibujó otro.
   */
  const applyExternal = useCallback((fn) => {
    const s = ref.current;
    const present = fn(s.present);
    const past = s.past.map(fn);
    const future = s.future.map(fn);
    const same = present === s.present && past.every((p, i) => p === s.past[i]) && future.every((f, i) => f === s.future[i]);
    if (same) return;
    ref.current = { past, present, future };
    rerender();
  }, []);

  const s = ref.current;
  return {
    present: s.present,
    commit,
    undo,
    redo,
    reset,
    applyExternal,
    canUndo: s.past.length > 0,
    canRedo: s.future.length > 0,
  };
}
