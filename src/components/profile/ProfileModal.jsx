import { useEffect, useState } from 'react';
import { Loader2, UserCog } from 'lucide-react';
import Modal from '../ui/Modal';
import AvatarPicker from '../auth/AvatarPicker';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ProfileModal({ open, onClose }) {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setAvatar(user.avatar);
      setError('');
    }
  }, [open, user]);

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

  return (
    <Modal open={open} onClose={onClose} title="Editar perfil" subtitle={user?.email} icon={UserCog}>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</span>
          <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Avatar</span>
          {avatar && <AvatarPicker value={avatar} onChange={setAvatar} name={name} />}
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />} Guardar cambios
          </button>
        </div>
      </form>
    </Modal>
  );
}
