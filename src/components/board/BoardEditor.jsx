import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, FileQuestion, ImageUp, Shapes, Sparkles, Users } from 'lucide-react';
import { FullScreenLoader } from '../ui/Loader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { assetService, boardService, collabService, historyService } from '../../services';
import { useHistory } from '../../hooks/useHistory';
import { useBoardCollab } from '../../hooks/useBoardCollab';
import WhiteboardCanvas from './WhiteboardCanvas';
import Toolbar, { TOOL_ITEMS } from './Toolbar';
import IconButton from '../ui/IconButton';
import SharePanel from '../collab/SharePanel';
import PermissionNotice from '../collab/PermissionNotice';
import WaitingRoom from '../collab/WaitingRoom';
import PropertiesPanel from './PropertiesPanel';
import EditorTopBar from './EditorTopBar';
import ZoomControls from './ZoomControls';
import TextEditorOverlay from './TextEditorOverlay';
import { ConfirmDialog } from '../ui/Dialogs';
import {
  BACKGROUNDS,
  DARK_STROKE,
  DEFAULT_ERASER,
  DEFAULT_STYLE,
  LIGHT_STROKE,
  LINE_HEIGHT,
} from '../../canvas/constants';
import {
  applyStylePatch,
  createElement,
  duplicateElements,
  getElementBounds,
  measureText,
  moveElement,
} from '../../canvas/elements';
import { unionBounds } from '../../canvas/geometry';
import { fitBoundsToView, zoomAtPoint } from '../../canvas/viewport';
import { createThumbnail, exportBoardToCanvas } from '../../canvas/renderer';
import { ensureImagesLoaded, getImage, primeImage } from '../../canvas/imageCache';
import { ACCEPTED_IMAGE_TYPES, downloadBlob, prepareImage } from '../../utils/image';
import { pluralize, safeFileName } from '../../utils/format';
import { altFromFileName, describeElement } from '../../canvas/describe';

const AUTOSAVE_DELAY = 1200;
const TOOL_KEYS = { v: 'select', h: 'hand', p: 'pen', b: 'pen', e: 'eraser', r: 'rect', o: 'ellipse', g: 'triangle', l: 'line', a: 'arrow', d: 'biarrow', t: 'text' };
const isTypingTarget = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

