import { cachedGet } from './cache.js';
import { postgrestGet, eq, gte, lte } from './postgrest.js';

const PAGE_SIZE = 1000;
const SELECT_CLIENTES = 'id_cliente,nom_cliente,id_vendedor,nom_vendedor,fecha_orig,soles,tipo_operacion';

/**
 * Directorio de clientes del vendedor (tabla ventas, index id_vendedor+id_cliente).
 * La vista historial timeoutea con filtro id_vendedor (LAG no puede empujar el
 * filtro), por eso este path usa la tabla con paginacion.
 */
export async function cargarClientesVendedor(idVendedor, desde, hasta) {
	const res = await _cargarClientes(idVendedor, desde, hasta);
	// Fallback anti-timeout (57014): vendedores masivos con ventana larga.
	// Reintenta con 180 dias y avisa al llamador.
	const msg = String(res.error?.message || res.error || '');
	if (res.error && /57014|timeout/i.test(msg) && desde > new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)) {
		console.warn('[clientes] timeout, reintentando con ventana de 180 dias');
		const res2 = await _cargarClientes(idVendedor, new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10), hasta);
		return { ...res2, periodoAjustado: true };
	}
	return res;
}

async function _cargarClientes(idVendedor, desde, hasta) {
	const filters = [eq('id_vendedor', idVendedor), gte('fecha_orig', desde), lte('fecha_orig', hasta)];
	let offset = 0;
	const todas = [];
	let source = 'network';
	while (true) {
		const params = { filters, select: SELECT_CLIENTES, order: 'folio_unico.asc,id.asc', limit: PAGE_SIZE };
		const res = await cachedGet(
			'ventas',
			{ ...params, offset },
			() => postgrestGet('ventas', { ...params, offset })
		);
		if (res.error) return { error: res.error, source: res.source, data: [] };
		source = res.source;
		const page = res.data || [];
		todas.push(...page);
		if (page.length < PAGE_SIZE) break;
		offset += PAGE_SIZE;
		if (offset > 20000) break;
	}
	return { data: todas, source, error: null };
}

/**
 * Agregacion del directorio: por cliente, ultima compra y monto del periodo
 * (solo tipo_operacion='venta', coherente con la ficha).
 */
export function agruparClientes(rows) {
	const porCliente = new Map();
	let nomVendedor = '';
	for (const r of rows) {
		if (!nomVendedor && r.nom_vendedor) nomVendedor = r.nom_vendedor;
		if (r.tipo_operacion !== 'venta') continue;
		const id = r.id_cliente;
		let c = porCliente.get(id);
		if (!c) {
			c = { id_cliente: id, nom_cliente: r.nom_cliente || id, ultima: '', monto: 0 };
			porCliente.set(id, c);
		}
		c.monto += Number(r.soles) || 0;
		if (!c.ultima || r.fecha_orig > c.ultima) c.ultima = r.fecha_orig;
	}
	return { clientes: [...porCliente.values()].sort((a, b) => b.ultima.localeCompare(a.ultima)), nomVendedor };
}





