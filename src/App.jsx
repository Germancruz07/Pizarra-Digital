import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FullScreenLoader } from './components/ui/Loader';
import { useAuth } from './context/AuthContext';
import { useHashRoute } from './hooks/useHashRoute';
import AuthScreen from './components/auth/AuthScreen';
import Dashboard from './components/dashboard/Dashboard';
import BoardEditor from './components/board/BoardEditor';

const SPLASH_MIN_MS = 900;

/** Muestra la pantalla de arranque un mínimo de tiempo para que la animación no parpadee. */
function useMinimumDelay(ms) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return done;
}

// Transición de entrada por pantalla (el `key` remonta y vuelve a animar al cambiar de vista).
const page = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transitionEnd: { transform: 'none' } },
  transition: { duration: 0.3, ease: 'easeOut' },
};

export default function App() {
  const { user, loading } = useAuth();
  const [route, navigate] = useHashRoute();
  const splashDone = useMinimumDelay(SPLASH_MIN_MS);

  if (loading || !splashDone) return <FullScreenLoader label="Preparando tu espacio" />;

  let key;
  let content;
  if (!user) {
    key = 'auth';
    content = <AuthScreen />;
  } else if (route.name === 'board') {
    key = `board-${route.id}`;
    content = <BoardEditor boardId={route.id} onExit={() => navigate('/')} />;
  } else {
    key = `dashboard-${user.id}`;
    content = <Dashboard onOpenBoard={(id) => navigate(`/board/${id}`)} />;
  }

  return (
    <motion.div key={key} className="h-full" {...page}>
      {content}
    </motion.div>
  );
}
