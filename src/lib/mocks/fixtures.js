/**
 * Fixtures de prueba para cada módulo de Ventas Pulse.
 * Formas exactas que devuelven las funciones de src/lib/api/*.
 * Uso: importar en una página reemplazando la llamada real, o con VITE_MOCK=1.
 */

// ---------------------------------------------------------------------------
// Compartidos
// ---------------------------------------------------------------------------

export const MOCK_VENDEDOR = { id: '178', nombre: 'MARIA TORRES' };

export const MOCK_STOCK = new Map([
	['A1001', 120],
	['A1002', 45],
	['B2001', 0],
	['B2002', 300],
	['C3001', 12]
]);

export function mockDisponibleSku(mapa, sku) {
	if (!mapa) return null;
	const v = mapa.get(String(sku));
	return v === undefined ? null : v;
}

// ---------------------------------------------------------------------------
// HOY (dashboard + resumen)
// ---------------------------------------------------------------------------

export const MOCK_DIRECTORIO = {
	data: [
		{ id_cliente: '00056101', nom_cliente: 'BODEGA EL SOL', id_vendedor: '178', nom_vendedor: 'MARIA TORRES', fecha_orig: '2026-08-15', soles: 4500, tipo_operacion: 'venta' },
		{ id_cliente: '00056102', nom_cliente: 'MINIMARKET DON JUAN', id_vendedor: '178', nom_vendedor: 'MARIA TORRES', fecha_orig: '2026-08-20', soles: 3200, tipo_operacion: 'venta' },
		{ id_cliente: '00056103', nom_cliente: 'DISTRIBUIDORA ANDINA', id_vendedor: '178', nom_vendedor: 'MARIA TORRES', fecha_orig: '2026-07-10', soles: 8900, tipo_operacion: 'venta' },
		{ id_cliente: '00056104', nom_cliente: 'KIOSCO LA ESQUINA', id_vendedor: '178', nom_vendedor: 'MARIA TORRES', fecha_orig: '2026-09-01', soles: 1100, tipo_operacion: 'venta' },
		{ id_cliente: '00056105', nom_cliente: 'SUPERMERCADO VALLE', id_vendedor: '178', nom_vendedor: 'MARIA TORRES', fecha_orig: '2026-06-25', soles: 6700, tipo_operacion: 'venta' }
	],
	source: 'network',
	error: null
};

export const MOCK_DASHBOARD = {
	nomVendedor: 'MARIA TORRES',
	source: 'network',
	errores: [],
	prioritarios: [
		{
			id_cliente: '00056103',
			nom_cliente: 'DISTRIBUIDORA ANDINA',
			valorTotal: 15400,
			productos: [
				{ nom: 'ACEITE VEGETAL 1L', linea: '01', variantes: 3, undDia: 4.2, valor: 8200, silencio: 45, cadencia: 30, stock: 120, skuList: ['A1001'] },
				{ nom: 'ARROZ PREMIUM 1KG', linea: '01', variantes: 2, undDia: 3.1, valor: 7200, silencio: 52, cadencia: 35, stock: 45, skuList: ['A1002'] }
			]
		},
		{
			id_cliente: '00056101',
			nom_cliente: 'BODEGA EL SOL',
			valorTotal: 9800,
			productos: [
				{ nom: 'AZUCAR GRANULADA 1KG', linea: '01', variantes: 2, undDia: 5.0, valor: 9800, silencio: 40, cadencia: 30, stock: 300, skuList: ['B2001'] }
			]
		}
	],
	proximos: [
		{
			id_cliente: '00056102',
			nom_cliente: 'MINIMARKET DON JUAN',
			skus: [
				{ nom: 'LECHE ENTERA 1L', linea: '76', silencio: 28, cadencia: 30, faltan: 2 },
				{ nom: 'GALLETA CHOCOLATE', linea: 'CA', silencio: 44, cadencia: 45, faltan: 1 }
			]
		},
		{
			id_cliente: '00056105',
			nom_cliente: 'SUPERMERCADO VALLE',
			skus: [
				{ nom: 'FIDEO SPAGHETTI 500G', linea: '01', silencio: 17, cadencia: 20, faltan: 3 }
			]
		}
	],
	alertasStock: [
		{ cliente: 'DISTRIBUIDORA ANDINA', id_cliente: '00056103', producto: 'ACEITE VEGETAL 1L', disponible: 120, clase: 'ok' },
		{ cliente: 'DISTRIBUIDORA ANDINA', id_cliente: '00056103', producto: 'ARROZ PREMIUM 1KG', disponible: 45, clase: 'bajo' },
		{ cliente: 'BODEGA EL SOL', id_cliente: '00056101', producto: 'AZUCAR GRANULADA 1KG', disponible: 0, clase: 'sin' }
	],
	caidas: [
		{ id_cliente: '00056105', nom_cliente: 'SUPERMERCADO VALLE', soles_actual: 1800, soles_anterior: 5200, caida_pct: 65 },
		{ id_cliente: '00056104', nom_cliente: 'KIOSCO LA ESQUINA', soles_actual: 400, soles_anterior: 900, caida_pct: 56 }
	]
};

