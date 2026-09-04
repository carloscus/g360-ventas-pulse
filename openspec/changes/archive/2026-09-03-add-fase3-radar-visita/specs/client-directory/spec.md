## Purpose

Punto de entrada al radar desde el directorio de clientes.

## MODIFIED Requirements

### Requirement: Lista de clientes del vendedor
El sistema SHALL mostrar en `/clientes` los clientes del vendedor activo
(filtro por `id_vendedor`) con nombre, fecha de ultima compra y monto acumulado
en el periodo de trabajo, ordenados por fecha de ultima compra descendente,
y SHALL ofrecer acceso al radar de recompra.

#### Scenario: Acceso al radar desde el directorio
- **WHEN** el usuario toca la accion de radar en el directorio
- **THEN** la app navega a `/radar`

#### Scenario: Vendedor con clientes
- **WHEN** la consulta al historial de ventas devuelve compras del vendedor activo
- **THEN** la lista agrupa por cliente mostrando ultima compra y monto, con los
  mas recientes primero
