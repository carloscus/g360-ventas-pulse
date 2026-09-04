<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import G360Signature from '$lib/components/G360Signature.svelte';
	import { restaurarSesion, setVendedor, validarParVendedorCliente, normalizarCliente } from '$lib/stores/vendedor.js';
	import { getStockMapa } from '$lib/api/stock.js';
	import { displayVendedor } from '$lib/utils/display.js';

	let codigo = '';
	let cliente = '';
	let error = '';
	let verificando = false;

	onMount(async () => {
		const previo = await restaurarSesion();
		if (previo) goto(`${base}/dashboard`, { replaceState: true });
	});

	function normalizarCodigo(v) {
		const t = v.trim().toUpperCase();
		if (/^\d{1,3}$/.test(t)) return '01' + t.padStart(3, '0');
		// codigo corto con letra inicial (O01 -> 01O01, M05 -> 01M05)
		if (/^[A-Z]\d{2}$/.test(t)) return '01' + t;
		return t;
	}

	async function enviar() {
		const v = codigo.trim();
		const c = cliente.trim();
		if (!v || !c) {
			error = 'Completa tu codigo de vendedor y un cliente de tu cartera';
			return;
		}
		error = '';
		verificando = true;
		try {
			const idV = normalizarCodigo(v);
			const idC = normalizarCliente(c);
			const ok = await validarParVendedorCliente(idV, idC);
			if (!ok) {
				error = 'Vendedor o cliente incorrecto';
				verificando = false;
				return;
			}
			setVendedor({ id: idV, nombre: '', display: displayVendedor(idV) });
			// Prefetch del snapshot de stock en background: radar/dashboard abren con cache
			getStockMapa().catch(() => {});
			goto(`${base}/dashboard`);
		} catch (e) {
			console.error('Error validando par:', e);
			error = 'No se pudo validar el acceso. Verifica tu conexion';
			verificando = false;
		}
	}
</script>

<svelte:head>
	<title>Ventas Pulse - CIPSA</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center px-4 py-10">
	<div class="w-full max-w-md">
		<div class="flex justify-end mb-4">
			<ThemeToggle />
		</div>

		<div class="glass-card p-6 sm:p-8">
			<div class="flex flex-col items-center mb-6">
				<img src="{base}/logo-cipsa.svg" alt="CIPSA" class="h-16 w-auto mb-3" />
				<h1 class="text-2xl font-bold text-g360-text dark:text-g360-textDark text-center">
					Ventas Pulse
				</h1>
				<p class="text-sm text-g360-muted dark:text-g360-mutedDark mt-1 text-center">
					Cockpit de campo para vendedores CIPSA
				</p>
			</div>

			<form on:submit|preventDefault={enviar} class="space-y-4">
				<label class="block">
					<span class="text-sm font-semibold text-g360-text dark:text-g360-textDark mb-1 block">
						Codigo de vendedor
					</span>
					<input
						type="text"
						bind:value={codigo}
						placeholder="Ej: 177"
						inputmode="text"
						autocomplete="off"
						class="glass-input"
					/>
				</label>

				<label class="block">
					<span class="text-sm font-semibold text-g360-text dark:text-g360-textDark mb-1 block">
						Un cliente de tu cartera
					</span>
					<input
						type="text"
						bind:value={cliente}
						placeholder="Ej: 57796"
						inputmode="numeric"
						autocomplete="off"
						class="glass-input"
					/>
				</label>

				{#if error}
					<p class="text-sm text-danger-600 dark:text-danger-400 font-medium">{error}</p>
				{/if}

				<button type="submit" class="btn-primary w-full" disabled={verificando}>
					{verificando ? 'Verificando...' : 'Entrar'}
				</button>
			</form>
		</div>
	</div>
</div>

<G360Signature cliente="CIPSA" version="1.0.0" />
