const solesFmt = new Intl.NumberFormat('es-PE', {
	style: 'currency',
	currency: 'PEN',
	minimumFractionDigits: 2
});

const numFmt = new Intl.NumberFormat('es-PE');

export function fmtSoles(n) {
	return solesFmt.format(n || 0);
}

export function fmtNum(n) {
	return numFmt.format(n || 0);
}

export function fmtFecha(iso) {
	if (!iso) return '';
	const d = new Date(`${iso}T00:00:00`);
	if (Number.isNaN(d.getTime())) return String(iso);
	return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fechaISO(d) {
	return d.toISOString().slice(0, 10);
}
