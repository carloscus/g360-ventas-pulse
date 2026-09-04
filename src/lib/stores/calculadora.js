import { writable } from 'svelte/store';

/** Solicitud de apertura de la calculadora IGV con un valor precargado. */
export const calculadoraSolicitud = writable(null);

/** abrirCalculadora(3.85) -> abre la calculadora con modo +IGV y ese monto. */
export function abrirCalculadora(valor, modo = 'mas') {
	calculadoraSolicitud.set({ valor, modo, ts: Date.now() });
}

export function limpiarSolicitud() {
	calculadoraSolicitud.set(null);
}
