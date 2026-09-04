import ExcelJS from 'exceljs';

const HEADER_FICHA = [
	'SKU', 'Articulo', 'Linea', 'Und vendidas', 'Cajas', 'Precio ultimo',
	'Precio anterior', 'Fecha anterior', 'Precio anterior2',
	'NC descuento S/', 'NC conteo', 'Devuelto und', 'Saldo S/'
];

const HEADER_ERP = [
	'ANHO', 'COD_CLIENTE', 'CLIENTE', 'COD_VENDEDOR', 'CODIGO', 'ARTICULO',
	'LINEA', 'TIPO_DOC', 'SERIE', 'NUMERO', 'FECHA', 'CANTIDAD', 'SOLES',
	'PRECIO_UNITARIO', 'PRECIO_ANTERIOR', 'FECHA_ANTERIOR'
];

function styleHeader(row) {
	row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008F5D' } };
	row.alignment = { vertical: 'middle' };
}

function num2(v) {
	return v === null || v === undefined ? '' : Number(v);
}

/**
 * Genera el xlsx de la ficha cliente.
 * - Hoja "Ficha SKU": agregacion por SKU (vista del app)
 * - Hoja "Historial": filas crudas con headers ERP estandar (nc-sustentor)
 */
export async function generarFichaXlsx({ clienteId, clienteNombre, vendedor, desde, hasta, filas, rows }) {
	const wb = new ExcelJS.Workbook();
	wb.creator = 'g360-ventas-pulse';
	wb.created = new Date();

	const hojaFicha = wb.addWorksheet('Ficha SKU');
	hojaFicha.addRow(['Cliente', clienteId, clienteNombre]);
	hojaFicha.addRow(['Vendedor', vendedor?.id || '']);
	hojaFicha.addRow(['Periodo', `${desde} a ${hasta}`]);
	hojaFicha.addRow(['Generado', new Date().toLocaleString('es-PE')]);
	hojaFicha.addRow([]);
	const hF = hojaFicha.addRow(HEADER_FICHA);
	styleHeader(hF);
	for (const f of filas) {
		hojaFicha.addRow([
			f.sku,
			f.nom_articulo,
			f.linea,
			num2(f.vendido_und),
			f.cajas === null ? '' : num2(f.cajas),
			num2(f.precio_ultimo),
			num2(f.precio_anterior),
			f.fecha_anterior || '',
			num2(f.precio_anterior2),
			num2(f.nc_soles),
			num2(f.nc_conteo),
			num2(f.devuelto_und),
			num2(f.saldo_soles)
		]);
	}
	hojaFicha.columns.forEach((col) => {
		let max = 10;
		col.eachCell?.({ includeEmpty: false }, (cell) => {
			max = Math.max(max, String(cell.value ?? '').length + 2);
		});
		col.width = Math.min(max, 40);
	});

	const hojaHist = wb.addWorksheet('Historial');
	const hH = hojaHist.addRow(HEADER_ERP);
	styleHeader(hH);
	for (const r of rows) {
		const fecha = String(r.fecha_orig || '');
		hojaHist.addRow([
			fecha ? fecha.slice(0, 4) : '',
			String(r.id_cliente || ''),
			r.nom_cliente || '',
			String(r.id_vendedor || ''),
			String(r.id_articulo || ''),
			r.nom_articulo || '',
			r.nom_linea || '',
			r.tpo_doc || '',
			r.serie_doc || '',
			String(r.nro_doc || ''),
			fecha,
			num2(r.cantidad),
			num2(r.soles),
			num2(r.precio_unitario),
			num2(r.precio_anterior),
			r.fecha_anterior || ''
		]);
	}
	hojaHist.columns.forEach((col) => {
		let max = 12;
		col.eachCell?.({ includeEmpty: false }, (cell) => {
			max = Math.max(max, String(cell.value ?? '').length + 2);
		});
		col.width = Math.min(max, 34);
	});

	const buffer = await wb.xlsx.writeBuffer();
	return new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	});
}

/** Descarga el blob con nombre estandar ficha_<cliente>_<desde>_<hasta>.xlsx */
export function descargarFichaXlsx(blob, clienteId, desde, hasta) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `ficha_${clienteId}_${desde}_${hasta}.xlsx`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
