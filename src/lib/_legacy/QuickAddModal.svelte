<!-- ============================================================
     Componente QuickAddModal — Modal para agregar o editar producto
     Permite ingresar cantidad, observación y foto opcional.
     Modo agregar: recibe prop "product"
     Modo edición: recibe prop "editLine" con datos pre-llenados
     ============================================================ -->
<script>
	import { createEventDispatcher } from 'svelte';
	import { error, success } from '$lib/stores/toasts.js';

	const dispatch = createEventDispatcher();

	// ---- Props ----
	/** Producto del catálogo (modo agregar) */
	export let product = null;
	/** Controla visibilidad del modal */
	export let isOpen = false;
	/** Línea existente a editar (modo edición) */
	export let editLine = null;

	// ---- Estado interno del formulario ----
	let cantidad = 1;
	let observacion = '';
	let foto = null;
	let cantidadInput;
	let initialized = false;

	// Determina si estamos en modo edición
	$: isEditing = !!editLine;

	/**
	 * Inicializa el formulario con valores por defecto al agregar un producto nuevo.
	 * Se ejecuta solo una vez por apertura del modal.
	 */
	$: if (product && isOpen && !initialized) {
		cantidad = 1;
		observacion = '';
		foto = null;
		initialized = true;
	}

	/**
	 * Inicializa el formulario con los datos existentes de la línea a editar.
	 * Se ejecuta solo una vez por apertura del modal.
	 */
	$: if (editLine && isOpen && !initialized) {
		cantidad = editLine.cantidad || 1;
		observacion = editLine.observacion || '';
		foto = editLine.foto || null;
		initialized = true;
	}

	// Resetea el flag de inicialización al cerrar el modal
	$: if (!isOpen) {
		initialized = false;
	}

	// Validación: cantidad positiva y observación no vacía
	$: isValid = cantidad > 0 && observacion.trim().length > 0;

	/** Cierra el modal y notifica al padre */
	function close() {
		isOpen = false;
		dispatch('close');
	}

	/** Selecciona todo el texto del campo cantidad al enfocar */
	function selectAll() {
		if (cantidadInput) {
			setTimeout(() => cantidadInput.select(), 50);
		}
	}

	/**
	 * Procesa la imagen seleccionada por el usuario.
	 * Valida tipo y tamaño (máx 10MB), convierte a base64.
	 */
	function handlePhotoCapture(e) {
		const file = e.target.files[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			error('El archivo no es una imagen');
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			error('La imagen supera los 10MB');
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			foto = event.target.result;
			success('Foto adjuntada');
		};
		reader.onerror = () => error('Error al leer la imagen');
		reader.readAsDataURL(file);
		// Limpia el input para permitir re-subir el mismo archivo
		e.target.value = '';
	}

	/** Elimina la foto adjunta */
	function removePhoto() {
		foto = null;
	}

	/**
	 * Confirma y emite el evento correspondiente:
	 * - 'confirm' para agregar nuevo producto
	 * - 'update' para editar línea existente
	 */
	function confirm() {
		if (!isValid) return;

		if (isEditing) {
			dispatch('update', {
				lineId: editLine.id,
				cantidad: cantidad,
				observacion: observacion.trim(),
				foto
			});
		} else {
			dispatch('confirm', {
				product,
				cantidad: cantidad,
				observacion: observacion.trim(),
				foto
			});
		}

		isOpen = false;
		editLine = null;
	}

	/** Cierra el modal con tecla Escape */
	function handleKeydown(e) {
		if (e.key === 'Escape') close();
	}

	/** Cierra el modal al hacer clic fuera del contenido */
	function handleClickOutside(e) {
		if (e.target === e.currentTarget) close();
	}
</script>