export const MOCK_RESUMEN_VENTAS = {
	mesActual: { mes: '2026-09', soles: 18500 },
	mesAnterior: { mes: '2026-08', soles: 22100 },
	mismoMesAnioAnterior: { mes: '2025-09', soles: 16800 },
	varVsAnterior: -0.163,
	varVsAnioAnterior: 0.101,
	evolucion: [
		{ mes: '2026-01', soles: 15200 }, { mes: '2026-02', soles: 14800 },
		{ mes: '2026-03', soles: 17100 }, { mes: '2026-04', soles: 19500 },
		{ mes: '2026-05', soles: 20800 }, { mes: '2026-06', soles: 21200 },
		{ mes: '2026-07', soles: 23400 }, { mes: '2026-08', soles: 22100 },
		{ mes: '2026-09', soles: 18500 },
		{ mes: '2026-10', soles: 0 }, { mes: '2026-11', soles: 0 }, { mes: '2026-12', soles: 0 }
	],
	topClientes: [
		{ id_cliente: '00056103', nom_cliente: 'DISTRIBUIDORA ANDINA', soles: 28500 },
		{ id_cliente: '00056105', nom_cliente: 'SUPERMERCADO VALLE', soles: 19800 },
		{ id_cliente: '00056101', nom_cliente: 'BODEGA EL SOL', soles: 15400 },
		{ id_cliente: '00056102', nom_cliente: 'MINIMARKET DON JUAN', soles: 11200 },
		{ id_cliente: '00056104', nom_cliente: 'KIOSCO LA ESQUINA', soles: 4300 }
	],
	topProductos: [
		{ sku: 'A1001', nom: 'ACEITE VEGETAL 1L', soles: 24500 },
		{ sku: 'B2001', nom: 'AZUCAR GRANULADA 1KG', soles: 18200 },
		{ sku: 'A1002', nom: 'ARROZ PREMIUM 1KG', soles: 15600 },
		{ sku: 'C3001', nom: 'LECHE ENTERA 1L', soles: 9800 },
		{ sku: 'B2002', nom: 'FIDEO SPAGHETTI 500G', soles: 7400 }
	],
	errores: []
};

// ---------------------------------------------------------------------------
// RADAR
// ---------------------------------------------------------------------------

