## Purpose

Venta cruzada: productos que clientes similares compran y el cliente activo
aun no conoce, como categoria distinta de reposicion.

## ADDED Requirements

### Requirement: Sugerencias de cross-sell por linea
El sistema SHALL sugerir SKUs (categoria OPORTUNIDAD) que otros clientes del
mismo vendedor compran en lineas donde el cliente activo tambien compra, y que
el cliente activo nunca ha comprado. Cada sugerencia muestra producto, linea y
cuantos clientes similares lo compran.

#### Scenario: Sugerencia basada en clientes similares
- **WHEN** el cliente activo compra la linea FORROS y otros clientes del
  vendedor compran en FORROS un SKU que el activo no ha comprado nunca
- **THEN** ese SKU aparece como OPORTUNIDAD con el conteo de clientes similares

#### Scenario: Sin sugerencias
- **WHEN** el cliente activo ya compra todos los SKUs relevantes de sus lineas
- **THEN** la seccion indica que no hay sugerencias de cross-sell

### Requirement: Tope y relevancia de sugerencias
El sistema SHALL limitar las sugerencias a un maximo de 5 por cliente,
priorizando por numero de clientes similares que las compran, y excluir SKUs
sin stock disponible cuando el snapshot de stock esta cargado.

#### Scenario: Priorizacion por popularidad
- **WHEN** hay mas de 5 SKUs candidatos
- **THEN** se muestran los 5 mas comprados por clientes similares
