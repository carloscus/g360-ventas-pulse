## 1. Resumen comercial de la ficha

- [x] 1.1 Crear `src/lib/api/fichaComercial.js`: resumen (totales del periodo, top 5 productos, frecuencia promedio desde MV radar, evolucion mensual por mes_ref); verificar con cliente real (00056101)
- [x] 1.2 Secciones en la ficha: resumen (tarjetas totales + frecuencia), evolucion mensual (CSS bars), top productos; verificar con periodos multi-mes

## 2. Cross-sell

- [x] 2.1 Query cross-sell en fichaComercial.js: lineas del cliente -> MV de otros clientes del vendedor -> SKUs no comprados -> top 5 por popularidad; verificar con cliente real
- [x] 2.2 Seccion OPORTUNIDAD en la ficha con badge de stock por sugerencia; verificar exclusion de SKUs ya comprados y de sin-stock

## 3. Verificacion

- [x] 3.1 `npm run build` sin errores; flujo dashboard -> ficha con las nuevas secciones en preview

## Nota de campo (2026-09-03)

- [x] 5.1 Ajuste de orden/diseno de secciones de la ficha segun feedback de campo (funcional hoy)

- [x] 5.2 Busqueda de producto con precios vendidos al cliente en contexto (ficha) + back unificado (clientes->dashboard, ficha->clientes)

