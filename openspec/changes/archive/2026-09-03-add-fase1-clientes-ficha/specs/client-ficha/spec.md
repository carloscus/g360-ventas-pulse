## Purpose

Ficha por cliente: historial por SKU con cadena de precios comparados, NCs por
descuento, devoluciones y saldo, con filtro de periodo. Corazon del cockpit.

## ADDED Requirements

### Requirement: Tabla por SKU de la ficha cliente
El sistema SHALL mostrar en `/ficha/[cliente]` la agregacion por SKU del
historial de ventas del cliente en el periodo seleccionado, con columnas:
cantidad vendida (und y cajas), precio ultimo / anterior / anterior2, NCs por
descuento (monto y conteo), devoluciones y saldo, segun el contrato de
`vw_historial_venta_cliente`.

#### Scenario: Agregacion correcta por SKU
- **WHEN** el historial del cliente+periodo contiene ventas, NCs y devoluciones
- **THEN** la tabla agrupa por SKU sumando cantidades y montos de ventas,
  ABS de NCs (`ajuste_valor`) y devoluciones, con el precio de la venta mas
  reciente y su cadena (precio_anterior, precio_anterior2)

#### Scenario: Conversion und a cajas
- **WHEN** el catalogo estatico define `un_bx` para un SKU
- **THEN** la tabla muestra la equivalencia en cajas (und / un_bx) junto a las unidades

#### Scenario: SKU sin registro de precio previo
- **WHEN** la primera venta del cliente+SKU en la ventana de datos no tiene venta previa
- **THEN** los precios anterior/anterior2 se muestran vacios (no cero ni error)

### Requirement: Filtro de periodo de la ficha
El sistema SHALL permitir filtrar la ficha por periodo (fechas desde/hasta)
re-consultando el historial con el rango `fecha_orig` y recalculando la
agregacion.

#### Scenario: Cambio de periodo
- **WHEN** el usuario cambia el rango de fechas y aplica
- **THEN** la tabla se recalcula con los datos del nuevo periodo

#### Scenario: Periodo sin datos
- **WHEN** el periodo seleccionado no tiene movimientos para el cliente
- **THEN** la app muestra estado vacio para el periodo

### Requirement: Indicador de procedencia de datos
El sistema SHALL indicar cuando la ficha se muestra desde cache local por falta
de conectividad, sin bloquear la consulta al vendedor.

#### Scenario: Ficha desde cache offline
- **WHEN** no hay red y existe cache vigente de la ficha
- **THEN** la app muestra los datos cacheados marcados como "datos offline"
