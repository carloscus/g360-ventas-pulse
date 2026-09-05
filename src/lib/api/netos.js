import { postgrestGet, eq, gte, lte } from './postgrest.js';
import { cachedGet } from './cache.js';

const SELECT = 'id_cliente,nom_cliente,id_linea,nom_linea,id_articulo,nom_articulo,soles,fecha_orig';
const PAGE_SIZE = 1000;
const HUELLA_KEY = 'vp_netos_huella';

/** Resta n anios a una fecha ISO (29-feb cae a 28-feb; aceptado en design.md). */
export function desplazarAnio(fechaIso, anios) {
	const d = new Date(`${fechaIso}T00:00:00`);
	d.setFullYear(d.getFullYear() - anios);
	return d.toISOString().slice(0, 10);
}

async function fetchSlice(idVendedor, desde, hasta, { force = false } = {}) {
	const params = {
		filters: [eq('id_vendedor', idVendedor), gte('fecha_orig', desde), lte('fecha_orig', hasta)],
		select: SELECT,
		order: 'fecha_orig.asc,folio_unico.asc,id.asc',
		limit: PAGE_SIZE
	};
	let offset = 0;
	const filas = [];
	let source = 'network';
	let error = null;
	while (true) {
		const res = await cachedGet('ventas-netos', { ...params, offset }, () =>
			postgrestGet('ventas', { ...params, offset })
		, { force });
		if (res.error) {
			error = res.error;
			break;
		}
		source = res.source;
		const page = res.data || [];
		filas.push(...page);
		if (page.length < PAGE_SIZE) break;
		offset += PAGE_SIZE;
		if (offset > 20000) break;
	}
	return { filas, source, error };
}

/** Divide [desde, hasta] en rebanadas mensuales (evita ordenar rangos largos). */
export function rebanadasMes(desde, hasta) {
	const out = [];
	let cur = new Date(`${desde}T00:00:00`);
	const fin = new Date(`${hasta}T00:00:00`);
	while (cur <= fin) {
		const siguiente = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
		const finSlice = new Date(Math.min(siguiente.getTime() - 86400000, fin.getTime()));
		out.push([cur.toISOString().slice(0, 10), finSlice.toISOString().slice(0, 10)]);
		cur = siguiente;
	}
	return out;
}

async function fetchPeriodo(idVendedor, desde, hasta, { force = false } = {}) {
	const slices = rebanadasMes(desde, hasta);
	const resultados = await Promise.all(slices.map(([s, e]) => fetchSlice(idVendedor, s, e, { force })));
	const todas = [];
	let source = 'network';
	let error = null;
	let incompleto = false;
	for (const r of resultados) {
		if (r.error) {
			incompleto = true;
			error = error || r.error;
			continue;
		}
		source = r.source;
		todas.push(...r.filas);
	}
	// Si el periodo completo fallo pero hay rebanadas ok, seguimos parciales
	if (todas.length === 0 && error) return { error, data: [], incompleto: true };
	return { error: null, data: todas, source, incompleto };
}

function variacion(a, b) {
	if (!b || b === 0) return null;
	return (a - b) / Math.abs(b);
}

/**
 * Huella de datos del periodo A: {n, sum, min, max} calculada de las filas ya
 * descargadas (0 requests extra). Permite al UI avisar "sin cambios" en un
 * refresh y mostrar la fecha de corte "Datos al {max}".
 * Nota: detecta movimiento del dataset, no datos mal cargados — la señal
 * canonica de sincronizacion sera synced_at de g360-ventas-db.
 */
function huella(filas) {
	let sum = 0;
	let min = null;
	let max = null;
	for (const r of filas || []) {
		sum += Number(r.soles) || 0;
		const f = r.fecha_orig || '';
		if (f) {
			if (min === null || f < min) min = f;
			if (max === null || f > max) max = f;
		}
	}
	return { n: (filas || []).length, sum: Math.round(sum * 100) / 100, min, max };
}

export function huellasIguales(a, b) {
	if (!a || !b) return false;
	return a.n === b.n && a.sum === b.sum && a.min === b.min && a.max === b.max;
}

export function leerHuella(idVendedor, desde, hasta) {
	try {
		return JSON.parse(sessionStorage.getItem(`${HUELLA_KEY}_${idVendedor}_${desde}_${hasta}`) || 'null');
	} catch {
		return null;
	}
}

export function guardarHuella(idVendedor, desde, hasta, h) {
	try {
		sessionStorage.setItem(`${HUELLA_KEY}_${idVendedor}_${desde}_${hasta}`, JSON.stringify(h));
	} catch {
		/* sessionStorage lleno o bloqueado: la huella es opcional */
	}
}

/**
 * Montos netos (suma de soles con signos del ERP: venta +, NC -, devolucion -)
 * en 3 periodos alineados: A = rango, B = A-1anio, C = A-2anios.
 * Arbol cliente -> linea -> sku ordenado por neto A desc.
 */
export async function cargarNetos(idVendedor, desde, hasta, { force = false } = {}) {
	const desdeB = desplazarAnio(desde, 1);
	const hastaB = desplazarAnio(hasta, 1);
	const desdeC = desplazarAnio(desde, 2);
	const hastaC = desplazarAnio(hasta, 2);

	const [ra, rb, rc] = await Promise.allSettled([
		fetchPeriodo(idVendedor, desde, hasta, { force }),
		fetchPeriodo(idVendedor, desdeB, hastaB, { force }),
		fetchPeriodo(idVendedor, desdeC, hastaC, { force })
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
		huella: huella(ra.value.data),
		incompleto: {
			a: ra.value.incompleto === true,
			b: rb.status === 'fulfilled' ? rb.value.incompleto === true : true,
			c: rc.status === 'fulfilled' ? rc.value.incompleto === true : true
		},
		periodos: { a: { desde, hasta }, b: { desde: desdeB, hasta: hastaB }, c: { desde: desdeC, hasta: hastaC } }
	};
}



