const DB_NAME = 'VentasCockpit';
const DB_VERSION = 2;
const STORE_NAME = 'sesion';
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

function put(record) {
	if (!db) return Promise.resolve();
	return new Promise((resolve, reject) => {
		try {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			const request = store.put({ ...record, lastSaved: new Date().toISOString() });
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		} catch (err) {
			reject(err);
		}
	});
}

function get(id) {
	if (!db) return Promise.resolve(null);
	return new Promise((resolve) => {
		try {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const request = store.get(id);
			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => resolve(null);
		} catch (err) {
			console.error('Error leyendo sesion:', err);
			resolve(null);
		}
	});
}

export function saveVendedorActivo(vendedor) {
	return put({ id: 'vendedorActivo', vendedor });
}

export function loadVendedorActivo() {
	return get('vendedorActivo').then((row) => (row ? row.vendedor : null));
}

const RUTA_KEY = 'rutaDia';

export function saveRutaDia(idVendedor, idsClientes) {
	return put({ id: RUTA_KEY, idVendedor, idsClientes });
}

export function loadRutaDia(idVendedor) {
	return get(RUTA_KEY).then((row) => (row && row.idVendedor === idVendedor ? row.idsClientes || [] : []));
}


