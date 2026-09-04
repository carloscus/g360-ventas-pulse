## Purpose

El vendedor cierra la venta sabiendo que hay producto.

## MODIFIED Requirements

### Requirement: Tabla por SKU de la ficha cliente
El sistema SHALL mostrar en `/ficha/[cliente]` la agregacion por SKU del
historial de ventas del cliente en el periodo seleccionado, con columnas:
cantidad vendida (und y cajas), precio ultimo / anterior / anterior2, NCs por
descuento (monto y conteo), devoluciones, saldo y disponibilidad de stock del
SKU, segun el contrato de `vw_historial_venta_cliente`.

#### Scenario: Stock visible por SKU
- **WHEN** el snapshot de stock esta disponible
- **THEN** cada fila muestra su disponibilidad (o "—" si el SKU no existe en stock)
