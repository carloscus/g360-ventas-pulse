# Proposal: Modulo de montos netos con comparativa anual en jerarquia

## Why

El vendedor y su jefe directo necesitan responder "cuanto vendi realmente en
este rango vs el mismo rango del ano anterior y del antepenultimo", con detalle
por cliente, linea y SKU. Es el modulo de estadisticas del plan Asistente
Comercial (section 17) con el caso de uso concreto que pidio el equipo. El
selector de rango que sobra en la ficha tiene aqui su lugar natural.

## What Changes

- Nueva ruta `/netos`: tabla jerarquica colapsable cliente -> linea -> SKU.
- Comparativa de montos NETOS (suma de soles: venta + NC + devolucion, cuyos
  signos ya vienen correctos del ERP) en 3 periodos alineados:
  rango seleccionado (A), mismo rango -1 ano (B), mismo rango -2 anos (C),
  con variacion % A vs B por nivel.
- Selector Desde/Hasta con preset "mes en curso" por defecto; los 3 periodos
  se derivan automaticamente.
- Acceso desde el dashboard (accesos rapidos).

## Capabilities

### New Capabilities

- `netos-jerarquia`: montos netos comparados en 3 periodos anuales, en arbol
  colapsable cliente/linea/SKU.

### Modified Capabilities

- `dashboard-vendedor`: acceso rapido al modulo de netos.

## Impact

- **Codigo**: `src/lib/api/netos.js` (nuevo), `src/routes/netos/` (nueva),
  dashboard (boton de acceso).
- **Datos**: 3 consultas paginadas a `ventas` por vendedor+periodo (cache 4
  capas, misma clave por rango). Sin DDL.
- **Dependencias**: ninguna nueva.
