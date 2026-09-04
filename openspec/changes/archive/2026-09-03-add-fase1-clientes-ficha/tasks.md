## 1. Configuracion base

- [x] 1.1 Crear `.env.example` con `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` y modulo de env; verificar build lee las variables
- [x] 1.2 Desactivar SSR/prerender por ruta en `src/routes/+layout.js` (`ssr = false`) y verificar `npm run build` genera fallback `index.html`
- [x] 1.3 Actualizar `package.json` (`name: g360-ventas-cockpit`) y confirmar `npm run dev` levanta sin errores

## 2. Acceso a datos

- [x] 2.1 Implementar cliente PostgREST (fetch + headers apikey/Bearer, eq/gte/lte/order) y verificar consulta manual a `vw_historial_venta_cliente` con vendedor real
- [x] 2.2 Implementar wrapper cache 4 capas (memoria → sessionStorage → localStorage → red, TTL 5 min / 7 dias) y verificar hit/miss por consola y persistencia tras reload
- [x] 2.3 Implementar store de vendedor activo con persistencia en IndexedDB y verificacion de restauracion tras reload
- [x] 2.4 Implementar loader de `static/catalogo_productos.json` con lookup `un_bx` por SKU y verificar fallback vacio para SKU inexistente

## 3. Ruta raiz — selector de vendedor

- [x] 3.1 Reescribir `src/routes/+page.svelte` como selector (input libre, validacion vacio, navega a `/clientes`) y verificar navegacion + persistencia
- [x] 3.2 Implementar deteccion de sesion previa que evita el selector y accion "cambiar vendedor" que limpia cache derivado; verificar ambos flujos

## 4. Directorio de clientes

- [x] 4.1 Crear `src/routes/clientes/+page.svelte`: query historial por `id_vendedor`, agrupar por cliente (ultima compra, monto) y verificar contra consulta directa en Supabase
- [x] 4.2 Agregar estados vacio, error con reintento e indicador offline; verificar forzando fallo de red y con cache vigente
- [x] 4.3 Navegacion fila → `/ficha/[cliente]` con base path Pages; verificar en `npm run preview`

## 5. Ficha de cliente

- [x] 5.1 Crear `src/routes/ficha/[cliente]/+page.svelte` con query cliente+periodo (order `id_articulo.asc,fecha_orig.desc`) y filtro de fechas; verificar agregacion por SKU contra datos reales (venta/NC/devolucion)
- [x] 5.2 Render de tabla por SKU: und, cajas (`un_bx`), precio ultimo/anterior/anterior2, NC monto+conteo, devoluciones, saldo; verificar SKU sin `un_bx` y sin precio previo muestran vacio
- [x] 5.3 Estados vacio por periodo, error e indicador "datos offline"; verificar con red y sin red

## 6. Export xlsx

- [x] 6.1 Implementar generador xlsx de la ficha con ExcelJS (tabla por SKU + encabezados cliente/vendedor/periodo/fecha) y verificar apertura del archivo en Excel
- [x] 6.2 Alinear encabezados de precios/NCs con plantilla nc-sustentor y verificar contra plantilla de referencia
- [x] 6.3 Boton export con bloqueo y aviso cuando no hay datos; verificar ambos casos

## 7. Verificacion integral

- [x] 7.1 `npm run build` sin errores y preview en `/g360-ventas-cockpit/` navegable flujo completo (vendedor → clientes → ficha → export)
- [x] 7.2 Prueba en movil (touch targets 48px, dark mode, PWA instalable) con datos reales de un vendedor CIPSA
