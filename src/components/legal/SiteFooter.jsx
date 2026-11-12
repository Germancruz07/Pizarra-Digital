import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useConsent } from '../../context/ConsentContext';
import { CONTACT_EMAIL } from '../../legal/config';
import FeedbackModal from './FeedbackModal';

const LINKS = [
  ['#/legal/privacidad', 'Privacidad'],
  ['#/legal/terminos', 'Términos'],
  ['#/legal/cookies', 'Política de cookies'],
  ['#/legal/licencias', 'Licencias'],
  ['#/legal/contacto', 'Contacto y derechos de autor'],
];

export default function SiteFooter({ className = '' }) {
  const { openSettings } = useConsent();
  const [feedback, setFeedback] = useState(false);

  return (
    <footer className={`border-t border-slate-200/70 px-5 py-6 text-xs text-slate-600 ${className}`}>
      <nav aria-label="Información legal" className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {LINKS.map(([href, label]) => (
          <a key={href} href={href} className="rounded underline-offset-2 hover:text-slate-900 hover:underline">
            {label}
          </a>
        ))}
        <button type="button" onClick={openSettings} className="rounded underline-offset-2 hover:text-slate-900 hover:underline">
          Configurar cookies
        </button>
        <button type="button" onClick={() => setFeedback(true)} className="rounded underline-offset-2 hover:text-slate-900 hover:underline">
          Dejar una opinión
        </button>
      </nav>
      <p className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-1.5 text-center">
        <Sparkles size={13} aria-hidden="true" className="text-indigo-700" />
        <span>
          Sitio desarrollado con ayuda de inteligencia artificial (Claude, de Anthropic). Contacto:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-slate-800 underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </span>
      </p>
      <FeedbackModal open={feedback} onClose={() => setFeedback(false)} />
    </footer>
  );
}
