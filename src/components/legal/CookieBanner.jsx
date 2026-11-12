import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie, ShieldCheck } from 'lucide-react';
import { useConsent } from '../../context/ConsentContext';
import Modal from '../ui/Modal';

/** Banner de primera visita: "Rechazar" y "Aceptar" tienen el mismo peso visual (sin patrones engañosos). */
export function CookieBanner() {
  const { decided, decide, openSettings } = useConsent();

  return (
    <AnimatePresence>
      {!decided && (
        <motion.section
          role="region"
          aria-label="Aviso de cookies y almacenamiento"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="fixed inset-x-3 bottom-3 z-[95] mx-auto max-w-2xl rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-900/10 sm:p-5"
        >
          <div className="flex gap-3">
            <Cookie size={22} className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true" />
            <div className="min-w-0 space-y-3">
              <h2 className="font-semibold text-slate-900">Tu privacidad</h2>
              <p className="text-sm leading-relaxed text-slate-700">
                No usamos cookies de publicidad, analítica ni rastreo. Guardamos en tu navegador solo lo
                imprescindible para que la app funcione (tu sesión y tus pizarras). De forma opcional, podemos
                recordar tu tema claro u oscuro. Puedes cambiar esta decisión cuando quieras.{' '}
                <a href="#/legal/cookies" className="font-semibold text-indigo-700 underline underline-offset-2">
                  Política de cookies
                </a>
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" className="btn-ghost w-full" onClick={() => decide({ preferences: false })}>
                  Rechazar opcionales
                </button>
                <button type="button" className="btn-ghost w-full" onClick={openSettings}>
                  Configurar
                </button>
                <button type="button" className="btn-ghost w-full" onClick={() => decide({ preferences: true })}>
                  Aceptar opcionales
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function Row({ title, description, children }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{description}</p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

/** Panel de configuración (se abre desde el banner o desde el enlace "Cookies" del pie de página). */
export function CookieSettings() {
  const { settingsOpen, closeSettings, consent, decide } = useConsent();
  const [preferences, setPreferences] = useState(!!consent?.preferences);

  useEffect(() => {
    if (settingsOpen) setPreferences(!!consent?.preferences);
  }, [settingsOpen, consent]);

  return (
    <Modal open={settingsOpen} onClose={closeSettings} title="Configurar cookies y almacenamiento" icon={ShieldCheck} width="max-w-lg">
      <div className="space-y-3">
        <Row title="Esenciales" description="Sesión, cuentas, pizarras, imágenes y el registro de esta decisión. Sin ellos la app no puede funcionar.">
          <span className="text-xs font-semibold text-slate-600">Siempre activas</span>
        </Row>
        <Row title="Preferencias" description="Recordar si prefieres el tema claro, oscuro o el del sistema.">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={preferences}
              onChange={(e) => setPreferences(e.target.checked)}
            />
            {preferences ? 'Activadas' : 'Desactivadas'}
          </label>
        </Row>
        <Row title="Analítica, publicidad y rastreo" description="No usamos ninguna. El sitio bloquea técnicamente la carga de scripts de terceros.">
          <span className="text-xs font-semibold text-slate-600">No se usan</span>
        </Row>
        {consent && (
          <p className="text-xs text-slate-600">
            Última decisión: {new Date(consent.decidedAt).toLocaleString('es')} ({consent.preferences ? 'preferencias aceptadas' : 'solo esenciales'}).
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={closeSettings}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => decide({ preferences })}>
            Guardar mi elección
          </button>
        </div>
      </div>
    </Modal>
  );
}
