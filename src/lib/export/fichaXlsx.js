import ExcelJS from 'exceljs';

// Paleta CIPSA
const VERDE = 'FF008F5D';
const VERDE_OSCURO = 'FF0B6B47';
const VERDE_KPI = 'FF047857';
const ROJO = 'FFDC2626';
const AMBAR_TXT = 'FFB45309';
const FILL_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
const FILL_HEADER_ALT = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_OSCURO } };
const FILL_TOTAL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCF0E7' } };
const FILL_CLIENTE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4CC' } };
const FILL_ROJO_SUAVE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8E8' } };

const MONEY = '"S/" #,##0.00';
const MONEY0 = '"S/" #,##0';
const PCT = '+0.0%;-0.0%;0.0%';
const NUM = '#,##0';

const FICHA_COLS = 14; // A..N
const HIST_COLS = 16; // A..P

/**
 * Pareto de SKUs por saldo S/: acumulado hasta ~80%, tope 20.
 * Se exporta para que la pagina use el MISMO criterio al pedir comparativas.
 */
export function paretoSkus(filas) {
	const orden = [...(filas || [])].sort((a, b) => (b.saldo_soles || 0) - (a.saldo_soles || 0));
	const total = orden.reduce((s, f) => s + (f.saldo_soles || 0), 0);
	const out = [];
	let acum = 0;
	for (const f of orden) {
		acum += f.saldo_soles || 0;
		out.push({ fila: f, soles: f.saldo_soles || 0, pctAcum: total > 0 ? acum / total : 0 });
		if (out.length >= 20 || (out.length >= 5 && total > 0 && acum / total >= 0.8)) break;
	}
	return out;
}

function LETRA(n) {
	let s = '';
	while (n > 0) {
		const m = (n - 1) % 26;
		s = String.fromCharCode(65 + m) + s;
		n = Math.floor((n - 1) / 26);
	}
	return s;
}

function num2(v) {
	return v === null || v === undefined || v === '' ? '' : Number(v);
}

function styleHeader(row, fill = FILL_HEADER) {
	row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
	row.fill = fill;
	row.alignment = { vertical: 'middle', wrapText: true };
	row.height = 24;
}

function styleTitle(cell, texto) {
	cell.value = texto;
	cell.font = { bold: true, size: 14, color: { argb: VERDE_OSCURO } };
	cell.alignment = { vertical: 'middle' };
}

