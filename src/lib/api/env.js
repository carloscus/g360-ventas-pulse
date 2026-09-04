export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const STOCK_API_URL = import.meta.env.VITE_STOCK_API_URL || 'https://g360-stock-api.onrender.com/api/v1/stock';
// Clave de lectura publica del equipo (misma exposicion que g360-stock-reporter-lit)
export const STOCK_API_KEY = import.meta.env.VITE_STOCK_API_KEY || 'cipsa2026';

export function isSupabaseConfigured() {
	return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
