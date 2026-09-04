## Context

La vista historial trae precio_unitario/cantidad/fecha_orig por documento
(venta) en ventana de 4 anios. La ficha ya consulta cliente+periodo; el
analisis anual necesita la MISMA consulta sin filtro de anio (ventana completa)
por SKU. La fase B dejo la infraestructura de secciones y el modal con precios
del cliente en contexto.

## Goals / Non-Goals

**Goals:**
- Agregacion anual en el app (prom/min/max/variacion) por SKU
- Anomalias: precio < promedio - 15% con contexto de cantidad
- Progressive disclosure: resumen -> historial bajo demanda

**Non-Goals:**
- Vista/DDL nueva en BD (agregacion en app suficiente para 1 cliente)
- Comparativa entre clientes (fase D/estadisticas)
- Condiciones de venta formales (campaña/liquidacion no existe en datos;
  usamos cantidad como proxy de volumen)

## Decisions

1. **Re-uso del query de ficha ampliado a 4 anios** cuando se abre la seccion
   de precios: 1 fetch cacheado por cliente (agregado a cache 4 capas), las
   filas crudas ya vienen con precio_unitario y cantidad.
2. **Umbral de anomalia -15%** constante en el modulo (editable); solo
   "venta" con precio > 0 participa; requiere >= 3 ventas del SKU para
   calcular promedio significativo.
3. **Variacion % = (prom_ultimo_anio - prom_anterior) / prom_anterior**;
   un solo anio -> sin variacion.
4. **Top 5 SKUs por ventas en el resumen de precios** (misma seleccion del
   resumen comercial) para no desbordar la pantalla; busqueda implicita via
   modal para el resto.

## Risks / Trade-offs

- [Fetch de 4 anios por cliente mas pesado que 12m] -> 1 vez por sesion
  (cache), paginado, solo al abrir la seccion de precios (lazy).
- [Anomalias falsas positivas (rebajas reales)] -> El app presenta contexto
  (cantidad/fecha), no concluye causa; el vendedor decide.

## Migration Plan

Deploy estatico; sin DDL. Rollback = revert (modulo aislado).

## Open Questions

(ninguna bloqueante)
