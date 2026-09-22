<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { vendedorActivo, restaurarSesion } from '$lib/stores/vendedor.js';
	import { cargarTopSkus, cargarTendenciaLineas } from '$lib/api/productos.js';
	import { fmtSoles, fmtNum } from '$lib/utils/format.js';
	import { pullToRefresh } from '$lib/actions/ptr.js';
	import { setClienteContexto } from '$lib/stores/contexto.js';

	const LINE_COLORS = ['#00d084', '#00796B', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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
	let orden = { clave: 'solesA', dir: -1 };
	let lineaFiltro = null;
	let tooltip = null;
	let svgEl;

	// Placeholder: en producción usaría un cliente real del vendedor
	function skuFuerza(s) {
		return '00002035';
	}

	$: vendedor = $vendedorActivo;

	// Período actual
	const hoy = new Date();
	const mesActual = hoy.getMonth();
	const anioActual = hoy.getFullYear();
	const periodoTexto = `Ene ${anioActual} – ${hoy.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}`;

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

	function abrirFicha(sku) {
		// Buscar un cliente que tenga este SKU para abrir la ficha
		goto(`${base}/clientes`);
	}

	function setOrden(clave) {
		if (orden.clave === clave) {
			orden = { clave, dir: -orden.dir };
		} else {
			orden = { clave, dir: -1 };
		}
	}

	function indicadorOrden(clave) {
		if (orden.clave !== clave) return '';
		return orden.dir === -1 ? ' ↓' : ' ↑';
	}

	function filtrarSkus() {
		if (!lineaFiltro) return skus;
		return skus.filter(s => s.linea === lineaFiltro);
	}

	function toggleLinea(lin) {
		lineaFiltro = lineaFiltro === lin ? null : lin;
		skuExpandido = null;
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
			return { x, y, soles: fila?.soles || 0, mes: m };
		}).filter(p => p.y <= 160);
		return { d: pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '), color: getColor(lt.linea), pts, linea: lt.linea };
	});

	// SKUs ordenados
	$: skusOrdenados = [...filtrarSkus()].sort((a, b) => {
		const av = a[orden.clave] || 0;
		const bv = b[orden.clave] || 0;
		return orden.dir * (bv - av);
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
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-bold text-g360-text dark:text-g360-textDark">
					Evolución mensual de líneas
				</h2>
				<span class="text-[10px] text-g360-muted dark:text-g360-mutedDark">{periodoTexto}</span>
			</div>
			{#if lineas.length === 0}
				<div class="text-center py-8">
					<p class="text-xs text-g360-muted dark:text-g360-mutedDark mb-2">Sin movimientos en los últimos 12 meses</p>
					<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark opacity-60">Visita clientes para generar datos</p>
				</div>
			{:else}
				<!-- Leyenda interactiva -->
				<div class="flex flex-wrap gap-2 mb-3">
					{#each lineasTotales as lt (lt.linea)}
						<button
							class="text-[10px] px-2 py-1 rounded-full flex items-center gap-1 transition-all {lineaFiltro === lt.linea ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-400' : 'text-g360-muted dark:text-g360-mutedDark hover:bg-g360-bg dark:hover:bg-white/5'}"
							on:click={() => toggleLinea(lt.linea)}
						>
							<span class="w-2 h-2 rounded-full inline-block" style="background:{getColor(lt.linea)}"></span>
							{lt.nomLinea || lt.linea}
						</button>
					{/each}
					{#if lineaFiltro}
						<button class="text-[10px] text-g360-muted dark:text-g360-mutedDark ml-1" on:click={() => lineaFiltro = null}>✕ limpiar</button>
					{/if}
				</div>
				<!-- Gráfico SVG interactivo -->
				<div class="overflow-x-auto relative">
					<svg width="550" height="180" class="min-w-[400px]" bind:this={svgEl}>
						<!-- Ejes -->
						<line x1="50" y1="10" x2="50" y2="160" stroke="currentColor" stroke-opacity="0.2" />
						<line x1="50" y1="160" x2="500" y2="160" stroke="currentColor" stroke-opacity="0.2" />
						<!-- Meses -->
						{#each mesLabels as m (m.label)}
							<text x="{m.x}" y="175" text-anchor="middle" class="text-[9px] fill-g360-muted dark:fill-g360-mutedDark">{m.label}</text>
						{/each}
						<!-- Líneas del gráfico -->
						{#each pathData as pd (pd.linea)}
							{#if !lineaFiltro || lineaFiltro === pd.linea}
								<path d="{pd.d}" fill="none" stroke="{pd.color}" stroke-width="2" opacity="0.9" class="transition-all duration-300" />
								{#each pd.pts as p (p.mes + '-' + pd.linea)}
									<circle cx="{p.x}" cy="{p.y}" r="4" fill="{pd.color}" stroke="white" stroke-width="1.5" class="cursor-pointer hover:r-6 transition-all"
										on:mouseenter={() => tooltip = { x: p.x, y: p.y - 12, texto: `${pd.linea}: ${fmtSoles(p.soles)}`, color: pd.color }}
										on:mouseleave={() => tooltip = null}
									/>
								{/each}
							{/if}
						{/each}
						<!-- Tooltip -->
						{#if tooltip}
							<g transform={`translate(${tooltip.x}, ${tooltip.y})`}>
								<rect x="-50" y="-14" width="100" height="18" rx="4" fill="rgba(0,0,0,0.75)" />
								<text x="0" y="-1" text-anchor="middle" class="text-[8px] fill-white font-mono">{tooltip.texto}</text>
							</g>
						{/if}
					</svg>
				</div>
				<!-- Totales -->
				<div class="mt-3 grid grid-cols-2 gap-2">
					{#each lineasTotales as lt (lt.linea)}
						<button
							class="text-xs p-2 rounded-lg bg-g360-bg dark:bg-white/5 text-left transition-all hover:bg-g360-surface dark:hover:bg-white/10 {lineaFiltro === lt.linea ? 'ring-1 ring-primary-400' : ''}"
							on:click={() => toggleLinea(lt.linea)}
						>
							<div class="flex items-center gap-1 mb-0.5">
								<span class="w-2 h-2 rounded-full inline-block" style="background:{getColor(lt.linea)}"></span>
								<span class="font-semibold text-g360-text dark:text-g360-textDark truncate">{lt.nomLinea || lt.linea}</span>
							</div>
							<div class="text-g360-muted dark:text-g360-mutedDark">
								{fmtSoles(lt.solesTotal)} · {fmtNum(lt.cantidadTotal)} und
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

	{:else}
		<!-- TOP SKUs -->
		<div class="glass-card p-4">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-bold text-g360-text dark:text-g360-textDark">
					Top SKUs — {periodoTexto}
				</h2>
				{#if lineaFiltro}
					<button class="text-[10px] text-primary-600 dark:text-primary-400 font-semibold" on:click={() => { lineaFiltro = null; }}>
						✕ Limpiar filtro
					</button>
				{/if}
			</div>
			{#if skus.length === 0}
				<div class="text-center py-8">
					<p class="text-xs text-g360-muted dark:text-g360-mutedDark mb-2">Sin ventas en el período actual</p>
					<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark opacity-60">Los SKUs aparecerán tras tu primera venta del mes</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-xs">
						<thead>
							<tr class="text-left text-[10px] uppercase tracking-wide text-g360-muted dark:text-g360-mutedDark border-b border-g360-surface/60 dark:border-white/10">
								<th class="py-2 px-2 cursor-pointer select-none hover:text-g360-text dark:hover:text-g360-textDark" on:click={() => setOrden('sku')}>
									SKU{indicadorOrden('sku')}
								</th>
								<th class="py-2 px-2">
									<span class="text-[10px] opacity-60">Línea</span>
								</th>
								<th class="py-2 px-2 text-right cursor-pointer select-none hover:text-g360-text dark:hover:text-g360-textDark" on:click={() => setOrden('solesA')}>
									A {fmtSoles(0).replace('S/','')}{indicadorOrden('solesA')}
								</th>
								<th class="py-2 px-2 text-right cursor-pointer select-none hover:text-g360-text dark:hover:text-g360-textDark" on:click={() => setOrden('solesB')}>
									B{indicadorOrden('solesB')}
								</th>
								<th class="py-2 px-2 text-right cursor-pointer select-none hover:text-g360-text dark:hover:text-g360-textDark" on:click={() => setOrden('varSolesA_B')}>
									Δ A/B{indicadorOrden('varSolesA_B')}
								</th>
								<th class="py-2 px-2 text-right cursor-pointer select-none hover:text-g360-text dark:hover:text-g360-textDark" on:click={() => setOrden('solesC')}>
									C{indicadorOrden('solesC')}
								</th>
								<th class="py-2 px-2 text-right cursor-pointer select-none hover:text-g360-text dark:hover:text-g360-textDark" on:click={() => setOrden('qtyA')}>
									Und{indicadorOrden('qtyA')}
								</th>
								<th class="py-2 px-1"></th>
							</tr>
						</thead>
						<tbody>
							{#each skusOrdenados as s (s.sku)}
								<tr class="border-b border-g360-surface/30 dark:border-white/5 hover:bg-primary-50/20 dark:hover:bg-white/5 transition-colors">
									<td class="py-2 px-2">
										<div class="flex items-center gap-2">
											<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:{getColor(s.linea)}"></span>
											<span class="font-mono font-semibold text-g360-text dark:text-g360-textDark">{s.sku}</span>
										</div>
									</td>
									<td class="py-2 px-2 text-g360-muted dark:text-g360-mutedDark text-[10px]">
										<span class="badge badge-primary px-1.5 py-0 text-[9px]">{s.nomLinea || s.linea}</span>
									</td>
									<td class="py-2 px-2 text-right font-bold text-primary-600 dark:text-primary-400">{fmtSoles(s.solesA)}</td>
									<td class="py-2 px-2 text-right text-g360-muted dark:text-g360-mutedDark">{fmtSoles(s.solesB)}</td>
									<td class="py-2 px-2 text-right font-semibold {varClass(s.varSolesA_B)}">{fmtVar(s.varSolesA_B)}</td>
									<td class="py-2 px-2 text-right text-g360-muted dark:text-g360-mutedDark opacity-70">{fmtSoles(s.solesC)}</td>
									<td class="py-2 px-2 text-right">{fmtNum(s.qtyA)}</td>
									<td class="py-2 px-1 text-right">
										<button
											class="text-g360-muted dark:text-g360-mutedDark hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-1"
											on:click={() => goto(`${base}/ficha/${encodeURIComponent(skuFuerza(s))}`)}
											title="Ver ficha del cliente"
										>
											›
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark mt-3 text-center">
					Toca › para abrir ficha · Toca encabezado para ordenar
				</p>
			{/if}
		</div>
	{/if}
	{/if}
</div>
