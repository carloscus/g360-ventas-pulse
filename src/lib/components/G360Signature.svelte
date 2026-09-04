<script>
	/**
	 * G360Signature — Sello de identidad G360
	 * Convencion oficial: public/g360-signature.js (stock-reporter-lit)
	 * Isotipo de 3 puntos (gris/verde/gris) + chevron SVG verde +
	 * "powered by G360" en monoespaciada; version opcional tras ">".
	 * @author Carlos Cusi (CCUSI)
	 */
	export let version = '';
</script>

<div class="g360-signature">
	<div class="isotype-wrapper">
		<div class="isotype">
			<span class="dot dot-top"></span>
			<span class="dot dot-mid"></span>
			<span class="dot dot-bottom"></span>
		</div>
		<svg class="chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<polyline points="6 4 14 10 6 16"></polyline>
		</svg>
	</div>
	<span class="text">powered by G360</span>
	{#if version}
		<span class="separator">&gt;</span>
		<span class="version">{version}</span>
	{/if}
</div>

<style>
	.g360-signature {
		position: fixed;
		bottom: 16px;
		right: 16px;
		display: flex;
		align-items: center;
		gap: 4px;
		height: 18px;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-weight: normal;
		font-size: 12px;
		line-height: 1;
		z-index: 100;
		opacity: 0.4;
		transition: opacity 0.3s ease;
		cursor: default;
	}

	.g360-signature:hover {
		opacity: 1;
	}

	.isotype-wrapper {
		display: flex;
		align-items: center;
		gap: 1px;
		height: 100%;
	}

	.isotype {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		height: 100%;
	}

	.dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
	}

	.dot-top,
	.dot-bottom {
		background: #64748b;
	}

	.dot-mid {
		background: #00d084;
	}

	.chevron {
		color: #00d084;
		width: 20px;
		height: 20px;
	}

	.text {
		color: #64748b;
		letter-spacing: 0.5px;
	}

	.version {
		color: #64748b;
		opacity: 0.7;
	}

	.separator {
		color: #64748b;
		opacity: 0.5;
	}

	:global(.dark) .dot-top,
	:global(.dark) .dot-bottom,
	:global(.dark) .text,
	:global(.dark) .version,
	:global(.dark) .separator {
		color: #94a3b8;
		background: #94a3b8;
	}

	:global(.dark) .text,
	:global(.dark) .version,
	:global(.dark) .separator {
		background: transparent;
	}
</style>
