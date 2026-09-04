## Purpose

Responder "como voy?" sin salir del dashboard: mes actual vs anteriores y tops.

## ADDED Requirements

### Requirement: Comparativo mensual del vendedor
El sistema SHALL mostrar en el dashboard las ventas (soles, tipo venta) del
mes en curso, del mes anterior completo y del mismo mes del anio anterior,
con la variacion % mes en curso vs mes anterior y vs mismo mes del anio
anterior.

#### Scenario: Mes en curso parcial
- **WHEN** el mes en curso no ha terminado
- **THEN** se muestra con nota "en curso" y la comparacion es informativa

#### Scenario: Sin ventas en el mes anterior
- **WHEN** el mes anterior no tiene ventas
- **THEN** la variacion se muestra como "s/d" sin dividir por cero

### Requirement: Top clientes y productos del anio
El sistema SHALL mostrar los 5 clientes y 5 productos con mayores ventas del
anio en curso del vendedor, cada fila navegable a su ficha.

#### Scenario: Navegacion desde tops
- **WHEN** el usuario toca un cliente del top
- **THEN** navega a su ficha

#### Scenario: Anio sin datos suficientes
- **WHEN** el anio no tiene ventas
- **THEN** las secciones muestran estado vacio
