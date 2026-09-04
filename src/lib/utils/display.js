/**
 * Convencion G360 de codigos:
 * - Cliente y vendedor: display sin ceros a la izquierda (00056101 -> 56101,
 *   01177 -> 177). El valor completo se conserva como ID para queries.
 * - SKU: NUNCA recortar (011019 != 11019, hay colision real en el catalogo).
 */
export function displayId(id) {
	const s = String(id ?? '');
	const sinCeros = s.replace(/^0+/, '');
	return sinCeros === '' ? s : sinCeros;
}

export function displayCliente(id) {
	return displayId(id);
}

export function displayVendedor(id) {
	const s = String(id ?? '');
	// formato ERP: '01' + 3 chars (01186 -> 186, 01052 -> 052, 01M05 -> M05)
	if (/^01.{3}$/.test(s)) return s.slice(2);
	return displayId(s);
}

export function displaySku(sku) {
	return String(sku ?? '');
}

