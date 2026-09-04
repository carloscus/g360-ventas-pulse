<script>
	import { onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { returnLines } from '$lib/stores/app';
	import { warning } from '$lib/stores/toasts.js';

	const dispatch = createEventDispatcher();

	let totalUnits = 0;
	const unsubReturnLines = returnLines.subscribe(lines => {
		totalUnits = lines.reduce((s, l) => s + (l.cantidad || 0), 0);
	});

	onDestroy(unsubReturnLines);

	let x = typeof window !== 'undefined' ? 16 : 0;
	let y = typeof window !== 'undefined' ? Math.max(0, window.innerHeight - 160) : 0;
	let startX = 0;
	let startY = 0;
	let isDragging = false;
	let pillEl;

	function onPointerDown(e) {
		isDragging = false;
		startX = e.clientX - x;
		startY = e.clientY - y;
		document.addEventListener('pointermove', onPointerMove);
		document.addEventListener('pointerup', onPointerUp);
	}

	function onPointerMove(e) {
		isDragging = true;
		const w = pillEl?.offsetWidth || 120;
		const h = pillEl?.offsetHeight || 50;
		x = Math.max(0, Math.min(window.innerWidth - w, e.clientX - startX));
		y = Math.max(0, Math.min(window.innerHeight - h, e.clientY - startY));
		if (pillEl) {
			pillEl.style.left = `${x}px`;
			pillEl.style.top = `${y}px`;
		}
	}

	function onPointerUp(e) {
		document.removeEventListener('pointermove', onPointerMove);
		document.removeEventListener('pointerup', onPointerUp);
		if (!isDragging && $returnLines.length > 0) {
			dispatch('goToSummary');
		} else if (!isDragging) {
			warning('Agregue al menos un producto');
		}
	}
</script>

{#if $returnLines.length > 0}
	<div
		bind:this={pillEl}
		class="fixed z-40 cursor-grab active:cursor-grabbing select-none"
		style="left: {x}px; top: {y}px; touch-action: none;"
		on:pointerdown={onPointerDown}
		tabindex="0"
		role="button"
		aria-label="Ir al resumen. {$returnLines.length} productos, {totalUnits} unidades"
		on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if ($returnLines.length > 0) dispatch('goToSummary'); else warning('Agregue al menos un producto'); } }}
	>
		<div class="flex items-center px-5 py-3 rounded-2xl bg-success-50/95 dark:bg-g360-surfaceDark/50 backdrop-blur-md border-2 border-success-600/35 dark:border-white/10 shadow-lg transition-all">
			<div class="flex items-center gap-1.5">
				<div class="text-xl font-bold text-success-600 dark:text-success-400 min-w-[28px] text-center">{$returnLines.length}</div>
				<div class="w-px h-6 bg-g360-muted/20 dark:bg-white/10"></div>
				<div class="text-sm font-medium text-g360-muted dark:text-g360-mutedDark">{totalUnits} uds</div>
			</div>
		</div>
	</div>
{/if}
