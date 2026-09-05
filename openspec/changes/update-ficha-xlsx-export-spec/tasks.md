## 1. Sincronizar spec principal

- [ ] 1.1 Sincronizar el delta `specs/client-ficha/spec.md` sobre `openspec/specs/client-ficha/spec.md` (reemplazar el requirement "Export xlsx de la ficha" de 2 hojas por la version de 5 hojas con sus 6 escenarios) y verificar con `openspec validate --strict`

## 2. Verificacion cruzada

- [ ] 2.1 Comparar el spec actualizado contra `src/lib/export/fichaXlsx.js` y `src/routes/ficha/[cliente]/+page.svelte`: 5 hojas, formulas vivas (KPIs, Delta %, Var %, Pareto, RANK), Pareto 80%/tope 20, tandas de 5, nota sin vendedor; confirmar que no hay drift (sin cambio de codigo)
- [ ] 2.2 Confirmar que el README (seccion Estructura y Limites conocidos) queda consistente con el spec sincronizado; corregir desviaciones de redaccion si las hay
