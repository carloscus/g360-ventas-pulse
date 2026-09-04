function b64ToBuffer(base64) {
	const parts = base64.split(',');
	const data = parts.length > 1 ? parts[1] : base64;
	const bstr = atob(data);
	const bytes = new Uint8Array(bstr.length);
	for (let i = 0; i < bstr.length; i++) {
		bytes[i] = bstr.charCodeAt(i);
	}
	return bytes;
}

function getExtension(base64) {
	const match = base64.match(/^data:image\/(\w+);/);
	return match ? match[1] : 'png';
}

function autoFitColumns(worksheet, colCaps = {}) {
	worksheet.columns.forEach((col, colIdx) => {
		let maxLen = 6;
		worksheet.eachRow({ includeEmpty: false }, (row) => {
			const cell = row.getCell(colIdx + 1);
			if (cell.value !== null && cell.value !== undefined) {
				const str = String(cell.value);
				const lines = str.split('\n');
				const longestLine = Math.max(...lines.map(l => l.length));
				maxLen = Math.max(maxLen, longestLine);
			}
		});
		const cap = colCaps[colIdx] !== undefined ? colCaps[colIdx] : 30;
		col.width = Math.min(Math.max(maxLen + 2, 8), cap);
	});
}

function styleHeader(row) {
	row.eachCell(cell => {
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008F5D' } };
		cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
	});
	row.height = 30;
}

