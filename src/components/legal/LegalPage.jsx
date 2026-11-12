import { useEffect } from 'react';
import { ArrowLeft, PenLine } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import SiteFooter from './SiteFooter';
import { Contact, Cookies, Licenses, Privacy, Terms } from './LegalContent';

export const LEGAL_PAGES = {
  privacidad: { label: 'Privacidad', title: 'Política de privacidad', Component: Privacy },
  terminos: { label: 'Términos', title: 'Términos y condiciones', Component: Terms },
  cookies: { label: 'Cookies', title: 'Política de cookies', Component: Cookies },
  licencias: { label: 'Licencias', title: 'Licencias y créditos', Component: Licenses },
  contacto: { label: 'Contacto', title: 'Contacto y derechos de autor', Component: Contact },
};

export default function LegalPage({ page }) {
  const current = LEGAL_PAGES[page] || LEGAL_PAGES.privacidad;
  const { Component } = current;

  useEffect(() => {
    document.title = `${current.title} · Pizarra Digital`;
    window.scrollTo(0, 0);
    return () => {
      document.title = 'Pizarra Digital';
    };
  }, [current]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <a href="#/" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <ArrowLeft size={17} aria-hidden="true" /> Volver a la app
          </a>
          <span className="ml-auto flex items-center gap-2 font-bold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-indigo-600 to-violet-700 text-white" aria-hidden="true">
              <PenLine size={16} />
            </span>
            <span className="hidden sm:inline">Pizarra</span>
          </span>
          <ThemeToggle />
        </div>
        <nav aria-label="Documentos legales" className="mx-auto max-w-4xl overflow-x-auto px-4 pb-2">
          <ul className="flex gap-1">
            {Object.entries(LEGAL_PAGES).map(([key, p]) => (
              <li key={key}>
                <a
                  href={`#/legal/${key}`}
                  aria-current={p === current ? 'page' : undefined}
                  className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                    p === current ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <article className="legal">
          <Component />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
