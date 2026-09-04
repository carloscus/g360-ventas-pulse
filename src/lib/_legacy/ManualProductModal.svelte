<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let initialCodigo = '';
	export let isOpen = false;

	let codigo = '';
	let nombre = '';
	let ean = '';
	let precio = '';
	let observacion = '';

	$: if (isOpen) {
		codigo = initialCodigo;
		nombre = '';
		ean = '';
		precio = '';
		observacion = '';
	}

	function close() {
		isOpen = false;
	}

	function confirm() {
		if (!codigo.trim()) return;
		if (!nombre.trim()) return;

		dispatch('add', {
			codigo: codigo.trim(),
			nombre: nombre.trim(),
			ean: ean.trim(),
			precio: parseFloat(precio) || 0,
			observacion: observacion.trim()
		});

		close();
	}

	function handleClickOutside(e) {
		if (e.target === e.currentTarget) close();
	}

	function handleKeydown(e) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
		on:click={handleClickOutside}
		on:keydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="bg-white dark:bg-g360-surfaceDark w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slideUp sm:animate-scaleIn max-h-[90vh] overflow-y-auto"
			on:click|stopPropagation
			on:touchstart|stopPropagation
		>
			<div class="p-5 sm:p-6">
				<div class="flex items-center justify-between mb-5">
					<h3 class="text-lg font-bold text-g360-text dark:text-g360-textDark">
						Agregar Producto Manual
					</h3>
					<button
						on:click={close}
						class="p-2 text-g360-muted hover:text-g360-text dark:hover:text-g360-textDark hover:bg-g360-bg dark:hover:bg-white/10 rounded-xl transition-all touch-target"
						aria-label="Cerrar"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				</div>
				<div class="space-y-4">
					<div class="input-group">
						<label for="manual-codigo" class="input-label">
							Código <span class="text-danger-500">*</span>
						</label>
						<input
							id="manual-codigo"
							type="text"
							bind:value={codigo}
							class="glass-input"
							placeholder="SKU del producto"
							aria-required="true"
						/>
					</div>
					<div class="input-group">
						<label for="manual-nombre" class="input-label">
							Nombre <span class="text-danger-500">*</span>
						</label>
						<input
							id="manual-nombre"
							type="text"
							bind:value={nombre}
							class="glass-input"
							placeholder="Descripción del producto"
							aria-required="true"
						/>
					</div>
					<div class="input-group">
						<label for="manual-ean" class="input-label">
							EAN <span class="text-g360-muted dark:text-g360-mutedDark font-normal">(opcional)</span>
						</label>
						<input
							id="manual-ean"
							type="text"
							bind:value={ean}
							class="glass-input"
							placeholder="Código de barras"
						/>
					</div>
					<div class="input-group">
						<label for="manual-precio" class="input-label">
							Precio lista
						</label>
						<input
							id="manual-precio"
							type="number"
							bind:value={precio}
							class="glass-input"
							placeholder="0.00"
							step="0.01"
							min="0"
						/>
					</div>
					<div class="input-group">
						<label for="manual-obs" class="input-label">
							Observación <span class="text-danger-500">*</span>
						</label>
						<textarea
							id="manual-obs"
							bind:value={observacion}
							class="glass-input resize-none"
							rows="3"
							placeholder="Motivo de devolución..."
							aria-required="true"
						></textarea>
					</div>
				</div>
				<div class="flex gap-3 justify-end mt-6">
					<button
						on:click={close}
						class="btn-secondary"
					>
						Cancelar
					</button>
					<button
						on:click={confirm}
						disabled={!codigo.trim() || !nombre.trim()}
						class="btn-success disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
						</svg>
						Agregar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
