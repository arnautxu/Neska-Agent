"""Builds the graphic resources that Neska's decks use inside the code sandbox.

The sandbox has no network, and every file of a skill is uploaded again on each code call
(with a hard limit on how many), so heavy resources do not live in the skill. They go to
librechat/neska/sandbox-recursos/, which build-codeapi.yml copies into the sandbox packages
(share/neska inside the Python tree): mounted read-only in every job, at no cost per call.
neska_recursos.py finds them through sys.prefix.

    pip install shapely babel pycountry
    python3 build_recursos_presentacions.py <downloads>

<downloads> must hold the unpacked npm packages (each with its package/ folder):
lucide-static-1.72.0, icons-3.51.0 (@tabler/icons), core-2.1.1 (@phosphor-icons/core),
flag-icons-7.6.0, world-atlas-2.0.2, es-atlas-0.6.0; plus idescat-municipis.ssv
(https://www.idescat.cat/codis/?id=50&n=9&f=ssv), and from Natural Earth's GitHub
(geojson/): ne_places.geojson (ne_10m_populated_places_simple) and ne_admin1_10m.geojson
(ne_10m_admin_1_states_provinces). Fonts come from fetch_fonts_presentacions.py.
"""

import json
import os
import re
import sys

import pycountry
from babel import Locale
from shapely.affinity import translate
from shapely.geometry import MultiPolygon, Polygon, box, shape
from shapely.ops import unary_union

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sandbox-recursos")
for d in ("mapes", "mapes/regions", "icones"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)
CA = Locale("ca")


