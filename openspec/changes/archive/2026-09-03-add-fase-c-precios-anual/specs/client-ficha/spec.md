## Purpose

La ficha incluye el analisis de precios como seccion integrada.

## MODIFIED Requirements

### Requirement: Tabla por SKU de la ficha cliente
El sistema SHALL mostrar en `/ficha/[cliente]` la agregacion por SKU del
historial de ventas del cliente en el periodo seleccionado, con columnas:
cantidad vendida (und y cajas), precio ultimo / anterior / anterior2, NCs por
descuento (monto y conteo), devoluciones, saldo y disponibilidad de stock del
SKU; el resumen comercial (totales, frecuencia, productos principales,
evolucion mensual); y SHALL ofrecer la seccion de analisis de precios anual
por SKU con deteccion de anomalias.

#### Scenario: Acceso al analisis de precios
- **WHEN** el usuario abre la seccion de precios en la ficha
- **THEN** ve el resumen anual por SKU (top productos primero) y puede
  desplegar el historial de cada uno
