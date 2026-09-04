## Purpose

Puerta de entrada segura y ligera: doble input vendedor + cliente de cartera.

## MODIFIED Requirements

### Requirement: Seleccion de vendedor en la ruta raiz
El sistema SHALL validar el par (id vendedor, id cliente de su cartera) en `/`
antes de iniciar la sesion: el par es valido si existe al menos una venta del
cliente atendida por el vendedor en la ventana de datos. El mensaje de error
SERA generico (sin revelar cual input fallo). Los codigos se normalizan
(vendedor 1-3 digitos a 01+3, letra+2 a 01+letra+2; cliente numerico a pad 8;
alfanumerico tal cual) y el par validado se persiste con la sesion.

#### Scenario: Par valido inicia sesion
- **WHEN** el usuario ingresa un vendedor y un cliente de su cartera reales
- **THEN** la app valida el par contra el historial, inicia sesion y navega a
  /dashboard

#### Scenario: Par invalido rechazado con error generico
- **WHEN** el vendedor no existe, el cliente no existe, o el cliente no es de
  la cartera del vendedor
- **THEN** la app muestra "Vendedor o cliente incorrecto" sin indicar cual fallo

#### Scenario: Inputs vacios
- **WHEN** el usuario confirma sin completar ambos inputs
- **THEN** la app muestra validacion de campo y no consulta