def dump(obj, *path):
    p = os.path.join(OUT, *path)
    json.dump(obj, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(p) // 1024


# ---------- icons and flags ----------
def svg_body(svg):
    body = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    return re.sub(r"\s+", " ", body).replace("> <", "><").strip()


def svg_dir(path, strip_suffix=""):
    out = {}
    for f in sorted(os.listdir(path)):
        if f.endswith(".svg"):
            name = f[:-4]
            if strip_suffix and name.endswith(strip_suffix):
                name = name[: -len(strip_suffix)]
            out[name] = svg_body(open(os.path.join(path, f), encoding="utf-8").read())
    return out


def build_icons():
    lic = {}
    # Lucide: stroke icons on a 24 box
    pkg = os.path.join(SRC, "lucide-static-1.72.0", "package")
    icons = svg_dir(os.path.join(pkg, "icons"))
    tags = json.load(open(os.path.join(pkg, "tags.json"), encoding="utf-8"))
    kb = dump({"box": 24, "kind": "stroke", "icons": icons, "tags": {k: v for k, v in tags.items() if k in icons}},
              "icones", "lucide.json")
    print("lucide", len(icons), kb, "KB")
    lic["Lucide (ISC)"] = open(os.path.join(pkg, "LICENSE"), encoding="utf-8").read()

    # Tabler: outline (stroke, 24 box) and filled
    pkg = os.path.join(SRC, "icons-3.51.0", "package")
    tags = {}
    meta = os.path.join(pkg, "icons.json")
    if os.path.exists(meta):
        for k, v in json.load(open(meta, encoding="utf-8")).items():
            t = v.get("tags", []) if isinstance(v, dict) else []
            tags[k] = [str(x) for x in t] + ([v["category"]] if isinstance(v, dict) and v.get("category") else [])
    for style, kind in (("outline", "stroke"), ("filled", "fill")):
        icons = svg_dir(os.path.join(pkg, "icons", style))
        # Tabler outline files draw an invisible bounding path first; drop it
        icons = {k: re.sub(r'<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*/>', "", v) for k, v in icons.items()}
        kb = dump({"box": 24, "kind": kind, "icons": icons, "tags": {k: tags.get(k, []) for k in icons}},
                  "icones", f"tabler-{style}.json")
        print("tabler", style, len(icons), kb, "KB")
    lic["Tabler Icons (MIT)"] = open(os.path.join(pkg, "LICENSE"), encoding="utf-8").read()

    # Phosphor: six weights on a 256 box, drawn with fill
    pkg = os.path.join(SRC, "core-2.1.1", "package")
    tags = {}
    cat = os.path.join(pkg, "dist", "index.mjs")
    for weight in ("thin", "light", "regular", "bold", "fill", "duotone"):
        suffix = "" if weight == "regular" else f"-{weight}"
        icons = svg_dir(os.path.join(pkg, "assets", weight), suffix)
        kb = dump({"box": 256, "kind": "fill", "icons": icons, "tags": {}}, "icones", f"phosphor-{weight}.json")
        print("phosphor", weight, len(icons), kb, "KB")
    lic["Phosphor Icons (MIT)"] = open(os.path.join(pkg, "LICENSE"), encoding="utf-8").read()

    # Flags (4x3)
    pkg = os.path.join(SRC, "flag-icons-7.6.0", "package")
    flags = {}
    for f in sorted(os.listdir(os.path.join(pkg, "flags", "4x3"))):
        if f.endswith(".svg"):
            svg = open(os.path.join(pkg, "flags", "4x3", f), encoding="utf-8").read()
            vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
            flags[f[:-4]] = {"viewBox": vb, "body": svg_body(svg)}
    kb = dump(flags, "banderes.json")
    print("flags", len(flags), kb, "KB")
    lic["flag-icons (MIT)"] = open(os.path.join(pkg, "LICENSE"), encoding="utf-8").read()

    with open(os.path.join(OUT, "LLICENCIES.txt"), "w", encoding="utf-8") as fh:
        for k, v in lic.items():
            fh.write(f"===== {k} =====\n\n{v}\n\n")
    old = os.path.join(OUT, "LICENSE-lucide.txt")
    if os.path.exists(old):
        os.remove(old)


# ---------- geometry helpers ----------
def topo_features(path, obj):
    t = json.load(open(path, encoding="utf-8"))
    sx, sy = t["transform"]["scale"]
    tx, ty = t["transform"]["translate"]
    arcs = []
    for a in t["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in a:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def arc(i):
        return arcs[i] if i >= 0 else arcs[~i][::-1]

    def ring(idx):
        pts = []
        for i in idx:
            seg = arc(i)
            pts.extend(seg if not pts else seg[1:])
        return pts

    feats = []
    for g in t["objects"][obj]["geometries"]:
        if g["type"] == "Polygon":
            polys = [g["arcs"]]
        elif g["type"] == "MultiPolygon":
            polys = g["arcs"]
        else:
            continue
        parts = []
        for p in polys:
            outer = ring(p[0])
            if len(outer) < 4:
                continue
            holes = [h for h in (ring(i) for i in p[1:]) if len(h) >= 4]
            parts.append(Polygon(outer, holes))
        if not parts:
            continue
        geom = MultiPolygon(parts).buffer(0)
        feats.append({"id": str(g.get("id", "")), "name": g.get("properties", {}).get("name", ""), "geom": geom})
    return feats


def write_map(path, title, credit, feats, tol, proj, digits=3, clip=None, extra=None):
    out = []
    for f in feats:
        g = f["geom"]
        if clip is not None:
            g = g.intersection(clip)
        if g.is_empty:
            continue
        g = g.simplify(tol, preserve_topology=True)
        polys = [g] if g.geom_type == "Polygon" else list(getattr(g, "geoms", []))
        rings = []
        for p in polys:
            if p.geom_type != "Polygon" or p.area < (tol * tol * 4):
                continue
            for r in [p.exterior, *p.interiors]:
                rings.append([[round(x, digits), round(y, digits)] for x, y in r.coords])
        if not rings:
            continue
        biggest = max(polys, key=lambda p: p.area if p.geom_type == "Polygon" else 0)
        c = biggest.representative_point()
        item = {"id": f["id"], "name": f["name"], "c": [round(c.x, digits), round(c.y, digits)], "r": rings}
        if f.get("aka"):
            item["aka"] = [a for a in f["aka"] if a]
        if f.get("group"):
            item["g"] = f["group"]
        out.append(item)
    doc = {"title": title, "credit": credit, "projection": proj, "features": out}
    if extra:
        doc.update(extra)
    kb = dump(doc, "mapes", *path.split("/"))
    return len(out), kb


def catalan_country_names(feats):
    for f in feats:
        c = pycountry.countries.get(numeric=f["id"].zfill(3)) if f["id"] else None
        aka = [f["name"]]
        if c:
            f["id"] = c.alpha_2
            aka += [c.alpha_3, c.name]
            f["name"] = CA.territories.get(c.alpha_2, f["name"])
        f["aka"] = aka
    return feats


CCAA_CA = {
    "01": "Andalusia", "02": "Aragó", "03": "Astúries", "04": "Illes Balears", "05": "Canàries",
    "06": "Cantàbria", "07": "Castella i Lleó", "08": "Castella-la Manxa", "09": "Catalunya",
    "10": "País Valencià", "11": "Extremadura", "12": "Galícia", "13": "Madrid", "14": "Múrcia",
    "15": "Navarra", "16": "País Basc", "17": "La Rioja", "18": "Ceuta", "19": "Melilla",
}
CANARY_SHIFT = (6.5, 7.0)  # Canary Islands drawn as an inset south-west of the peninsula
INSET = {"inset": {"lon": [-11.9, -6.5], "lat": [34.4, 36.5]}}


def build_maps():
    wa = os.path.join(SRC, "world-atlas-2.0.2", "package")
    ne = "Natural Earth (domini públic)"
    world = catalan_country_names(topo_features(os.path.join(wa, "countries-110m.json"), "countries"))
    print("mon", write_map("mon.json", "Món, països", ne, [f for f in world if f["id"] != "AQ"], 0.15,
                           "equal-earth", digits=2))
    eu = catalan_country_names(topo_features(os.path.join(wa, "countries-50m.json"), "countries"))
    print("europa", write_map("europa.json", "Europa, països", ne, eu, 0.05, "laea-europe", digits=2,
                              clip=box(-25, 34, 45, 71.5)))

    es = os.path.join(SRC, "es-atlas-0.6.0", "package", "es")
    ign = "IGN/CNIG (CC BY 4.0)"
    ccaa = [f for f in topo_features(os.path.join(es, "autonomous_regions.json"), "autonomous_regions")
            if f["id"] in CCAA_CA]
    for f in ccaa:
        f["aka"] = [f["name"]]
        f["name"] = CCAA_CA[f["id"]]
        if f["id"] == "05":
            f["geom"] = translate(f["geom"], *CANARY_SHIFT)
    print("espanya-autonomies", write_map("espanya-autonomies.json", "Espanya, comunitats autònomes "
                                          "(Canàries desplaçades)", ign, ccaa, 0.02, "local", extra=INSET))
    prov = topo_features(os.path.join(es, "provinces.json"), "provinces")
    for f in prov:
        if f["id"] in ("35", "38"):
            f["geom"] = translate(f["geom"], *CANARY_SHIFT)
    print("espanya-provincies", write_map("espanya-provincies.json", "Espanya, províncies (Canàries "
                                          "desplaçades)", ign, prov, 0.02, "local", extra=INSET))

    muni = topo_features(os.path.join(es, "municipalities.json"), "municipalities")
    cat = [f for f in muni if f["id"][:2] in ("08", "17", "25", "43")]
    rows = open(os.path.join(SRC, "idescat-municipis.ssv"), encoding="utf-8-sig").read().splitlines()
    to_comarca, names = {}, {}
    for line in rows:
        parts = line.split(";")
        if len(parts) >= 4 and parts[0].isdigit():
            to_comarca[parts[0][:5]] = (parts[2], parts[3])
            names[parts[0][:5]] = parts[1]
    groups = {}
    for f in cat:
        f["name"] = names.get(f["id"], f["name"])
        if f["id"] in to_comarca:
            f["group"] = to_comarca[f["id"]][1]
            groups.setdefault(to_comarca[f["id"]], []).append(f["geom"])
    comarques = [{"id": code, "name": name, "geom": unary_union(gs).buffer(0.0005).buffer(-0.0005)}
                 for (code, name), gs in groups.items()]
    credit = "IGN/CNIG (CC BY 4.0) · Idescat"
    print("catalunya-comarques", write_map("catalunya-comarques.json", "Catalunya, comarques", credit,
                                           comarques, 0.002, "local"))
    print("catalunya-municipis", write_map("catalunya-municipis.json", "Catalunya, municipis", credit,
                                           cat, 0.002, "local"))
    print("catalunya-provincies", write_map("catalunya-provincies.json", "Catalunya, províncies", ign,
                                            [f for f in prov if f["id"] in ("08", "17", "25", "43")],
                                            0.004, "local"))
    return cat


def build_regions():
    """Admin-1 regions of every country from Natural Earth, one file per ISO code, plus the
    same regions grouped (e.g. French departments into regions) when Natural Earth groups them."""
    data = json.load(open(os.path.join(SRC, "ne_admin1_10m.geojson"), encoding="utf-8"))
    by = {}
    for ft in data["features"]:
        p = ft["properties"]
        iso = (p.get("iso_a2") or "").upper()
        if not re.fullmatch(r"[A-Z]{2}", iso) or ft["geometry"] is None:
            continue
        geom = shape(ft["geometry"]).buffer(0)
        name = p.get("name") or p.get("name_en") or ""
        aka = [p.get(k) for k in ("name_en", "name_es", "name_fr", "name_local", "name_alt") if p.get(k)]
        by.setdefault(iso, []).append({"id": p.get("iso_3166_2") or name, "name": name, "aka": aka,
                                       "group": p.get("region") or "", "geom": geom})
    index = {}
    for iso, feats in sorted(by.items()):
        span = max(f["geom"].bounds[2] for f in feats) - min(f["geom"].bounds[0] for f in feats)
        tol = max(0.002, min(0.05, span / 400))
        n, kb = write_map(f"regions/{iso}.json", f"{CA.territories.get(iso, iso)}, regions", "Natural Earth "
                          "(domini públic)", feats, tol, "local", digits=3)
        entry = {"nom": CA.territories.get(iso, iso), "regions": n}
        groups = {}
        for f in feats:
            if f["group"]:
                groups.setdefault(f["group"], []).append(f["geom"])
        if 1 < len(groups) < len(feats):
            gfeats = [{"id": g, "name": g, "geom": unary_union(gs).buffer(0)} for g, gs in groups.items()]
            gn, _ = write_map(f"regions/{iso}-grups.json", f"{CA.territories.get(iso, iso)}, regions agrupades",
                              "Natural Earth (domini públic)", gfeats, tol, "local", digits=3)
            entry["grups"] = gn
        index[iso] = entry
    dump(index, "mapes", "regions", "index.json")
    print("regions", len(index), "countries")


# Catalan names of cities that people will write in Catalan
EXONIMS = {
    "Lió": "Lyon", "Tolosa": "Toulouse", "Montpeller": "Montpellier", "Marsella": "Marseille",
    "Niça": "Nice", "Perpinyà": "Perpignan", "Bordeus": "Bordeaux", "Nantes": "Nantes", "París": "Paris",
    "Estrasburg": "Strasbourg", "Lilla": "Lille", "Narbona": "Narbonne", "Carcassona": "Carcassonne",
    "Londres": "London", "Edimburg": "Edinburgh", "Dublín": "Dublin", "Brussel·les": "Brussels",
    "Amsterdam": "Amsterdam", "Berlín": "Berlin", "Munic": "Munich", "Colònia": "Cologne",
    "Frankfurt": "Frankfurt", "Hamburg": "Hamburg", "Viena": "Vienna", "Zuric": "Zurich",
    "Ginebra": "Geneva", "Milà": "Milan", "Torí": "Turin", "Gènova": "Genoa", "Venècia": "Venice",
    "Florència": "Florence", "Roma": "Rome", "Nàpols": "Naples", "Lisboa": "Lisbon", "Porto": "Porto",
    "Copenhaguen": "Copenhagen", "Estocolm": "Stockholm", "Oslo": "Oslo", "Hèlsinki": "Helsinki",
    "Varsòvia": "Warsaw", "Praga": "Prague", "Budapest": "Budapest", "Atenes": "Athens",
    "Moscou": "Moscow", "Istanbul": "Istanbul", "Nova York": "New York", "Filadèlfia": "Philadelphia",
    "Mèxic": "Mexico City", "Buenos Aires": "Buenos Aires", "Pequín": "Beijing", "Tòquio": "Tokyo",
    "Saragossa": "Zaragoza", "Osca": "Huesca", "Terol": "Teruel", "Alacant": "Alicante",
    "Castelló de la Plana": "Castellón de la Plana", "Palma": "Palma", "Sevilla": "Seville",
    "Màlaga": "Málaga", "Bilbao": "Bilbao", "Sant Sebastià": "San Sebastián", "Pamplona": "Pamplona",
    "La Corunya": "A Coruña", "Saragossa ": "Zaragoza",
}


def build_places(catalan_munis):
    data = json.load(open(os.path.join(SRC, "ne_places.geojson"), encoding="utf-8"))
    places = []
    for ft in data["features"]:
        p = ft["properties"]
        places.append([p["name"], p.get("nameascii") or "", (p.get("iso_a2") or "").upper(),
                       round(p["longitude"], 3), round(p["latitude"], 3), int(p.get("pop_max") or 0)])
    for f in catalan_munis:
        g = f["geom"].representative_point()
        places.append([f["name"], "", "ES", round(g.x, 3), round(g.y, 3), 0])
    kb = dump({"credit": "Natural Earth (domini públic) · IGN/CNIG (CC BY 4.0)", "exonims": EXONIMS,
               "llocs": places}, "llocs.json")
    print("places", len(places), kb, "KB")


build_icons()
munis = build_maps()
build_regions()
build_places(munis)
