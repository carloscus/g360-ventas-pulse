<script>
	/**
	 * G360Signature — Sello de identidad G360
	 * Adaptado para SvelteKit desde g360-order-xlsx G360Signature.jsx + App.css
	 * @author Carlos Cusi (CCUSI)
	 */
	export let cliente = 'CIPSA';
	export let showVersion = true;
	export let version = '2.0.0';
</script>

<div class="g360-signature">
	<span class="g360-signature-brand">{cliente}</span>
	<span class="g360-signature-text">powered by</span>
	<span class="g360-signature-author">G360</span>
	{#if showVersion}
		<span class="g360-signature-separator">•</span>
		<span class="g360-signature-version">v{version}</span>
	{/if}
</div>

<style>
	.g360-signature {
		position: fixed;
		bottom: 16px;
		right: 16px;
		font-size: 12px;
		color: #6b7280;
		z-index: 100;
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 6px 12px;
		display: flex;
		align-items: center;
		gap: 4px;
		transition: all 0.3s ease;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		text-transform: uppercase;
		cursor: default;
	}

	.g360-signature:hover {
		opacity: 1;
		transform: translateY(-2px);
		box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
		background: rgba(255, 255, 255, 0.08);
	}

	.g360-signature-brand {
		color: #008f5d;
		font-weight: 700;
		text-shadow: 0 0 10px rgba(0, 208, 132, 0.3);
	}

	:global(.dark) .g360-signature-brand {
		color: #00d084;
	}

	.g360-signature-text {
		opacity: 0.7;
	}

	.g360-signature-author {
		font-weight: 500;
	}

	.g360-signature-separator {
		opacity: 0.5;
		margin: 0 2px;
	}

	.g360-signature-version {
		opacity: 0.7;
		font-size: 10px;
	}

	:global(.dark) .g360-signature {
		color: #94a3b8;
		background: rgba(0, 0, 0, 0.2);
		border-color: rgba(255, 255, 255, 0.08);
	}

	:global(.dark) .g360-signature:hover {
		background: rgba(0, 0, 0, 0.3);
	}
</style>
