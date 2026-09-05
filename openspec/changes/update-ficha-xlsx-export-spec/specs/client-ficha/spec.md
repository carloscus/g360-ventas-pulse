## MODIFIED Requirements

### Requirement: Export xlsx de la ficha
El sistema SHALL exportar la ficha como libro de 5 hojas desde el boton XLSX
del header, bloqueado sin datos: "Resumen" (metadata del cliente/vendedor/
periodo, KPIs del periodo y evolucion mensual), "Ficha SKU" (agregacion por
SKU de todos los SKUs del periodo con precios ultimo, modas anuales con
conteo xN, rango de precios y fila TOTAL), "Negociacion" (anomalias de precio
con Delta % y analisis anual completo por SKU con Var % entre anios),
"Comparativa" (Pareto de SKUs por saldo con acumulado ~80% y tope 20, y
ranking de ultimo precio por SKU del Pareto entre los clientes del vendedor,
ordenado descendente con la fila del cliente resaltada, posicion y delta vs
el mejor precio) e "Historial" (filas crudas con headers ERP estandar para
nc-sustentor). Los KPIs del Resumen, los porcentajes del Pareto, el Delta %
de anomalias y la posicion/delta del ranking SHALL ser formulas vivas de
spreadsheet (recalculables en Excel/LibreOffice via fullCalcOnLoad) con
formato moneda S/, porcentajes con signo, panes congelados y autofiltro. El
export SHALL sincronizarse con la vista: si el analisis de precios no fue
abierto, se carga al exportar; el Pareto define que SKUs se comparan; las
consultas de comparativa se agrupan en tandas de 5 con progreso visible en
el boton. Los limites son explicitos: la comparativa del export cubre solo
el Pareto (no todos los SKUs); los SKUs con menos de 3 ventas no tienen
analisis anual; un SKU del Pareto sin otros clientes compradores se marca
como nota sin bloquear el export.

#### Scenario: Export con encabezados ERP
- **WHEN** se genera el export
- **THEN** la hoja Historial usa ANHO/CODIGO/FECHA/CANTIDAD/SOLES/NUMERO
  reconocibles por nc-sustentor

#### Scenario: Libro de 5 hojas con formulas vivas
- **WHEN** se genera el export y se abre en Excel o LibreOffice
- **THEN** existen las hojas Resumen, Ficha SKU, Negociacion, Comparativa e
  Historial; los KPIs del Resumen suman contra la hoja Ficha SKU, el Delta %
  de anomalias y la Var % anual se recalculan como formulas, y el libro
  solicita recálculo completo al cargar

#### Scenario: Ficha SKU completa con modas
- **WHEN** el cliente compro SKUs que no estaban visibles en la tabla paginada
- **THEN** la hoja Ficha SKU los incluye a todos, con moda del anio actual y
  anterior (precio xN o promedio si no hay moda), rango de precios del periodo
  y una fila TOTAL al final

#### Scenario: Comparativa limitada al Pareto
- **WHEN** el cliente tiene mas SKUs que el tope del Pareto (80% del saldo,
  max 20)
- **THEN** solo los SKUs del Pareto tienen ranking entre clientes, y cada SKU
  sin otros compradores se registra como nota "unico cliente" sin bloquear
  la generacion

#### Scenario: Progreso visible durante el export
- **WHEN** el export requiere cargar analisis de precios y comparativas en
  tandas de 5
- **THEN** el boton XLSX muestra el avance (ej. "Comparando 8/15") y queda
  deshabilitado hasta terminar

#### Scenario: Cliente sin vendedor activo para comparar
- **WHEN** no hay vendedor en sesion al exportar
- **THEN** la hoja Comparativa se genera solo con el Pareto y una nota de
  comparativa no disponible, sin error
