"""Builds the graphic resources shipped with the neska-presentacions skill.

The code sandbox has no network, so every icon and map the decks may use is packed into
librechat/skill/neska-presentacions/recursos/ at build time. Run this on a workstation:

    pip install shapely babel pycountry
    python3 build_recursos_presentacions.py <downloads> <skill dir>

<downloads> must hold the unpacked npm packages (each with its package/ folder):
lucide-static-1.72.0, world-atlas-2.0.2, es-atlas-0.6.0, and idescat-municipis.ssv
(https://www.idescat.cat/codis/?id=50&n=9&f=ssv: municipality code -> comarca).
"""

import json
import os
import re
import sys

import pycountry
from babel import Locale
from shapely.geometry import MultiPolygon, Polygon, box, mapping, shape
from shapely.ops import unary_union

SRC, SKILL = sys.argv[1], sys.argv[2]
OUT = os.path.join(SKILL, "recursos")
os.makedirs(os.path.join(OUT, "mapes"), exist_ok=True)


# ---------- icons (Lucide, ISC) ----------
def build_icons():
    pkg = os.path.join(SRC, "lucide-static-1.72.0", "package")
    icons = {}
    for f in sorted(os.listdir(os.path.join(pkg, "icons"))):
        if not f.endswith(".svg"):
            continue
        svg = open(os.path.join(pkg, "icons", f), encoding="utf-8").read()
        body = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)
        body = re.sub(r"\s+", " ", body).replace("> <", "><").strip()
        icons[f[:-4]] = body
    tags = json.load(open(os.path.join(pkg, "tags.json"), encoding="utf-8"))
    tags = {k: v for k, v in tags.items() if k in icons}
    json.dump({"icons": icons, "tags": tags}, open(os.path.join(OUT, "icones.json"), "w"),
              ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT, "icones.txt"), "w", encoding="utf-8") as fh:
        for name in icons:
            fh.write(f"{name}: {', '.join(tags.get(name, []))}\n")
    lic = open(os.path.join(pkg, "LICENSE"), encoding="utf-8").read()
    open(os.path.join(OUT, "LICENSE-lucide.txt"), "w").write(lic)
    print("icons", len(icons))


# ---------- TopoJSON decoding ----------
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


def write_map(key, title, credit, feats, tol, proj, digits=3, clip=None, extra=None):
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
            item["aka"] = f["aka"]
        out.append(item)
    doc = {"title": title, "credit": credit, "projection": proj, "features": out}
    if extra:
        doc.update(extra)
    p = os.path.join(OUT, "mapes", key + ".json")
    json.dump(doc, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(key, len(out), os.path.getsize(p) // 1024, "KB")


def catalan_country_names(feats):
    loc = Locale("ca")
    for f in feats:
        c = pycountry.countries.get(numeric=f["id"].zfill(3)) if f["id"] else None
        aka = [f["name"]]
        if c:
            f["id"] = c.alpha_2
            aka += [c.alpha_3, c.name]
            f["name"] = loc.territories.get(c.alpha_2, f["name"])
        f["aka"] = aka
    return feats


CCAA_CA = {
    "01": "Andalusia", "02": "Aragó", "03": "Astúries", "04": "Illes Balears", "05": "Canàries",
    "06": "Cantàbria", "07": "Castella i Lleó", "08": "Castella-la Manxa", "09": "Catalunya",
    "10": "País Valencià", "11": "Extremadura", "12": "Galícia", "13": "Madrid", "14": "Múrcia",
    "15": "Navarra", "16": "País Basc", "17": "La Rioja", "18": "Ceuta", "19": "Melilla",
}

CANARY_SHIFT = (6.5, 7.0)  # Canary Islands drawn as an inset south-west of the peninsula


def shift_canaries(feats, is_canary):
    from shapely.affinity import translate
    for f in feats:
        if is_canary(f):
            f["geom"] = translate(f["geom"], *CANARY_SHIFT)
    return feats


def build_maps():
    wa = os.path.join(SRC, "world-atlas-2.0.2", "package")
    ne = "Natural Earth (domini públic)"
    world = catalan_country_names(topo_features(os.path.join(wa, "countries-110m.json"), "countries"))
    world = [f for f in world if f["id"] != "AQ"]
    write_map("mon", "Món, països", ne, world, 0.15, "equal-earth", digits=2)

    eu = catalan_country_names(topo_features(os.path.join(wa, "countries-50m.json"), "countries"))
    write_map("europa", "Europa, països", ne, eu, 0.05, "laea-europe", digits=2,
              clip=box(-25, 34, 45, 71.5))

    es = os.path.join(SRC, "es-atlas-0.6.0", "package", "es")
    ign = "IGN/CNIG (CC BY 4.0)"
    ccaa = topo_features(os.path.join(es, "autonomous_regions.json"), "autonomous_regions")
    ccaa = [f for f in ccaa if f["id"] in CCAA_CA]
    for f in ccaa:
        f["aka"] = [f["name"]]
        f["name"] = CCAA_CA[f["id"]]
    shift_canaries(ccaa, lambda f: f["id"] == "05")
    inset = {"inset": {"lon": [-11.9, -6.5], "lat": [34.4, 36.5]}}
    write_map("espanya-autonomies", "Espanya, comunitats autònomes (Canàries desplaçades)", ign,
              ccaa, 0.02, "local", extra=inset)

    prov = topo_features(os.path.join(es, "provinces.json"), "provinces")
    shift_canaries(prov, lambda f: f["id"] in ("35", "38"))
    write_map("espanya-provincies", "Espanya, províncies (Canàries desplaçades)", ign, prov, 0.02,
              "local", extra=inset)

    muni = topo_features(os.path.join(es, "municipalities.json"), "municipalities")
    cat = [f for f in muni if f["id"][:2] in ("08", "17", "25", "43")]
    rows = open(os.path.join(SRC, "idescat-municipis.ssv"), encoding="utf-8-sig").read().splitlines()
    to_comarca, names = {}, {}
    for line in rows:
        parts = line.split(";")
        if len(parts) >= 4 and parts[0].isdigit():
            to_comarca[parts[0][:5]] = (parts[2], parts[3])
            names[parts[0][:5]] = parts[1]
    groups, missing = {}, []
    for f in cat:
        if f["id"] in names:
            f["name"] = names[f["id"]]
        if f["id"] in to_comarca:
            groups.setdefault(to_comarca[f["id"]], []).append(f["geom"])
        else:
            missing.append(f["id"])
    if missing:
        print("municipalities without comarca:", missing)
    comarques = [{"id": code, "name": name, "geom": unary_union(gs).buffer(0.0005).buffer(-0.0005)}
                 for (code, name), gs in groups.items()]
    credit = "IGN/CNIG (CC BY 4.0) · Idescat"
    write_map("catalunya-comarques", "Catalunya, comarques", credit, comarques, 0.002, "local")
    write_map("catalunya-municipis", "Catalunya, municipis", credit, cat, 0.003, "local")
    prov_cat = [f for f in prov if f["id"] in ("08", "17", "25", "43")]
    write_map("catalunya-provincies", "Catalunya, províncies", ign, prov_cat, 0.004, "local")


build_icons()
build_maps()
