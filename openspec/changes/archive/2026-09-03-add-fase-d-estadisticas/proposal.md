# Proposal: Fase D — Resumen de ventas del vendedor + estadisticas

## Why

Ultima fase del plan Asistente Comercial (section 17): el dashboard responde
"que reviso hoy?" pero no "como voy?". El vendedor necesita su resumen de
ventas (mes en curso vs anterior, top clientes/productos) sin salir de la PWA.

## What Changes

- Resumen de ventas en el dashboard (seccion nueva, compacta): ventas del mes
  en curso vs mes anterior, y vs mismo mes del anio anterior (variacion %).
- Estadisticas en `/dashboard`: top 5 clientes del anio y top 5 productos del
  anio (reutiliza el directorio ya cacheado + ficha comercial).
- Acceso rapido a la ficha desde los tops (navegacion existente).

## Capabilities

### New Capabilities

- `resumen-ventas`: metricas de ventas del vendedor (mes actual vs anterior vs
  mismo mes anio anterior, top clientes y top productos del anio).

### Modified Capabilities

- `dashboard-vendedor`: seccion "Como voy" con el resumen de ventas bajo los
  prioritarios (agenda primero, estadisticas despues).

## Impact

- **Codigo**: `src/lib/api/ventasResumen.js` (nuevo), `dashboard/+page.svelte`
  (seccion plegable), reuso de dashboard.js (directorio cacheado).
- **Datos**: tabla ventas agregada en app por mes_ref (la columna existe);
  queries acotados al anio en curso y anio anterior (2 ventanas paginadas).
- **Dependencias**: ninguna nueva.
