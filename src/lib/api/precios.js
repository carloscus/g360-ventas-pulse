import { postgrestGet, eq, gte, lte } from './postgrest.js';
import { cachedGet } from './cache.js';

const UMBRAL_ANOMALIA = -0.15;
const MIN_VENTAS = 3;
const SELECT = 'id_articulo,nom_articulo,cantidad,soles,precio_unitario,fecha_orig,mes_ref,tipo_operacion,tpo_doc,serie_doc,nro_doc,folio_unico';

/**
 * Historial completo de precios del cliente (4 anios, ventas con precio > 0).
 * Cacheado por cliente; usado por el analisis anual y las anomalias.
 */
const VENTANA_ANIOS = 4;

async function fetchPaginaPrecios(idCliente, desde, hasta, offset) {
	const params = {
		filters: [eq('id_cliente', idCliente), gte('fecha_orig', desde), lte('fecha_orig', hasta)],
		select: SELECT,
		order: 'fecha_orig.asc,folio_unico.asc,id.asc',
		limit: 1000
	};
	const res = await cachedGet('vw_historial_precios', { ...params, offset }, () =>
		postgrestGet('ventas', { ...params, offset })
	);
	return res.error ? { error: res.error, filas: [] } : { error: null, filas: res.data || [] };
}

async function fetchSlicePrecios(idCliente, desde, hasta) {
	const filas = [];
	let offset = 0;
	while (true) {
		const r = await fetchPaginaPrecios(idCliente, desde, hasta, offset);
		if (r.error) return { error: r.error, filas };
		filas.push(...r.filas);
		if (r.filas.length < 1000) return { error: null, filas };
		offset += 1000;
		if (offset > 10000) return { error: null, filas };
	}
}

function rebanadasMesHistorial(desde, hasta) {
	const out = [];
	let cur = new Date(`${desde}T00:00:00`);
	const fin = new Date(`${hasta}T00:00:00`);
	while (cur <= fin) {
		const sig = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
		const finSlice = new Date(Math.min(sig.getTime() - 86400000, fin.getTime()));
		out.push([cur.toISOString().slice(0, 10), finSlice.toISOString().slice(0, 10)]);
		cur = sig;
	}
	return out;
}

/**
 * Historial de precios del cliente (ventas + NCs; los signos/precios mandan
 * en los consumidores). Clientes pequenos: 1 request. Clientes grandes
 * (>1000 filas, ej TAI LOY): cae automaticamente a rebanadas mensuales en
 * paralelo, que ordenan solo el mes y evitan el statement timeout.
 */
export async function cargarHistorialPrecios(idCliente) {
	const hoy = new Date();
	const hace4 = new Date(hoy.getTime());
	hace4.setFullYear(hoy.getFullYear() - VENTANA_ANIOS);
	const desde = hace4.toISOString().slice(0, 10);
	const hasta = hoy.toISOString().slice(0, 10);

	const primera = await fetchPaginaPrecios(idCliente, desde, hasta, 0);
	if (!primera.error && primera.filas.length < 1000) {
		return { error: null, data: primera.filas };
	}

	const slices = rebanadasMesHistorial(desde, hasta);
	// concurrencia limitada: 49 queries paralelos saturan el pool y provocan
	// timeouts intermitentes; en tandas de 8 es estable
	const resultados = [];
	for (let i = 0; i < slices.length; i += 8) {
		const lote = slices.slice(i, i + 8);
		resultados.push(...await Promise.all(lote.map(([s, e]) => fetchSlicePrecios(idCliente, s, e))));
	}
	const todas = [];
	let error = primera.error || null;
	for (const r of resultados) {
		if (r.error) { error = error || r.error; continue; }
		todas.push(...r.filas);
	}
	if (todas.length === 0) return { error: error || new Error('sin datos'), data: [] };
	return { error: null, data: todas, incompleto: !!error };
}
/**
 * Agregacion anual por SKU: prom/min/max por anio + variacion % del ultimo
 * anio vs anterior. Solo SKUs con >= MIN_VENTAS ventas en el periodo.
 */
