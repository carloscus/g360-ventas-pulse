import { cachedGet } from './cache.js';
import { postgrestGet, inList } from './postgrest.js';

const PAGE_SIZE = 1000;
const SELECT = 'id_cliente,nom_cliente,id_articulo,nom_articulo,nom_linea,n_compras,ultima_compra,dias_cadencia,precio_promedio,und_por_dia,dias_silencio,cadencia_efectiva,estado_oportunidad';
const UMBRAL_SILENCIO = 730;
const DIAS_CLIENTE_ACTIVO = 180;
const MIN_COMPRAS = 3;

/**
 * Radar de recompra del vendedor. Consulta la MV acotada por los clientes del
 * directorio (in. por chunks) y aplica filtros de calidad en el app.
 * Devuelve clientes con oportunidades priorizadas por valor estimado.
 */
export async function cargarRadar(idsClientes, idsActivos, { force = false } = {}) {
	if (!idsClientes || idsClientes.length === 0) {
		return { data: [], source: 'network', error: null };
	}
	// idsActivos: clientes con compra en los ultimos 180 dias (del directorio,
	// fuente confiable). Si no se pasan, se derivan del propio conjunto (menos preciso).

	const todas = [];
	let source = 'network';
	for (let i = 0; i < idsClientes.length; i += 200) {
		const chunk = idsClientes.slice(i, i + 200);
		const params = {
			filters: [inList('id_cliente', chunk), 'estado_oportunidad=eq.VENCIDO'],
			select: SELECT,
			order: 'dias_silencio.desc,id_cliente.asc,id_articulo.asc'
		};
		let offset = 0;
		while (true) {
			const res = await cachedGet(
				'vw_radar_recompra',
				{ ...params, offset },
				() => postgrestGet('vw_radar_recompra', { ...params, offset }),
				{ force }
			);
			if (res.error) return { error: res.error, source: res.source, data: [] };
			source = res.source;
			const pagina = res.data || [];
			todas.push(...pagina);
			if (pagina.length < PAGE_SIZE) break;
			offset += PAGE_SIZE;
			if (offset > 20000) break;
		}
	}

	return { data: aplicarFiltrosCalidad(todas, idsActivos), source, error: null };
}

/**
 * Filtros de calidad (design.md #1):
 * - n_compras >= 3 (cadencia confiable)
 * - silencio <= 730 dias
 * - cliente activo: ultima compra de CUALQUIER SKU < 180 dias
 */
export function aplicarFiltrosCalidad(rows, idsActivos) {
	// Activos: preferir la lista del directorio (compra en los ultimos 180 dias
	// de CUALQUIER tipo_operacion). Fallback: derivar de ultima_compra del radar.
	let activos;
	if (idsActivos && idsActivos.length > 0) {
		activos = new Set(idsActivos);
	} else {
		const hoy = new Date().toISOString().slice(0, 10);
		const ultimaPorCliente = new Map();
		for (const r of rows) {
			const prev = ultimaPorCliente.get(r.id_cliente) || '';
			if (r.ultima_compra > prev) ultimaPorCliente.set(r.id_cliente, r.ultima_compra);
		}
		activos = new Set();
		for (const [id, ultima] of ultimaPorCliente.entries()) {
			const dias = Math.round((new Date(hoy) - new Date(ultima)) / 86400000);
			if (dias < DIAS_CLIENTE_ACTIVO) activos.add(id);
		}
	}

	return rows.filter((r) =>
		r.n_compras >= MIN_COMPRAS &&
		Number(r.cadencia_efectiva) > 0 &&
		r.dias_silencio <= UMBRAL_SILENCIO &&
		activos.has(r.id_cliente)
	);
}

/**
 * Prioriza por valor estimado (design.md #3):
 * valor = precio_promedio x und_por_dia x max(silencio - cadencia, 0)
 * Devuelve clientes: { id_cliente, nom_cliente, valorTotal, skus: [...] }
 */
/**
 * Adjunta stock a clientes ya priorizados (sin re-agrupar) y reordena
 * productos con-stock-primero a igual valor.
 */
export function adjuntarStock(clientes, stockMapa, disponibleSkuFn) {
	if (!stockMapa || !disponibleSkuFn) return clientes;
	for (const c of clientes) {
		for (const p of c.productos) {
			let mejor = null;
			for (const sku of p.skuList || []) {
				const d = disponibleSkuFn(stockMapa, sku);
				if (d !== null && (mejor === null || d > mejor)) mejor = d;
			}
			p.stock = mejor;
		}
		c.productos.sort((a, b) => {
			const ka = a.stock === null ? 1 : 0;
			const kb = b.stock === null ? 1 : 0;
			if (ka !== kb) return ka - kb;
			return b.valor - a.valor;
		});
	}
	return clientes;
}

const MAX_UND_POR_DIA = 10;
const MAX_EXCESO_DIAS = 90;

