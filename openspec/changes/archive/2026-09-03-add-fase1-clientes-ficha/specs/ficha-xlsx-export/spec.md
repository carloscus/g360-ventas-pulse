## Purpose

Export de la ficha cliente a xlsx con ExcelJS, para trabajo posterior
(sustento de NCs con nc-sustentor) y reporte al vendedor.

## ADDED Requirements

### Requirement: Export xlsx de la ficha
El sistema SHALL exportar la ficha del cliente (periodo activo) a un archivo
xlsx con la tabla por SKU y encabezados de contexto (cliente, vendedor, periodo,
fecha de generacion).

#### Scenario: Export exitoso
- **WHEN** el usuario toca "Exportar" en la ficha con datos cargados
- **THEN** la app genera y descarga un xlsx con la tabla por SKU y los
  encabezados de contexto

#### Scenario: Export sin datos
- **WHEN** el usuario toca "Exportar" sin datos en la ficha
- **THEN** la app lo impide y avisa que no hay datos para exportar

### Requirement: Compatibilidad con flujo nc-sustentor
El sistema SHALL generar el export con estructura de tabla compatible con la
plantilla historial que consume nc-sustentor (columnas de precios y NCs
reconocibles por ese flujo).

#### Scenario: Plantilla reconocible
- **WHEN** se genera el export de la ficha
- **THEN** el xlsx incluye las columnas de precio ultimo/anterior/anterior2 y
  NCs con encabezados estables para el flujo de sustento
