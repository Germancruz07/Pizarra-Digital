import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus } from 'lucide-react';
import { drawBackground, drawElement } from '../../canvas/renderer';
import {
  createElement,
  getElementBounds,
  hitTest,
  isLinear,
  moveElement,
  transformElement,
} from '../../canvas/elements';
import { expandRect, normalizeRect, pointInRect, rectsIntersect, snapAngle, unionBounds } from '../../canvas/geometry';
import { screenToWorld, worldToScreen, zoomAtPoint } from '../../canvas/viewport';
import {
  ACCENT,
  HANDLE_CURSORS,
  HANDLE_SIZE,
  SELECTION_PAD,
  drawHandles,
  drawPointHandles,
  getHandlePositions,
  resizeBox,
  screenRect,
} from '../../canvas/selection';
import { getImage, subscribeImages } from '../../canvas/imageCache';
import { BACKGROUNDS, LINE_TOOLS, SHAPE_TOOLS } from '../../canvas/constants';

const isTypingTarget = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
const cornersOnlyFor = (sel) => sel.length === 1 && (sel[0].type === 'text' || sel[0].type === 'image');

/**
 * Lienzo de dibujo basado en objetos.
 * Dos capas <canvas>: fondo (patrón) y elementos (+ superposición de selección).
 * Las interacciones en curso se guardan en refs y se renderizan con requestAnimationFrame;
 * solo al soltar el puntero se confirma el cambio en el historial.
 */
