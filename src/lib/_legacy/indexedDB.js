const DB_NAME = 'DevolucionProductos';
const DB_VERSION = 1;
const STORE_NAME = 'estado';
let db = null;

export function initDB() {
	if (!window.indexedDB) {
		console.warn('IndexedDB no disponible');
		return Promise.resolve(null);
	}
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};
		request.onupgradeneeded = (event) => {
			const database = event.target.result;
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME, { keyPath: 'id' });
			}
		};
	});
}

export function saveState(state) {
	if (!db) return Promise.resolve();
	return new Promise((resolve, reject) => {
		try {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put({ id: 'appEstado', ...state, lastSaved: new Date().toISOString() });
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		} catch (err) {
			reject(err);
		}
	});
}

export function loadState() {
	if (!db) return Promise.resolve(null);
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get('appEstado');
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => resolve(null);
		} catch (err) {
			console.error('Error cargando estado:', err);
			resolve(null);
		}
	});
}

export function clearState() {
	if (!db) return Promise.resolve();
	return new Promise((resolve, reject) => {
		try {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.delete('appEstado');
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		} catch (err) {
			reject(err);
		}
	});
}
