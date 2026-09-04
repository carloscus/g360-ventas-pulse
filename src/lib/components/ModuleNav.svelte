<script>
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	/**
	 * ModuleNav - navegacion persistente entre los 4 modulos de campo.
	 * `activo`: 'hoy' | 'radar' | 'netos' | 'clientes'
	 */
	export let activo = 'hoy';

	const modulos = [
		{ id: 'hoy', etiqueta: 'Hoy', ruta: '/dashboard' },
		{ id: 'radar', etiqueta: 'Radar', ruta: '/radar' },
		{ id: 'netos', etiqueta: 'Netos', ruta: '/netos' },
		{ id: 'clientes', etiqueta: 'Clientes', ruta: '/clientes' }
	];

	function ir(ruta) {
		goto(`${base}${ruta}`);
	}
</script>

<nav class="glass-card p-1 mb-5 flex gap-1" aria-label="Modulos">
	{#each modulos as m (m.id)}
		<button
			class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors min-h-[44px] {activo === m.id
				? 'bg-primary-600 text-white shadow-sm'
				: 'text-g360-muted dark:text-g360-mutedDark hover:bg-g360-bg dark:hover:bg-white/10 active:scale-[0.98]'}"
			on:click={() => ir(m.ruta)}
			aria-current={activo === m.id ? 'page' : undefined}
		>
			{m.etiqueta}
		</button>
	{/each}
</nav>
