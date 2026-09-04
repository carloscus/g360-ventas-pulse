## Context

Fase 1 implementada (ficha + directorio con cache 4 capas y paginacion).
`vw_radar_recompra` es MATERIALIZED VIEW (refresh pg_cron 21:00 UTC = 16:00
Peru, post-sync 15:00), grants anon aplicados. Analisis con datos reales
(2026-09-02): sin filtros la MV devuelve 1000+ VENCIDOS con silencio 1458d y
cadencia 0 (compras del mismo dia cuentan como gaps de 0); con filtros de
calidad quedan 469 oportunidades en 53 clientes. La MV expone todas las
columnas necesarias: n_compras, ultima_compra, dias_cadencia, precio_promedio,
und_por_dia, dias_silencio, cadencia_efectiva, estado_oportunidad.

## Goals / Non-Goals

**Goals:**
- Radar priorizado por valor estimado de recompra con filtros de calidad
- Ruta del dia persistida localmente (IndexedDB)
- Navegacion cruzada clientes <-> radar <-> ficha

**Non-Goals:**
- Regenerar/ajustar la MV en BD (los refinamientos de cadencia por dia
  agrupado se aplican en el app; si fueran insuficientes, change aparte de BD)
- Geolocalizacion/orden por distancia (sin datos de coordenadas en la BD)
- Push de notificaciones

## Decisions

1. **Filtros de calidad en el app, no en la MV.** La MV ya materializada no
   cambia sin DDL; los filtros (n_compras>=3, silencio<=730, cliente activo
   <180d) se aplican en cliente. El filtro de cliente activo se calcula con
   max(ultima_compra) por cliente sobre las filas del radar (deriva del
   propio conjunto, sin segunda consulta).
2. **Consulta del radar acotada por `id_cliente=in.(...)`** derivado del
   directorio ya cacheado (mismo patron de cache 4 capas). Evita traer la MV
   completa (60k+ filas) y reutiliza la lista de clientes del vendedor.
3. **Valor estimado = precio_promedio x und_por_dia x max(silencio - cadencia, 0).**
   Deterministico, explicable al vendedor. Alternativas (margen, peso)
   requieren joins con catalogo que la MV no expone.
4. **Ruta del dia en IndexedDB (store `ruta`)**, keyed por vendedor: sobrevive
   recargas sin backend. Patron igual a vendedorActivo en cockpitDB.
5. **Frescura: etiqueta fija "Datos actualizados hasta 16:00 hora Peru".** La
   MV no expone timestamp de refresh; mostrar la hora del cron es honesto y
   suficiente para campo.

## Risks / Trade-offs

- [Clientes del directorio sin filas en la MV (sin recompra)] → Es el caso
  esperado: el radar solo cubre clientes con historial repetido de SKU.
- [in.(...) con cientos de clientes excede limite de URL] → El directorio de
  un vendedor real son ~17-60 clientes activos; si creciera, chunking del
  filtro en grupos de 200.
- [und_por_dia hereda el bug de compras mismo-dia (periodo=0)] → La MV ya usa
  greatest(max-min,1); la cadencia 0 se filtra con n_compras>=3 y el termino
  max(silencio-cadencia,0) acota el valor.

## Migration Plan

Deploy estatico igual a fase 1 (build -> Pages). Sin DDL ni datos nuevos.

## Open Questions

- Orden de ruta por proximidad: pendiente hasta tener coordenadas de clientes
  en la BD (fuera de alcance aqui).
