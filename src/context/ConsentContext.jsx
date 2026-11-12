import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { COOKIES_VERSION } from '../legal/config';

const STORAGE_KEY = 'pd:consent';
const ConsentContext = createContext(null);

/**
 * Consentimiento de almacenamiento en este dispositivo.
 *  - Esencial (siempre activo): sesión, cuentas, pizarras, imágenes y este propio registro de consentimiento.
 *  - Preferencias (opcional, desactivado por defecto): recordar el tema claro/oscuro.
 * No existe ninguna categoría de analítica, publicidad o rastreo: la app no carga ninguno
 * y la Content-Security-Policy impide cargar scripts de terceros.
 */
function readConsent() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return raw && raw.version === COOKIES_VERSION ? raw : null;
  } catch {
    return null;
  }
}

export function ConsentProvider({ children }) {
  const [consent, setConsent] = useState(readConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const decide = useCallback(({ preferences }) => {
    const record = {
      version: COOKIES_VERSION,
      preferences: !!preferences,
      decidedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      if (!record.preferences) localStorage.removeItem('pd:theme');
    } catch {
      /* sin almacenamiento disponible: la decisión dura esta sesión */
    }
    setConsent(record);
    setSettingsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      consent,
      decided: !!consent,
      allowsPreferences: !!consent?.preferences,
      decide,
      settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }),
    [consent, decide, settingsOpen]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export const useConsent = () => useContext(ConsentContext);
