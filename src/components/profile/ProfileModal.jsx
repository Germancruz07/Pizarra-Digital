import { useEffect, useState } from 'react';
import { Download, Loader2, Trash2, UserCog } from 'lucide-react';
import Modal from '../ui/Modal';
import AvatarPicker from '../auth/AvatarPicker';
import { ConfirmDialog } from '../ui/Dialogs';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { downloadUserData } from '../../utils/dataExport';

export default function ProfileModal({ open, onClose }) {
  const { user, updateProfile, deleteAccount } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setAvatar(user.avatar);
      setError('');
    }
  }, [open, user]);

  if (!user) return null;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile({ name, avatar });
      toast('Perfil actualizado');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      await downloadUserData(user.id);
      toast('Descarga de tus datos iniciada');
    } catch (err) {
      toast(`No se pudieron exportar los datos: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  const removeAccount = async () => {
    try {
      await deleteAccount();
      window.location.hash = '/';
      toast('Tu cuenta y todos sus datos se eliminaron de este navegador.', 'info');
    } catch (err) {
      toast(`No se pudo eliminar la cuenta: ${err.message}`, 'error');
    }
  };

  const accepted = user.termsAcceptance;

  return (
    <>
      <Modal open={open && !confirmDelete} onClose={onClose} title="Tu perfil" subtitle={`Usuario: ${user.username || user.email}`} icon={UserCog} width="max-w-lg">
        <form onSubmit={save} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Nombre visible</span>
            <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Avatar</span>
            {avatar && <AvatarPicker value={avatar} onChange={setAvatar} name={name} />}
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Guardar cambios
            </button>
          </div>
        </form>

        <section aria-labelledby="tus-datos" className="mt-6 space-y-3 border-t border-slate-200 pt-5">
          <h3 id="tus-datos" className="font-semibold text-slate-900">
            Tus datos
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Todo se guarda solo en este navegador.
            {accepted && (
              <>
                {' '}
                Aceptaste los términos (versión {accepted.termsVersion}) el {new Date(accepted.acceptedAt).toLocaleString('es')}.
              </>
            )}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-ghost" onClick={exportData} disabled={exporting}>
              {exporting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
              Descargar mis datos
            </button>
            <button
              type="button"
              className="btn-ghost text-rose-700 hover:bg-rose-50"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={16} aria-hidden="true" /> Eliminar mi cuenta
            </button>
          </div>
        </section>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar tu cuenta?"
        message="Se borrarán de este navegador tu cuenta, todas tus pizarras, tus imágenes y tu registro de aceptación de términos. No se puede deshacer. Si quieres conservar una copia, descarga antes tus datos."
        confirmLabel="Eliminar mi cuenta"
        danger
        onConfirm={removeAccount}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
