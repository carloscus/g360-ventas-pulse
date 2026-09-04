# Proposal: Fase 3 — Radar de recompra + ruta del día

## Why

El vendedor no tiene forma de saber a qué cliente visitar mañana ni qué
ofrecerle. Los datos ya lo permiten: `vw_radar_recompra` (MATERIALIZED VIEW,
refresh nocturno 21:00 UTC) detecta SKUs con recompra vencida. El análisis con
datos reales (618k filas) muestra 469 oportunidades sensatas en 53 clientes
con los filtros correctos; sin filtrar la MV es ruido (1000+ "VENCIDOS" con
silencio de 1458 días y cadencia 0 por compras del mismo día).

## What Changes

- Nueva ruta `/radar`: oportunidades de recompra VENCIDAS del vendedor,
  priorizadas por valor estimado de recompra.
- Filtros de calidad en el app (refinamientos ya previstos en PLAN.md):
  clientes activos (ultima compra de cualquier SKU < 180 dias),
  n_compras >= 3, silencio <= 730 dias.
- Ruta del dia: el vendedor marca clientes a visitar y obtiene la lista
  ordenada con los SKUs a ofrecer por cliente.
- Indicador de frescura de datos (la MV se actualiza a las 16:00 hora Peru).
- Acceso desde `/clientes` y la ficha (navegacion cruzada).

## Capabilities

### New Capabilities

- `radar-oportunidades`: lista priorizada de oportunidades de recompra por
  cliente+SKU (silencio vs cadencia, valor estimado, SKUs a ofrecer).
- `ruta-del-dia`: seleccion de clientes para la visita del dia y lista
  ordenada de visitas con su detalle de oportunidades.

### Modified Capabilities

- `client-directory`: navegacion cruzada hacia el radar (acceso desde Mis
  Clientes). Delta pequeno: un punto de entrada, sin cambio de comportamiento
  del listado.

## Impact

- **Codigo**: `src/routes/radar/` (nueva ruta), `src/lib/api/radar.js` (consulta
  MV + filtros + valor estimado). Reutiliza cache 4 capas, display.js,
  componentes G360.
- **Datos**: lectura PostgREST anon de `vw_radar_recompra` (MV) con
  `id_cliente=in.(...)` derivado del directorio ya cacheado. Solo lectura,
  sin DDL nuevo.
- **Dependencias**: ninguna nueva.
- **Riesgo conocido**: staleness de hasta ~24h por ser MV (mitigado con
  indicador de frescura).
