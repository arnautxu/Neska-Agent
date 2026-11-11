"""Graphic resources for Neska decks: icons, flags, maps, places, charts and photo treatments.

The sandbox has no network, so the heavy resources (fonts, three icon sets, flags, maps,
a gazetteer) are installed with the sandbox packages, in share/neska under the Python prefix,
and mounted read-only in every job. They are built by librechat/neska/tools/. Each function
returns an inline SVG string (or, for photos, a file:// URL) that goes straight into the
deck's HTML. Colours default to the deck's CSS variables, like the charts in neska_pdf.
"""

from __future__ import annotations

import difflib
import html as _html
import json
import math
import os
import sys
import unicodedata


def _find_res():
    here = os.path.dirname(os.path.abspath(__file__))
    for cand in (os.environ.get("NESKA_RECURSOS"), os.path.join(sys.prefix, "share", "neska"),
                 os.path.join(here, "..", "recursos")):
        if cand and os.path.isfile(os.path.join(cand, "fonts", "fonts.css")):
            return cand
    raise RuntimeError("No trobo els recursos de Neska (share/neska als paquets del sandbox).")


RES = _find_res()
_CACHE: dict = {}


def _load(*path):
    key = "/".join(path)
    if key not in _CACHE:
        _CACHE[key] = json.load(open(os.path.join(RES, *path), encoding="utf-8"))
    return _CACHE[key]


def _esc(t) -> str:
    return _html.escape(str(t), quote=True)


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return " ".join(s.replace("-", " ").replace("'", " ").replace("·", "").split())


# ---------------------------------------------------------------- icons
JOCS = {
    "lucide": "lucide.json",                # 2.356, traç, net i neutre
    "tabler": "tabler-outline.json",        # 5.233, traç, el catàleg més gran
    "tabler-ple": "tabler-filled.json",     # 1.054, plenes
    "phosphor": "phosphor-regular.json",    # 1.512 per pes, amb més caràcter
    "phosphor-thin": "phosphor-thin.json",
    "phosphor-light": "phosphor-light.json",
    "phosphor-bold": "phosphor-bold.json",
    "phosphor-fill": "phosphor-fill.json",
    "phosphor-duotone": "phosphor-duotone.json",
}


def _set(joc):
    if joc not in JOCS:
        raise ValueError(f"No hi ha el joc d'icones '{joc}'. Jocs: {', '.join(JOCS)}")
    return _load("icones", JOCS[joc])