function section(ws, fila, texto, hastaCol = 8) {
	for (let c = 1; c <= hastaCol; c++) ws.getCell(fila, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0EB' } };
	const c = ws.getCell(fila, 1);
	c.value = texto;
	c.font = { bold: true, size: 11, color: { argb: VERDE_OSCURO } };
	ws.getRow(fila).height = 18;
}

function autoWidth(ws, min = 9, max = 44) {
	ws.columns.forEach((col) => {
		let w = min;
		col.eachCell?.({ includeEmpty: false }, (cell) => {
			const v = cell.value;
			const len = v && typeof v === 'object' ? 14 : String(v ?? '').length + 2;
			w = Math.max(w, Math.min(len, max));
		});
		col.width = w;
	});
}

function evolucionDeRows(rows) {
	const porMes = new Map();
	for (const r of rows || []) {
		if (r.tipo_operacion !== 'venta') continue;
		const mes = r.mes_ref || String(r.fecha_orig || '').slice(0, 7);
		if (!mes) continue;
		porMes.set(mes, (porMes.get(mes) || 0) + (Number(r.soles) || 0));
	}
	return [...porMes.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([mes, soles]) => ({ mes, soles }));
}

/** Hoja Resumen: metadata + KPIs con formulas vivas + evolucion mensual. */
function hojaResumen(wb, { clienteId, clienteNombre, vendedor, desde, hasta, filas, resumen, rows }) {
	const ws = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] });

	ws.mergeCells('A1:E1');
	styleTitle(ws.getCell('A1'), `Ficha comercial - ${clienteNombre || clienteId}`);
	ws.getRow(1).height = 26;

	const meta = [
		['Cliente', `${clienteId} - ${clienteNombre || 's/nombre'}`],
		['Vendedor', vendedor ? `${vendedor.id} - ${vendedor.nombre}` : 's/d'],
		['Periodo', `${desde} a ${hasta}`],
		['Generado', new Date().toLocaleString('es-PE')],
		['SKUs distintos', filas.length]
	];
	meta.forEach(([k, v], i) => {
		ws.getCell(3 + i, 1).value = k;
		ws.getCell(3 + i, 1).font = { bold: true, size: 10, color: { argb: 'FF6B7280' } };
		ws.getCell(3 + i, 2).value = v;
	});

	// Totales de 'Ficha SKU': header fila 1, datos 2..1+n, TOTAL fila n+2
	const n = filas.length;
	const tot = n + 2;
	const sumSaldo = filas.reduce((s, f) => s + (f.saldo_soles || 0), 0);
	const sumNC = filas.reduce((s, f) => s + (f.nc_soles || 0), 0);
	const sumDev = filas.reduce((s, f) => s + (f.devuelto_und || 0), 0);
	let r = 9;
	section(ws, r, 'KPIs del periodo (formulas vivas sobre la hoja Ficha SKU)');
	r += 1;
	const kpis = [
		['Ventas S/', `SUM('Ficha SKU'!F${tot},'Ficha SKU'!L${tot})`, MONEY, sumSaldo + sumNC],
		['NCs S/', `'Ficha SKU'!L${tot}`, MONEY, sumNC],
		['Saldo neto S/', `'Ficha SKU'!F${tot}`, MONEY, sumSaldo],
		['Devuelto und', `'Ficha SKU'!N${tot}`, NUM, sumDev],
		['SKUs comprados', `COUNTA('Ficha SKU'!A2:A${n + 1})`, NUM, filas.length]
	];
	for (const [label, formula, fmt, cached] of kpis) {
		ws.getCell(r, 1).value = label;
		ws.getCell(r, 1).font = { size: 10, color: { argb: 'FF6B7280' } };
		const c = ws.getCell(r, 2);
		c.value = { formula, result: cached };
		c.numFmt = fmt;
		c.font = { bold: true, size: 12, color: { argb: VERDE_KPI } };
		r += 1;
	}

	r += 1;
	section(ws, r, 'Evolucion mensual (ventas S/)');
	r += 1;
	const hEv = ws.addRow(['Mes', 'Ventas S/', 'vs mes anterior']);
	styleHeader(hEv);
	const ev = resumen?.evolucionMensual?.length ? resumen.evolucionMensual : evolucionDeRows(rows);
	let prev = null;
	let prevSoles = 0;
	for (const m of ev) {
		const row = ws.addRow([m.mes, num2(m.soles), '']);
		row.getCell(2).numFmt = MONEY0;
		if (prev !== null) {
			row.getCell(3).value = {
				formula: `IF(B${prev}=0,"",B${row.number}/B${prev}-1)`,
				result: prevSoles ? m.soles / prevSoles - 1 : ''
			};
			row.getCell(3).numFmt = PCT;
		}
		prev = row.number;
		prevSoles = m.soles || 0;
	}
	if (ev.length > 1) {
		const totEv = ev.reduce((s, m) => s + (m.soles || 0), 0);
		const t = ws.addRow(['TOTAL', { formula: `SUM(B${hEv.number + 1}:B${prev})`, result: totEv }, '']);
		t.font = { bold: true };
		t.getCell(2).numFmt = MONEY0;
		t.border = { top: { style: 'double', color: { argb: VERDE } } };
	}
	if (ev.length === 0) ws.addRow(['Sin ventas en el periodo']);

	r = ws.rowCount + 2;
	ws.getCell(r, 1).value = 'Las celdas con formulas vivas se recalculan al abrir en Excel o LibreOffice.';
	ws.getCell(r, 1).font = { italic: true, size: 9, color: { argb: 'FF9CA3AF' } };

	autoWidth(ws, 10, 52);
	return ws;
}

