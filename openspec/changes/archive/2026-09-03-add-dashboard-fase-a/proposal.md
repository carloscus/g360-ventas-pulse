# Proposal: Fase A — Dashboard del vendedor + login de doble input

## Why

La app hoy abre en un listado plano de clientes: el vendedor no tiene una vista
que responda "que reviso hoy?". El plan Asistente Comercial define el Dashboard
como puerta de entrada (agenda comercial, no tablero de KPIs). A la vez, el
login actual (solo codigo de vendedor) es trivial de adivinar; el par
vendedor+cliente de su cartera sube la barrera casual sin infra nueva.

## What Changes

- Login con 2 inputs: id vendedor + id cliente de su cartera; el par se valida
  contra `ventas` (indice id_vendedor+id_cliente) antes de iniciar sesion.
  Mensaje de error generico. Ventana de validacion: cualquier venta en la
  ventana de datos (4 anios). Normalizacion cliente: pad a 8 si numerico.
- Nueva ruta `/dashboard` como home tras el login:
  - Clientes prioritarios: top por valor estimado del radar (reutiliza radar.js)
  - Proximos a recompra: silencio >= 80% de la cadencia (nuevo estado, MV ya lo permite)
  - Alertas: productos habituales del top con stock disponible (reutiliza stock.js),
    caida de compras (periodo actual vs anterior del directorio cacheado)
- `/` pasa a ser el selector con doble input; despues del login navega a
  `/dashboard`. Accesos rapidos a clientes, radar y ficha desde el dashboard.

## Capabilities

### New Capabilities

- `dashboard-vendedor`: agenda comercial del dia (prioritarios, proximos a
  recompra, alertas, accesos rapidos) compuesta de datos ya calculados.

### Modified Capabilities

- `vendedor-selector`: doble input (vendedor + cliente de cartera) con
  validacion del par antes de iniciar sesion; error generico.

## Impact

- **Codigo**: `src/routes/+page.svelte` (selector 2 inputs), `src/routes/dashboard/`
  (nueva), `src/lib/api/dashboard.js` (nuevo: composicion prioritarios/proximos/alertas),
  `src/lib/stores/vendedor.js` (validar par).
- **Datos**: queries existentes (ventas, vw_radar_recompra, stock-api). Sin DDL.
- **Dependencias**: ninguna nueva.
