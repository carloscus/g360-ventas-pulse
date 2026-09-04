# Proposal: Fase 1 — Mis Clientes + Ficha Cliente + export xlsx

## Why

El cockpit de campo para vendedores CIPSA no existe aún: el repositorio solo
contiene el scaffold heredado de `g360-return-form`. La precondición bloqueante
(Fase 0: índices + vistas en Supabase) fue **ejecutada y verificada el
2026-09-02** (`g360-ventas-db/supabase/PENDING_MANUAL_STEPS.md`: ficha ~340-410 ms,
`vw_historial_venta_cliente` OK con anon key), así que Fase 1 está desbloqueada
y es la primera entrega de valor real para el vendedor en campo.

## What Changes

- Nueva ruta `/` como selector de vendedor (fase 1: input libre, sin auth).
- Nueva ruta `/clientes`: lista de clientes del vendedor con última compra y monto.
- Nueva ruta `/ficha/[cliente]`: tabla por SKU con cadena de precios
  (último / anterior / anterior2), NCs por descuento, devoluciones, saldo;
  filtro de período.
- Export xlsx (ExcelJS) de la ficha.
- Reemplazo de la home actual (formulario de devoluciones heredado) como ruta
  activa de la app. El código de devoluciones se conserva en el repo pero deja
  de ser la entrada (poda diferida).
- Infraestructura reutilizada del scaffold: stores Svelte, IndexedDB,
  ThemeToggle, ToastContainer, PWA install prompt, cache 4 capas.

## Capabilities

### New Capabilities

- `vendedor-selector`: selección del vendedor en `/` (input libre en fase 1),
  persistencia de sesión de trabajo en IndexedDB.
- `client-directory`: listado "Mis Clientes" en `/clientes` derivado de
  `vw_historial_venta_cliente` (clientes del vendedor, última compra, monto).
- `client-ficha`: ficha por cliente en `/ficha/[cliente]` — agregación por SKU
  según contrato DATOS.md §1 (vendido_und/soles, nc_descuento, devuelto,
  precio_ultimo/anterior/anterior2, cajas vía `un_bx` del catálogo estático),
  filtro de período.
- `ficha-xlsx-export`: export xlsx de la ficha con ExcelJS (patrón probado de
  return-form).

### Modified Capabilities

(ninguna — primer change del proyecto; no hay specs previas en `openspec/specs/`)

## Impact

- **Código**: `src/routes/` (nuevas rutas), `src/lib/` (nuevos stores/servicios
  PostgREST + cache). Se reutilizan `lib/db/indexedDB.js`, `lib/stores/*`,
  componentes G360.
- **Datos**: lectura PostgREST anon de `vw_historial_venta_cliente` (contrato en
  DATOS.md §1) + `static/catalogo_productos.json` local (`un_bx`). Solo lectura.
- **Dependencies**: ninguna nueva (ExcelJS ya está en package.json).
- **Sistema externo**: Supabase `tqdmoytaucnfrpaklprc` ya verificado; sin DDL
  pendiente para esta fase.
- **Deployment**: base path `/g360-ventas-cockpit`, GitHub Pages vía workflow
  heredado `.github/workflows/deploy.yml`.
