import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, boardService } from '../services';
import { PRIVACY_VERSION, TERMS_VERSION } from '../legal/config';

const AuthContext = createContext(null);
const CURRENT_ACCEPTANCE = { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION };

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

  const register = useCallback(async ({ acceptedTerms, ...data }) => {
    if (!acceptedTerms) {
      throw new Error('Debes aceptar los Términos y condiciones y la Política de privacidad para crear la cuenta.');
    }
    const u = await authService.register({ ...data, acceptance: CURRENT_ACCEPTANCE });
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

  const acceptCurrentTerms = useCallback(async () => {
    const u = await authService.acceptTerms(user.id, CURRENT_ACCEPTANCE);
    setUser(u);
    return u;
  }, [user]);

  /** Elimina la cuenta y todos sus datos de este navegador (pizarras, imágenes y perfil). */
  const deleteAccount = useCallback(async () => {
    await boardService.deleteAllForOwner(user.id);
    await authService.deleteAccount(user.id);
    setUser(null);
  }, [user]);

  const needsTermsAcceptance =
    !!user &&
    (user.termsAcceptance?.termsVersion !== TERMS_VERSION || user.termsAcceptance?.privacyVersion !== PRIVACY_VERSION);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile, acceptCurrentTerms, deleteAccount, needsTermsAcceptance }),
    [user, loading, login, register, logout, updateProfile, acceptCurrentTerms, deleteAccount, needsTermsAcceptance]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
