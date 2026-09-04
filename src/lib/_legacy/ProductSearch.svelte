<script>
	import { createEventDispatcher } from 'svelte';
	import { productos, filterProducts } from '$lib/stores/products';

	const dispatch = createEventDispatcher();

	export let onAddManual;

	let searchQuery = '';
	let searchResults = [];
	let showResults = false;
	let showNoResults = false;
	let timeout = null;
	let isSearching = false;
	let searchInput;

	function handleSearch(e) {
		searchQuery = e.target.value;
		isSearching = searchQuery.trim().length > 0;
		clearTimeout(timeout);

		if (!searchQuery.trim()) {
			showResults = false;
			showNoResults = false;
			isSearching = false;
			return;
		}

		timeout = setTimeout(() => {
			searchResults = filterProducts(searchQuery, $productos);
			showResults = searchResults.length > 0;
			showNoResults = searchResults.length === 0;
			isSearching = false;
		}, 250);
	}

	function selectProduct(p) {
		dispatch('select', p);
		searchQuery = '';
		showResults = false;
		showNoResults = false;
		isSearching = false;
	}

	function handleAddClick() {
		const code = searchQuery.trim();
		if (!code) return;

		const producto = $productos.find(p => p.codigo === code);
		if (producto) {
			selectProduct(producto);
		} else {
			onAddManual();
		}
	}
</script>

<section class="glass-card mb-4 sm:mb-6 animate-fadeIn overflow-hidden">
	<div class="p-4 sm:p-5 border-b border-g360-surface/50 dark:border-white/5">
		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
			<h2 class="section-title whitespace-nowrap">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
				</svg>
				Buscar Producto
			</h2>
			<div class="flex-1 flex gap-2 w-full sm:w-auto">
				<div class="relative flex-1">
					<input
						type="text"
						value={searchQuery}
						on:input={handleSearch}
						class="glass-input pl-10"
						placeholder="Código o nombre..."
						aria-label="Buscar producto por código o nombre"
					/>
					<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-g360-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
					</svg>
					{#if isSearching}
						<svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 loading-spinner" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
						</svg>
					{/if}
				</div>
				<button
					on:click={handleAddClick}
					class="btn-primary whitespace-nowrap"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
					</svg>
					Agregar
				</button>
			</div>
		</div>
	</div>

	{#if showResults}
		<div class="max-h-72 overflow-y-auto overscroll-contain">
			{#each searchResults as p (p.codigo)}
				<button
					on:click={() => selectProduct(p)}
					class="w-full flex items-center gap-3 px-4 py-3 border-b border-g360-surface/50 dark:border-white/5 last:border-b-0 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 active:bg-primary-100 dark:active:bg-primary-900/20 transition-colors text-left"
				>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<span class="font-mono text-sm font-semibold text-g360-text dark:text-g360-textDark">{p.codigo}</span>
							{#if p.linea}
								<span class="badge badge-primary text-[10px]">{p.linea}</span>
							{/if}
						</div>
						<p class="text-sm text-g360-muted dark:text-g360-mutedDark truncate">{p.nombre_corto || p.nombre || '-'}</p>
					</div>
					<div class="text-right flex-shrink-0">
						{#if p.ean}
							<p class="text-xs font-mono text-g360-muted dark:text-g360-mutedDark">{p.ean}</p>
						{/if}
						{#if p.precio}
							<p class="text-sm font-semibold text-g360-text dark:text-g360-textDark">S/ {p.precio.toFixed(2)}</p>
						{/if}
					</div>
				</button>
			{/each}
		</div>
		<div class="px-4 py-2 border-t border-g360-surface/50 dark:border-white/5 text-xs text-g360-muted dark:text-g360-mutedDark bg-g360-bg/50 dark:bg-white/5">
			{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} — toque para agregar
		</div>
	{:else if showNoResults}
		<div class="px-4 py-8 text-center">
			<svg class="w-12 h-12 mx-auto text-g360-muted/40 dark:text-g360-mutedDark/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
			<p class="text-sm text-g360-muted dark:text-g360-mutedDark mb-3">
				No se encontraron productos
			</p>
			<button
				on:click={onAddManual}
				class="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
			>
				+ Agregar manualmente
			</button>
		</div>
	{:else}
		<div class="px-4 py-8 text-center">
			<svg class="w-12 h-12 mx-auto text-g360-muted/40 dark:text-g360-mutedDark/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
			</svg>
			<p class="text-sm text-g360-muted dark:text-g360-mutedDark">
				Escriba un código o nombre para buscar
			</p>
		</div>
	{/if}
</section>