/** Hoja Ficha SKU: todos los SKUs del periodo + modas + fila TOTAL. */
function hojaFicha(wb, { filas, modas }) {
	const ws = wb.addWorksheet('Ficha SKU');
	const anioActual = new Date().getFullYear();
	const h = ws.addRow([
		'SKU', 'Articulo', 'Linea', 'Und vendidas', 'Cajas', 'Saldo S/',
		'Precio ultimo', 'Fecha ultimo', `Moda ${anioActual} (xN)`, `Moda ${anioActual - 1} (xN)`,
		'Rango precio periodo', 'NC S/', 'NC #', 'Devuelto und'
	]);
	styleHeader(h);
	for (const f of filas) {
		const mA = modas.get(f.sku)?.a;
		const mB = modas.get(f.sku)?.b;
		const rangoTxt =
			f.rango_min == null || f.rango_max == null ? '' :
			f.rango_min.toFixed(2) === f.rango_max.toFixed(2) ? 'unico' :
			`${f.rango_min.toFixed(2)} - ${f.rango_max.toFixed(2)}`;
		const row = ws.addRow([
			f.sku,
			f.nom_articulo,
			f.linea,
			num2(f.vendido_und),
			f.cajas == null ? '' : Math.round(f.cajas * 100) / 100,
			num2(f.saldo_soles),
			num2(f.precio_ultimo),
			f.ultimo_fecha || '',
			mA ? `${mA.v.toFixed(2)} x${mA.n}` : '',
			mB ? `${mB.v.toFixed(2)} x${mB.n}` : '',
			rangoTxt,
			num2(f.nc_soles),
			num2(f.nc_conteo),
			num2(f.devuelto_und)
		]);
		row.getCell(4).numFmt = NUM;
		row.getCell(5).numFmt = '#,##0.00';
		row.getCell(6).numFmt = MONEY;
		row.getCell(7).numFmt = MONEY;
		row.getCell(12).numFmt = MONEY;
		row.getCell(14).numFmt = NUM;
		if ((f.nc_soles || 0) > 0) row.getCell(12).font = { color: { argb: AMBAR_TXT }, bold: true };
		if ((f.devuelto_und || 0) > 0) row.getCell(14).font = { color: { argb: ROJO } };
	}
	const n = filas.length;
	const tUnd = filas.reduce((s, f) => s + (f.vendido_und || 0), 0);
	const tSaldo = filas.reduce((s, f) => s + (f.saldo_soles || 0), 0);
	const tNCs = filas.reduce((s, f) => s + (f.nc_soles || 0), 0);
	const tNC = filas.reduce((s, f) => s + (f.nc_conteo || 0), 0);
	const tDev = filas.reduce((s, f) => s + (f.devuelto_und || 0), 0);
	const t = ws.addRow([
		'TOTAL', '', '',
		{ formula: `SUM(D2:D${n + 1})`, result: tUnd }, '',
		{ formula: `SUM(F2:F${n + 1})`, result: tSaldo }, '', '', '', '', '',
		{ formula: `SUM(L2:L${n + 1})`, result: tNCs },
		{ formula: `SUM(M2:M${n + 1})`, result: tNC },
		{ formula: `SUM(N2:N${n + 1})`, result: tDev }
	]);
	t.font = { bold: true };
	t.fill = FILL_TOTAL;
	t.border = { top: { style: 'double', color: { argb: VERDE } } };
	t.getCell(4).numFmt = NUM;
	t.getCell(6).numFmt = MONEY;
	t.getCell(12).numFmt = MONEY;
	t.getCell(14).numFmt = NUM;

	ws.views = [{ state: 'frozen', ySplit: 1 }];
	ws.autoFilter = `A1:${LETRA(FICHA_COLS)}${n + 1}`;
	autoWidth(ws, 9, 46);
	return ws;
}