def icones(cerca: str, joc: str | None = None, n: int = 24) -> list[str]:
    """Icon names whose name or English tags match `cerca`, as "joc:nom" when no set is given
    (e.g. icones("beer") -> ["lucide:beer", "tabler:beer", "phosphor:beer-bottle", ...])."""
    q = _norm(cerca)
    out = []
    for j in ([joc] if joc else ["lucide", "tabler", "phosphor"]):
        data = _set(j)
        hits = [k for k in data["icons"] if q in k.replace("-", " ")]
        hits += [k for k, tags in data.get("tags", {}).items() if k not in hits and any(q in _norm(t) for t in tags)]
        out += [h if joc else f"{j}:{h}" for h in hits[: n // (1 if joc else 2)]]
    return out[:n]


def _icon_parts(nom: str, joc: str):
    if ":" in nom:
        joc, nom = nom.split(":", 1)
        if joc == "phosphor" and "-" in nom and nom.rsplit("-", 1)[1] in ("thin", "light", "bold", "fill", "duotone"):
            nom, w = nom.rsplit("-", 1)
            joc = f"phosphor-{w}"
    data = _set(joc)
    if nom not in data["icons"]:
        near = difflib.get_close_matches(nom, list(data["icons"]), n=6) or icones(nom, joc, 6)
        raise ValueError(f"No hi ha la icona '{nom}' a {joc}. Potser: {', '.join(near)}")
    return data, data["icons"][nom]


def _icon_group(data, body, color, stroke, k=1.0, x=0.0, y=0.0):
    body = body.replace("currentColor", color)
    tr = f'transform="translate({x:.2f},{y:.2f}) scale({k:.4f})" ' if (k != 1 or x or y) else ""
    if data["kind"] == "stroke":
        return (f'<g {tr}style="fill:none;stroke:{color};stroke-width:{stroke};stroke-linecap:round;'
                f'stroke-linejoin:round">{body}</g>')
    return f'<g {tr}style="fill:{color};stroke:none">{body}</g>'


def icon(nom: str, size: int = 48, color: str = "currentColor", stroke: float = 2,
         joc: str = "lucide") -> str:
    """An icon as inline SVG. `nom` can carry its set ("tabler:beer", "phosphor:leaf-fill").
    Sets: lucide (default), tabler, tabler-ple, phosphor, phosphor-thin/-light/-bold/-fill/
    -duotone. `stroke` is for stroke sets, in 24-unit icon space: 2 is standard; at big sizes
    use 1-1.5. Use one set and one weight per deck."""
    data, body = _icon_parts(nom, joc)
    b = data["box"]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {b} {b}">'
            f'{_icon_group(data, body, color, stroke)}</svg>')


def bandera(codi: str, amplada: int = 120, vora: str | None = None) -> str:
    """A flag as inline SVG, 4:3. `codi` is ISO ("fr", "es", "pt"), "es-ct" for Catalonia,
    "eu" for the European Union. `vora` draws a thin outline (useful for white flags)."""
    flags = _load("banderes.json")
    k = codi.lower()
    if k not in flags:
        near = difflib.get_close_matches(k, list(flags), n=6)
        raise ValueError(f"No hi ha la bandera '{codi}'. Potser: {', '.join(near)}")
    f = flags[k]
    vx, vy, vw, vh = (float(v) for v in f["viewBox"].split())
    border = (f'<rect x="{vx}" y="{vy}" width="{vw}" height="{vh}" style="fill:none;stroke:{vora};'
              f'stroke-width:{vw / amplada * 2:.2f}"/>' if vora else "")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{amplada}" height="{round(amplada * 3 / 4)}" '
            f'viewBox="{f["viewBox"]}" preserveAspectRatio="none">{f["body"]}{border}</svg>')


# ---------------------------------------------------------------- places
def lloc(nom: str, pais: str | None = None) -> tuple[float, float]:
    """(lon, lat) of a city, town or Catalan municipality, for mapa(punts=...). Accepts Catalan
    names ("Lió", "Tolosa", "Saragossa"); `pais` (ISO, "FR") resolves ambiguous names."""
    data = _load("llocs.json")
    target = data["exonims"].get(nom.strip(), nom)
    k = _norm(target)
    best = None
    for name, ascii_name, iso, lon, lat, pop in data["llocs"]:
        if pais and iso != pais.upper():
            continue
        if k in (_norm(name), _norm(ascii_name)):
            if best is None or pop > best[2]:
                best = (lon, lat, pop)
    if best is None:
        names = [r[0] for r in data["llocs"] if not pais or r[2] == pais.upper()]
        near = difflib.get_close_matches(target, names, n=5)
        raise ValueError(f"No trobo el lloc '{nom}'. Potser: {', '.join(near) or '(cap)'}; o passa (lon, lat).")
    return best[0], best[1]


# ---------------------------------------------------------------- maps
MAPES = {
    "mon": "Món, països (noms en català, codi ISO: ES, FR…)",
    "europa": "Europa, països (noms en català, codi ISO)",
    "espanya-autonomies": "Espanya, comunitats autònomes (Canàries en requadre)",
    "espanya-provincies": "Espanya, províncies (Canàries en requadre)",
    "catalunya-provincies": "Catalunya, províncies",
    "catalunya-comarques": "Catalunya, 43 comarques",
    "catalunya-municipis": "Catalunya, municipis",
    "FR, DE, US…": "regions de primer nivell de qualsevol país (codi ISO); 'FR-grups' les agrupa "
                   "(p. ex. departaments en regions) quan n'hi ha",
}


def _map(nom):
    if nom in MAPES and "…" not in nom:
        return _load("mapes", nom + ".json")
    key = nom.upper().replace("REGIONS-", "")
    base = key.replace("-GRUPS", "")
    index = _load("mapes", "regions", "index.json")
    if base in index and (not key.endswith("-GRUPS") or "grups" in index[base]):
        return _load("mapes", "regions", (base + "-grups" if key.endswith("-GRUPS") else base) + ".json")
    raise ValueError(f"No hi ha el mapa '{nom}'. Mapes: {', '.join(k for k in MAPES if '…' not in k)}, "
                     f"o un codi de país (FR, IT, US…) i 'FR-grups'")


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


