## Purpose

El radar debe mostrar oportunidades que el vendedor puede concretar hoy.

## MODIFIED Requirements

### Requirement: Lista de oportunidades de recompra
El sistema SHALL mostrar en `/radar` las oportunidades del vendedor activo:
filas de `vw_radar_recompra` con `estado_oportunidad=VENCIDO`, agrupadas por
cliente, mostrando por SKU: nombre, linea, dias de silencio, cadencia efectiva,
numero de compras, valor estimado de recompra
(precio_promedio x und_por_dia x (silencio - cadencia)) y disponibilidad de
stock del producto (verde: disponible, ambar: bajo, rojo: sin stock), ordenando
por valor estimado descendente y, a igual valor, primero los productos con stock.

#### Scenario: Producto sin stock visible como tal
- **WHEN** un producto del radar no tiene disponibilidad en almacenes de venta
- **THEN** se muestra badge rojo "sin stock" sin ocultar la oportunidad

#### Scenario: Desempate por stock
- **WHEN** dos productos tienen valor estimado similar
- **THEN** el que tiene stock se lista antes que el que no tiene
