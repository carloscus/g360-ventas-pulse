## Purpose

El dashboard agrega el resumen de ventas como seccion plegable.

## MODIFIED Requirements

### Requirement: Clientes prioritarios del dia
El sistema SHALL mostrar en `/dashboard` los clientes prioritarios del
vendedor activo: los de mayor valor estimado segun el radar, con su valor y
numero de productos con recompra vencida; y SHALL ofrecer debajo la seccion
"Como voy" (plegable) con el resumen de ventas del vendedor: comparativo
mensual y tops de clientes y productos del anio.

#### Scenario: Seccion plegable secundaria
- **WHEN** el dashboard carga
- **THEN** prioritarios y alertas aparecen primero; el resumen de ventas esta
  plegado hasta que el usuario lo abre
