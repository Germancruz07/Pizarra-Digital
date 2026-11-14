import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, ImageUp, KeyRound, Pencil, RefreshCw, UserCheck, UserMinus, UserX, Users, X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Switch from './Switch';
import { useToast } from '../../context/ToastContext';

/**
 * Panel del profesor: código de acceso, solicitudes pendientes y permisos de cada estudiante.
 * Los interruptores aplican el cambio en tiempo real en la pantalla del estudiante.
 */
export default function SharePanel({ open, onClose, collab, onEnable }) {
  const toast = useToast();
  const panelRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const { share, pending, approved, online } = collab;

  useEffect(() => {
    if (!open) return undefined;
    const t = requestAnimationFrame(() => panelRef.current?.focus());
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(share.code);
      toast('Código copiado');
    } catch {
      toast('No se pudo copiar el código', 'error');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Compartir con estudiantes"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="glass scroll-thin absolute right-2 top-[64px] z-40 flex max-h-[calc(100%-150px)] w-[min(360px,calc(100%-16px))] flex-col overflow-y-auto rounded-2xl p-4 outline-none sm:right-3 sm:top-[72px]"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users size={16} aria-hidden="true" className="text-indigo-600" /> Compartir con estudiantes
            </h2>
            <button type="button" onClick={onClose} aria-label="Cerrar panel" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* ---------------- código */}
          {!share ? (
            <div className="mt-3 rounded-xl bg-slate-100/70 p-3 text-sm text-slate-700">
              <p>Genera un código para que tus estudiantes soliciten entrar. Tú decides quién entra y qué puede hacer.</p>
              <button type="button" className="btn-primary mt-3 w-full justify-center" disabled={busy} onClick={() => run(onEnable)}>
                <KeyRound size={16} aria-hidden="true" /> Generar código
              </button>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-slate-100/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Código de la pizarra</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`font-mono text-2xl font-extrabold tracking-[0.25em] ${share.enabled ? 'text-slate-900' : 'text-slate-400 line-through'}`}
                  aria-label={`Código ${share.code.split('').join(' ')}`}
                >
                  {share.code}
                </span>
                <button type="button" onClick={copyCode} aria-label="Copiar código" title="Copiar código" className="ml-auto rounded-lg p-2 text-slate-600 hover:bg-white">
                  <Copy size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => run(() => collab.enableCode(true))}
                  disabled={busy}
                  aria-label="Generar un código nuevo"
                  title="Generar un código nuevo (el anterior deja de funcionar)"
                  className="rounded-lg p-2 text-slate-600 hover:bg-white disabled:opacity-50"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-700">
                <span>Aceptar solicitudes nuevas</span>
                <Switch
                  checked={share.enabled}
                  label="Aceptar solicitudes nuevas con este código"
                  disabled={busy}
                  onChange={(on) => run(() => (on ? collab.enableCode(false) : collab.disableCode()))}
                />
              </div>
            </div>
          )}

          {/* ---------------- solicitudes */}
          {share && (
            <section className="mt-4" aria-label="Solicitudes pendientes">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Solicitudes pendientes ({pending.length})</h3>
              {pending.length === 0 ? (
                <p className="mt-1.5 text-sm text-slate-600">No hay solicitudes por ahora.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {pending.map((m) => (
                    <li key={m.userId} className="flex items-center gap-2.5 rounded-xl bg-amber-50 p-2.5 ring-1 ring-amber-200/70">
                      <Avatar avatar={m.avatar} name={m.name} size={32} ring={false} />
                      <p className="min-w-0 flex-1 text-sm text-slate-800">
                        <span className="font-semibold">{m.name}</span> quiere unirse
                      </p>
                      <button
                        type="button"
                        onClick={() => collab.approve(m.userId)}
                        aria-label={`Aprobar a ${m.name}`}
                        title="Aprobar"
                        className="rounded-lg bg-emerald-600 p-1.5 text-white hover:brightness-110"
                      >
                        <UserCheck size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => collab.reject(m.userId)}
                        aria-label={`Rechazar a ${m.name}`}
                        title="Rechazar"
                        className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-50"
                      >
                        <UserX size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* ---------------- estudiantes y permisos */}
          {share && (
            <section className="mt-4" aria-label="Estudiantes">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Estudiantes ({approved.length}) · {approved.filter((m) => online.has(m.userId)).length} conectados
              </h3>
              {approved.length === 0 ? (
                <p className="mt-1.5 text-sm text-slate-600">Cuando apruebes una solicitud, el estudiante aparecerá aquí.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {approved.map((m) => {
                    const isOnline = online.has(m.userId);
                    return (
                      <li key={m.userId} className="rounded-xl bg-white/70 p-2.5 ring-1 ring-slate-900/5">
                        <div className="flex items-center gap-2.5">
                          <span className="relative">
                            <Avatar avatar={m.avatar} name={m.name} size={30} ring={false} />
                            <span
                              aria-hidden="true"
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            />
                          </span>
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                            {m.name}
                            <span className="sr-only">{isOnline ? ' (conectado)' : ' (desconectado)'}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => collab.remove(m.userId)}
                            aria-label={`Retirar a ${m.name} de la pizarra`}
                            title="Retirar de la pizarra"
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <UserMinus size={15} aria-hidden="true" />
                          </button>
                        </div>
                        <div className="mt-2 space-y-1.5 pl-1 text-sm text-slate-700">
                          <label className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5">
                              <Pencil size={14} aria-hidden="true" /> Escribir / dibujar
                            </span>
                            <Switch
                              checked={m.canWrite}
                              label={`Permitir que ${m.name} escriba y dibuje`}
                              onChange={(v) => collab.setPermission(m.userId, 'canWrite', v)}
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5">
                              <ImageUp size={14} aria-hidden="true" /> Subir imágenes
                            </span>
                            <Switch
                              checked={m.canUpload}
                              label={`Permitir que ${m.name} suba imágenes`}
                              onChange={(v) => collab.setPermission(m.userId, 'canUpload', v)}
                            />
                          </label>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {share && (
            <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-600">
              <Check size={13} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" />
              Los cambios de permisos se aplican al instante en la pantalla de cada estudiante.
            </p>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
