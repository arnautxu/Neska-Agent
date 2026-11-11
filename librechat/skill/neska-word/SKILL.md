---
name: neska-word
description: Crea i edita documents de Word (.docx) i PDF ben maquetats amb l'estil Neska. Fes-la servir quan l'usuari demani un informe, una proposta, una carta, un contracte o qualsevol document per descarregar, o pugi un Word per revisar-lo o canviar-lo.
---

# Documents Word amb Neska

Treballa amb l'eina d'executar codi. Els fitxers de l'usuari són a `/mnt/data/`.

## Llegir

- `.docx`: `from docx2python import docx2python; print(docx2python(path).text)` per al text, o `mammoth` si cal l'estructura en HTML.
- `.pdf`: `pdfminer.high_level.extract_text(path)`.
- Respon amb el resum o la resposta primer; cita la secció quan sigui útil.

## Crear un document nou (python-docx)

```python
from docx import Document
from docx.shared import Pt, RGBColor, Cm
doc = Document()
for s in doc.sections:
    s.left_margin = s.right_margin = Cm(2.5); s.top_margin = s.bottom_margin = Cm(2.2)
st = doc.styles["Normal"]; st.font.name = "Arial"; st.font.size = Pt(11)
st.font.color.rgb = RGBColor(0x16, 0x16, 0x16)
for name, size in (("Title", 28), ("Heading 1", 18), ("Heading 2", 14)):
    h = doc.styles[name]; h.font.name = "Georgia"; h.font.size = Pt(size)
    h.font.color.rgb = RGBColor(0x16, 0x16, 0x16); h.font.bold = False
doc.add_heading("Títol", level=0)
doc.add_paragraph("…")
doc.save("/mnt/data/nom-document.docx")
```

- Fes servir els estils de títol de Word (Heading 1, 2) perquè l'índex funcioni.
- Taules amb l'estil `"Light List"` o `"Table Grid"`, capçalera en negreta.
- El marró Neska `#6B3A1E` només per a detalls (un títol de secció, una línia), mai per al text llarg.
- Si l'usuari vol PDF, crea'l amb `reportlab` amb el mateix estil.

## Editar un Word de l'usuari

Obre'l amb `Document(path)`, canvia només el que et demanen conservant els estils existents, i desa'l com `<nom>-v2.docx`. Explica breument què has canviat.

## Sempre

Desa a `/mnt/data/` amb un nom curt en minúscules i guions; el fitxer apareix sol al xat per veure-ho i descarregar-lo (no escriguis la ruta a la resposta). Escriu en la llengua de l'usuari (per defecte, català).

## Fitxers de treball

A `/mnt/data/` només hi desa el fitxer final que l'usuari ha de rebre: tot el que hi ha allà li apareix al xat. Els scripts, proves i fitxers temporals van a `/tmp/`. A la resposta, no expliquis el procés ni diguis què no has pogut comprovar: dona el resultat.
