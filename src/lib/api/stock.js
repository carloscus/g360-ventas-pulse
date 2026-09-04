import { STOCK_API_URL, STOCK_API_KEY } from './env.js';

const TTL_MS = 15 * 60 * 1000;
const PROBE_TIMEOUT_MS = 60000;
const FETCH_TIMEOUT_MS = 60000;
const SESSION_KEY = 'cockpit-stock';
const SS_KEY_META = 'cockpit-stock-meta';

let mapaMemoria = null;
let metaMemoria = null;
let cargaEnCurso = null;

function esVenta(a) {
	return a.tipo === 'venta';
}

function construirMapa(items) {
	const mapa = new Map();
	for (const it of items || []) {
		let disp = 0;
		for (const a of it.almacenes || []) {
			if (esVenta(a)) disp += Number(a.disponible) || 0;
		}
		mapa.set(String(it.sku), disp);
	}
	return mapa;
}

async function fetchJson(url, timeoutMs, extraHeaders = {}) {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		const r = await fetch(url, {
			headers: { 'X-API-Key': STOCK_API_KEY, ...extraHeaders },
			signal: ctrl.signal
		});
		if (!r.ok) throw new Error(`Stock API ${r.status}`);
		return await r.json();
	} finally {
		clearTimeout(t);
	}
}

const LOCAL_KEY = 'cockpit-stock-v1';

function leerLocal(permitirStale = false) {
	try {
		const raw = localStorage.getItem(LOCAL_KEY);
		if (!raw) return null;
		const entry = JSON.parse(raw);
		if (Date.now() - entry.t > TTL_MS && !permitirStale) return null;
		return { mapa: new Map(entry.d), meta: entry.m, stale: Date.now() - entry.t > TTL_MS };
	} catch {
		return null;
	}
}

function guardarLocal(mapa, meta) {
	try {
		localStorage.setItem(LOCAL_KEY, JSON.stringify({ d: [...mapa.entries()], m: meta, t: Date.now() }));
	} catch {
		/* quota */
	}
}

function leerSesion() {
	try {
		const raw = sessionStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const entry = JSON.parse(raw);
		if (Date.now() - entry.t > TTL_MS) return null;
		return { mapa: new Map(entry.d), meta: entry.m };
	} catch {
		return null;
	}
}

function guardarSesion(mapa, meta) {
	try {
		sessionStorage.setItem(SESSION_KEY, JSON.stringify({ d: [...mapa.entries()], m: meta, t: Date.now() }));
	} catch {
		/* quota */
	}
}

function headersRange1() {
	return { Range: 'items=0-0' };
}

/**
 * Probe ligero: metadata del snapshot (limit=1) para detectar regeneracion
 * sin bajar el payload completo (~1.2MB).
 */
async function probeMeta() {
	const data = await fetchJson(`${STOCK_API_URL}?limit=1`, PROBE_TIMEOUT_MS, headersRange1());
	return data?.metadata || null;
}

/**
 * Snapshot de stock: sku -> disponible (suma de almacenes de venta).
 * Cache: memoria (15 min) -> sessionStorage (15 min) -> API.
 * @param {{force?: boolean}} opts force = refetch manual
 * @returns {Promise<{mapa: Map|null, meta: object|null, source: string, error: Error|null}>}
 */
export async function getStockMapa(opts = {}) {
	if (!opts.force && mapaMemoria) {
		return { mapa: mapaMemoria, meta: metaMemoria, source: 'memory', error: null };
	}
	if (!opts.force) {
		const local = leerLocal();
		if (local) {
			mapaMemoria = local.mapa;
			metaMemoria = local.meta;
			return { mapa: mapaMemoria, meta: metaMemoria, source: 'local', error: null };
		}
		const sesion = leerSesion();
		if (sesion) {
			mapaMemoria = sesion.mapa;
			metaMemoria = sesion.meta;
			return { mapa: mapaMemoria, meta: metaMemoria, source: 'session', error: null };
		}
	}
	if (cargaEnCurso && !opts.force) return cargaEnCurso;

	cargaEnCurso = (async () => {
		try {
			const data = await fetchJson(STOCK_API_URL, FETCH_TIMEOUT_MS);
			const meta = data?.metadata || {};
			const mapa = construirMapa(data?.items);
			mapaMemoria = mapa;
			metaMemoria = meta;
			guardarSesion(mapa, meta);
			guardarLocal(mapa, meta);
			return { mapa, meta, source: 'network', error: null };
		} catch (err) {
			console.warn('[stock] error:', err.message);
			// Fallback versatil: snapshot viejo (stale) mejor que nada en campo
			const stale = leerLocal(true);
			if (stale) {
				mapaMemoria = stale.mapa;
				metaMemoria = { ...stale.meta, stale: true };
				return { mapa: mapaMemoria, meta: metaMemoria, source: 'stale', error: null };
			}
			return { mapa: mapaMemoria, meta: metaMemoria, source: 'none', error: err };
		} finally {
			cargaEnCurso = null;
		}
	})();
	return cargaEnCurso;
}

/** Disponibilidad de un SKU (null si no hay snapshot o SKU desconocido). */
export function disponibleSku(mapa, sku) {
	if (!mapa) return null;
	const v = mapa.get(String(sku));
	return v === undefined ? null : v;
}

/** Clasificacion para badges: 'ok' | 'bajo' | 'sin' | null (sin datos). */
export function clasificarStock(disp) {
	if (disp === null || disp === undefined) return null;
	if (disp <= 0) return 'sin';
	if (disp < 50) return 'bajo';
	return 'ok';
}

/** Descarta el cache en memoria (p.ej. al cambiar de vendedor no es necesario, pero por simetria). */
export function resetStockCache() {
	mapaMemoria = null;
	metaMemoria = null;
	try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(LOCAL_KEY); } catch { /* noop */ }
}


