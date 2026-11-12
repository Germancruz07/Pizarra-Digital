import { useCallback, useEffect, useState } from 'react';

function parse() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const board = hash.match(/^\/board\/([\w-]+)/);
  if (board) return { name: 'board', id: board[1] };
  const legal = hash.match(/^\/legal\/([a-z]+)/);
  if (legal) return { name: 'legal', page: legal[1] };
  // Enlaces de los correos: #/confirmar?token_hash=…&type=email|recovery
  if (hash.startsWith('/confirmar')) {
    const params = new URLSearchParams(hash.split('?')[1] || '');
    return { name: 'confirm', tokenHash: params.get('token_hash') || '', type: params.get('type') || '' };
  }
  return { name: 'dashboard' };
}

/** Enrutado mínimo por hash: "#/", "#/board/:id", "#/legal/:pagina" y "#/confirmar?…". */
export function useHashRoute() {
  const [route, setRoute] = useState(parse);

  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path) => {
    window.location.hash = path;
  }, []);

  return [route, navigate];
}

/** Cambia la ruta sin dejar la anterior en el historial (para no guardar tokens de un solo uso). */
export function replaceRoute(path) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${path}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
