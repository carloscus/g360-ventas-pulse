import { cargarClientesVendedor } from './clientes.js';
import { cargarRadar, priorizarRadar } from './radar.js';
import { getStockMapa, disponibleSku, clasificarStock } from './stock.js';
import { cachedGet } from './cache.js';
import { postgrestGet, eq, gte, lte } from './postgrest.js';
import { fechaISO } from '$lib/utils/format.js';

/**
 * Dashboard del vendedor (agenda comercial del dia).
 * Composicion de datos ya calculados: radar (prioritarios), MV sin filtro
 * de estado (proximos a recompra), stock (argumentos) y ventas 90d vs 90d
 * previos (caidas).
 */
export async function cargarDashboard(idVendedor, hoy = new Date()) {
	const resultado = {
		prioritarios: [],
		proximos: [],
		alertasStock: [],
		caidas: [],
		errores: []
	};

	// --- Directorio 180d (clientes activos) ---
	const d180 = new Date(hoy.getTime() - 180 * 86400000);
	const dir = await cargarClientesVendedor(idVendedor, fechaISO(d180), fechaISO(hoy));
	if (dir.error) {
		resultado.errores.push({ seccion: 'directorio', error: dir.error });
		return resultado;
	}
	resultado.source = dir.source;
	const ids = [...new Set((dir.data || []).map((x) => x.id_cliente))];
	const nomVendedor = dir.data?.find((x) => x.nom_vendedor)?.nom_vendedor || '';
	resultado.nomVendedor = nomVendedor;

	// --- Prioritarios: top radar ---
	const radar = await cargarRadar(ids, ids);
	if (radar.error) {
		resultado.errores.push({ seccion: 'radar', error: radar.error });
	} else {
		const priorizados = priorizarRadar(radar.data);
		resultado.prioritarios = priorizados.slice(0, 5);

		}

	// --- Paralelo: stock + proximos + caidas (independientes entre si) ---
	const [stockRes, proxRes, caidasRes] = await Promise.allSettled([
		getStockMapa(),
		cargarProximos(ids, hoy),
		cargarCaidas(idVendedor, ids, hoy)
	]);

	// Alertas de stock sobre los productos prioritarios
	if (stockRes.status === 'fulfilled' && stockRes.value.mapa) {
		const stockMapa = stockRes.value.mapa;
		const alertas = [];
		for (const c of resultado.prioritarios) {
			for (const p of c.productos.slice(0, 2)) {
				let mejor = null;
				for (const sku of p.skuList || []) {
					const d = disponibleSku(stockMapa, sku);
					if (d !== null && (mejor === null || d > mejor)) mejor = d;
				}
				if (mejor !== null) {
					alertas.push({
						cliente: c.nom_cliente,
						id_cliente: c.id_cliente,
						producto: p.nom,
						disponible: mejor,
						clase: clasificarStock(mejor)
					});
				}
			}
		}
		resultado.alertasStock = alertas.slice(0, 6);
	} else if (stockRes.status === 'rejected') {
		resultado.errores.push({ seccion: 'stock', error: stockRes.reason });
	}

	resultado.proximos = proxRes.status === 'fulfilled' ? proxRes.value : [];
	resultado.caidas = caidasRes.status === 'fulfilled' ? caidasRes.value : [];
	if (proxRes.status === 'rejected') resultado.errores.push({ seccion: 'proximos', error: proxRes.reason });
	if (caidasRes.status === 'rejected') resultado.errores.push({ seccion: 'caidas', error: caidasRes.reason });

	return resultado;
}

const PROX_SELECT = 'id_cliente,nom_cliente,id_articulo,nom_articulo,nom_linea,n_compras,ultima_compra,dias_cadencia,dias_silencio,cadencia_efectiva,estado_oportunidad';

