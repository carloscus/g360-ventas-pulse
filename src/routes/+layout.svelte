<script>
	import '../app.css';
	import PWAInstallPrompt from '$lib/components/PWAInstallPrompt.svelte';

	export let data;
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<div class="min-h-screen">
	<slot />
</div>

<PWAInstallPrompt />
