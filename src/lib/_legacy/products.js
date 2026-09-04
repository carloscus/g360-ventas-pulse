import { writable } from 'svelte/store';
import { base } from '$app/paths';

export const productos = writable([]);

export async function loadProductos() {
	try {
		const response = await fetch(`${base}/catalogo_productos.json`);
		if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		const catalog = await response.json();
		const rawProductos = catalog.productos || [];

		const normalized = rawProductos.map(p => ({
			codigo: p.sku,
			nombre: p.nombre,
			nombre_corto: p.nombre_corto || '',
			ean: p.ean13 || '',
			precio: p.precio_lista || 0,
			precio_final: p.precio_final || p.precio_lista || 0,
			linea: p.linea || '',
			categoria: p.categoria || '',
			subcategoria: p.subcategoria || '',
			grupo: p.grupo || '',
			can_kg_um: p.peso_kg || 0,
			un_bx: p.un_bx || 1,
			moneda: p.moneda || 'PEN',
			descuento_pct: p.descuento_pct || 0,
			es_remate: p.es_remate || false,
			keywords: p.keywords || [],
			imagen_url: p.imagen_url || ''
		}));

		productos.set(normalized);
		return normalized;
	} catch (err) {
		console.error('Error cargando catálogo:', err);
		return [];
	}
}

export function filterProducts(query, productList) {
	if (!query.trim()) return [];
	const lowerQuery = query.toLowerCase().trim();
	return productList.filter(p =>
		p.codigo.toLowerCase().includes(lowerQuery) ||
		(p.nombre && p.nombre.toLowerCase().includes(lowerQuery)) ||
		(p.nombre_corto && p.nombre_corto.toLowerCase().includes(lowerQuery)) ||
		(p.ean && p.ean.includes(lowerQuery)) ||
		(p.linea && p.linea.toLowerCase().includes(lowerQuery)) ||
		(p.keywords && p.keywords.some(k => k.toLowerCase().includes(lowerQuery)))
	).slice(0, 50);
}
