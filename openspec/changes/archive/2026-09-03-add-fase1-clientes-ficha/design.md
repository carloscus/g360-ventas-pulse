## Context

Scaffold heredado de `g360-return-form` (SvelteKit 2 + adapter-static + Tailwind 3 +
ExcelJS + PWA). Fase 0 ejecutada y verificada 2026-09-02 en Supabase
(`tqdmoytaucnfrpaklprc`): `vw_historial_venta_cliente` responde ~340-410 ms con
anon key para ficha+periodo. Contrato de datos en DATOS.md §1. Home actual =
formulario de devoluciones heredado (queda en el repo, deja de ser la entrada).

## Goals / Non-Goals

**Goals:**
- Reemplazar la home por selector de vendedor y construir `/clientes` +
  `/ficha/[cliente]` + export xlsx
- Implementar el cache de 4 capas (memoria → sessionStorage → localStorage → red)
  como patron unico de acceso a datos
- Reutilizar infraestructura del scaffold: IndexedDB, toasts, ThemeToggle,
  PWA install prompt, G360Signature, tokens G360

**Non-Goals:**
- Auth (Fase 4, opcional) — fase 1 usa input libre de vendedor
- Comparativo A vs B y pre-devolucion (Fase 2)
- Radar de recompra (Fase 3; ademas requiere refinamientos pendientes)
- Poda del codigo heredado de devoluciones (solo desmontar de la home; borrado diferido)

## Decisions

1. **Servicio PostgREST con fetch directo, sin SDK supabase-js.** El contrato es
   solo lectura con anon key y query params PostgREST (eq/gte/lte/order); el SDK
   anade peso sin beneficio. Alternativa (supabase-js) descartada por bundle y
   por mantener paridad con el patron reporter-lit.
2. **Anon key inyectada en build-time via `.env` (`VITE_SUPABASE_ANON_*`).**
   Es publica por diseno (RLS read-only, igual que return-form). Alternativa
   (proxy propio) descartada: sin backend, Pages estatico.
3. **Cache de 4 capas implementado como wrapper unico del fetch** (patron
   reporter-lit): clave = vista+params, TTL sessionStorage ~5 min / localStorage
   ~7 dias. Un solo modulo para que todas las rutas lo usen igual.
4. **Agregacion por SKU en el cliente, no en la BD.** La vista ya trae las filas
   por documento con la cadena LAG de precios; agrupar en el app preserva la
   trazabilidad folio a folio y evita otra vista. Alternativa (vista de
   agregacion) descartada para fase 1: DATOS.md ya define la agregacion del app.
5. **Rutas SvelteKit con SSR desactivado (`export const ssr = false`)** en el
   layout: app 100% cliente (IndexedDB + anon key + offline), prerender solo del
   fallback. Coherente con adapter-static + fallback index.html existente.
6. **Home reescrita, archivos heredados conservados en el repo.** Menor riesgo
   que podar en fase 1; la poda completa sera change propio una vez verificada
   la fase 1 en produccion.

## Risks / Trade-offs

- [Input libre de vendedor permite ver clientes ajenos (RLS anon de solo
  lectura)] → Aceptado por diseno (decision cerrada 1: vendedor es navegacion,
  no seguridad). Fase 4 cierra con Auth + RLS por vendedor.
- [mv/expansion del historial para vendedores con muchos clientes] → La lista
  de clientes se deriva del mismo query de historial; limitar por periodo de
  trabajo y paginar la tabla si excede ~200 filas.
- [`un_bx` faltante para algun SKU] → La ficha muestra und sin cajas y el
  export deja la celda vacia; nunca dividir por null/0.
- [Codigo heredado muerto en bundle] → Verificar en build que solo las rutas
  nuevas importen los stores/compomponentes usados; el tree-shaking de Vite
  elimina lo no referenciado.

## Migration Plan

Deploy = `npm run build` → Pages (workflow heredado). Rollback = redeploy del
tag anterior (static, sin DDL ni datos). Sin migraciones de BD en esta fase.

## Open Questions

- ¿Ventana de "ultima compra / monto" en `/clientes`: periodo de trabajo
  seleccionable o los ultimos 12 meses fijos? (no cambia specs, si el default)

## Decisiones de campo (2026-09-02, verificacion con datos reales)

7. **Directorio `/clientes` consulta la tabla `ventas`, no la vista.** La vista
   historial computa LAG sobre toda la tabla y no puede empujar el filtro
   `id_vendedor` (no es clave de particion del window) -> statement timeout.
   La tabla `ventas` tiene el indice `(id_vendedor, id_cliente)` y responde
   ~800-1600 ms. La ficha SI usa la vista (cliente+fecha permite push-down,
   ~1000 ms para 698-700 filas). Contrato en `src/lib/api/clientes.js`.
8. **Paginacion offset en todas las consultas** (limite 1000/request en
   PostgREST): vendedor 01178 tiene >2000 filas/anio. Loop `limit=1000&offset=N`
   con tope 20000 filas, en `clientes.js` y `aggregation.js`.
9. **Normalizacion de codigo de vendedor en el selector**: entrada de 1-3 digitos
   se expande a `01` + pad(3) (177 -> 01177, 144 -> 01144). Codigos con letras
   (01O01) se usan tal cual.
10. **Base path**: el usuario renombro el proyecto a `g360-ventas-pulse`
    (package.json + svelte.config.js). Respeta la eleccion del usuario sobre el
    nombre `/g360-ventas-cockpit` del plan original.
