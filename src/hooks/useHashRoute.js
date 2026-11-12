import { useCallback, useEffect, useState } from 'react';

function parse() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const board = hash.match(/^\/board\/([\w-]+)/);
  if (board) return { name: 'board', id: board[1] };
  const legal = hash.match(/^\/legal\/([a-z]+)/);
  if (legal) return { name: 'legal', page: legal[1] };
  return { name: 'dashboard' };
}

/** Enrutado mínimo por hash: "#/" (dashboard), "#/board/:id" (editor) y "#/legal/:pagina". */
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
