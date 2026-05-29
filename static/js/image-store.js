/**
 * Хранение превью каталога в IndexedDB (больше объём, чем localStorage).
 */

const _IDB_NAME = "teremImageDb";
const _IDB_VERSION = 1;
const _IDB_STORE = "images";

/** @type {Promise<IDBDatabase> | null} */
let _dbPromise = null;

function _openDb() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("indexedDB unavailable"));
            return;
        }
        const req = indexedDB.open(_IDB_NAME, _IDB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(_IDB_STORE)) {
                db.createObjectStore(_IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("idb open failed"));
    });
    return _dbPromise;
}

/**
 * @param {string} key
 * @param {string} dataUrl
 */
async function putImage(key, dataUrl) {
    const db = await _openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(_IDB_STORE, "readwrite");
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.objectStore(_IDB_STORE).put(dataUrl, key);
    });
}

/**
 * @param {string} key
 * @returns {Promise<string | null>}
 */
async function getImage(key) {
    try {
        const db = await _openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(_IDB_STORE, "readonly");
            const req = tx.objectStore(_IDB_STORE).get(key);
            req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : null);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return null;
    }
}

/** @param {string} key */
async function deleteImage(key) {
    try {
        const db = await _openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(_IDB_STORE, "readwrite");
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
            tx.objectStore(_IDB_STORE).delete(key);
        });
    } catch (e) {
        return false;
    }
}

/** @param {string} dataUrl */
async function canStoreImage(dataUrl) {
    const probeKey = "__probe__" + Date.now();
    try {
        await putImage(probeKey, dataUrl);
        await deleteImage(probeKey);
        return true;
    } catch (e) {
        return false;
    }
}

window.TeremImageStore = {
    put: putImage,
    get: getImage,
    delete: deleteImage,
    canStore: canStoreImage,
};
