# Consultas y escenarios de prueba — Ventas Pulse

Combinación de: **(1)** queries PostgREST reales por módulo, **(2)** fixtures mock en `src/lib/mocks/fixtures.js`, **(3)** escenarios UI de 2-3 pasos.

---

## 1. HOY (Dashboard)

### Queries (PostgREST)

| # | Vista/Tabla | Filtros | Select clave | Fuente |
|---|-------------|---------|--------------|--------|
| Q1 | `ventas` | `id_vendedor=eq.{id}`, `fecha_orig=gte.{hoy-180d}`, `fecha_orig=lte.{hoy}` | `id_cliente,nom_cliente,id_vendedor,nom_vendedor,fecha_orig,soles,tipo_operacion` | `dashboard.js:25` → `clientes.js` |
| Q2 | `vw_radar_recompra` | `id_cliente=in.({ids chunks 200})`, `estado_oportunidad=eq.VENCIDO` | `id_cliente,nom_cliente,id_articulo,nom_articulo,...,estado_oportunidad` | `dashboard.js:36` → `radar.js` |
| Q3 | `ventas` (paralelo A/B) | `id_vendedor`, `fecha_orig` ±90d, `tipo_operacion=eq.venta` | `id_cliente,nom_cliente,soles` | `dashboard.js:140-186` (caídas) |
| Q4 | Stock API externa | — | `Map<sku, disponible>` | `stock.js` (`g360-stock-api.onrender.com`) |

**Query SQL equivalente (Q1):**
```sql
SELECT id_cliente, nom_cliente, id_vendedor, nom_vendedor, fecha_orig, soles, tipo_operacion
FROM ventas
WHERE id_vendedor = '178'
  AND fecha_orig BETWEEN '2026-03-24' AND '2026-09-21'
ORDER BY folio_unico ASC, id ASC
LIMIT 1000;
```

**Q3 — caídas (períodos 90d):**
```sql
-- Periodo A: últimos 90 días; Periodo B: 90 días previos
SELECT id_cliente, nom_cliente, SUM(soles) as soles
FROM ventas
WHERE id_vendedor = '178'
  AND fecha_orig BETWEEN :inicioA AND :finA
  AND tipo_operacion = 'venta'
GROUP BY id_cliente, nom_cliente;
-- App filtra ratio(A/B) < 0.5 → caída
```

### Fixtures
```js
import { MOCK_DASHBOARD, MOCK_RESUMEN_VENTAS, MOCK_STOCK } from '$lib/mocks/fixtures.js';
// Reemplazar en dashboard/+page.svelte:
// datos = MOCK_DASHBOARD; resumenVentas = MOCK_RESUMEN_VENTAS;
```

### Escenarios UI

| # | Paso 1 | Paso 2 | Paso 3 | Esperado |
|---|--------|--------|--------|----------|
| E1 | Login `178` → Hoy | Esperar carga | — | 5 secciones: Prioritarios, Próximos, Alertas stock, Caídas, "Cómo voy" |
| E2 | Cargar Hoy | Tocar "Cómo voy" | — | Gráfico 12 meses + top 5 clientes/productos aparece sin refetch |
| E3 | Cargar Hoy | Pull-to-refresh | — | Badge offline desaparece si hay red; datos frescos |

---

## 2. RADAR

### Queries

| # | Vista | Filtros | Select | Fuente |
|---|-------|---------|--------|--------|
| Q1 | `ventas` 180d | `id_vendedor`, `fecha_orig` | `id_cliente,...` (directorio) | `radar.js:39` |
| Q2 | `vw_radar_recompra` | `id_cliente=in.({chunks})`, `estado_oportunidad=eq.VENCIDO` | 13 campos (SELECT const) | `radar.js:27` |
| Q3 | Stock API | — | `Map<sku,disp>` | `stock.js` |

**Q2 SQL:**
```sql
SELECT id_cliente, nom_cliente, id_articulo, nom_articulo, nom_linea,
       n_compras, ultima_compra, dias_cadencia, precio_promedio,
       und_por_dia, dias_silencio, cadencia_efectiva, estado_oportunidad
FROM vw_radar_recompra
WHERE id_cliente IN ('00056101','00056102',...)  -- chunks de 200
  AND estado_oportunidad = 'VENCIDO'
ORDER BY dias_silencio DESC, id_cliente ASC, id_articulo ASC;
```

**Filtros de calidad (app, no SQL):**
- `n_compras >= 3`
- `cadencia_efectiva > 0`
- `dias_silencio <= 730`
- cliente en directorio 180d (activos)

### Fixtures
```js
import { MOCK_RADAR_ROWS, MOCK_RADAR_CLIENTES } from '$lib/mocks/fixtures.js';
// MOCK_RADAR_ROWS incluye filas que deben filtrarse (n_compras<3, silencio>730, estado=OK)
// MOCK_RADAR_CLIENTES = priorizarRadar(filas filtradas) → 3 clientes priorizados
```

