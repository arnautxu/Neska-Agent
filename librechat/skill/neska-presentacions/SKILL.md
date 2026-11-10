---
name: neska-presentacions
description: Crea presentacions de PowerPoint (.pptx) boniques i editables amb l'estil Neska. Fes-la servir sempre que l'usuari demani una presentació, unes diapositives, un deck, un pitch o un PowerPoint, o vulgui convertir un document o unes dades en diapositives.
---

# Presentacions Neska

Fes presentacions que semblin fetes per un bon dissenyador: poques paraules, molt d'aire, una idea per diapositiva.

## Com treballar

1. **Entén l'encàrrec.** Qui la veurà, per a què i quanta estona. Si falta una dada clau (per exemple, les xifres), pregunta-ho una sola vegada; si no, decideix tu i digues què has suposat.
2. **Escriu l'esquema abans de fer res.** Títol de cada diapositiva com una frase que digui la conclusió ("Les vendes han crescut un 38%"), no un tema ("Vendes"). Normalment 6-12 diapositives.
3. **Construeix-la amb `neska_deck.py`** dins l'eina d'executar codi:

```python
import sys; sys.path.insert(0, "/mnt/data/skills/neska-presentacions/scripts")
from neska_deck import Deck

d = Deck(title="Nom de la presentació")
d.cover("Títol gran", "Subtítol o data", kicker="Proposta")
d.section("01", "Primer bloc")
d.bullets("Una conclusió clara", ["Màxim 5 punts", "Frases curtes", "Sense punts finals"])
d.stat("+38%", "creixement de vendes", note="Font: …")
d.stats("Tres xifres", [("12", "clients nous"), ("4,2", "valoració"), ("98%", "a temps")])
d.chart("Vendes per mes", ["Gen", "Feb", "Mar"], {"2025": [10, 12, 9], "2026": [14, 15, 18]}, kind="bar")
d.table("Pressupost", [["Partida", "Import"], ["Disseny", "4.000 €"]])
d.two_columns("Abans i després", "Abans", ["…"], "Després", ["…"])
d.quote("Una frase potent.", "Qui ho diu")
d.closing("Gràcies", "contacte@empresa.cat")
d.save("/mnt/data/nom-presentacio.pptx")
```

   Tipus de gràfic: `bar`, `hbar`, `line`, `pie`. Són gràfics natius: l'usuari els pot editar a PowerPoint.
   Afegeix `notes="…"` a les diapositives importants amb el que l'usuari ha de dir en veu alta.
4. **Desa sempre a `/mnt/data/`** amb un nom curt en minúscules i guions. El fitxer apareix al xat per descarregar-lo i previsualitzar-lo.
5. **Respon breu:** què has fet, quantes diapositives i una línia sobre què pot canviar si vol.

## Regles d'estil (no les trenquis)

- Fons blanc, text gairebé negre, un sol color d'accent (marró Neska `#6B3A1E`). Si l'usuari dona colors de la seva marca, passa `accent=RGBColor(...)` a `Deck`.
- Màxim 5 punts per diapositiva i unes 12 paraules per punt. Si no hi cap, fes-ne dues.
- Cap imatge de recurs genèrica, cap ombra, cap degradat, cap WordArt.
- Les xifres importants van grans amb `stat` o `stats`, no enterrades en un punt.
- Escriu en la llengua de l'usuari (per defecte, català), amb majúscula només a l'inici.

## Si l'usuari puja una presentació per editar-la

Obre-la amb `python-pptx` (`Presentation("/mnt/data/<fitxer>.pptx")`), canvia només el que et demana, conserva el disseny original i desa-la amb un nom nou (`…-v2.pptx`).
