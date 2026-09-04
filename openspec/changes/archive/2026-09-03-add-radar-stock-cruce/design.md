## Context

g360-stock-api (Render, FastAPI) sirve `GET /api/v1/stock` (2148 SKUs,
~1.2MB, enriquecido con un_bx/precio) y `GET /stock/{sku}`. Auth por
`X-API-Key` de lectura publica (`cipsa2026`, ya expuesta en
g360-stock-reporter-lit). Cache backend 900s; regenera solo Lun-Sab
07:00-22:59 Lima; cold start 30-60s.

## Goals / Non-Goals

**Goals:**
- Mapa sku->disponible (suma almacenes tipo venta) en cliente
- Cache memoria 15min + sessionStorage + refresh manual
- Badges en radar y columna en ficha

**Non-Goals:**
- Joins en backend / sync entre proyectos (acoplamiento innecesario)
- Query por SKU individual (cold start + N requests)
- Alertas de reposicion o promedios de stock

## Decisions

1. **Snapshot completo, no query por SKU.** 1 request cacheado vs ~300
   requests; patron probado en reporter-lit (probe limit=1 + payload completo).
2. **Disponible = suma de almacenes `tipo=venta`** (VES + depositos); mktd
   (merchandising) no es vendible.
3. **TTL 15 min en sessionStorage** (no localStorage 7 dias: stock vence rapido)
   + boton manual de refresh en el radar.
4. **Clave via env `VITE_STOCK_API_KEY`** con fallback `cipsa2026` (misma
   exposicion que reporter-lit).
5. **Alternativas de linea cuando no hay stock**: diferido (necesita union
   catalogo-radar mas fina); queda como open question.

## Risks / Trade-offs

- [Render dormido: primer fetch 30-60s] → Probe con timeout 60s y mensaje
  "actualizando stock…"; el radar funciona sin stock (badges opcionales).
- [Domingo el stock puede estar viejo] → Se muestra fecha_descarga siempre.
- [1.2MB en movil] → 1 vez por sesion, tras datos prioritarios (radar primero).

## Migration Plan

Deploy estatico; sin DDL. Rollback = revert (modulo aislado).

## Open Questions

- Umbral "bajo" (ambar) fijo en 50 und o relativo a un_bx/und_por_dia.
