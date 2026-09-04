import { writable, get } from 'svelte/store';
import { initDB, saveVendedorActivo, loadVendedorActivo } from '$lib/db/cockpitDB.js';
import { clearCache } from '$lib/api/cache.js';

/** Vendedor activo: { id, nombre } | null */
export const vendedorActivo = writable(null);

let initialized = false;

/** Restaura la sesion previa al arrancar la app. Devuelve el vendedor restaurado o null. */
export async function restaurarSesion() {
	if (initialized) return get(vendedorActivo);
	initialized = true;
	try {
		await initDB();
		const previo = await loadVendedorActivo();
		if (previo && previo.id) {
			vendedorActivo.set(previo);
			return previo;
		}
	} catch (err) {
		console.warn('No se pudo restaurar sesion:', err);
	}
	return null;
}

/**
 * Normaliza el id de cliente: numerico -> pad 8; alfanumerico tal cual.
 */
export function normalizarCliente(id) {
	const t = String(id || '').trim();
	if (/^\d+$/.test(t)) return t.padStart(8, '0');
	return t;
}

/**
 * Valida el par (vendedor, cliente de su cartera) contra el historial.
 * Usa el indice (id_vendedor, id_cliente): 1 fila basta.
 */
export async function validarParVendedorCliente(idVendedor, idCliente) {
	const { postgrestGet, eq } = await import('$lib/api/postgrest.js');
	const rows = await postgrestGet('ventas', {
		filters: [eq('id_vendedor', idVendedor), eq('id_cliente', idCliente)],
		select: 'id_cliente',
		limit: 1
	});
	return Array.isArray(rows) && rows.length > 0;
}

/** Fija el vendedor activo y lo persiste. */
export async function setVendedor(vendedor) {
	vendedorActivo.set(vendedor);
	try {
		await saveVendedorActivo(vendedor);
	} catch (err) {
		console.warn('No se pudo persistir vendedor:', err);
	}
}

/** Actualiza y persiste el nombre real del vendedor (desde nom_vendedor). */
export async function setVendedorNombre(nombre) {
	if (!nombre) return;
	let actual = null;
	vendedorActivo.update((v) => {
		if (v && !v.nombre) {
			actual = { ...v, nombre };
			return actual;
		}
		actual = v;
		return v;
	});
	if (actual && actual.nombre) {
		try {
			await saveVendedorActivo(actual);
		} catch (err) {
			console.warn('No se pudo persistir nombre:', err);
		}
	}
}

/** Cierra la sesion del vendedor y limpia el cache derivado. */
export async function cambiarVendedor() {
	vendedorActivo.set(null);
	clearCache();
	try {
		await saveVendedorActivo(null);
	} catch (err) {
		console.warn('No se pudo limpiar vendedor:', err);
	}
}


