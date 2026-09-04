import { cachedGet } from '$lib/api/cache.js';
import { postgrestGet, eq, gte, lte } from '$lib/api/postgrest.js';
import { getCatalogoPorSku } from '$lib/api/catalogo.js';

const SELECT = 'id_articulo,nom_articulo,id_cliente,nom_cliente,id_vendedor,id_linea,nom_linea,tpo_doc,serie_doc,nro_doc,cantidad,soles,precio_unitario,precio_anterior,fecha_anterior,precio_anterior2,tipo_operacion,fecha_orig,mes_ref';

/**
 * Carga el historial del cliente en el periodo y lo agrega por SKU
 * segun contrato DATOS.md seccion 1.
 */
export async function cargarFicha(idCliente, desde, hasta) {
	const params = {
		filters: [
			eq('id_cliente', idCliente),
			gte('fecha_orig', desde),
			lte('fecha_orig', hasta)
		],
		select: SELECT,
		order: 'id_articulo.asc,fecha_orig.desc,folio_unico.asc'
	};
	// PostgREST trunca a 1000 filas por request: paginar con offset
	const PAGE = 1000;
	let offset = 0;
	const todas = [];
	let source = 'network';
	while (true) {
		const res = await cachedGet(
			'vw_historial_venta_cliente',
			{ ...params, offset },
			() => postgrestGet('vw_historial_venta_cliente', { ...params, offset })
		);
		if (res.error) return { error: res.error, source: res.source, filas: [], rows: [] };
		source = res.source;
		const pagina = res.data || [];
		todas.push(...pagina);
		if (pagina.length < PAGE) break;
		offset += PAGE;
		if (offset > 20000) break;
	}

	const catalogo = await getCatalogoPorSku();
	const filas = agregarPorSku(todas, catalogo);
	return { error: null, source, filas, rows: todas };
}

/**
 * Agregacion por SKU (DATOS.md):
 * - venta: suma cantidad/soles; cadena de precios de la fila mas reciente
 * - ajuste_valor (NC descuento): SUM(ABS(soles)) + conteo
 * - devolucion (producto fisico): SUM(ABS(cantidad))
 * - cajas = vendido_und / un_bx (null si el catalogo no define un_bx)
 */
export function agregarPorSku(rows, catalogo) {
	const porSku = new Map();

	for (const r of rows) {
		const sku = String(r.id_articulo);
		let f = porSku.get(sku);
		if (!f) {
			const info = catalogo.get(sku);
			f = {
				sku,
				nom_articulo: r.nom_articulo || (info ? info.nombre : sku),
				linea: info ? info.linea : r.nom_linea || '',
				un_bx: info ? info.un_bx : null,
				vendido_und: 0,
				vendido_soles: 0,
				nc_soles: 0,
				nc_conteo: 0,
				devuelto_und: 0,
				precio_ultimo: null,
				precio_anterior: null,
				fecha_anterior: null,
				precio_anterior2: null,
				ultimo_cantidad: null,
				ultimo_fecha: null,
				ultimo_doc: '',
				rango_min: null,
				rango_max: null,
				nc_detalle: [],
				_sawVenta: false
			};
			porSku.set(sku, f);
		}

		if (r.tipo_operacion === 'venta') {
			f.vendido_und += Number(r.cantidad) || 0;
			f.vendido_soles += Number(r.soles) || 0;
			if (!f._sawVenta) {
				f._sawVenta = true;
				f.precio_ultimo = r.precio_unitario;
				f.precio_anterior = r.precio_anterior;
				f.fecha_anterior = r.fecha_anterior;
				f.precio_anterior2 = r.precio_anterior2;
				f.ultimo_cantidad = Number(r.cantidad) || 0;
				f.ultimo_fecha = r.fecha_orig;
				f.ultimo_doc = [r.serie_doc, r.nro_doc].filter(Boolean).join('-');
			}
			const pu = Number(r.precio_unitario);
			if (pu > 0) {
				if (f.rango_min === null || pu < f.rango_min) f.rango_min = pu;
				if (f.rango_max === null || pu > f.rango_max) f.rango_max = pu;
			}
		} else if (r.tipo_operacion === 'ajuste_valor') {
			f.nc_soles += Math.abs(Number(r.soles) || 0);
			f.nc_conteo += 1;
			f.nc_detalle.push({
				fecha: r.fecha_orig,
				soles: Math.abs(Number(r.soles) || 0),
				doc: [r.serie_doc, r.nro_doc].filter(Boolean).join('-')
			});
		} else if (r.tipo_operacion === 'devolucion') {
			f.devuelto_und += Math.abs(Number(r.cantidad) || 0);
		}
	}

	for (const f of porSku.values()) {
		delete f._sawVenta;
		f.cajas = f.un_bx ? f.vendido_und / f.un_bx : null;
		f.saldo_soles = f.vendido_soles - f.nc_soles;
	}
	return [...porSku.values()].sort((a, b) => a.sku.localeCompare(b.sku));
}