export const MOCK_RADAR_ROWS = [
	{ id_cliente: '00056103', nom_cliente: 'DISTRIBUIDORA ANDINA', id_articulo: 'A1001', nom_articulo: 'ACEITE VEGETAL 1L', nom_linea: '01', n_compras: 8, ultima_compra: '2026-07-15', dias_cadencia: 30, precio_promedio: 12.5, und_por_dia: 4.2, dias_silencio: 68, cadencia_efectiva: 30, estado_oportunidad: 'VENCIDO' },
	{ id_cliente: '00056103', nom_cliente: 'DISTRIBUIDORA ANDINA', id_articulo: 'A1001-2', nom_articulo: 'ACEITE VEGETAL 900ML', nom_linea: '01', n_compras: 5, ultima_compra: '2026-07-15', dias_cadencia: 30, precio_promedio: 8.9, und_por_dia: 2.1, dias_silencio: 68, cadencia_efectiva: 30, estado_oportunidad: 'VENCIDO' },
	{ id_cliente: '00056103', nom_cliente: 'DISTRIBUIDORA ANDINA', id_articulo: 'A1002', nom_articulo: 'ARROZ PREMIUM 1KG', nom_linea: '01', n_compras: 6, ultima_compra: '2026-07-20', dias_cadencia: 35, precio_promedio: 9.8, und_por_dia: 3.1, dias_silencio: 63, cadencia_efectiva: 35, estado_oportunidad: 'VENCIDO' },
	{ id_cliente: '00056101', nom_cliente: 'BODEGA EL SOL', id_articulo: 'B2001', nom_articulo: 'AZUCAR GRANULADA 1KG', nom_linea: '01', n_compras: 10, ultima_compra: '2026-08-10', dias_cadencia: 30, precio_promedio: 4.5, und_por_dia: 5.0, dias_silencio: 42, cadencia_efectiva: 30, estado_oportunidad: 'VENCIDO' },
	{ id_cliente: '00056102', nom_cliente: 'MINIMARKET DON JUAN', id_articulo: 'C3001', nom_articulo: 'LECHE ENTERA 1L', nom_linea: '76', n_compras: 4, ultima_compra: '2026-08-20', dias_cadencia: 30, precio_promedio: 5.2, und_por_dia: 2.8, dias_silencio: 32, cadencia_efectiva: 30, estado_oportunidad: 'VENCIDO' },
	// Fila que debe filtrarse: n_compras < 3
	{ id_cliente: '00056104', nom_cliente: 'KIOSCO LA ESQUINA', id_articulo: 'B2002', nom_articulo: 'FIDEO SPAGHETTI 500G', nom_linea: '01', n_compras: 2, ultima_compra: '2026-05-01', dias_cadencia: 20, precio_promedio: 3.2, und_por_dia: 1.0, dias_silencio: 140, cadencia_efectiva: 20, estado_oportunidad: 'VENCIDO' },
	// Fila que debe filtrarse: silencio > 730
	{ id_cliente: '00056101', nom_cliente: 'BODEGA EL SOL', id_articulo: 'A9999', nom_articulo: 'PRODUCTO VIEJO', nom_linea: 'CA', n_compras: 5, ultima_compra: '2024-06-01', dias_cadencia: 60, precio_promedio: 7.0, und_por_dia: 1.5, dias_silencio: 820, cadencia_efectiva: 60, estado_oportunidad: 'VENCIDO' },
	// Fila OK estado pero que no pasa filtro calidad en app (OK se usa para próximos)
	{ id_cliente: '00056105', nom_cliente: 'SUPERMERCADO VALLE', id_articulo: 'B2002', nom_articulo: 'FIDEO SPAGHETTI 500G', nom_linea: '01', n_compras: 7, ultima_compra: '2026-09-05', dias_cadencia: 20, precio_promedio: 3.2, und_por_dia: 3.5, dias_silencio: 16, cadencia_efectiva: 20, estado_oportunidad: 'OK' }
];

export const MOCK_RADAR = { data: MOCK_RADAR_ROWS, source: 'network', error: null };

// Resultado esperado de priorizarRadar(MOCK_RADAR_ROWS filtrado VENCIDO + calidad)
export const MOCK_RADAR_CLIENTES = [
	{
		id_cliente: '00056103',
		nom_cliente: 'DISTRIBUIDORA ANDINA',
		valorTotal: 15400,
		productos: [
			{ nom: 'ACEITE VEGETAL', linea: '01', variantes: 2, undDia: 6.3, valor: 8200, silencio: 68, cadencia: 30, stock: 120, skuList: ['A1001', 'A1001-2'] },
			{ nom: 'ARROZ PREMIUM', linea: '01', variantes: 1, undDia: 3.1, valor: 7200, silencio: 63, cadencia: 35, stock: 45, skuList: ['A1002'] }
		]
	},
	{
		id_cliente: '00056101',
		nom_cliente: 'BODEGA EL SOL',
		valorTotal: 9800,
		productos: [
			{ nom: 'AZUCAR GRANULADA', linea: '01', variantes: 1, undDia: 5.0, valor: 9800, silencio: 42, cadencia: 30, stock: 0, skuList: ['B2001'] }
		]
	},
	{
		id_cliente: '00056102',
		nom_cliente: 'MINIMARKET DON JUAN',
		valorTotal: 4100,
		productos: [
			{ nom: 'LECHE ENTERA', linea: '76', variantes: 1, undDia: 2.8, valor: 4100, silencio: 32, cadencia: 30, stock: null, skuList: ['C3001'] }
		]
	}
];

// ---------------------------------------------------------------------------
// NETOS
// ---------------------------------------------------------------------------

