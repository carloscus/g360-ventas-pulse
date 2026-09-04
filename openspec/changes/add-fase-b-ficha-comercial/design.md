## Context

Fase A archivada: dashboard con prioritarios/proximos/alertas/caidas, login
doble input, stock cacheado en 3 tiers (memoria/local/sesion), modal de
producto. Performance dashboard: 3.1s frio / 1.6s caliente (Promise.allSettled
paralelo). La MV del radar trae cadencia por cliente+SKU y el historial trae
mes_ref; ambas permiten componer el resumen comercial y el cross-sell sin DDL.

## Goals / Non-Goals

**Goals:**
- Ficha comercial completa: resumen (totales, frecuencia, top productos),
  evolucion mensual, tabla por SKU (ya existe)
- Cross-sell: SKUs de la misma linea comprados por otros clientes del
  vendedor y nunca por este cliente

**Non-Goals:**
- Cambios de BD (la MV ya tiene todo el dato de cadencia)
- Frecuencia "justa" por SKU individuo (usamos promedio del cliente: simple y
  suficiente para el vendedor)
- Graficos por libreria (barras CSS flexibles, cero dependencia)

## Decisions

1. **Cross-sell sin segunda fuente**: usa la MISMA MV del radar sin filtro de
   cliente (los chunks ya consultan por cliente del vendedor; para cross-sell
   se consulta por TODOS los clientes del vendedor en las lineas del activo).
   Query: `vw_radar_recompra?id_cliente=in.(directorio)&nom_linea=in.(lineas_del_cliente)`
   -> filtra los que el cliente activo no tiene en su historial -> cuenta
   popularidad. Un solo fetch nuevo cacheado.
2. **Frecuencia = promedio de cadencias del cliente** de las filas del radar
   (n>=3, cad>0). Fallback "s/d" si no hay filas (cliente nuevo o 1 compra).
3. **Evolucion mensual con CSS bars** (div con % de altura/anchura): sin
   libreria de charts; el periodo ya viene del query de la ficha agrupando
   por mes_ref en el app.
4. **Tope de 5 sugerencias** priorizadas por conteo de clientes similares;
   filtro de stock (solo mostrar las que hay) cuando el mapa esta cargado.

## Risks / Trade-offs

- [Query cross-sell amplia (todos los clientes del vendedor)] -> Filtrado por
  linea server-side (nom_linea=in.); chunks de 200 clientes como el radar;
  cacheado con las mismas claves.
- [Meses sin ventas en la evolucion] -> Se muestran como barra 0 (no se omiten)
  para que la serie sea honesta.

## Migration Plan

Deploy estatico; sin DDL ni dependencias nuevas.

## Open Questions

(ninguna bloqueante)
