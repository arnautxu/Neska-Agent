# Recursos gràfics de les presentacions

El sandbox no té internet, així que tot el que les presentacions poden fer servir viatja aquí.
Aquest fitxer diu d'on surt cada recurs (no es diu README perquè el sandbox no carrega bé
dos fitxers amb el mateix nom dins d'una habilitat).
Es genera amb `librechat/neska/tools/build_recursos_presentacions.py`; no s'edita a mà.

| Fitxer | Què és | Origen i llicència |
| --- | --- | --- |
| `icones.json`, `icones.txt` | 2.356 icones de traç (cos SVG i etiquetes) | Lucide 1.72.0, ISC (`LICENSE-lucide.txt`) |
| `mapes/mon.json` | països del món, noms en català | Natural Earth 1:110m via world-atlas 2.0.2, domini públic; noms de CLDR |
| `mapes/europa.json` | països d'Europa | Natural Earth 1:50m via world-atlas 2.0.2, domini públic |
| `mapes/espanya-*.json` | comunitats autònomes i províncies, Canàries en requadre | IGN/CNIG via es-atlas 0.6.0, CC BY 4.0 |
| `mapes/catalunya-*.json` | províncies, comarques i municipis | IGN/CNIG (CC BY 4.0), comarques agrupades amb el codi de comarca d'Idescat |

Els mapes de l'IGN demanen citar la font: `mapa()` hi posa "Mapa: IGN/CNIG (CC BY 4.0)" si no
s'hi diu `credit=False`, i llavors el crèdit ha d'anar a la nota de la diapositiva.

La foto de `exemples/foto-exemple.jpg` és de Wikimedia Commons, CC0
("Peach Orchard in Oasis, California 1 of 2").
