# g360-ventas-pulse — Plan de Implementación

> VentasPulse - cockpit de campo para vendedores CIPSA — PWA estática (SvelteKit + adapter-static + GitHub Pages).
> Scaffold heredado de `g360-return-form` (patrón probado). Datos: `g360-ventas-db` (Supabase).

---

## Estado

| Fase | Entrega | Estado |
|------|---------|--------|
| **0** | BD Supabase: índices + ANALYZE + vistas cockpit | ✅ ejecutada y verificada 2026-09-02 (`g360-ventas-db/supabase/PENDING_MANUAL_STEPS.md`) |
| **1** | Mis Clientes + Ficha Cliente + export xlsx | ✅ implementada (19/20; falta prueba móvil) — change `add-fase1-clientes-ficha` |
| **2** | Comparativo A vs B + export plantilla nc-sustentor | 🔲 |
| **3** | Radar de recompra + ruta priorizada + cruce stock | ✅ implementada (`add-fase3-radar-visita` + `add-radar-stock-cruce`, falta prueba móvil) |
| **4** | Supabase Auth (magic link) + RLS por vendedor | 🔲 opcional |

## Precondición bloqueante

**Fase 0** debe ejecutarse ANTES de escribir código: sin índices ni vistas, todas
las consultas del app tardan 300-2000 ms (full scans). Pasos en
`g360-ventas-db/supabase/PENDING_MANUAL_STEPS.md`.

## Fuentes de datos (PostgREST, anon key, read-only)

| Vista | Módulo | Patrón de consulta |
|-------|--------|--------------------|
| `vw_historial_venta_cliente` | Ficha / Comparativo | `id_cliente + id_vendedor + fecha_orig range`, order `id_articulo.asc, fecha_orig.desc`; app agrupa por SKU |
| `vw_facturas_disponibles` | Pre-devolución (fase 2+) | `id_cliente + id_articulo in (...) + saldo_disponible gt 0`, LIFO |
| `vw_radar_recompra` | Radar | filtra clientes del vendedor; ordena vencidos por monto esperado |
| `ventas` (tabla, para agregados) | Comparativo | `tipo_operacion=eq.ajuste_valor` para NCs por SKU |
| `catalogo_productos.json` (estático) | Conversión und↔caja (`un_bx`) | fetch local, cero red |

## Módulos (src/routes)

```
/                     → selector de vendedor (fase 1: input libre; fase 4: login)
/clientes             → lista de clientes del vendedor + última compra + monto
/ficha/[cliente]      → tabla por SKU: cant, precio último/anterior/anterior2,
                        NC descuento, devoluciones, saldo; filtro de período
/comparativo          → período A vs B por SKU (und + cajas con un_bx, % crec.)
/radar                → oportunidades VENCIDAS priorizadas; ruta del día
/export               → xlsx (ExcelJS) + plantilla historial para nc-sustentor
```

## Convenciones (copiadas de return-form)

- Cache 4 capas para datos de cliente: memoria → sessionStorage → localStorage → API
- ExcelJS para xlsx (patrón probado con imágenes)
- Design tokens G360 (primary #008f5d, touch-target 48px, dark mode)
- Base path Pages: `/g360-ventas-pulse`
- IndexedDB para persistencia de sesión de trabajo

## Decisiones de diseño cerradas (con el usuario)

1. Vendedor = jerarquía/navegación, NO filtro de cálculo de devoluciones
2. Fuera de período (>3 años): alerta pero se registra (el app decide)
3. Devolución parcial granular por factura (saldo = vendido - devuelto)
4. Sin locks transaccionales: el ERP revalida al emitir la NC
5. Ventana Supabase = 4 años; facturas >4 años → flujo admin con SQLite local

## Refinamientos del radar (pendientes fase 3)

1. Filtrar **clientes activos** (última compra de cualquier SKU < ~180 días)
2. Agrupar compras del **mismo día** como una sola (cadencia actual cuenta
   cada factura: 10 facturas el mismo día dan cadencia ~0)
3. Ventana máxima de silencio a evaluar (~730 días)

## Deployment

```bash
npm install
npm run build        # → build/ (estático)
git push             # GitHub Actions deploya a Pages (workflow heredado)
```

Crear repo en GitHub como `g360-ventas-pulse` y habilitar Pages desde Actions.





---

## Roadmap Asistente Comercial (plan amplio aterrizado)

| Fase | Entrega | Estado |
|------|---------|--------|
| A | Dashboard del vendedor + login doble input (vendedor + cliente cartera) + modal producto (adelantado) + optimizaciones cache | ✅ archivada 2026-09-03 |
| B | Ficha comercial completa (frecuencia, evolucion mensual, top productos, resumen) + cross-sell | ✅ archivable (change `add-fase-b-ficha-comercial`) |
| C | Analisis de precios anual (prom/min/max por anio, variacion %) + detector de anomalias (argumento volumen) | ✅ archivable (change `add-fase-c-precios-anual`) |
| D | Resumen ventas (mes actual/anterior/anio anterior + tops + evolucion) + **Montos netos** jerarquicos (`/netos`: cliente→linea→SKU, rango vs -1a vs -2a) | ✅ (`add-fase-d-estadisticas` + `add-netos-jerarquia`) |

Fuera de alcance PWA: pedido, devoluciones operativas, NC, aprobaciones.

## Limpieza tecnica (2026-09-03)

- Codigo heredado de devoluciones (11 archivos: ClientForm, ProductSearch,
  QuickAddModal, SummaryView, ManualProductModal, NotificationPill, app.js,
  products.js, documentValidation.js, excelGenerator.js, indexedDB.js) movido
  a src/lib/_legacy/ (fuera del bundle, conservado por referencia).
- ToastContainer eliminado de dashboard/clientes/radar (solo la ficha usa
  toasts reales en el export).
- Title del layout corregido a Ventas Pulse.
- ExcelJS queda como chunk lazy de ~970KB: solo descarga al exportar xlsx.
Jefatura: app de escritorio aparte en el futuro (reutiliza vistas Supabase,
stock-api, convenciones; requerira Auth+RLS real de fase 4).

## Principios (plan Asistente Comercial adoptados)

1. Consulta y ayuda a decidir; NO opera (ERP revalida)
2. Radar granular por producto con cadencia individual (no regla universal de 90 dias)
3. Reposicion (historial real) vs Oportunidad (cross-sell) son categorias distintas
4. Stock como contexto comercial (disponible/limitado/sin stock), no catalogo
5. Progressive disclosure de precios (referencia primero, historial bajo demanda)
6. Cache por capas con fecha de actualizacion visible siempre
7. Busqueda puntual > precarga masiva (query especifica, resultado chico)








## Convenciones de ventana temporal (definidas en campo)

- **Ficha**: sin selector de rango. Tabla = ultimos 12 meses fijos (ventana
  compartida en cache con dashboard/radar). Analisis de precios = ultimos 3
  anios con datos (actual vs anterior vs antepenultimo) con variacion % por par.
- **Radar**: siempre "hoy hacia atras" (la MV calcula dias_silencio contra
  current_date; refresh nocturno 16:00 Peru). No lleva selector de periodo.
- **Comparativa entre clientes** (modal y ficha): ultimo precio x cantidad con
  numero de factura + rango min-max + NCs por cliente.

