<script context="module">
	import { setClienteContexto } from '$lib/stores/contexto.js';
</script>

<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { vendedorActivo, restaurarSesion } from '$lib/stores/vendedor.js';
	import { cargarTopSkus, cargarTendenciaLineas } from '$lib/api/productos.js';
	import { fmtSoles, fmtNum } from '$lib/utils/format.js';
	import { pullToRefresh } from '$lib/actions/ptr.js';

	const LINE_COLORS = ['#00d084', '#00796B', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

	function getColor(idx) {
		return LINE_COLORS[typeof idx === 'string' ? (idx.charCodeAt(0) % LINE_COLORS.length) : (idx % LINE_COLORS.length)];
	}

	let cargando = true;
	let error = null;
	let skus = [];
	let lineas = [];
	let pestaña = 'lineas';
	let skuExpandido = null;
	let offline = false;

	$: vendedor = $vendedorActivo;

	function fmtVar(v) {
		if (v == null) return '-';
		return (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
	}

	function varClass(v) {
		if (v == null) return 'text-g360-muted dark:text-g360-mutedDark';
		return v >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400';
	}

	function toggleSku(sku) {
		skuExpandido = skuExpandido === sku ? null : sku;
	}

	async function cargar(force = false) {
		if (!vendedor) return;
		cargando = true;
		error = null;
		try {
			const [r1, r2] = await Promise.allSettled([
				cargarTopSkus(vendedor.id, force),
				cargarTendenciaLineas(vendedor.id, force)
			]);
			if (r1.status === 'fulfilled') {
				skus = r1.value.skus || [];
			} else {
				error = r1.reason?.message || 'Error cargando SKUs';
			}
			if (r2.status === 'fulfilled') {
				lineas = r2.value.lineas || [];
				offline = r2.value.source !== 'network';
			}
		} catch (e) {
			error = String(e);
		}
		cargando = false;
	}

	onMount(async () => {
		setClienteContexto(null);
		const sesion = $vendedorActivo || (await restaurarSesion());
		if (!sesion) { goto(base || '/', { replaceState: true }); return; }
		await cargar();
	});

	// Datos para gráfico
	$: meses = [...new Set(lineas.map(l => l.mes))].sort();
	$: maxSoles = Math.max(...lineas.map(l => l.soles), 1);
	$: mesLabels = meses.map((m, i) => ({
		label: m.slice(5) + '/' + m.slice(0, 4),
		x: 50 + (i / Math.max(meses.length - 1, 1)) * 450
	}));
	$: lineasTotales = [...new Set(lineas.map(l => l.linea))].map(lin => {
		const filas = lineas.filter(l => l.linea === lin);
		return {
			linea: lin,
			nomLinea: filas[0]?.nomLinea || lin,
			solesTotal: filas.reduce((s, l) => s + l.soles, 0),
			cantidadTotal: filas.reduce((s, l) => s + l.cantidad, 0)
		};
	}).sort((a, b) => b.solesTotal - a.solesTotal);
	$: pathData = lineasTotales.map(lt => {
		const pts = meses.map((m, i) => {
			const fila = lineas.find(l => l.linea === lt.linea && l.mes === m);
			const x = 50 + (i / Math.max(meses.length - 1, 1)) * 450;
			const y = 160 - (fila?.soles / maxSoles) * 140;
			return { x, y };
		}).filter(p => p.y <= 160);
		return { d: pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '), color: getColor(lt.linea) };
	});
</script>

<svelte:head>
	<title>Mis Productos - Ventas Pulse</title>
</svelte:head>

<div class="min-h-screen px-4 py-6 max-w-4xl mx-auto" use:pullToRefresh={{onRefresh: () => cargar(true)}}>
	<PageHeader
		title="Productos"
		showLogo
		showSearch
		showProfile
		profileName={vendedor?.nombre || ''}
		profileId={vendedor?.id || ''}
		showThemeToggle
	>
	</PageHeader>

	<!-- Tabs: Líneas / SKUs -->
	<div class="flex gap-1 mb-4 p-1 bg-g360-surface dark:bg-white/5 rounded-full self-start">
		<button
			class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all {pestaña === 'lineas' ? 'bg-primary-600 text-white shadow' : 'text-g360-muted dark:text-g360-mutedDark'}"
			on:click={() => pestaña = 'lineas'}
		>
			Líneas
		</button>
		<button
			class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all {pestaña === 'skus' ? 'bg-primary-600 text-white shadow' : 'text-g360-muted dark:text-g360-mutedDark'}"
			on:click={() => pestaña = 'skus'}
		>
			SKUs top
		</button>
	</div>

	{#if offline && !cargando}
		<div class="badge badge-warning mb-3">Datos offline (cache)</div>
	{/if}

	{#if cargando}
		<div class="glass-card p-8 text-center text-g360-muted dark:text-g360-mutedDark">
			<p class="font-semibold">Cargando productos...</p>
		</div>
	{:else if error}
		<div class="glass-card p-8 text-center">
			<p class="text-danger-600 dark:text-danger-400 font-semibold mb-2">Error al cargar</p>
			<p class="text-xs text-g360-muted dark:text-g360-mutedDark mb-4">{error}</p>
			<button class="btn-primary" on:click={cargar}>Reintentar</button>
		</div>
	{:else}

	{#if pestaña === 'lineas'}
		<!-- TENDENCIA POR LÍNEA -->
		<div class="glass-card p-4 mb-4">
			<h2 class="text-sm font-bold text-g360-text dark:text-g360-textDark mb-3">
				Evolución mensual de líneas (últimos 12 meses)
			</h2>
			{#if lineas.length === 0}
				<p class="text-xs text-g360-muted dark:text-g360-mutedDark text-center py-8">
					Sin movimientos en los últimos 12 meses
				</p>
			{:else}
				<!-- Leyenda -->
				<div class="flex flex-wrap gap-3 mb-3">
					{#each lineasTotales as lt (lt.linea)}
						<span class="text-[10px] text-g360-muted dark:text-g360-mutedDark flex items-center gap-1">
							<span class="w-2 h-2 rounded-full inline-block" style="background:{getColor(lt.linea)}"></span>
							{lt.nomLinea || lt.linea}
						</span>
					{/each}
				</div>
				<!-- Gráfico SVG -->
				<div class="overflow-x-auto">
					<svg width="550" height="180" class="min-w-[400px]">
						<!-- Ejes -->
						<line x1="50" y1="10" x2="50" y2="160" stroke="currentColor" stroke-opacity="0.2" />
						<line x1="50" y1="160" x2="500" y2="160" stroke="currentColor" stroke-opacity="0.2" />
						<!-- Meses -->
						{#each mesLabels as m (m.label)}
							<text x="{m.x}" y="175" text-anchor="middle" class="text-[9px] fill-g360-muted dark:fill-g360-mutedDark">{m.label}</text>
						{/each}
						<!-- Líneas -->
						{#each pathData as pd (pd.d)}
							<path d="{pd.d}" fill="none" stroke="{pd.color}" stroke-width="2" opacity="0.8" />
						{/each}
					</svg>
				</div>
				<!-- Totales -->
				<div class="mt-3 grid grid-cols-2 gap-2">
					{#each lineasTotales as lt (lt.linea)}
						<div class="text-xs p-2 rounded-lg bg-g360-bg dark:bg-white/5">
							<div class="flex items-center gap-1 mb-0.5">
								<span class="w-2 h-2 rounded-full inline-block" style="background:{getColor(lt.linea)}"></span>
								<span class="font-semibold text-g360-text dark:text-g360-textDark">{lt.nomLinea || lt.linea}</span>
							</div>
							<div class="text-g360-muted dark:text-g360-mutedDark">
								{fmtSoles(lt.solesTotal)} · {fmtNum(lt.cantidadTotal)} und
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	{:else}
		<!-- TOP SKUs -->
		<div class="glass-card p-4">
			<h2 class="text-sm font-bold text-g360-text dark:text-g360-textDark mb-3">
				Top 20 SKUs — este mes
			</h2>
			{#if skus.length === 0}
				<p class="text-xs text-g360-muted dark:text-g360-mutedDark text-center py-8">
					Sin ventas en el período actual
				</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-xs">
						<thead>
							<tr class="text-left text-[10px] uppercase tracking-wide text-g360-muted dark:text-g360-mutedDark border-b border-g360-surface/60 dark:border-white/10">
								<th class="py-2 px-2">SKU</th>
								<th class="py-2 px-2">Línea</th>
								<th class="py-2 px-2 text-right">A (soles)</th>
								<th class="py-2 px-2 text-right">B</th>
								<th class="py-2 px-2 text-right">Δ A/B</th>
								<th class="py-2 px-2 text-right">C</th>
								<th class="py-2 px-2 text-right">Und A</th>
							</tr>
						</thead>
						<tbody>
							{#each skus as s (s.sku)}
								<tr class="border-b border-g360-surface/30 dark:border-white/5 cursor-pointer hover:bg-primary-50/30 dark:hover:bg-white/5" on:click={() => toggleSku(s.sku)}>
									<td class="py-2 px-2 font-mono font-semibold text-g360-text dark:text-g360-textDark">
										{skuExpandido === s.sku ? '▾' : '▸'} {s.sku}
									</td>
									<td class="py-2 px-2 text-g360-muted dark:text-g360-mutedDark">{s.nomLinea || s.linea}</td>
									<td class="py-2 px-2 text-right font-bold text-primary-600 dark:text-primary-400">{fmtSoles(s.solesA)}</td>
									<td class="py-2 px-2 text-right text-g360-muted dark:text-g360-mutedDark">{fmtSoles(s.solesB)}</td>
									<td class="py-2 px-2 text-right font-semibold {varClass(s.varSolesA_B)}">{fmtVar(s.varSolesA_B)}</td>
									<td class="py-2 px-2 text-right text-g360-muted dark:text-g360-mutedDark opacity-70">{fmtSoles(s.solesC)}</td>
									<td class="py-2 px-2 text-right">{fmtNum(s.qtyA)}</td>
								</tr>
								{#if skuExpandido === s.sku}
									<tr class="bg-g360-bg/50 dark:bg-white/5">
										<td colspan="7" class="py-2 px-3">
											<p class="text-xs text-g360-text dark:text-g360-textDark mb-1 font-semibold">{s.nom}</p>
											<div class="grid grid-cols-3 gap-2 text-[11px]">
												<div><span class="text-g360-muted dark:text-g360-mutedDark">A: </span><span class="font-semibold text-primary-600 dark:text-primary-400">{fmtSoles(s.solesA)}</span> <span class="text-g360-muted dark:text-g360-mutedDark">{fmtNum(s.qtyA)} und</span></div>
												<div><span class="text-g360-muted dark:text-g360-mutedDark">B: </span><span>{fmtSoles(s.solesB)}</span> <span class="text-g360-muted dark:text-g360-mutedDark">{fmtNum(s.qtyB)} und</span></div>
												<div><span class="text-g360-muted dark:text-g360-mutedDark">C: </span><span class="opacity-70">{fmtSoles(s.solesC)}</span> <span class="text-g360-muted dark:text-g360-mutedDark">{fmtNum(s.qtyC)} und</span></div>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
	{/if}
</div>
