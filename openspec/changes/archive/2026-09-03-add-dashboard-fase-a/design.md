## Context

Fase 1 + 3 + stock implementados y archivados: directorio (tabla ventas,
paginado, fallback 180d), radar (MV + filtros calidad + valor por producto),
stock (snapshot cacheado, clasificacion ok/bajo/sin), sesion persistente
(IndexedDB v2). El plan Asistente Comercial define el Dashboard como agenda
comercial (§5): prioritarios, proximos a recompra, alertas, accesos rapidos.

## Goals / Non-Goals

**Goals:**
- Login de doble input con validacion del par contra la BD (barrera casual)
- `/dashboard` como home: prioritarios + proximos a recompra + alertas
- Composicion pura de datos ya calculados (radar.js, clientes.js, stock.js)

**Non-Goals:**
- Auth real + RLS (fase 4; el par es secreto compartido debil, no identidad)
- Resumen de ventas del vendedor (fase D del plan amplio)
- Cross-sell / productos nuevos (fase B)
- Jefatura (app de escritorio aparte, futuro)

## Decisions

1. **Validacion del par con 1 query acotada**: `ventas?id_vendedor=eq.X&id_cliente=eq.Y&limit=1`
   usa el indice (id_vendedor, id_cliente) (~300-900ms verificado). Ventana:
   cualquier venta en los 4 anios (tolerante a clientes estacionales o
   transferidos). Error generico: no revela cual input fallo.
2. **Normalizacion de cliente en el selector**: numerico -> padStart(8,'0')
   (57796 -> 00057796); alfanumerico tal cual (verificado: hoy todos son
   numericos, la rama es prevenir el futuro).
3. **Proximos a recompra desde la MV sin filtro de estado**: la MV expone
   dias_silencio y cadencia_efectiva para todos los estados; el estado 0.8-1.0x
   se calcula en el app. Query: mismos clientes (in.) sin estado_oportunidad=VENCIDO,
   filtros n_compras>=3 y cadencia>0 (los mismos de calidad) + silencio entre
   0.8x y 1.0x cadencia.
4. **Alertas de stock desde el top del radar**: max 5 productos prioritarios ×
   clasificarStock; alerta positiva ("disponible: argumento") o advertencia
   ("sin stock: no prometer"). Sin queries extra: reusa el mapa ya cacheado.
5. **Caida de compras**: comparacion de ventas del directorio actual (ventana A
   = ultimos 90 dias) vs ventana anterior equivalente (90 dias previos) por
   cliente, con 2 consultas acotadas ya paginadas. Umbral: < 50% del anterior.
   Solo para clientes activos (evita ruido de morosos).
6. **`/dashboard` como home post-login**: `/` queda como selector (con acceso
   rapido al dashboard si hay sesion). Los accesos rapidos son links existentes.

## Risks / Trade-offs

- [Doble input = friccion 1 vez por dispositivo] → La sesion persiste en
  IndexedDB; reingreso diario directo al dashboard.
- [Proximos a recompra amplía el query de la MV] → Mismos chunks de clientes
  ya cacheados; el filtro 0.8-1.0x reduce el resultado (no lo agranda).
- [Caida de compras duplica el query del directorio] → Solo 90d+90d acotados;
  tolerable. Si pesa, se mueve a la MV en una futura fase de BD.

## Migration Plan

Deploy estatico; sin DDL ni dependencias. Rollback = revert (modulos aislados).

## Open Questions

(ninguna bloqueante: la redaccion exacta de alertas se ajusta en campo)

## Optimizaciones de flujos (revision post-implementacion)

7. **Ventana de directorio unificada a 180 dias** en /clientes (antes 365d):
   misma cache key que radar y dashboard -> 1 fetch compartido (822 vs 3375
   filas en 01177, -75%). El periodo completo sigue disponible en la ficha.
8. **adjuntarStock() en radar.js**: el snapshot de stock solo adjunta stock y
   reordena productos; antes re-priorizaba todo el radar (re-agrupacion
   redundante por cada llegada de stock).
9. **Prefetch de stock en el login**: getStockMapa() en background tras validar
   el par -> el dashboard/radar abren con cache caliente (el fetch de 1.2MB no
   bloquea la navegacion).
10. **Modal global de producto (ProductSearchModal)**: busqueda SKU/nombre/linea
    sobre el catalogo local (cero red) + stock cacheado + precio lista. Boton
    "Buscar" en el header del dashboard (plan amplio section 16, fase B adelantada).
