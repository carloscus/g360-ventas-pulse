<script>
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import G360Signature from '$lib/components/G360Signature.svelte';
	import ProductSearchModal from '$lib/components/ProductSearchModal.svelte';
	import { setClienteContexto } from '$lib/stores/contexto.js';
	import { vendedorActivo, restaurarSesion } from '$lib/stores/vendedor.js';
	import { cargarFicha } from './aggregation.js';
	import { fmtSoles, fmtNum, fmtFecha, fechaISO } from '$lib/utils/format.js';
	import { generarFichaXlsx, descargarFichaXlsx } from '$lib/export/fichaXlsx.js';
	import { success, error as toastError } from '$lib/stores/toasts.js';
	import { getStockMapa, disponibleSku, clasificarStock } from '$lib/api/stock.js';
	import { cargarResumenComercial, cargarCrossSell, evolucionMensual } from '$lib/api/fichaComercial.js';
	import { cargarHistorialPrecios, analisisAnual, detectarAnomalias, historialDeSku, compararClientesPorSku } from '$lib/api/precios.js';
	import { displayCliente, displayVendedor } from '$lib/utils/display.js';
	import { proximoOrden, ordenarPor, indicador } from '$lib/utils/orden.js';

	$: clienteId = decodeURIComponent($page.params.cliente || '');

	let desde = '';
	let hasta = '';
	let cargando = true;
	let error = null;
	let offline = false;
	let filas = [];
	let rows = [];
	let exportando = false;
	let stockMapa = null;
	let resumen = null;
	let crossSell = [];
	let rowsAll = [];
	let stockMeta = null;
	let searchOpen = false;
	let preciosAbierto = false;
	let preciosCargando = false;
	let analisis = [];
	let anomalias = [];
	let historialRows = [];
	let skuExpandido = null;
	let skuDetalle = null;
	let comparativa = null;
	let comparativaSku = null;
	let comparativaCargando = false;
	let orden = { clave: 'sku', dir: 1 };
	let limite = 50;

	$: vendedor = $vendedorActivo;

	function calcularPeriodo() {
		const hoy = new Date();
		const d = new Date(hoy);
		d.setDate(hoy.getDate() - 365);
		desde = fechaISO(d);
		hasta = fechaISO(hoy);

	}

	async function cargar() {
		if (!clienteId) return;
		cargando = true;
		error = null;
		const res = await cargarFicha(clienteId, desde, hasta);
		error = res.error;
		offline = res.source !== 'network';
		limite = 50;
		filas = res.filas || [];
		rows = res.rows || [];
		setClienteContexto(clienteId, rows[0]?.nom_cliente || '');
		cargando = false;
		const s = await getStockMapa();
		stockMapa = s.mapa;
		stockMeta = s.meta;
		// Resumen comercial + cross-sell (no bloquean la tabla)
		const idsVendedor = vendedor?.id ? [vendedor.id] : [];
		const lineas = [...new Set(filas.map((f) => f.linea).filter(Boolean))];
		const skus = new Set(filas.map((f) => f.sku));
		const [resumenRes, crossRes] = await Promise.allSettled([
			cargarResumenComercial(clienteId, filas, rows, vendedor?.id, idsVendedor, null),
			cargarCrossSell(clienteId, lineas, idsVendedor, skus, stockMapa)
		]);
		if (resumenRes.status === 'fulfilled') resumen = resumenRes.value;
		if (crossRes.status === 'fulfilled') crossSell = crossRes.value;
	}


	async function togglePrecios() {
		preciosAbierto = !preciosAbierto;
		if (!preciosAbierto || analisis.length > 0) return;
		preciosCargando = true;
		try {
			const hist = await cargarHistorialPrecios(clienteId);
			if (hist.error) throw hist.error;
			historialRows = hist.data;
			analisis = analisisAnual(hist.data);
			anomalias = detectarAnomalias(hist.data, new Set(analisis.map((a) => a.sku)));
		} catch (e) {
			console.error('Error analizando precios:', e);
		} finally {
			preciosCargando = false;
		}
	}

	async function toggleComparativa(sku) {
		if (comparativaSku === sku) {
			comparativaSku = null;
			comparativa = null;
			return;
		}
		comparativaSku = sku;
		comparativaCargando = true;
		const r = await compararClientesPorSku(vendedor?.id, sku);
		comparativa = r.data || [];
		comparativaCargando = false;
	}

	function setOrden(clave) {
		orden = proximoOrden(orden, clave);
	}

	$: filasVistas = ordenarPor(filas, orden).slice(0, limite);

	function toggleDetalle(sku) {
		skuDetalle = skuDetalle === sku ? null : sku;
	}

	function toggleHistorial(sku) {
		skuExpandido = skuExpandido === sku ? null : sku;
	}

	async function exportar() {
		if (filas.length === 0) {
			toastError('No hay datos para exportar');
			return;
		}
		exportando = true;
		try {
			const blob = await generarFichaXlsx({
				clienteId,
				clienteNombre: filas[0]?.nom_articulo ? rows[0]?.nom_cliente || clienteId : clienteId,
				vendedor,
				desde,
				hasta,
				filas,
				rows
			});
			descargarFichaXlsx(blob, clienteId, desde, hasta);
			success('Export generado');
		} catch (e) {
			console.error('Error exportando:', e);
			toastError('No se pudo generar el export');
		} finally {
			exportando = false;
		}
	}

	onMount(async () => {
		const sesion = $vendedorActivo || (await restaurarSesion());
		if (!sesion) {
			goto(base || '/');
			return;
		}
		calcularPeriodo();
		await cargar();
	});
	onDestroy(() => setClienteContexto(null));