async function cargarProximos(idsClientes, hoy) {
	if (!idsClientes.length) return [];
	const todas = [];
	for (let i = 0; i < idsClientes.length; i += 200) {
		const chunk = idsClientes.slice(i, i + 200);
		const params = { filters: [], select: PROX_SELECT };
		const res = await cachedGet('vw_radar_proximos', { chunk: chunk.join(',') }, () =>
			postgrestGet('vw_radar_recompra', {
				filters: [`id_cliente=in.(${chunk.join(',')})`, 'estado_oportunidad=eq.OK'],
				select: PROX_SELECT
			})
		);
		if (!res.error) todas.push(...(res.data || []));
	}
	const vistos = new Map();
	for (const r of todas) {
		if ((r.n_compras || 0) < 3) continue;
		const cad = Number(r.cadencia_efectiva) || 0;
		if (cad <= 0) continue;
		const ratio = (r.dias_silencio || 0) / cad;
		if (ratio < 0.8 || ratio > 1.0) continue;
		const k = `${r.id_cliente}|${r.id_articulo}`;
		if (!vistos.has(k)) vistos.set(k, r);
	}
	// Agrupar por cliente: max 2 SKUs por cliente, max 5 clientes
	const porCliente = new Map();
	for (const r of vistos.values()) {
		let c = porCliente.get(r.id_cliente);
		if (!c) {
			c = { id_cliente: r.id_cliente, nom_cliente: r.nom_cliente || r.id_cliente, skus: [] };
			porCliente.set(r.id_cliente, c);
		}
		if (c.skus.length < 2) {
			c.skus.push({
				nom: r.nom_articulo,
				linea: r.nom_linea,
				silencio: r.dias_silencio,
				cadencia: r.cadencia_efectiva,
				faltan: Math.max(Math.round(cadFinal(r) - r.dias_silencio), 0)
			});
		}
	}
	return [...porCliente.values()].slice(0, 5);
}

function cadFinal(r) {
	return Number(r.cadencia_efectiva) || 0;
}

const CAIDA_SELECT = 'id_cliente,nom_cliente,soles';

async function cargarCaidas(idVendedor, idsActivos, hoy) {
	if (!idsActivos.length) return [];
	const finA = hoy;
	const inicioA = new Date(hoy.getTime() - 90 * 86400000);
	const finB = new Date(inicioA.getTime() - 86400000);
	const inicioB = new Date(finB.getTime() - 89 * 86400000);

	async function periodo(desde, hasta) {
		const mapa = new Map();
		let offset = 0;
		while (true) {
			const params = {
				filters: [eq('id_vendedor', idVendedor), gte('fecha_orig', fechaISO(desde)), lte('fecha_orig', fechaISO(hasta)), 'tipo_operacion=eq.venta'],
				select: CAIDA_SELECT,
				order: 'folio_unico.asc,id.asc',
				limit: 1000
			};
			const res = await cachedGet('ventas-caida', { ...params, offset }, () =>
				postgrestGet('ventas', { ...params, offset })
			);
			if (res.error) break;
			const page = res.data || [];
			for (const x of page) {
				mapa.set(x.id_cliente, (mapa.get(x.id_cliente) || 0) + (Number(x.soles) || 0));
			}
			if (page.length < 1000) break;
			offset += 1000;
		}
		return mapa;
	}

	const [actual, anterior] = await Promise.all([periodo(inicioA, finA), periodo(inicioB, finB)]);
	const activos = new Set(idsActivos);
	const caidas = [];
	for (const [id, solesA] of actual.entries()) {
		if (!activos.has(id)) continue;
		const solesB = anterior.get(id) || 0;
		if (solesB <= 0) continue;
		const ratio = solesA / solesB;
		if (ratio < 0.5) {
			caidas.push({ id_cliente: id, soles_actual: solesA, soles_anterior: solesB, caida_pct: Math.round((1 - ratio) * 100) });
		}
	}
	return caidas.sort((a, b) => b.caida_pct - a.caida_pct).slice(0, 5);
}





