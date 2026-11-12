import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authService, boardService, isCloud } from '../services';
import { PRIVACY_VERSION, TERMS_VERSION } from '../legal/config';

const AuthContext = createContext(null);
const CURRENT_ACCEPTANCE = { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION };

/** Quita de la URL los tokens que dejan los enlaces de los correos (#access_token=...). */
function cleanAuthHash() {
  if (/access_token=|error_description=|type=recovery/.test(window.location.hash)) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

/** Mensaje de error que Supabase deja en la URL si un enlace caducó. */
function readHashError() {
  const m = window.location.hash.match(/error_description=([^&]+)/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [linkError, setLinkError] = useState(() => readHashError());
  const seeded = useRef(new Map()); // id de usuario → promesa de creación (evita duplicados)
  const codeFlow = useRef(false); // true mientras se cambia la contraseña con el código del correo

  /** Crea la pizarra de bienvenida la primera vez que la cuenta entra (en la nube puede ser tras confirmar el correo). */
  const ensureWelcome = useCallback(async (u) => {
    if (!u?.needsWelcome) return u;
    if (!seeded.current.has(u.id)) {
      seeded.current.set(
        u.id,
        (async () => {
          try {
            // Primero se reserva en la base de datos; solo quien gana la reserva crea la pizarra.
            if (await authService.claimWelcomeSeed(u.id)) await boardService.seedWelcomeBoard(u.id);
          } catch {
            /* La cuenta es válida aunque falle la pizarra de ejemplo. */
          }
        })()
      );
    }
    await seeded.current.get(u.id);
    return { ...u, needsWelcome: false };
  }, []);

  const applyUser = useCallback(
    async (u) => {
      const ready = u ? await ensureWelcome(u) : null;
      setUser(ready);
      return ready;
    },
    [ensureWelcome]
  );

  useEffect(() => {
    let alive = true;
    authService
      .getCurrentUser()
      .then((u) => alive && applyUser(u))
      .catch(() => alive && setUser(null))
      .finally(() => {
        if (alive) setLoading(false);
        cleanAuthHash();
      });

    if (!isCloud) return () => {
      alive = false;
    };

    // Cambios de sesión de Supabase: enlace de confirmación, enlace de recuperación, cierre en otra pestaña…
    const unsubscribe = authService.onAuthChange((event, session) => {
      // Las llamadas a Supabase no deben hacerse dentro del propio callback.
      setTimeout(async () => {
        if (!alive) return;
        // Con el código del correo el cambio lo termina PasswordResetFlow; el modal solo se abre al venir del enlace.
        if (event === 'PASSWORD_RECOVERY' && !codeFlow.current) setRecoveryMode(true);
        if (event === 'SIGNED_OUT') setUser(null);
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') && session?.user) {
          try {
            await applyUser(await authService.loadUser(session.user));
          } catch {
            /* se reintentará al recargar */
          }
        }
        cleanAuthHash();
      }, 0);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [applyUser]);

  const login = useCallback(async (data) => applyUser(await authService.login(data)), [applyUser]);

  /** Devuelve { user } o, en la nube con confirmación de correo activada, { needsConfirmation, email }. */
  const register = useCallback(
    async ({ acceptedTerms, ...data }) => {
      if (!acceptedTerms) {
        throw new Error('Debes aceptar los Términos y condiciones y la Política de privacidad para crear la cuenta.');
      }
      const result = await authService.register({ ...data, acceptance: CURRENT_ACCEPTANCE });
      if (result.needsConfirmation) return result;
      return { user: await applyUser(result.user) };
    },
    [applyUser]
  );

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

  /** Elimina la cuenta y todos sus datos (pizarras, imágenes y perfil). */
  const deleteAccount = useCallback(async () => {
    await boardService.deleteAllForOwner(user.id);
    await authService.deleteAccount(user.id);
    setUser(null);
  }, [user]);

  // --- Contraseña (solo en modo nube) ---
  const requestPasswordReset = useCallback((email) => authService.requestPasswordReset(email), []);
  const verifyRecoveryCode = useCallback(async (email, code) => {
    codeFlow.current = true;
    try {
      await authService.verifyRecoveryCode(email, code);
    } catch (err) {
      codeFlow.current = false;
      throw err;
    }
  }, []);
  const updatePassword = useCallback(async (password) => {
    try {
      await authService.updatePassword(password);
    } catch (err) {
      // El código ya se validó (hay sesión de recuperación): se ofrece reintentar en el modal.
      if (codeFlow.current) setRecoveryMode(true);
      codeFlow.current = false;
      throw err;
    }
    codeFlow.current = false;
    setRecoveryMode(false);
  }, []);
  const endRecovery = useCallback(() => setRecoveryMode(false), []);
  const clearLinkError = useCallback(() => setLinkError(null), []);

  const needsTermsAcceptance =
    !!user &&
    (user.termsAcceptance?.termsVersion !== TERMS_VERSION || user.termsAcceptance?.privacyVersion !== PRIVACY_VERSION);

  const value = useMemo(
    () => ({
      user,
      loading,
      isCloud,
      login,
      register,
      logout,
      updateProfile,
      acceptCurrentTerms,
      deleteAccount,
      needsTermsAcceptance,
      requestPasswordReset,
      verifyRecoveryCode,
      updatePassword,
      recoveryMode,
      endRecovery,
      linkError,
      clearLinkError,
    }),
    [user, loading, login, register, logout, updateProfile, acceptCurrentTerms, deleteAccount, needsTermsAcceptance, requestPasswordReset, verifyRecoveryCode, updatePassword, recoveryMode, endRecovery, linkError, clearLinkError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
