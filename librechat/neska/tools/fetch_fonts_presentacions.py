"""Downloads the OFL fonts for Neska decks from Fontsource (npm) into ../sandbox-recursos/fonts/.

    python3 fetch_fonts_presentacions.py

Each family comes from @fontsource-variable/<id> when a variable build exists (one file covers
every weight) and from @fontsource/<id> otherwise (one file per weight). Only the latin and
latin-ext subsets are kept. Writes fonts.css (url()s relative to that folder), one OFL
licence per family, and catalog.json (family, voice, weights) for the type specimen and the
skill reference. The workflow build-codeapi.yml ships that folder inside the sandbox packages.
"""

import io
import json
import os
import re
import tarfile
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "sandbox-recursos", "fonts")

# id, css family name, group, voice (Catalan, for the agent)
FAMILIES = [
    # serifs for titles
    ("fraunces", "Fraunces", "serif", "serif \"old style\" amb molt de caràcter, càlida i una mica estranya; de 100 a 900"),
    ("gloock", "Gloock", "serif", "serif de contrast alt, de revista o de luxe"),
    ("young-serif", "Young Serif", "serif", "serif robusta i càlida (la de Neska)"),
    ("instrument-serif", "Instrument Serif", "serif", "serif editorial fina, amb cursiva; molt vista, fes-la servir amb raó"),
    ("dm-serif-display", "DM Serif Display", "serif", "serif de titular, rodona i elegant"),
    ("bodoni-moda", "Bodoni Moda", "serif", "Bodoni: moda, perfumeria, cultura; contrast extrem"),
    ("libre-caslon-display", "Libre Caslon Display", "serif", "Caslon clàssica, de llibre antic i institucions"),
    ("abril-fatface", "Abril Fatface", "serif", "serif negríssima de cartell, molt expressiva"),
    ("newsreader", "Newsreader", "serif", "serif de diari, per a text llarg i titulars sobris"),
    ("literata", "Literata", "serif", "serif de lectura, amable i sòlida"),
    ("source-serif-4", "Source Serif 4", "serif", "serif neutra i molt llegible"),
    ("spectral", "Spectral", "serif", "serif fina i literària"),
    ("ibm-plex-serif", "IBM Plex Serif", "serif", "serif tècnica, d'enginyeria"),
    ("zilla-slab", "Zilla Slab", "slab", "egípcia moderna, de premsa i cartell"),
    ("roboto-slab", "Roboto Slab", "slab", "egípcia neutra"),
    ("alfa-slab-one", "Alfa Slab One", "slab", "egípcia negríssima, de rètol de botiga o de fira"),
    ("bree-serif", "Bree Serif", "slab", "serif amable i informal"),
    # sans for titles or text
    ("instrument-sans", "Instrument Sans", "sans", "sans neta, de text"),
    ("schibsted-grotesk", "Schibsted Grotesk", "sans", "grotesca de diari, clara; text"),
    ("archivo", "Archivo", "sans", "sans de treball, sòlida; de 100 a 900 i d'estreta a ampla"),
    ("bricolage-grotesque", "Bricolage Grotesque", "sans", "grotesca amb personalitat i calidesa; de 200 a 800"),
    ("familjen-grotesk", "Familjen Grotesk", "sans", "grotesca escandinava, amb gràcia"),
    ("hanken-grotesk", "Hanken Grotesk", "sans", "grotesca neta i lleugerament geomètrica"),
    ("figtree", "Figtree", "sans", "geomètrica amable i clara"),
    ("manrope", "Manrope", "sans", "sans tècnica i moderna"),
    ("epilogue", "Epilogue", "sans", "grotesca amb punta editorial; molt bona negra"),
    ("public-sans", "Public Sans", "sans", "sans institucional i neutra (administració)"),
    ("work-sans", "Work Sans", "sans", "grotesca ampla, de cartell en negreta"),
    ("ibm-plex-sans", "IBM Plex Sans", "sans", "sans d'enginyeria i tecnologia"),
    ("ibm-plex-sans-condensed", "IBM Plex Sans Condensed", "condensed", "Plex estreta, per a taules denses"),
    ("sora", "Sora", "sans", "geomètrica ampla, de producte digital"),
    ("outfit", "Outfit", "sans", "geomètrica rodona, de marca jove"),
    ("red-hat-display", "Red Hat Display", "sans", "grotesca de titular amb caràcter"),
    ("onest", "Onest", "sans", "sans neutra i molt llegible"),
    ("inter-tight", "Inter Tight", "sans", "la sans neutra per excel·lència; és el clixé de la IA, evita-la si no hi ha raó"),
    ("geist", "Geist", "sans", "sans tecnològica neta"),
    # display and condensed
    ("big-shoulders-display", "Big Shoulders Display", "condensed", "condensada de rètol i senyal; contundent"),
    ("anton", "Anton", "condensed", "condensada negríssima, de cartell"),
    ("bebas-neue", "Bebas Neue", "condensed", "condensada de majúscules, d'esport i d'esdeveniment"),
    ("oswald", "Oswald", "condensed", "condensada clàssica de titular"),
    ("barlow-condensed", "Barlow Condensed", "condensed", "condensada de senyalística i transport"),
    ("archivo-black", "Archivo Black", "display", "grotesca negríssima, de titular rotund"),
    ("unbounded", "Unbounded", "display", "ampla i rodona, d'etiqueta o de marca jove"),
    ("syne", "Syne", "display", "ampla i estranya, d'art i cultura; de 400 a 800"),
    ("dela-gothic-one", "Dela Gothic One", "display", "negríssima i compacta, de manga o de música"),
    ("climate-crisis", "Climate Crisis", "display", "negra extrema que es fon; només per a xifres i paraules soles"),
    ("bowlby-one", "Bowlby One", "display", "negríssima i rodona, de rètol retro"),
    ("rubik-mono-one", "Rubik Mono One", "display", "majúscules gruixudes i quadrades, de joc o de festival"),
    # mono, hand, pixel
    ("ibm-plex-mono", "IBM Plex Mono", "mono", "mono per a xifres, codi i noms de fitxer (mai per fer \"tecnològic\")"),
    ("jetbrains-mono", "JetBrains Mono", "mono", "mono clara per a dades i codi"),
    ("dm-mono", "DM Mono", "mono", "mono suau"),
    ("space-mono", "Space Mono", "mono", "mono amb caràcter retro"),
    ("caveat", "Caveat", "hand", "lletra de mà per a anotacions curtes sobre un gràfic; mai per a títols"),
    ("silkscreen", "Silkscreen", "pixel", "píxel per a etiquetes petites, toc retro"),
    ("pixelify-sans", "Pixelify Sans", "pixel", "píxel llegible, toc retro de Neska"),
]

