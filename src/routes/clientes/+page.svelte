<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { vendedorActivo, restaurarSesion } from '$lib/stores/vendedor.js';
	import { cargarClientesVendedor, agruparClientes } from '$lib/api/clientes.js';
	import { fmtSoles, fmtFecha, fechaISO } from '$lib/utils/format.js';
	import { displayCliente, displayVendedor } from '$lib/utils/display.js';
	import { setClienteContexto } from '$lib/stores/contexto.js';
	import { pullToRefresh } from '$lib/actions/ptr.js';
	import { proximoOrden, ordenarPor, indicador } from '$lib/utils/orden.js';


	let cargando = true;
	let resultado = null;
	let error = null;
	let clientes = [];
	let periodoDesde = '';
	let periodoHasta = '';
	let periodoAjustado = false;
	let nomVendedor = '';
	let orden = { clave: 'ultima', dir: -1 };

	$: vendedor = $vendedorActivo;

	function calcularPeriodo() {
		const hoy = new Date();
		const desde = new Date(hoy);
		desde.setDate(hoy.getDate() - 180);
		periodoDesde = fechaISO(desde);
		periodoHasta = fechaISO(hoy);
	}

	async function cargar() {
		if (!vendedor) return;
		cargando = true;
		error = null;
		const res = await cargarClientesVendedor(vendedor.id, periodoDesde, periodoHasta);
		if (res.error) {
			error = res.error;
			clientes = [];
		} else {
			const g = agruparClientes(res.data || []);
			clientes = g.clientes;
			if (!nomVendedor && g.nomVendedor) nomVendedor = g.nomVendedor;
			resultado = res;
			periodoAjustado = Boolean(res.periodoAjustado);
		}
		cargando = false;
	}

	function setOrden(clave) {
		orden = proximoOrden(orden, clave);
	}

	$: clientesVistos = ordenarPor(clientes, orden);

	function abrirFicha(cliente) {
		goto(`${base}/ficha/${encodeURIComponent(cliente.id_cliente)}`);
	}

	onMount(async () => {
		setClienteContexto(null);
		const sesion = $vendedorActivo || (await restaurarSesion());
		if (!sesion) {
			goto(base || '/');
			return;
		}
		calcularPeriodo();
		await cargar();
	});
</script>

<svelte:head>
	<title>Mis Clientes - Ventas Cockpit</title>
</svelte:head>

<div class="min-h-screen px-4 py-6 max-w-3xl mx-auto"  use:pullToRefresh={{onRefresh: cargar}}>

	<PageHeader
		title="Mis Clientes"
		showBack
		backHref="/dashboard"
		backLabel="Volver a Hoy"
		showLogo
		showProfile
		profileName={vendedor?.nombre || nomVendedor || ''}
		profileId={vendedor?.id || ''}
		showThemeToggle
	>
		<span slot="subtitle">
			Vendedor {displayVendedor(vendedor?.id)}{#if nomVendedor} - {nomVendedor}{/if} · {periodoDesde} a {periodoHasta}
		</span>
	</PageHeader>

	{#if periodoAjustado}
		<div class="badge badge-warning mb-4">Tiempo de respuesta agotado: mostrando ultimos 180 dias</div>
	{/if}

	<div class="flex gap-2 mb-3">
		<button class="px-3 py-1.5 rounded-full text-xs font-semibold min-h-[36px] {orden.clave === 'ultima' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}" on:click={() => setOrden('ultima')}>Última {indicador(orden, 'ultima')}</button>
		<button class="px-3 py-1.5 rounded-full text-xs font-semibold min-h-[36px] {orden.clave === 'monto' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}" on:click={() => setOrden('monto')}>Monto {indicador(orden, 'monto')}</button>
		<button class="px-3 py-1.5 rounded-full text-xs font-semibold min-h-[36px] {orden.clave === 'nom_cliente' ? 'bg-primary-600 text-white' : 'bg-g360-bg dark:bg-white/10 text-g360-muted dark:text-g360-mutedDark'}" on:click={() => setOrden('nom_cliente')}>Nombre {indicador(orden, 'nom_cliente')}</button>
	</div>
	{#if resultado && resultado.source && resultado.source !== 'network'}
		<div class="badge badge-warning mb-4">Datos offline (cache)</div>
	{/if}

	{#if cargando}
		<div class="glass-card p-8 text-center text-g360-muted dark:text-g360-mutedDark">
			Cargando clientes…
		</div>
	{:else if error}
		<div class="glass-card p-8 text-center">
			<p class="text-danger-600 dark:text-danger-400 font-semibold mb-2">
				No se pudo cargar la lista de clientes
			</p>
			<p class="text-xs text-g360-muted dark:text-g360-mutedDark mb-4">{error.message || error}</p>
			<button class="btn-primary" on:click={cargar}>Reintentar</button>
		</div>
	{:else if clientes.length === 0}
		<div class="glass-card p-8 text-center text-g360-muted dark:text-g360-mutedDark">
			<p class="font-semibold mb-1">Sin clientes en el período</p>
			<p class="text-xs">No hay ventas registradas para el vendedor {displayVendedor(vendedor?.id)} entre {periodoDesde} y {periodoHasta}.</p>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each clientesVistos as c (c.id_cliente)}
				<li>
					<button
						class="glass-card w-full text-left p-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
						on:click={() => abrirFicha(c)}
					>
						<div class="min-w-0">
							<p class="font-semibold text-g360-text dark:text-g360-textDark truncate">
								{c.nom_cliente}
							</p>
							<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
								{displayCliente(c.id_cliente)} · Última compra: {fmtFecha(c.ultima)}
							</p>
						</div>
						<div class="text-right shrink-0 max-w-[45%]">
							<p class="font-bold text-primary-700 dark:text-primary-400">{fmtSoles(c.monto)}</p>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

