export async function generateDevolucionExcel(clientData, returnLines) {
	if (!returnLines || returnLines.length === 0) {
		throw new Error('No hay líneas de devolución');
	}

	const ExcelJS = (await import('exceljs')).default;
	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'CIPSA Devoluciones - G360';
	workbook.created = new Date();

	// ===================== HOJA 1: DETALLE =====================
	const detalleSheet = workbook.addWorksheet('Detalle', {
		properties: { tabColor: { argb: 'FF008F5D' } }
	});

	// Title
	detalleSheet.mergeCells('A1:I1');
	const titleCell = detalleSheet.getCell('A1');
	titleCell.value = 'DETALLE DE DEVOLUCIÓN';
	titleCell.font = { bold: true, size: 16, color: { argb: 'FF008F5D' } };
	titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
	detalleSheet.getRow(1).height = 35;

	// Client info
	const clientInfo = [
		['RUC/DNI', clientData.ruc || ''],
		['Cliente', clientData.nombre || ''],
		['Código', clientData.codigoCliente || ''],
		['Fecha', clientData.fecha || ''],
		['Vendedor', clientData.vendedor || '']
	];

	clientInfo.forEach(([label, value]) => {
		const row = detalleSheet.addRow([label, value]);
		row.getCell(1).font = { bold: true, size: 11 };
		row.getCell(2).font = { size: 11 };
		row.height = 22;
	});

	detalleSheet.addRow([]);

	// Header
	const detHeaderRow = detalleSheet.addRow([
		'#', 'ALMACÉN', 'SKU', 'EAN', 'NOMBRE', 'CANTIDAD',
		'PESO (KG)', 'CANT. CAJAS', 'OBSERVACIÓN', 'FOTO'
	]);
	styleHeader(detHeaderRow);

	// Data rows
	for (let i = 0; i < returnLines.length; i++) {
		const line = returnLines[i];
		const peso = (line.cantidad || 0) * (line.peso_kg || 0);
		const cajas = line.un_bx > 0 ? Math.ceil((line.cantidad || 0) / line.un_bx) : 0;

		const row = detalleSheet.addRow([
			i + 1,
			line.codigoAlmacen || 'VES',
			line.codigo,
			line.ean || '',
			line.nombre_corto || line.nombre || '',
			line.cantidad || 0,
			parseFloat(peso.toFixed(3)),
			cajas,
			line.observacion || '',
			line.foto ? '📷' : ''
		]);

		// Vertical center + banding
		row.eachCell(cell => {
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		if (i % 2 === 1) {
			row.eachCell(cell => {
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7F4' } };
			});
		}

		row.getCell(6).numFmt = '#,##0.00';
		row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(7).numFmt = '#,##0.00';
		row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(9).alignment = { vertical: 'middle', wrapText: true };
		row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

		// Embed photo in column J with aspect ratio
		if (line.foto) {
			try {
				const ext = getExtension(line.foto);
				const buffer = b64ToBuffer(line.foto);
				const currentRow = detalleSheet.rowCount;

				// Decode base64 to get raw image dimensions reliably
				const imgData = line.foto.split(',')[1];
				const byteChars = atob(imgData);
				const headerBytes = byteChars.substring(0, 30);

				let imgWidth = 400;
				let imgHeight = 300;

				if (ext === 'jpeg' || ext === 'jpg') {
					for (let i = 0; i < headerBytes.length - 4; i++) {
						if (headerBytes.charCodeAt(i) === 0xFF && headerBytes.charCodeAt(i + 1) === 0xC0) {
							imgHeight = headerBytes.charCodeAt(i + 5) * 256 + headerBytes.charCodeAt(i + 6);
							imgWidth = headerBytes.charCodeAt(i + 7) * 256 + headerBytes.charCodeAt(i + 8);
							break;
						}
					}
				} else if (ext === 'png') {
					imgWidth = headerBytes.charCodeAt(16) * 256 + headerBytes.charCodeAt(17);
					imgHeight = headerBytes.charCodeAt(20) * 256 + headerBytes.charCodeAt(21);
				}

				const ratio = imgHeight / imgWidth;
				const cellWidthPx = 100;
				const cellHeightPx = Math.round(cellWidthPx * ratio);
				const rowHeightPt = Math.max(cellHeightPx * 0.75, 50);

				row.height = rowHeightPt;

				const imageId = workbook.addImage({
					buffer,
					extension: ext,
					name: `evidencia_${line.codigo}_${i + 1}`
				});

				// Column J = index 9 (0-based). Place image anchored to the cell.
				detalleSheet.addImage(imageId, {
					tl: { col: 9, row: currentRow - 1 },
					br: { col: 10, row: currentRow },
					editAs: 'oneCell'
				});
			} catch (err) {
				console.error(`Error adding image for ${line.codigo}:`, err);
				row.height = 28;
			}
		} else {
			row.height = 28;
		}
	}

	// Totals row
	const totalRow = detalleSheet.addRow([
		'', '', '', '', 'TOTAL',
		returnLines.reduce((s, l) => s + (l.cantidad || 0), 0),
		parseFloat(returnLines.reduce((s, l) => s + ((l.cantidad || 0) * (l.peso_kg || 0)), 0).toFixed(3)),
		'', '', ''
	]);
	totalRow.font = { bold: true, size: 11 };
	totalRow.height = 28;
	totalRow.getCell(5).alignment = { horizontal: 'right' };
	totalRow.getCell(6).numFmt = '#,##0.00';
	totalRow.getCell(6).alignment = { horizontal: 'center' };
	totalRow.getCell(7).numFmt = '#,##0.00';

	autoFitColumns(detalleSheet, {
		0: 5, 1: 10, 2: 14, 3: 15, 4: 35,
		5: 10, 6: 12, 7: 12, 8: 40, 9: 16
	});

	detalleSheet.views = [{ state: 'frozen', ySplit: detHeaderRow.number }];

	// ===================== HOJA 2: RESUMEN =====================
	const resumenSheet = workbook.addWorksheet('Resumen', {
		properties: { tabColor: { argb: 'FF2563EB' } }
	});

	// Title
	resumenSheet.mergeCells('A1:H1');
	const resTitleCell = resumenSheet.getCell('A1');
	resTitleCell.value = 'RESUMEN DE DEVOLUCIÓN (Agrupado por SKU)';
	resTitleCell.font = { bold: true, size: 16, color: { argb: 'FF2563EB' } };
	resTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
	resumenSheet.getRow(1).height = 35;

	// Header
	const resHeaderRow = resumenSheet.addRow([
		'ALMACÉN', 'SKU', 'EAN', 'NOMBRE',
		'TOTAL CANTIDAD', 'PESO TOTAL (KG)', 'TOTAL CAJAS', 'OBSERVACIONES'
	]);
	styleHeader(resHeaderRow);

	// Group by SKU
	const skuGroups = {};
	returnLines.forEach(line => {
		if (!skuGroups[line.codigo]) {
			skuGroups[line.codigo] = {
				codigoAlmacen: line.codigoAlmacen || 'VES',
				codigo: line.codigo,
				ean: line.ean || '',
				nombre: line.nombre_corto || line.nombre || '',
				totalCantidad: 0,
				totalPeso: 0,
				un_bx: line.un_bx || 1,
				observaciones: []
			};
		}
		skuGroups[line.codigo].totalCantidad += (line.cantidad || 0);
		skuGroups[line.codigo].totalPeso += (line.cantidad || 0) * (line.peso_kg || 0);
		if (line.observacion && !skuGroups[line.codigo].observaciones.includes(line.observacion)) {
			skuGroups[line.codigo].observaciones.push(line.observacion);
		}
	});

	let rowIndex = 0;
	Object.values(skuGroups).forEach(sku => {
		const cajas = sku.un_bx > 0 ? Math.ceil(sku.totalCantidad / sku.un_bx) : 0;
		const obsText = sku.observaciones.length > 0
			? sku.observaciones.join('; ')
			: '';

		const row = resumenSheet.addRow([
			sku.codigoAlmacen,
			sku.codigo,
			sku.ean,
			sku.nombre,
			sku.totalCantidad,
			parseFloat(sku.totalPeso.toFixed(3)),
			cajas,
			obsText
		]);

		// Vertical center + banding
		row.eachCell(cell => {
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		if (rowIndex % 2 === 1) {
			row.eachCell(cell => {
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
			});
		}

		row.getCell(5).numFmt = '#,##0.00';
		row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(6).numFmt = '#,##0.00';
		row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
		row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

		rowIndex++;
	});

	// Totals
	const resTotalRow = resumenSheet.addRow([
		'', '', '', 'TOTAL',
		Object.values(skuGroups).reduce((s, g) => s + g.totalCantidad, 0),
		parseFloat(Object.values(skuGroups).reduce((s, g) => s + g.totalPeso, 0).toFixed(3)),
		'', ''
	]);
	resTotalRow.font = { bold: true, size: 11 };
	resTotalRow.getCell(4).alignment = { horizontal: 'right' };
	resTotalRow.getCell(5).numFmt = '#,##0.00';
	resTotalRow.getCell(5).alignment = { horizontal: 'center' };
	resTotalRow.getCell(6).numFmt = '#,##0.00';

	autoFitColumns(resumenSheet, {
		0: 10, 1: 14, 2: 15, 3: 35,
		4: 12, 5: 12, 6: 10, 7: 40
	});

	resumenSheet.views = [{ state: 'frozen', ySplit: resHeaderRow.number }];

	// ===================== GENERAR ARCHIVO =====================
	const now = new Date();
	const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getFullYear()).slice(-2)}`;
	const clientName = clientData.nombre || clientData.ruc || 'sin_cliente';
	const cleanName = clientName.toString().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
	const fileName = `devolucion_${cleanName}_${dateStr}.xlsx`;

	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	});

	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