SUBSETS = ("latin", "latin-ext")
# Every family must have the Catalan middle dot (l·l), « », € and ’; Caprasimo was dropped for
# lacking "·".
FACE = re.compile(r"@font-face\s*{([^}]*)}", re.S)


def fetch(pkg):
    meta = json.load(urllib.request.urlopen(f"https://registry.npmjs.org/{pkg}/latest"))
    data = urllib.request.urlopen(meta["dist"]["tarball"]).read()
    return meta["version"], tarfile.open(fileobj=io.BytesIO(data))


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".woff2") or f.startswith("OFL-"):
            os.remove(os.path.join(OUT, f))
    css, catalog = [], []
    for fid, family, group, voice in FAMILIES:
        try:
            version, tar = fetch(f"@fontsource-variable/{fid}")
            variable, sheets = True, ["wght.css", "wght-italic.css"]
            if "package/wght.css" not in tar.getnames():  # variable on another axis only
                raise LookupError
        except Exception:
            version, tar = fetch(f"@fontsource/{fid}")
            variable = False
            sheets = [m.name.split("/", 1)[1] for m in tar.getmembers()
                      if re.fullmatch(r"package/\d{3}(-italic)?\.css", m.name)]
        names = {m.name: m for m in tar.getmembers()}
        weights, italic = set(), False
        for sheet in sheets:
            m = names.get("package/" + sheet)
            if not m:
                continue
            text = tar.extractfile(m).read().decode()
            for block in FACE.findall(text):
                url = re.search(r"url\(\./files/([^)]+\.woff2)\)", block).group(1)
                if not any(f"-{s}-" in url for s in SUBSETS) or "-latin-ext-" not in url and "-latin-" not in url:
                    continue
                if not re.search(r"-(latin|latin-ext)-(\d{3}|wght)-", url):
                    continue
                open(os.path.join(OUT, url), "wb").write(tar.extractfile(names["package/files/" + url]).read())
                weight = re.search(r"font-weight:\s*([\d ]+);", block).group(1).strip()
                style = re.search(r"font-style:\s*(\w+);", block).group(1)
                rng = re.search(r"unicode-range:\s*([^;]+);", block).group(1)
                italic = italic or style == "italic"
                weights.add(weight)
                css.append(f'@font-face {{ font-family: "{family}"; src: url("{url}") format("woff2"); '
                           f"font-weight: {weight}; font-style: {style}; unicode-range: {rng}; }}")
        lic = names.get("package/LICENSE")
        if lic:
            open(os.path.join(OUT, f"OFL-{fid}.txt"), "wb").write(tar.extractfile(lic).read())
        catalog.append({"family": family, "group": group, "voice": voice, "variable": variable,
                        "weights": sorted(weights), "italic": italic, "source": f"{fid}@{version}"})
        print(family, "variable" if variable else "static", sorted(weights))
    open(os.path.join(OUT, "fonts.css"), "w", encoding="utf-8").write(
        "/* Generated by fetch_fonts_presentacions.py from Fontsource. */\n" + "\n".join(css) + "\n")
    json.dump(catalog, open(os.path.join(OUT, "catalog.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
