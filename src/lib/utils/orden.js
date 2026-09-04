/**
 * Orden tipo tabla: helper compartido para listas grandes.
 * `orden` = { clave, dir } con dir -1 descendente / 1 ascendente.
 */
export function proximoOrden(actual, clave) {
	if (actual.clave === clave) return { clave, dir: -actual.dir };
	return { clave, dir: -1 };
}

export function ordenarPor(arr, orden) {
	const { clave, dir } = orden;
	return [...arr].sort((x, y) => {
		const a = x?.[clave];
		const b = y?.[clave];
		if (typeof a === 'string' || typeof b === 'string') {
			return String(a ?? '').localeCompare(String(b ?? '')) * dir;
		}
		return ((a ?? -Infinity) - (b ?? -Infinity)) * dir;
	});
}

export function indicador(orden, clave) {
	if (orden.clave !== clave) return '';
	return orden.dir === -1 ? '▼' : '▲';
}
