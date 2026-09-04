## 1. Servicio de stock

- [x] 1.1 Crear `src/lib/api/stock.js`: snapshot + Map sku->disponible (almacenes venta), cache memoria 15min + sessionStorage, probe metadata, refresh manual; verificar con API real (02211 = ~144k en VES)
- [x] 1.2 Agregar `VITE_STOCK_API_URL`/`VITE_STOCK_API_KEY` a env.js y .env.example; verificar fallback

## 2. Integracion radar

- [x] 2.1 Cargar stock en `/radar` tras los datos, badge por producto (verde/amber/rojo) y orden secundario con-stock-primero; verificar con datos reales
- [x] 2.2 Indicador "stock al {fecha}" y boton refresh; verificar estados sin stock y sin red

## 3. Integracion ficha

- [x] 3.1 Columna "Stock" por SKU en `/ficha/[cliente]`; verificar SKU existente y ausente

## 4. Verificacion

- [x] 4.1 `npm run build` sin errores; flujo radar+ficha con stock en preview
