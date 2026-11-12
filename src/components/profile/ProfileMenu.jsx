import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut, ShieldCheck, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import Avatar from '../ui/Avatar';
import ProfileModal from './ProfileModal';

export default function ProfileMenu({ compact = false, beforeLogout }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await beforeLogout?.();
    await logout();
    window.location.hash = '/';
    toast('Sesión cerrada. ¡Hasta pronto!', 'info');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full p-0.5 transition hover:bg-slate-100 ${compact ? '' : 'pr-2.5'}`}
        aria-label={`Menú de perfil de ${user.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar avatar={user.avatar} name={user.name} size={compact ? 32 : 36} />
        {!compact && <span className="hidden max-w-[140px] truncate text-sm font-semibold text-slate-700 sm:block">{user.name}</span>}
        <ChevronDown size={15} aria-hidden="true" className={`text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
          >
            <div className="flex items-center gap-3 bg-linear-to-br from-indigo-50 to-violet-50 p-4">
              <Avatar avatar={user.avatar} name={user.name} size={44} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-600">@{user.username || user.email}</p>
              </div>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  setEditing(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <UserCog size={16} aria-hidden="true" /> Perfil y mis datos
              </button>
              <a
                href="#/legal/privacidad"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <ShieldCheck size={16} aria-hidden="true" /> Privacidad y términos
              </a>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileModal open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}
