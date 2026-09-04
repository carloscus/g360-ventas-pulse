import { postgrestGet, eq, gte, lte } from './postgrest.js';
import { cachedGet } from './cache.js';

const SELECT = 'mes_ref,soles,id_cliente,nom_cliente,id_articulo,nom_articulo,tipo_operacion';

async function ventasAnio(idVendedor, anio) {
	const desde = `${anio}-01-01`;
	const hasta = `${anio}-12-31`;
	const params = {
		filters: [eq('id_vendedor', idVendedor), gte('fecha_orig', desde), lte('fecha_orig', hasta), eq('tipo_operacion', 'venta')],
		select: SELECT,
		order: 'folio_unico.asc,id.asc'
	};
	let offset = 0;
	const todas = [];
	while (true) {
		const res = await cachedGet('ventas-resumen', { ...params, offset }, () =>
			postgrestGet('ventas', { ...params, offset })
		);
		if (res.error) return { error: res.error, data: [] };
		const page = res.data || [];
		todas.push(...page);
		if (page.length < 1000) break;
		offset += 1000;
		if (offset > 20000) break;
	}
	return { error: null, data: todas };
}

function agregarMensual(rows) {
	const porMes = new Map();
	for (const r of rows) {
		const m = r.mes_ref || '';
		if (!m) continue;
		porMes.set(m, (porMes.get(m) || 0) + (Number(r.soles) || 0));
	}
	return porMes;
}

function variacion(actual, base) {
	if (!base || base <= 0) return null;
	return (actual - base) / base;
}

/**
 * Resumen "Como voy" del vendedor:
 * - mesActual: {mes, soles} en curso
 * - mesAnterior: {mes, soles} completo previo
 * - mismoMesAnioAnterior: {mes, soles}
 * - variaciones y evolucion 12 meses + tops del anio en curso
 */
export async function cargarResumenVentas(idVendedor, hoy = new Date()) {
	const anio = hoy.getFullYear();
	const anioPrev = anio - 1;
	const res = { evolucion: [], mesActual: null, mesAnterior: null, mismoMesAnioAnterior: null, varVsAnterior: null, varVsAnioAnterior: null, topClientes: [], topProductos: [], errores: [] };

	const [resAct, resPrev] = await Promise.allSettled([ventasAnio(idVendedor, anio), ventasAnio(idVendedor, anioPrev)]);
	if (resAct.status === 'rejected') res.errores.push({ seccion: 'anioActual', error: resAct.reason });
	if (resPrev.status === 'rejected') res.errores.push({ seccion: 'anioPrevio', error: resPrev.reason });

	const rowsAct = resAct.status === 'fulfilled' ? resAct.value.data : [];
	const rowsPrev = resPrev.status === 'fulfilled' ? resPrev.value.data : [];

	const mmAct = agregarMensual(rowsAct);
	const mmPrev = agregarMensual(rowsPrev);

	const mesKey = `${anio}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
	const mesPrevDate = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
	const mesPrevKey = `${mesPrevDate.getFullYear()}-${String(mesPrevDate.getMonth() + 1).padStart(2, '0')}`;
	const mismoMesPrevKey = `${anioPrev}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

	res.mesActual = { mes: mesKey, soles: mmAct.get(mesKey) || 0 };
	res.mesAnterior = { mes: mesPrevKey, soles: mmPrev.get(mesPrevKey) || mmAct.get(mesPrevKey) || 0 };
	res.mismoMesAnioAnterior = { mes: mismoMesPrevKey, soles: mmPrev.get(mismoMesPrevKey) || 0 };
	res.varVsAnterior = variacion(res.mesActual.soles, res.mesAnterior.soles);
	res.varVsAnioAnterior = variacion(res.mesActual.soles, res.mismoMesAnioAnterior.soles);

	// Evolucion 12 meses (del anio en curso, meses con o sin ventas)
	const meses = [];
	for (let m = 1; m <= 12; m++) {
		const k = `${anio}-${String(m).padStart(2, '0')}`;
		meses.push({ mes: k, soles: mmAct.get(k) || 0 });
	}
	res.evolucion = meses;

	// Tops del anio en curso
	const porCliente = new Map();
	const porProducto = new Map();
	for (const r of rowsAct) {
		let c = porCliente.get(r.id_cliente);
		if (!c) { c = { id_cliente: r.id_cliente, nom_cliente: r.nom_cliente || r.id_cliente, soles: 0 }; porCliente.set(r.id_cliente, c); }
		c.soles += Number(r.soles) || 0;
		let p = porProducto.get(r.id_articulo);
		if (!p) { p = { sku: r.id_articulo, nom: r.nom_articulo || r.id_articulo, soles: 0 }; porProducto.set(r.id_articulo, p); }
		p.soles += Number(r.soles) || 0;
	}
	res.topClientes = [...porCliente.values()].sort((a, b) => b.soles - a.soles).slice(0, 5);
	res.topProductos = [...porProducto.values()].sort((a, b) => b.soles - a.soles).slice(0, 5);

	return res;
}


