import { postgrestGet, eq, gte, lte } from './postgrest.js';
import { cachedGet } from './cache.js';

const PAGE_SIZE = 1000;
const SELECT = 'id_vendedor,id_cliente,id_linea,nom_linea,id_articulo,nom_articulo,cantidad,soles,fecha_orig,mes_ref,tipo_operacion';

function desplazarAnio(fechaIso, anios) {
	const d = new Date(`${fechaIso}T00:00:00`);
	d.setFullYear(d.getFullYear() - anios);
	return d.toISOString().slice(0, 10);
}

function mesCerrado(n) {
	const hoy = new Date();
	const d = new Date(hoy.getFullYear(), hoy.getMonth() - n, 1);
	const h = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
	return [d.toISOString().slice(0, 10), h.toISOString().slice(0, 10)];
}

async function fetchProductos(idVendedor, desde, hasta, force = false) {
	let offset = 0;
	const filas = [];
	let fuente = 'network';
	let error = null;
	while (true) {
		const res = await cachedGet('productos', { filters: [eq('id_vendedor', idVendedor), gte('fecha_orig', desde), lte('fecha_orig', hasta)], select: SELECT, limit: PAGE_SIZE, offset }, () =>
			postgrestGet('ventas', { filters: [eq('id_vendedor', idVendedor), gte('fecha_orig', desde), lte('fecha_orig', hasta)], select: SELECT, limit: PAGE_SIZE, offset })
		, { force });
		if (res.error) { error = res.error; break; }
		fuente = res.source;
		filas.push(...(res.data || []));
		if ((res.data || []).length < PAGE_SIZE) break;
		offset += PAGE_SIZE;
		if (offset > 20000) break;
	}
	return { error, data: filas, source: fuente };
}

function variacion(a, b) {
	if (!b || b === 0) return null;
	return (a - b) / Math.abs(b);
}

/**
 * Top SKUs del vendedor en período A, con comparativo B y C.
 * Agrupado por SKU agregando todos los clientes del vendedor.
 */
export async function cargarTopSkus(idVendedor, force = false) {
	const hoy = new Date();
	const desdeA = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
	const hastaA = hoy.toISOString().slice(0, 10);
	const desdeB = desplazarAnio(desdeA, 1);
	const hastaB = desplazarAnio(hastaA, 1);
	const desdeC = desplazarAnio(desdeA, 2);
	const hastaC = desplazarAnio(hastaA, 2);

	const [ra, rb, rc] = await Promise.allSettled([
		fetchProductos(idVendedor, desdeA, hastaA, force),
		fetchProductos(idVendedor, desdeB, hastaB, force),
		fetchProductos(idVendedor, desdeC, hastaC, force)
	]);

	if (ra.status === 'rejected' || ra.value.error) {
		return { error: ra.status === 'rejected' ? ra.reason : ra.value.error, skus: [] };
	}

	const skusMap = new Map();

	function sumar(rows, campo) {
		for (const r of rows || []) {
			if (r.tipo_operacion !== 'venta') continue;
			const qty = Number(r.cantidad) || 0;
			const soles = Number(r.soles) || 0;
			if (!qty && !soles) continue;
			const key = r.id_articulo;
			let s = skusMap.get(key);
			if (!s) {
				s = {
					sku: key,
					nom: r.nom_articulo || key,
					linea: r.id_linea,
					nomLinea: r.nom_linea || r.id_linea,
					qtyA: 0, qtyB: 0, qtyC: 0,
					solesA: 0, solesB: 0, solesC: 0
				};
				skusMap.set(key, s);
			}
			s[campo === 'a' ? 'qtyA' : campo === 'b' ? 'qtyB' : 'qtyC'] += qty;
			s['soles' + campo.toUpperCase()] += soles;
		}
	}

	sumar(ra.value.data, 'a');
	if (rb.status === 'fulfilled' && !rb.value.error) sumar(rb.value.data, 'b');
	if (rc.status === 'fulfilled' && !rc.value.error) sumar(rc.value.data, 'c');

	const skus = [...skusMap.values()]
		.filter(s => s.solesA > 0)
		.sort((a, b) => b.solesA - a.solesA)
		.slice(0, 20)
		.map(s => ({
			...s,
			varSolesA_B: variacion(s.solesA, s.solesB),
			varSolesB_C: variacion(s.solesB, s.solesC),
			varQtyA_B: variacion(s.qtyA, s.qtyB)
		}));

	return { error: null, skus };
}

/**
 * Tendencia mensual (últimos 12 meses) por línea: cantidades y soles.
 * Agrupa ventas del vendedor por mes_ref e id_linea.
 */
export async function cargarTendenciaLineas(idVendedor, force = false) {
	const hoy = new Date();
	const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 12, 1).toISOString().slice(0, 10);
	const hasta = hoy.toISOString().slice(0, 10);

	const res = await fetchProductos(idVendedor, desde, hasta, force);
	if (res.error) return { error: res.error, lineas: [] };

	const porLineaMes = new Map();
	for (const r of res.data || []) {
		if (r.tipo_operacion !== 'venta') continue;
		const mes = (r.mes_ref || '').slice(0, 7);
		if (!mes) continue;
		const key = `${r.id_linea}|${mes}`;
		let p = porLineaMes.get(key);
		if (!p) {
			p = { linea: r.id_linea, nomLinea: r.nom_linea || r.id_linea, mes, cantidad: 0, soles: 0 };
			porLineaMes.set(key, p);
		}
		p.cantidad += Number(r.cantidad) || 0;
		p.soles += Number(r.soles) || 0;
	}

	const lineas = [...porLineaMes.values()].sort((a, b) => a.mes.localeCompare(b.mes));
	return { error: null, lineas };
}
