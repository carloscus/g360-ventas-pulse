# CONTRATO DE DATOS — g360-ventas-pulse

> Fuente: Supabase `tqdmoytaucnfrpaklprc` (proyecto de g360-ventas-db).
> Acceso: PostgREST + **anon key** (RLS read-only). Sin service role en el navegador.
> Base URL: `https://tqdmoytaucnfrpaklprc.supabase.co/rest/v1`

## Headers obligatorios

```js
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};
```

## 1. `vw_historial_venta_cliente` — Ficha cliente / Comparativo

Una fila por línea de documento (venta, NC descuento, devolución) con cadena
de precios comparados (LAG solo sobre ventas).

### Columnas

| Columna | Tipo | Uso en el app |
|---------|------|---------------|
| `id_cliente` / `nom_cliente` | text | filtro / display |
| `id_vendedor` / `nom_vendedor` | text | filtro "mis clientes" (navegación, NO filtra cálculo) |
| `id_articulo` / `nom_articulo` | text | agrupación por SKU |
| `id_linea` / `nom_linea` | text | fallback del radar / filtro por línea |
| `folio_unico`, `tpo_doc`, `serie_doc`, `nro_doc` | text | trazabilidad al documento |
| `fecha_orig` | date | filtro de período + orden |
| `mes_ref` | text | "2025-03" (agrupación mensual) |
| `tipo_operacion` | text | `venta` \| `ajuste_valor` (NC descuento) \| `devolucion` |
| `cantidad` | numeric | und (negativa en devolución) |
| `soles` | numeric | monto (negativo en NC) |
| `precio_unitario` | numeric | precio atendido (solo en venta; NULL en NC/ND) |
| `precio_anterior` | numeric | precio de la venta previa del mismo cliente+SKU |
| `fecha_anterior` | date | fecha de esa venta previa |
| `precio_anterior2` | numeric | precio de la venta previa a la previa |

### Consultas

```js
// FICHA: un período, agrupar por SKU en el cliente
GET /vw_historial_venta_cliente
  ?id_cliente=eq.00056101
  &id_vendedor=eq.01178            // opcional
  &fecha_orig=gte.2025-01-01
  &fecha_orig=lte.2025-12-31
  &order=id_articulo.asc,fecha_orig.desc
  &select=id_articulo,nom_articulo,cantidad,soles,precio_unitario,precio_anterior,fecha_anterior,tipo_operacion,fecha_orig,folio_unico

// COMPARATIVO A vs B: dos llamadas (una por período), join por SKU en el app
```

### Agregación en el app (por SKU)

```
vendido_und      = SUM(cantidad)           WHERE tipo_operacion='venta'
vendido_soles    = SUM(soles)              WHERE tipo_operacion='venta'
nc_descuento_s   = SUM(ABS(soles))         WHERE tipo_operacion='ajuste_valor'
nc_descuento_n   = COUNT(*)                WHERE tipo_operacion='ajuste_valor'
devuelto_und     = SUM(ABS(cantidad))      WHERE tipo_operacion='devolucion'
precio_ultimo    = precio_unitario de la fila venta más reciente (ya ordenada)
precio_anterior  = precio_anterior de esa misma fila
cajas            = vendido_und / catalogo.un_bx (catalogo_productos.json)
```

## 2. `vw_radar_recompra` — Radar de visita

Una fila por cliente+SKU activo, con cadencia de recompra.

| Columna | Tipo | Uso |
|---------|------|-----|
| `id_cliente` / `nom_cliente` | text | agrupar por cliente para la ruta |
| `id_articulo` / `nom_articulo`, `id_linea`/`nom_linea` | text | qué ofrecer |
| `n_compras` | int | confiabilidad de la cadencia |
| `ultima_compra` | date | frescura |
| `dias_cadencia` | int | promedio de días entre compras del SKU |
| `precio_promedio` | numeric | para estimar valor de la oportunidad |
| `und_por_dia` | numeric | consumo estimado diario |
| `dias_silencio` | int | días desde la última compra |
| `cadencia_efectiva` | int | cadencia SKU o fallback a línea |
| `estado_oportunidad` | text | `VENCIDO` si silencio > cadencia×1.5 |

