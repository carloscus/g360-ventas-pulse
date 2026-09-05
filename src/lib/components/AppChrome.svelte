<script>
	import G360Signature from '$lib/components/G360Signature.svelte';
	import TabBar from '$lib/components/TabBar.svelte';

	export let activo = null;
	export let showNavigation = false;
	export let version = '1.0.0';
</script>

<div class="app-chrome">
	<div class="signature-dock">
		<G360Signature {version} />
	</div>

	{#if showNavigation}
		<TabBar {activo} />
	{/if}
</div>

<style>
	.app-chrome {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: var(--g360-layer-chrome);
		display: flex;
		flex-direction: column;
		row-gap: var(--g360-chrome-stack-gap);
		padding: 0 0 var(--g360-safe-bottom);
		pointer-events: none;
	}

	.signature-dock {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		height: var(--g360-signature-height);
		min-height: var(--g360-signature-height);
		padding-inline: max(16px, env(safe-area-inset-left, 0px)) max(16px, env(safe-area-inset-right, 0px));
		background: var(--g360-chrome-surface);
		border-top: 1px solid var(--g360-chrome-border);
	}

	.signature-dock :global(.g360-signature) {
		pointer-events: auto;
	}

	.app-chrome :global(.tabbar) {
		pointer-events: auto;
	}
</style>
