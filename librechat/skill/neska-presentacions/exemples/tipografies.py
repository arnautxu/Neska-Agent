"""Type specimen: every family the decks can use, at title size, with its voice.

Builds exemples/tipografies.png, which the agent opens when it chooses the type for a world.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
from neska_pdf import RES, render  # noqa: E402

GROUPS = [("serif", "Serifes"), ("slab", "Egípcies"), ("sans", "Sans"), ("condensed", "Condensades"),
          ("display", "De cartell"), ("mono", "Monoespaiades"), ("hand", "De mà"), ("pixel", "Píxel")]
catalog = json.load(open(os.path.join(RES, "fonts", "catalog.json"), encoding="utf-8"))


def weight(f):
    w = f["weights"]
    if any(" " in x for x in w):
        lo, hi = (int(v) for v in w[0].split())
        return min(800, hi) if f["group"] in ("sans", "condensed", "display") else 400
    return int(max(w, key=int)) if f["group"] in ("condensed", "display") else int(w[0]) if len(w) == 1 else 400


items = []
for g, title in GROUPS:
    for f in catalog:
        if f["group"] == g:
            items.append((title, f))

PER = 7
slides = []
for i in range(0, len(items), PER):
    chunk = items[i:i + PER]
    rows = "".join(
        f'<div class="row"><div class="name">{f["family"]}<span>{title} · '
        f'{"variable " + f["weights"][0].replace(" ", "–") if f["variable"] else (f["weights"][0] if len(f["weights"]) == 1 else min(f["weights"]) + "–" + max(f["weights"]))}'
        f'{" · cursiva" if f["italic"] else ""}</span></div><div class="r">'
        f'<div class="spec" style="font-family:\'{f["family"]}\';font-weight:{weight(f)}">Vendre l\'oli · 48 %</div>'
        f'<div class="voice">{f["voice"]}</div></div></div>'
        for title, f in chunk)
    slides.append(f'<section class="slide"><div class="folio">Tipografies {i // PER + 1}/{-(-len(items) // PER)}</div>{rows}</section>')

html = """<style>
  :root { --text: "Instrument Sans", sans-serif; }
  .slide { padding: 32px 48px; }
  .row { display: flex; gap: 24px; border-bottom: 1px solid var(--line); padding: 6px 0; height: 90px;
         box-sizing: border-box; }
  .name { width: 250px; flex: none; font-size: 20px; font-weight: 600; line-height: 1.2; }
  .name span { display: block; font-size: 18px; font-weight: 400; color: var(--muted); }
  .r { flex: 1; }
  .spec { font-size: 40px; line-height: 1.1; white-space: nowrap; }
  .voice { font-size: 18px; color: var(--muted); margin-top: 2px; white-space: nowrap; }
  .folio { position: absolute; right: 48px; bottom: 30px; font-size: 18px; color: var(--muted); }
</style>""" + "".join(slides)

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/tipografies.pdf"
    print(render(html, out, sheet=out.replace(".pdf", ".png")))
