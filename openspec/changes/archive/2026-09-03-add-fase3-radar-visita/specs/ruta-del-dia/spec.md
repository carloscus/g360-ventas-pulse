## Purpose

Armar la lista de visitas del dia: el vendedor elige clientes del radar y
obtiene la secuencia con los SKUs a ofrecer en cada visita.

## ADDED Requirements

### Requirement: Seleccion de clientes para la ruta
El sistema SHALL permitir marcar clientes del radar como visitas del dia y
persistir la seleccion localmente para sobrevivir recargas.

#### Scenario: Marcar y desmarcar visitas
- **WHEN** el vendedor marca o desmarca un cliente en el radar
- **THEN** la lista de ruta del dia se actualiza y persiste tras recargar

#### Scenario: Ruta persiste al reabrir
- **WHEN** el vendedor reabre la app
- **THEN** la seleccion de visitas del dia sigue vigente

### Requirement: Lista ordenada de visitas del dia
El sistema SHALL mostrar la ruta del dia como lista ordenada (por valor
estimado descendente) con, por cada cliente: SKUs a ofrecer (nombre, linea,
und por dia estimadas) y total de valor estimado de la ruta.

#### Scenario: Ruta con detalle por cliente
- **WHEN** el vendedor abre la ruta del dia
- **THEN** ve las visitas ordenadas por valor estimado y los SKUs a ofrecer
  en cada una

#### Scenario: Ruta vacia
- **WHEN** no hay clientes marcados
- **THEN** la app muestra estado vacio invitando a marcar clientes en el radar
