import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, boardService } from '../services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (data) => {
    const u = await authService.login(data);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const u = await authService.register(data);
    try {
      await boardService.seedWelcomeBoard(u.id);
    } catch {
      /* La cuenta es válida aunque falle la pizarra de ejemplo. */
    }
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch) => {
      const u = await authService.updateProfile(user.id, patch);
      setUser(u);
      return u;
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile }),
    [user, loading, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
