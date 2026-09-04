/**
 * PullToRefresh — acción Svelte: jalar el contenido hacia abajo
 * en la parte superior de la página para refrescar.
 * use:pullToRefresh={{onRefresh: cargar, threshold: 80}}
 */
export function pullToRefresh(node, { onRefresh, threshold = 80 } = {}) {
	let startY = 0;
	let pulling = false;
	let distance = 0;

	const indicator = document.createElement('div');
	indicator.setAttribute('role', 'status');
	indicator.setAttribute('aria-live', 'polite');
	indicator.style.cssText = 'position:absolute;top:0;left:0;right:0;z-index:40;padding:14px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;transform:translateY(-100%);transition:transform 0.2s ease;pointer-events:none;background:transparent;';
	indicator.textContent = 'Jalar para refrescar';
	node.style.position = node.style.position || 'relative';
	node.prepend(indicator);

	function onTouchStart(e) {
		if (node.scrollTop > 0) return;
		startY = e.touches[0].clientY;
		pulling = true;
		distance = 0;
	}

	function onTouchMove(e) {
		if (!pulling || node.scrollTop > 0) { distance = 0; return; }
		distance = e.touches[0].clientY - startY;
		if (distance <= 0) return;
		const clamped = Math.min(distance * 0.4, 90);
		indicator.style.transform = `translateY(${clamped - 90}px)`;
		indicator.textContent = distance > threshold ? 'Soltar para refrescar' : 'Jalar para refrescar';
		if (distance > threshold) e.preventDefault();
	}

	function onTouchEnd() {
		if (!pulling) return;
		pulling = false;
		if (distance > threshold && node.scrollTop === 0 && typeof onRefresh === 'function') {
			indicator.textContent = 'Actualizando...';
			indicator.style.transform = 'translateY(0)';
			Promise.resolve(onRefresh()).finally(() => {
				setTimeout(() => { indicator.style.transform = 'translateY(-100%)'; }, 800);
			});
		} else {
			indicator.style.transform = 'translateY(-100%)';
		}
		distance = 0;
	}

	node.addEventListener('touchstart', onTouchStart, { passive: true });
	node.addEventListener('touchmove', onTouchMove, { passive: false });
	node.addEventListener('touchend', onTouchEnd, { passive: true });

	return {
		update(args) { onRefresh = args.onRefresh; },
		destroy() {
			node.removeEventListener('touchstart', onTouchStart);
			node.removeEventListener('touchmove', onTouchMove);
			node.removeEventListener('touchend', onTouchEnd);
			indicator.remove();
		}
	};
}