/** Hoja Negociacion: anomalias (Delta % como formula viva) + analisis anual (Var % formula viva). */
function hojaNegociacion(wb, { analisis, anomalias }) {
	const ws = wb.addWorksheet('Negociacion', { views: [{ showGridLines: false }] });

	ws.mergeCells('A1:J1');
	styleTitle(ws.getCell('A1'), 'Argumentos de negociacion');
	ws.getRow(1).height = 24;

	let r = 3;
	section(ws, r, 'Ventas bajo el promedio del cliente (precio <= 15% bajo el promedio ponderado, excluyendo las propias anomalías)', 9);
	r += 1;
	if (!anomalias.length) {
		ws.getCell(r, 1).value = 'Sin anomalías: ningún producto se vende consistentemente bajo el promedio del cliente.';
		ws.getCell(r, 1).font = { italic: true, color: { argb: 'FF6B7280' } };
		r += 2;
	} else {
		const hA = ws.addRow(['Producto', 'Peor precio', 'Promedio limpio', 'Delta %', 'Líneas', 'Docs', 'Cant min', 'Cant max', 'Periodo']);
		styleHeader(hA, FILL_HEADER_ALT);
		for (const a of anomalias) {
			const row = ws.addRow([
				a.nom,
				num2(a.precio),
				num2(a.promedio),
				'',
				a.n,
				a.nDocs,
				num2(a.cantMin),
				num2(a.cantMax),
				a.fechaDesde === a.fechaHasta ? a.fechaDesde : `${a.fechaDesde} a ${a.fechaHasta}`
			]);
			const dr = row.number;
			row.getCell(4).value = {
				formula: `IF(C${dr}=0,"",B${dr}/C${dr}-1)`,
				result: a.promedio ? a.precio / a.promedio - 1 : ''
			};
			row.getCell(2).numFmt = MONEY;
			row.getCell(3).numFmt = MONEY;
			row.getCell(4).numFmt = PCT;
			row.getCell(4).font = { bold: true, color: { argb: ROJO } };
			row.getCell(4).fill = FILL_ROJO_SUAVE;
			row.getCell(7).numFmt = NUM;
			row.getCell(8).numFmt = NUM;
		}
		r = ws.rowCount + 2;
	}

	section(ws, r, 'Precio por año por SKU (moda = precio más repetido; prom = ponderado por cantidad)', 10);
	r += 1;
	const hN = ws.addRow(['SKU', 'Articulo', 'Año', 'Ventas', 'Moda', 'Moda xN', 'Prom ponderado', 'Min', 'Max', 'Var % vs año previo']);
	styleHeader(hN);
	for (const a of analisis) {
		// prevG: prom ponderado del anio anterior del MISMO SKU (los anios se
		// escriben consecutivos); evita referencias cruzadas entre SKUs.
		let prevG = null;
		a.anios.forEach((y, i) => {
			const g = y.promPond || y.prom || 0;
			const row = ws.addRow([
				a.sku,
				String(a.nom).slice(0, 60),
				Number(y.anio),
				y.n,
				num2(y.moda === null ? y.prom : y.moda),
				y.moda === null ? '' : `x${y.modaN}`,
				num2(g),
				num2(y.min),
				num2(y.max),
				''
			]);
			row.getCell(3).numFmt = '0';
			row.getCell(4).numFmt = NUM;
			[5, 7, 8, 9].forEach((c) => (row.getCell(c).numFmt = MONEY));
			if (i > 0) {
				const v = a.variaciones?.[i - 1];
				const prev = row.number - 1;
				row.getCell(10).value = {
					formula: `IF(G${prev}=0,"",(G${row.number}-G${prev})/G${prev})`,
					result: prevG ? (g - prevG) / prevG : ''
				};
				row.getCell(10).numFmt = PCT;
				if (v && v.pct <= -0.02) {
					row.getCell(10).font = { bold: true, color: { argb: ROJO } };
					row.getCell(10).fill = FILL_ROJO_SUAVE;
				} else if (v && v.pct >= 0.02) {
					row.getCell(10).font = { bold: true, color: { argb: VERDE_KPI } };
				}
			}
			prevG = g;
		});
	}
	if (!analisis.length) {
		ws.getCell(r + 1, 1).value = 'Sin SKUs con 3+ ventas para el análisis anual.';
		ws.getCell(r + 1, 1).font = { italic: true, color: { argb: 'FF6B7280' } };
	}

	autoWidth(ws, 9, 48);
	return ws;
}

