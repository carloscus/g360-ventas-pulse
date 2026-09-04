## 1. Modulo de precios

- [x] 1.1 Crear `src/lib/api/precios.js`: query historial 4 anios por cliente (cache), agregacion anual por SKU (prom/min/max/variacion) y deteccion de anomalias (< promedio -15% con cantidad); verificar con 00056101/02211
- [x] 1.2 Progressive disclosure: resumen top 5 primero, historial por SKU bajo demanda; verificar datos reales

## 2. Seccion en la ficha

- [x] 2.1 Seccion "Precios por anio" en la ficha (lazy al abrir): filas de resumen anual + badges de variacion + marcas de anomalia; verificar con multi-anio
- [x] 2.2 Historial expandible por SKU (fecha, cantidad, precio, marca anomalia); verificar toggle

## 3. Verificacion

- [x] 3.1 `npm run build` sin errores; flujo dashboard -> ficha -> precios con datos reales
- [x] 5.1 Comparativa de precios por SKU entre todos los clientes del vendedor (boton en analisis anual, cliente activo resaltado, orden por promedio)

