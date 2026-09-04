## Purpose

Priorizar la visita del vendedor: lista de clientes con SKUs cuya recompra esta
vencida, ordenada por valor estimado de recompra, filtrada por calidad de datos.

## ADDED Requirements

### Requirement: Lista de oportunidades de recompra
El sistema SHALL mostrar en `/radar` las oportunidades del vendedor activo:
filas de `vw_radar_recompra` con `estado_oportunidad=VENCIDO`, agrupadas por
cliente, mostrando por SKU: nombre, linea, dias de silencio, cadencia efectiva,
numero de compras y valor estimado de recompra
(precio_promedio x und_por_dia x (silencio - cadencia)).

#### Scenario: Oportunidades priorizadas por valor
- **WHEN** el radar carga para un vendedor con oportunidades
- **THEN** los clientes se muestran ordenados por valor estimado total
  descendente y los SKUs de cada cliente por valor estimado descendente

#### Scenario: Vendedor sin oportunidades
- **WHEN** la consulta no devuelve filas VENCIDO para los clientes del vendedor
- **THEN** la app muestra estado vacio con orientacion

### Requirement: Filtros de calidad del radar
El sistema SHALL excluir del radar: filas con `n_compras` menor que 3,
clientes inactivos (sin compra de NINGUN SKU en los ultimos 180 dias) y
filas con silencio mayor a 730 dias.

#### Scenario: Cliente abandonado excluido
- **WHEN** un cliente no compra ningun SKU hace mas de 180 dias
- **THEN** ninguna de sus oportunidades aparece en el radar

#### Scenario: SKU con una sola compra excluido
- **WHEN** una fila del radar tiene n_compras menor a 3
- **THEN** no se considera una oportunidad (cadencia poco confiable)

### Requirement: Frescura de datos del radar
El sistema SHALL indicar que los datos del radar provienen de una vista
materializada actualizada cada noche, mostrando la hora de referencia
(16:00 hora Peru del dia de consulta).

#### Scenario: Indicador de frescura visible
- **WHEN** el radar muestra oportunidades
- **THEN** la vista indica "Datos actualizados hasta 16:00 (hora Peru)" o
  equivalente
