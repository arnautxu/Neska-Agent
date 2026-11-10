---
name: neska-excel
description: Llegeix, analitza, edita i crea fulls de càlcul Excel (.xlsx, .xls, .csv) conservant fórmules i format. Fes-la servir sempre que l'usuari pugi un Excel o un CSV, en demani un resum, vulgui canviar-lo, afegir-hi fórmules o gràfics, o en vulgui un de nou.
---

# Excel amb Neska

Treballa sempre amb l'eina d'executar codi. Els fitxers que puja l'usuari són a `/mnt/data/`.

```python
import sys; sys.path.insert(0, "/mnt/data/skills/neska-excel/scripts")
from neska_xlsx import describe, style_table, add_chart
print(describe("/mnt/data/<fitxer>.xlsx"))
```

## Llegir i analitzar

1. Comença sempre amb `describe(...)`: fulls, mida, capçaleres, quantes fórmules hi ha i unes files d'exemple.
2. Per calcular, fes servir `pandas` (`pd.read_excel(path, sheet_name=None)` per llegir tots els fulls). Per a CSV, prova `sep=None, engine="python"` si no saps el separador, i `decimal=","` si les xifres són en format català.
3. Respon amb la conclusió primer ("El client que més factura és…"), després la taula curta que ho demostra. Si fas un gràfic, desa'l com a PNG a `/mnt/data/` perquè es vegi al xat.
4. No inventis cap dada. Si una columna és ambigua, digues com l'has interpretada.

## Editar un Excel de l'usuari

- Obre'l amb `openpyxl.load_workbook(path)` (sense `data_only`) perquè les fórmules no es perdin. **No** el reescriguis amb pandas: perdria fórmules, formats i gràfics.
- Canvia només el que et demanen. Fórmules noves en català o anglès no importa: escriu-les en anglès (`=SUM(B2:B20)`), Excel les tradueix.
- Desa amb un nom nou (`<nom>-v2.xlsx`) i explica en una llista curta què has canviat (full, cel·les).

## Crear un Excel nou

- Una taula per full, capçalera a la fila 1, sense files ni columnes buides al davant.
- Fes servir fórmules d'Excel per als totals i càlculs (no posis els resultats a mà), perquè l'usuari els pugui tocar.
- Aplica l'estil Neska amb `style_table(ws, number_formats={"C": '#,##0.00 €', "D": '0.0%'})`.
- Gràfic natiu amb `add_chart(ws, "bar", "Títol", data_cols=(2, 3), cat_col=1, header_row=1, last_row=13)`.
- Desa a `/mnt/data/<nom-curt>.xlsx`. El fitxer apareix al xat per descarregar-lo.

## Formats habituals

Euros `#,##0.00 €` · Percentatge `0.0%` · Data `dd/mm/yyyy` · Milers `#,##0`