### Escenarios UI

| # | Paso 1 | Paso 2 | Paso 3 | Esperado |
|---|--------|--------|--------|----------|
| E1 | Login → Radar | Esperar | — | Lista priorizada por valorTotal; badge stock (ok/bajo/sin) |
| E2 | Radar | Toggle "Solo ruta" | — | Filtra a IDs en `$rutaDia`; total ruta recalculado |
| E3 | Radar | Tocar estrella (marcar) | — | Persiste en `rutaDia` store; badge "en ruta" |

---

## 3. NETOS

### Queries

| # | Vista | Filtros | Select | Fuente |
|---|-------|---------|--------|--------|
| Q1-A | `ventas` | `id_vendedor`, `fecha_orig` ∈ período A | `id_cliente,...,soles,fecha_orig` | `netos.js:15-41` |
| Q1-B | `ventas` | período B = A−1 año | idem | paralelo |
| Q1-C | `ventas` | período C = A−2 años | idem | paralelo |

Cada período se divide en **rebanadas mensuales** (`rebanadasMes`) y paginación 1000 filas.

**Q1 SQL (período A, ejemplo preset 3m):**
```sql
SELECT id_cliente, nom_cliente, id_linea, nom_linea, id_articulo, nom_articulo, soles, fecha_orig
FROM ventas
WHERE id_vendedor = '178'
  AND fecha_orig BETWEEN '2026-06-01' AND '2026-08-31'
ORDER BY fecha_orig ASC, folio_unico ASC, id ASC
LIMIT 1000 OFFSET 0;
-- Se repite para B (2025-06-01..2025-08-31) y C (2024-06-01..2024-08-31)
```

### Fixtures
```js
import { MOCK_NETOS } from '$lib/mocks/fixtures.js';
// MOCK_NETOS.clientes: 3 clientes × líneas × SKUs con a/b/c y variación
// Incluye neto negativo (NC) en KIOSCO: a=-460.25
```

### Escenarios UI

| # | Paso 1 | Paso 2 | Paso 3 | Esperado |
|---|--------|--------|--------|----------|
| E1 | Login → Netos | Esperar (preset "Este mes") | — | Árbol cliente→línea→SKU; 3 columnas A/B/C; variación % |
| E2 | Netos | Botón "3 meses" | — | Rango jun-ago 2026; huella "Datos al…"; skeleton durante fetch |
| E3 | Netos | Expandir cliente | Luego expandir línea | Accordeón anidado; badge de línea colorea fila |

---

## 4. PRODUCTOS

### Queries

| # | Vista | Filtros | Select | Fuente |
|---|-------|---------|--------|--------|
| Q1 | `ventas` (A) | `id_vendedor`, mes en curso | 11 campos incl. `cantidad,soles,mes_ref` | `productos.js:26` |
| Q2 | `ventas` (B) | mes año anterior | idem | paralelo |
| Q3 | `ventas` (C) | mes hace 2 años | idem | paralelo |
| Q4 | `ventas` (tendencia) | últimos 12 meses | idem | `productos.js:120` |

**Q1 SQL (top SKUs mes en curso):**
```sql
SELECT id_vendedor, id_cliente, id_linea, nom_linea, id_articulo, nom_articulo,
       cantidad, soles, fecha_orig, mes_ref, tipo_operacion
FROM ventas
WHERE id_vendedor = '178'
  AND fecha_orig BETWEEN '2026-09-01' AND '2026-09-21'
ORDER BY fecha_orig ASC, folio_unico ASC, id ASC
LIMIT 1000;
-- Agrupación en app: SUM por id_articulo, filtra tipo_operacion='venta', top 20 por solesA
```

**Q4 SQL (tendencia 12m):**
```sql
SELECT id_linea, nom_linea, mes_ref, SUM(cantidad) as cantidad, SUM(soles) as soles
FROM ventas
WHERE id_vendedor = '178'
  AND fecha_orig BETWEEN '2025-09-01' AND '2026-09-21'
  AND tipo_operacion = 'venta'
GROUP BY id_linea, nom_linea, mes_ref
ORDER BY mes_ref ASC;
```

### Fixtures
```js
import { MOCK_TOP_SKUS, MOCK_TENDENCIA_LINEAS } from '$lib/mocks/fixtures.js';
// MOCK_TOP_SKUS.skus: 6 SKUs con qtyA/B/C, solesA/B/C, 3 variaciones
// MOCK_TENDENCIA_LINEAS.lineas: 12 meses × 3 líneas (01, 76, CA)
```

### Escenarios UI

| # | Paso 1 | Paso 2 | Paso 3 | Esperado |
|---|--------|--------|--------|----------|
| E1 | Login → Productos | Esperar | — | Pestaña "Líneas" (default): gráfico SVG 12 meses + leyenda |
| E2 | Productos | Tocar leyenda de línea | — | Filtra tabla SKUs a esa línea; badge activo |
| E3 | Productos | Ordenar columna "Soles A" | Tocar de nuevo | Alterna ↓/↑; indicador en header; empty state si filtro sin datos |