{#if isOpen && (product || editLine)}
	<!-- Overlay del modal -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
		on:click={handleClickOutside}
		on:keydown={handleKeydown}
		role="dialog"
		aria-modal="true"
	>
		<!-- Contenido del modal -->
		<div
			class="bg-white dark:bg-g360-surfaceDark w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slideUp sm:animate-scaleIn max-h-[90vh] overflow-y-auto"
			on:click|stopPropagation
			on:touchstart|stopPropagation
		>
			<div class="p-5 sm:p-6">
				<!-- Encabezado del producto -->
				<div class="flex items-start justify-between mb-4">
					<div class="flex-1 min-w-0 mr-3">
						<div class="flex items-center gap-2 mb-1">
							<span class="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{(editLine || product).codigo}</span>
							{#if (editLine || product).linea}
								<span class="badge badge-primary text-[10px]">{(editLine || product).linea}</span>
							{/if}
						</div>
						<p class="text-sm text-g360-text dark:text-g360-textDark truncate">{(editLine || product).nombre_corto || (editLine || product).nombre}</p>
						{#if (editLine || product).ean}
							<p class="text-xs text-g360-muted dark:text-g360-mutedDark font-mono mt-0.5">EAN: {(editLine || product).ean}</p>
						{/if}
					</div>
					<button
						on:click={close}
						class="p-2 text-g360-muted hover:text-g360-text dark:hover:text-g360-textDark hover:bg-g360-bg dark:hover:bg-white/10 rounded-xl transition-all flex-shrink-0 touch-target"
						aria-label="Cerrar"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
					</button>
				</div>

				<!-- Campo de cantidad con botones +/- -->
				<div class="input-group mb-4">
					<label for="quick-cantidad" class="input-label">Cantidad <span class="text-danger-500">*</span></label>
					<div class="flex items-center gap-2">
						<button
							type="button"
							on:click={() => cantidad = Math.max(1, cantidad - 1)}
							class="w-12 h-12 flex items-center justify-center rounded-xl bg-g360-bg dark:bg-white/10 text-g360-text dark:text-g360-textDark active:bg-g360-bg/80 dark:active:bg-white/15 active:scale-95 transition-all font-bold text-xl touch-target"
							aria-label="Reducir cantidad"
						>
							−
						</button>
						<input
							id="quick-cantidad"
							type="number"
							bind:this={cantidadInput}
							bind:value={cantidad}
							on:focus={selectAll}
							class="flex-1 h-12 px-3 text-center border border-g360-surface/50 dark:border-white/10 rounded-xl bg-white/60 dark:bg-white/5 text-g360-text dark:text-g360-textDark text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/50"
							min="1"
							step="1"
						/>
						<button
							type="button"
							on:click={() => cantidad = cantidad + 1}
							class="w-12 h-12 flex items-center justify-center rounded-xl bg-g360-bg dark:bg-white/10 text-g360-text dark:text-g360-textDark active:bg-g360-bg/80 dark:active:bg-white/15 active:scale-95 transition-all font-bold text-xl touch-target"
						>
							+
						</button>
					</div>
				</div>

				<!-- Campo de observación -->
				<div class="input-group mb-4">
					<label for="quick-obs" class="input-label">Observación <span class="text-danger-500">*</span></label>
					<textarea
						id="quick-obs"
						bind:value={observacion}
						class="glass-input resize-none"
						rows="3"
						placeholder="Motivo de devolución..."
					></textarea>
				</div>

				<!-- Selector de foto (opcional) -->
				<div class="flex items-center gap-2 mb-5">
					{#if foto}
						<div class="relative flex-shrink-0">
							<img src={foto} alt="Evidencia" class="w-14 h-14 object-cover rounded-xl border border-g360-surface/50 dark:border-white/10" />
							<button
								on:click={removePhoto}
								class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger-500 text-white rounded-full flex items-center justify-center text-xs shadow-md"
								aria-label="Quitar foto"
							>
								✕
							</button>
						</div>
					{/if}
					<label class="btn-ghost cursor-pointer text-xs flex-shrink-0">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
						</svg>
						{foto ? 'Cambiar foto' : 'Foto (opcional)'}
						<input
							type="file"
							accept="image/*"
							capture="environment"
							on:change={handlePhotoCapture}
							class="hidden"
						/>
					</label>
				</div>

				<!-- Botones de acción -->
				<div class="flex gap-3">
					<button
						on:click={close}
						class="btn-secondary flex-1"
					>
						Cancelar
					</button>
					<button
						on:click={confirm}
						disabled={!isValid}
						class="btn-success flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
						</svg>
						{isEditing ? 'Guardar cambios' : 'Agregar a la lista'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
