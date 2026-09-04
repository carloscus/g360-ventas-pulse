## Purpose

Argumentos de negociacion con datos: cuanto, cuando y por que vario el precio.

## ADDED Requirements

### Requirement: Resumen anual de precios por SKU
El sistema SHALL calcular por SKU del cliente y por anio: precio promedio,
minimo y maximo de las ventas (precio_unitario), y la variacion % del ultimo
anio vs el anterior, mostrada como resumen (progressive disclosure: resumen
primero, detalle bajo demanda).

#### Scenario: Tres anios de historial
- **WHEN** un SKU del cliente tiene ventas en 2024, 2025 y 2026
- **THEN** se muestra la fila de resumen con prom/min/max por anio y la
  variacion % 2026 vs 2025

#### Scenario: SKU de un solo anio
- **WHEN** el SKU solo tiene ventas en un anio
- **THEN** se muestra sin variacion (o "-" en la columna)

### Requirement: Historial detallado bajo demanda
El sistema SHALL mostrar el historial de precios de un SKU (fecha, cantidad,
precio) solo cuando el usuario lo solicita ("Ver historial"), con las filas
ordenadas por fecha descendente.

#### Scenario: Ver historial de un SKU
- **WHEN** el usuario toca "Ver historial" en un SKU
- **THEN** se despliega la lista de ventas con fecha, cantidad y precio

### Requirement: Detector de precios anomalos
El sistema SHALL marcar ventas cuyo precio unitario este al menos 15% por
debajo del precio promedio del cliente+SKU, mostrando la cantidad vendida
como contexto (posible precio por volumen) y la fecha, como argumento de
negociacion ("ese precio fue por esta cantidad").

#### Scenario: Precio por volumen detectado
- **WHEN** una venta de 10,000 und se facturo a S/14.00 con promedio S/15.50
  (diferencia >= 15%)
- **THEN** el historial marca esa fila como anomalia con su cantidad y fecha

#### Scenario: Sin anomalias
- **WHEN** todos los precios estan dentro del umbral
- **THEN** no se muestran marcas y el resumen no indica alertas
