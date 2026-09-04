## Purpose

Agenda comercial del dia para el vendedor: que revisar hoy, compuesta de los
datos que la app ya calcula (radar, directorio, stock).

## ADDED Requirements

### Requirement: Clientes prioritarios del dia
El sistema SHALL mostrar en `/dashboard` los clientes prioritarios del
vendedor activo: los de mayor valor estimado segun el radar, con su valor y
numero de productos con recompra vencida.

#### Scenario: Prioritarios ordenados por valor
- **WHEN** el vendedor activo tiene oportunidades en el radar
- **THEN** el dashboard lista hasta 5 clientes por valor estimado descendente,
  cada uno navega a su ficha

#### Scenario: Sin oportunidades
- **WHEN** el radar no devuelve oportunidades para el vendedor
- **THEN** la seccion muestra estado vacio invitando a revisar el radar

### Requirement: Proximos a recompra
El sistema SHALL identificar clientes con SKUs cuyo silencio alcanza al menos
el 80% de su cadencia efectiva sin llegar al umbral VENCIDO, como aviso temprano
de reposicion.

#### Scenario: Aviso temprano visible
- **WHEN** un SKU tiene silencio >= 0.8 x cadencia y estado OK en la MV
- **THEN** el cliente aparece en la seccion "Proximos a recompra" con el SKU y
  los dias que faltan para vencer

#### Scenario: Seccion vacia
- **WHEN** ningun SKU esta proximo a vencer
- **THEN** la seccion indica que no hay proximos a recompra hoy

### Requirement: Alertas del dia
El sistema SHALL mostrar alertas accionables: productos habituales del top de
clientes con stock disponible (argumento de venta) y caida de compras
(clientes con ventas del periodo actual menores al periodo anterior equivalente).

#### Scenario: Stock disponible como argumento
- **WHEN** un producto prioritario del radar tiene disponibilidad en stock
- **THEN** se genera alerta "SKU disponible: argumento para la visita"

#### Scenario: Caida de compras detectada
- **WHEN** un cliente activo del directorio tiene ventas del periodo actual
  menores al 50% del periodo anterior equivalente
- **THEN** se genera alerta de caida con el cliente y el porcentaje