export function analisisAnual(rows, topSkus = null) {
	const porSku = new Map();
	for (const r of rows || []) {
		if (r.tipo_operacion && r.tipo_operacion !== 'venta') continue;
		const p = Number(r.precio_unitario);
		if (!(p > 0)) continue;
		const sku = String(r.id_articulo);
		let f = porSku.get(sku);
		if (!f) {
			f = { sku, nom: r.nom_articulo || sku, ventas: [] };
			porSku.set(sku, f);
		}
		f.ventas.push({ precio: p, cantidad: Number(r.cantidad) || 0, fecha: r.fecha_orig });
	}

	const resultado = [];
	for (const f of porSku.values()) {
		if (topSkus && !topSkus.has(f.sku)) continue;
		if (f.ventas.length < MIN_VENTAS) continue;

		const porAnio = new Map();
		for (const v of f.ventas) {
			const anio = String(v.fecha || '').slice(0, 4);
			if (!anio) continue;
			if (!porAnio.has(anio)) porAnio.set(anio, []);
			porAnio.get(anio).push(v);
		}
		if (porAnio.size === 0) continue;

		// Solo los ultimos 3 anios con datos: actual vs anterior vs antepenultimo
		const anios = [...porAnio.keys()].sort().slice(-3);
		const resumenAnios = anios.map((a) => {
			const vs = porAnio.get(a);
			const precios = vs.map((v) => v.precio);
			// moda: precio mas repetido (2 decimales) con su conteo
			const freq = new Map();
			for (const p of precios) {
				const k = p.toFixed(2);
				freq.set(k, (freq.get(k) || 0) + 1);
			}
			let modaK = null;
			let modaN = 0;
			for (const [k, n] of freq) {
				if (n > modaN) { modaK = k; modaN = n; }
			}
			// promedio ponderado por cantidad (precio realizado real)
			const cantTot = vs.reduce((s, v) => s + (v.cantidad || 0), 0);
			const pond = cantTot > 0 ? vs.reduce((s, v) => s + v.precio * (v.cantidad || 0), 0) / cantTot : 0;
			return {
				anio: a,
				prom: precios.reduce((x, y) => x + y, 0) / precios.length,
				promPond: pond,
				moda: modaK === null ? null : Number(modaK),
				modaN,
				n: precios.length,
				min: Math.min(...precios),
				max: Math.max(...precios)
			};
		});

		// Variacion % entre cada par consecutivo (ej: 2025->2026 y 2024->2025)
		const variaciones = [];
		for (let i = 1; i < resumenAnios.length; i++) {
			const prev = resumenAnios[i - 1];
			const act = resumenAnios[i];
			const base = prev.promPond || prev.prom;
			const actual = act.promPond || act.prom;
			if (base > 0) {
				variaciones.push({ de: prev.anio, a: act.anio, pct: (actual - base) / base });
			}
		}
		const variacion = variaciones.length > 0 ? variaciones[variaciones.length - 1].pct : null;

		resultado.push({
			sku: f.sku,
			nom: f.nom,
			anios: resumenAnios,
			variacion,
			variaciones,
			totalVentas: f.ventas.length
		});
	}

	return resultado.sort((a, b) => (b.anios.at(-1)?.prom || 0) - (a.anios.at(-1)?.prom || 0));
}

/**
 * Anomalias: ventas con precio < promedio del cliente+SKU * (1 + umbral).
 * Devuelve por SKU con contexto de cantidad y fecha (proxy de volumen).
 */
