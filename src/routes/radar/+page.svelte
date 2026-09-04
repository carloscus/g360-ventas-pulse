<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import G360Signature from '$lib/components/G360Signature.svelte';
	import { vendedorActivo, restaurarSesion } from '$lib/stores/vendedor.js';
	import { cargarRuta, toggleVisita, rutaDia } from '$lib/stores/ruta.js';
	import { cachedGet } from '$lib/api/cache.js';
	import { cargarClientesVendedor } from '$lib/api/clientes.js';
	import { cargarRadar, priorizarRadar, adjuntarStock } from '$lib/api/radar.js';
	import { getStockMapa, disponibleSku, clasificarStock } from '$lib/api/stock.js';
	import { pullToRefresh } from '$lib/actions/ptr.js';
	import { fmtSoles, fmtNum } from '$lib/utils/format.js';
	import { displayCliente, displayVendedor } from '$lib/utils/display.js';
	import { setClienteContexto } from '$lib/stores/contexto.js';
	import ModuleNav from '$lib/components/ModuleNav.svelte';

	let cargando = true;
	let error = null;
	let offline = false;
	let soloRuta = false;
	let clientes = [];
	let nomVendedor = '';
	let stockMapa = null;
	let stockMeta = null;
	let stockCargando = false;
	let totalRuta = 0;

	$: vendedor = $vendedorActivo;
	$: rutaIds = $rutaDia;
	$: clientesVistos = soloRuta ? clientes.filter((c) => rutaIds.includes(c.id_cliente)) : clientes;

	async function cargar() {
		if (!vendedor) return;
		cargando = true;
		error = null;
		await cargarRuta(vendedor.id);
		// Solo se necesitan clientes ACTIVOS (<180d): ventana corta evita el
		// statement timeout con vendedores masivos (ej. 01186 zona centro)
		const d180 = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
		const dirRes = await cargarClientesVendedor(vendedor.id, d180, new Date().toISOString().slice(0, 10));
		if (dirRes.error) {
			error = dirRes.error;
			clientes = [];
			cargando = false;
			return;
		}
		offline = dirRes.source !== 'network';
		if (!nomVendedor && dirRes.data?.[0]?.nom_vendedor) nomVendedor = dirRes.data[0].nom_vendedor;
		const ids = [...new Set((dirRes.data || []).map((x) => x.id_cliente))];
		// El directorio ya es ventana 180d = clientes activos
		const res = await cargarRadar(ids, ids);
		if (res.error) {
			error = res.error;
			clientes = [];
		} else {
			offline = res.source !== 'network';
			clientes = priorizarRadar(res.data);
			calcularTotal();
		}
		cargando = false;
		await cargarStock();
	}

	$: if ($rutaDia) calcularTotal();
	function calcularTotal() {
		totalRuta = clientes
			.filter((c) => $rutaDia.includes(c.id_cliente))
			.reduce((a, c) => a + c.valorTotal, 0);
	}

	async function cargarStock(force = false) {
		stockCargando = true;
		const res = await getStockMapa({ force });
		stockMapa = res.mapa;
		stockMeta = res.meta;
		if (res.mapa) clientes = adjuntarStock(clientes, res.mapa, disponibleSku);
		stockCargando = false;
	}

	async function marcar(idCliente) {
		if (!vendedor) return;
		await toggleVisita(vendedor.id, idCliente);
	}

	function stockBadgeClass(cls) {
		if (cls === 'ok') return 'badge-success';
		if (cls === 'bajo') return 'badge-warning';
		return 'badge-danger';
	}

	function stockTexto(disp, cls) {
		if (cls === 'ok') return 'stock ' + fmtNum(disp);
		if (cls === 'bajo') return 'bajo ' + fmtNum(disp);
		if (cls === 'sin') return 'sin stock';
		return 's/d stock';
	}

	function abrirFicha(idCliente) {
		goto(`${base}/ficha/${encodeURIComponent(idCliente)}`);
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
	function goBack() { if (history.length > 1) history.back(); else goto(`${base}/dashboard`); }
</script>

<svelte:head>
	<title>Radar - Ventas Cockpit</title>
</svelte:head>

<div class="min-h-screen px-4 py-6 max-w-3xl mx-auto pb-24"  use:pullToRefresh={{onRefresh: cargar}}>
	<header class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<button class="btn-ghost" on:click={goBack} title="Volver" aria-label="Volver">
</button>
			<div>
				<h1 class="text-lg font-bold text-g360-text dark:text-g360-textDark">Radar de recompra</h1>
				<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
					Vendedor {displayVendedor(vendedor?.id)}{#if nomVendedor} - {nomVendedor}{/if} · Datos hasta 16:00 (Perú)
					{#if stockMeta?.stale}
						<span class="badge badge-warning px-1.5 py-0 text-[10px]">obsoleto</span>
					{/if}
					{#if stockMeta?.fecha_descarga} · stock {new Date(stockMeta.fecha_descarga).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })}{/if}
				</p>
			</div>
		</div>
		<div class="flex items-center gap-1 shrink-0">
			<button class="btn-ghost" on:click={() => cargarStock(true)} disabled={stockCargando} title="Actualizar stock">↻</button>
		</div>
	</header>
	<ModuleNav activo="radar" />

	{#if rutaIds.length > 0}
		<div class="glass-card p-4 mb-4 flex items-center justify-between">
			<div>
				<p class="text-sm font-bold text-g360-text dark:text-g360-textDark">
					Ruta del dia: {rutaIds.length} visita{rutaIds.length === 1 ? '' : 's'}
				</p>
				<p class="text-xs text-g360-muted dark:text-g360-mutedDark">Valor estimado de la ruta</p>
			</div>
			<p class="text-lg font-bold text-primary-700 dark:text-primary-400">{fmtSoles(totalRuta)}</p>
			<button class="btn-ghost text-xs shrink-0" on:click={() => (soloRuta = !soloRuta)}>${soloRuta ? 'Ver todas' : 'Ver solo ruta'}</button>
		</div>
	{/if}

	{#if offline && !cargando && !error}
		<div class="badge badge-warning mb-4">Datos desde cache (sin actualizar)</div>
	{/if}

	{#if cargando}
		<div class="glass-card p-8 text-center text-g360-muted dark:text-g360-mutedDark">
			Analizando cadencias…
		</div>
	{:else if error}
		<div class="glass-card p-8 text-center">
			<p class="text-danger-600 dark:text-danger-400 font-semibold mb-2">No se pudo cargar el radar</p>
			<p class="text-xs text-g360-muted dark:text-g360-mutedDark mb-4">{error.message || error}</p>
			<button class="btn-primary" on:click={cargar}>Reintentar</button>
		</div>
	{:else if clientesVistos.length === 0}
		<div class="glass-card p-8 text-center text-g360-muted dark:text-g360-mutedDark">
			<p class="font-semibold mb-1">Sin oportunidades por ahora</p>
			<p class="text-xs">Ningún SKU de tus clientes activos supera su cadencia de recompra. Vuelve mañana.</p>
		</div>
	{:else}
		<ul class="space-y-3">
			{#each clientesVistos as c (c.id_cliente)}
				<li class="glass-card p-4">
					<div class="flex items-start justify-between gap-3 mb-2">
						<button class="text-left min-w-0" on:click={() => abrirFicha(c.id_cliente)}>
							<p class="font-semibold text-g360-text dark:text-g360-textDark truncate">
								{c.nom_cliente}
							</p>
							<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
								{displayCliente(c.id_cliente)} · {c.productos.length} producto{c.productos.length === 1 ? '' : 's'} con recompra vencida ({c.skus.length} SKU)
							</p>
						</button>
						<div class="text-right shrink-0 max-w-[40%]">
							<p class="font-bold text-primary-700 dark:text-primary-400">{fmtSoles(c.valorTotal)}</p>
							<button
								class="btn-ghost text-xs px-3 py-1 min-h-[44px] {rutaIds.includes(c.id_cliente) ? 'text-success-600 dark:text-success-400 font-bold' : ''}"
								on:click={() => marcar(c.id_cliente)}
							>
								{rutaIds.includes(c.id_cliente) ? '✓ En ruta' : '+ Agregar'}
							</button>
						</div>
					</div>
					<ul class="space-y-1">
						{#each c.productos.slice(0, 3) as s}
							<li class="text-xs text-g360-muted dark:text-g360-mutedDark flex flex-wrap sm:flex-nowrap justify-between gap-x-2 gap-y-1">
								<span class="truncate">
									{s.nom}{#if s.variantes > 1} <span class="badge badge-primary px-1.5 py-0 text-[10px]">x{s.variantes}</span>{/if}
									{#if s.stock !== null && s.stock !== undefined}
										<span class="badge {stockBadgeClass(clasificarStock(s.stock))} px-1.5 py-0 text-[10px]">{stockTexto(s.stock, clasificarStock(s.stock))}</span>
									{/if}
									<span class="opacity-60"> ({s.linea})</span>
								</span>
								<span class="shrink-0 whitespace-nowrap">{fmtNum(s.silencio)}d sil · {fmtNum(s.cadencia)}d cad.</span>
							</li>
						{/each}
						{#if c.productos.length > 3}
							<li class="text-xs text-g360-muted dark:text-g360-mutedDark opacity-60">
								+{c.productos.length - 3} productos más
							</li>
						{/if}
					</ul>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<G360Signature version="1.0.0" />

















