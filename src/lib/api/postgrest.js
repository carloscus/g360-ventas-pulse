import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env.js';

const HEADERS = {
	'apikey': SUPABASE_ANON_KEY,
	'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
	'Accept': 'application/json'
};

/**
 * Cliente PostgREST minimal (solo lectura).
 * filters: array de strings ya formateados, ej: ['id_cliente=eq.00056101', 'fecha_orig=gte.2025-01-01']
 * options: { select, order, limit }
 */
export async function postgrestGet(view, { filters = [], select = '*', order = '', limit = 0 } = {}) {
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.startsWith('PEGAR_')) {
		throw new Error(
			'Supabase no configurado: copia .env.example a .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY y reinicia el dev server'
		);
	}
	const params = new URLSearchParams();
	if (select && select !== '*') params.set('select', select);
	for (const f of filters) params.append(f.split('=')[0], f.split('=').slice(1).join('='));
	if (order) params.set('order', order);
	if (limit > 0) params.set('limit', String(limit));

	const url = `${SUPABASE_URL}/rest/v1/${view}?${params.toString()}`;

	const response = await fetch(url, { headers: HEADERS });
	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`PostgREST ${response.status}: ${body || response.statusText}`);
	}
	return response.json();
}

export function eq(column, value) { return `${column}=eq.${value}`; }
export function inList(column, values) { return `${column}=in.(${values.join(',')})`; }
export function gte(column, value) { return `${column}=gte.${value}`; }
export function lte(column, value) { return `${column}=lte.${value}`; }

