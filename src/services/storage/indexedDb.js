const DB_NAME = 'pizarra-digital';
const DB_VERSION = 1;

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Tu navegador no soporta IndexedDB.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('boards')) {
        db.createObjectStore('boards', { keyPath: 'id' }).createIndex('ownerId', 'ownerId');
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' }).createIndex('ownerId', 'ownerId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error || new Error('No se pudo abrir la base de datos local.'));
    };
  });
  return dbPromise;
}

async function run(storeName, mode, operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    const req = operation(store);
    if (req) req.onsuccess = () => (result = req.result);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Operación de base de datos cancelada.'));
  });
}

export const idbGet = (store, key) => run(store, 'readonly', (s) => s.get(key));
export const idbPut = (store, value) => run(store, 'readwrite', (s) => s.put(value));
export const idbDelete = (store, key) => run(store, 'readwrite', (s) => s.delete(key));
export const idbGetAllByIndex = (store, index, value) =>
  run(store, 'readonly', (s) => s.index(index).getAll(value));
export const idbGetAllKeysByIndex = (store, index, value) =>
  run(store, 'readonly', (s) => s.index(index).getAllKeys(value));
export const idbDeleteMany = (store, keys) =>
  run(store, 'readwrite', (s) => {
    keys.forEach((k) => s.delete(k));
    return null;
  });
