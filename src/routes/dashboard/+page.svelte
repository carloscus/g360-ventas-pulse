<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ProductSearchModal from '$lib/components/ProductSearchModal.svelte';
	import G360Signature from '$lib/components/G360Signature.svelte';
	import { vendedorActivo, restaurarSesion, setVendedorNombre } from '$lib/stores/vendedor.js';
	import { cargarDashboard } from '$lib/api/dashboard.js';
	import { cargarResumenVentas } from '$lib/api/ventasResumen.js';
	import { fmtSoles, fmtNum } from '$lib/utils/format.js';
	import { displayCliente, displayVendedor } from '$lib/utils/display.js';
	import { setClienteContexto } from '$lib/stores/contexto.js';

	let cargando = true;
	let datos = null;
	let error = null;
	let offline = false;
	let searchOpen = false;
	let comoVoy = false;
	let resumenVentas = null;
	let ventasCargando = false;

	$: vendedor = $vendedorActivo;

	async function cargar() {
		if (!vendedor) return;
		cargando = true;
		error = null;
		const res = await cargarDashboard(vendedor.id);
		datos = res;
		offline = Boolean(res.source) && res.source !== 'network';
		if (res.nomVendedor) await setVendedorNombre(res.nomVendedor);
		cargando = false;
	}

	function abrirFicha(idCliente) {
		goto(`${base}/ficha/${encodeURIComponent(idCliente)}`);
	}

	function stockClase(cls) {
		return cls === 'ok' ? 'badge-success' : cls === 'bajo' ? 'badge-warning' : 'badge-danger';
	}

	onMount(async () => {
		setClienteContexto(null);
		const sesion = $vendedorActivo || (await restaurarSesion());
		if (!sesion) {
			goto(base || '/');
			return;
		}
		await cargar();
	});
	async function toggleComoVoy() {
		comoVoy = !comoVoy;
		if (!comoVoy || resumenVentas) return;
		ventasCargando = true;
		const r = await cargarResumenVentas(vendedor.id);
		resumenVentas = r;
		ventasCargando = false;
	}
</script>

<svelte:head>
	<title>Dashboard - Ventas Pulse</title>
</svelte:head>

