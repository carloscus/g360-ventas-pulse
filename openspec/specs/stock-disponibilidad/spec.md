## Purpose

Disponibilidad real de producto (g360-stock-api) cacheada localmente para el
cruce con radar y ficha.

## ADDED Requirements

### Requirement: Snapshot de stock con cache
El sistema SHALL obtener el snapshot completo de stock (sku -> disponible en
almacenes de venta) en un solo request, cacheandolo en memoria (15 minutos)
y sessionStorage, con refetch manual explicito del usuario.

#### Scenario: Primera carga del radar con stock
- **WHEN** el usuario abre el radar y no hay cache de stock
- **THEN** el app descarga el snapshot una vez y muestra los badges

#### Scenario: Cache vigente
- **WHEN** el usuario recarga el radar dentro de los 15 minutos
- **THEN** no hay nuevo request de stock (cache en memoria/sesion)

### Requirement: Frescura del stock
El sistema SHALL mostrar la fecha de descarga del stock (`fecha_descarga` del
backend) junto a los datos, y usar un probe ligero (limit=1) para detectar
regeneraciones sin descargar el payload completo.

#### Scenario: Indicador de frescura visible
- **WHEN** se muestran badges de stock
- **THEN** la vista indica "stock al {fecha}" con la fecha del backend