def _main_cluster(feats):
    """Drops far-away overseas parts (French Guiana, Hawaii…) from the default frame."""
    if len(feats) < 6:
        return feats
    xs = sorted(f["c"][0] for f in feats)
    ys = sorted(f["c"][1] for f in feats)
    mx, my = xs[len(xs) // 2], ys[len(ys) // 2]
    d = sorted(math.hypot(f["c"][0] - mx, f["c"][1] - my) for f in feats)
    lim = max(d[int(len(d) * 0.75)] * 3, 1.0)
    return [f for f in feats if math.hypot(f["c"][0] - mx, f["c"][1] - my) <= lim]


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
            y = th * (a4 * t6 * t2 + a3 * t6 + a2 * t2 + a1)
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
    """Map label: ink text over a halo, readable on any region."""
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
         label_size: int = 20, rutes=None, ruta_color: str | None = None) -> str:
    """A map as inline SVG, fitted to width x height.

    nom       "mon", "europa", "espanya-autonomies", "espanya-provincies", "catalunya-comarques",
              "catalunya-municipis", "catalunya-provincies", or a country code ("FR", "IT",
              "US") for its regions, "FR-grups" for grouped regions
    destaca   regions filled with `color` (names or codes: ["Segrià"], ["ES", "FR"])
    colors    {region: css colour} for a palette map
    valors    {region: number} for a choropleth: one hue, darker = more
    etiquetes True (label every coloured region), a list of regions, or {region: "text"}
    punts     places: names ("Lió", "Girona") or (lon, lat, "label") tuples
    rutes     [("Barcelona", "Lió"), ...] curved lines between places (exports, routes, flows)
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

    def place(p):
        if isinstance(p, str):
            lon, lat = lloc(p)
            return lon, lat, p
        return (p[0], p[1], p[2] if len(p) > 2 else None)
    pts = [place(p) for p in punts or []]
    lines = [(place(a), place(b)) for a, b in rutes or []]

    frame = [_find(m, k) for k in enfoca] if enfoca else None
    if frame is None and 0 < len(fill) <= 6 and m["projection"] != "local":
        frame = [f for f in feats if f["id"] in fill]
    frame = frame or _main_cluster(feats)

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
    pad = 0.06 if enfoca or len(frame) < len(feats) else 0.01
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
            pp = [P(lon, lat) for lon, lat in r]
            if max(x for x, _ in pp) < -50 or min(x for x, _ in pp) > width + 50 or \
               max(y for _, y in pp) < -50 or min(y for _, y in pp) > height + 50:
                continue
            d.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pp) + "Z")
        if not d:
            continue
        path = "".join(d)
        out.append(f'<path d="{path}" style="fill:{rest};stroke:{vora};stroke-width:{gruix};stroke-linejoin:round"/>')
        if f["id"] in fill:
            op = alpha.get(f["id"], 1)
            out.append(f'<path d="{path}" style="fill:{fill[f["id"]]};fill-opacity:{op:.2f};'
                       f'stroke:{vora};stroke-width:{gruix};stroke-linejoin:round"/>')
    if "inset" in m:
        a, b = m["inset"]["lon"], m["inset"]["lat"]
        (ax, ay), (bx, by) = P(a[0], b[1]), P(a[1], b[0])
        out.append(f'<path d="M{ax:.1f},{ay:.1f}L{bx:.1f},{ay:.1f}L{bx:.1f},{by:.1f}" '
                   f'style="stroke:{muted};stroke-width:1;fill:none"/>')

    rc = ruta_color or ink
    for (a, b) in lines:
        (xa, ya), (xb, yb) = P(a[0], a[1]), P(b[0], b[1])
        mx, my = (xa + xb) / 2, (ya + yb) / 2
        cx, cy = mx - (yb - ya) * 0.25, my + (xb - xa) * 0.25 * -1
        out.append(f'<path d="M{xa:.1f},{ya:.1f} Q{cx:.1f},{cy:.1f} {xb:.1f},{yb:.1f}" '
                   f'style="fill:none;stroke:{rc};stroke-width:3;stroke-linecap:round"/>')

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
    seen = set()
    for lon, lat, lab in pts + [p for ln in lines for p in ln]:
        if (lon, lat) in seen:
            continue
        seen.add((lon, lat))
        x, y = P(lon, lat)
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" style="fill:{ink};stroke:{vora};stroke-width:3"/>')
        if lab:
            labels.append(_label(x + 14, y + 7, lab, label_size, ink, halo, "start"))
    out += labels
    if credit and "IGN" in m["credit"]:
        out.append(f'<text x="{width - 4}" y="{height - 6}" text-anchor="end" style="font-size:14px;'
                   f'fill:{muted}">Mapa: {_esc(m["credit"])}</text>')
    out.append("</svg>")
    return "".join(out)


# ---------------------------------------------------------------- pictograms and small charts
def pictograma(valor: float, total: int = 100, columnes: int = 10, icona: str | None = None,
               mida: int = 40, gap: int = 10, color: str = "var(--accent)",
               rest: str = "var(--line)", stroke: float = 2, joc: str = "lucide") -> str:
    """A unit chart: `total` squares (or icons) with the first `valor` filled, e.g.
    pictograma(7, 10, columnes=10, icona="apple", mida=72) for "7 de cada 10"."""
    rows = math.ceil(total / columnes)
    w, h = columnes * mida + (columnes - 1) * gap, rows * mida + (rows - 1) * gap
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">']
    data, body = _icon_parts(icona, joc) if icona else (None, None)
    for i in range(total):
        x, y = (i % columnes) * (mida + gap), (i // columnes) * (mida + gap)
        c = color if i < round(valor) else rest
        if body:
            out.append(_icon_group(data, body, c, stroke, mida / data["box"], x, y))
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


def _fmt(v, unit=""):
    from neska_pdf import _fmt as f
    return f(v, unit)


def cascada(etiquetes, valors, unit: str = "", total: str | None = "Total", width: int = 1104,
            height: int = 420, puja: str = "var(--accent)", baixa: str = "var(--ink)",
            base: str = "var(--line)", ink: str = "var(--ink)", muted: str = "var(--muted)",
            font: str = "var(--text)") -> str:
    """A waterfall: how a starting figure becomes the final one. `valors[0]` is the start, the
    rest are changes (+/-); `total` adds the end bar (None to skip)."""
    steps = [("start", etiquetes[0], valors[0])] + [("delta", l, v) for l, v in zip(etiquetes[1:], valors[1:])]
    run, bars = 0.0, []
    for kind, lab, v in steps:
        if kind == "start":
            bars.append((lab, 0, v, base, v))
            run = v
        else:
            bars.append((lab, run, run + v, puja if v >= 0 else baixa, v))
            run += v
    if total:
        bars.append((total, 0, run, base, run))
    top = max(max(a, b) for _, a, b, _, _ in bars) or 1
    lo = min(0, min(min(a, b) for _, a, b, _, _ in bars))
    n = len(bars)
    gap = 24
    bw = (width - gap * (n - 1)) / n
    ch = height - 76

    def Y(v):
        return 36 + ch * (1 - (v - lo) / (top - lo))
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}" style="font-family:{font}">']
    for i, (lab, a, b, col, v) in enumerate(bars):
        x = i * (bw + gap)
        y1, y2 = Y(max(a, b)), Y(min(a, b))
        out.append(f'<rect x="{x:.1f}" y="{y1:.1f}" width="{bw:.1f}" height="{max(y2 - y1, 2):.1f}" style="fill:{col}"/>')
        txt = _fmt(v, unit) if i in (0, n - 1) and (total or i == 0) else (("+" if v >= 0 else "−") + _fmt(abs(v), unit))
        out.append(f'<text x="{x + bw / 2:.1f}" y="{y1 - 10:.1f}" text-anchor="middle" style="font-size:20px;'
                   f'font-weight:600;fill:{ink}">{_esc(txt)}</text>')
        out.append(f'<text x="{x + bw / 2:.1f}" y="{height - 8}" text-anchor="middle" style="font-size:20px;'
                   f'fill:{muted}">{_esc(lab)}</text>')
        if i < n - 1:
            out.append(f'<path d="M{x + bw:.1f},{Y(b if bars[i][0] != total else a):.1f}h{gap}" '
                       f'style="stroke:{muted};stroke-width:1;stroke-dasharray:3 3"/>')
    out.append(f'<path d="M0,{Y(0):.1f}H{width}" style="stroke:{ink};stroke-width:2"/></svg>')
    return "".join(out)


def calendari(tasques, periodes, avui: float | None = None, width: int = 1104, fila: int = 56,
              label_w: int = 300, color: str = "var(--accent)", rest: str = "var(--line)",
              ink: str = "var(--ink)", muted: str = "var(--muted)", font: str = "var(--text)") -> str:
    """A plan on a timeline (Gantt). `periodes` = column labels (["Gen", "Feb", ...]);
    `tasques` = [(name, start, end, highlight?), ...] in column units (0 = start of the first
    column; end is exclusive, halves allowed). `avui` draws a "today" line at that position."""
    n = len(periodes)
    cw = (width - label_w) / n
    h = 44 + fila * len(tasques)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{h}" viewBox="0 0 {width} {h}" '
           f'style="font-family:{font}">']
    for i, p in enumerate(periodes):
        x = label_w + i * cw
        out.append(f'<text x="{x + 6:.1f}" y="24" style="font-size:18px;fill:{muted}">{_esc(p)}</text>')
        out.append(f'<path d="M{x:.1f},34V{h}" style="stroke:{rest};stroke-width:1"/>')
    for j, t in enumerate(tasques):
        name, a, b = t[0], t[1], t[2]
        on = len(t) > 3 and t[3]
        y = 44 + j * fila
        out.append(f'<text x="0" y="{y + fila / 2 + 7:.1f}" style="font-size:22px;font-weight:{600 if on else 400};'
                   f'fill:{ink}">{_esc(name)}</text>')
        out.append(f'<rect x="{label_w + a * cw:.1f}" y="{y + fila * 0.22:.1f}" width="{(b - a) * cw:.1f}" '
                   f'height="{fila * 0.56:.1f}" style="fill:{color if on else ink};fill-opacity:{1 if on else 0.85}"/>')
    if avui is not None:
        x = label_w + avui * cw
        out.append(f'<path d="M{x:.1f},30V{h}" style="stroke:{color};stroke-width:3"/>')
    out.append("</svg>")
    return "".join(out)


def embut(etiquetes, valors, unit: str = "", destaca=None, width: int = 1104, fila: int = 72,
          color: str = "var(--accent)", rest: str = "var(--line)", ink: str = "var(--ink)",
          muted: str = "var(--muted)", font: str = "var(--text)") -> str:
    """A funnel: centred bars that narrow step by step, with the conversion between steps.
    `destaca` = index of the step that matters (often where most is lost)."""
    top = max(valors) or 1
    h = fila * len(valors)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{h}" viewBox="0 0 {width} {h}" '
           f'style="font-family:{font}">']
    lw = 300
    area = width - lw - 160
    for i, (lab, v) in enumerate(zip(etiquetes, valors)):
        w = max(area * v / top, 4)
        x = lw + (area - w) / 2
        y = i * fila
        on = destaca == i
        out.append(f'<rect x="{x:.1f}" y="{y + 6}" width="{w:.1f}" height="{fila - 12}" style="fill:{color if on else rest}"/>')
        out.append(f'<text x="0" y="{y + fila / 2 + 8:.1f}" style="font-size:22px;fill:{ink}">{_esc(lab)}</text>')
        inside = w > 130
        tx, anchor = (lw + area / 2, "middle") if inside else (x + w + 14, "start")
        tc = ("var(--on-accent)" if on else ink) if inside else ink
        out.append(f'<text x="{tx:.1f}" y="{y + fila / 2 + 8:.1f}" text-anchor="{anchor}" '
                   f'style="font-size:22px;font-weight:700;fill:{tc}">{_esc(_fmt(v, unit))}</text>')
        if i:
            pct = round(100 * v / (valors[i - 1] or 1))
            out.append(f'<text x="{width}" y="{y + fila / 2 + 8:.1f}" text-anchor="end" style="font-size:20px;'
                       f'fill:{muted}">{pct} %</text>')
    out.append("</svg>")
    return "".join(out)


def calor(files, columnes, valors, unit: str = "", width: int = 1104, fila: int = 52, label_w: int = 220,
          color: str = "var(--accent)", ink: str = "var(--ink)", muted: str = "var(--muted)",
          on_color: str = "var(--on-accent)", font: str = "var(--text)", xifres: bool = True) -> str:
    """A heatmap: rows x columns of cells, darker = more (one hue). `valors[i][j]` for row i,
    column j. Good for hours x days, months x products, region x year."""
    flat = [v for r in valors for v in r if v is not None]
    lo, hi = min(flat), max(flat)
    cw = (width - label_w) / len(columnes)
    h = 36 + fila * len(files)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{h}" viewBox="0 0 {width} {h}" '
           f'style="font-family:{font}">']
    for j, c in enumerate(columnes):
        out.append(f'<text x="{label_w + j * cw + cw / 2:.1f}" y="22" text-anchor="middle" style="font-size:18px;'
                   f'fill:{muted}">{_esc(c)}</text>')
    for i, (r, row) in enumerate(zip(files, valors)):
        y = 36 + i * fila
        out.append(f'<text x="0" y="{y + fila / 2 + 7:.1f}" style="font-size:20px;fill:{ink}">{_esc(r)}</text>')
        for j, v in enumerate(row):
            if v is None:
                continue
            t = (v - lo) / ((hi - lo) or 1)
            op = 0.08 + 0.92 * t
            out.append(f'<rect x="{label_w + j * cw + 2:.1f}" y="{y + 2}" width="{cw - 4:.1f}" height="{fila - 4}" '
                       f'style="fill:{color};fill-opacity:{op:.2f}"/>')
            if xifres and cw > 44:
                out.append(f'<text x="{label_w + j * cw + cw / 2:.1f}" y="{y + fila / 2 + 7:.1f}" text-anchor="middle" '
                           f'style="font-size:18px;fill:{on_color if op > 0.55 else ink}">{_esc(_fmt(v, unit))}</text>')
    out.append("</svg>")
    return "".join(out)


def interval(etiquetes, minims, maxims, punt=None, unit: str = "", destaca=None, width: int = 1104,
             fila: int = 56, label_w: int = 280, color: str = "var(--accent)", rest: str = "var(--line)",
             ink: str = "var(--ink)", muted: str = "var(--muted)", font: str = "var(--text)") -> str:
    """A dot/range plot: for each item a line from min to max and an optional point (mean, ours,
    target). Good for prices across competitors, salary ranges, before/after ranges."""
    vals = list(minims) + list(maxims) + [p for p in (punt or []) if p is not None]
    lo, hi = min(vals), max(vals)
    area = width - label_w - 120

    def X(v):
        return label_w + area * (v - lo) / ((hi - lo) or 1)
    h = fila * len(etiquetes)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{h}" viewBox="0 0 {width} {h}" '
           f'style="font-family:{font}">']
    for i, lab in enumerate(etiquetes):
        y = i * fila + fila / 2
        on = destaca == i
        c = color if on else ink
        out.append(f'<text x="0" y="{y + 7:.1f}" style="font-size:22px;font-weight:{700 if on else 400};fill:{ink}">{_esc(lab)}</text>')
        out.append(f'<path d="M{X(minims[i]):.1f},{y:.1f}H{X(maxims[i]):.1f}" style="stroke:{c if on else rest};'
                   f'stroke-width:{10 if on else 8};stroke-linecap:round"/>')
        out.append(f'<text x="{X(minims[i]) - 14:.1f}" y="{y + 6:.1f}" text-anchor="end" style="font-size:18px;fill:{muted}">'
                   f'{_esc(_fmt(minims[i], unit))}</text>')
        out.append(f'<text x="{X(maxims[i]) + 14:.1f}" y="{y + 6:.1f}" style="font-size:18px;fill:{muted}">'
                   f'{_esc(_fmt(maxims[i], unit))}</text>')
        if punt and punt[i] is not None:
            out.append(f'<circle cx="{X(punt[i]):.1f}" cy="{y:.1f}" r="11" style="fill:{c};stroke:var(--paper);stroke-width:3"/>')
    out.append("</svg>")
    return "".join(out)


def treemap(parts, unit: str = "", width: int = 1104, height: int = 480, destaca=None,
            color: str = "var(--accent)", rest: str = "var(--line)", ink: str = "var(--ink)",
            on_color: str = "var(--on-accent)", font: str = "var(--text)", gap: int = 4) -> str:
    """A treemap: rectangles whose area is the share of each part, biggest first. `parts` =
    [(label, value), ...]; `destaca` = label or index in `color`, the rest in `rest`."""
    items = sorted(enumerate(parts), key=lambda t: -t[1][1])
    total = sum(v for _, (_, v) in items) or 1
    rects = []

    def layout(items, x, y, w, h):
        if not items:
            return
        if len(items) == 1:
            rects.append((items[0], x, y, w, h))
            return
        s = sum(v for _, (_, v) in items)
        acc, k = 0, 0
        for k, (_, (_, v)) in enumerate(items):
            acc += v
            if acc >= s / 2:
                break
        first, rest_ = items[: k + 1], items[k + 1:]
        f = sum(v for _, (_, v) in first) / s
        if w >= h:
            layout(first, x, y, w * f, h)
            layout(rest_, x + w * f, y, w * (1 - f), h)
        else:
            layout(first, x, y, w, h * f)
            layout(rest_, x, y + h * f, w, h * (1 - f))
    layout(items, 0, 0, width, height)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}" style="font-family:{font}">']
    for (i, (lab, v)), x, y, w, h in rects:
        on = destaca == i or destaca == lab
        out.append(f'<rect x="{x + gap / 2:.1f}" y="{y + gap / 2:.1f}" width="{max(w - gap, 1):.1f}" '
                   f'height="{max(h - gap, 1):.1f}" style="fill:{color if on else rest}"/>')
        if w > 110 and h > 64:
            tc = on_color if on else ink
            big = 40 if w * h > width * height * 0.15 else 26
            out.append(f'<text x="{x + 18:.1f}" y="{y + 18 + big:.1f}" style="font-size:{big}px;font-weight:700;'
                       f'fill:{tc}">{_esc(_fmt(v, unit))}</text>')
            out.append(f'<text x="{x + 18:.1f}" y="{y + 18 + big + 28:.1f}" style="font-size:20px;fill:{tc}">'
                       f'{_esc(lab)}</text>')
    out.append("</svg>")
    return "".join(out)


def apilades(etiquetes, series: dict, unit: str = "", width: int = 1104, height: int = 420,
             colors=None, ink: str = "var(--ink)", muted: str = "var(--muted)", font: str = "var(--text)",
             percent: bool = False) -> str:
    """Stacked bars: each bar split by series ({"Botiga": [...], "Web": [...]}). `colors` in
    the same order (default: accent, ink, line). `percent=True` makes every bar 100 %."""
    names = list(series)
    cols = colors or ["var(--accent)", "var(--ink)", "var(--line)", "var(--muted)"]
    n = len(etiquetes)
    totals = [sum(series[s][i] for s in names) for i in range(n)]
    top = 100 if percent else (max(totals) or 1)
    gap = 28
    bw = (width - gap * (n - 1)) / n
    ch = height - 110
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}" style="font-family:{font}">']
    for i, lab in enumerate(etiquetes):
        x = i * (bw + gap)
        y = 30 + ch
        for k, sname in enumerate(names):
            v = series[sname][i]
            hv = ch * ((100 * v / (totals[i] or 1)) if percent else v) / top
            y -= hv
            out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{max(hv - 2, 0):.1f}" style="fill:{cols[k % len(cols)]}"/>')
        if not percent:
            out.append(f'<text x="{x + bw / 2:.1f}" y="{y - 10:.1f}" text-anchor="middle" style="font-size:20px;'
                       f'font-weight:600;fill:{ink}">{_esc(_fmt(totals[i], unit))}</text>')
        out.append(f'<text x="{x + bw / 2:.1f}" y="{30 + ch + 28}" text-anchor="middle" style="font-size:20px;'
                   f'fill:{muted}">{_esc(lab)}</text>')
    lx = 0
    for k, sname in enumerate(names):
        out.append(f'<rect x="{lx}" y="{height - 26}" width="18" height="18" style="fill:{cols[k % len(cols)]}"/>')
        out.append(f'<text x="{lx + 26}" y="{height - 10}" style="font-size:20px;fill:{ink}">{_esc(sname)}</text>')
        lx += 60 + 11 * len(sname)
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
