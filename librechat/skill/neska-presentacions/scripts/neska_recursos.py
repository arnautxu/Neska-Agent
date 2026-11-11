"""Graphic resources for Neska decks: icons, maps, pictograms and photo treatments.

Everything here works offline: the sandbox has no network, so the icons (Lucide, ISC) and the
maps (Natural Earth, IGN/CNIG, Idescat) are packed in ../recursos. Each function returns an
inline SVG string (or, for photos, a file:// URL) that goes straight into the deck's HTML.
Colours default to the deck's CSS variables, like the charts in neska_pdf.
"""

from __future__ import annotations

import difflib
import html as _html
import json
import math
import os
import unicodedata

RES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recursos")
_ICONS = None
_MAPS: dict = {}


def _esc(t) -> str:
    return _html.escape(str(t), quote=True)


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return " ".join(s.replace("-", " ").replace("'", " ").split())


# ---------------------------------------------------------------- icons
def _icons():
    global _ICONS
    if _ICONS is None:
        _ICONS = json.load(open(os.path.join(RES, "icones.json"), encoding="utf-8"))
    return _ICONS


def icones(cerca: str, n: int = 20) -> list[str]:
    """Icon names whose name or English tags match `cerca` (e.g. icones("bike"))."""
    data, q = _icons(), _norm(cerca)
    hits = [k for k in data["icons"] if q in k.replace("-", " ")]
    hits += [k for k, tags in data["tags"].items() if k not in hits and any(q in _norm(t) for t in tags)]
    return hits[:n]


def icon(nom: str, size: int = 48, color: str = "currentColor", stroke: float = 2,
         fill: str = "none") -> str:
    """A Lucide icon as inline SVG. `stroke` is in icon units (24-unit box): 2 is the standard
    weight; at big sizes use 1-1.5 so the line stays elegant. All icons in a deck share one
    stroke. Names: recursos/icones.txt, or icones("cerca")."""
    data = _icons()["icons"]
    if nom not in data:
        near = difflib.get_close_matches(nom, list(data), n=6) or icones(nom, 6)
        raise ValueError(f"No hi ha la icona '{nom}'. Potser: {', '.join(near)}")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" '
            f'style="fill:{fill};stroke:{color};stroke-width:{stroke};stroke-linecap:round;'
            f'stroke-linejoin:round">{data[nom]}</svg>')


# ---------------------------------------------------------------- maps
MAPES = {
    "mon": "Món, països (noms en català, codi ISO: ES, FR…)",
    "europa": "Europa, països (noms en català, codi ISO)",
    "espanya-autonomies": "Espanya, comunitats autònomes (Canàries en requadre)",
    "espanya-provincies": "Espanya, províncies (Canàries en requadre)",
    "catalunya-provincies": "Catalunya, províncies",
    "catalunya-comarques": "Catalunya, 43 comarques",
    "catalunya-municipis": "Catalunya, municipis",
}


def _map(nom):
    if nom not in MAPES:
        raise ValueError(f"No hi ha el mapa '{nom}'. Mapes: {', '.join(MAPES)}")
    if nom not in _MAPS:
        _MAPS[nom] = json.load(open(os.path.join(RES, "mapes", nom + ".json"), encoding="utf-8"))
    return _MAPS[nom]


def mapa_noms(nom: str) -> list[str]:
    """Names of the regions in a map, to pass to mapa()."""
    return sorted(f["name"] for f in _map(nom)["features"])


def _find(m, key):
    k = _norm(key)
    for f in m["features"]:
        if k in (_norm(f["id"]), _norm(f["name"])) or k in [_norm(a) for a in f.get("aka", [])]:
            return f
    near = difflib.get_close_matches(str(key), [f["name"] for f in m["features"]], n=5)
    raise ValueError(f"'{key}' no és al mapa. Potser: {', '.join(near) or 'mira mapa_noms()'}")


