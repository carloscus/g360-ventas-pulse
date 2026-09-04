## Purpose

Montos netos comparados ano contra ano en una jerarquia navegable.

## ADDED Requirements

### Requirement: Monto neto por periodo
El sistema SHALL calcular el monto neto como la suma de `soles` de todas las
operaciones del vendedor en el rango (ventas positivas, notas de credito y
devoluciones negativas segun el ERP), sin aplicar calculos de signo propios.

#### Scenario: NC y devoluciones restan
- **WHEN** un cliente tiene ventas S/1000, NCs S/-100 y devoluciones S/-50
  en el rango
- **THEN** su neto es S/850

### Requirement: Comparativa de tres periodos alineados
El sistema SHALL mostrar por nodo de la jerarquia el neto del rango
seleccionado (A), del mismo rango desplazado -1 ano (B) y -2 anos (C), y la
variacion % de A vs B. Un periodo sin datos se muestra como "-" sin dividir
por cero.

#### Scenario: Enero 2026 vs 2025 vs 2024
- **WHEN** el rango es 01/01/2026-31/01/2026
- **THEN** las columnas B y C cubren 01/01/2025-31/01/2025 y
  01/01/2024-31/01/2024 respectivamente

### Requirement: Jerarquia colapsable cliente-linea-SKU
El sistema SHALL presentar la informacion como tabla jerarquica: clientes
ordenados por neto A descendente, colapsados por defecto; al expandir un
cliente se muestran sus lineas (ordenadas por neto), y al expandir una linea
sus SKUs. Cada nivel muestra neto A, B, C y variacion %.

#### Scenario: Expansion progresiva
- **WHEN** el vendedor toca un cliente de la tabla
- **THEN** se despliegan sus lineas; al tocar una linea se despliegan sus SKUs

#### Scenario: Rango sin ventas
- **WHEN** el rango A no tiene operaciones del vendedor
- **THEN** se muestra estado vacio con el rango indicado
