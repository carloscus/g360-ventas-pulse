## 1. Acceso a datos

- [x] 1.1 Crear `src/lib/api/radar.js`: consulta MV por `id_cliente=in.(...)` con paginacion, filtros de calidad (n_compras>=3, silencio 0-730, cliente activo <180d) y calculo de valor estimado; verificar con vendedor real (01177/01178) contra consulta directa
- [x] 1.2 Agregar store persistente de ruta del dia en `cockpitDB.js` (store `ruta`, keyed por vendedor) y verificar persistencia tras recarga

## 2. Ruta /radar

- [x] 2.1 Crear `src/routes/radar/+page.svelte`: lista de clientes priorizada por valor estimado, con SKUs a ofrecer y badge de frescura 16:00 Peru; verificar orden y filtros con datos reales
- [x] 2.2 Estados vacio, error con reintento e indicador offline (cache); verificar forzando fallo de red
- [x] 2.3 Marcar/desmarcar clientes como visita del dia con persistencia; verificar recarga mantiene seleccion

## 3. Navegacion cruzada

- [x] 3.1 Accion "Radar" en `/clientes` (spec delta client-directory) y enlaces radar -> ficha de cada cliente; verificar flujo completo clientes -> radar -> ficha

## 4. Verificacion

- [x] 4.1 `npm run build` sin errores y flujo completo en preview con datos reales de un vendedor
- [x] 4.2 Prueba en movil con datos reales (touch 48px, dark mode)
