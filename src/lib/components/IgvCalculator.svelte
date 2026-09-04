<script>
	import { IGV_PORCENTAJE } from '$lib/utils/igv.js';
	import { calculadoraSolicitud, limpiarSolicitud } from '$lib/stores/calculadora.js';
	import { fmtSoles } from '$lib/utils/format.js';

	/**
	 * IgvCalculator - boton flotante que abre una calculadora pequena de IGV.
	 * Entrada con coma o punto decimal; resultado en vivo; modo +IGV / -IGV.
	 */
	let abierto = false;
	let entrada = '';
	let modo = 'mas'; // 'mas' = base -> con IGV | 'menos' = con IGV -> base

	$: if ($calculadoraSolicitud) {
		entrada = String($calculadoraSolicitud.valor ?? '');
		modo = $calculadoraSolicitud.modo || 'mas';
		abierto = true;
		limpiarSolicitud();
		setTimeout(() => document.getElementById('igv-calc-input')?.select(), 80);
	}

	function parsear(v) {
		const n = parseFloat(String(v).trim().replace(',', '.'));
		return Number.isFinite(n) && n > 0 ? n : null;
	}

	$: valor = parsear(entrada);
	$: resultado = valor === null ? null : modo === 'mas' ? valor * (1 + IGV_PORCENTAJE) : valor / (1 + IGV_PORCENTAJE);

	function abrir() {
		abierto = true;
		setTimeout(() => document.getElementById('igv-calc-input')?.focus(), 60);
	}

	function cerrar(e) {
		if (e && e.key && e.key !== 'Escape') return;
		abierto = false;
	}
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && abierto && cerrar()} />

{#if abierto}
	<div
		class="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
		on:click={cerrar}
		role="button"
		tabindex="-1"
	>
		<div class="glass-card w-full max-w-xs p-5" on:click|stopPropagation role="dialog" aria-label="Calculadora IGV">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-bold text-g360-text dark:text-g360-textDark">Calculadora IGV</h2>
				<button class="btn-ghost text-xs" on:click={cerrar} aria-label="Cerrar calculadora">X</button>
			</div>

			<div class="flex gap-2 mb-3">
				<button
					class="px-3 py-2 rounded-lg text-xs font-semibold grow {modo === 'mas' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}"
					on:click={() => (modo = 'mas')}
				>
					Sin IGV → con IGV
				</button>
				<button
					class="px-3 py-2 rounded-lg text-xs font-semibold grow {modo === 'menos' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}"
					on:click={() => (modo = 'menos')}
				>
					Con IGV → sin IGV
				</button>
			</div>

			<label class="block mb-3">
				<span class="text-xs font-semibold text-g360-muted dark:text-g360-mutedDark mb-1 block">
					{modo === 'mas' ? 'Precio sin IGV (S/)' : 'Precio con IGV (S/)'}
				</span>
				<input
					id="igv-calc-input"
					type="text"
					inputmode="decimal"
					bind:value={entrada}
					placeholder="Ej: 3.85"
					autocomplete="off"
					class="glass-input text-lg font-bold"
				/>
			</label>

			<div class="glass-card p-4 text-center">
				<p class="text-[10px] uppercase tracking-wide text-g360-muted dark:text-g360-mutedDark mb-1">
					{modo === 'mas' ? 'Con IGV (+18%)' : 'Sin IGV (−18%)'}
				</p>
				<p class="text-2xl font-bold text-primary-700 dark:text-primary-400">
					{resultado === null ? '—' : fmtSoles(resultado)}
				</p>
				{#if valor !== null && resultado !== null}
					<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark mt-1">
						{fmtSoles(valor)} {modo === 'mas' ? '+' : '÷'} 18% → {fmtSoles(resultado)}
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

{#if !abierto}
	<button
		class="igv-fab"
		on:click={abrir}
		aria-label="Abrir calculadora de IGV"
		title="Calculadora IGV"
	>
		IGV
	</button>
{/if}

<style>
	.igv-fab {
		position: fixed;
		bottom: 48px;
		right: 16px;
		z-index: 60;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #007a4f;
		color: #fff;
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.5px;
		border: none;
		box-shadow: 0 6px 16px rgba(0, 122, 79, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.igv-fab:hover,
	.igv-fab:active {
		transform: scale(1.06);
		box-shadow: 0 8px 20px rgba(0, 122, 79, 0.5);
	}

	:global(.dark) .igv-fab {
		background: #00d084;
		color: #0b1220;
	}
</style>