/** Hoja Comparativa: Pareto con % vivos + ranking por SKU con Pos y Delta como formulas. */
function hojaComparativa(wb, { clienteId, pareto, comparativas }) {
	const ws = wb.addWorksheet('Comparativa', { views: [{ showGridLines: false }] });

	ws.mergeCells('A1:J1');
	styleTitle(ws.getCell('A1'), 'Comparativa de precios entre mis clientes');
	ws.getRow(1).height = 24;

	let r = 3;
	section(ws, r, 'Pareto: SKUs que explican ~80% del saldo del cliente', 6);
	r += 1;
	const hP = ws.addRow(['#', 'SKU', 'Articulo', 'Saldo S/', '% del total', '% acumulado']);
	styleHeader(hP);
	const firstP = hP.number + 1;
	const lastP = firstP + pareto.length - 1;
	const sumP = pareto.reduce((s, x) => s + (x.soles || 0), 0);
	pareto.forEach((p, i) => {
		const row = ws.addRow([
			i + 1,
			p.fila.sku,
			p.fila.nom_articulo,
			num2(p.fila.saldo_soles),
			'',
			''
		]);
		const rr = row.number;
		const pctInd = sumP > 0 ? (p.soles || 0) / sumP : '';
		row.getCell(5).value = {
			formula: `IF(SUM($D$${firstP}:$D$${lastP})=0,"",D${rr}/SUM($D$${firstP}:$D$${lastP}))`,
			result: pctInd
		};
		row.getCell(6).value =
			i === 0
				? { formula: `E${rr}`, result: pctInd }
				: { formula: `F${rr - 1}+E${rr}`, result: p.pctAcum };
		row.getCell(4).numFmt = MONEY;
		row.getCell(5).numFmt = PCT;
		row.getCell(6).numFmt = PCT;
	});
	if (pareto.length) {
		const t = ws.addRow([
			'', 'TOTAL PARETO', '',
			{ formula: `SUM(D${firstP}:D${lastP})`, result: sumP },
			{ formula: `SUM(E${firstP}:E${lastP})`, result: 1 },
			''
		]);
		t.font = { bold: true };
		t.fill = FILL_TOTAL;
		t.border = { top: { style: 'double', color: { argb: VERDE } } };
		t.getCell(4).numFmt = MONEY;
		t.getCell(5).numFmt = PCT;
	}
	r = ws.rowCount + 2;

	section(ws, r, 'Ranking de precios por SKU (de quien paga más a quien paga menos)', 10);
	r += 1;
	let comparables = 0;
	for (const p of pareto) {
		const data = comparativas.get?.(p.fila.sku) ?? [];
		if (!data.length) continue;
		comparables += 1;
		const hS = ws.addRow([`SKU ${p.fila.sku} · ${p.fila.nom_articulo} · Pareto #${pareto.indexOf(p) + 1}`, '', '', '', '', '', '', '', '', '']);
		hS.getCell(1).font = { bold: true, size: 11, color: { argb: VERDE_OSCURO } };
		ws.mergeCells(`A${hS.number}:J${hS.number}`);
		const hC = ws.addRow(['#', 'Cliente', 'Último S/', 'Fecha', 'Cant', 'Rango', 'Docs', 'NC #', 'Δ vs mejor', 'Pos']);
		styleHeader(hC, FILL_HEADER_ALT);
		const firstC = hC.number + 1;
		const lastC = firstC + data.length - 1;
		data.forEach((cp, i) => {
			const esCliente = String(cp.id_cliente) === String(clienteId);
			const row = ws.addRow([
				i + 1,
				esCliente ? `▶ ${cp.nom_cliente}` : cp.nom_cliente,
				num2(cp.ultimo.precio),
				cp.ultimo.fecha,
				num2(cp.ultimo.cantidad),
				cp.min.precio.toFixed(2) !== cp.max.precio.toFixed(2) ? `${cp.min.precio.toFixed(2)} - ${cp.max.precio.toFixed(2)}` : 'único',
				cp.nDocs,
				cp.ncConteo || 0,
				'',
				''
			]);
			const rr = row.number;
			const mejor = data[0]?.ultimo?.precio || 0;
			// Pos con semantica RANK de Excel: empates comparten posicion
			const pos = 1 + data.filter((x) => (x.ultimo?.precio || 0) > cp.ultimo.precio).length;
			row.getCell(9).value = {
				formula: `IF(MAX($C$${firstC}:$C$${lastC})=0,"",C${rr}/MAX($C$${firstC}:$C$${lastC})-1)`,
				result: mejor ? cp.ultimo.precio / mejor - 1 : ''
			};
			row.getCell(10).value = { formula: `RANK(C${rr},$C$${firstC}:$C$${lastC})`, result: pos };
			row.getCell(3).numFmt = MONEY;
			row.getCell(5).numFmt = NUM;
			row.getCell(9).numFmt = PCT;
			if (cp.ncConteo > 0) row.getCell(8).font = { color: { argb: AMBAR_TXT }, bold: true };
			if (mejor && cp.ultimo.precio / mejor - 1 <= -0.05) row.getCell(9).font = { bold: true, color: { argb: ROJO } };
			if (esCliente) {
				row.eachCell((c) => {
					c.fill = FILL_CLIENTE;
					c.font = { bold: true };
				});
			}
		});
		r = ws.rowCount + 1;
	}
	for (const p of pareto) {
		const data = comparativas.get?.(p.fila.sku);
		if (data && !data.length) {
			const row = ws.addRow([`SKU ${p.fila.sku} · ${p.fila.nom_articulo}: único cliente que compra este SKU (sin comparativa)`]);
			row.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF9CA3AF' } };
			ws.mergeCells(`A${row.number}:J${row.number}`);
		}
	}
	if (!comparables) {
		const row = ws.addRow(['Sin comparativa: no hay sesión de vendedor o los SKUs del Pareto no tienen ventas de otros clientes.']);
		row.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } };
	}

	autoWidth(ws, 9, 46);
	return ws;
}

