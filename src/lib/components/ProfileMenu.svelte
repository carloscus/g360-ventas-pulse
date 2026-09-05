<script>
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { cambiarVendedor } from '$lib/stores/vendedor.js';

	export let nombre = '';
	export let id = '';

	let abierto = false;

	$: inicial = (nombre || id || '?').charAt(0).toUpperCase();

	function toggle() { abierto = !abierto; }

	async function cerrarSesion() {
		abierto = false;
		await cambiarVendedor();
		goto(base || '/');
	}

	function fuera(e) {
		if (abierto && !e.currentTarget.contains(e.target)) abierto = false;
	}
</script>

<svelte:window on:pointerdown={fuera} />

<div class="profile-root">
	<button
		type="button"
		class="profile-avatar"
		on:click={toggle}
		aria-expanded={abierto}
		aria-haspopup="true"
		title="Perfil de vendedor"
		aria-label="Perfil de vendedor"
	>
		{inicial}
	</button>
	{#if abierto}
		<div class="profile-menu" role="menu">
			<div class="profile-info">
				<p class="profile-name">{nombre || id}</p>
				{#if nombre}<p class="profile-id">{id}</p>{/if}
			</div>
			<button type="button" class="profile-item" on:click={cerrarSesion} role="menuitem">Cerrar sesion</button>
		</div>
	{/if}
</div>

<style>
	.profile-root { position: relative; }
	.profile-avatar {
		width: 36px; height: 36px;
		border-radius: 50%;
		background: #008f5d;
		color: #fff;
		font-weight: 800;
		font-size: 15px;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.15s ease;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	:global(.dark) .profile-avatar { background: #00d084; color: #0b1220; }
	.profile-avatar:hover { transform: scale(1.06); }
	.profile-avatar:focus-visible {
		outline: 3px solid var(--g360-focus-ring);
		outline-offset: 2px;
	}
	.profile-menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		z-index: var(--g360-layer-float);
		background: #151e2e;
		color: #f0f4f8;
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 12px;
		padding: 6px 0;
		min-width: 180px;
		box-shadow: 0 8px 24px rgba(0,0,0,0.35);
	}
	:global(.dark) .profile-menu { background: #151e2e; }
	:global(html:not(.dark)) .profile-menu { background: #fff; color: #1f2937; border-color: #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
	:global(html:not(.dark)) .profile-avatar { background: #008f5d; color: #fff; }
	.profile-info { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 4px; }
	:global(html:not(.dark)) .profile-info { border-color: #e5e7eb; }
	.profile-name { font-size: 13px; font-weight: 600; }
	.profile-id { font-size: 11px; opacity: 0.6; margin-top: 1px; }
	.profile-item {
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
	.profile-item:hover { background: rgba(255,255,255,0.06); }
	:global(html:not(.dark)) .profile-item:hover { background: rgba(0,0,0,0.04); }
</style>