<div class="min-h-screen px-4 py-6 max-w-3xl mx-auto pb-24">

	<header class="flex items-center justify-between mb-5">
		<div class="flex items-center gap-3">
			<img src="{base}/logo-cipsa.svg" alt="CIPSA" class="h-9 w-auto" />
			<div>
				<h1 class="text-lg font-bold text-g360-text dark:text-g360-textDark">Hoy</h1>
				<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
					Vendedor {displayVendedor(vendedor?.id)}{#if vendedor?.nombre} - {vendedor.nombre}{/if}
				</p>
			</div>
		</div>
		<div class="flex items-center gap-1">
			<button class="btn-ghost" on:click={() => (searchOpen = true)} title="Buscar producto">Buscar</button>
			<button class="btn-ghost" on:click={() => goto(`${base}/clientes`)} title="Mis clientes">Clientes</button>
			<ThemeToggle />
		</div>
	</header>

	{#if cargando}
		<section class="mb-6">
			<h2 class="section-title mb-3">Clientes prioritarios</h2>
			<div class="glass-card p-4 space-y-3">
				{#each [0, 1, 2] as s}
					<div class="flex justify-between items-center">
						<div class="h-4 bg-g360-surface dark:bg-white/10 rounded w-2/3 animate-pulse"></div>
						<div class="h-4 bg-primary-100 dark:bg-primary-900/30 rounded w-24 animate-pulse"></div>
					</div>
				{/each}
			</div>
		</section>
		<section class="mb-6">
			<h2 class="section-title mb-3">Próximos a recompra</h2>
			<div class="glass-card p-4 space-y-2">
				{#each [0, 1] as s}
					<div class="h-3 bg-g360-surface dark:bg-white/10 rounded w-3/4 animate-pulse"></div>
				{/each}
			</div>
		</section>
		<section class="mb-6">
			<h2 class="section-title mb-3">Alertas</h2>
			<div class="glass-card p-4 space-y-2">
				<div class="h-3 bg-g360-surface dark:bg-white/10 rounded w-1/2 animate-pulse"></div>
			</div>
		</section>
	{:else if error}
		<div class="glass-card p-8 text-center">
			<p class="text-danger-600 dark:text-danger-400 font-semibold mb-2">No se pudo cargar el dashboard</p>
			<button class="btn-primary" on:click={cargar}>Reintentar</button>
		</div>
	{:else if datos}
		<!-- PRIORITARIOS -->
		<section class="mb-6">
			<h2 class="section-title mb-3">Clientes prioritarios</h2>
			{#if datos.prioritarios.length === 0}
				<div class="glass-card p-4 text-sm text-g360-muted dark:text-g360-mutedDark">
					Sin oportunidades vencidas por ahora. Revisa el radar mañana.
				</div>
			{:else}
				<ul class="space-y-2">
					{#each datos.prioritarios as c, i (c.id_cliente)}
						<li>
							<button
								class="glass-card w-full text-left p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
								on:click={() => abrirFicha(c.id_cliente)}
							>
								<div class="min-w-0">
									<p class="font-semibold text-g360-text dark:text-g360-textDark truncate">
										{i + 1}. {c.nom_cliente}
									</p>
									<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
										{displayCliente(c.id_cliente)} - {c.productos.length} productos con recompra vencida
									</p>
								</div>
								<p class="font-bold text-primary-700 dark:text-primary-400 shrink-0">{fmtSoles(c.valorTotal)}</p>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- PROXIMOS A RECOMPRA -->
		<section class="mb-6">
			<h2 class="section-title mb-3">Próximos a recompra</h2>
			{#if datos.proximos.length === 0}
				<div class="glass-card p-4 text-sm text-g360-muted dark:text-g360-mutedDark">
					Ningún SKU está por vencer su cadencia hoy.
				</div>
			{:else}
				<ul class="space-y-2">
					{#each datos.proximos as c (c.id_cliente)}
						<li class="glass-card p-4">
							<button class="font-semibold text-g360-text dark:text-g360-textDark truncate w-full text-left" on:click={() => abrirFicha(c.id_cliente)}>
								{c.nom_cliente}
							</button>
							<ul class="mt-1 space-y-0.5">
								{#each c.skus as s}
									<li class="text-xs text-g360-muted dark:text-g360-mutedDark flex justify-between gap-2">
										<span class="truncate">{s.nom} <span class="opacity-60">({s.linea})</span></span>
										<span class="shrink-0 whitespace-nowrap">faltan {s.faltan}d (cad {s.cadencia}d)</span>
									</li>
								{/each}
							</ul>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- ALERTAS -->
		<section class="mb-6">
			<h2 class="section-title mb-3">Alertas</h2>
			{#if datos.alertasStock.length === 0 && datos.caidas.length === 0}
				<div class="glass-card p-4 text-sm text-g360-muted dark:text-g360-mutedDark">
					Sin alertas por ahora.
				</div>
			{:else}
				<ul class="space-y-2">
					{#each datos.alertasStock as a}
						<li class="glass-card p-3 text-sm flex items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate text-g360-text dark:text-g360-textDark">{a.producto}</p>
								<p class="text-xs text-g360-muted dark:text-g360-mutedDark truncate">{a.cliente}</p>
							</div>
							<span class="badge {stockClase(a.clase)} shrink-0">
								{a.clase === 'sin' ? 'sin stock: no prometer' : 'disponible: ' + fmtNum(a.disponible)}
							</span>
						</li>
					{/each}
					{#each datos.caidas as cd (cd.id_cliente)}
						<li class="glass-card p-3 text-sm flex items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate text-g360-text dark:text-g360-textDark">Caida de compras</p>
								<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
									{displayCliente(cd.id_cliente)} - S/ {fmtNum(Math.round(cd.soles_actual))} vs S/ {fmtNum(Math.round(cd.soles_anterior))} (90d previos)
								</p>
							</div>
							<span class="badge badge-danger shrink-0">-{cd.caida_pct}%</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- COMO VOY -->
		<section class="mb-6">
			<button class="section-title w-full text-left" on:click={toggleComoVoy}>
				Cómo voy {#if !comoVoy} (ver){/if}
			</button>
			{#if comoVoy}
				{#if ventasCargando}
					<div class="glass-card p-4 mt-2 text-sm text-g360-muted dark:text-g360-mutedDark">
						Calculando tu anio...
					</div>
				{:else if resumenVentas}
					<div class="grid grid-cols-3 gap-3 mt-2 mb-3">
						<div class="glass-card p-3 text-center">
							<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">Mes en curso</p>
							<p class="text-base font-bold text-primary-700 dark:text-primary-400">{fmtSoles(resumenVentas.mesActual.soles)}</p>
							<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">{resumenVentas.mesActual.mes} (en curso)</p>
						</div>
						<div class="glass-card p-3 text-center">
							<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">Mes anterior</p>
							<p class="text-base font-bold text-g360-text dark:text-g360-textDark">{fmtSoles(resumenVentas.mesAnterior.soles)}</p>
							{#if resumenVentas.varVsAnterior !== null}
								<p class="text-[10px] font-semibold {resumenVentas.varVsAnterior >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}">
									{resumenVentas.varVsAnterior >= 0 ? '+' : ''}{(resumenVentas.varVsAnterior * 100).toFixed(0)}%
								</p>
							{:else}
								<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">s/d</p>
							{/if}
						</div>
						<div class="glass-card p-3 text-center">
							<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">Mismo mes {resumenVentas.mismoMesAnioAnterior.mes.slice(0, 4)}</p>
							<p class="text-base font-bold text-g360-text dark:text-g360-textDark">{fmtSoles(resumenVentas.mismoMesAnioAnterior.soles)}</p>
							{#if resumenVentas.varVsAnioAnterior !== null}
								<p class="text-[10px] font-semibold {resumenVentas.varVsAnioAnterior >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}">
									{resumenVentas.varVsAnioAnterior >= 0 ? '+' : ''}{(resumenVentas.varVsAnioAnterior * 100).toFixed(0)}%
								</p>
							{:else}
								<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">s/d</p>
							{/if}
						</div>
					</div>

					{@const maxMes = Math.max(...resumenVentas.evolucion.map((m) => m.soles), 1)}
					<div class="glass-card p-4 mb-3">
						<p class="text-xs font-semibold text-g360-muted dark:text-g360-mutedDark mb-2">Evolución {resumenVentas.mesActual.mes.slice(0, 4)} (S/)</p>
						<div class="flex items-end gap-1 h-20">
							{#each resumenVentas.evolucion as m}
								<div class="flex-1 flex flex-col items-center gap-1 min-w-0">
									<div
										class="w-full bg-primary-500/80 dark:bg-primary-400/70 rounded-t"
										style="height: {Math.max(Math.round((m.soles / maxMes) * 64), 2)}px"
										title="{m.mes}: {fmtSoles(m.soles)}"
									></div>
									<span class="text-[10px] text-g360-muted dark:text-g360-mutedDark">{m.mes.slice(5)}</span>
								</div>
							{/each}
						</div>
					</div>

					<div class="grid sm:grid-cols-2 gap-3">
						<div class="glass-card p-3">
							<p class="text-xs font-semibold text-g360-muted dark:text-g360-mutedDark mb-2">Top clientes del año</p>
							<ul class="space-y-1">
								{#each resumenVentas.topClientes as tc, i (tc.id_cliente)}
									<li>
										<button class="w-full text-left text-sm flex justify-between gap-2 hover:bg-primary-50/50 dark:hover:bg-white/5 rounded-lg px-1 py-1" on:click={() => goto(`${base}/ficha/${encodeURIComponent(tc.id_cliente)}`)}>
											<span class="truncate">{i + 1}. {tc.nom_cliente}</span>
											<span class="shrink-0 font-semibold text-primary-700 dark:text-primary-400">{fmtSoles(tc.soles)}</span>
										</button>
									</li>
								{/each}
								{#if resumenVentas.topClientes.length === 0}
									<li class="text-xs text-g360-muted dark:text-g360-mutedDark">Sin ventas este anio</li>
								{/if}
							</ul>
						</div>
						<div class="glass-card p-3">
							<p class="text-xs font-semibold text-g360-muted dark:text-g360-mutedDark mb-2">Top productos del año</p>
							<ul class="space-y-1">
								{#each resumenVentas.topProductos as tp (tp.sku)}
									<li class="text-sm flex justify-between gap-2 px-1 py-1">
										<span class="truncate">{String(tp.nom).slice(0, 30)}</span>
										<span class="shrink-0 font-semibold text-primary-700 dark:text-primary-400">{fmtSoles(tp.soles)}</span>
									</li>
								{/each}
								{#if resumenVentas.topProductos.length === 0}
									<li class="text-xs text-g360-muted dark:text-g360-mutedDark">Sin ventas este anio</li>
								{/if}
							</ul>
						</div>
					</div>
				{/if}
			{/if}
		</section>
		<!-- ACCESOS RAPIDOS -->
		<section>
			<div class="grid grid-cols-2 gap-3">
				<button class="btn-secondary" on:click={() => goto(`${base}/clientes`)}>Mis clientes</button>
				<button class="btn-primary" on:click={() => goto(`${base}/radar`)}>Radar</button>
			</div>
		</section>
	{/if}
</div>

<ProductSearchModal bind:open={searchOpen} />

<G360Signature version="1.0.0" />





