const HEADER_ERP = [
	'ANHO', 'COD_CLIENTE', 'CLIENTE', 'COD_VENDEDOR', 'CODIGO', 'ARTICULO',
	'LINEA', 'TIPO_DOC', 'SERIE', 'NUMERO', 'FECHA', 'CANTIDAD', 'SOLES',
	'PRECIO_UNITARIO', 'PRECIO_ANTERIOR', 'FECHA_ANTERIOR'
];

/** Hoja Historial: filas crudas con headers ERP estandar (nc-sustentor). */
function hojaHistorial(wb, rows) {
	const ws = wb.addWorksheet('Historial');
	const hH = ws.addRow(HEADER_ERP);
	styleHeader(hH);
	for (const r of rows) {
		const fecha = String(r.fecha_orig || '');
		ws.addRow([
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
	ws.views = [{ state: 'frozen', ySplit: 1 }];
	ws.autoFilter = `A1:${LETRA(HIST_COLS)}${rows.length + 1}`;
	autoWidth(ws, 10, 36);
	return ws;
}

/**
 * Genera el xlsx de la ficha cliente (5 hojas):
 * - Resumen: KPIs con formulas vivas + evolucion mensual
 * - Ficha SKU: agregacion por SKU con ultimos precios, modas y fila TOTAL
 * - Negociacion: anomalias + analisis anual (Delta % y Var % como formulas)
 * - Comparativa: Pareto de SKUs + ranking de precios entre clientes (formulas)
 * - Historial: filas crudas con headers ERP estandar (nc-sustentor)
 */
export async function generarFichaXlsx({
	clienteId,
	clienteNombre,
	vendedor,
	desde,
	hasta,
	filas,
	rows,
	modas = new Map(),
	analisis = [],
	anomalias = [],
	resumen = null,
	pareto = [],
	comparativas = new Map()
}) {
	const wb = new ExcelJS.Workbook();
	wb.creator = 'g360-ventas-pulse';
	wb.created = new Date();
	wb.calcProperties = { fullCalcOnLoad: true };

	hojaResumen(wb, { clienteId, clienteNombre, vendedor, desde, hasta, filas, resumen, rows });
	hojaFicha(wb, { filas, modas });
	hojaNegociacion(wb, { analisis, anomalias });
	hojaComparativa(wb, { clienteId, pareto, comparativas });
	hojaHistorial(wb, rows);

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
