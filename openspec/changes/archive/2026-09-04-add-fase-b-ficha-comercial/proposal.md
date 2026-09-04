# Proposal: Fase B — Ficha comercial completa + cross-sell

## Why

La ficha actual es transaccional (tabla por SKU del periodo). El plan Asistente
Comercial (section 10) pide el contexto comercial completo para preparar la
visita: frecuencia del cliente, productos principales, evolucion mensual y
oportunidades de cross-sell. Todo el dato base ya existe (MV radar con
cadencia, historial con mes_ref, catalogo); falta componerlo en la ficha.

## What Changes

- Ficha nueva seccion "Resumen comercial": frecuencia de recompra del cliente
  (promedio de cadencias de sus SKUs del radar), productos principales (top 5
  por ventas del periodo) y total del periodo (soles, NCs, devoluciones).
- Ficha nueva seccion "Evolucion mensual": barras por mes (mes_ref ya viene en
  la vista) con ventas del periodo.
- Cross-sell en el radar y la ficha: SKUs que clientes del mismo vendedor
  compran en la misma linea que este cliente NO ha comprado nunca
  ("clientes similares compran..."). Categoria OPORTUNIDAD distinta de
  REPONER (section 8 del plan amplio).

## Capabilities

### New Capabilities

- `cross-sell`: sugerencias de venta cruzada por linea (compras de clientes
  similares que el cliente activo no tiene).

### Modified Capabilities

- `client-ficha`: secciones resumen comercial, productos principales y
  evolucion mensual ademas de la tabla por SKU.

## Impact

- **Codigo**: `src/lib/api/fichaComercial.js` (nuevo: resumen + evolucion +
  cross-sell), `src/routes/ficha/[cliente]/+page.svelte` (nuevas secciones),
  `src/routes/radar/+page.svelte` (seccion OPORTUNIDAD opcional).
- **Datos**: queries existentes (MV radar sin filtro cliente para comparar
  entre clientes del mismo vendedor, historial del cliente con mes_ref).
- **Dependencias**: ninguna nueva.