export default function BoardEditor({ boardId, onExit }) {
  const { user } = useAuth();
  const toast = useToast();
  const { present: elements, commit: rawCommit, undo, redo, reset, canUndo, canRedo, applyExternal } = useHistory([]);

  // Pizarra compartida: todo cambio pasa por aquí y solo se aplica con permiso de escritura.
  // En pizarras propias el permiso es siempre true, así que se comporta exactamente igual que antes.
  const collabRef = useRef({ canWrite: true, canUpload: true });
  const commit = useCallback(
    (updater, options) => {
      if (!collabRef.current.canWrite) return;
      rawCommit(updater, options);
    },
    [rawCommit]
  );

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [background, setBackground] = useState('white');
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [tool, setTool] = useState('select');
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [eraser, setEraser] = useState(DEFAULT_ERASER);
  const [selectedIds, setSelectedIds] = useState([]);
  const [textEdit, setTextEdit] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [confirmClear, setConfirmClear] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [exporting, setExporting] = useState(false);

  const fileInputRef = useRef(null);
  const viewSizeRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  const clipboardRef = useRef([]);
  const readyRef = useRef(false);
  const savedRef = useRef({ elements: null, name: null, background: null });
  const saveTimer = useRef(null);
  const saveChain = useRef(Promise.resolve());

  const latest = useRef({});
  latest.current = { elements, name, background, viewport, textEdit };

  /* ------------------------------------------------- pizarra compartida */

  // 'owner' = pizarra propia · 'guest' = estudiante aprobado · 'pending'|'rejected'|'removed' = sala de espera
  const [access, setAccess] = useState({ role: 'owner', ownerId: user.id, member: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const backgroundChangeRef = useRef(null);

  const collab = useBoardCollab({
    boardId,
    user,
    access,
    ready: !loading,
    elements,
    applyExternal,
    name,
    background,
    toast,
    onRemoteMeta: (meta) => {
      if (typeof meta?.name === 'string') setName(meta.name);
      if (meta?.background && BACKGROUNDS[meta.background]) backgroundChangeRef.current?.(meta.background);
    },
    onKicked: (status) => {
      toast(status === 'removed' ? 'El profesor te ha retirado de la pizarra' : 'Ya no tienes acceso a esta pizarra', 'warning');
      setAccess({ role: status, ownerId: null, member: null });
    },
  });
  collabRef.current = { ...collab, canUpload: collab.canUpload && collab.canWrite };

  /* ---------------------------------------------------------- carga */

  useEffect(() => {
    let alive = true;
    readyRef.current = false;
    setLoading(true);
    (async () => {
      try {
        // Mínimo breve para que la animación de apertura se aprecie y no parpadee.
        const [ownBoard] = await Promise.all([
          boardService.getBoard(user.id, boardId),
          new Promise((r) => setTimeout(r, 650)),
        ]);
        if (!alive) return;
        let board = ownBoard;
        let nextAccess = { role: 'owner', ownerId: user.id, member: null };
        // No es propia: ¿es una pizarra compartida a la que el estudiante tiene acceso?
        if (!board && collabService) {
          const member = await collabService.getMembership(boardId, user.id).catch(() => null);
          if (!alive) return;
          if (member?.status === 'approved') {
            board = await collabService.getSharedBoard(boardId);
            if (!alive) return;
            if (board) {
              nextAccess = { role: 'guest', ownerId: board.ownerId, member };
              collabService.setImageOwner(board.ownerId);
            }
          } else if (member) {
            setAccess({ role: member.status, ownerId: null, member });
            setLoading(false);
            return;
          }
        }
        if (!board) {
          setNotFound(true);
          return;
        }
        setAccess(nextAccess);
        // "Clases pasadas": queda vinculada al perfil (alta o último acceso). Nunca bloquea la apertura.
        historyService
          .touch(user, {
            boardId,
            boardName: board.name,
            teacherName: nextAccess.role === 'owner' ? user.name : undefined,
            role: nextAccess.role,
            createdAt: board.createdAt,
          })
          .catch(() => {});
        const els = board.elements || [];
        reset(els);
        setName(board.name);
        setBackground(board.background);
        // En pantallas estrechas (celular, tablet vertical) se encuadra todo el contenido al abrir.
        const contentBounds = unionBounds(els.filter((e) => e.type !== 'erase').map(getElementBounds));
        if (window.innerWidth < 768 && contentBounds) {
          setViewport(fitBoundsToView(contentBounds, window.innerWidth, window.innerHeight, 24));
        } else {
          setViewport(board.viewport || { x: 0, y: 0, zoom: 1 });
        }
        setStyle((s) => ({ ...s, strokeColor: BACKGROUNDS[board.background]?.dark ? DARK_STROKE : LIGHT_STROKE }));
        savedRef.current = { elements: els, name: board.name, background: board.background };
        ensureImagesLoaded(els);
        readyRef.current = true;
        setLoading(false);
      } catch (err) {
        if (alive) {
          toast(err.message, 'error');
          setNotFound(true);
        }
      }
    })();
    return () => {
      alive = false;
      collabService?.setImageOwner(null);
    };
  }, [boardId, user.id, reset, toast, reloadKey]);

  /* ------------------------------------------------------- guardado */

  const saveNow = useCallback(
    (manual = false) => {
      if (!readyRef.current) return Promise.resolve();
      clearTimeout(saveTimer.current);
      const co = collabRef.current;
      // Estudiante: no guarda la pizarra (no es suya); solo envía sus cambios por elemento.
      if (co.isGuest) {
        setSaveStatus('saving');
        return co.flush().then(() => {
          setSaveStatus('saved');
          if (manual) toast('Cambios sincronizados');
        });
      }
      const snap = latest.current;
      setSaveStatus('saving');
      const thumbnail = createThumbnail(snap.elements, snap.background, getImage);
      const run = saveChain.current
        // Pizarra compartida: los elementos se guardan por elemento (sin pisar lo de los estudiantes).
        .then(() => (co.persistsElements ? co.flush() : null))
        .then(() =>
          boardService.saveBoard(user.id, boardId, {
            name: snap.name.trim() || 'Pizarra sin título',
            background: snap.background,
            elements: co.persistsElements ? undefined : snap.elements,
            viewport: snap.viewport,
            thumbnail,
          })
        )
        .then(() => {
          savedRef.current = { elements: snap.elements, name: snap.name, background: snap.background };
          const cur = latest.current;
          const clean = cur.elements === snap.elements && cur.name === snap.name && cur.background === snap.background;
          setSaveStatus(clean ? 'saved' : 'dirty');
          if (manual) toast('Guardado en este navegador');
        })
        .catch((err) => {
          setSaveStatus('error');
          toast(`No se pudo guardar: ${err.message}`, 'error');
        });
      saveChain.current = run;
      return run;
    },
    [user.id, boardId, toast]
  );

  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;

  // Autoguardado inteligente: con debounce tras cada cambio real.
  useEffect(() => {
    if (loading || !readyRef.current) return;
    const s = savedRef.current;
    if (s.elements === elements && s.name === name && s.background === background) return;
    setSaveStatus('dirty');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNowRef.current(), AUTOSAVE_DELAY);
  }, [elements, name, background, loading]);

  // Guardar al cerrar la pestaña o al salir del editor (incluye la posición de la vista).
  useEffect(() => {
    const onUnload = () => saveNowRef.current();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      clearTimeout(saveTimer.current);
      saveNowRef.current();
    };
  }, []);

  /* ------------------------------------------------- texto */

  const finishTextEdit = useCallback(() => {
    const te = latest.current.textEdit;
    if (!te) return;
    const text = (te.element.text || '').replace(/\s+$/, '');
    if (!text.trim()) {
      if (!te.isNew) commit((els) => els.filter((e) => e.id !== te.element.id));
    } else {
      const el = { ...te.element, text, ...measureText(text, te.element.fontSize, te.element.fontWeight) };
      commit((els) => (te.isNew ? [...els, el] : els.map((e) => (e.id === el.id ? el : e))));
    }
    latest.current.textEdit = null;
    setTextEdit(null);
    // Devuelve el foco del teclado al lienzo si no se movió a otro control.
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active.tagName === 'TEXTAREA') {
        document.getElementById('lienzo')?.focus({ preventScroll: true });
      }
    });
  }, [commit]);

  const updateElement = useCallback(
    (id, patch, mergeKey) => commit((els) => els.map((e) => (e.id === id ? { ...e, ...patch } : e)), { mergeKey }),
    [commit]
  );

  const handleTextRequest = useCallback(
    (world, existing) => {
      if (existing) {
        setSelectedIds([]);
        setTextEdit({ element: existing, isNew: false });
        return;
      }
      const el = createElement('text', style, {
        x: world.x,
        y: world.y - (style.fontSize * LINE_HEIGHT) / 2,
        text: '',
      });
      setSelectedIds([]);
      setTextEdit({ element: el, isNew: true });
    },
    [style]
  );

  /* ------------------------------------------------- selección */

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selection = useMemo(() => elements.filter((e) => selectedSet.has(e.id)), [elements, selectedSet]);

  useEffect(() => {
    setSelectedIds((ids) => {
      if (!ids.length) return ids;
      const present = new Set(elements.map((e) => e.id));
      const next = ids.filter((id) => present.has(id));
      return next.length === ids.length ? ids : next;
    });
  }, [elements]);

  const changeTool = useCallback(
    (t) => {
      if (!collabRef.current.canWrite && t !== 'hand') return; // dibujo bloqueado por el profesor
      if (latest.current.textEdit) finishTextEdit();
      setTool(t);
      if (t !== 'select') setSelectedIds([]);
    },
    [finishTextEdit]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return;
    const ids = new Set(selectedIds);
    commit((els) => els.filter((e) => !ids.has(e.id)));
    setSelectedIds([]);
  }, [selectedIds, commit]);

  const insertCopies = useCallback(
    (source) => {
      if (!source.length) return [];
      const copies = duplicateElements(source, 24, 24);
      commit((els) => [...els, ...copies]);
      setTool('select');
      setSelectedIds(copies.map((c) => c.id));
      return copies;
    },
    [commit]
  );

  const duplicateSelected = useCallback(() => insertCopies(selection), [insertCopies, selection]);

  const bringToFront = useCallback(() => {
    commit((els) => [...els.filter((e) => !selectedSet.has(e.id)), ...els.filter((e) => selectedSet.has(e.id))]);
  }, [commit, selectedSet]);

  const sendToBack = useCallback(() => {
    commit((els) => [...els.filter((e) => selectedSet.has(e.id)), ...els.filter((e) => !selectedSet.has(e.id))]);
  }, [commit, selectedSet]);

  const handleStyleChange = useCallback(
    (patch, mergeKey) => {
      setStyle((s) => ({ ...s, ...patch }));
      const te = latest.current.textEdit;
      if (te) {
        const next = { ...te, element: applyStylePatch(te.element, patch) };
        latest.current.textEdit = next;
        setTextEdit(next);
        return;
      }
      if (selectedIds.length) {
        const ids = new Set(selectedIds);
        commit((els) => els.map((e) => (ids.has(e.id) ? applyStylePatch(e, patch) : e)), { mergeKey: mergeKey && `${mergeKey}:${selectedIds.join()}` });
      }
    },
    [selectedIds, commit]
  );

  /* ------------------------------------------------- vista */

  const zoomBy = useCallback((factor) => {
    const { w, h } = viewSizeRef.current;
    setViewport((vp) => zoomAtPoint(vp, vp.zoom * factor, w / 2, h / 2));
  }, []);

  const resetZoom = useCallback(() => {
    const { w, h } = viewSizeRef.current;
    setViewport((vp) => zoomAtPoint(vp, 1, w / 2, h / 2));
  }, []);

  const fitToContent = useCallback(() => {
    const b = unionBounds(latest.current.elements.filter((e) => e.type !== 'erase').map(getElementBounds));
    const { w, h } = viewSizeRef.current;
    setViewport(b ? fitBoundsToView(b, w, h) : { x: 0, y: 0, zoom: 1 });
  }, []);

  /* ------------------------------------------------- imágenes */

  const addImages = useCallback(
    async (files, point) => {
      if (!collabRef.current.canUpload) {
        toast('El profesor ha bloqueado la subida de imágenes', 'warning');
        return;
      }
      const valid = files.filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type));
      if (!valid.length) {
        toast('Formato no soportado. Usa PNG, JPG o WEBP.', 'error');
        return;
      }
      const vp = latest.current.viewport;
      const { w, h } = viewSizeRef.current;
      const center = point || { x: (w / 2 - vp.x) / vp.zoom, y: (h / 2 - vp.y) / vp.zoom };
      const maxW = Math.min(560, (w * 0.5) / vp.zoom);
      const maxH = Math.min(420, (h * 0.5) / vp.zoom);
      const created = [];
      setUploading((n) => n + valid.length);
      for (let i = 0; i < valid.length; i++) {
        try {
          const { blob, width, height, img } = await prepareImage(valid[i]);
          // En pizarras compartidas las imágenes van a la carpeta del profesor (storageOwnerId); si no, a la propia.
          const imageId = await assetService.saveImage(collabRef.current.storageOwnerId || user.id, blob, { width, height, name: valid[i].name });
          primeImage(imageId, img);
          const s = Math.min(1, maxW / width, maxH / height);
          const ew = width * s;
          const eh = height * s;
          created.push(
            createElement('image', { opacity: 1 }, {
              imageId,
              alt: altFromFileName(valid[i].name),
              x: center.x - ew / 2 + i * 28,
              y: center.y - eh / 2 + i * 28,
              width: ew,
              height: eh,
            })
          );
        } catch (err) {
          toast(`${valid[i].name}: ${err.message}`, 'error');
        } finally {
          setUploading((n) => Math.max(0, n - 1));
        }
      }
      if (created.length) {
        commit((els) => [...els, ...created]);
        setTool('select');
        setSelectedIds(created.map((c) => c.id));
        toast(created.length > 1 ? `${created.length} imágenes añadidas` : 'Imagen añadida');
      }
    },
    [commit, toast, user.id]
  );

  const pickImage = useCallback(() => {
    if (!collabRef.current.canUpload) {
      toast('El profesor ha bloqueado la subida de imágenes', 'warning');
      return;
    }
    fileInputRef.current?.click();
  }, [toast]);

  const onFileInput = (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (files.length) addImages(files, null);
  };

  /* ------------------------------------------------- acciones */

  const handleBackgroundChange = useCallback((key) => {
    setBackground(key);
    const dark = BACKGROUNDS[key]?.dark;
    setStyle((s) => {
      if (dark && s.strokeColor === LIGHT_STROKE) return { ...s, strokeColor: DARK_STROKE };
      if (!dark && s.strokeColor === DARK_STROKE) return { ...s, strokeColor: LIGHT_STROKE };
      return s;
    });
  }, []);
  backgroundChangeRef.current = handleBackgroundChange;

  const clearBoard = useCallback(() => {
    commit([]);
    setSelectedIds([]);
    toast('Pizarra limpia. Puedes deshacerlo con Ctrl+Z', 'info');
  }, [commit, toast]);

  const exportPNG = useCallback(async () => {
    const els = latest.current.elements;
    if (!els.some((e) => e.type !== 'erase')) {
      toast('La pizarra está vacía: no hay nada que exportar.', 'warning');
      return;
    }
    setExporting(true);
    try {
      await ensureImagesLoaded(els);
      // Cede un fotograma para que se pinte el estado "exportando" antes del render pesado.
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      const canvas = exportBoardToCanvas(els, latest.current.background, { scale: 2, getImage });
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('No se pudo generar la imagen.');
      downloadBlob(blob, `${safeFileName(latest.current.name)}.png`);
      toast('Imagen PNG exportada');
    } catch (err) {
      toast(`Error al exportar: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  }, [toast]);

  const handleBack = useCallback(() => {
    if (latest.current.textEdit) finishTextEdit();
    setTimeout(async () => {
      await saveNowRef.current();
      onExit();
    }, 0);
  }, [finishTextEdit, onExit]);

  const handleUndo = useCallback(() => {
    if (!collabRef.current.canWrite) return;
    if (latest.current.textEdit) setTextEdit(null);
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    if (!collabRef.current.canWrite) return;
    if (latest.current.textEdit) setTextEdit(null);
    redo();
  }, [redo]);

  /* ------------------------------------------------- permisos en vivo */

  // Si el profesor bloquea el dibujo: solo queda la mano (desplazarse) y se cancela lo que estuviera en curso.
  useEffect(() => {
    if (collab.canWrite) return;
    if (tool !== 'hand') setTool('hand');
    setSelectedIds((ids) => (ids.length ? [] : ids));
    if (latest.current.textEdit) {
      latest.current.textEdit = null;
      setTextEdit(null);
    }
  }, [collab.canWrite, tool]);

  const lockedTools = useMemo(() => {
    if (!collab.isGuest) return undefined;
    if (!collab.canWrite) return new Set(TOOL_ITEMS.filter((it) => it !== 'sep' && it.id !== 'hand').map((it) => it.id));
    if (!collab.canUpload) return new Set(['image']);
    return undefined;
  }, [collab.isGuest, collab.canWrite, collab.canUpload]);

  const { enableCode } = collab;
  const enableSharing = useCallback(async () => {
    await saveNowRef.current(); // guarda la pizarra completa antes de pasar al guardado por elemento
    await enableCode(false);
  }, [enableCode]);
  const closeShare = useCallback(() => setShareOpen(false), []);

  const handleWaitingStatus = useCallback((status) => {
    if (status === 'approved') setReloadKey((k) => k + 1);
    else setAccess((a) => ({ ...a, role: status }));
  }, []);

  /* ------------------------------------------------- teclado */

  const keyHandler = useRef(null);
  keyHandler.current = (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();

    if (mod && k === 's') {
      e.preventDefault();
      saveNow(true);
      return;
    }
    if (isTypingTarget(e.target) || loading) return;

    if (mod && k === 'z') {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
      return;
    }
    if (mod && k === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }
    if (mod && k === 'a') {
      e.preventDefault();
      setTool('select');
      setSelectedIds(elements.filter((el) => el.type !== 'erase').map((el) => el.id));
      return;
    }
    if (mod && k === 'd') {
      e.preventDefault();
      duplicateSelected();
      return;
    }
    if (mod && k === 'c') {
      if (selection.length) clipboardRef.current = selection.map((el) => ({ ...el }));
      return;
    }
    if (mod && (k === '=' || k === '+')) {
      e.preventDefault();
      zoomBy(1.2);
      return;
    }
    if (mod && k === '-') {
      e.preventDefault();
      zoomBy(1 / 1.2);
      return;
    }
    if (mod && k === '0') {
      e.preventDefault();
      resetZoom();
      return;
    }
    if (mod && k === '1') {
      e.preventDefault();
      fitToContent();
      return;
    }
    if (k === 'delete' || k === 'backspace') {
      if (selectedIds.length) {
        e.preventDefault();
        deleteSelected();
      }
      return;
    }
    if (k === 'escape') {
      if (selectedIds.length) setSelectedIds([]);
      else setTool('select');
      return;
    }
    if (k.startsWith('arrow') && selectedIds.length) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0;
      const dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0;
      commit((els) => els.map((el) => (selectedSet.has(el.id) ? moveElement(el, dx, dy) : el)), { mergeKey: `nudge:${selectedIds.join()}` });
      return;
    }
    if (!mod && !e.altKey) {
      // N / Mayús+N: recorrer los elementos con el teclado.
      if (k === 'n') {
        e.preventDefault();
        cycleSelection(e.shiftKey ? -1 : 1);
        return;
      }
      // Intro con el lienzo enfocado: crear o editar sin ratón.
      if (k === 'enter' && e.target?.id === 'lienzo') {
        e.preventDefault();
        insertWithKeyboard();
        return;
      }
      if (k === 'i') {
        pickImage();
        return;
      }
      if (TOOL_KEYS[k]) changeTool(TOOL_KEYS[k]);
    }
  };

  function cycleSelection(dir) {
    const items = elements.filter((el) => el.type !== 'erase');
    if (!items.length) return;
    const current = selectedIds.length ? items.findIndex((el) => el.id === selectedIds[selectedIds.length - 1]) : -1;
    const next = current === -1 ? (dir > 0 ? 0 : items.length - 1) : (current + dir + items.length) % items.length;
    setTool('select');
    setSelectedIds([items[next].id]);
    setAnnouncement(`Seleccionado ${next + 1} de ${items.length}: ${describeElement(items[next])}`);
  }

  function insertWithKeyboard() {
    if (selection.length === 1 && selection[0].type === 'text') {
      handleTextRequest(null, selection[0]);
      return;
    }
    const vp = latest.current.viewport;
    const { w, h } = viewSizeRef.current;
    const c = { x: (w / 2 - vp.x) / vp.zoom, y: (h / 2 - vp.y) / vp.zoom };
    if (tool === 'text') {
      handleTextRequest(c, null);
      return;
    }
    let el = null;
    if (['rect', 'ellipse', 'triangle'].includes(tool)) {
      el = createElement(tool, style, { x: c.x - 80, y: c.y - 60, width: 160, height: 120 });
    } else if (['line', 'arrow', 'biarrow'].includes(tool)) {
      el = createElement(tool === 'line' ? 'line' : 'arrow', { ...style, arrowStart: tool === 'biarrow', arrowEnd: tool !== 'line' }, {
        points: [[c.x - 90, c.y], [c.x + 90, c.y]],
      });
    }
    if (!el) {
      setAnnouncement('Elige una herramienta de figura, línea o texto y pulsa Intro para insertarla en el centro.');
      return;
    }
    commit((els) => [...els, el]);
    setTool('select');
    setSelectedIds([el.id]);
    setAnnouncement(`${describeElement(el)} insertado en el centro y seleccionado. Usa las flechas para moverlo.`);
  }

  useEffect(() => {
    const onKey = (e) => keyHandler.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Pegar: imágenes desde el portapapeles o elementos copiados con Ctrl+C.
  const pasteHandler = useRef(null);
  pasteHandler.current = (e) => {
    if (isTypingTarget(e.target) || loading) return;
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      addImages(files, null);
      return;
    }
    if (clipboardRef.current.length) {
      e.preventDefault();
      clipboardRef.current = insertCopies(clipboardRef.current);
    }
  };

  useEffect(() => {
    const onPaste = (e) => pasteHandler.current(e);
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  /* ------------------------------------------------- render */

  const handleResize = useCallback((size) => {
    viewSizeRef.current = size;
  }, []);

  const elementCount = useMemo(() => elements.filter((e) => e.type !== 'erase').length, [elements]);
  const isDark = BACKGROUNDS[background]?.dark;

  if (['pending', 'rejected', 'removed'].includes(access.role)) {
    return <WaitingRoom boardId={boardId} userId={user.id} status={access.role} onStatusChange={handleWaitingStatus} onExit={onExit} />;
  }

  // Botón de la barra superior: el profesor abre el panel de compartir; el estudiante ve el estado en vivo.
  let collabSlot = null;
  if (collab.available && collab.isOwner) {
    const n = collab.pending.length;
    collabSlot = (
      <span className="relative">
        <IconButton
          icon={Users}
          label={n ? `Compartir · ${n} ${n === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}` : 'Compartir con estudiantes'}
          onClick={() => setShareOpen((o) => !o)}
          active={shareOpen}
          aria-expanded={shareOpen}
        />
        {n > 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white"
          >
            {n}
          </span>
        )}
      </span>
    );
  } else if (collab.available && collab.isGuest) {
    collabSlot = (
      <span className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-slate-600" title="Pizarra compartida por tu profesor">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${collab.connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        <Users size={15} aria-hidden="true" />
        <span className="hidden sm:inline">{collab.connected ? 'En vivo' : 'Conectando…'}</span>
      </span>
    );
  }

  if (notFound) {
    return (
      <div className="grid h-full place-items-center bg-slate-50 p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-600">
            <FileQuestion size={30} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Pizarra no encontrada</h2>
          <p className="mt-1 text-sm text-slate-600">No existe o pertenece a otra cuenta.</p>
          <button className="btn-primary mt-6" onClick={onExit}>
            <ArrowLeft size={16} /> Volver a mis pizarras
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: BACKGROUNDS[background]?.color }}>
      <WhiteboardCanvas
        elements={elements}
        commit={commit}
        tool={tool}
        style={style}
        eraser={eraser}
        viewport={viewport}
        setViewport={setViewport}
        background={background}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        editingId={textEdit && !textEdit.isNew ? textEdit.element.id : null}
        isEditingText={!!textEdit}
        onFinishTextEdit={finishTextEdit}
        onTextRequest={handleTextRequest}
        onDropImages={addImages}
        onResize={handleResize}
        onDraftChange={collab.active ? collab.sendDraft : undefined}
        remoteDrafts={collab.remoteDrafts}
        onLiveChange={collab.active ? collab.sendLive : undefined}
        remoteLive={collab.remoteLive}
      >
        {textEdit && (
          <TextEditorOverlay
            element={textEdit.element}
            viewport={viewport}
            onChange={(text) => {
              const next = { ...latest.current.textEdit, element: { ...latest.current.textEdit.element, text } };
              latest.current.textEdit = next;
              setTextEdit(next);
            }}
            onFinish={finishTextEdit}
          />
        )}
      </WhiteboardCanvas>

      <AnimatePresence>
        {!loading && elementCount === 0 && !textEdit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className={`pointer-events-none absolute inset-0 grid place-items-center ${isDark ? 'text-slate-600' : 'text-slate-600'}`}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <Sparkles size={30} className="text-indigo-400" />
              <p className="text-lg font-semibold">Tu lienzo está listo</p>
              <p className="text-sm">Elige una herramienta del dock inferior o arrastra una imagen aquí.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditorTopBar
        name={name}
        onNameChange={setName}
        saveStatus={saveStatus}
        onBack={handleBack}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo && collab.canWrite}
        canRedo={canRedo && collab.canWrite}
        background={background}
        onBackgroundChange={handleBackgroundChange}
        onClear={() => setConfirmClear(true)}
        onExport={exportPNG}
        exporting={exporting}
        onSave={() => saveNow(true)}
        beforeLogout={() => saveNowRef.current()}
        guest={collab.isGuest}
        collabSlot={collabSlot}
      />

      {collab.available && collab.isOwner && (
        <SharePanel open={shareOpen} onClose={closeShare} collab={collab} onEnable={enableSharing} />
      )}
      {collab.isGuest && <PermissionNotice canWrite={collab.canWrite} canUpload={collab.canUpload} />}

      <PropertiesPanel
        tool={tool}
        style={style}
        eraser={eraser}
        onEraserChange={(patch) => setEraser((er) => ({ ...er, ...patch }))}
        onStyleChange={handleStyleChange}
        selection={tool === 'select' ? selection : []}
        textEdit={textEdit}
        onDelete={deleteSelected}
        onDuplicate={duplicateSelected}
        onBringToFront={bringToFront}
        onSendToBack={sendToBack}
        onPickImage={pickImage}
        onAltChange={(id, alt) => updateElement(id, { alt }, `alt:${id}`)}
      />

      <Toolbar tool={tool} onToolChange={changeTool} onPickImage={pickImage} lockedTools={lockedTools} />

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <ZoomControls
        zoom={viewport.zoom}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onReset={resetZoom}
        onFit={fitToContent}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass pointer-events-none absolute bottom-[84px] left-3 z-20 hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 sm:flex lg:bottom-4"
      >
        <Shapes size={14} aria-hidden="true" className="text-indigo-600" />
        {pluralize(elementCount, 'elemento', 'elementos')}
        {selection.length > 0 && tool === 'select' && <span className="text-indigo-700">· {selection.length} seleccionado(s)</span>}
      </motion.div>

      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={onFileInput} />

      <ConfirmDialog
        open={confirmClear}
        title="¿Limpiar la pizarra?"
        message="Se eliminarán todos los elementos del lienzo. Podrás recuperarlos con Deshacer (Ctrl+Z) mientras sigas en esta sesión."
        confirmLabel="Limpiar todo"
        danger
        onConfirm={clearBoard}
        onClose={() => setConfirmClear(false)}
      />

      <AnimatePresence>
        {uploading > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="glass pointer-events-none absolute bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700"
          >
            <ImageUp size={18} className="animate-bounce text-indigo-500" />
            {uploading > 1 ? `Procesando ${uploading} imágenes` : 'Procesando imagen'}
            <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-indigo-100">
              <motion.span
                className="block h-full w-1/3 rounded-full bg-linear-to-r from-indigo-500 to-fuchsia-500"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{loading && <FullScreenLoader overlay label="Abriendo tu pizarra" />}</AnimatePresence>
    </div>
  );
}
