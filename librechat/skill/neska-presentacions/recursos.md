# Recursos: com es criden

Obre aquest fitxer quan vagis a fer servir un recurs. Tot s'importa de `neska_pdf` i retorna un
SVG per posar dins l'HTML (o, `foto()`, una adreça per a `<img src>`). Els colors per defecte
són les variables de la presentació (`--accent`, `--ink`, `--line`…); sobre un fons de color,
passa'ls (`color="#fff"`, `rest="…"`). Si un nom no existeix, l'error en proposa de semblants.
Exemples de tot a `exemples/recursos.py`.

## Icones i banderes

```python
icon("bike", 240, "var(--accent)", 1.2)          # Lucide, traç 1.2 (en unitats de 24)
icon("tabler:beer", 200, "var(--ink)", 1.4)      # Tabler, traç
icon("tabler-ple:heart", 120, "var(--accent)")   # Tabler plena
icon("phosphor:leaf-thin", 200, "var(--ink)")    # Phosphor: -thin -light (res) -bold -fill -duotone
icones("beer")                                   # cerca per nom i etiqueta (en anglès) als tres jocs
bandera("fr", 96)                                # ISO; "es-ct" Catalunya, "eu" Unió Europea
bandera("jp", 96, vora="var(--line)")            # vora fina per a banderes blanques
```

## Mapes

```python
mapa("catalunya-comarques", destaca=["Segrià"], etiquetes=True)
mapa("europa", destaca=["ES", "FR"], punts=["Barcelona", "Lió"], rutes=[("Barcelona", "Lió")])
mapa("FR-grups", destaca=["Occitanie"])          # regions de qualsevol país: "IT", "US", "DE"…
mapa("espanya-autonomies", valors={"Catalunya": 31, "Madrid": 24})   # més fosc = més
mapa("mon", colors={"ES": "#c33", "MX": "#36c"}, width=1280, height=720)
mapa_noms("FR-grups")                            # noms que accepta
lloc("Tolosa")                                   # (lon, lat); accepta noms en català
```

Mapes: `mon`, `europa`, `espanya-autonomies`, `espanya-provincies`, `catalunya-provincies`,
`catalunya-comarques`, `catalunya-municipis`, i qualsevol codi de país (`FR`, `IT`, `PT`,
`US`…) amb les seves regions; `FR-grups` (i altres països on n'hi ha) les agrupa, p. ex.
departaments en regions. Opcions: `enfoca=[…]` enquadra unes regions i talla la resta per la
vora; `etiquetes=True|[…]|{regió: "text"}`; `punts=["Girona", (2.8, 41.98, "Fàbrica")]`;
`rutes=[(a, b), …]` i `ruta_color=`; `rest=`, `vora=`, `halo=` (color al voltant de les
etiquetes); `credit=False` si poses el crèdit a la nota (obligatori als d'Espanya i Catalunya).

## Gràfics

```python
bars(["2023", "2024"], [1840, 2410], highlight=1, ghost=None, unit="")
hbars(etiquetes, valors, highlight=0, unit=" t")                     # rànquings
line(etiquetes, {"Altitud": [...]}, area=True, marks={4: "340 m"})
share([("Préssec", 52), ("Poma", 21)], highlight=0)                   # 2-4 parts d'un 100 %
treemap([("Restaurants", 48), ("Botigues", 21), ...], unit=" %", destaca=0)
cascada(["2025", "Preus", "Clients perduts"], [410, 62, -38], unit=" k€", total="2026")
calendari([("Registre", 0, 3, True), ("Enviament", 6, 7)], ["Gen", "Feb", ...], avui=1.5)
embut(["Visites", "Cistella", "Compra"], [48000, 2900, 1160], destaca=1)
calor(files, columnes, valors, unit="")                              # valors[fila][columna]
interval(etiquetes, minims, maxims, punt=[...], unit=" €", destaca=0)
apilades(["2025", "2026"], {"Botiga": [140, 150], "Web": [70, 110]}, percent=False)
pendent(etiquetes, abans, despres, periodes=("2024", "2026"), destaca=0, unit=" %")
pictograma(7, 10, columnes=10, icona="apple", mida=72)               # icona amb joc: "tabler:user"
anell(68)                                                            # una part d'un total
minigrafic([1840, 2410, 3120])                                       # tendència al costat d'una xifra
```

Tots accepten `width=` (i `height=` o `fila=`); per defecte fan 1104 px, l'amplada útil.

## Textures i fotos

```python
trama(640, 720, "#2C7563", cel=18, direccio="esquerra")   # avall, amunt, dreta, esquerra, centre
foto("/mnt/data/<fitxer>", fosc="#123D2B", clar="#FFFFFF", estil="duotone")  # o "trama", "linies", "original"
```

`foto()` vol colors en hexadecimal (no `var()`). Fes-la servir com a `<img src="…">` o com a
`background: url('…') center/cover`.
