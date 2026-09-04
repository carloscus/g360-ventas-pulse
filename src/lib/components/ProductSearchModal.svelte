<script>
	import { createEventDispatcher } from 'svelte';
	import { getCatalogoPorSku } from '$lib/api/catalogo.js';
	import { getStockMapa, disponibleSku, clasificarStock } from '$lib/api/stock.js';
	import { postgrestGet, eq, gte, lte, inList } from '$lib/api/postgrest.js';
	import { clienteContexto } from '$lib/stores/contexto.js';
	import { cargarClientesVendedor } from '$lib/api/clientes.js';
	import { compararClientesPorSku } from '$lib/api/precios.js';
	import { vendedorActivo, restaurarSesion } from '$lib/stores/vendedor.js';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { fmtSoles, fmtNum } from '$lib/utils/format.js';
	import { displayCliente } from '$lib/utils/display.js';
	import { abrirCalculadora } from '$lib/stores/calculadora.js';

	const dispatch = createEventDispatcher();
	export let open = false;

	let query = '';
	let resProductos = [];
	let resClientes = [];
	let buscado = false;
	let cargando = false;
	let stockMapa = null;
	let stockMeta = null;
	let preciosCliente = new Map();
	let ncsCliente = new Map();
	let clienteCtx = null;
	let debounceTimer = null;
	let misClientes = [];
	let comparativa = null;
	let comparativaSku = null;
	let comparativaCargando = false;
	let ultimaPorSku = new Map();

	$: clienteCtx = $clienteContexto;
	$: if (open) {
		alAbrir();
	}

	async function alAbrir() {
		clearTimeout(debounceTimer);
		query = '';
		resProductos = [];
		resClientes = [];
		misClientes = [];
		buscado = false;
		preciosCliente = new Map();
		ncsCliente = new Map();
		comparativa = null;
		comparativaSku = null;
		if (!stockMapa) {
			const s = await getStockMapa();
			stockMapa = s.mapa;
			stockMeta = s.meta;
		}
		if (clienteCtx?.id) {
			try {
				const hoy = new Date().toISOString().slice(0, 10);
				const d365 = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
				const rows = await postgrestGet('vw_historial_venta_cliente', {
					filters: [
						eq('id_cliente', clienteCtx.id),
						gte('fecha_orig', d365),
						lte('fecha_orig', hoy)
					],
					select: 'id_articulo,precio_unitario,cantidad,soles,fecha_orig,tipo_operacion,tpo_doc,serie_doc,nro_doc',
					order: 'fecha_orig.desc'
				});
				const vistos = new Map();
				const ncs = new Map();
				for (const r of rows) {
					const k = String(r.id_articulo);
					if (r.tipo_operacion === 'ajuste_valor') {
						const n = ncs.get(k) || { soles: 0, n: 0 };
						n.soles += Math.abs(Number(r.soles) || 0);
						n.n += 1;
						ncs.set(k, n);
						continue;
					}
					if (!(Number(r.precio_unitario) > 0)) continue;
					if (!vistos.has(k)) vistos.set(k, []);
					if (vistos.get(k).length < 2) {
						vistos.get(k).push({
							precio: r.precio_unitario,
							fecha: r.fecha_orig,
							cantidad: Number(r.cantidad) || 0,
							doc: [r.serie_doc, r.nro_doc].filter(Boolean).join('-')
						});
					}
				}
				preciosCliente = vistos;
				ncsCliente = ncs;
			} catch (e) {
				console.warn('[busqueda] precios cliente s/d:', e?.message);
			}
		}
		// Cartera en background (cacheada tras la primera vez): para la seccion CLIENTES
		const vendedor = $vendedorActivo || (await restaurarSesion());
		if (vendedor) {
			const d180 = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
			const hoy = new Date().toISOString().slice(0, 10);
			const res = await cargarClientesVendedor(vendedor.id, d180, hoy);
			if (!res.error) misClientes = agrupar(res.data || []);
		}
		setTimeout(() => document.getElementById('prod-search-input')?.focus(), 50);
	}

	function agrupar(rows) {
		const porCliente = new Map();
		for (const r of rows) {
			if (r.tipo_operacion !== 'venta') continue;
			let c = porCliente.get(r.id_cliente);
			if (!c) {
				c = { id_cliente: r.id_cliente, nom_cliente: r.nom_cliente || r.id_cliente, monto: 0, ultima: '' };
				porCliente.set(r.id_cliente, c);
			}
			c.monto += Number(r.soles) || 0;
			if (r.fecha_orig > c.ultima) c.ultima = r.fecha_orig;
		}
		return [...porCliente.values()].sort((a, b) => b.monto - a.monto);
	}

	function onInput() {
		clearTimeout(debounceTimer);
		const q = query.trim();
		if (q.length < 2) {
			resProductos = [];
			resClientes = [];
			buscado = false;
			return;
		}
		debounceTimer = setTimeout(() => buscar(q), 260);
	}

	async function buscar(q) {
		q = (q ?? query).trim().toLowerCase();
		if (q.length < 2) return;
		cargando = true;
		buscado = true;
		const catalogo = await getCatalogoPorSku();
		resProductos = [...catalogo.values()]
			.filter((p) =>
				p.sku.toLowerCase().includes(q) ||
				p.nombre.toLowerCase().includes(q) ||
				(p.linea || '').toLowerCase().includes(q)
			)
			.slice(0, 20)
			.map((p) => ({
				...p,
				stock: disponibleSku(stockMapa, p.sku),
				precioCliente: preciosCliente.get(String(p.sku)) || null,
				ncCliente: ncsCliente.get(String(p.sku)) || null,
				ultima: ultimaPorSku.get(String(p.sku)) || null
			}));
		resClientes = misClientes
			.filter((c) =>
				c.nom_cliente.toLowerCase().includes(q) ||
				c.id_cliente.includes(q)
			)
			.slice(0, 10);
		cargando = false;
		const skusRes = resProductos.map((r) => String(r.sku));
		if (skusRes.length > 0) {
			await cargarUltimaCompra(skusRes);
			resProductos = resProductos.map((r) => ({ ...r, ultima: ultimaPorSku.get(String(r.sku)) || r.ultima }));
		}
	}

	async function cargarUltimaCompra(skus) {
		try {
			const hoy = new Date().toISOString().slice(0, 10);
			const d730 = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
			const vendedor = $vendedorActivo || (await restaurarSesion());
			if (!vendedor) return;
			const rows = await postgrestGet('vw_historial_venta_cliente', {
				filters: [
					eq('id_vendedor', vendedor.id),
					inList('id_articulo', skus),
					eq('tipo_operacion', 'venta'),
					gte('fecha_orig', d730),
					lte('fecha_orig', hoy)
				],
				select: 'id_articulo,fecha_orig,nom_cliente,cantidad,precio_unitario',
				order: 'fecha_orig.desc'
			});
			const mapa = new Map();
			for (const r of rows) {
				const k = String(r.id_articulo);
				if (!mapa.has(k)) mapa.set(k, { fecha: r.fecha_orig, nom_cliente: r.nom_cliente, cantidad: Number(r.cantidad) || 0 });
			}
			ultimaPorSku = mapa;
		} catch (e) {
			console.warn('[busqueda] última compra s/d:', e?.message);
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
		const vendedor = $vendedorActivo || (await restaurarSesion());
		const r = vendedor ? await compararClientesPorSku(vendedor.id, sku) : { data: [] };
		comparativa = r.data || [];
		comparativaCargando = false;
	}

	function abrirCliente(id) {
		cerrar();
		goto(`${base}/ficha/${encodeURIComponent(id)}`);
	}

	function cerrar() {
		clearTimeout(debounceTimer);
		open = false;
		dispatch('close');
	}

	function claseStock(d) {
		const cls = clasificarStock(d);
		return cls === 'ok' ? 'badge-success' : cls === 'bajo' ? 'badge-warning' : 'badge-danger';
	}

	function textoStock(d) {
		const cls = clasificarStock(d);
		if (cls === 'ok') return 'stock ' + fmtNum(d);
		if (cls === 'bajo') return 'bajo ' + fmtNum(d);
		if (cls === 'sin') return 'sin stock';
		return 's/d stock';
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 pt-[6vh]"
		on:click={cerrar}
		on:keydown={(e) => e.key === 'Escape' && cerrar()}
		role="button"
		tabindex="-1"
	>
		<div
			class="glass-card w-full max-w-lg max-h-[82vh] flex flex-col"
			on:click|stopPropagation
			role="dialog"
		>
			<div class="p-4 pb-2 border-b border-g360-surface/50 dark:border-white/10">
				<div class="flex items-center gap-2">
					<input
						id="prod-search-input"
						type="text"
						bind:value={query}
						on:input={onInput}
						placeholder="Producto, cliente o codigo..." aria-label="Buscar producto o cliente"
						class="glass-input"
					/>
					<button class="btn-ghost shrink-0" on:click={cerrar} aria-label="Cerrar busqueda">X</button>
				</div>

				<p class="text-[10px] mt-1.5 font-semibold {clienteCtx?.id ? 'text-primary-700 dark:text-primary-400' : 'text-g360-muted dark:text-g360-mutedDark'}">
					{#if clienteCtx?.id}
						Contexto: precios vendidos a {clienteCtx.nombre || clienteCtx.id} (últimos 12 meses)
					{:else}
						Contexto: sin cliente abierto - precio de lista general
					{/if}
				</p>
				{#if stockMeta?.fecha_descarga}
					<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">
						Stock del {new Date(stockMeta.fecha_descarga).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
					</p>
				{/if}
			</div>

			<div class="overflow-y-auto p-2 flex-1">
				{#if cargando}
					<p class="p-4 text-sm text-g360-muted dark:text-g360-mutedDark text-center">Buscando...</p>
				{:else if !buscado}
					<p class="p-4 text-sm text-g360-muted dark:text-g360-mutedDark text-center">
						Escribe 2+ caracteres: productos y clientes aparecen mientras escribes
					</p>
				{:else if resProductos.length === 0 && resClientes.length === 0}
					<p class="p-4 text-sm text-g360-muted dark:text-g360-mutedDark text-center">
						Sin resultados para "{query}"
					</p>
				{:else}
					{#if resProductos.length > 0}
						<p class="text-[10px] font-bold uppercase tracking-wide text-g360-muted dark:text-g360-mutedDark px-2 pt-2 pb-1">
							Productos ({resProductos.length})
						</p>
						<ul class="space-y-1 mb-2">
							{#each resProductos as p (p.sku)}
								<li class="p-3 rounded-xl hover:bg-primary-50/50 dark:hover:bg-white/5">
									<button class="w-full text-left" on:click={() => toggleComparativa(p.sku)}>
										<p class="text-[10px] font-semibold text-primary-700 dark:text-primary-400">
											{comparativaSku === p.sku ? "Ocultar precios por cliente" : "Precios por cliente"} {#if p.ultima}- última compra: {p.ultima.fecha} por {String(p.ultima.nom_cliente || "").slice(0, 20)} ({fmtNum(p.ultima.cantidad)} und){/if}
										</p>
									</button>
									<div class="flex items-center justify-between gap-2">
										<div class="min-w-0">
											<p class="text-sm font-semibold text-g360-text dark:text-g360-textDark truncate">
												{p.nombre}
											</p>
											<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
												{p.sku} - {p.linea}{#if p.un_bx} - caja x{p.un_bx}{/if}
											</p>
										</div>
										<div class="text-right shrink-0">
											{#if p.precioCliente}
												<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">a tu cliente:</p>
												<button class="text-sm font-bold text-primary-700 dark:text-primary-400 leading-tight cursor-pointer" title="Calcular con IGV" on:click={() => abrirCalculadora(p.precioCliente[0].precio)}>
													{fmtSoles(p.precioCliente[0].precio)}
													<span class="text-[10px] opacity-70">x{fmtNum(p.precioCliente[0].cantidad)} {p.precioCliente[0].fecha?.slice(5)}</span>
												</button>
												{#if p.precioCliente[0].doc}
													<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark leading-tight">F. {p.precioCliente[0].doc}</p>
												{/if}
												{#if p.precioCliente[1]}
													<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark leading-tight">
														ant. {fmtSoles(p.precioCliente[1].precio)} x{fmtNum(p.precioCliente[1].cantidad)}
													</p>
												{/if}
												{#if p.ncCliente}
													<p class="text-[10px] text-warning-700 dark:text-warning-400 font-semibold leading-tight">
														NC: {p.ncCliente.n} por {fmtSoles(p.ncCliente.soles)}
													</p>
												{/if}
												<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark leading-tight">
													lista {p.precio_lista ? fmtSoles(p.precio_lista) : '-'}
												</p>
											{:else}
												<p class="text-[10px] text-g360-muted dark:text-g360-mutedDark">precio lista:</p>
												<button class="text-sm font-bold text-primary-700 dark:text-primary-400 leading-tight cursor-pointer" title="Calcular con IGV" on:click={() => abrirCalculadora(p.precio_lista)}>
													{p.precio_lista ? fmtSoles(p.precio_lista) : '-'}
												</button>
											{/if}
											{#if p.stock !== null && p.stock !== undefined}
												<span class="badge {claseStock(p.stock)} px-1.5 py-0 text-[10px]">
													{textoStock(p.stock)}
												</span>
											{/if}
										</div>
									</div>
									{#if comparativaSku === p.sku}
										{#if comparativaCargando}
											<p class="text-[11px] text-g360-muted dark:text-g360-mutedDark mt-1">Comparando clientes del vendedor...</p>
										{:else if comparativa.length > 0}
											<div class="mt-1 space-y-0.5">
												{#each comparativa as cp}
													<div class="text-[11px] flex justify-between gap-2 {cp.id_cliente === clienteCtx?.id ? 'font-bold text-g360-text dark:text-g360-textDark' : 'text-g360-muted dark:text-g360-mutedDark'}">
														<span class="truncate">{cp.nom_cliente}</span>
														<button class="shrink-0 font-semibold cursor-pointer" title="Calcular con IGV" on:click={() => abrirCalculadora(cp.ultimo.precio)}>S/{cp.ultimo.precio.toFixed(2)}{#if cp.ncConteo > 0} <span class="text-warning-700 dark:text-warning-400 text-[10px]">NCx{cp.ncConteo}</span>{/if}</button>
													</div>
													<div class="text-[10px] flex justify-between gap-2 opacity-70">
														<span>ult: {cp.ultimo.fecha} x{fmtNum(cp.ultimo.cantidad)}{cp.ultimo.folio ? ` F.${cp.ultimo.folio}` : ''}</span>
														<span>{cp.min.precio.toFixed(2) !== cp.max.precio.toFixed(2) ? `rango ${cp.min.precio.toFixed(2)} a ${cp.max.precio.toFixed(2)}` : `${cp.nDocs} ${cp.nDocs === 1 ? 'doc' : 'docs'}, ${cp.nVentas} ${cp.nVentas === 1 ? 'linea' : 'lineas'}`}</span>
													</div>
												{/each}
											</div>
										{:else}
											<p class="text-[11px] text-g360-muted dark:text-g360-mutedDark mt-1">Ningún cliente del vendedor ha comprado este SKU</p>
										{/if}
									{/if}
								</li>
							{/each}
						</ul>
					{/if}

					{#if resClientes.length > 0}
						<p class="text-[10px] font-bold uppercase tracking-wide text-g360-muted dark:text-g360-mutedDark px-2 pt-2 pb-1">
							Mis clientes ({resClientes.length})
						</p>
						<ul class="space-y-1">
							{#each resClientes as c (c.id_cliente)}
								<li>
									<button
										class="w-full text-left p-3 rounded-xl hover:bg-primary-50/50 dark:hover:bg-white/5 flex items-center justify-between gap-2"
										on:click={() => abrirCliente(c.id_cliente)}
									>
										<div class="min-w-0">
											<p class="text-sm font-semibold text-g360-text dark:text-g360-textDark truncate">
												{c.nom_cliente}{#if clienteCtx?.id === c.id_cliente} <span class="badge badge-primary px-1.5 py-0 text-[10px]">abierto</span>{/if}
											</p>
											<p class="text-xs text-g360-muted dark:text-g360-mutedDark">
												{displayCliente(c.id_cliente)} - última compra {c.ultima}
											</p>
										</div>
										<span class="shrink-0 text-sm font-bold text-primary-700 dark:text-primary-400">{fmtSoles(c.monto)}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
















