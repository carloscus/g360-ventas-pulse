<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import G360Signature from '$lib/components/G360Signature.svelte';
	import { vendedorActivo, restaurarSesion } from '$lib/stores/vendedor.js';
	import { cargarNetos } from '$lib/api/netos.js';
	import { fmtNum, fechaISO } from '$lib/utils/format.js';
	import { displayVendedor } from '$lib/utils/display.js';

	let desde = '';
	let hasta = '';
	let desdeInput = '';
	let hastaInput = '';
	let cargando = true;
	let error = null;
	let offline = false;
	let clientes = [];
	let periodos = null;
	let abiertosCli = new Set();
	let abiertosLin = new Set();

	$: vendedor = $vendedorActivo;

	function presetMes() {
		const hoy = new Date();
		hasta = fechaISO(hoy);
		desde = fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
		desdeInput = desde;
		hastaInput = hasta;
	}

	function fmt0(n) {
		if (n === 0) return '-';
		return (n < 0 ? '-S/ ' : 'S/ ') + fmtNum(Math.round(Math.abs(n)));
	}

	function varClass(v) {
		if (v === null || v === undefined) return 'text-g360-muted dark:text-g360-mutedDark';
		return v >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400';
	}

	function varText(v) {
		if (v === null || v === undefined) return '-';
		return (v >= 0 ? '+' : '') + (v * 100).toFixed(0) + '%';
	}

	async function cargar() {
		if (!vendedor || !desde || !hasta) return;
		cargando = true;
		error = null;
		const res = await cargarNetos(vendedor.id, desde, hasta);
		if (res.error) {
			error = res.error;
			clientes = [];
		} else {
			clientes = res.clientes;
			periodos = res.periodos;
			offline = res.source !== 'network';
			abiertosCli = new Set();
			abiertosLin = new Set();
		}
		cargando = false;
	}

	function aplicar() {
		if (!desdeInput || !hastaInput || desdeInput > hastaInput) return;
		desde = desdeInput;
		hasta = hastaInput;
		cargar();
	}

	function toggleCli(id) {
		const s = new Set(abiertosCli);
		if (s.has(id)) s.delete(id); else s.add(id);
		abiertosCli = s;
	}

	function toggleLin(key) {
		const s = new Set(abiertosLin);
		if (s.has(key)) s.delete(key); else s.add(key);
		abiertosLin = s;
	}

	onMount(async () => {
		const sesion = $vendedorActivo || (await restaurarSesion());
		if (!sesion) {
			goto(base || '/');
			return;
		}
		presetMes();
		await cargar();
	});
</script>

<svelte:head>
	<title>Montos netos - Ventas Pulse</title>
</svelte:head>

