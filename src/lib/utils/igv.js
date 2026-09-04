/**
 * IGV Peru (convencion G360: g360-skill-agentes.js IGV_PORCENTAJE: 0.18).
 * Todos los montos de la app son SIN IGV (precios ERP).
 */
export const IGV_PORCENTAJE = 0.18;

/** Monto con IGV: base * 1.18 */
export function conIgv(monto) {
	return (Number(monto) || 0) * (1 + IGV_PORCENTAJE);
}

/** Monto del IGV: base * 0.18 */
export function montoIgv(monto) {
	return (Number(monto) || 0) * IGV_PORCENTAJE;
}
