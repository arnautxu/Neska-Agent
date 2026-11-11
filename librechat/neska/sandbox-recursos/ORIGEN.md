# Recursos de les presentacions de Neska (sandbox)

Aquesta carpeta s'instal·la dins dels paquets del sandbox (`share/neska` a l'arbre de Python,
pas "Add the Neska deck resources" de `.github/workflows/build-codeapi.yml`). Cada feina la té
muntada en només lectura, així que no costa res per crida. No va dins de l'habilitat perquè els
fitxers d'una habilitat es tornen a pujar a cada crida i n'hi ha un límit (HTTP 431).
`scripts/neska_recursos.py` la troba a `sys.prefix/share/neska` (o a `NESKA_RECURSOS`).

No s'edita a mà: `librechat/neska/tools/fetch_fonts_presentacions.py` (fonts) i
`librechat/neska/tools/build_recursos_presentacions.py` (la resta).

| Fitxer | Què és | Origen i llicència |
| --- | --- | --- |
| `fonts/` | 56 famílies (latin i latin-ext), `fonts.css`, `catalog.json` | Fontsource; SIL OFL 1.1 (`fonts/OFL-*.txt`) |
| `icones/lucide.json` | 2.356 icones de traç | Lucide 1.72.0, ISC |
| `icones/tabler-*.json` | 5.233 de traç i 1.054 plenes | Tabler Icons 3.51.0, MIT |
| `icones/phosphor-*.json` | 1.512 icones en sis pesos | Phosphor Icons core 2.1.1, MIT |
| `banderes.json` | 271 banderes 4:3 | flag-icons 7.6.0, MIT |
| `mapes/mon.json`, `mapes/europa.json` | països, noms en català | Natural Earth via world-atlas 2.0.2, domini públic; noms CLDR |
| `mapes/espanya-*.json` | autonomies i províncies, Canàries en requadre | IGN/CNIG via es-atlas 0.6.0, CC BY 4.0 |
| `mapes/catalunya-*.json` | províncies, comarques i municipis | IGN/CNIG (CC BY 4.0) i codis de comarca d'Idescat |
| `mapes/regions/` | regions de primer nivell de 240 països (i agrupades) | Natural Earth 10m admin-1, domini públic |
| `llocs.json` | 8.000 ciutats i municipis amb coordenades, exònims catalans | Natural Earth populated places (domini públic), IGN/CNIG |

Les llicències MIT/ISC són a `LLICENCIES.txt`. Els mapes de l'IGN demanen citar la font:
`mapa()` hi posa "Mapa: IGN/CNIG (CC BY 4.0)" si no s'hi diu `credit=False`.
