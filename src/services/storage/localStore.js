export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('El almacenamiento local está lleno. Prueba con un avatar más ligero.');
    }
    throw new Error('No se pudo escribir en el almacenamiento local.');
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* almacenamiento no disponible: nada que borrar */
  }
}