<div class="min-h-screen px-4 py-6 max-w-4xl mx-auto pb-24">
	<header class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3 min-w-0">
			<button class="btn-ghost shrink-0" on:click={() => goto(`${base}/dashboard`)} title="Volver a Hoy" aria-label="Volver a Hoy">←</button>
			<div class="min-w-0">
				<h1 class="text-lg font-bold text-g360-text dark:text-g360-textDark">Montos netos</h1>
				<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
					Vendedor {displayVendedor(vendedor?.id)} · ventas − NCs − devoluciones
				</p>
			</div>
		</div>
		<ThemeToggle />
	</header>

	<div class="glass-card p-3 mb-3 flex flex-wrap items-end gap-2">
		<label class="block grow min-w-[130px]">
			<span class="text-[10px] font-semibold text-g360-muted dark:text-g360-mutedDark block mb-0.5">Desde</span>
			<input type="date" bind:value={desdeInput} class="glass-input py-2" />
		</label>
		<label class="block grow min-w-[130px]">
			<span class="text-[10px] font-semibold text-g360-muted dark:text-g360-mutedDark block mb-0.5">Hasta</span>
			<input type="date" bind:value={hastaInput} class="glass-input py-2" />
		</label>
		<button class="btn-secondary shrink-0 py-2" on:click={aplicar}>Aplicar</button>
	</div>

	{#if periodos}
		<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark mb-3">
			A: {periodos.a.desde} → {periodos.a.hasta} · B: {periodos.b.desde} → {periodos.b.hasta} · C: {periodos.c.desde} → {periodos.c.hasta}
		</p>
	{/if}

	{#if offline && !cargando && !error}
		<div class="badge badge-warning mb-3">Datos offline (cache)</div>
	{/if}

	{#if cargando}
		<div class="glass-card p-4 space-y-3">
			{#each [0, 1, 2, 3] as _}
				<div class="h-4 bg-g360-surface dark:bg-white/10 rounded w-3/4 animate-pulse"></div>
			{/each}
		</div>
	{:else if error}
		<div class="glass-card p-8 text-center">
			<p class="text-danger-600 dark:text-danger-400 font-semibold mb-2">No se pudo cargar el comparativo</p>
			<p class="text-xs text-g360-muted dark:text-g360-mutedDark mb-4">{error.message || error}</p>
			<button class="btn-primary" on:click={cargar}>Reintentar</button>
		</div>
	{:else if clientes.length === 0}
		<div class="glass-card p-8 text-center text-g360-muted dark:text-g360-mutedDark">
			<p class="font-semibold mb-1">Sin movimientos en el rango A</p>
			<p class="text-xs">No hay operaciones entre {desde} y {hasta}.</p>
		</div>
	{:else}
		<div class="glass-card overflow-x-auto">
			<table class="w-full text-sm min-w-[560px] tabular-nums">
				<thead>
					<tr class="text-left text-[10px] uppercase tracking-wide text-g360-muted dark:text-g360-mutedDark border-b border-g360-surface/60 dark:border-white/10">
						<th class="py-2.5 px-3">Cliente / Línea / SKU</th>
						<th class="py-2.5 px-3 text-right">A (rango)</th>
						<th class="py-2.5 px-3 text-right">B (−1a)</th>
						<th class="py-2.5 px-3 text-right">C (−2a)</th>
						<th class="py-2.5 px-3 text-right">Δ A/B</th>
					</tr>
				</thead>
				<tbody>
					{#each clientes as c (c.id_cliente)}
						<tr class="border-b border-g360-surface/40 dark:border-white/5 cursor-pointer hover:bg-primary-50/40 dark:hover:bg-white/5" on:click={() => toggleCli(c.id_cliente)}>
							<td class="py-2.5 px-3 font-semibold text-g360-text dark:text-g360-textDark">
								<span class="opacity-50 mr-1">{abiertosCli.has(c.id_cliente) ? '▾' : '▸'}</span>{c.nom_cliente}
							</td>
							<td class="py-2.5 px-3 text-right font-bold {c.a < 0 ? 'text-danger-600 dark:text-danger-400' : 'text-primary-700 dark:text-primary-400'}">{fmt0(c.a)}</td>
							<td class="py-2.5 px-3 text-right text-g360-muted dark:text-g360-mutedDark">{fmt0(c.b)}</td>
							<td class="py-2.5 px-3 text-right text-g360-muted dark:text-g360-mutedDark opacity-70">{fmt0(c.c)}</td>
							<td class="py-2.5 px-3 text-right font-semibold {varClass(c.variacion)}">{varText(c.variacion)}</td>
						</tr>
						{#if abiertosCli.has(c.id_cliente)}
							{#each c.lineas as l (c.id_cliente + '|' + l.id_linea)}
								{@const key = c.id_cliente + '|' + l.id_linea}
								<tr class="border-b border-g360-surface/20 dark:border-white/5 cursor-pointer bg-g360-bg/40 dark:bg-white/[0.02]" on:click={() => toggleLin(key)}>
									<td class="py-2 px-3 pl-8 text-xs text-g360-text dark:text-g360-textDark">
										<span class="opacity-50 mr-1">{abiertosLin.has(key) ? '▾' : '▸'}</span>{l.nom_linea}
									</td>
									<td class="py-2 px-3 text-right text-xs font-semibold">{fmt0(l.a)}</td>
									<td class="py-2 px-3 text-right text-xs text-g360-muted dark:text-g360-mutedDark">{fmt0(l.b)}</td>
									<td class="py-2 px-3 text-right text-xs text-g360-muted dark:text-g360-mutedDark opacity-70">{fmt0(l.c)}</td>
									<td class="py-2 px-3 text-right text-xs font-semibold {varClass(l.variacion)}">{varText(l.variacion)}</td>
								</tr>
								{#if abiertosLin.has(key)}
									{#each l.skus as s (key + '|' + s.sku)}
										<tr class="border-b border-g360-surface/10 dark:border-white/[0.03]">
											<td class="py-1.5 px-3 pl-14 text-[11px] text-g360-muted dark:text-g360-mutedDark">
												<span class="font-mono">{s.sku}</span> {String(s.nom).slice(0, 34)}
											</td>
											<td class="py-1.5 px-3 text-right text-[11px]">{fmt0(s.a)}</td>
											<td class="py-1.5 px-3 text-right text-[11px] text-g360-muted dark:text-g360-mutedDark">{fmt0(s.b)}</td>
											<td class="py-1.5 px-3 text-right text-[11px] text-g360-muted dark:text-g360-mutedDark opacity-70">{fmt0(s.c)}</td>
											<td class="py-1.5 px-3 text-right text-[11px] {varClass(s.variacion)}">{varText(s.variacion)}</td>
										</tr>
									{/each}
								{/if}
							{/each}
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<G360Signature version="1.0.0" />
