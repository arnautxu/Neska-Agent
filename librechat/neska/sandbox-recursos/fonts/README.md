# Fonts for Neska slide decks

Downloaded by `../fetch_fonts_presentacions.py` from Fontsource (npm `@fontsource-variable/*` or
`@fontsource/*`, latin and latin-ext subsets only). Every family is under the SIL Open Font
License 1.1; each licence is in `OFL-<id>.txt` and `catalog.json` records the version used.

`build_recursos_presentacions.py` copies them, with `fonts.src.css`, into the sandbox resources
(`share/neska/fonts/` inside the Python package tree, step in build-codeapi.yml), so a deck costs nothing extra per call.
The fonts are embedded (subset) in the PDFs that `neska_pdf.py` writes, which the OFL allows.