def _projector(kind, lat0=40.0):
    if kind == "equal-earth":
        a1, a2, a3, a4 = 1.340264, -0.081106, 0.000893, 0.003796
        m = math.sqrt(3) / 2

        def p(lon, lat):
            th = math.asin(m * math.sin(math.radians(lat)))
            t2 = th * th
            t6 = t2 * t2 * t2
            x = 2 * math.sqrt(3) * math.radians(lon) * math.cos(th) / (
                3 * (9 * a4 * t6 * t2 + 7 * a3 * t6 + 3 * a2 * t2 + a1))
            y = th * (a4 * 9 * t6 * t2 / 9 + a3 * t6 + a2 * t2 + a1)
            return x, -y
        return p
    if kind == "laea-europe":
        l0, p0 = math.radians(10), math.radians(52)

        def p(lon, lat):
            la, ph = math.radians(lon), math.radians(lat)
            k = math.sqrt(2 / (1 + math.sin(p0) * math.sin(ph) + math.cos(p0) * math.cos(ph) * math.cos(la - l0)))
            x = k * math.cos(ph) * math.sin(la - l0)
            y = k * (math.cos(p0) * math.sin(ph) - math.sin(p0) * math.cos(ph) * math.cos(la - l0))
            return x, -y
        return p
    c = math.cos(math.radians(lat0))
    return lambda lon, lat: (lon * c, -lat)


def _label(x, y, text, size, ink, halo, anchor):
    """Map label: ink text over a halo of the map's border colour, readable on any region."""
    t = _esc(text)
    common = f'x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}"'
    return (f'<text {common} style="font-size:{size}px;font-weight:600;fill:none;stroke:{halo};'
            f'stroke-width:{size * 0.28:.1f};stroke-linejoin:round">{t}</text>'
            f'<text {common} style="font-size:{size}px;font-weight:600;fill:{ink}">{t}</text>')


