import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileCheck2, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { downloadUserData } from '../../utils/dataExport';
import { LAST_UPDATED } from '../../legal/config';
import SiteFooter from './SiteFooter';

/**
 * Se muestra a cuentas creadas antes de la versión vigente de los Términos/Privacidad.
 * La casilla empieza sin marcar; quien no quiera aceptar puede descargar sus datos o cerrar sesión.
 */
export default function TermsUpdateScreen() {
  const { user, acceptCurrentTerms, logout } = useAuth();
  const toast = useToast();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      await acceptCurrentTerms();
      toast('Gracias. Hemos registrado tu aceptación.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <main id="contenido" className="flex flex-1 items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-900/5 sm:p-8"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700" aria-hidden="true">
            <FileCheck2 size={24} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Hemos actualizado nuestros términos</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Hola, {user.name}. Para seguir usando tu cuenta necesitamos que leas y aceptes la versión del {LAST_UPDATED}{' '}
            de los Términos y condiciones y de la Política de privacidad. Tus pizarras siguen guardadas solo en este
            navegador.
          </p>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-700">
            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>
              He leído y acepto los{' '}
              <a href="#/legal/terminos" target="_blank" rel="noopener" className="font-semibold text-indigo-700 underline underline-offset-2">
                Términos y condiciones
              </a>{' '}
              y la{' '}
              <a href="#/legal/privacidad" target="_blank" rel="noopener" className="font-semibold text-indigo-700 underline underline-offset-2">
                Política de privacidad
              </a>
              .
            </span>
          </label>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <button type="button" className="btn-primary sm:flex-1" disabled={!checked || busy} onClick={accept}>
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Aceptar y continuar
            </button>
            <button type="button" className="btn-ghost" onClick={() => downloadUserData(user.id).catch((e) => toast(e.message, 'error'))}>
              Descargar mis datos
            </button>
            <button type="button" className="btn-ghost" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </motion.div>
      </main>
      <SiteFooter />
    </div>
  );
}
