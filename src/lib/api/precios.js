import { postgrestGet, eq } from './postgrest.js';
import { cachedGet } from './cache.js';

const UMBRAL_ANOMALIA = -0.15;
const MIN_VENTAS = 3;
const SELECT = 'id_articulo,nom_articulo,cantidad,soles,precio_unitario,fecha_orig,mes_ref,tipo_operacion,tpo_doc,serie_doc,nro_doc,folio_unico';

/**
 * Historial completo de precios del cliente (4 anios, ventas con precio > 0).
 * Cacheado por cliente; usado por el analisis anual y las anomalias.
 */
export async function cargarHistorialPrecios(idCliente) {
	const params = {
		filters: [eq('id_cliente', idCliente), eq('tipo_operacion', 'venta')],
		select: SELECT,
		order: 'id_articulo.asc,fecha_orig.desc,folio_unico.asc'
	};
	let offset = 0;
	const todas = [];
	while (true) {
		const res = await cachedGet('vw_historial_precios', { ...params, offset }, () =>
			postgrestGet('vw_historial_venta_cliente', { ...params, offset })
		);
		if (res.error) return { error: res.error, data: [] };
		const page = res.data || [];
		todas.push(...page.filter((r) => Number(r.precio_unitario) > 0));
		if (page.length < 1000) break;
		offset += 1000;
		if (offset > 20000) break;
	}
	return { error: null, data: todas };
}

/**
 * Agregacion anual por SKU: prom/min/max por anio + variacion % del ultimo
 * anio vs anterior. Solo SKUs con >= MIN_VENTAS ventas en el periodo.
 */
export function analisisAnual(rows, topSkus = null) {
	const porSku = new Map();
	for (const r of rows || []) {
		const sku = String(r.id_articulo);
		let f = porSku.get(sku);
		if (!f) {
			f = { sku, nom: r.nom_articulo || sku, ventas: [] };
			porSku.set(sku, f);
		}
		f.ventas.push({ precio: Number(r.precio_unitario), cantidad: Number(r.cantidad) || 0, fecha: r.fecha_orig });
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
			porAnio.get(anio).push(v.precio);
		}
		if (porAnio.size === 0) continue;

		// Solo los ultimos 3 anios con datos: actual vs anterior vs antepenultimo
		const anios = [...porAnio.keys()].sort().slice(-3);
		const resumenAnios = anios.map((a) => {
			const precios = porAnio.get(a);
			return {
				anio: a,
				prom: precios.reduce((x, y) => x + y, 0) / precios.length,
				min: Math.min(...precios),
				max: Math.max(...precios),
				n: precios.length
			};
		});

		// Variacion % entre cada par consecutivo (ej: 2025->2026 y 2024->2025)
		const variaciones = [];
		for (let i = 1; i < resumenAnios.length; i++) {
			const prev = resumenAnios[i - 1];
			const act = resumenAnios[i];
			if (prev.prom > 0) {
				variaciones.push({ de: prev.anio, a: act.anio, pct: (act.prom - prev.prom) / prev.prom });
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
export function detectarAnomalias(rows, topSkus = null) {
	const porSku = new Map();
	for (const r of rows || []) {
		const sku = String(r.id_articulo);
		if (topSkus && !topSkus.has(sku)) continue;
		let f = porSku.get(sku);
		if (!f) {
			f = { sku, nom: r.nom_articulo || sku, precios: [] };
			porSku.set(sku, f);
		}
		const p = Number(r.precio_unitario);
		if (p > 0) f.precios.push({ precio: p, cantidad: Number(r.cantidad) || 0, fecha: r.fecha_orig });
	}

	const anomalias = [];
	for (const f of porSku.values()) {
		if (f.precios.length < MIN_VENTAS) continue;
		const prom = f.precios.reduce((a, b) => a + b.precio, 0) / f.precios.length;
		if (prom <= 0) continue;
		const malas = f.precios.filter((v) => v.precio / prom - 1 <= UMBRAL_ANOMALIA);
		if (malas.length === 0) continue;
		const fechas = malas.map((v) => v.fecha).sort();
		const cants = malas.map((v) => v.cantidad);
		anomalias.push({
			sku: f.sku,
			nom: f.nom,
			promedio: prom,
			precio: Math.min(...cants.length ? malas.map((v) => v.precio) : [0]),
			delta_pct: Math.round((Math.min(...malas.map((v) => v.precio)) / prom - 1) * 100),
			n: malas.length,
			cantMin: Math.min(...cants),
			cantMax: Math.max(...cants),
			fechaDesde: fechas[0],
			fechaHasta: fechas[fechas.length - 1]
		});
	}
	return anomalias.sort((a, b) => a.delta_pct - b.delta_pct).slice(0, 5);
}

/**
 * Historial detallado de un SKU (progressive disclosure), agrupado por fecha:
 * el mismo dia fracciona en varias facturas (ej. campana de lanzamiento con
 * 21 facturas de 100 und en 3 dias) -> 1 linea por dia con totales.
 */
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
			postgrestGet('vw_historial_venta_cliente', { ...params, offset })
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