def mapa(nom: str, destaca=None, colors: dict | None = None, valors: dict | None = None,
         etiquetes=None, punts=None, enfoca=None, width: int = 1104, height: int = 560,
         color: str = "var(--accent)", rest: str = "var(--tint)", vora: str = "var(--paper)",
         ink: str = "var(--ink)", muted: str = "var(--muted)", font: str = "var(--text)",
         halo: str = "var(--paper)", gruix: float = 1.2, credit: bool = True,
         label_size: int = 20) -> str:
    """A map as inline SVG, fitted to width x height.

    destaca   regions filled with `color` (names or codes: ["Segrià"], ["ES", "FR"])
    colors    {region: css colour} for a palette map
    valors    {region: number} for a choropleth: one hue, darker = more
    etiquetes True (label every coloured region), a list of regions, or {region: "text"}
    punts     [(lon, lat, "label"), ...] for cities or sites
    enfoca    regions to frame (the rest is drawn around, cut by the edge). Without it the map
              frames the coloured regions if they are few, else the whole map
    halo      colour around labels so they read over any region (default the paper)
    credit    draws the data credit (IGN maps are CC BY: keep it, or put it in the slide note)
    """
    m = _map(nom)
    feats = m["features"]
    fill = {}
    alpha = {}
    for k in destaca or []:
        fill[_find(m, k)["id"]] = color
    for k, c in (colors or {}).items():
        fill[_find(m, k)["id"]] = c
    if valors:
        lo, hi = min(valors.values()), max(valors.values())
        for k, v in valors.items():
            f = _find(m, k)
            fill[f["id"]] = color
            alpha[f["id"]] = 0.2 + 0.8 * ((v - lo) / (hi - lo) if hi > lo else 1)

    frame = [_find(m, k) for k in enfoca] if enfoca else None
    if frame is None and 0 < len(fill) <= 6 and nom.startswith(("mon", "europa")):
        frame = [f for f in feats if f["id"] in fill]
    frame = frame or feats

    lat_pts = [pt[1] for f in frame for r in f["r"] for pt in r]
    proj = _projector(m["projection"], (min(lat_pts) + max(lat_pts)) / 2)
    xs, ys = [], []
    for f in frame:
        for r in f["r"]:
            for lon, lat in r:
                x, y = proj(lon, lat)
                xs.append(x)
                ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    pad = 0.06 if enfoca or frame is not feats else 0.01
    dx, dy = (x1 - x0) or 1, (y1 - y0) or 1
    x0, x1, y0, y1 = x0 - dx * pad, x1 + dx * pad, y0 - dy * pad, y1 + dy * pad
    s = min(width / (x1 - x0), height / (y1 - y0))
    ox = (width - (x1 - x0) * s) / 2 - x0 * s
    oy = (height - (y1 - y0) * s) / 2 - y0 * s

    def P(lon, lat):
        x, y = proj(lon, lat)
        return x * s + ox, y * s + oy

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}" style="font-family:{font};overflow:hidden">']
    labels = []
    for f in feats:
        d = []
        for r in f["r"]:
            pts = [P(lon, lat) for lon, lat in r]
            d.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z")
        path = "".join(d)
        base = f'<path d="{path}" style="fill:{rest};stroke:{vora};stroke-width:{gruix};stroke-linejoin:round"/>'
        out.append(base)
        if f["id"] in fill:
            op = alpha.get(f["id"], 1)
            out.append(f'<path d="{path}" style="fill:{fill[f["id"]]};fill-opacity:{op:.2f};'
                       f'stroke:{vora};stroke-width:{gruix};stroke-linejoin:round"/>')
    if "inset" in m:
        a, b = m["inset"]["lon"], m["inset"]["lat"]
        (ax, ay), (bx, by) = P(a[0], b[1]), P(a[1], b[0])
        out.append(f'<path d="M{ax:.1f},{ay:.1f}L{bx:.1f},{ay:.1f}L{bx:.1f},{by:.1f}" '
                   f'style="stroke:{muted};stroke-width:1;fill:none"/>')

    if etiquetes is True:
        want = {fid: None for fid in fill}
    elif isinstance(etiquetes, dict):
        want = {_find(m, k)["id"]: v for k, v in etiquetes.items()}
    else:
        want = {_find(m, k)["id"]: None for k in (etiquetes or [])}
    for f in feats:
        if f["id"] in want:
            x, y = P(*f["c"])
            if 0 <= x <= width and 0 <= y <= height:
                labels.append(_label(x, y + label_size * 0.35, want[f["id"]] or f["name"], label_size,
                                     ink, halo, "middle"))
    for lon, lat, *lab in punts or []:
        x, y = P(lon, lat)
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" style="fill:{ink};stroke:{vora};stroke-width:3"/>')
        if lab:
            labels.append(_label(x + 14, y + 7, lab[0], label_size, ink, halo, "start"))
    out += labels
    if credit and "IGN" in m["credit"]:
        out.append(f'<text x="{width - 4}" y="{height - 6}" text-anchor="end" style="font-size:14px;'
                   f'fill:{muted}">Mapa: {_esc(m["credit"])}</text>')
    out.append("</svg>")
    return "".join(out)