export const MOCK_NETOS = {
	error: null,
	source: 'network',
	huella: { n: 42, sum: 48500.75, min: '2026-06-01', max: '2026-08-31' },
	incompleto: { a: false, b: false, c: false },
	periodos: {
		a: { desde: '2026-06-01', hasta: '2026-08-31' },
		b: { desde: '2025-06-01', hasta: '2025-08-31' },
		c: { desde: '2024-06-01', hasta: '2024-08-31' }
	},
	clientes: [
		{
			id_cliente: '00056103', nom_cliente: 'DISTRIBUIDORA ANDINA',
			a: 28500, b: 25200, c: 21000, variacion: 0.131,
			lineas: [
				{
					id_linea: '01', nom_linea: 'ALIMENTOS SECOS', a: 18000, b: 16500, c: 14000, variacion: 0.091,
					skus: [
						{ sku: 'A1001', nom: 'ACEITE VEGETAL 1L', a: 9500, b: 8800, c: 7200, variacion: 0.080 },
						{ sku: 'A1002', nom: 'ARROZ PREMIUM 1KG', a: 8500, b: 7700, c: 6800, variacion: 0.104 }
					]
				},
				{
					id_linea: 'CA', nom_linea: 'CARNES', a: 10500, b: 8700, c: 7000, variacion: 0.207,
					skus: [
						{ sku: 'C9001', nom: 'POLLO CONGELADO 1KG', a: 10500, b: 8700, c: 7000, variacion: 0.207 }
					]
				}
			]
		},
		{
			id_cliente: '00056101', nom_cliente: 'BODEGA EL SOL',
			a: 15400, b: 17800, c: 12000, variacion: -0.135,
			lineas: [
				{
					id_linea: '01', nom_linea: 'ALIMENTOS SECOS', a: 15400, b: 17800, c: 12000, variacion: -0.135,
					skus: [
						{ sku: 'B2001', nom: 'AZUCAR GRANULADA 1KG', a: 8900, b: 9500, c: 6500, variacion: -0.063 },
						{ sku: 'B2002', nom: 'FIDEO SPAGHETTI 500G', a: 6500, b: 8300, c: 5500, variacion: -0.217 }
					]
				}
			]
		},
		{
			id_cliente: '00056104', nom_cliente: 'KIOSCO LA ESQUINA',
			a: -460.25, b: 900, c: 0, variacion: -1.511,
			lineas: [
				{
					id_linea: '76', nom_linea: 'LACTEOS', a: -460.25, b: 900, c: 0, variacion: -1.511,
					skus: [
						{ sku: 'C3001', nom: 'LECHE ENTERA 1L', a: -460.25, b: 900, c: 0, variacion: -1.511 }
					]
				}
			]
		}
	]
};

// ---------------------------------------------------------------------------
// PRODUCTOS
// ---------------------------------------------------------------------------

export const MOCK_TOP_SKUS = {
	error: null,
	skus: [
		{ sku: 'A1001', nom: 'ACEITE VEGETAL 1L', linea: '01', nomLinea: 'ALIMENTOS SECOS', qtyA: 2400, qtyB: 2100, qtyC: 1800, solesA: 30000, solesB: 26250, solesC: 22500, varSolesA_B: 0.143, varSolesB_C: 0.167, varQtyA_B: 0.143 },
		{ sku: 'B2001', nom: 'AZUCAR GRANULADA 1KG', linea: '01', nomLinea: 'ALIMENTOS SECOS', qtyA: 4000, qtyB: 4500, qtyC: 3800, solesA: 18000, solesB: 20250, solesC: 17100, varSolesA_B: -0.111, varSolesB_C: 0.184, varQtyA_B: -0.111 },
		{ sku: 'A1002', nom: 'ARROZ PREMIUM 1KG', linea: '01', nomLinea: 'ALIMENTOS SECOS', qtyA: 3100, qtyB: 2800, qtyC: 2500, solesA: 15500, solesB: 14000, solesC: 12500, varSolesA_B: 0.107, varSolesB_C: 0.120, varQtyA_B: 0.107 },
		{ sku: 'C3001', nom: 'LECHE ENTERA 1L', linea: '76', nomLinea: 'LACTEOS', qtyA: 1800, qtyB: 1600, qtyC: 2000, solesA: 9800, solesB: 8700, solesC: 10900, varSolesA_B: 0.126, varSolesB_C: -0.202, varQtyA_B: 0.125 },
		{ sku: 'B2002', nom: 'FIDEO SPAGHETTI 500G', linea: '01', nomLinea: 'ALIMENTOS SECOS', qtyA: 2200, qtyB: 2400, qtyC: 2100, solesA: 7400, solesB: 8100, solesC: 7100, varSolesA_B: -0.086, varSolesB_C: 0.141, varQtyA_B: -0.083 },
		{ sku: 'C9001', nom: 'POLLO CONGELADO 1KG', linea: 'CA', nomLinea: 'CARNES', qtyA: 850, qtyB: 720, qtyC: 600, solesA: 6800, solesB: 5760, solesC: 4800, varSolesA_B: 0.181, varSolesB_C: 0.200, varQtyA_B: 0.181 }
	]
};