export default function WhiteboardCanvas({
  elements,
  commit,
  tool,
  style,
  eraser,
  viewport,
  setViewport,
  background,
  selectedIds,
  setSelectedIds,
  editingId,
  isEditingText,
  onFinishTextEdit,
  onTextRequest,
  onDropImages,
  onResize,
  children,
}) {
  const containerRef = useRef(null);
  const bgRef = useRef(null);
  const canvasRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const rafRef = useRef(0);

  const liveRef = useRef(null); // elementos transformados durante mover/redimensionar
  const draftRef = useRef(null); // elemento que se está creando
  const interactionRef = useRef(null);
  const pointerRef = useRef(null); // última posición del puntero (pantalla)
  const hoverIdRef = useRef(null);
  const spaceRef = useRef(false);
  const touchesRef = useRef(new Map());

  const [dragOver, setDragOver] = useState(false);

  // Props más recientes accesibles desde handlers y el render.
  const props = useRef({});
  props.current = {
    elements,
    tool,
    style,
    eraser,
    viewport,
    background,
    selectedSet: new Set(selectedIds),
    editingId,
    isEditingText,
  };
  const callbacks = useRef({});
  callbacks.current = { onResize, onFinishTextEdit, onTextRequest, onDropImages };

  /* ------------------------------------------------------------ render */

  const renderRef = useRef(null);
  renderRef.current = () => {
    rafRef.current = 0;
    const canvas = canvasRef.current;
    const bgCanvas = bgRef.current;
    if (!canvas || !bgCanvas) return;
    const { w, h, dpr } = sizeRef.current;
    if (!w || !h) return;
    const { viewport: vp, background: bgKey, editingId: editId, selectedSet, tool: curTool, eraser: er, style: st } =
      props.current;

    const bctx = bgCanvas.getContext('2d');
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(bctx, bgKey, vp, w, h);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * vp.zoom, 0, 0, dpr * vp.zoom, dpr * vp.x, dpr * vp.y);

    const els = liveRef.current || props.current.elements;
    const view = { x: -vp.x / vp.zoom, y: -vp.y / vp.zoom, width: w / vp.zoom, height: h / vp.zoom };
    const it = interactionRef.current;
    const fading = it?.type === 'erase-object' ? it.toDelete : null;

    for (const el of els) {
      if (el.id === editId) continue;
      const vb = expandRect(getElementBounds(el), (el.strokeWidth || 0) + 24);
      if (!rectsIntersect(vb, view)) continue;
      drawElement(ctx, el, { getImage, alpha: fading?.has(el.id) ? 0.2 : 1 });
    }
    if (draftRef.current) drawElement(ctx, draftRef.current, { getImage });

    // --- Superposición en coordenadas de pantalla
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    const sel = els.filter((e) => selectedSet.has(e.id));

    if (curTool === 'select' && !it && hoverIdRef.current && !selectedSet.has(hoverIdRef.current)) {
      const hovered = els.find((e) => e.id === hoverIdRef.current);
      if (hovered) {
        const r = screenRect(getElementBounds(hovered), vp, 4);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x, r.y, r.width, r.height);
      }
    }

    if (sel.length) {
      const single = sel.length === 1 ? sel[0] : null;
      if (single && isLinear(single)) {
        drawPointHandles(ctx, single.points.map(([x, y]) => worldToScreen(vp, x, y)));
      } else {
        if (sel.length > 1) {
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
          ctx.lineWidth = 1;
          for (const el of sel) {
            const r = screenRect(getElementBounds(el), vp, 2);
            ctx.strokeRect(r.x, r.y, r.width, r.height);
          }
        }
        const b = unionBounds(sel.map(getElementBounds));
        const r = screenRect(b, vp, SELECTION_PAD);
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(r.x, r.y, r.width, r.height);
        if (!it || it.type !== 'move') drawHandles(ctx, getHandlePositions(b, vp, cornersOnlyFor(sel)));
      }
    }

    if (it?.type === 'marquee' && it.current) {
      const a = worldToScreen(vp, it.start.x, it.start.y);
      const c = worldToScreen(vp, it.current.x, it.current.y);
      const r = normalizeRect(a.x, a.y, c.x, c.y);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
      ctx.setLineDash([]);
    }

    const pointer = pointerRef.current;
    if (pointer && !spaceRef.current) {
      const dark = BACKGROUNDS[bgKey]?.dark;
      if (curTool === 'eraser') {
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, Math.max(er.size / 2, 2), 0, Math.PI * 2);
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
        ctx.fill();
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.8)' : 'rgba(15,23,42,0.75)';
        ctx.lineWidth = 1.25;
        ctx.stroke();
        if (er.mode === 'area') {
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(pointer.x, pointer.y, Math.max(er.size / 2 - 3, 1), 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (curTool === 'pen' && !it) {
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, Math.max((st.strokeWidth * vp.zoom) / 2, 1.5), 0, Math.PI * 2);
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  };

  const requestRender = () => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(() => renderRef.current());
  };

  // Re-render tras cada cambio de props.
  useEffect(() => {
    requestRender();
  });

  useEffect(() => {
    const unsub = subscribeImages(requestRender);
    document.fonts?.ready.then(requestRender);
    return () => {
      unsub();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, []);

  // Tamaño + devicePixelRatio (pantallas de alta resolución).
  useLayoutEffect(() => {
    const container = containerRef.current;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      for (const c of [bgRef.current, canvasRef.current]) {
        c.width = Math.max(1, Math.round(rect.width * dpr));
        c.height = Math.max(1, Math.round(rect.height * dpr));
        c.style.width = `${rect.width}px`;
        c.style.height = `${rect.height}px`;
      }
      callbacks.current.onResize?.({ w: rect.width, h: rect.height });
      renderRef.current();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    let mq = null;
    const onDprChange = () => {
      resize();
      watch();
    };
    const watch = () => {
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener('change', onDprChange, { once: true });
    };
    watch();
    return () => {
      ro.disconnect();
      mq?.removeEventListener('change', onDprChange);
    };
  }, []);

  /* ----------------------------------------------------------- helpers */

  const toScreen = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toWorld = (s) => screenToWorld(props.current.viewport, s.x, s.y);

  const hitElementAt = (world) => {
    const { elements: els, viewport: vp } = props.current;
    const tol = 6 / vp.zoom;
    for (let i = els.length - 1; i >= 0; i--) {
      if (hitTest(els[i], world.x, world.y, tol)) return els[i];
    }
    return null;
  };

  const selectedElements = () => props.current.elements.filter((e) => props.current.selectedSet.has(e.id));

  const hitHandleAt = (screen) => {
    const sel = selectedElements();
    if (!sel.length) return null;
    const vp = props.current.viewport;
    if (sel.length === 1 && isLinear(sel[0])) {
      const idx = sel[0].points.findIndex(([x, y]) => {
        const p = worldToScreen(vp, x, y);
        return Math.hypot(p.x - screen.x, p.y - screen.y) <= HANDLE_SIZE;
      });
      return idx >= 0 ? { kind: 'point', index: idx, el: sel[0] } : null;
    }
    const bounds = unionBounds(sel.map(getElementBounds));
    const corners = cornersOnlyFor(sel);
    const h = getHandlePositions(bounds, vp, corners).find(
      (hp) => Math.abs(screen.x - hp.x) <= HANDLE_SIZE && Math.abs(screen.y - hp.y) <= HANDLE_SIZE
    );
    return h ? { kind: 'resize', handle: h.name, bounds, sel, keepAspect: corners } : null;
  };

  const setCursor = (c) => {
    if (canvasRef.current && canvasRef.current.style.cursor !== c) canvasRef.current.style.cursor = c;
  };

  const updateCursor = (screen) => {
    const it = interactionRef.current;
    const t = props.current.tool;
    if (it?.type === 'pan') return setCursor('grabbing');
    if (spaceRef.current || t === 'hand') return setCursor('grab');
    if (t === 'eraser') return setCursor('none');
    if (t === 'text') return setCursor('text');
    if (t !== 'select') return setCursor('crosshair');
    if (it?.type === 'move') return setCursor('move');
    if (it?.type === 'resize') return setCursor(HANDLE_CURSORS[it.handle]);
    if (it?.type === 'point') return setCursor('crosshair');
    if (!screen) return setCursor('default');
    const h = hitHandleAt(screen);
    if (h) return setCursor(h.kind === 'point' ? 'crosshair' : HANDLE_CURSORS[h.handle]);
    const world = toWorld(screen);
    if (hitElementAt(world)) return setCursor('move');
    const sel = selectedElements();
    if (sel.length && pointInRect(world.x, world.y, unionBounds(sel.map(getElementBounds)))) return setCursor('move');
    return setCursor('default');
  };

  useEffect(() => {
    updateCursor(pointerRef.current);
    hoverIdRef.current = null;
  }, [tool]);

  // Barra espaciadora = paneo temporal.
  useEffect(() => {
    const down = (e) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      if (!spaceRef.current) {
        spaceRef.current = true;
        updateCursor(pointerRef.current);
        requestRender();
      }
    };
    const up = (e) => {
      if (e.code !== 'Space') return;
      spaceRef.current = false;
      updateCursor(pointerRef.current);
      requestRender();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Rueda: desplazar; Ctrl/⌘ + rueda (o pellizco de trackpad): zoom al cursor.
  useEffect(() => {
    const canvas = canvasRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const s = toScreen(e);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? sizeRef.current.h : 1;
      if (e.ctrlKey || e.metaKey) {
        const d = Math.max(-25, Math.min(25, e.deltaY * unit));
        setViewport((vp) => zoomAtPoint(vp, vp.zoom * Math.exp(-d * 0.01), s.x, s.y));
      } else {
        let dx = e.deltaX * unit;
        let dy = e.deltaY * unit;
        if (e.shiftKey && !dx) {
          dx = dy;
          dy = 0;
        }
        setViewport((vp) => ({ ...vp, x: vp.x - dx, y: vp.y - dy }));
      }
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [setViewport]);

  /* --------------------------------------------------- borrado objetos */

  const eraseAlong = (it, from, to) => {
    const { elements: els, viewport: vp, eraser: er } = props.current;
    const radius = er.size / 2 / vp.zoom;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(dist / Math.max(radius * 0.5, 0.5)));
    for (let s = 0; s <= steps; s++) {
      const px = from.x + ((to.x - from.x) * s) / steps;
      const py = from.y + ((to.y - from.y) * s) / steps;
      for (const el of els) {
        if (!it.toDelete.has(el.id) && hitTest(el, px, py, radius)) it.toDelete.add(el.id);
      }
    }
  };

  /* ------------------------------------------------------ interacciones */

  const cancelInteraction = () => {
    interactionRef.current = null;
    draftRef.current = null;
    liveRef.current = null;
  };

  const startPinch = () => {
    const pts = [...touchesRef.current.values()];
    cancelInteraction();
    interactionRef.current = {
      type: 'pinch',
      startDist: Math.max(Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), 1),
      startCenter: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      vp: { ...props.current.viewport },
    };
  };

  const handlePointerDown = (e) => {
    const screen = toScreen(e);
    if (e.pointerType === 'touch') {
      touchesRef.current.set(e.pointerId, screen);
      if (touchesRef.current.size === 2) {
        startPinch();
        requestRender();
        return;
      }
      if (touchesRef.current.size > 2) return;
    }

    e.preventDefault();
    if (props.current.isEditingText) {
      callbacks.current.onFinishTextEdit?.();
      return;
    }
    if (e.button !== 0 && e.button !== 1) return;
    canvasRef.current.setPointerCapture?.(e.pointerId);
    pointerRef.current = screen;

    const { tool: t, style: st, eraser: er, viewport: vp, selectedSet } = props.current;
    const world = toWorld(screen);

    if (e.button === 1 || t === 'hand' || spaceRef.current) {
      interactionRef.current = { type: 'pan', start: screen, vp: { ...vp } };
      updateCursor(screen);
      return;
    }

    if (t === 'select') {
      const handle = hitHandleAt(screen);
      if (handle?.kind === 'point') {
        interactionRef.current = { type: 'point', index: handle.index, base: handle.el };
        return;
      }
      if (handle?.kind === 'resize') {
        const b = handle.bounds;
        const edgeX = handle.handle.includes('w') ? b.x : handle.handle.includes('e') ? b.x + b.width : world.x;
        const edgeY = handle.handle.includes('n') ? b.y : handle.handle.includes('s') ? b.y + b.height : world.y;
        interactionRef.current = {
          type: 'resize',
          handle: handle.handle,
          bounds: b,
          keepAspect: handle.keepAspect,
          snapshot: new Map(handle.sel.map((el) => [el.id, el])),
          offX: edgeX - world.x,
          offY: edgeY - world.y,
        };
        updateCursor(screen);
        return;
      }

      const hit = hitElementAt(world);
      let ids = null;
      if (hit) {
        if (e.shiftKey) {
          ids = selectedSet.has(hit.id) ? [...selectedSet].filter((id) => id !== hit.id) : [...selectedSet, hit.id];
        } else {
          ids = selectedSet.has(hit.id) ? [...selectedSet] : [hit.id];
        }
        setSelectedIds(ids);
        if (!ids.includes(hit.id)) return;
      } else if (selectedSet.size) {
        const b = unionBounds(selectedElements().map(getElementBounds));
        if (b && pointInRect(world.x, world.y, b)) ids = [...selectedSet];
      }

      if (ids) {
        const idSet = new Set(ids);
        interactionRef.current = {
          type: 'move',
          start: world,
          startScreen: screen,
          moved: false,
          snapshot: new Map(props.current.elements.filter((el) => idSet.has(el.id)).map((el) => [el.id, el])),
        };
        return;
      }

      if (!e.shiftKey) setSelectedIds([]);
      interactionRef.current = {
        type: 'marquee',
        start: world,
        current: world,
        baseIds: e.shiftKey ? [...selectedSet] : [],
        lastKey: '',
      };
      return;
    }

    if (t === 'pen') {
      draftRef.current = createElement('freedraw', st, { points: [[world.x, world.y]] });
      interactionRef.current = { type: 'draw', smooth: true, last: world };
      return;
    }

    if (t === 'eraser') {
      if (er.mode === 'area') {
        draftRef.current = createElement('erase', { strokeWidth: er.size / vp.zoom }, { points: [[world.x, world.y]] });
        interactionRef.current = { type: 'draw', smooth: false, last: world };
      } else {
        const it = { type: 'erase-object', toDelete: new Set(), last: world };
        interactionRef.current = it;
        eraseAlong(it, world, world);
      }
      requestRender();
      return;
    }

    if (SHAPE_TOOLS.includes(t)) {
      draftRef.current = createElement(t, st, { x: world.x, y: world.y, width: 0, height: 0 });
      interactionRef.current = { type: 'shape', origin: world };
      return;
    }

    if (LINE_TOOLS.includes(t)) {
      const type = t === 'line' ? 'line' : 'arrow';
      draftRef.current = createElement(
        type,
        { ...st, arrowStart: t === 'biarrow', arrowEnd: t !== 'line' },
        { points: [[world.x, world.y], [world.x, world.y]] }
      );
      interactionRef.current = { type: 'shape', origin: world };
      return;
    }

    if (t === 'text') {
      const hit = hitElementAt(world);
      callbacks.current.onTextRequest?.(world, hit?.type === 'text' ? hit : null);
    }
  };

  const handlePointerMove = (e) => {
    const screen = toScreen(e);
    const it = interactionRef.current;

    if (e.pointerType === 'touch' && touchesRef.current.has(e.pointerId)) {
      touchesRef.current.set(e.pointerId, screen);
      if (it?.type === 'pinch') {
        const pts = [...touchesRef.current.values()];
        if (pts.length < 2) return;
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const zoomed = zoomAtPoint(it.vp, (it.vp.zoom * dist) / it.startDist, it.startCenter.x, it.startCenter.y);
        setViewport({
          ...zoomed,
          x: zoomed.x + center.x - it.startCenter.x,
          y: zoomed.y + center.y - it.startCenter.y,
        });
        return;
      }
    }

    pointerRef.current = screen;
    const vp = props.current.viewport;
    const world = toWorld(screen);

    if (!it) {
      if (props.current.tool === 'select') {
        const hovered = hitElementAt(world);
        const id = hovered?.id || null;
        if (id !== hoverIdRef.current) {
          hoverIdRef.current = id;
          requestRender();
        }
      }
      updateCursor(screen);
      if (props.current.tool === 'eraser' || props.current.tool === 'pen') requestRender();
      return;
    }

    switch (it.type) {
      case 'pan':
        setViewport({ ...it.vp, x: it.vp.x + screen.x - it.start.x, y: it.vp.y + screen.y - it.start.y });
        break;

      case 'draw': {
        const d = draftRef.current;
        if (!d) break;
        const events = e.nativeEvent.getCoalescedEvents?.() || [];
        const samples = events.length ? events.map((ev) => toWorld(toScreen(ev))) : [world];
        for (const raw of samples) {
          const last = it.last;
          if (Math.hypot(raw.x - last.x, raw.y - last.y) * vp.zoom < 1.2) continue;
          const p = it.smooth ? { x: last.x + (raw.x - last.x) * 0.6, y: last.y + (raw.y - last.y) * 0.6 } : raw;
          d.points.push([p.x, p.y]);
          it.last = p;
        }
        it.raw = world;
        break;
      }

      case 'erase-object':
        eraseAlong(it, it.last, world);
        it.last = world;
        break;

      case 'shape': {
        const d = draftRef.current;
        const o = it.origin;
        if (d.points) {
          const [x2, y2] = e.shiftKey ? snapAngle(o.x, o.y, world.x, world.y) : [world.x, world.y];
          d.points = [[o.x, o.y], [x2, y2]];
        } else {
          let x2 = world.x;
          let y2 = world.y;
          if (e.shiftKey) {
            const dx = x2 - o.x;
            const dy = y2 - o.y;
            const s = Math.max(Math.abs(dx), Math.abs(dy));
            x2 = o.x + (Math.sign(dx) || 1) * s;
            y2 = o.y + (Math.sign(dy) || 1) * s;
          }
          Object.assign(d, normalizeRect(o.x, o.y, x2, y2));
        }
        break;
      }

      case 'move': {
        if (!it.moved && Math.hypot(screen.x - it.startScreen.x, screen.y - it.startScreen.y) < 3) break;
        it.moved = true;
        const dx = world.x - it.start.x;
        const dy = world.y - it.start.y;
        liveRef.current = props.current.elements.map((el) =>
          it.snapshot.has(el.id) ? moveElement(it.snapshot.get(el.id), dx, dy) : el
        );
        break;
      }

      case 'resize': {
        const nb = resizeBox(it.bounds, it.handle, world.x + it.offX, world.y + it.offY, it.keepAspect || e.shiftKey);
        liveRef.current = props.current.elements.map((el) =>
          it.snapshot.has(el.id) ? transformElement(it.snapshot.get(el.id), it.bounds, nb) : el
        );
        break;
      }

      case 'point': {
        const base = it.base;
        const other = base.points[1 - it.index];
        const [x, y] = e.shiftKey ? snapAngle(other[0], other[1], world.x, world.y) : [world.x, world.y];
        const points = base.points.map((p, i) => (i === it.index ? [x, y] : p));
        liveRef.current = props.current.elements.map((el) => (el.id === base.id ? { ...base, points } : el));
        break;
      }

      case 'marquee': {
        it.current = world;
        const rect = normalizeRect(it.start.x, it.start.y, world.x, world.y);
        const hits = props.current.elements
          .filter((el) => el.type !== 'erase' && rectsIntersect(getElementBounds(el), rect))
          .map((el) => el.id);
        const ids = [...new Set([...it.baseIds, ...hits])];
        const key = ids.join('|');
        if (key !== it.lastKey) {
          it.lastKey = key;
          setSelectedIds(ids);
        }
        break;
      }

      default:
        break;
    }
    requestRender();
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === 'touch') {
      touchesRef.current.delete(e.pointerId);
      if (interactionRef.current?.type === 'pinch') {
        if (touchesRef.current.size < 2) interactionRef.current = null;
        return;
      }
    }
    const it = interactionRef.current;
    if (!it) return;
    interactionRef.current = null;
    canvasRef.current.releasePointerCapture?.(e.pointerId);
    const zoom = props.current.viewport.zoom;

    switch (it.type) {
      case 'draw': {
        const d = draftRef.current;
        draftRef.current = null;
        if (d) {
          if (it.raw) d.points.push([it.raw.x, it.raw.y]);
          commit((els) => [...els, { ...d }]);
        }
        break;
      }
      case 'shape': {
        const d = draftRef.current;
        draftRef.current = null;
        if (!d) break;
        const size = d.points
          ? Math.hypot(d.points[1][0] - d.points[0][0], d.points[1][1] - d.points[0][1])
          : Math.max(d.width, d.height);
        if (size * zoom >= 4) commit((els) => [...els, { ...d }]);
        break;
      }
      case 'erase-object':
        if (it.toDelete.size) {
          commit((els) => els.filter((el) => !it.toDelete.has(el.id)));
          setSelectedIds((ids) => ids.filter((id) => !it.toDelete.has(id)));
        }
        break;
      case 'move':
      case 'resize':
      case 'point':
        if (liveRef.current) commit(liveRef.current);
        liveRef.current = null;
        break;
      default:
        break;
    }
    updateCursor(toScreen(e));
    requestRender();
  };

  const handlePointerLeave = () => {
    pointerRef.current = null;
    if (hoverIdRef.current) hoverIdRef.current = null;
    requestRender();
  };

  const handleDoubleClick = (e) => {
    if (props.current.tool !== 'select') return;
    const world = toWorld(toScreen(e));
    const hit = hitElementAt(world);
    if (hit?.type === 'text') callbacks.current.onTextRequest?.(world, hit);
    else if (!hit) callbacks.current.onTextRequest?.(world, null);
  };

  /* --------------------------------------------------- arrastrar y soltar */

  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');

  const handleDragOver = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!dragOver) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!containerRef.current.contains(e.relatedTarget)) setDragOver(false);
  };

  const handleDrop = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragOver(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (files.length) callbacks.current.onDropImages?.(files, toWorld(toScreen(e)));
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <canvas ref={bgRef} className="absolute inset-0 pointer-events-none" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      {children}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-3 z-40 grid place-items-center rounded-3xl border-2 border-dashed border-indigo-400 bg-indigo-500/10 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-2xl"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-600">
                <ImagePlus size={28} />
              </div>
              <p className="font-semibold text-slate-800">Suelta tus imágenes aquí</p>
              <p className="text-xs text-slate-500">PNG, JPG o WEBP</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
