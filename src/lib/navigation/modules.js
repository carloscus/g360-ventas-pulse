const defineModule = (module) => Object.freeze(module);

export const MODULES = Object.freeze([
	defineModule({ id: 'hoy', etiqueta: 'Hoy', ruta: '/dashboard', segmento: 'dashboard' }),
	defineModule({ id: 'radar', etiqueta: 'Radar', ruta: '/radar', segmento: 'radar' }),
	defineModule({ id: 'netos', etiqueta: 'Netos', ruta: '/netos', segmento: 'netos' }),
	defineModule({ id: 'clientes', etiqueta: 'Clientes', ruta: '/clientes', segmento: 'clientes' })
]);

/**
 * Resolves the active module from a SvelteKit pathname, including the configured base path.
 * Ficha pages belong to the Clientes module because they are opened from that workspace.
 */
export function getActiveModule(pathname = '') {
	const segmentos = String(pathname).split('/').filter(Boolean);

	if (segmentos.includes('ficha')) return 'clientes';

	return MODULES.find((module) => segmentos.includes(module.segmento))?.id || null;
}