export const MOCK_TENDENCIA_LINEAS = {
	error: null,
	lineas: [
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2025-10', cantidad: 8500, soles: 42000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2025-10', cantidad: 3200, soles: 17500 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2025-10', cantidad: 1100, soles: 8800 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2025-11', cantidad: 9200, soles: 46000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2025-11', cantidad: 3500, soles: 19200 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2025-11', cantidad: 1250, soles: 10000 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2025-12', cantidad: 10500, soles: 52000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2025-12', cantidad: 4100, soles: 22500 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2025-12', cantidad: 1400, soles: 11200 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2026-01', cantidad: 7800, soles: 39000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2026-01', cantidad: 2900, soles: 15800 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2026-01', cantidad: 980, soles: 7800 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2026-02', cantidad: 8100, soles: 40500 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2026-02', cantidad: 3100, soles: 16800 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2026-02', cantidad: 1050, soles: 8400 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2026-03', cantidad: 8900, soles: 44500 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2026-03', cantidad: 3400, soles: 18500 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2026-03', cantidad: 1200, soles: 9600 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2026-04', cantidad: 9400, soles: 47000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2026-04', cantidad: 3600, soles: 19600 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2026-04', cantidad: 1300, soles: 10400 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2026-05', cantidad: 9800, soles: 49000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2026-05', cantidad: 3800, soles: 20700 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2026-05', cantidad: 1350, soles: 10800 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2026-06', cantidad: 10200, soles: 51000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2026-06', cantidad: 3900, soles: 21300 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2026-06', cantidad: 1380, soles: 11000 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2026-07', cantidad: 10800, soles: 54000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2026-07', cantidad: 4100, soles: 22400 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2026-07', cantidad: 1450, soles: 11600 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2026-08', cantidad: 11000, soles: 55000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2026-08', cantidad: 4200, soles: 23000 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2026-08', cantidad: 1500, soles: 12000 },
		{ linea: '01', nomLinea: 'ALIMENTOS SECOS', mes: '2026-09', cantidad: 7200, soles: 36000 },
		{ linea: '76', nomLinea: 'LACTEOS', mes: '2026-09', cantidad: 2800, soles: 15200 },
		{ linea: 'CA', nomLinea: 'CARNES', mes: '2026-09', cantidad: 950, soles: 7600 }
	]
};

// ---------------------------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------------------------

export const MOCK_CLIENTES_AGRUPADOS = {
	nomVendedor: 'MARIA TORRES',
	clientes: [
		{ id_cliente: '00056104', nom_cliente: 'KIOSCO LA ESQUINA', ultima: '2026-09-01', monto: 1100 },
		{ id_cliente: '00056102', nom_cliente: 'MINIMARKET DON JUAN', ultima: '2026-08-20', monto: 3200 },
		{ id_cliente: '00056101', nom_cliente: 'BODEGA EL SOL', ultima: '2026-08-15', monto: 4500 },
		{ id_cliente: '00056103', nom_cliente: 'DISTRIBUIDORA ANDINA', ultima: '2026-07-10', monto: 8900 },
		{ id_cliente: '00056105', nom_cliente: 'SUPERMERCADO VALLE', ultima: '2026-06-25', monto: 6700 }
	]
};

// ---------------------------------------------------------------------------
// FICHA (resumen comercial)
// ---------------------------------------------------------------------------

export const MOCK_FICHA_RESUMEN = {
	totalVentas: 8900,
	totalNC: 0,
	totalDevuelto: 12,
	frecuenciaPromedio: 32,
	topProductos: [
		{ sku: 'A1001', nom: 'ACEITE VEGETAL 1L', soles: 4500, und: 360 },
		{ sku: 'A1002', nom: 'ARROZ PREMIUM 1KG', soles: 2800, und: 280 },
		{ sku: 'B2001', nom: 'AZUCAR GRANULADA 1KG', soles: 1600, und: 355 }
	],
	evolucionMensual: [
		{ mes: '2026-03', soles: 1200 }, { mes: '2026-04', soles: 1450 },
		{ mes: '2026-05', soles: 1100 }, { mes: '2026-06', soles: 1680 },
		{ mes: '2026-07', soles: 1550 }, { mes: '2026-08', soles: 1920 },
		{ mes: '2026-09', soles: 0 }
	],
	crossSell: [
		{ sku: 'B2002', nom: 'FIDEO SPAGHETTI 500G', linea: 'ALIMENTOS SECOS', similarCount: 4 },
		{ sku: 'C3001', nom: 'LECHE ENTERA 1L', linea: 'LACTEOS', similarCount: 3 },
		{ sku: 'C9001', nom: 'POLLO CONGELADO 1KG', linea: 'CARNES', similarCount: 2 }
	]
};
