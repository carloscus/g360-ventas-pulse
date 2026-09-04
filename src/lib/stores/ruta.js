import { writable } from 'svelte/store';
import { saveRutaDia, loadRutaDia } from '$lib/db/cockpitDB.js';

/** Ruta del dia: array de id_cliente marcados por el vendedor. */
export const rutaDia = writable([]);

export async function cargarRuta(idVendedor) {
	const ids = await loadRutaDia(idVendedor);
	rutaDia.set(ids || []);
	return ids || [];
}

export async function toggleVisita(idVendedor, idCliente) {
	let nueva = [];
	rutaDia.update((ids) => {
		nueva = ids.includes(idCliente) ? ids.filter((x) => x !== idCliente) : [...ids, idCliente];
		return nueva;
	});
	try {
		await saveRutaDia(idVendedor, nueva);
	} catch (err) {
		console.warn('No se pudo persistir ruta:', err);
	}
	return nueva;
}
