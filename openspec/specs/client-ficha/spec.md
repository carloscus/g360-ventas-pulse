## Purpose

La ficha concentra el contexto comercial del cliente para preparar la visita:
historial por SKU, precios con contexto de atencion, stock y export.

## Requirements

### Requirement: Tabla por SKU de la ficha cliente
El sistema SHALL mostrar en `/ficha/[cliente]` la agregacion por SKU del
historial de ventas del cliente en los ultimos 12 meses (ventana fija, sin
selector de rango), con columnas: cantidad vendida (und y cajas), precio
ultimo / anterior / anterior2, NCs por descuento (monto y conteo),
devoluciones, saldo y disponibilidad de stock del SKU. Cada fila sera
expandible para mostrar como se atendio: ultima atencion (precio x cantidad,
fecha y numero de factura), rango de precios del periodo y detalle de NCs
(monto, fecha, documento).

#### Scenario: Fila expandida con contexto de atencion
- **WHEN** el vendedor toca una fila de la tabla
- **THEN** se muestra la ultima atencion con cantidad, fecha y factura, el
  rango min-max y las NCs de descuento con su documento

#### Scenario: Stock visible por SKU
- **WHEN** el snapshot de stock esta disponible
- **THEN** cada fila muestra su disponibilidad (o "-" si el SKU no existe en stock)

### Requirement: Resumen comercial de la ficha
El sistema SHALL encabezar la ficha con totales del periodo (ventas, NCs,
devoluciones), frecuencia de recompra promedio del cliente, evolucion mensual
y cross-sell (SKUs de las lineas del cliente comprados por clientes similares
que el no ha comprado).

#### Scenario: Frecuencia sin datos suficientes
- **WHEN** el cliente no tiene filas con cadencia confiable en la MV
- **THEN** la frecuencia se muestra como "s/d" sin bloquear la ficha

### Requirement: Comparativa de precios entre clientes
El sistema SHALL permitir, para un SKU del analisis anual, comparar el precio
unitario cobrado a cada cliente del vendedor (ultimo precio con cantidad y
factura, rango min-max, NCs por cliente), ordenado por ultimo precio
descendente y resaltando al cliente de la ficha.

#### Scenario: Volumen y precio visibles juntos
- **WHEN** el vendedor abre la comparativa de un SKU
- **THEN** ve por cliente: ultimo precio x cantidad con factura, rango y
  conteo de NCs, permitiendo identificar descuentos por volumen

### Requirement: Export xlsx de la ficha
El sistema SHALL exportar la ficha (hoja "Ficha SKU" agregada + hoja
"Historial" con headers ERP estandar para nc-sustentor) desde el boton XLSX
del header, bloqueado sin datos.

#### Scenario: Export con encabezados ERP
- **WHEN** se genera el export
- **THEN** la hoja Historial usa ANHO/CODIGO/FECHA/CANTIDAD/SOLES/NUMERO
  reconocibles por nc-sustentor