# ---------------------------------------------------------------- pictograms and small charts
def pictograma(valor: float, total: int = 100, columnes: int = 10, icona: str | None = None,
               mida: int = 40, gap: int = 10, color: str = "var(--accent)",
               rest: str = "var(--line)", stroke: float = 2) -> str:
    """A unit chart: `total` squares (or icons) with the first `valor` filled, e.g.
    pictograma(7, 10, columnes=10, icona="apple", mida=72) for "7 de cada 10"."""
    rows = math.ceil(total / columnes)
    w, h = columnes * mida + (columnes - 1) * gap, rows * mida + (rows - 1) * gap
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">']
    paths = _icons()["icons"][icona] if icona else None
    if icona and paths is None:
        icon(icona)  # raises with suggestions
    for i in range(total):
        x, y = (i % columnes) * (mida + gap), (i // columnes) * (mida + gap)
        c = color if i < round(valor) else rest
        if paths:
            k = mida / 24
            out.append(f'<g transform="translate({x},{y}) scale({k:.3f})" style="fill:none;stroke:{c};'
                       f'stroke-width:{stroke};stroke-linecap:round;stroke-linejoin:round">{paths}</g>')
        else:
            out.append(f'<rect x="{x}" y="{y}" width="{mida}" height="{mida}" style="fill:{c}"/>')
    out.append("</svg>")
    return "".join(out)


def anell(valor: float, maxim: float = 100, mida: int = 320, gruix: int = 32, text: str | None = None,
          color: str = "var(--accent)", rest: str = "var(--line)", ink: str = "var(--ink)",
          font: str = "var(--display)", pes: int = 700) -> str:
    """A progress ring for one share of a whole ("68 % de l'objectiu"). Not for several parts:
    use share() for that. `text` defaults to the percentage."""
    r = (mida - gruix) / 2
    c = mida / 2
    frac = max(0.0, min(1.0, valor / maxim))
    a = 2 * math.pi * frac - math.pi / 2
    x, y = c + r * math.cos(a), c + r * math.sin(a)
    big = 1 if frac > 0.5 else 0
    label = text if text is not None else f"{round(100 * frac)} %"
    arc = (f'<circle cx="{c}" cy="{c}" r="{r}" style="fill:none;stroke:{color};stroke-width:{gruix}"/>'
           if frac >= 0.999 else
           f'<path d="M{c},{c - r} A{r},{r} 0 {big} 1 {x:.2f},{y:.2f}" style="fill:none;stroke:{color};'
           f'stroke-width:{gruix};stroke-linecap:butt"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{mida}" height="{mida}" viewBox="0 0 {mida} {mida}">'
            f'<circle cx="{c}" cy="{c}" r="{r}" style="fill:none;stroke:{rest};stroke-width:{gruix}"/>{arc}'
            f'<text x="{c}" y="{c + mida * 0.07:.1f}" text-anchor="middle" style="font-family:{font};'
            f'font-size:{mida * 0.2:.0f}px;font-weight:{pes};fill:{ink}">{_esc(label)}</text></svg>')


def minigrafic(valors, width: int = 260, height: int = 72, color: str = "var(--accent)",
               rest: str = "var(--muted)", gruix: float = 3) -> str:
    """A sparkline: the trend beside a figure, without axes. The last point is marked."""
    lo, hi = min(valors), max(valors)
    n = len(valors)
    pts = [(6 + (width - 12) * i / max(n - 1, 1), height - 6 - (height - 12) * ((v - lo) / ((hi - lo) or 1)))
           for i, v in enumerate(valors)]
    d = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    x, y = pts[-1]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
            f'<path d="{d}" style="fill:none;stroke:{rest};stroke-width:{gruix};stroke-linejoin:round;'
            f'stroke-linecap:round"/><circle cx="{x:.1f}" cy="{y:.1f}" r="{gruix * 2}" style="fill:{color}"/></svg>')


def pendent(etiquetes, abans, despres, periodes=("Abans", "Ara"), destaca=None, unit: str = "",
            width: int = 720, height: int = 440, color: str = "var(--accent)", rest: str = "var(--line)",
            ink: str = "var(--ink)", muted: str = "var(--muted)", font: str = "var(--text)") -> str:
    """A slope chart: how each item moved between two moments. `destaca` = index or list of
    indexes drawn in `color`; the rest stay quiet."""
    from neska_pdf import _fmt
    hi = set([destaca] if isinstance(destaca, int) else destaca or [])
    vals = list(abans) + list(despres)
    lo, top = min(vals), max(vals)
    lx, rx, t, b = 150, width - 260, 56, height - 24

    def Y(v):
        return b - (b - t) * ((v - lo) / ((top - lo) or 1))
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}" style="font-family:{font}">',
           f'<text x="{lx}" y="24" text-anchor="middle" style="font-size:20px;fill:{muted}">{_esc(periodes[0])}</text>',
           f'<text x="{rx}" y="24" text-anchor="middle" style="font-size:20px;fill:{muted}">{_esc(periodes[1])}</text>']
    order = sorted(range(len(etiquetes)), key=lambda i: i in hi)
    for i in order:
        on = i in hi
        c = color if on else rest
        y1, y2 = Y(abans[i]), Y(despres[i])
        out.append(f'<path d="M{lx},{y1:.1f}L{rx},{y2:.1f}" style="stroke:{c};stroke-width:{5 if on else 3};fill:none"/>')
        for x, y in ((lx, y1), (rx, y2)):
            out.append(f'<circle cx="{x}" cy="{y:.1f}" r="{8 if on else 6}" style="fill:{c}"/>')
        tc = ink if on else muted
        w = 700 if on else 400
        out.append(f'<text x="{lx - 18}" y="{y1 + 7:.1f}" text-anchor="end" style="font-size:20px;'
                   f'font-weight:{w};fill:{tc}">{_esc(_fmt(abans[i], unit))}</text>')
        out.append(f'<text x="{rx + 18}" y="{y2 + 7:.1f}" style="font-size:20px;font-weight:{w};fill:{tc}">'
                   f'{_esc(_fmt(despres[i], unit))} · {_esc(etiquetes[i])}</text>')
    out.append("</svg>")
    return "".join(out)


