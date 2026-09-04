import { base } from '$app/paths';

let catalogoPorSku = null;
let cargaEnCurso = null;

function normalizar(raw) {
	const productos = raw.productos || [];
	const mapa = new Map();
	for (const p of productos) {
		mapa.set(String(p.sku), {
			sku: String(p.sku),
			nombre: p.nombre || '',
			linea: p.linea || '',
			un_bx: p.un_bx && p.un_bx > 0 ? p.un_bx : null,
			precio_lista: p.precio_lista || null
		});
	}
	return mapa;
}

/** Mapa sku -> { nombre, linea, un_bx, precio_lista }. Carga una sola vez. */
export async function getCatalogoPorSku() {
	if (catalogoPorSku) return catalogoPorSku;
	if (cargaEnCurso) return cargaEnCurso;
	cargaEnCurso = (async () => {
		const response = await fetch(`${base}/catalogo_productos.json`);
		if (!response.ok) throw new Error(`Catalogo HTTP ${response.status}`);
		const raw = await response.json();
		catalogoPorSku = normalizar(raw);
		return catalogoPorSku;
	})();
	return cargaEnCurso;
}

/** Devuelve info del SKU o null si no existe en catalogo. */
export async function lookupSku(sku) {
	const mapa = await getCatalogoPorSku();
	return mapa.get(String(sku)) || null;
}

/** Cajas para una cantidad de unidades (null si el SKU no tiene un_bx). */
export async function undACajas(sku, und) {
	const info = await lookupSku(sku);
	if (!info || !info.un_bx) return null;
	return und / info.un_bx;
}
