// storage.js — everything lives on this device only (IndexedDB). Nothing is uploaded.
const DB_NAME = 'frankies-garage';
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    const r = fn(s);
    if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const kv = {
  get: (key) => tx('kv', 'readonly', (s) => s.get(key)),
  set: (key, val) => tx('kv', 'readwrite', (s) => s.put(val, key)),
  del: (key) => tx('kv', 'readwrite', (s) => s.delete(key)),
};

// Audio clips are stored as { buf: ArrayBuffer (WAV), type: 'audio/wav' }
export const audioStore = {
  get: (key) => tx('audio', 'readonly', (s) => s.get(key)),
  set: (key, val) => tx('audio', 'readwrite', (s) => s.put(val, key)),
  del: (key) => tx('audio', 'readwrite', (s) => s.delete(key)),
  keys: () => tx('audio', 'readonly', (s) => s.getAllKeys()),
  clear: () => tx('audio', 'readwrite', (s) => s.clear()),
};

export async function clearAll() {
  await tx('kv', 'readwrite', (s) => s.clear());
  await audioStore.clear();
}

// Ask the browser not to evict our data (helps on iPad).
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch (_) { /* ignore */ }
}
