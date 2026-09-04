## Purpose

Listado "Mis Clientes" del vendedor activo con su ultima compra y monto
acumulado, punto de entrada a la ficha de cada cliente.

## ADDED Requirements

### Requirement: Lista de clientes del vendedor
El sistema SHALL mostrar en `/clientes` los clientes del vendedor activo
(filtro por `id_vendedor`) con nombre, fecha de ultima compra y monto acumulado
en el periodo de trabajo, ordenados por fecha de ultima compra descendente.

#### Scenario: Vendedor con clientes
- **WHEN** la consulta al historial de ventas devuelve compras del vendedor activo
- **THEN** la lista agrupa por cliente mostrando ultima compra y monto, con los
  mas recientes primero

#### Scenario: Vendedor sin clientes en el periodo
- **WHEN** la consulta no devuelve filas para el vendedor activo
- **THEN** la app muestra un estado vacio con orientacion al usuario

#### Scenario: Cada fila navega a la ficha
- **WHEN** el usuario toca una fila de cliente
- **THEN** la app navega a la ficha de ese cliente

### Requirement: Cache de 4 capas para datos de cliente
El sistema SHALL servir los datos del directorio desde la jerarquia de cache
memoria → sessionStorage → localStorage → red, para funcionar en campo con
conectividad intermitente.

#### Scenario: Sin conectividad con cache vigente
- **WHEN** la app consulta el directorio sin red y existe cache local vigente
- **THEN** la app muestra los datos cacheados y lo indica al usuario

#### Scenario: Sin conectividad sin cache
- **WHEN** la app consulta el directorio sin red y no existe cache
- **THEN** la app muestra un error con opcion de reintento
