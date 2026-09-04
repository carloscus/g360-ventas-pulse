<!-- ============================================================
     Componente SummaryView — Resumen de devolución
     Muestra totales, agrupación por SKU, registros individuales
     y acciones de exportar Excel / cerrar registro.
     Se integra dentro de +page.svelte como paso "summary".
     ============================================================ -->
<script>
	// Dispatcher para emitir eventos al componente padre
	import { createEventDispatcher } from 'svelte';

	// Stores: datos del cliente y líneas de devolución
	import {
		clientData,
		returnLines,
		clearAll
	} from '$lib/stores/app';

	// Notificaciones toast
	import { success, error } from '$lib/stores/toasts.js';

	// Limpieza de IndexedDB al cerrar registro
	import { clearState } from '$lib/db/indexedDB';

	// Sello de marca
	import G360Signature from '$lib/components/G360Signature.svelte';

	const dispatch = createEventDispatcher();

	// ---- Props recibidas del padre ----
	/** Callback para abrir la edición de una línea */
	export let onEditLine;

	// ---- Estado local ----
	let isExporting = false;
	let showConfirmFinalize = false;

	// ---- Métricas reactivas calculadas ----
	$: uniqueLineas = [...new Set($returnLines.filter(l => l.linea).map(l => l.linea))].length;
	$: totalUnits = $returnLines.reduce((s, l) => s + (l.cantidad || 0), 0);
	$: totalWeight = $returnLines.reduce((s, l) => s + ((l.cantidad || 0) * (l.peso_kg || 0)), 0);
	$: totalBoxes = $returnLines.reduce((s, l) => {
		const un_bx = l.un_bx || 1;
		return s + Math.ceil((l.cantidad || 0) / un_bx);
	}, 0);
	$: categories = [...new Set($returnLines.filter(l => l.categoria).map(l => l.categoria))];

	/**
	 * Agrupa las líneas por código de producto (SKU).
	 * Acumula cantidad, peso y observaciones por cada SKU.
	 */
	$: skuSummary = (() => {
		const groups = {};
		$returnLines.forEach(line => {
			const key = line.codigo;
			if (!groups[key]) {
				groups[key] = {
					codigoAlmacen: line.codigoAlmacen || 'VES',
					codigo: line.codigo,
					ean: line.ean || '',
					nombre: line.nombre_corto || line.nombre || '',
					linea: line.linea || '',
					categoria: line.categoria || '',
					totalCantidad: 0,
					totalPeso: 0,
					un_bx: line.un_bx || 1,
					observaciones: []
				};
			}
			groups[key].totalCantidad += line.cantidad || 0;
			groups[key].totalPeso += (line.cantidad || 0) * (line.peso_kg || 0);
			if (line.observacion) {
				groups[key].observaciones.push(line.observacion);
			}
		});
		return Object.values(groups);
	})();

	// ---- Acciones ----

	/** Elimina una línea individual del listado */
	function removeLine(id) {
		returnLines.update(lines => lines.filter(l => l.id !== id));
	}

	/** Exporta el detalle de devolución a archivo Excel (.xlsx) */
	async function exportToExcel() {
		if ($returnLines.length === 0) return;

		isExporting = true;
		try {
			const { generateDevolucionExcel } = await import('$lib/export/excelGenerator.js');
			await generateDevolucionExcel($clientData, $returnLines);
			success('Archivo Excel generado');
		} catch (err) {
			console.error('Error exportando:', err);
			error('Error al generar el archivo Excel');
		} finally {
			isExporting = false;
		}
	}

	/** Cierra el registro: limpia stores y IndexedDB, vuelve al formulario */
	async function finalizeReturn() {
		if ($returnLines.length === 0) {
			error('No hay productos para devolver');
			return;
		}

		try {
			await clearState();
			clearAll();
			success('Registro cerrado correctamente');
			showConfirmFinalize = false;
			dispatch('finalize');
		} catch (err) {
			console.error('Error cerrando:', err);
			error('Error al cerrar el registro');
		}
	}
</script>

