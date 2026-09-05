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
	<div class="pwa-install-prompt animate-slideUp">
		<div class="glass-card p-4 flex items-center gap-3 shadow-lg">
			<div class="flex-1 min-w-0">
				<p class="text-sm font-semibold text-g360-text dark:text-g360-textDark">
					Instalar app
				</p>
				<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
					Accede rápido desde tu pantalla de inicio
				</p>
			</div>
			<button
				on:click={installApp}
				class="min-h-[44px] px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
			>
				Instalar
			</button>
			<button
				on:click={dismiss}
				class="min-h-[44px] min-w-[44px] p-2 rounded-xl hover:bg-g360-bg dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
				aria-label="Cerrar"
			>
				<svg class="w-4 h-4 text-g360-muted dark:text-g360-mutedDark" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
				</svg>
			</button>
		</div>
	</div>
{/if}

<style>
	.pwa-install-prompt {
		position: fixed;
		left: 12px;
		right: 12px;
		bottom: var(--g360-banner-bottom);
		z-index: var(--g360-layer-prompt);
	}

	@media (min-width: 640px) {
		.pwa-install-prompt {
			left: 24px;
			right: 24px;
		}
	}
</style>
