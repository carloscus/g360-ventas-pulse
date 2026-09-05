<script>
	import { base } from '$app/paths';
	import { MODULES } from '$lib/navigation/modules.js';

	export let activo = null;
</script>

<nav class="tabbar" aria-label="Navegación principal">
	{#each MODULES as modulo (modulo.id)}
		<a
			class="tabbar-link"
			class:tabbar-activo={activo === modulo.id}
			href={`${base}${modulo.ruta}`}
			aria-current={activo === modulo.id ? 'page' : undefined}
		>
			<span class="tabbar-label">{modulo.etiqueta}</span>
		</a>
	{/each}
</nav>

<style>
	.tabbar {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 4px;
		width: 100%;
		height: var(--g360-nav-height);
		padding: 4px;
		background: var(--g360-chrome-surface);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.tabbar-link {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		min-height: 48px;
		padding: 8px 4px;
		border: 1px solid transparent;
		border-radius: var(--g360-nav-item-radius);
		color: var(--g360-chrome-nav-muted);
		font-size: 12px;
		font-weight: 600;
		line-height: 1.25;
		text-align: center;
		text-decoration: none;
		white-space: nowrap;
		transition: color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.tabbar-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tabbar-link:hover {
		background: var(--g360-nav-hover-bg);
	}

	.tabbar-link:active {
		transform: scale(0.98);
	}

	.tabbar-link:focus-visible {
		outline: 3px solid var(--g360-focus-ring);
		outline-offset: -3px;
	}

	.tabbar-activo {
		color: var(--g360-chrome-active);
		background: var(--g360-nav-active-bg);
		box-shadow: inset 0 -2px 0 var(--g360-chrome-active);
	}

	@media (max-width: 340px) {
		.tabbar-link {
			font-size: 11px;
			padding-inline: 2px;
		}
	}
</style>