---

## 5. CLIENTES

### Queries

| # | Vista | Filtros | Select | Fuente |
|---|-------|---------|--------|--------|
| Q1 | `ventas` | `id_vendedor`, `fecha_orig` ∈ 180d | `id_cliente,nom_cliente,id_vendedor,nom_vendedor,fecha_orig,soles,tipo_operacion` | `clientes.js:25-47` |

**Q1 SQL:**
```sql
SELECT id_cliente, nom_cliente, id_vendedor, nom_vendedor, fecha_orig, soles, tipo_operacion
FROM ventas
WHERE id_vendedor = '178'
  AND fecha_orig BETWEEN '2026-03-24' AND '2026-09-21'
ORDER BY folio_unico ASC, id ASC
LIMIT 1000 OFFSET 0;
-- Fallback anti-timeout: reintenta con ventana 180d si 57014
```

**Agregación (`agruparClientes`):** `SUM(soles)` por `id_cliente` filtrando `tipo_operacion='venta'`; `MAX(fecha_orig)` como última.

### Fixtures
```js
import { MOCK_CLIENTES_AGRUPADOS } from '$lib/mocks/fixtures.js';
// 5 clientes ordenados por última compra desc
```

### Escenarios UI

| # | Paso 1 | Paso 2 | Paso 3 | Esperado |
|---|--------|--------|--------|----------|
| E1 | Login → Clientes | Esperar | — | Lista 5 clientes; período 180d visible; orden por "última" ↓ |
| E2 | Clientes | Tocar header "Monto" | — | Reordena por monto; indicador ↑/↓ |
| E3 | Clientes | Tocar fila cliente | — | Navega a `/ficha/{id}`; contexto cliente seteado |

---

## 6. FICHA (detalle cliente)

### Queries

| # | Vista | Filtros | Select | Fuente |
|---|-------|---------|--------|--------|
| Q1 | `vw_historial_venta_cliente` | `id_cliente=eq.{id}` | agregado por SKU | `ficha/[cliente]/+page.svelte` |
| Q2 | `vw_radar_recompra` | `id_cliente=eq.{id}` | `dias_cadencia,cadencia_efectiva,n_compras` | `fichaComercial.js:43` |
| Q3 | `vw_radar_recompra` cross-sell | `id_cliente=in.({vendedor ids})`, `nom_linea in.({líneas cliente})` | 5 campos | `fichaComercial.js:100` → `radar.js:214` |

**Q1 SQL:**
```sql
SELECT * FROM vw_historial_venta_cliente
WHERE id_cliente = '00056103';
```

**Q2 SQL (frecuencia):**
```sql
SELECT id_cliente, dias_cadencia, cadencia_efectiva, n_compras
FROM vw_radar_recompra
WHERE id_cliente = '00056103'
  AND n_compras >= 3
  AND cadencia_efectiva > 0;
-- Promedio de cadencia_efectiva → frecuenciaPromedio
```

### Fixtures
```js
import { MOCK_FICHA_RESUMEN } from '$lib/mocks/fixtures.js';
// totalVentas, topProductos, evolucionMensual, crossSell, frecuenciaPromedio
```

### Escenarios UI

| # | Paso 1 | Paso 2 | Paso 3 | Esperado |
|---|--------|--------|--------|----------|
| E1 | Clientes → tocar fila | Ficha carga | — | Totales, top productos, gráfico evolución, cross-sell |
| E2 | Ficha cliente fuera de cartera 365d | — | — | Guard muestra "cliente fuera de cartera" |
| E3 | Ficha | Pull-to-refresh | — | Datos recargados; badge offline actualiza |

---

## Modo mock

Para probar sin Supabase:

```js
// En la página, temporalmente:
import { MOCK_DASHBOARD } from '$lib/mocks/fixtures.js';
// datos = MOCK_DASHBOARD;  // en cargar()
```

O por env var (futuro): `VITE_MOCK=1 npm run dev` → interceptaría en `postgrestGet`.

Los fixtures replican **exactamente** las formas de retorno de cada `cargar*` de `src/lib/api/`:
- `cargarDashboard` → `MOCK_DASHBOARD`
- `cargarResumenVentas` → `MOCK_RESUMEN_VENTAS`
- `cargarRadar` + `priorizarRadar` → `MOCK_RADAR_ROWS` / `MOCK_RADAR_CLIENTES`
- `cargarNetos` → `MOCK_NETOS`
- `cargarTopSkus` → `MOCK_TOP_SKUS`
- `cargarTendenciaLineas` → `MOCK_TENDENCIA_LINEAS`
- `agruparClientes` → `MOCK_CLIENTES_AGRUPADOS`
- `cargarResumenComercial` → `MOCK_FICHA_RESUMEN`
