## Purpose

Identificar al vendedor activo para acotar la navegacion ("mis clientes") en la
fase 1 sin autenticacion: input libre en la ruta raiz y sesion de trabajo persistente.

## ADDED Requirements

### Requirement: Seleccion de vendedor en la ruta raiz
El sistema SHALL permitir seleccionar al vendedor activo en `/` mediante input
libre (codigo de vendedor) y navegar a `/clientes` tras confirmarlo.

#### Scenario: Seleccion exitosa
- **WHEN** el usuario ingresa un codigo de vendedor valido y confirma
- **THEN** la app guarda el vendedor activo y muestra la lista de sus clientes

#### Scenario: Codigo vacio
- **WHEN** el usuario confirma sin ingresar un codigo
- **THEN** la app muestra un mensaje de validacion y no navega

### Requirement: Sesion de trabajo persistente
El sistema SHALL restaurar el vendedor activo al reabrir la app usando la
sesion de trabajo persistida localmente.

#### Scenario: Reapertura de la app
- **WHEN** el usuario abre la app y existe una sesion previa con vendedor activo
- **THEN** la app restaura el vendedor y evita el selector (acceso directo a la navegacion)

#### Scenario: Cambio de vendedor
- **WHEN** el usuario solicita cambiar de vendedor activo
- **THEN** la app descarta los datos en cache derivados del vendedor anterior y
  vuelve al selector
