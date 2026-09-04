## 1. Modulo de datos

- [x] 1.1 Crear `src/lib/api/netos.js`: 3 consultas por periodo (A/B/C) paginadas y cacheadas + construccion del arbol cliente->linea->sku con netos y variacion; verificar con 01178 enero 2026 vs 2025 vs 2024
- [x] 1.2 Rango por defecto mes en curso y desplazamiento de anios; verificar borde 29-feb y cliente sin datos

## 2. Ruta /netos

- [x] 2.1 Crear `src/routes/netos/+page.svelte`: selector Desde/Hasta + Aplicar, tabla jerarquica colapsable (3 niveles), columnas A/B/C + variacion, tabular-nums; verificar expansion y orden
- [x] 2.2 Estados vacio/error/offline y acceso rapido desde dashboard; verificar navegacion

## 3. Verificacion

- [x] 3.1 `npm run build` sin errores; flujo dashboard -> netos con datos reales

## Mejoras de revision (post-campo)

- [x] 5.1 Sort por cabecera en netos (A/B/C/Delta, aplica a los 3 niveles), chips de orden en clientes y cabeceras ordenables en ficha
- [x] 5.2 Paginado incremental en la tabla de ficha: 50 filas + 'Mostrar todos' para carteras grandes

