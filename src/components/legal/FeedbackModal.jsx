import { useEffect, useState } from 'react';
import { MessageSquareHeart, Star } from 'lucide-react';
import Modal from '../ui/Modal';
import { CONTACT_EMAIL } from '../../legal/config';

/**
 * Opiniones de usuarios. Como la app no tiene servidor, la opinión se envía por correo desde el
 * programa de correo de la persona (nada se publica automáticamente). No mostramos reseñas inventadas.
 */
export default function FeedbackModal({ open, onClose }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open) {
      setRating(0);
      setComment('');
    }
  }, [open]);

  const isEmpty = !rating && !comment.trim();
  const subject =`Opinión sobre Pizarra Digital${rating ? ` (${rating}/5)` : ''}`;
  const body = `${rating ? `Valoración: ${rating} de 5\n\n` : ''}${comment}`;
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Modal open={open} onClose={onClose} title="Deja tu opinión" icon={MessageSquareHeart}>
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Valoración (opcional)</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer rounded-lg p-1 focus-within:ring-2 focus-within:ring-indigo-600">
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  className="sr-only"
                  checked={rating === n}
                  onChange={() => setRating(n)}
                />
                <Star
                  size={28}
                  aria-hidden="true"
                  className={n <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-600'}
                />
                <span className="sr-only">{n} de 5 estrellas</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Comentario</span>
          <textarea
            className="field min-h-28 resize-y"
            value={comment}
            maxLength={2000}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
        <p className="text-xs leading-relaxed text-slate-600">
          Al pulsar «Enviar por correo» se abrirá tu programa de correo con el mensaje listo para enviar a{' '}
          {CONTACT_EMAIL}. No se envía nada hasta que tú lo confirmes allí, y no publicamos opiniones sin tu permiso.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <a
            href={href}
            onClick={(e) => {
              if (isEmpty) {
                e.preventDefault();
                return;
              }
              onClose();
            }}
            className={`btn-primary ${isEmpty ? 'cursor-not-allowed opacity-60' : ''}`}
            aria-disabled={isEmpty}
          >
            Enviar por correo
          </a>
        </div>
      </div>
    </Modal>
  );
}
