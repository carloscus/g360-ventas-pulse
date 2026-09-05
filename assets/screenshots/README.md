# Capturas para el manual PPTX

El generador `scripts/gen-manual-pptx.py` inserta automáticamente cada imagen
si existe con el nombre exacto indicado (encaje proporcional, sin distorsión).
Tamaño recomendado: captura móvil vertical recortada; el marco la escala.

Regenerar el deck (desde la raíz del proyecto):

```bash
python scripts/gen-manual-pptx.py
```

| Archivo | Qué capturar |
|---|---|
| `login.png` | Login con el código de vendedor escrito y teclado visible |
| `dashboard.png` | Hoy con la lista de clientes prioritarios |
| `radar.png` | Radar con 2-3 oportunidades y una marcada "En ruta" |
| `netos.png` | Netos con un cliente expandido (líneas y variación visibles) |
| `ficha-precios.png` | Ficha de PRIMAVERA con un SKU expandido (precio por año) |
| `ficha-comparativa.png` | Comparativa del SKU 77264 entre clientes (tu fila en negrita) |
| `xlsx-negociacion.png` | (opcional) El XLSX exportado abierto en Excel, hoja Negociación |

Datos de ejemplo sugeridos: vendedor 186, cliente PRIMAVERA (20600685796),
SKU 77264 PLUMON VINIFAN WONDER TIPS EST100.

Después de agregar o cambiar capturas, regenerar:
`python scripts/gen-manual-pptx.py` (desde la raíz del proyecto).
