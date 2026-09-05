<script>
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	export let activo = 'hoy';

	const modulos = [
		{ id: 'hoy', etiqueta: 'Hoy', ruta: '/dashboard' },
		{ id: 'radar', etiqueta: 'Radar', ruta: '/radar' },
		{ id: 'netos', etiqueta: 'Netos', ruta: '/netos' },
		{ id: 'clientes', etiqueta: 'Clientes', ruta: '/clientes' }
	];

	function ir(ruta) { goto(`${base}${ruta}`); }
</script>

<nav class="tabbar" aria-label="Navegacion principal">
	{#each modulos as m (m.id)}
		<button
			class="tabbar-btn {activo === m.id ? 'tabbar-activo' : ''}"
			on:click={() => ir(m.ruta)}
			aria-current={activo === m.id ? 'page' : undefined}
		>
			{m.etiqueta}
		</button>
	{/each}
</nav>

<style>
	.tabbar {
		position: fixed;
		bottom: 0; left: 0; right: 0;
		z-index: 40;
		display: flex;
		background: rgba(11,18,32,0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid rgba(255,255,255,0.06);
		padding: 4px 4px max(env(safe-area-inset-bottom, 4px), 4px);
	}
	:global(html:not(.dark)) .tabbar { background: rgba(255,255,255,0.95); border-color: #e5e7eb; }
	.tabbar-btn {
		flex: 1;
		padding: 10px 4px;
		font-size: 12px;
		font-weight: 600;
		text-align: center;
		color: #94a3b8;
		background: none;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: color 0.15s, background 0.15s;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}
	:global(html:not(.dark)) .tabbar-btn { color: #6b7280; }
	.tabbar-btn:hover { background: rgba(255,255,255,0.06); }
	:global(html:not(.dark)) .tabbar-btn:hover { background: rgba(0,0,0,0.04); }
	.tabbar-activo { color: #00d084; }
	:global(html:not(.dark)) .tabbar-activo { color: #008f5d; }
</style>
