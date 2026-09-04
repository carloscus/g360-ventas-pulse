import { writable } from 'svelte/store';

function getTodayDate() {
	return typeof window !== 'undefined'
		? new Date().toISOString().split('T')[0]
		: '';
}

const codigoAlmacenDefault = 'VES';

export const clientData = writable({
	ruc: '',
	nombre: '',
	codigoCliente: '',
	fecha: getTodayDate(),
	vendedor: ''
});

export const returnLines = writable([]);

export function updateClientField(field, value) {
	clientData.update(data => ({ ...data, [field]: value }));
}

export function addReturnLine(product) {
	returnLines.update(lines => [...lines, {
		id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
		codigoAlmacen: codigoAlmacenDefault,
		codigo: product.codigo,
		ean: product.ean || '',
		nombre: product.nombre || '',
		nombre_corto: product.nombre_corto || '',
		linea: product.linea || '',
		categoria: product.categoria || '',
		cantidad: product.cantidad || 0,
		peso_kg: product.can_kg_um || 0,
		un_bx: product.un_bx || 1,
		observacion: product.observacion || '',
		foto: product.foto || null,
		precio: product.precio || 0,
		esManual: product.esManual || false
	}]);
}

export function removeReturnLine(id) {
	returnLines.update(lines => lines.filter(l => l.id !== id));
}

export function updateLineField(id, field, value) {
	returnLines.update(lines => {
		const idx = lines.findIndex(l => l.id === id);
		if (idx === -1) return lines;
		const updated = [...lines];
		updated[idx] = { ...updated[idx], [field]: value };
		return updated;
	});
}

export function clearAll() {
	clientData.set({
		ruc: '',
		nombre: '',
		codigoCliente: '',
		fecha: getTodayDate(),
		vendedor: ''
	});
	returnLines.set([]);
}
