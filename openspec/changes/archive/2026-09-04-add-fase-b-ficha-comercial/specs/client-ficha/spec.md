## Purpose

La ficha concentra el contexto comercial completo para preparar la visita.

## MODIFIED Requirements

### Requirement: Tabla por SKU de la ficha cliente
El sistema SHALL mostrar en `/ficha/[cliente]` la agregacion por SKU del
historial de ventas del cliente en el periodo seleccionado, con columnas:
cantidad vendida (und y cajas), precio ultimo / anterior / anterior2, NCs por
descuento (monto y conteo), devoluciones, saldo y disponibilidad de stock del
SKU; y SHALL encabezar la ficha con un resumen comercial: total del periodo
(ventas, NCs, devoluciones), frecuencia de recompra promedio del cliente
(desde el radar), productos principales del periodo y evolucion mensual de
ventas (barras por mes_ref).

#### Scenario: Resumen comercial visible
- **WHEN** la ficha carga con datos del periodo
- **THEN** se muestran totales (ventas/NC/devoluciones), frecuencia promedio y
  los 5 productos principales antes de la tabla

#### Scenario: Evolucion mensual
- **WHEN** el periodo cubre varios meses
- **THEN** se muestran barras de ventas por mes (mes a mes del periodo)

#### Scenario: Cliente sin frecuencia calculada
- **WHEN** el cliente no tiene filas en la MV del radar (una sola compra)
- **THEN** la frecuencia se muestra como "s/d" sin bloquear la ficha
