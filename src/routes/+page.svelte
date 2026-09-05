<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { restaurarSesion, setVendedor, validarParVendedorCliente, normalizarCliente } from '$lib/stores/vendedor.js';
	import { getStockMapa } from '$lib/api/stock.js';
	import { displayVendedor } from '$lib/utils/display.js';

	let codigo = '';
	let cliente = '';
	let error = '';
	let verificando = false;

	// Rate limit de login: 2 intentos fallidos -> bloqueo 3 min.
	// Persistente en localStorage (recargar no lo resetea). Freno de cliente:
	// la garantia real de acceso sera Supabase Auth + RLS (fase 4).
	const MAX_INTENTOS = 2;
	const BLOQUEO_MS = 3 * 60 * 1000;
	const LS_FAILS = 'vp_login_fails';
	const LS_UNTIL = 'vp_login_bloqueo_hasta';
	let restanteBloqueo = 0;
	let timerBloqueo = null;

	function bloqueoActivo() {
		const until = Number(localStorage.getItem(LS_UNTIL) || 0);
		if (until > Date.now()) return until;
		if (until) {
			localStorage.removeItem(LS_UNTIL);
			localStorage.removeItem(LS_FAILS);
		}
		return 0;
	}

	function iniciarCuenta(until) {
		clearInterval(timerBloqueo);
		const tick = () => {
			restanteBloqueo = Math.max(0, Math.ceil((until - Date.now()) / 1000));
			if (restanteBloqueo === 0) clearInterval(timerBloqueo);
		};
		tick();
		timerBloqueo = setInterval(tick, 1000);
	}

	onMount(async () => {
		const until = bloqueoActivo();
		if (until) iniciarCuenta(until);
		const previo = await restaurarSesion();
		if (previo) goto(`${base}/dashboard`, { replaceState: true });
	});

	onDestroy(() => clearInterval(timerBloqueo));

	function normalizarCodigo(v) {
		const t = v.trim().toUpperCase();
		if (/^\d{1,3}$/.test(t)) return '01' + t.padStart(3, '0');
		// codigo corto con letra inicial (O01 -> 01O01, M05 -> 01M05)
		if (/^[A-Z]\d{2}$/.test(t)) return '01' + t;
		return t;
	}

	async function enviar() {
		if (restanteBloqueo > 0) return;
		const until = bloqueoActivo();
		if (until) {
			iniciarCuenta(until);
			return;
		}
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
				registrarFallo();
				verificando = false;
				return;
			}
			localStorage.removeItem(LS_FAILS);
			localStorage.removeItem(LS_UNTIL);
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

	function registrarFallo() {
		const fails = Number(localStorage.getItem(LS_FAILS) || 0) + 1;
		if (fails >= MAX_INTENTOS) {
			const until = Date.now() + BLOQUEO_MS;
			localStorage.setItem(LS_UNTIL, String(until));
			localStorage.setItem(LS_FAILS, String(fails));
			iniciarCuenta(until);
			error = `Acceso bloqueado ${Math.round(BLOQUEO_MS / 60000)} minutos por intentos fallidos`;
		} else {
			localStorage.setItem(LS_FAILS, String(fails));
			const restan = MAX_INTENTOS - fails;
			error = `Vendedor o cliente incorrecto (${restan} intento${restan === 1 ? '' : 's'} restante${restan === 1 ? '' : 's'})`;
		}
	}
</script>

<svelte:head>
	<title>Ventas Pulse - CIPSA</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center px-4 py-10">
	<div class="w-full max-w-md">
		<PageHeader variant="minimal" showThemeToggle />

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
						placeholder="Tu codigo asignado"
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
						placeholder="Codigo de un cliente que atiendas"
						inputmode="numeric"
						autocomplete="off"
						class="glass-input"
					/>
				</label>

			{#if restanteBloqueo > 0}
				<div class="rounded-xl bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-800 p-3 text-center">
					<p class="text-sm font-semibold text-warning-700 dark:text-warning-400">
						Acceso bloqueado temporalmente
					</p>
					<p class="text-xs text-warning-700 dark:text-warning-400 mt-1">
						Reintenta en {Math.floor(restanteBloqueo / 60)}:{String(restanteBloqueo % 60).padStart(2, '0')}
					</p>
				</div>
			{:else if error}
				<p class="text-sm text-danger-600 dark:text-danger-400 font-medium">{error}</p>
			{/if}

			<button type="submit" class="btn-primary w-full" disabled={verificando || restanteBloqueo > 0}>
				{verificando ? 'Verificando...' : restanteBloqueo > 0 ? 'Bloqueado' : 'Entrar'}
			</button>
			</form>
		</div>
	</div>
</div>