<!-- Meta SEO para esta vista -->
<svelte:head>
	<title>Devoluciones - CIPSA</title>
	<meta name="description" content="Gestión de devoluciones de productos CIPSA" />
</svelte:head>

<!-- Panel de totales: líneas, unidades, cajas y peso -->
<section aria-label="Totales de devolución" class="glass-card p-3 mb-4 animate-fadeIn">
	<div class="flex items-center justify-around divide-x divide-g360-surface/50 dark:divide-white/5">
		<div class="text-center px-3">
			<p class="text-xl font-bold text-primary-600 dark:text-primary-400">{uniqueLineas}</p>
			<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Líneas</p>
		</div>
		<div class="text-center px-3">
			<p class="text-xl font-bold text-success-600 dark:text-success-400">{totalUnits}</p>
			<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Uds</p>
		</div>
		<div class="text-center px-3">
			<p class="text-xl font-bold text-warning-600 dark:text-warning-400">{totalBoxes}~</p>
			<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Cajas</p>
		</div>
		<div class="text-center px-3">
			<p class="text-xl font-bold text-g360-accent dark:text-g360-accentDark">{totalWeight.toFixed(0)}</p>
			<p class="text-xs uppercase tracking-wider text-g360-muted dark:text-g360-mutedDark font-semibold mt-0.5">Kg</p>
		</div>
	</div>
</section>

