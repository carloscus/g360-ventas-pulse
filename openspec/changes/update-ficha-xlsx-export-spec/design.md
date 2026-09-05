## Context

La implementacion de 5 hojas con formulas vivas ya existe en
`src/lib/export/fichaXlsx.js` (generacion) y `src/routes/ficha/[cliente]/+page.svelte`
(orquestacion: precios, Pareto, comparativas en tandas). El spec de
`client-ficha` quedo en la version de 2 hojas (change
`2026-09-03-add-fase1-clientes-ficha` archivado). Este change solo alinea el
spec; ver proposal.md para la motivacion.

## Goals / Non-Goals

**Goals:**

- Reemplazar el requirement "Export xlsx de la ficha" con el contrato de 5
  hojas, formulas vivas y limites explicitos.
- Dejar escenarios verificables para regresion (nc-sustentor, formulas,
  Pareto, progreso).

**Non-Goals:**

- Cero cambios de codigo: la implementacion ya cumple el spec propuesto.
- Documentar `netos` u otras capacidades (fuera de alcance; el README ya las
  cubre).
- Verificacion automatica del contenido del xlsx (no hay suite de tests de
  export en el proyecto; el smoke test de Node fue manual).

## Decisions

- **MODIFIED en vez de ADDED**: el requirement mantiene el mismo nombre
  ("Export xlsx de la ficha") y escenario ERP; solo cambia/crecen su texto y
  escenarios. Usar ADDED duplicaria el requirement y confundiria el archivo.
- **Limites dentro del requirement, no en un requirement nuevo**: el alcance
  del Pareto y la regla de 3 ventas son comportamiento observable del export;
  pertenecen al contrato. Un requirement separado de "limites" fragmentaria
  la verificion.
- **Formulas vivas como requisito normativo (SHALL)**: es la promesa central
  del cambio para el vendedor (puede auditar/editar calculos en Excel); no es
  un detalle de implementacion porque cambia lo observable al abrir el libro.
- **Headers ERP intactos**: se mantiene explicito el escenario nc-sustentor
  para congelar esa compatibilidad como contrato.

## Risks / Trade-offs

- [Spec describe export mas amplio que casos reales (Pareto vacio, sin
  vendedor)] → escenarios negativos incluidos (nota "unico cliente", nota
  sin vendedor) para que esos caminos esten especificados.
- [Deriva futura spec/implementacion] → el README ahora referencia las 5
  hojas y los limites; al archivar este change, spec y README quedan
  sincronizados desde la misma fuente.
- [Visores sin motor de calculo muestran celdas vacias] → el requirement
  exige fullCalcOnLoad y la pagina README ya lo documenta; no se promete
  render en visores no calculantes.

## Migration Plan

1. `openspec sync-specs` o archive del change actualiza
   `openspec/specs/client-ficha/spec.md`.
2. Rollback trivial: es un cambio documental; revertir el commit restaura el
   spec de 2 hojas (el codigo no cambia).
