<script>
	import '../app.css';
	import AppChrome from '$lib/components/AppChrome.svelte';
	import PWAInstallPrompt from '$lib/components/PWAInstallPrompt.svelte';
	import IgvCalculator from '$lib/components/IgvCalculator.svelte';
	import ProductSearchModal from '$lib/components/ProductSearchModal.svelte';
	import { vendedorActivo } from '$lib/stores/vendedor.js';
	import { searchOpen } from '$lib/stores/search.js';
	import { page } from '$app/stores';
	import { getActiveModule } from '$lib/navigation/modules.js';

	export let data;

	$: activo = getActiveModule($page.url.pathname);
	$: showNavigation = Boolean($vendedorActivo) && Boolean(activo);
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<div class="app-shell" class:app-shell--navigation={showNavigation}>
	<div class="app-shell-content">
		<slot />
	</div>

	<AppChrome {activo} {showNavigation} version="1.0.0" />
	<ProductSearchModal bind:open={$searchOpen} />
	<IgvCalculator />
	<PWAInstallPrompt />
</div>
