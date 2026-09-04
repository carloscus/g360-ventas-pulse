## 1. Login de doble input

- [x] 1.1 Selector: segundo input de cliente con normalizacion (numerico pad 8, alfanumerico tal cual) y validacion del par contra ventas (limit=1, indice vendedor+cliente); verificar par valido, par invalido (error generico) y inputs vacios con datos reales
- [x] 1.2 Persistir el par validado con la sesion (vendedor.js) y navegar a /dashboard; verificar restauracion de sesion salta el login

## 2. Servicio dashboard

- [x] 2.1 Crear `src/lib/api/dashboard.js`: prioritarios (top 5 radar por valor), proximos a recompra (MV sin filtro estado, silencio 0.8-1.0x cadencia, n>=3, cad>0), alertas stock (top productos × clasificarStock); verificar con vendedor real (01177/01178)
- [x] 2.2 Caida de compras: ventas 90d vs 90d previos por cliente activo, umbral <50%; verificar con datos reales

## 3. Ruta /dashboard

- [x] 3.1 Crear `src/routes/dashboard/+page.svelte`: secciones prioritarios, proximos a recompra, alertas, accesos rapidos (clientes/radar), header id-nombre; verificar navegacion a ficha y radar
- [x] 3.2 Estados vacio, error y offline por seccion (graceful: una seccion falla, las otras se muestran); verificar forzando fallos

## 4. Integracion

- [x] 4.1 `/` tras login va a /dashboard (no a /clientes); clientes y radar enlazan de vuelta al dashboard; verificar flujo completo
- [x] 4.2 `npm run build` sin errores; flujo completo login -> dashboard -> ficha -> radar en preview
