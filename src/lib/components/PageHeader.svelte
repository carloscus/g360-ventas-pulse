<script>
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import ProfileMenu from '$lib/components/ProfileMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { searchOpen } from '$lib/stores/search.js';

	export let variant = 'default';
	export let title = '';
	export let subtitle = '';
	export let showBack = false;
	export let backHref = '/dashboard';
	export let backLabel = 'Volver';
	export let showLogo = false;
	export let logoSrc = `${base}/logo-cipsa.svg`;
	export let logoAlt = 'CIPSA';
	export let showProfile = false;
	export let profileName = '';
	export let profileId = '';
	export let showThemeToggle = false;
	export let showSearch = false;

	function volver() {
		if (history.length > 1) {
			history.back();
			return;
		}
		goto(`${base}${backHref}`);
	}

	function abrirBusqueda() {
		searchOpen.set(true);
	}
</script>

{#if variant === 'minimal'}
	<header class="page-header page-header-minimal">
		<div class="page-header-actions">
			<slot name="actions" />
			{#if showProfile}
				<ProfileMenu nombre={profileName} id={profileId} />
			{/if}
			{#if showThemeToggle}
				<ThemeToggle />
			{/if}
		</div>
	</header>
{:else}
	<header class="page-header">
		<div class="page-header-leading">
			{#if showBack}
				<button type="button" class="page-header-back" on:click={volver} aria-label={backLabel} title={backLabel}>
					<span aria-hidden="true">←</span>
				</button>
			{/if}

			{#if showLogo}
				<img class="page-header-logo" src={logoSrc} alt={logoAlt} />
			{/if}

			<div class="page-header-copy">
				<h1 class="page-header-title">{title}</h1>
				<p class="page-header-subtitle"><slot name="subtitle">{subtitle}</slot></p>
			</div>
		</div>

		<div class="page-header-actions">
			{#if showSearch}
				<button
					type="button"
					class="page-header-search"
					on:click={abrirBusqueda}
					aria-label="Buscar productos o clientes"
					title="Buscar productos y clientes"
				>
					<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
						<circle cx="11" cy="11" r="7" />
						<line x1="21" y1="21" x2="16.5" y2="16.5" />
					</svg>
				</button>
			{/if}
			<slot name="actions" />
			{#if showProfile}
				<ProfileMenu nombre={profileName} id={profileId} />
			{/if}
			{#if showThemeToggle}
				<ThemeToggle />
			{/if}
		</div>
	</header>
{/if}

<style>
	.page-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--g360-header-gap);
		margin-bottom: var(--g360-header-spacing);
	}

	.page-header-minimal {
		display: flex;
		justify-content: flex-end;
	}

	.page-header-leading {
		display: flex;
		align-items: center;
		gap: var(--g360-header-gap);
		min-width: 0;
	}

	.page-header-copy {
		min-width: 0;
	}

	.page-header-title {
		margin: 0;
		min-width: 0;
		overflow: hidden;
		color: #1f2937;
		font-size: var(--g360-header-title-size);
		font-weight: 700;
		line-height: 1.25;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.page-header-subtitle {
		margin: 2px 0 0;
		color: #6b7280;
		font-size: var(--g360-header-meta-size);
		line-height: 1.4;
		overflow-wrap: anywhere;
	}

	.page-header-logo {
		width: auto;
		height: var(--g360-header-logo-height);
		flex: 0 0 auto;
	}

	.page-header-back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		min-width: 48px;
		border: 0;
		border-radius: 12px;
		background: transparent;
		color: #6b7280;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.page-header-back:hover {
		background: rgba(0, 0, 0, 0.04);
		color: #1f2937;
	}

	.page-header-back:active {
		transform: scale(0.97);
	}

	.page-header-search {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		min-width: 48px;
		border: 0;
		border-radius: 12px;
		background: transparent;
		color: #6b7280;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.page-header-search:hover {
		background: rgba(0, 0, 0, 0.04);
		color: #1f2937;
	}

	.page-header-search:active {
		transform: scale(0.97);
	}

	.page-header-back:focus-visible,
	:global(.page-header button:focus-visible) {
		outline: 3px solid var(--g360-focus-ring);
		outline-offset: 2px;
	}

	.page-header-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
		min-width: 0;
		flex-wrap: wrap;
	}

	:global(.dark) .page-header-title {
		color: #f0f4f8;
	}

	:global(.dark) .page-header-subtitle,
	:global(.dark) .page-header-back {
		color: #94a3b8;
	}

	:global(.dark) .page-header-back:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #f0f4f8;
	}

	:global(.dark) .page-header-search {
		color: #94a3b8;
	}

	:global(.dark) .page-header-search:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #f0f4f8;
	}

	
</style>
