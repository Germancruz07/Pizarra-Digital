import { useCallback, useEffect, useState } from 'react';

function parse() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const m = hash.match(/^\/board\/([\w-]+)/);
  return m ? { name: 'board', id: m[1] } : { name: 'dashboard' };
}

/** Enrutado mínimo por hash: "#/" (dashboard) y "#/board/:id" (editor). */
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
