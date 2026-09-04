# Proposal: Fase C — Analisis de precios anual + detector de anomalias

## Why

El vendedor necesita responder "a que precio le hemos vendido?" y sobre todo
"por que ese precio fue diferente?" (sections 12-15 del plan Asistente
Comercial). La ficha muestra 3 niveles de precio por cliente; falta la vista
anual por SKU (prom/min/max por anio + variacion) y el detector de precios
anomalos que da el argumento de negociacion ("la vez pasada fue venta de
10,000 und por volumen").

## What Changes

- Seccion "Precios por anio" en la ficha de cliente: para los SKUs del
  cliente, promedio/minimo/maximo por anio (desde la vista historial,
  agregado en el app) y variacion % del ultimo anio vs anterior.
- Detector de anomalias: precios unitarios por debajo del promedio del
  cliente+SKU (umbral configurable, default -15%) marcados con contexto de
  cantidad (posible precio por volumen) y fecha.
- Progressive disclosure (section 14): resumen de referencias primero,
  historial detallado bajo demanda ("Ver historial").

## Capabilities

### New Capabilities

- `analisis-precios`: analisis anual de precios por SKU del cliente y
  deteccion de precios anomalos con contexto de negociacion.

### Modified Capabilities

- `client-ficha`: nueva seccion de analisis de precios dentro de la ficha
  (accesible por SKU o por los productos principales).

## Impact

- **Codigo**: `src/lib/api/precios.js` (nuevo: agregacion anual + anomalias),
  `src/routes/ficha/[cliente]/+page.svelte` (seccion precios con
  progressive disclosure).
- **Datos**: la vista `vw_historial_venta_cliente` ya trae precio_unitario y
  cantidad por documento (ventana 4 anios). Sin DDL.
- **Dependencias**: ninguna nueva.
