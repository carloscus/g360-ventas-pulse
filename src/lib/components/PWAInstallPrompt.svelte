<script>
	import { onMount } from 'svelte';

	let deferredPrompt = null;
	let showInstallBanner = false;
	let isInstalled = false;

	onMount(() => {
		if (window.matchMedia('(display-mode: standalone)').matches) {
			isInstalled = true;
			return;
		}

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
		};
	});

	function handleBeforeInstallPrompt(e) {
		e.preventDefault();
		deferredPrompt = e;
		showInstallBanner = true;
	}

	function handleAppInstalled() {
		isInstalled = true;
		showInstallBanner = false;
	}

	async function installApp() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') {
			showInstallBanner = false;
		}
		deferredPrompt = null;
	}

	function dismiss() {
		showInstallBanner = false;
	}
</script>

{#if showInstallBanner && !isInstalled}
	<div class="fixed bottom-4 left-4 right-4 z-50 animate-slideUp">
		<div class="glass-card p-4 flex items-center gap-3 shadow-lg">
			<div class="flex-1">
				<p class="text-sm font-semibold text-g360-text dark:text-g360-textDark">
					Instalar app
				</p>
				<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
					Accede rápido desde tu pantalla de inicio
				</p>
			</div>
			<button
				on:click={installApp}
				class="px-4 py-2 rounded-xl bg-g360-primary text-white text-sm font-semibold hover:bg-g360-primary/90 transition-colors"
			>
				Instalar
			</button>
			<button
				on:click={dismiss}
				class="p-2 rounded-xl hover:bg-g360-bg dark:hover:bg-white/10 transition-colors"
				aria-label="Cerrar"
			>
				<svg class="w-4 h-4 text-g360-muted dark:text-g360-mutedDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>
	</div>
{/if}
