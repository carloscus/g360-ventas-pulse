import { postgrestGet, eq, gte, lte, inList } from './postgrest.js';
import { cachedGet } from './cache.js';
import { cargarFilasRadar } from './radar.js';
import { getStockMapa, disponibleSku } from './stock.js';

/**
 * Resumen comercial del cliente (plan Asistente Comercial section 10):
 * totales del periodo, top productos, frecuencia de recompra (MV radar),
 * evolucion mensual (mes_ref) y cross-sell (clientes similares).
 */
export async function cargarResumenComercial(idCliente, filasFicha, rowsCrudas, idVendedor, idsClientesVendedor, catalogo) {
	const resumen = {
		totalVentas: 0,
		totalNC: 0,
		totalDevuelto: 0,
		frecuenciaPromedio: null,
		topProductos: [],
		evolucionMensual: [],
		crossSell: []
	};

	// Totales desde las filas ya agregadas de la ficha
	for (const f of filasFicha) {
		resumen.totalVentas += f.vendido_soles || 0;
		resumen.totalNC += f.nc_soles || 0;
		resumen.totalDevuelto += f.devuelto_und || 0;
	}

	// Top 5 productos por ventas del periodo
	resumen.topProductos = [...filasFicha]
		.sort((a, b) => (b.vendido_soles || 0) - (a.vendido_soles || 0))
		.slice(0, 5)
		.map((f) => ({ sku: f.sku, nom: f.nom_articulo, soles: f.vendido_soles, und: f.vendido_und }));

	// Evolucion mensual por mes_ref (filas crudas del historial)
	resumen.evolucionMensual = evolucionMensual(rowsCrudas);

	// Frecuencia: promedio de cadencias del cliente desde la MV radar
	try {
		const filasRadar = await cachedGet(
			'vw_radar_recompra',
			{ cliente: idCliente },
			() => postgrestGet('vw_radar_recompra', {
				filters: [eq('id_cliente', idCliente)],
				select: 'id_cliente,dias_cadencia,cadencia_efectiva,n_compras'
			})
		);
		if (Array.isArray(filasRadar.data)) {
			const cads = filasRadar.data
				.filter((r) => (r.n_compras || 0) >= 3 && Number(r.cadencia_efectiva) > 0)
				.map((r) => Number(r.cadencia_efectiva));
			if (cads.length > 0) {
				resumen.frecuenciaPromedio = Math.round(cads.reduce((a, b) => a + b, 0) / cads.length);
			}
		}
	} catch (e) {
		console.warn('[fichaComercial] frecuencia s/d:', e?.message);
	}

	return resumen;
}

/**
 * Evolucion mensual: barras por mes_ref a partir de las filas crudas.
 * @param {Array} rows filas crudas del historial (con mes_ref, soles)
 */
export function evolucionMensual(rows) {
	const porMes = new Map();
	for (const r of rows || []) {
		if (r.tipo_operacion !== 'venta') continue;
		const mes = r.mes_ref || String(r.fecha_orig || '').slice(0, 7);
		if (!mes) continue;
		porMes.set(mes, (porMes.get(mes) || 0) + (Number(r.soles) || 0));
	}
	if (porMes.size === 0) return [];
	// serie continua: rellena meses sin ventas con 0 (eje honesto)
	const [y0, m0] = [...porMes.keys()].sort()[0].split('-').map(Number);
	const [y1, m1] = [...porMes.keys()].sort().at(-1).split('-').map(Number);
	const out = [];
	let y = y0;
	let m = m0;
	while (y < y1 || (y === y1 && m <= m1)) {
		const k = y + '-' + String(m).padStart(2, '0');
		out.push({ mes: k, soles: porMes.get(k) || 0 });
		m++;
		if (m > 12) { m = 1; y++; }
	}
	return out;
}

/**
 * Cross-sell: SKUs de las lineas donde el cliente compra, que otros clientes
 * del vendedor compran y el activo nunca ha comprado. Top 5 por popularidad.
 */
export async function cargarCrossSell(idCliente, lineasCliente, idsClientesVendedor, skusComprados, stockMapa = null) {
	if (!lineasCliente.length || !idsClientesVendedor.length) return [];
	if (!skusComprados) skusComprados = new Set();

	// Filas de la MV para TODOS los clientes del vendedor en esas lineas
	const filas = await cargarFilasRadar(idsClientesVendedor, lineasCliente);

	const popularidad = new Map();
	for (const r of filas) {
		if (r.id_cliente === idCliente) continue;
		if (skusComprados.has(String(r.id_articulo))) continue;
		const k = `${r.id_articulo}`;
		const p = popularidad.get(k) || { sku: r.id_articulo, nom: r.nom_articulo, linea: r.nom_linea, clientes: new Set() };
		p.clientes.add(r.id_cliente);
		popularidad.set(k, p);
	}

	let lista = [...popularidad.values()].map((p) => ({
		sku: p.sku,
		nom: p.nom,
		linea: p.linea,
		similarCount: p.clientes.size
	}));

	// Stock: excluir sin stock cuando hay snapshot
	if (stockMapa) {
		lista = lista.filter((p) => {
			const d = disponibleSku(stockMapa, p.sku);
			return d === null || d > 0;
		});
	}

	return lista.sort((a, b) => b.similarCount - a.similarCount).slice(0, 5);
}


