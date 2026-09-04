import { writable } from 'svelte/store';

/**
 * Cliente en contexto de consulta (la ficha abierta). La busqueda global de
 * productos usa este contexto para mostrar los precios vendidos a ese cliente.
 */
export const clienteContexto = writable(null);

export function setClienteContexto(id, nombre) {
	clienteContexto.set(id ? { id, nombre: nombre || '' } : null);
}
