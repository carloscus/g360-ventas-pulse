# Proposal: Alinear el spec de export xlsx de la ficha con la implementacion de 5 hojas

## Why

El export de la ficha cliente crecio de 2 hojas (Ficha SKU + Historial) a 5 hojas
con formulas vivas, Pareto de comparativas y limites documentados, pero el
requisito "Export xlsx de la ficha" de `client-ficha` sigue describiendo el
formato de 2 hojas. El spec debe reflejar el comportamiento actual para que las
futuras modificaciones (y nc-sustentor) no se rompan por referencia a un
contrato obsoleto.

## What Changes

- **MODIFIED** `client-ficha` — Requirement "Export xlsx de la ficha":
  - De 2 hojas a 5: Resumen (KPIs y evolucion con formulas vivas), Ficha SKU
    (todos los SKUs con modas anuales xN y fila TOTAL), Negociacion (anomalias
    con Delta % formula + analisis anual completo con Var % formula),
    Comparativa (Pareto ~80% saldo, max 20 SKUs, con ranking por SKU y Pos/Δ
    vs mejor como formulas; fila del cliente resaltada) e Historial (headers
    ERP estandar nc-sustentor, intactos).
  - El export SINCRONIZA con la vista: carga el analisis de precios si no se
    abrio, calcula el Pareto (80% del saldo, tope 20) y pide comparativas por
    SKU en tandas de 5 con progreso visible en el boton.
  - Formato moneda `S/`, porcentajes con signo, panes congelados, autofiltro
    y `fullCalcOnLoad` para recalcular al abrir en Excel/LibreOffice.
  - Limites explicitos: la comparativa del export cubre solo el Pareto; los
    SKUs con <3 ventas salen sin analisis anual; faltas de datos de comparativa
    se marcan como nota, no bloquean.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `client-ficha`: el requisito "Export xlsx de la ficha" pasa de 2 hojas a 5
  con formulas vivas, Pareto y limites; se actualizan sus escenarios.

## Impact

- **Specs**: `openspec/specs/client-ficha/spec.md` (solo el requirement de export).
- **Codigo**: ninguno — el cambio documenta comportamiento ya implementado en
  `src/lib/export/fichaXlsx.js` y `src/routes/ficha/[cliente]/+page.svelte`.
- **Consumidores**: nc-sustentor (hoja Historial sin cambios en headers/values),
  README ya actualizado con los limites conocidos.
