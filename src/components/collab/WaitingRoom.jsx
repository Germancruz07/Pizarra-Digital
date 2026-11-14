import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Hourglass, UserX } from 'lucide-react';
import { collabService } from '../../services';

const COPY = {
  pending: {
    icon: Hourglass,
    title: 'Esperando al profesor',
    text: 'Tu solicitud se ha enviado. Entrarás automáticamente en cuanto el profesor la apruebe.',
  },
  rejected: {
    icon: UserX,
    title: 'Solicitud rechazada',
    text: 'El profesor no ha aceptado tu solicitud. Si crees que es un error, pídele que te acepte y vuelve a introducir el código.',
  },
  removed: {
    icon: UserX,
    title: 'Ya no tienes acceso',
    text: 'El profesor te ha retirado de esta pizarra. Puedes volver a solicitar acceso con el código.',
  },
};

/** Sala de espera del estudiante: escucha en vivo la decisión del profesor. */
export default function WaitingRoom({ boardId, userId, status, onStatusChange, onExit }) {
  useEffect(() => {
    if (status !== 'pending') return undefined;
    return collabService.subscribeMembers(boardId, (member) => {
      if (member?.userId === userId && member.status !== 'pending') onStatusChange(member.status);
    });
  }, [boardId, userId, status, onStatusChange]);

  const { icon: Icon, title, text } = COPY[status] || COPY.removed;

  return (
    <div className="grid h-full place-items-center bg-slate-50 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm text-center" role="status" aria-live="polite">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
          <Icon size={30} aria-hidden="true" className={status === 'pending' ? 'animate-pulse' : ''} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
        <button className="btn-primary mt-6" onClick={onExit}>
          <ArrowLeft size={16} /> Volver a mis pizarras
        </button>
      </motion.div>
    </div>
  );
}