```js
// RADAR: clientes del vendedor (subquery por jerarquía)
GET /vw_radar_recompra
  ?id_cliente=in.(<ids de mis clientes>)
  &estado_oportunidad=eq.VENCIDO
  &order=dias_silencio.desc
```

> **Refinamientos pendientes (Fase 3)**: filtrar clientes activos
> (última compra < 180 días), agrupar compras del mismo día como una sola,
> ventana máxima de silencio ~730 días. Ver PLAN.md.

## 3. `vw_facturas_disponibles` — Pre-devolución (fase 2+)

Existente en Supabase (migración 20250828000003). Ver
`g360-ventas-db/docs/api-retornos.md` para el contrato completo:
saldo por factura (LIFO), `precio_para_devolucion` (NC total ≥99% aplicada),
`estado_periodo` (DENTRO/FUERA — alerta, no bloqueo).

## 4. `catalogo_productos.json` — Conversión und↔caja

Static file local (`/static/catalogo_productos.json`, heredado de return-form):
`sku`, `nombre`, `ean13`, `precio_lista`, `linea`, `categoria`, `peso_kg`, **`un_bx`** (und por caja), `keywords`.

## Reglas de códigos: canónico vs display

**La BD almacena el código canónico del ERP (padded). El app muestra y acepta la forma corta del negocio.**

| Campo | Canónico (BD/Supabase) | Display (UI) | Regla |
|-------|------------------------|--------------|-------|
| `id_cliente` | `00056101` (8 chars) | `56101` | display: `ltrim(id,'0')` · input: pad a 8 |
| `id_vendedor` | `01177` (5 chars) | `177` | display: quitar prefijo `01` · input: anteponer `01` si 3 chars |
| `doc_cliente` (RUC) | `20600767985` (11) | igual | **NUNCA tocar** — RUC real, prefijo 20/10 legal |
| `anho` / `mes` | INTEGER (2025 / 9) | igual | ya numéricos en ambas BDs — comparativos directos |

Validado con datos reales (2026-09-02): 6,372 clientes todos de 8 chars y 56 vendedores
todos de 5 chars → **cero colisiones** en ambas transformaciones (son reversibles).

### Normalización de entrada (inputs del usuario)

```js
// El vendedor escribe "56101" o "178" — normalizar ANTES de consultar
const normCliente = id => id.replace(/\D/g,'').padStart(8, '0');
const normVendedor = v => /^\d{3}$/.test(v) ? '01'+v : v;  // "177" -> "01177"
// OJO: vendedores alfanuméricos existen (01A02, 01PE1, 01M09) —
// si el input no es 3 digitos, usar busqueda por nom_vendedor (ILIKE)
```

### Display (render)

```js
const showCliente = id => id.replace(/^0+/, '');        // 00056101 -> 56101
const showVendedor = v => v.startsWith('01') ? v.slice(2) : v;  // 01177 -> 177
```

**Nunca** transformar los valores almacenados: el formato padded es la clave
canónica del ERP y la usan nc-sustentor, vistas y filtros guardados.

## Reglas de negocio cerradas

1. Vendedor = jerarquía/navegación; la devolución se calcula contra el cliente
2. Fuera de período (>3 años): alerta + se registra (el ERP decide al emitir NC)
3. Devolución parcial granular por factura (saldo = vendido − devuelto)
4. Sin locks: el ERP revalida (advisory mode)
5. Ventana Supabase = 4 años rodantes; >4 años → flujo admin (SQLite local en g360-ventas-db)

## Cache (patrón reporter-lit, obligatorio para campo)

```
memoria (<1ms) → sessionStorage (<5 min) → localStorage (<7 días) → red
```