def trama(width: int, height: int, color: str = "var(--accent)", cel: int = 16,
          direccio: str = "avall", max_r: float | None = None) -> str:
    """A halftone dot field that fades in one direction ("avall", "amunt", "dreta",
    "esquerra", "centre"). A texture for covers or a colour half; never behind text."""
    max_r = max_r or cel * 0.48
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}"><g style="fill:{color}">']
    cols, rows = int(width / cel) + 1, int(height / cel) + 1
    for j in range(rows):
        for i in range(cols):
            x, y = i * cel + (cel / 2 if j % 2 else 0), j * cel
            u, v = x / width, y / height
            t = {"avall": v, "amunt": 1 - v, "dreta": u, "esquerra": 1 - u,
                 "centre": 1 - min(1, math.hypot(u - 0.5, v - 0.5) * 2)}[direccio]
            r = max_r * t
            if r > 0.6:
                out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}"/>')
    out.append("</g></svg>")
    return "".join(out)


# ---------------------------------------------------------------- photos
def foto(path: str, fosc: str = "#161616", clar: str = "#FFFFFF", estil: str = "duotone",
         amplada: int = 1600, cel: int = 10, contrast: float = 1.25) -> str:
    """Treats a photo the user uploaded so it belongs to the deck's world. Returns a file://
    URL for <img src> or a CSS background. Colours must be hex (not var()).

    estil  "duotone" (dark to light ramp), "trama" (halftone dots in `fosc` over `clar`),
           "linies" (horizontal line screen), "original" (only resized)
    """
    from PIL import Image, ImageDraw, ImageEnhance, ImageOps
    src = path[7:] if path.startswith("file://") else path
    im = Image.open(src)
    im = ImageOps.exif_transpose(im).convert("RGB")
    if im.width > amplada:
        im = im.resize((amplada, round(im.height * amplada / im.width)), Image.LANCZOS)
    base, ext = os.path.splitext(os.path.basename(src))
    out = f"/tmp/neska-foto-{base}-{estil}.png"
    if estil == "original":
        im.save(out)
        return "file://" + out
    g = ImageEnhance.Contrast(ImageOps.grayscale(im)).enhance(contrast)
    if estil == "duotone":
        ImageOps.colorize(g, black=fosc, white=clar).save(out)
        return "file://" + out
    canvas = Image.new("RGB", g.size, clar)
    d = ImageDraw.Draw(canvas)
    px = g.load()
    for y in range(0, g.height, cel):
        for x in range(0, g.width, cel):
            dark = 1 - px[min(x + cel // 2, g.width - 1), min(y + cel // 2, g.height - 1)] / 255
            if estil == "trama":
                r = cel * 0.72 * math.sqrt(dark)
                if r > 0.4:
                    cx, cy = x + cel / 2, y + cel / 2
                    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fosc)
            else:
                h = cel * 0.9 * dark
                if h > 0.4:
                    cy = y + cel / 2
                    d.rectangle([x, cy - h / 2, x + cel, cy + h / 2], fill=fosc)
    canvas.save(out)
    return "file://" + out