</script>

<svelte:head>
	<title>Ficha {displayCliente(clienteId)} - Ventas Cockpit</title>
</svelte:head>

<div class="min-h-screen px-4 py-6 max-w-6xl mx-auto pb-24">
	<ToastContainer />

	<header class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3 min-w-0">
			<button class="btn-ghost shrink-0" on:click={() => goto(`${base}/clientes`)} title="Volver a Mis Clientes" aria-label="Volver a Mis Clientes">←</button>
			<div class="min-w-0">
				<h1 class="text-lg font-bold text-g360-text dark:text-g360-textDark truncate">
					{rows[0]?.nom_cliente || displayCliente(clienteId)}
				</h1>
				<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
					{displayCliente(clienteId)} · {desde} a {hasta}
				</p>
			</div>
		</div>
		<div class="flex items-center gap-1 shrink-0">
			<button class="btn-ghost" on:click={() => (searchOpen = true)} title="Buscar producto">Buscar</button>
			<button class="btn-primary" on:click={exportar} disabled={exportando || filas.length === 0} title="Exportar ficha a Excel">{exportando ? '...' : 'XLSX'}</button>
			<ThemeToggle />
		</div>
	</header>


	{#if offline && !cargando && !error}
		<div class="badge badge-warning mb-4">Datos offline (cache)</div>
	{/if}

	{#if cargando}
		<div class="glass-card p-8 text-center text-g360-muted dark:text-g360-mutedDark">
			Cargando ficha…
		</div>
	{:else if error}
		<div class="glass-card p-8 text-center">
			<p class="text-danger-600 dark:text-danger-400 font-semibold mb-2">
				No se pudo cargar la ficha
			</p>
			<p class="text-xs text-g360-muted dark:text-g360-mutedDark mb-4">{error.message || error}</p>
			<button class="btn-primary" on:click={cargar}>Reintentar</button>
		</div>
	{:else if filas.length === 0}
		<div class="glass-card p-8 text-center text-g360-muted dark:text-g360-mutedDark">
			<p class="font-semibold mb-1">Sin movimientos en el período</p>
			<p class="text-xs">No hay ventas, NCs ni devoluciones entre {desde} y {hasta}.</p>
		</div>
	{:else}
		<!-- RESUMEN COMERCIAL -->
		{#if resumen}
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
				<div class="glass-card p-3 text-center">
					<p class="text-xs text-g360-muted dark:text-g360-mutedDark">Ventas</p>
					<p class="text-lg font-bold text-primary-700 dark:text-primary-400">{fmtSoles(resumen.totalVentas)}</p>
				</div>
				<div class="glass-card p-3 text-center">
					<p class="text-xs text-g360-muted dark:text-g360-mutedDark">NCs</p>
					<p class="text-lg font-bold text-warning-700 dark:text-warning-400">{fmtSoles(resumen.totalNC)}</p>
				</div>
				<div class="glass-card p-3 text-center">
					<p class="text-xs text-g360-muted dark:text-g360-mutedDark">Devuelto</p>
					<p class="text-lg font-bold text-danger-600 dark:text-danger-400">{fmtNum(resumen.totalDevuelto)} und</p>
				</div>
				<div class="glass-card p-3 text-center">
					<p class="text-xs text-g360-muted dark:text-g360-mutedDark">Frecuencia</p>
					<p class="text-lg font-bold text-g360-text dark:text-g360-textDark">
						{resumen.frecuenciaPromedio ? resumen.frecuenciaPromedio + ' dias' : 's/d'}
					</p>
				</div>
			</div>

			{#if resumen.evolucionMensual.length > 1}
				<div class="glass-card p-4 mb-4">
					<p class="text-xs font-semibold text-g360-muted dark:text-g360-mutedDark mb-3">Evolución mensual (ventas S/)</p>
					<div class="flex items-end gap-1 h-24">
						{#each resumen.evolucionMensual as m}
							{@const maxV = Math.max(...resumen.evolucionMensual.map((x) => x.soles), 1)}
							<div class="flex-1 flex flex-col items-center gap-1 min-w-0">
								<div
									class="w-full bg-primary-500/80 dark:bg-primary-400/70 rounded-t"
									style="height: {Math.max(Math.round((m.soles / maxV) * 80), 2)}px"
									title="{m.mes}: {fmtSoles(m.soles)}"
								></div>
								<span class="text-[10px] text-g360-muted dark:text-g360-mutedDark truncate w-full text-center">{m.mes.slice(5)}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if crossSell.length > 0}
				<div class="glass-card p-4 mb-4">
					<p class="text-xs font-semibold text-g360-muted dark:text-g360-mutedDark mb-2">
						Oportunidad de cross-sell - clientes similares compran:
					</p>
					<ul class="space-y-1">
						{#each crossSell as cs (cs.sku)}
							<li class="text-sm flex items-center justify-between gap-2">
								<span class="truncate text-g360-text dark:text-g360-textDark">
									{cs.nom} <span class="opacity-60">({cs.linea})</span>
								</span>
								<span class="badge badge-primary px-2 py-0 text-[10px] shrink-0">
									{cs.similarCount} clientes
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}
		<!-- PRECIOS POR ANIO -->
		<section class="mb-4">
			<button class="section-title w-full text-left" on:click={togglePrecios}>
				Precios por año {#if !preciosAbierto} (ver){/if}
			</button>
			{#if preciosAbierto}
				{#if preciosCargando}
					<div class="glass-card p-4 mt-2 text-sm text-g360-muted dark:text-g360-mutedDark">
						Analizando historial de precios...
					</div>
				{:else if analisis.length === 0}
					<div class="glass-card p-4 mt-2 text-sm text-g360-muted dark:text-g360-mutedDark">
						Sin suficientes ventas para el análisis (se requieren 3+ por SKU).
					</div>
				{:else}
					{#if anomalias.length > 0}
						<div class="glass-card p-3 mt-2 mb-2">
							<p class="text-xs font-semibold text-warning-700 dark:text-warning-400 mb-1">
								{anomalias.length} producto(s) con ventas bajo el promedio (argumento de negociacion):
							</p>
							{#each anomalias as a (a.sku)}
								<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
									{String(a.nom).slice(0, 34)} - {a.n} ventas a S/ {a.precio.toFixed(2)} vs prom S/ {a.promedio.toFixed(2)} ({a.delta_pct}%) · {fmtNum(a.cantMin)}-{fmtNum(a.cantMax)} und · {a.fechaDesde} a {a.fechaHasta}
								</p>
							{/each}
						</div>
					{/if}
					<div class="glass-card p-3 mt-2 space-y-2">
						{#each analisis.slice(0, 10) as a (a.sku)}
							<div class="border-b border-g360-surface/40 dark:border-white/5 pb-2">
								<button class="w-full text-left" on:click={() => toggleHistorial(a.sku)}>
									<div class="flex items-center justify-between gap-2">
										<div class="min-w-0">
											<p class="text-sm font-semibold text-g360-text dark:text-g360-textDark truncate">
												{String(a.nom).slice(0, 40)}
											</p>
											<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">
												{a.sku} - {a.totalVentas} ventas
											</p>
										</div>
										<div class="text-right shrink-0">
											{#if a.variacion !== null}
												<span class="badge {a.variacion >= 0 ? 'badge-success' : 'badge-danger'} px-2 py-0 text-[10px]">
													{a.variacion >= 0 ? '+' : ''}{(a.variacion * 100).toFixed(1)}%
												</span>
											{/if}
										</div>
									</div>
									<div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-g360-muted dark:text-g360-mutedDark">
										{#each a.anios as y, i}
											<span>
												<b class="text-g360-text dark:text-g360-textDark">{y.anio}</b> {y.prom.toFixed(2)} {#if y.min !== y.max} ({y.min.toFixed(2)}-{y.max.toFixed(2)}){/if}
											</span>
											{#if a.variaciones && a.variaciones[i] != null}
												{@const v = a.variaciones[i]}
												<span class="{v.pct >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'} font-semibold">
													{v.pct >= 0 ? '+' : ''}{(v.pct * 100).toFixed(1)}%
												</span>
											{/if}
										{/each}
									</div>
								</button>
								<div class="mt-1">
										<button class="text-[10px] text-primary-700 dark:text-primary-400 font-semibold py-2 min-h-[44px]" on:click={() => toggleComparativa(a.sku)}>
											{comparativaSku === a.sku ? 'Ocultar' : 'Comparar'} precios entre mis clientes
										</button>
									</div>
									{#if comparativaSku === a.sku}
										{#if comparativaCargando}
											<p class="text-[11px] text-g360-muted dark:text-g360-mutedDark mt-1">Comparando clientes...</p>
										{:else if comparativa.length > 0}
											<div class="mt-1 ml-2 border-l border-warning-400/70 dark:border-warning-600/60 pl-2 space-y-0.5">
												{#each comparativa as cp}
													<div class="text-[11px] {cp.id_cliente === clienteId ? 'font-bold text-g360-text dark:text-g360-textDark' : 'text-g360-muted dark:text-g360-mutedDark'}">
														<div class="flex justify-between gap-2">
															<span class="truncate">{cp.nom_cliente}</span>
															<span class="shrink-0 font-semibold">S/{cp.ultimo.precio.toFixed(2)}{#if cp.ncConteo > 0} <span class="text-warning-700 dark:text-warning-400 text-[10px]">NCx{cp.ncConteo}</span>{/if}</span>
														</div>
														<div class="flex justify-between gap-2 opacity-60">
															<span>ult: {cp.ultimo.fecha} x{fmtNum(cp.ultimo.cantidad)}{cp.ultimo.folio ? ` F.${cp.ultimo.folio}` : ""} {cp.min.precio !== cp.max.precio ? `- rango ${cp.min.precio.toFixed(2)} a ${cp.max.precio.toFixed(2)}` : `- ${cp.nDocs} doc, ${cp.nVentas} lineas`}</span>
														</div>
													</div>
												{/each}
											</div>
										{:else}
											<p class="text-[11px] text-g360-muted dark:text-g360-mutedDark mt-1">Eres el unico cliente que compra este SKU</p>
										{/if}
									{/if}
									{#if skuExpandido === a.sku}
									{@const hist = historialDeSku(historialRows, a.sku)}
									<div class="mt-2 pl-2 border-l border-primary-400/60 dark:border-primary-600/50">
										{#each hist.slice(0, 15) as h}
											<div class="text-[11px] py-0.5">
												<div class="flex justify-between gap-2">
													<span>{h.fecha}{#if h.nDocs > 1} <span class="opacity-60">({h.nDocs} ${h.nDocs === 1 ? 'doc' : 'docs'})</span>{:else if h.lineas > 1} <span class="opacity-60">({h.lineas} ${h.lineas === 1 ? 'linea' : 'lineas'}, 1 doc)</span>{/if}</span>
													<span class="flex gap-3">
														<span class="{h.cantidad >= 500 ? 'text-warning-700 dark:text-warning-400 font-semibold' : ''}">
															{fmtNum(h.cantidad)} und
														</span>
														<span class="font-semibold">
															{fmtSoles(h.precio)}{#if h.precioMin !== h.precioMax}<span class="opacity-60"> ({h.precioMin.toFixed(2)}-{h.precioMax.toFixed(2)})</span>{/if}
														</span>
													</span>
												</div>
												{#if h.docs && h.docs.length > 0}
													<div class="opacity-60 text-[10px]">F. {h.docs.join(", ")}{h.nDocs > h.docs.length ? ` +${h.nDocs - h.docs.length}` : ""}</div>
												{/if}
												{#if h.ncConteo > 0}
													<div class="text-warning-700 dark:text-warning-400 text-[10px] font-semibold">NC descuento: {h.ncConteo} por {fmtSoles(h.ncSoles)}</div>
												{/if}
											</div>
										{/each}
										{#if hist.length > 15}
											<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">+{hist.length - 15} días más</p>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
					{#if analisis.length > 10}
						<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark mt-2">+{analisis.length - 10} SKUs con 3+ ventas (busca en el modal)</p>
					{/if}
				{/if}
			{/if}
		</section>
		<div class="glass-card overflow-x-auto">
			<table class="w-full text-sm min-w-[860px] tabular-nums">
				<thead>
					<tr class="text-left text-xs uppercase tracking-wide text-g360-muted dark:text-g360-mutedDark border-b border-g360-surface/60 dark:border-white/10">
						<th class="py-3 px-3 cursor-pointer select-none" on:click={() => setOrden('sku')}>SKU {indicador(orden, 'sku')}</th>
						<th class="py-3 px-3">Artículo</th>
						<th class="py-3 px-3 text-right cursor-pointer select-none" on:click={() => setOrden('vendido_und')}>Und {indicador(orden, 'vendido_und')}</th>
						<th class="py-3 px-3 text-right">Cajas</th>
						<th class="py-3 px-3 text-right cursor-pointer select-none" on:click={() => setOrden('precio_ultimo')}>P. último {indicador(orden, 'precio_ultimo')}</th>
						<th class="py-3 px-3 text-right">P. anterior</th>
						<th class="py-3 px-3 text-right">P. ant. 2</th>
						<th class="py-3 px-3 text-right cursor-pointer select-none" on:click={() => setOrden('nc_soles')}>NC S/ {indicador(orden, 'nc_soles')}</th>
						<th class="py-3 px-3 text-right">NC #</th>
						<th class="py-3 px-3 text-right cursor-pointer select-none" on:click={() => setOrden('devuelto_und')}>Dev. und {indicador(orden, 'devuelto_und')}</th>
						<th class="py-3 px-3 text-right">Stock</th>
						<th class="py-3 px-3 text-right cursor-pointer select-none" on:click={() => setOrden('saldo_soles')}>Saldo S/ {indicador(orden, 'saldo_soles')}</th>
					</tr>
				</thead>
				<tbody>
					{#each filasVistas as f (f.sku)}
						<tr class="border-b border-g360-surface/40 dark:border-white/5 hover:bg-primary-50/40 dark:hover:bg-white/5 cursor-pointer" on:click={() => toggleDetalle(f.sku)}>
							<td class="py-2.5 px-3 font-mono text-xs">{f.sku}</td>
							<td class="py-2.5 px-3 text-g360-text dark:text-g360-textDark">{f.nom_articulo}</td>
							<td class="py-2.5 px-3 text-right">{fmtNum(f.vendido_und)}</td>
							<td class="py-2.5 px-3 text-right text-g360-muted dark:text-g360-mutedDark">
								{f.cajas === null ? '—' : fmtNum(Math.round(f.cajas * 100) / 100)}
							</td>
							<td class="py-2.5 px-3 text-right font-semibold">{f.precio_ultimo === null ? '—' : fmtSoles(f.precio_ultimo)}</td>
							<td class="py-2.5 px-3 text-right">{f.precio_anterior === null ? '—' : fmtSoles(f.precio_anterior)}</td>
							<td class="py-2.5 px-3 text-right text-g360-muted dark:text-g360-mutedDark">{f.precio_anterior2 === null ? '—' : fmtSoles(f.precio_anterior2)}</td>
							<td class="py-2.5 px-3 text-right {f.nc_soles > 0 ? 'text-warning-700 dark:text-warning-400 font-semibold' : ''}">
								{f.nc_soles > 0 ? fmtSoles(f.nc_soles) : '—'}
							</td>
							<td class="py-2.5 px-3 text-right">{f.nc_conteo > 0 ? f.nc_conteo : '—'}</td>
							<td class="py-2.5 px-3 text-right {f.devuelto_und > 0 ? 'text-danger-600 dark:text-danger-400 font-semibold' : ''}">
								{f.devuelto_und > 0 ? fmtNum(f.devuelto_und) : '—'}
							</td>
							<td class="py-2.5 px-3 text-right">{#if stockMapa}{#if disponibleSku(stockMapa, f.sku) !== null}<span class="badge {clasificarStock(disponibleSku(stockMapa, f.sku)) === 'ok' ? 'badge-success' : clasificarStock(disponibleSku(stockMapa, f.sku)) === 'bajo' ? 'badge-warning' : 'badge-danger'} px-1.5 py-0 text-[10px]">{fmtNum(disponibleSku(stockMapa, f.sku))}</span>{:else}<span class="opacity-60">-</span>{/if}{:else}<span class="opacity-60 text-g360-muted dark:text-g360-mutedDark">s/d</span>{/if}</td>
							<td class="py-2.5 px-3 text-right">{fmtSoles(f.saldo_soles)}</td>
						</tr>
						{#if skuDetalle === f.sku}
							<tr class="bg-primary-50/30 dark:bg-white/5">
								<td colspan="12" class="px-3 py-2 text-[11px] text-g360-muted dark:text-g360-mutedDark">
									<div class="flex flex-wrap gap-x-5 gap-y-1">
										<span><b class="text-g360-text dark:text-g360-textDark">Última atención:</b> {f.precio_ultimo === null ? '-' : fmtSoles(f.precio_ultimo)} x{fmtNum(f.ultimo_cantidad || 0)} und {f.ultimo_fecha ? `- ${f.ultimo_fecha}` : ''}{f.ultimo_doc ? ` - F. ${f.ultimo_doc}` : ''}</span>
										{#if f.rango_min !== null && f.rango_min !== f.rango_max}
											<span><b class="text-g360-text dark:text-g360-textDark">Rango:</b> {fmtSoles(f.rango_min)} a {fmtSoles(f.rango_max)}</span>
										{/if}
										{#if f.nc_detalle && f.nc_detalle.length > 0}
											<span class="text-warning-700 dark:text-warning-400"><b>NCs ({f.nc_detalle.length}):</b> {#each f.nc_detalle as nc, i}{i > 0 ? ' - ' : ''}{fmtSoles(nc.soles)} {nc.fecha}{nc.doc ? ` F.${nc.doc}` : ''}{/each}</span>
										{/if}
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
		{#if filas.length > limite}
			<button class="btn-secondary w-full mt-3" on:click={() => (limite = filas.length)}>
				Mostrar todos los {filas.length} SKUs (viendo {limite})
			</button>
		{/if}
		<p class="text-xs text-g360-muted dark:text-g360-mutedDark mt-3">
			{filas.length} SKUs · Cajas calculadas con un_bx del catálogo ({fmtFecha(desde)} → {fmtFecha(hasta)})
		</p>
	{/if}
</div>


<G360Signature version="1.0.0" />










<ProductSearchModal bind:open={searchOpen} />






























