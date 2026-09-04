<script>
	import { conIgv } from '$lib/utils/igv.js';
	import { fmtSoles } from '$lib/utils/format.js';

	/**
	 * MontoTooltip - monto sin IGV; tap muestra el total con IGV en una linea.
	 * 1.00 -> Con IGV S/1.18 | 100.00 -> S/118.00
	 */
	export let monto = 0;
	export let etiqueta = '';
	export let clase = '';

	let abierto = false;
	let rootEl;

	function toggle() {
		abierto = !abierto;
	}

	function fuera(e) {
		if (abierto && rootEl && !rootEl.contains(e.target)) abierto = false;
	}
</script>

<svelte:window on:pointerdown={fuera} />

<span class="igv-root" bind:this={rootEl}>
	<button
		type="button"
		class="igv-trigger {clase}"
		on:click={toggle}
		aria-expanded={abierto}
		title="Toca para ver el monto con IGV (+18%)"
	>
		{etiqueta}{fmtSoles(monto)}<span class="igv-mark">+IGV</span>
	</button>
	{#if abierto}
		<span class="igv-inline" role="status">
			<span class="igv-label">Con IGV (+18%)</span>
			<span class="igv-total">{fmtSoles(conIgv(monto))}</span>
		</span>
	{/if}
</span>

<style>
	.igv-root {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-end;
	}
	.igv-trigger {
		background: none;
		border: none;
		padding: 10px 8px;
		margin: -6px -4px;
		font: inherit;
		color: inherit;
		cursor: pointer;
		display: inline-flex;
		align-items: baseline;
		gap: 4px;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}
	.igv-mark {
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.5px;
		color: #008f5d;
		border: 1px solid currentColor;
		border-radius: 4px;
		padding: 0 3px;
		opacity: 0.8;
	}
	:global(.dark) .igv-mark {
		color: #00d084;
	}
	.igv-inline {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		background: #151e2e;
		color: #f0f4f8;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		padding: 7px 10px;
		margin-top: 4px;
		white-space: nowrap;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
	}
	.igv-label {
		font-size: 10px;
		opacity: 0.75;
	}
	.igv-total {
		font-size: 14px;
		font-weight: 700;
		color: #00d084;
	}
</style>