<!-- Etiquetas de categorías presentes -->
{#if categories.length > 0}
	<section aria-label="Categorías" class="flex items-center gap-2 mb-4 animate-fadeIn" style="animation-delay: 0.1s">
		<span class="text-xs font-semibold text-g360-muted dark:text-g360-mutedDark">Categorías:</span>
		{#each categories as cat}
			<span class="badge bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-[10px]">{cat}</span>
		{/each}
	</section>
{/if}

<!-- Resumen agrupado por SKU -->
<section aria-label="Resumen por SKU" class="space-y-1.5 mb-4 animate-fadeIn" style="animation-delay: 0.2s">
	<h2 class="text-sm font-semibold text-g360-text dark:text-g360-textDark">Resumen por SKU</h2>
	{#each skuSummary as sku, i}
		<div class="glass-card p-2 animate-slideUp" style="animation-delay: {0.05 * i}s; animation-fill-mode: both;">
			<div class="flex items-center gap-2 mb-1.5">
				<span class="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{sku.codigo}</span>
				{#if sku.linea}
					<span class="badge badge-primary text-[10px]">{sku.linea}</span>
				{/if}
				<span class="text-xs text-g360-text dark:text-g360-textDark truncate flex-1">{sku.nombre}</span>
			</div>
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-1 text-xs">
					<span class="font-bold text-g360-text dark:text-g360-textDark">{sku.totalCantidad}</span>
					<span class="text-g360-muted dark:text-g360-mutedDark">uds</span>
				</div>
				<span class="text-g360-muted dark:text-g360-mutedDark">·</span>
				<div class="flex items-center gap-1 text-xs">
					<span class="font-bold text-g360-text dark:text-g360-textDark">
						{#if sku.un_bx > 0}
							{Math.floor(sku.totalCantidad / sku.un_bx)}
							{#if sku.totalCantidad % sku.un_bx > 0}
								<span class="text-warning-500">+{sku.totalCantidad % sku.un_bx}</span>
							{/if}
						{:else}
							-
						{/if}
					</span>
					<span class="text-g360-muted dark:text-g360-mutedDark">cajas</span>
				</div>
				<span class="text-g360-muted dark:text-g360-mutedDark">·</span>
				<div class="flex items-center gap-1 text-xs">
					<span class="font-bold text-g360-text dark:text-g360-textDark">{sku.totalPeso.toFixed(0)}</span>
					<span class="text-g360-muted dark:text-g360-mutedDark">kg</span>
				</div>
			</div>
			{#if sku.observaciones.length > 0}
				<div class="mt-1.5 pt-1.5 border-t border-g360-surface/30 dark:border-white/5">
					{#each sku.observaciones as obs, i}
						<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark truncate">
							<span class="text-primary-500 font-bold">{i + 1}.</span> {obs}
						</p>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</section>

<!-- Listado de registros individuales con opciones de editar/eliminar -->
<section aria-label="Registros individuales" class="space-y-2 mb-4 animate-fadeIn" style="animation-delay: 0.3s">
	<h2 class="text-sm font-semibold text-g360-text dark:text-g360-textDark">SKU — Registros</h2>
	{#each $returnLines as line, i (line.id)}
		<div class="glass-card p-3 animate-slideUp" style="animation-delay: {0.05 * i}s; animation-fill-mode: both;">
			<div class="flex items-start justify-between mb-2">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 flex-wrap">
						<span class="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{line.codigo}</span>
						{#if line.linea}
							<span class="badge badge-primary text-[10px]">{line.linea}</span>
						{/if}
						{#if line.foto}
							<span class="inline-flex items-center gap-0.5 text-[10px] text-success-600 dark:text-success-400 font-medium">
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
								</svg>
								Foto
							</span>
						{:else}
							<span class="inline-flex items-center gap-0.5 text-[10px] text-g360-muted/50 dark:text-g360-mutedDark/40 font-medium">
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
								</svg>
								Sin foto
							</span>
						{/if}
					</div>
					<p class="text-xs text-g360-text dark:text-g360-textDark truncate mt-0.5">{line.nombre_corto || line.nombre}</p>
				</div>
				<div class="flex items-center gap-1 flex-shrink-0 ml-2">
					<button
						on:click={() => onEditLine(line)}
						class="p-1.5 text-g360-muted hover:text-primary-500 active:bg-primary-50 dark:active:bg-primary-900/20 rounded-lg transition-all"
						aria-label="Editar"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
						</svg>
					</button>
					<button
						on:click={() => removeLine(line.id)}
						class="p-1.5 text-g360-muted hover:text-danger-500 active:bg-danger-50 dark:active:bg-danger-900/20 rounded-lg transition-all"
						aria-label="Eliminar"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
						</svg>
					</button>
				</div>
			</div>
			<div class="flex items-center gap-3 text-xs text-g360-muted dark:text-g360-mutedDark">
				<span class="font-bold text-g360-text dark:text-g360-textDark">{line.cantidad} uds</span>
				{#if line.observacion}
					<span>·</span>
					<span class="truncate">{line.observacion}</span>
				{/if}
			</div>
		</div>
	{/each}
</section>

<!-- Botones de acción: exportar Excel y cerrar registro -->
<section aria-label="Acciones de resumen" class="flex flex-col sm:flex-row gap-3">
	<button
		on:click={exportToExcel}
		disabled={isExporting || $returnLines.length === 0}
		class="btn-success flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{#if isExporting}
			<svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
			</svg>
		{:else}
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
			</svg>
		{/if}
		Exportar Excel
	</button>
	<button
		on:click={() => showConfirmFinalize = true}
		class="btn-danger flex-1"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
		</svg>
		Cerrar Registro
	</button>
</section>

<!-- Modal de confirmación para cerrar registro -->
{#if showConfirmFinalize}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		on:click={(e) => e.target === e.currentTarget && (showConfirmFinalize = false)}
		on:keydown={(e) => e.key === 'Escape' && (showConfirmFinalize = false)}
		role="alertdialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="bg-white dark:bg-g360-surfaceDark rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleIn">
			<h3 class="text-base font-bold text-g360-text dark:text-g360-textDark mb-2">Cerrar registro</h3>
			<p class="text-sm text-g360-muted dark:text-g360-mutedDark mb-6">
				¿Está seguro de cerrar este registro? Se limpiarán todos los datos del formulario.
			</p>
			<div class="flex gap-3">
				<button on:click={() => showConfirmFinalize = false} class="btn-secondary flex-1">Cancelar</button>
				<button on:click={finalizeReturn} class="btn-danger flex-1">Confirmar</button>
			</div>
		</div>
	</div>
{/if}

<G360Signature cliente="CIPSA" />
