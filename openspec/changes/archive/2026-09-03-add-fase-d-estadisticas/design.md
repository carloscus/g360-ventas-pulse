## Context

Fases A-C implementadas. El dashboard ya trae el directorio del anio en curso
(ventana 180d para radar; para tops anuales se necesita el anio completo).
La tabla ventas trae mes_ref, soles, tipo_operacion.

## Goals / Non-Goals

**Goals:**
- ventasResumen.js: agregacion mensual en app (mes actual, anterior, mismo mes
  anio anterior, anio en curso completo) + tops
- Seccion "Como voy" plegable en el dashboard (agenda primero)

**Non-Goals:**
- Graficos por libreria (CSS bars como la ficha)
- Estadisticas por vendedor cruzadas (jefatura: app escritorio futuro)
- Export de reportes (posible fase 5)

## Decisions

1. **2 queries acotadas paginadas**: anio en curso y anio anterior
   (select=mes_ref,soles,id_cliente,id_articulo,nom_articulo,tipo_operacion,
   filtro tipo_operacion=venta). Agregacion mensual y tops en el app con
   cache 4 capas.
2. **Plegable y lazy**: el fetch solo ocurre al abrir la seccion (igual que
   precios en la ficha): el dashboard mantiene su tiempo de apertura.
3. **Variacion informativa**: mes en curso parcial se marca "en curso"; sin
   base de comparacion -> "s/d" (sin division por cero).

## Risks / Trade-offs

- [Anio completo para 01186 puede ser pesado] -> Solo columnas necesarias y
  paginado; cacheado 1 vez por sesion.

## Migration Plan

Deploy estatico; sin DDL.

## Open Questions

(ninguna bloqueante)
