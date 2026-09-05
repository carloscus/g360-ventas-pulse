<script>
	/**
	 * G360Signature — Sello de identidad G360.
	 * Se renderiza dentro de AppChrome para compartir su safe area y bottom spacing.
	 */
</script>

<div class="g360-signature">
	<div class="isotype-wrapper">
		<div class="isotype" aria-hidden="true">
			<span class="dot dot-top"></span>
			<span class="dot dot-mid"></span>
			<span class="dot dot-bottom"></span>
		</div>
		<svg class="chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<polyline points="6 4 14 10 6 16"></polyline>
		</svg>
	</div>
	<span class="text">powered by G360</span>
</div>

<style>
	.g360-signature {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		max-width: 100%;
		height: var(--g360-signature-height);
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 12px;
		font-weight: normal;
		line-height: 1;
		white-space: nowrap;
		opacity: 0.68;
	}

	.isotype-wrapper {
		display: flex;
		align-items: center;
		gap: 1px;
		height: 100%;
		flex: 0 0 auto;
	}

	.isotype {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		height: 100%;
	}

	.dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--g360-chrome-signature-muted);
	}

	.dot-mid,
	.chevron {
		color: var(--g360-chrome-active);
	}

	.dot-mid {
		background: var(--g360-chrome-active);
	}

	.chevron {
		width: 20px;
		height: 20px;
		flex: 0 0 auto;
	}

	.text,
	.version,

	.text {
		letter-spacing: 0.5px;
	}


	.separator {
		opacity: 0.5;
	}
</style>
