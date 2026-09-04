## Purpose

Argumentos de negociacion con datos: cuanto, cuando, en que documento y por
que vario el precio.

## Requirements

### Requirement: Resumen anual de precios por SKU
El sistema SHALL calcular por SKU del cliente y por anio: precio promedio,
minimo y maximo de las ventas (precio_unitario), limitado a los ultimos 3
anios con datos (actual vs anterior vs antepenultimo), con variacion % entre
cada par consecutivo de anios, mostrada como resumen (progressive
disclosure: resumen primero, detalle bajo demanda).

#### Scenario: Tres anios de historial
- **WHEN** un SKU del cliente tiene ventas en 2024, 2025 y 2026
- **THEN** se muestra la fila de resumen con prom/min/max por anio y la
  variacion % 2025->2026 (y 2024->2025 si existe)

#### Scenario: Anios con huecos
- **WHEN** el SKU tiene ventas solo en 2022, 2024 y 2025
- **THEN** se muestran esos 3 anios con su variacion entre pares consecutivos
  presentes, sin inventar el anio faltante

### Requirement: Historial detallado bajo demanda
El sistema SHALL mostrar el historial de precios de un SKU agrupado por dia
(fecha, cantidad total, precio promedio, numero de facturas con documento,
NCs del dia) solo cuando el usuario lo solicita, con las filas ordenadas por
fecha descendente.

#### Scenario: Ver historial de un SKU
- **WHEN** el usuario toca el historial de un SKU
- **THEN** se despliega una linea por dia con cantidad, precio (o rango si
  vario dentro del dia), facturas y NCs asociadas

### Requirement: Comparativa de precios entre clientes
El sistema SHALL permitir, para un SKU, comparar el precio unitario cobrado a
cada cliente del vendedor: ultimo precio con cantidad y numero de documento,
rango min-max con cantidades, y NCs por cliente, ordenado por ultimo precio
descendente y resaltando al cliente en contexto.

#### Scenario: Volumen y precio visibles juntos
- **WHEN** el vendedor abre la comparativa de un SKU
- **THEN** ve por cliente su ultimo precio x cantidad con factura, rango y
  conteo de NCs, permitiendo identificar descuentos por volumen

### Requirement: Detector de precios anomalos
El sistema SHALL marcar ventas cuyo precio unitario este al menos 15% por
debajo del precio promedio del cliente+SKU, mostrando la cantidad vendida
como contexto (posible precio por volumen) y la fecha, como argumento de
negociacion.

#### Scenario: Precio por volumen detectado
- **WHEN** una venta de 10,000 und se facturo a S/14.00 con promedio S/15.50
  (diferencia >= 15%)
- **THEN** el historial marca esa fila como anomalia con su cantidad y fecha

#### Scenario: Sin anomalias
- **WHEN** todos los precios estan dentro del umbral
- **THEN** no se muestran marcas y el resumen no indica alertas