export function priorizarRadar(rows, stockMapa = null, disponibleSku = null) {
	const porCliente = new Map();
	for (const r of rows) {
		let c = porCliente.get(r.id_cliente);
		if (!c) {
			c = { id_cliente: r.id_cliente, nom_cliente: r.nom_cliente || r.id_cliente, valorTotal: 0, skus: [], productos: [] };
			porCliente.set(r.id_cliente, c);
		}
		r.cadencia_num = Number(r.cadencia_efectiva) || 0;
		r.und_dia_raw = Number(r.und_por_dia) || 0;
		c.skus.push(r);
	}

	const clientes = [...porCliente.values()];
	for (const c of clientes) {
		c.skus.sort((a, b) => b.und_dia_raw - a.und_dia_raw);
		// Valor por PRODUCTO: variantes (colores/presentaciones) comparten nombre.
		// silencio = min (ultima vez que se compro el producto); cadencia = min
		// positiva; und/dia = suma de variantes topada una sola vez; precio promedio.
		const porNombre = new Map();
		// Base de producto: recorta sufijos de presentacion (EST X 12, X 24,
		// X12 UND, 250 ML, #5...) para agrupar presentaciones del mismo producto.
		const claveNombre = (n) => String(n || '').trim().toUpperCase().replace(/\s+/g, ' ')
			.replace(/\s*(EST\s*X\s*\d+|X\s*\d+\s*(UND|UNIDADES)?|#\d+(\.\d+)?|\d+\s*(ML|CM|MM))\s*$/g, '')
			.trim().replace(/\s+$/,'')
			.replace(/(\s+X\s*\d+)+\s*$/,'')
			.trim() || String(n || '').trim().toUpperCase();
		for (const s of c.skus) {
			const clave = claveNombre(s.nom_articulo);
			let p = porNombre.get(clave);
			if (!p) {
				const base = claveNombre(s.nom_articulo).replace(/[-\s]+$/,'').trim();
				p = { nom: base || String(s.nom_articulo).trim().replace(/\s+/g, ' '), linea: s.nom_linea, variantes: 0, undDia: 0, precioSum: 0, silencio: Infinity, cadencia: Infinity };
				porNombre.set(clave, p);
			}
			p.variantes++;
			p.undDia += s.und_dia_raw;
			p.precioSum += Number(s.precio_promedio) || 0;
			if (s.dias_silencio < p.silencio) p.silencio = s.dias_silencio;
			if (s.cadencia_num > 0 && s.cadencia_num < p.cadencia) p.cadencia = s.cadencia_num;
			(p.skuList = p.skuList || []).push(s.id_articulo);
		}
		c.productos = [];
		for (const p of porNombre.values()) {
			p.undDia = Math.min(p.undDia, MAX_UND_POR_DIA);
			const precio = p.precioSum / p.variantes;
			const exceso = Math.min(Math.max(p.silencio - p.cadencia, 0), MAX_EXCESO_DIAS);
			p.valor = precio * p.undDia * exceso;
			c.productos.push(p);
		}
		c.productos.sort((a, b) => b.valor - a.valor);
		if (stockMapa && disponibleSku) {
			for (const p of c.productos) {
				let mejor = null;
				for (const sku of p.skuList || []) {
					const d = disponibleSku(stockMapa, sku);
					if (d !== null && (mejor === null || d > mejor)) mejor = d;
				}
				p.stock = mejor;
			}
			c.productos.sort((a, b) => {
				const ka = a.stock === null ? 1 : 0;
				const kb = b.stock === null ? 1 : 0;
				if (ka !== kb) return ka - kb;
				return b.valor - a.valor;
			});
		}
		c.valorTotal = c.productos.reduce((a, p) => a + p.valor, 0);
	}
	return clientes.sort((a, b) => b.valorTotal - a.valorTotal);
}













/**
 * Filas crudas de la MV radar para los clientes dados (chunks), con filtro
 * opcional de lineas (nom_linea in). Usado por cross-sell.
 */
export async function cargarFilasRadar(idsClientes, lineas = null) {
	if (!idsClientes || idsClientes.length === 0) return [];
	const todas = [];
	for (let i = 0; i < idsClientes.length; i += 200) {
		const chunk = idsClientes.slice(i, i + 200);
		const filters = [inList('id_cliente', chunk)];
		if (lineas && lineas.length) filters.push(inList('nom_linea', lineas));
		const params = { filters, select: 'id_cliente,id_articulo,nom_articulo,nom_linea,estado_oportunidad' };
		let offset = 0;
		while (true) {
			const res = await cachedGet(
				'vw_radar_lineas',
				{ ...params, offset },
				() => postgrestGet('vw_radar_recompra', { ...params, offset })
			);
			if (res.error) break;
			const pagina = res.data || [];
			todas.push(...pagina);
			if (pagina.length < 1000) break;
			offset += 1000;
			if (offset > 20000) break;
		}
	}
	return todas;
}

