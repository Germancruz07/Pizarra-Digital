import { CONTACT_EMAIL, LAST_UPDATED } from '../../legal/config';

export function Mail() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
}

export function Updated() {
  return <p className="legal-meta">Última actualización: {LAST_UPDATED}</p>;
}
