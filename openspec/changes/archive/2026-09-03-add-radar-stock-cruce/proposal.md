# Proposal: Cruce radar × stock (disponibilidad real)

## Why

El radar dice que recomprar pero no si hay producto para entregar: un
oportunidad sin stock frustra al vendedor en visita. `g360-stock-api` ya
sirve disponibilidad por SKU (verificado: 2148 SKUs, desglose VES/sucursales,
cache 900s) con la read key publica del equipo.

## What Changes

- Nuevo servicio `stock.js`: snapshot completo de stock (1 request ~1.2MB)
  mapeado a `sku -> disponible` (suma de almacenes de venta), con cache en
  memoria+sessionStorage (15 min) y refresh manual; probe ligero (`limit=1`)
  para detectar regeneracion sin bajar el payload.
- Radar: badge de disponibilidad por producto (verde/amber/rojo) y orden
  secundario (a igual valor, primero con stock).
- Ficha cliente: columna "Stock" por SKU.
- Indicador de frescura: "stock al {fecha_descarga}" del backend.

## Capabilities

### New Capabilities

- `stock-disponibilidad`: consulta y cache del snapshot de stock de
  g360-stock-api para cruce con radar y ficha.

### Modified Capabilities

- `radar-oportunidades`: badge de stock por producto y orden secundario.
- `client-ficha`: columna de stock por SKU.

## Impact

- **Codigo**: `src/lib/api/stock.js` (nuevo), `radar/+page.svelte`,
  `ficha/[cliente]/+page.svelte`, `env.js`, `.env.example`.
- **Datos**: GET https://g360-stock-api.onrender.com/api/v1/stock con
  X-API-Key de lectura (publica, ya usada por g360-stock-reporter-lit).
  Ventana operativa del backend: Lun-Sab 07:00-22:59 Lima.
- **Dependencias**: ninguna nueva.
