import { postgrestGet, eq, gte, lte } from './postgrest.js';
import { cachedGet } from './cache.js';

const SELECT = 'id_cliente,nom_cliente,id_linea,nom_linea,id_articulo,nom_articulo,soles';
const PAGE_SIZE = 1000;

/** Resta n anios a una fecha ISO (29-feb cae a 28-feb; aceptado en design.md). */
export function desplazarAnio(fechaIso, anios) {
	const d = new Date(`${fechaIso}T00:00:00`);
	d.setFullYear(d.getFullYear() - anios);
	return d.toISOString().slice(0, 10);
}

async function fetchPeriodo(idVendedor, desde, hasta) {
	const params = {
		filters: [eq('id_vendedor', idVendedor), gte('fecha_orig', desde), lte('fecha_orig', hasta)],
		select: SELECT,
		order: 'folio_unico.asc',
		limit: PAGE_SIZE
	};
	let offset = 0;
	const todas = [];
	let source = 'network';
	while (true) {
		const res = await cachedGet('ventas-netos', { ...params, offset }, () =>
			postgrestGet('ventas', { ...params, offset })
		);
		if (res.error) return { error: res.error, data: [] };
		source = res.source;
		const page = res.data || [];
		todas.push(...page);
		if (page.length < PAGE_SIZE) break;
		offset += PAGE_SIZE;
		if (offset > 20000) break;
	}
	return { error: null, data: todas, source };
}

function variacion(a, b) {
	if (!b || b === 0) return null;
	return (a - b) / Math.abs(b);
}

/**
 * Montos netos (suma de soles con signos del ERP: venta +, NC -, devolucion -)
 * en 3 periodos alineados: A = rango, B = A-1anio, C = A-2anios.
 * Arbol cliente -> linea -> sku ordenado por neto A desc.
 */
export async function cargarNetos(idVendedor, desde, hasta) {
	const desdeB = desplazarAnio(desde, 1);
	const hastaB = desplazarAnio(hasta, 1);
	const desdeC = desplazarAnio(desde, 2);
	const hastaC = desplazarAnio(hasta, 2);

	const [ra, rb, rc] = await Promise.allSettled([
		fetchPeriodo(idVendedor, desde, hasta),
		fetchPeriodo(idVendedor, desdeB, hastaB),
		fetchPeriodo(idVendedor, desdeC, hastaC)
	]);

	if (ra.status === 'rejected' || ra.value.error) {
		return { error: ra.status === 'rejected' ? ra.reason : ra.value.error, clientes: [] };
	}

	const nodos = new Map();
	let fuente = ra.value.source;
	if (rb.status === 'fulfilled' && !rb.value.error) fuente = rb.value.source;
	if (rc.status === 'fulfilled' && !rc.value.error) fuente = rc.value.source;

	function sumarYPropagar(rows, campo) {
		for (const r of rows || []) {
			const v = Number(r.soles) || 0;
			let cli = nodos.get(r.id_cliente);
			if (!cli) {
				cli = { id_cliente: r.id_cliente, nom_cliente: r.nom_cliente || r.id_cliente, a: 0, b: 0, c: 0, lineas: new Map() };
				nodos.set(r.id_cliente, cli);
			}
			cli[campo] += v;
			if (!r.id_linea) continue;
			let lin = cli.lineas.get(r.id_linea);
			if (!lin) {
				lin = { id_linea: r.id_linea, nom_linea: r.nom_linea || r.id_linea, a: 0, b: 0, c: 0, skus: new Map() };
				cli.lineas.set(r.id_linea, lin);
			}
			lin[campo] += v;
			if (!r.id_articulo) continue;
			let sk = lin.skus.get(r.id_articulo);
			if (!sk) {
				sk = { sku: r.id_articulo, nom: r.nom_articulo || r.id_articulo, a: 0, b: 0, c: 0 };
				lin.skus.set(r.id_articulo, sk);
			}
			sk[campo] += v;
		}
	}

	sumarYPropagar(ra.value.data, 'a');
	if (rb.status === 'fulfilled' && !rb.value.error) sumarYPropagar(rb.value.data, 'b');
	if (rc.status === 'fulfilled' && !rc.value.error) sumarYPropagar(rc.value.data, 'c');

	function ordenarPorA(map) {
		return [...map.values()].sort((x, y) => y.a - x.a || y.b - x.b);
	}

	const clientes = ordenarPorA(nodos).map((cli) => ({
		...cli,
		variacion: variacion(cli.a, cli.b),
		lineas: ordenarPorA(cli.lineas).map((lin) => ({
			...lin,
			variacion: variacion(lin.a, lin.b),
			skus: ordenarPorA(lin.skus).map((sk) => ({ ...sk, variacion: variacion(sk.a, sk.b) }))
		}))
	}));

	return {
		error: null,
		clientes,
		source: fuente,
		periodos: { a: { desde, hasta }, b: { desde: desdeB, hasta: hastaB }, c: { desde: desdeC, hasta: hastaC } }
	};
}
