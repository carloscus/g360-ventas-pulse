<script>
	import { onDestroy } from 'svelte';
	import { clientData, updateClientField } from '$lib/stores/app';
	import { validarDocumento } from '$lib/utils/documentValidation.js';

	let ruc = '';
	let nombre = '';
	let vendedor = '';
	let codigoCliente = '';
	let fecha = '';

	let docValidation = null;
	let docTouched = false;

	const unsubscribe = clientData.subscribe(data => {
		ruc = data.ruc;
		nombre = data.nombre;
		vendedor = data.vendedor;
		codigoCliente = data.codigoCliente;
		fecha = data.fecha;
	});

	onDestroy(unsubscribe);

	function handleRucInput() {
		const clean = ruc.replace(/\D/g, '').slice(0, 11);
		ruc = clean;
		updateClientField('ruc', clean);
		docTouched = true;
		if (clean.length >= 8) {
			docValidation = validarDocumento(clean);
		} else {
			docValidation = null;
		}
	}

	function handleCodInput() {
		const clean = codigoCliente.replace(/\D/g, '').slice(0, 8);
		codigoCliente = clean;
		updateClientField('codigoCliente', clean);
	}
</script>

<section class="glass-card p-3 mb-4 animate-fadeIn">
	<div class="flex items-center justify-between mb-3">
		<h2 class="section-title">
			<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
			</svg>
			Datos del Cliente
		</h2>
	</div>

	<div class="grid grid-cols-2 gap-2">
		<div class="input-group col-span-2 relative">
			<label for="ruc-input" class="input-label">Documento <span class="text-danger-500">*</span></label>
			<div class="relative">
				<input
					id="ruc-input"
					bind:value={ruc}
					on:input={handleRucInput}
					class="glass-input pr-16 {docTouched && docValidation ? (docValidation.valid ? 'glass-input-valid' : 'glass-input-invalid') : ''}"
					placeholder="8 o 11 dígitos"
					maxlength="11"
					inputmode="numeric"
				/>
				{#if ruc.length > 0}
					<span class="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter text-white transition-all duration-300 {ruc.length === 11 ? 'bg-rose-500 shadow-sm shadow-rose-500/20' : 'bg-primary-500 shadow-sm shadow-primary-500/20'}">
						{ruc.length === 11 ? 'RUC' : 'DNI'}
					</span>
				{/if}
			</div>
			{#if docTouched && docValidation}
				<p class="{docValidation.valid ? 'input-hint text-success-500 dark:text-success-400' : 'input-error'}">
					{docValidation.message}
				</p>
			{:else if docTouched && ruc.length > 0 && ruc.length < 8}
				<p class="input-hint">Ingrese 8 dígitos (DNI) o 11 (RUC)</p>
			{/if}
		</div>

		<div class="input-group col-span-2">
			<label for="vendedor-input" class="input-label">Vendedor / Responsable <span class="text-danger-500">*</span></label>
			<input
				id="vendedor-input"
				bind:value={vendedor}
				on:input={() => updateClientField('vendedor', vendedor)}
				class="glass-input"
				placeholder="Nombre del vendedor"
			/>
		</div>

		<details class="col-span-2">
			<summary class="text-xs text-g360-muted dark:text-g360-mutedDark cursor-pointer py-1 select-none">
				Campos opcionales ▾
			</summary>
			<div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-g360-surface/50 dark:border-white/5">
				<div class="input-group">
					<label for="nombre-input" class="input-label">Nombre</label>
					<input
						id="nombre-input"
						bind:value={nombre}
						on:input={() => updateClientField('nombre', nombre)}
						class="glass-input"
						placeholder="Razón Social"
					/>
				</div>
				<div class="input-group">
					<label for="codigo-input" class="input-label">Código</label>
					<input
						id="codigo-input"
						bind:value={codigoCliente}
						on:input={handleCodInput}
						class="glass-input"
						placeholder="Hasta 8 dígitos"
						maxlength="8"
						inputmode="numeric"
					/>
				</div>
				<div class="input-group">
					<label for="fecha-input" class="input-label">Fecha</label>
					<input
						id="fecha-input"
						type="date"
						bind:value={fecha}
						on:input={() => updateClientField('fecha', fecha)}
						class="glass-input"
					/>
				</div>
			</div>
		</details>
	</div>
</section>
