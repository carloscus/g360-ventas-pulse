<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { vendedorActivo, restaurarSesion } from '$lib/stores/vendedor.js';
	import { cargarNetos, huellasIguales, leerHuella, guardarHuella } from '$lib/api/netos.js';
	import { fmtNum, fmtSoles, fechaISO } from '$lib/utils/format.js';
	import { displayVendedor } from '$lib/utils/display.js';
	import { proximoOrden, ordenarPor, indicador } from '$lib/utils/orden.js';
	import { pullToRefresh } from '$lib/actions/ptr.js';
	import { success } from '$lib/stores/toasts.js';

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
	let orden = { clave: 'a', dir: -1 };
	let preset = 'mes';
	let rangoAbierto = false;
	let incompleto = null;
	let abiertosLin = new Set();
	let datosHasta = null;
	let datosRetrasados = false;

	$: vendedor = $vendedorActivo;

	function rangoPreset(p) {
		const hoy = new Date();
		let d;
		if (p === 'mes') d = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
		else if (p === '3m') { d = new Date(hoy); d.setMonth(hoy.getMonth() - 3); }
		else if (p === '6m') { d = new Date(hoy); d.setMonth(hoy.getMonth() - 6); }
		else d = new Date(hoy.getFullYear(), 0, 1);
		return [fechaISO(d), fechaISO(hoy)];
	}

	function elegirPreset(p) {
		preset = p;
		[desde, hasta] = rangoPreset(p);
		desdeInput = desde;
		hastaInput = hasta;
		cargar();
	}

	function fmt0(n) {
		// Montos con decimales: el ERP audita al centavo (S/ 4,661.94, no 4,662)
		if (n === 0) return '-';
		return (n < 0 ? '-' : '') + fmtSoles(Math.abs(n));
	}

	function varClass(v) {
		if (v === null || v === undefined) return 'text-g360-muted dark:text-g360-mutedDark';
		return v >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400';
	}

	function varText(v) {
		if (v === null || v === undefined) return '-';
		return (v >= 0 ? '+' : '') + (v * 100).toFixed(0) + '%';
	}

	async function cargar(force = false) {
		if (!vendedor || !desde || !hasta) return;
		cargando = true;
		error = null;
		const previa = leerHuella(vendedor.id, desde, hasta);
		const res = await cargarNetos(vendedor.id, desde, hasta, { force });
		if (res.error) {
			error = res.error;
			clientes = [];
		} else {
			clientes = res.clientes;
			periodos = res.periodos;
			incompleto = res.incompleto;
			offline = res.source !== 'network';
			abiertosCli = new Set();
			abiertosLin = new Set();
			// Frescura: fecha de corte visible + comparacion con la consulta previa
			datosHasta = res.huella?.max || null;
			datosRetrasados = Boolean(
				datosHasta &&
				(new Date(`${hasta}T00:00:00`) - new Date(`${datosHasta}T00:00:00`)) / 86400000 > 2
			);
			if (previa && !offline && res.huella) {
				if (huellasIguales(previa, res.huella)) {
					success('Sin cambios desde la ultima consulta');
				} else {
					const dSum = Math.round((res.huella.sum - previa.sum) * 100) / 100;
					const dN = res.huella.n - previa.n;
					const firma = `${dN >= 0 ? '+' : ''}${dN} lineas, ${dSum >= 0 ? '+' : ''}${dSum} S/`;
					success(`Datos actualizados (${firma})`);
				}
			}
			guardarHuella(vendedor.id, desde, hasta, res.huella);
		}
		cargando = false;
	}

	function aplicar() {
		if (!desdeInput || !hastaInput || desdeInput > hastaInput) return;
		desde = desdeInput;
		hasta = hastaInput;
		preset = 'custom';
		cargar();
	}

	function setOrden(clave) {
		orden = proximoOrden(orden, clave);
	}

	$: clientesVistos = ordenarPor(clientes, orden).map((c) => ({
		...c,
		lineas: ordenarPor(c.lineas, orden).map((l) => ({ ...l, skus: ordenarPor(l.skus, orden) }))
	}));

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
		[desde, hasta] = rangoPreset('mes');
		desdeInput = desde;
		hastaInput = hasta;
		await cargar();
	});
</script>

<svelte:head>
	<title>Montos netos - Ventas Pulse</title>
</svelte:head>

<div class="min-h-screen px-4 py-6 max-w-4xl mx-auto" use:pullToRefresh={{onRefresh: () => cargar(true)}}>
	<PageHeader
		title="Montos netos"
		showLogo
		showSearch
		showProfile
		profileName={vendedor?.nombre || ''}
		profileId={vendedor?.id || ''}
		showThemeToggle
	>
	</PageHeader>

	<div class="flex gap-2 mb-3 flex-wrap">
		<button class="px-3.5 py-2 rounded-full text-xs font-semibold min-h-[40px] {preset === 'mes' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}" on:click={() => elegirPreset('mes')}>Este mes</button>
		<button class="px-3.5 py-2 rounded-full text-xs font-semibold min-h-[40px] {preset === '3m' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}" on:click={() => elegirPreset('3m')}>3 meses</button>
		<button class="px-3.5 py-2 rounded-full text-xs font-semibold min-h-[40px] {preset === '6m' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}" on:click={() => elegirPreset('6m')}>6 meses</button>
		<button class="px-3.5 py-2 rounded-full text-xs font-semibold min-h-[40px] {preset === 'anio' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}" on:click={() => elegirPreset('anio')}>Año</button>
		<button class="px-3 py-2 rounded-full text-xs font-semibold min-h-[40px] {preset === 'custom' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}" on:click={() => (rangoAbierto = !rangoAbierto)} title="Elegir fechas exactas">Otro</button>
	</div>

	{#if rangoAbierto || preset === 'custom'}
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
	{/if}

	{#if periodos}
		<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark mb-3">
			A: {periodos.a.desde} → {periodos.a.hasta} · B: {periodos.b.desde} → {periodos.b.hasta} · C: {periodos.c.desde} → {periodos.c.hasta}
			{#if datosHasta}
				· Datos al {datosHasta}
				{#if datosRetrasados}
					<span class="badge badge-warning px-1.5 py-0 text-[10px]">réplica con retraso</span>
				{/if}
			{/if}
		</p>
	{/if}

	{#if incompleto && (incompleto.b || incompleto.c)}
		<div class="badge badge-warning mb-3">Comparativo B/C incompleto: reintenta con un rango mas corto</div>
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
						<th class="py-2.5 px-3 text-right cursor-pointer select-none" on:click={() => setOrden('a')} title="Ordenar por A">A (rango) {indicador(orden, 'a')}</th>
						<th class="py-2.5 px-3 text-right cursor-pointer select-none" on:click={() => setOrden('b')} title="Ordenar por B">B (−1a) {indicador(orden, 'b')}</th>
						<th class="py-2.5 px-3 text-right cursor-pointer select-none" on:click={() => setOrden('c')} title="Ordenar por C">C (−2a) {indicador(orden, 'c')}</th>
						<th class="py-2.5 px-3 text-right cursor-pointer select-none" on:click={() => setOrden('variacion')} title="Ordenar por variacion">Δ A/B {indicador(orden, 'variacion')}</th>
					</tr>
				</thead>
				<tbody>
					{#each clientesVistos as c (c.id_cliente)}
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