/** Clave de producto: nombre normalizado sin sufijos de presentacion (agrupa variantes). */
function claveProducto(nombre) {
	const s = String(nombre || '').trim().toUpperCase().replace(/\s+/g, ' ');
	return s
		.replace(/\s*(EST\s*X\s*\d+|X\s*\d+\s*(UND|UNIDADES)?|#\d+(\.\d+)?|\d+\s*(ML|CM|MM))\s*$/g, '')
		.replace(/[-\s]+$/, '')
		.trim() || s;
}

/**
 * Anomalias de precio agrupadas por PRODUCTO (variantes del mismo nombre se
 * consolidan). El promedio es PONDERADO por cantidad y se recalcula excluyendo
 * las filas anomalas (baseline limpia), para que "vs prom" refleje el precio
 * normal real del cliente, no uno contaminado por la propia campana.
 */
export function detectarAnomalias(rows, topSkus = null) {
	const porProducto = new Map();
	for (const r of rows || []) {
		if (r.tipo_operacion && r.tipo_operacion !== 'venta') continue;
		const sku = String(r.id_articulo);
		if (topSkus && !topSkus.has(sku)) continue;
		const p = Number(r.precio_unitario);
		if (!(p > 0)) continue;
		const clave = claveProducto(r.nom_articulo);
		let f = porProducto.get(clave);
		if (!f) {
			f = { nom: clave, skus: new Set(), filas: [] };
			porProducto.set(clave, f);
		}
		f.skus.add(sku);
		f.filas.push({ precio: p, cantidad: Number(r.cantidad) || 0, fecha: r.fecha_orig, doc: [r.serie_doc, r.nro_doc].filter(Boolean).join('-') });
	}

	const anomalias = [];
	for (const f of porProducto.values()) {
		if (f.filas.length < MIN_VENTAS) continue;
		const ponderado = (arr) => {
			const c = arr.reduce((s, v) => s + v.cantidad, 0);
			if (c <= 0) return 0;
			return arr.reduce((s, v) => s + v.precio * v.cantidad, 0) / c;
		};
		let prom = ponderado(f.filas);
		if (prom <= 0) continue;
		let malas = f.filas.filter((v) => v.precio / prom - 1 <= UMBRAL_ANOMALIA);
		if (malas.length === 0) continue;
		const malasSet = new Set(malas);
		const buenas = f.filas.filter((v) => !malasSet.has(v));
		if (buenas.length > 0) {
			const promLimpio = ponderado(buenas);
			if (promLimpio > 0) prom = promLimpio;
		}
		malas = f.filas.filter((v) => v.precio / prom - 1 <= UMBRAL_ANOMALIA);
		if (malas.length === 0) continue;
		const fechas = malas.map((v) => v.fecha).sort();
		const cants = malas.map((v) => v.cantidad);
		const docs = new Set(malas.map((v) => v.doc).filter(Boolean));
		const peor = Math.min(...malas.map((v) => v.precio));
		anomalias.push({
			nom: f.nom,
			skus: [...f.skus],
			promedio: prom,
			precio: peor,
			delta_pct: Math.round((peor / prom - 1) * 100),
			n: malas.length,
			nDocs: docs.size || 1,
			cantMin: Math.min(...cants),
			cantMax: Math.max(...cants),
			fechaDesde: fechas[0],
			fechaHasta: fechas[fechas.length - 1]
		});
	}
	return anomalias.sort((a, b) => a.delta_pct - b.delta_pct).slice(0, 5);
}
export function historialDeSku(rows, sku) {
	const porDia = new Map();
	for (const r of rows || []) {
		if (String(r.id_articulo) !== String(sku)) continue;
		const k = r.fecha_orig || 's/f';
		let d = porDia.get(k);
		if (!d) {
			d = { fecha: r.fecha_orig, cantidad: 0, monto: 0, precios: new Set(), lineas: 0, docs: new Set(), ncSoles: 0, ncConteo: 0 };
			porDia.set(k, d);
		}
		if (r.tipo_operacion === 'ajuste_valor') {
			d.ncSoles += Math.abs(Number(r.soles) || 0);
			d.ncConteo += 1;
			continue;
		}
		if (r.tipo_operacion && r.tipo_operacion !== 'venta') continue;
		if (!(Number(r.precio_unitario) > 0)) continue;
		d.cantidad += Number(r.cantidad) || 0;
		d.monto += Number(r.precio_unitario) * (Number(r.cantidad) || 0);
		d.precios.add(Number(r.precio_unitario));
		d.lineas += 1;
		const doc = [r.serie_doc, r.nro_doc].filter(Boolean).join('-') || String(r.folio_unico || '');
		if (doc) d.docs.add(doc);
	}
	return [...porDia.values()]
		.filter((d) => d.lineas > 0)
		.map((d) => ({
			fecha: d.fecha,
			cantidad: d.cantidad,
			precio: d.monto / d.cantidad,
			precioMin: Math.min(...d.precios),
			precioMax: Math.max(...d.precios),
			docs: [...d.docs].slice(0, 3),
			nDocs: d.docs.size || d.lineas,
			lineas: d.lineas,
			ncSoles: d.ncSoles,
			ncConteo: d.ncConteo
		}))
		.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}



/**
 * Comparativa por cliente para UN SKU: a cuanto se le vende a cada cliente
 * del vendedor (prom/min/max, ultima cantidad y fecha). Respuesta directa a
 * "Juan 10 soles 10 und, Pepe 10 soles 15 und, Mario 8 soles 250 und":
 * el precio unitario ordena quien paga mas y quien paga menos.
 */
export async function compararClientesPorSku(idVendedor, sku) {
	const params = {
		filters: [
			eq('id_vendedor', idVendedor),
			eq('id_articulo', String(sku))
		],
		select: 'id_cliente,nom_cliente,cantidad,soles,precio_unitario,fecha_orig,tipo_operacion,tpo_doc,serie_doc,nro_doc,folio_unico',
		order: 'fecha_orig.desc,folio_unico.asc'
	};
	let offset = 0;
	const filas = [];
	while (true) {
		const res = await cachedGet('ventas-comparativa', { ...params, offset }, () =>
			postgrestGet('ventas', { ...params, offset })
		);
		if (res.error) return { error: res.error, data: [] };
		const page = res.data || [];
		filas.push(...page.filter((r) => Number(r.precio_unitario) > 0));
		if (page.length < 1000) break;
		offset += 1000;
		if (offset > 10000) break;
	}

	const porCliente = new Map();
	for (const r of filas) {
		let c = porCliente.get(r.id_cliente);
		if (!c) {
			c = { id_cliente: r.id_cliente, nom_cliente: r.nom_cliente || r.id_cliente, ventas: [], undTotal: 0, ncSoles: 0, ncConteo: 0 };
			porCliente.set(r.id_cliente, c);
		}
		if (r.tipo_operacion === 'ajuste_valor') {
			c.ncSoles += Math.abs(Number(r.soles) || 0);
			c.ncConteo += 1;
			continue;
		}
		if (r.tipo_operacion && r.tipo_operacion !== 'venta') continue;
		if (!(Number(r.precio_unitario) > 0)) continue;
		c.ventas.push({
			precio: Number(r.precio_unitario),
			cantidad: Number(r.cantidad) || 0,
			fecha: r.fecha_orig,
			folio: [r.serie_doc, r.nro_doc].filter(Boolean).join('-') || String(r.folio_unico || '')
		});
		c.undTotal += Number(r.cantidad) || 0;
		c.docs = c.docs || new Set();
		const doc = [r.serie_doc, r.nro_doc].filter(Boolean).join('-');
		if (doc) c.docs.add(doc);
	}

	const data = [...porCliente.values()]
		.filter((c) => c.ventas.length > 0)
		.map((c) => {
			const ordenadas = [...c.ventas].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
			const ultimo = ordenadas[0];
			const minVenta = c.ventas.reduce((m, v) => (v.precio < m.precio ? v : m), c.ventas[0]);
			const maxVenta = c.ventas.reduce((m, v) => (v.precio > m.precio ? v : m), c.ventas[0]);
			return {
				id_cliente: c.id_cliente,
				nom_cliente: c.nom_cliente,
				ultimo,
				min: minVenta,
				max: maxVenta,
				prom: c.ventas.reduce((a, v) => a + v.precio, 0) / c.ventas.length,
				undTotal: c.undTotal,
				nVentas: c.ventas.length,
				nDocs: (c.docs && c.docs.size) || c.ventas.length,
				ncSoles: c.ncSoles,
				ncConteo: c.ncConteo
			};
		})
		.sort((a, b) => b.ultimo.precio - a.ultimo.precio);

	return { error: null, data };
}

















