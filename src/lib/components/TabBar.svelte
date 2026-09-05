<script>
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { searchOpen } from '$lib/stores/search.js';

	export let activo = 'hoy';
	export let nombre = '';
	export let id = '';

	let perfilAbierto = false;

	const modulos = [
		{ id: 'hoy', etiqueta: 'Hoy', ruta: '/dashboard' },
		{ id: 'radar', etiqueta: 'Radar', ruta: '/radar' },
		{ id: 'netos', etiqueta: 'Netos', ruta: '/netos' },
		{ id: 'clientes', etiqueta: 'Clientes', ruta: '/clientes' }
	];

	function ir(ruta) { goto(`${base}${ruta}`); }
	function abrirBuscar() { searchOpen.set(true); }
	async function cerrarSesion() {
		perfilAbierto = false;
		const { cambiarVendedor } = await import('$lib/stores/vendedor.js');
		await cambiarVendedor();
		goto(base || '/');
	}
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
	<button class="tabbar-btn tabbar-search" on:click={abrirBuscar} aria-label="Buscar producto o cliente">
		Buscar
	</button>
	<button class="tabbar-avatar" on:click={() => (perfilAbierto = !perfilAbierto)} aria-label="Perfil de vendedor" aria-expanded={perfilAbierto}>
		{(nombre || id || '?').charAt(0).toUpperCase()}
	</button>
	{#if perfilAbierto}
		<div class="tabbar-perfil" role="menu">
			<p class="tabbar-perfil-nombre">{nombre || id}</p>
			{#if nombre}<p class="tabbar-perfil-id">{id}</p>{/if}
			<button class="tabbar-perfil-item" on:click={cerrarSesion}>Cerrar sesion</button>
		</div>
	{/if}
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
	.tabbar-search { flex: 0.7; }
	.tabbar-avatar {
		width: 36px; height: 36px;
		border-radius: 50%;
		background: #008f5d;
		color: #fff;
		font-weight: 800;
		font-size: 14px;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		align-self: center;
		margin-left: 2px;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
	}
	:global(.dark) .tabbar-avatar { background: #00d084; color: #0b1220; }
	:global(html:not(.dark)) .tabbar-avatar { background: #008f5d; color: #fff; }
	.tabbar-perfil {
		position: fixed;
		bottom: 56px; right: 4px;
		z-index: 55;
		background: #151e2e;
		color: #f0f4f8;
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 12px;
		padding: 6px 0;
		min-width: 180px;
		box-shadow: 0 8px 24px rgba(0,0,0,0.35);
	}
	:global(html:not(.dark)) .tabbar-perfil { background: #fff; color: #1f2937; border-color: #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
	.tabbar-perfil-nombre { font-size: 13px; font-weight: 600; padding: 6px 12px 2px; }
	.tabbar-perfil-id { font-size: 11px; opacity: 0.6; padding: 0 12px 6px; border-bottom: 1px solid rgba(255,255,255,0.08); }
	:global(html:not(.dark)) .tabbar-perfil-id { border-color: #e5e7eb; }
	.tabbar-perfil-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 8px 12px;
		font-size: 13px;
		background: none;
		border: none;
		cursor: pointer;
		color: inherit;
		transition: background 0.1s;
	}
	.tabbar-perfil-item:hover { background: rgba(255,255,255,0.06); }
	:global(html:not(.dark)) .tabbar-perfil-item:hover { background: rgba(0,0,0,0.04); }
</style>
