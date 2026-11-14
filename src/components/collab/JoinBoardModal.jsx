import { useState } from 'react';
import { KeyRound, Loader2, LogIn } from 'lucide-react';
import Modal from '../ui/Modal';
import { collabService } from '../../services';
import { useToast } from '../../context/ToastContext';

const CODE_LENGTH = 6;

/** Estudiante: escribe el código que le dio el profesor para solicitar acceso a su pizarra. */
export default function JoinBoardModal({ open, onClose, onOpenBoard }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setCode('');
    setError('');
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    const clean = collabService.normalizeCode(code);
    if (clean.length !== CODE_LENGTH) {
      setError(`El código tiene ${CODE_LENGTH} caracteres.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await collabService.requestJoin(clean);
      if (res.status === 'pending') toast(`Solicitud enviada. Espera a que el profesor te acepte en «${res.boardName}».`, 'info', 4500);
      setCode('');
      onClose();
      // Aprobado o propietario: entra directamente. Pendiente: verá la sala de espera.
      onOpenBoard(res.boardId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      icon={KeyRound}
      title="Unirse a una pizarra"
      subtitle="Escribe el código que te ha dado tu profesor. Tendrá que aprobar tu solicitud."
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={close} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" form="join-board-form" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
            Solicitar acceso
          </button>
        </>
      }
    >
      <form id="join-board-form" onSubmit={submit} noValidate>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Código de la pizarra</span>
          <input
            className="field text-center font-mono text-2xl font-bold uppercase tracking-[0.4em]"
            value={code}
            onChange={(e) => {
              setCode(collabService.normalizeCode(e.target.value).slice(0, CODE_LENGTH));
              setError('');
            }}
            placeholder="ABC234"
            maxLength={CODE_LENGTH + 2}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? 'join-board-error' : undefined}
          />
        </label>
        {error && (
          <p id="join-board-error" role="alert" className="mt-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
