## Context

Fases A-D implementadas. La tabla `ventas` trae soles con signo correcto por
tipo_operacion (verificado 2026-09-04: venta +, ajuste_valor -, devolucion -).
El patron de consulta acotada por vendedor + paginacion con desempate
folio_unico ya esta probado en clientes.js.

## Goals / Non-Goals

**Goals:**
- netos.js: 3 consultas por periodo (A, B=A-1y, C=A-2y) cacheadas, arbol
  cliente->linea->sku con netos y variacion
- /netos: tabla colapsable con preset de rango (mes en curso por defecto)

**Non-Goals:**
- Comparativa entre vendedores (jefatura, app escritorio futura)
- Unidades/margenes (solo soles netos por ahora)
- Guardado de rangos favoritos

## Decisions

1. **Neto = SUM(soles) sin filtrar tipo_operacion.** Los signos del ERP ya
   restan NCs y devoluciones; filtrar por tipo y sumar signos propios duplica
   logica y arriesga errores si el ERP cambia.
2. **Desplazamiento de periodo restando anios a las fechas** (no "mismo dia
   del ano anterior"): 29-feb cae a 28-feb con Date nativo; aceptable y
   documentado.
3. **Un fetch por periodo, cacheado por (vendedor, rango).** El arbol se arma
   en el app: Map cliente -> Map linea -> Map sku -> {a,b,c}.
4. **Orden por neto A desc en cada nivel**; los nodos con A=0 pero B/C>0
   (clientes perdidos) quedan visibles al final con variacion -100% - son
   justamente los que duelen.
5. **Preset por defecto: mes en curso** (dias 1..hoy), no 12 meses: la
   comparativa mensual es el caso de uso declarado.

## Risks / Trade-offs

- [Rango amplio (ano completo) = 3x3375 filas en 01178] -> paginado y
  cacheado; el rango tipico sera mensual.
- [Variacion A vs B con B=0] -> se muestra "-" (sin division por cero).

## Migration Plan

Deploy estatico; sin DDL.

## Open Questions

(ninguna bloqueante)
