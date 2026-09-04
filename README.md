# g360-ventas-pulse — VentasPulse CIPSA

> Cockpit de campo para vendedores — PWA estática (SvelteKit + adapter-static + GitHub Pages).
> Dashboard diario, radar de recompra granular, ficha comercial completa, análisis de precios
> con detección de anomalías, stock en tiempo real y búsqueda global.
> Scaffold heredado de `g360-return-form`; assets PWA de `g360-stock-reporter-lit`.

[![G360](https://img.shields.io/badge/G360-skill-cipsa--movil-green.svg)](https://github.com/carloscus/g360-cli)
[![PWA](https://img.shields.io/badge/PWA-instalable-008f5d.svg)](#instalacion-pwa)
[![OpenSpec](https://img.shields.io/badge/specs-openspec-151e2e.svg)](openspec/)

---

## Arquitectura

```mermaid
flowchart TD
    subgraph PWA["VentasPulse PWA (SvelteKit SPA)"]
        DASH["/dashboard<br/>agenda del dia"]
        RADAR["/radar<br/>recompra + ruta"]
        CLI["/clientes<br/>directorio"]
        FICHA["/ficha/[cliente]<br/>comercial completa"]
        BUSQ["Busqueda global<br/>productos + clientes"]
    end

    subgraph DATOS["Fuentes de datos"]
        SB["Supabase PostgREST<br/>anon key read-only<br/>ventas · vw_radar_recompra (MV)"]
        STOCK["g360-stock-api (Render)<br/>disponibilidad por almacen<br/>refresh ~15 min"]
        CAT["catalogo_productos.json<br/>static · un_bx · precios lista"]
    end

    CACHE["Cache 4 capas<br/>memoria → sessionStorage<br/>→ localStorage → red"]

    DASH --> CACHE
    RADAR --> CACHE
    CLI --> CACHE
    FICHA --> CACHE
    BUSQ --> CACHE
    CACHE --> SB
    CACHE --> STOCK
    CACHE --> CAT
```

## Pipeline de datos

```mermaid
flowchart LR
    A["login par<br/>vendedor+cliente"] --> B["directorio<br/>ventas 180d<br/>paginado"]
    B --> C["radar MV<br/>VENCIDO por chunk"]
    C --> D{"filtros de<br/>calidad"}
    D -->|n_compras >= 3| E["valor estimado<br/>por producto<br/>caps: und/dia ≤ 10<br/>exceso ≤ 90d"]
    D -->|cadencia > 0| E
    D -->|activo < 180d| E
    E --> F["prioritarios<br/>dashboard"]
    E --> G["ruta del dia<br/>IndexedDB"]
    E --> H["cross-sell<br/>clientes similares"]
```

## Módulos

| Ruta | Módulo | Fuente |
|------|--------|--------|
| `/` | Login doble input (vendedor + cliente de cartera) | `ventas` (índice vendedor+cliente) |
| `/dashboard` | Agenda del día: prioritarios, próximos a recompra, alertas, "Cómo voy" | radar MV + stock + ventas |
| `/clientes` | Directorio del vendedor (180 días, offline-first) | `ventas` |
| `/ficha/[cliente]` | Tabla por SKU, resumen comercial, evolución mensual, precios anual + anomalías, comparativa entre clientes, export xlsx | vista historial + stock + catálogo |
| `/radar` | Oportunidades VENCIDAS priorizadas + ruta del día persistente | radar MV + stock |

## Convenciones

- **Nombres**: componentes PascalCase, funciones camelCase, clases CSS kebab-case (`glass-card`, `btn-primary`, `badge-*`)
- **Moneda**: montos **sin IGV** (precios ERP); componente `MontoTooltip` muestra `Con IGV (+18%)` al tap (constante `IGV_PORCENTAJE: 0.18`, igual que order-xlsx)
- **Códigos**: clientes/vendedores display sin prefijo `01` (`01186` → `186`, `01O01` → `O01`); **SKUs nunca se recortan** (`011019` ≠ `11019`)
- **Formato**: `es-PE`, `S/` con `Intl.NumberFormat`
- **Cache**: memoria (15 min) → sessionStorage → localStorage → red; snapshot de stock con fallback stale (badge "obsoleto")
- **Touch**: targets ≥ 44px, inputs 16px (anti-zoom iOS), filas completas tappable con `active:scale`
- **Datos**: paginación offset con desempate `folio_unico` (evita duplicados entre páginas)

## Estructura

```text
src/
├── routes/
│   ├── +page.svelte          login doble input
│   ├── dashboard/            agenda del dia
│   ├── clientes/             directorio
│   ├── ficha/[cliente]/      ficha + aggregation.js
│   └── radar/                radar + ruta
├── lib/
│   ├── api/                  postgrest, cache, clientes, radar,
│   │                         stock, precios, fichaComercial,
│   │                         dashboard, ventasResumen, catalogo
│   ├── components/           ProductSearchModal, IgvCalculator,
│   │                         G360Signature, ThemeToggle, PWAInstallPrompt
│   ├── export/               fichaXlsx (ExcelJS lazy, headers ERP nc-sustentor)
│   ├── stores/               vendedor, ruta, contexto
│   ├── db/                   cockpitDB (IndexedDB v2)
│   ├── utils/                format, display, igv
│   └── _legacy/              scaffold devoluciones (fuera del bundle)
└── core/                     skill.json (branding G360)
```

## Instalación PWA

```mermaid
flowchart LR
    A["Android Chrome"] -->|menu| B["Instalar app"]
    B --> C["standalone<br/>iconos 192/512<br/>offline cache"]
    A -->|iOS Safari| D["Compartir →<br/>Add to Home"]
```

## Desarrollo

```bash
npm install
npm run dev        # vite dev (puerto por defecto)
npm run build      # build/ estático (adapter-static + PWA SW)
npm run preview    # preview del build
```

Variables de entorno (copiar `.env.example` → `.env`):

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | PostgREST base |
| `VITE_SUPABASE_ANON_KEY` | anon key read-only |
| `VITE_STOCK_API_URL` | stock API base |
| `VITE_STOCK_API_KEY` | stock read key |

## Deployment

```bash
npm run build
git push   # GitHub Actions deploya a Pages (workflow heredado)
```

Base path: `/g360-ventas-pulse` · repo: `g360-ventas-pulse` · Pages desde Actions.

## OpenSpec

Especificaciones y cambios en `openspec/` (schema `spec-driven`). Fases A–D
implementadas y archivadas; ver `PLAN.md` para el roadmap y los principios
adoptados del plan Asistente Comercial.

## G360 Ecosystem

Proyecto hermano de [g360-stock-reporter-lit](https://github.com/carloscus/g360-stock-reporter-lit)
(misma familia de PWA de campo CIPSA) y `g360-ventas-db` (fuente de datos
Supabase). Signature: *powered by G360*.

