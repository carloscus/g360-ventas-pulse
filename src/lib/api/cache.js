const SESSION_TTL_MS = 5 * 60 * 1000;
const PERSISTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MEMORY = new Map();
const PREFIX = 'cockpit-cache-v2:'; // v2: invalida entradas con paginacion rota (offset ignorado)

function now() { return Date.now(); }

function cacheKey(view, params) {
	return `${view}|${JSON.stringify(params)}`;
}

function readSession(key) {
	try {
		const raw = sessionStorage.getItem(PREFIX + key);
		if (!raw) return null;
		const entry = JSON.parse(raw);
		if (now() - entry.t > SESSION_TTL_MS) {
			sessionStorage.removeItem(PREFIX + key);
			return null;
		}
		return entry.d;
	} catch {
		return null;
	}
}

function writeSession(key, data) {
	try {
		sessionStorage.setItem(PREFIX + key, JSON.stringify({ d: data, t: now() }));
	} catch {
		/* quota */
	}
}

function readLocal(key) {
	try {
		const raw = localStorage.getItem(PREFIX + key);
		if (!raw) return null;
		const entry = JSON.parse(raw);
		if (now() - entry.t > PERSISTENT_TTL_MS) {
			localStorage.removeItem(PREFIX + key);
			return null;
		}
		return entry.d;
	} catch {
		return null;
	}
}

function writeLocal(key, data) {
	try {
		localStorage.setItem(PREFIX + key, JSON.stringify({ d: data, t: now() }));
	} catch {
		/* quota */
	}
}

/**
 * Cache de 4 capas (patron reporter-lit):
 * memoria (TTL 5 min) -> sessionStorage (<5 min) -> localStorage (<7 dias) -> red
 * La memoria TAMBIEN expira: sin esto, una pestaña abierta dias sirve datos
 * congelados (el caso "app abierta 1 semana"). `force: true` salta las capas
 * de lectura, va a red y sobre-escribe las 3 capas (pull-to-refresh, botones ↻).
 * @param {string} view vista PostgREST
 * @param {object} params argumentos de postgrestGet
 * @param {Function} fetcher funcion async que resuelve los datos
 * @param {{force?: boolean}} opts force = refetch ignorando cache
 * @returns {Promise<{data: *|null, source: 'memory'|'session'|'local'|'network'|'none', error: Error|null}>}
 */
export async function cachedGet(view, params, fetcher, { force = false } = {}) {
	const key = cacheKey(view, params);

	if (!force) {
		const mem = MEMORY.get(key);
		if (mem && now() - mem.t <= SESSION_TTL_MS) {
			console.debug('[cache] memory hit', key);
			return { data: mem.d, source: 'memory', error: null };
		}
		if (mem) MEMORY.delete(key);

		const sessionData = readSession(key);
		if (sessionData !== null) {
			console.debug('[cache] session hit', key);
			MEMORY.set(key, { d: sessionData, t: now() });
			return { data: sessionData, source: 'session', error: null };
		}

		const localData = readLocal(key);
		if (localData !== null) {
			console.debug('[cache] local hit', key);
			MEMORY.set(key, { d: localData, t: now() });
			return { data: localData, source: 'local', error: null };
		}
	}

	try {
		const data = await fetcher();
		MEMORY.set(key, { d: data, t: now() });
		writeSession(key, data);
		writeLocal(key, data);
		console.debug('[cache] network fetch', force ? '(force)' : '', key);
		return { data, source: 'network', error: null };
	} catch (err) {
		console.warn('[cache] network error', key, err);
		// En force, si la red falla, caer a las capas viejas mejor que vacio
		if (force) {
			const fallback = readSession(key) ?? readLocal(key) ?? (MEMORY.get(key)?.d ?? null);
			if (fallback !== null) {
				return { data: fallback, source: 'session', error: err };
			}
		}
		return { data: null, source: 'none', error: err };
	}
}

/** Invalida todas las capas de cache (uso al cambiar de vendedor). */
export function clearCache() {
	MEMORY.clear();
	try {
		const toRemove = [];
		for (let i = 0; i < sessionStorage.length; i++) {
			const k = sessionStorage.key(i);
			if (k.startsWith(PREFIX)) toRemove.push(k);
		}
		for (const k of toRemove) sessionStorage.removeItem(k);
		const toRemoveL = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k.startsWith(PREFIX)) toRemoveL.push(k);
		}
		for (const k of toRemoveL) localStorage.removeItem(k);
	} catch {
		/* storage no disponible */
	}
}

