import { useState } from 'react';
import { AlertTriangle, KeyRound, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { NewPasswordFields, checkNewPassword } from './PasswordResetFlow';

/** Se abre al volver desde el enlace "Cambiar contraseña" del correo. */
export function RecoveryModal() {
  const { recoveryMode, updatePassword, endRecovery, user } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const problem = checkNewPassword(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updatePassword(password);
      setPassword('');
      setConfirm('');
      toast('Contraseña cambiada correctamente');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={recoveryMode && !!user}
      onClose={endRecovery}
      title="Elige tu nueva contraseña"
      subtitle={user?.email}
      icon={KeyRound}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <NewPasswordFields password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} idPrefix="recovery" />
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={endRecovery}>
            Ahora no
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Guardar contraseña
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Aviso cuando un enlace de correo caducó o no es válido. */
export function LinkErrorModal() {
  const { linkError, clearLinkError } = useAuth();
  return (
    <Modal open={!!linkError} onClose={clearLinkError} title="El enlace no es válido" icon={AlertTriangle}>
      <p className="text-sm leading-relaxed text-slate-700">
        El enlace del correo ha caducado o ya se usó. Pide uno nuevo desde «¿Olvidaste tu contraseña?» o, si estabas
        confirmando tu cuenta, inicia sesión para recibir otro.
      </p>
      <p className="mt-2 text-xs text-slate-600">Detalle: {linkError}</p>
      <div className="mt-4 flex justify-end">
        <button type="button" className="btn-primary" onClick={clearLinkError}>
          Entendido
        </button>
      </div>
    </Modal>
  );
}
