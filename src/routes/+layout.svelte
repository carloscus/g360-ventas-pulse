<script>
	import '../app.css';
	import PWAInstallPrompt from '$lib/components/PWAInstallPrompt.svelte';
	import IgvCalculator from '$lib/components/IgvCalculator.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import ProductSearchModal from '$lib/components/ProductSearchModal.svelte';
	import { vendedorActivo } from '$lib/stores/vendedor.js';
	import { searchOpen } from '$lib/stores/search.js';
	import { page } from '$app/stores';

	export let data;

	$: activo = $page.url.pathname.includes('dashboard') ? 'hoy'
		: $page.url.pathname.includes('radar') ? 'radar'
		: $page.url.pathname.includes('netos') ? 'netos'
		: 'clientes';
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<div class="min-h-screen">
	<slot />
</div>

<TabBar activo={activo} nombre={$vendedorActivo?.nombre || ''} id={$vendedorActivo?.id || ''} />
<ProductSearchModal bind:open={$searchOpen} />
<IgvCalculator />
<PWAInstallPrompt />
