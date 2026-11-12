import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { replaceRoute } from '../../hooks/useHashRoute';
import { FullScreenLoader } from '../ui/Loader';

// Los tokens solo se pueden usar una vez: se recuerda cuáles ya se procesaron
// (React en modo estricto ejecuta los efectos dos veces en desarrollo).
const processed = new Map();

/** Pantalla a la que llevan los enlaces de los correos (#/confirmar?token_hash=…&type=…). */
export default function ConfirmLinkScreen({ tokenHash, type }) {
  const { verifyEmailLink, isCloud } = useAuth();
  const toast = useToast();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isCloud) {
      setError('Esta versión de la app no usa cuentas en la nube.');
      return;
    }
    const key = `${type}:${tokenHash}`;
    if (!processed.has(key)) processed.set(key, verifyEmailLink(tokenHash, type));
    let alive = true;
    processed
      .get(key)
      .then(() => {
        if (!alive) return;
        if (type !== 'recovery') toast('¡Cuenta confirmada! Ya has iniciado sesión.');
        replaceRoute('/');
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [tokenHash, type, isCloud, verifyEmailLink, toast]);

  if (!error) {
    return <FullScreenLoader label={type === 'recovery' ? 'Abriendo el cambio de contraseña' : 'Confirmando tu cuenta'} />;
  }

  return (
    <main id="contenido" className="grid min-h-full place-items-center p-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-xl ring-1 ring-slate-900/5"
        role="alert"
      >
        <AlertTriangle size={36} className="mx-auto text-amber-700" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold text-slate-900">No se pudo usar el enlace</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{error}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Los enlaces caducan pasado un tiempo y solo sirven una vez. Si ya confirmaste tu cuenta, simplemente inicia
          sesión.
        </p>
        <button type="button" className="btn-primary mt-5 w-full" onClick={() => replaceRoute('/')}>
          Ir a iniciar sesión
        </button>
      </motion.div>
    </main>
  );
}
