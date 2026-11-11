"""Neska slide decks as PDF: HTML/CSS in, PDF out, plus a contact sheet to look at.

    import sys; sys.path.insert(0, "/mnt/data/skills/neska-presentacions/scripts")
    from neska_pdf import render, bars, hbars, line

    html = '''<section class="slide">...</section> ...'''
    print(render(html, "/tmp/presentacio.pdf"))

render() lays the deck out with WeasyPrint at 1280x720 px per slide, writes the PDF, draws
every slide into one PNG contact sheet (default /mnt/data/revisio-diapositives.png) and
returns a Report with the problems it can measure: text that leaves the slide or its box,
text that collides with other text, text that is too small, low contrast, slides that spill
onto an extra page, and emoji. Problems are outlined in red on the sheet. Looking at the
sheet is still the real check: the report only catches mechanical faults.

bars(), hbars() and line() return inline SVG charts drawn with the deck's own colours and
fonts, so a chart looks like it belongs to the slide instead of a spreadsheet.
"""

from __future__ import annotations

import html as _html
import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field

SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if not os.path.exists("/etc/fonts/fonts.conf"):  # the sandbox has no Fontconfig setup
    os.environ.setdefault("FONTCONFIG_FILE", os.path.join(SCRIPTS, "fonts.conf"))
SLIDE_W, SLIDE_H = 1280, 720
MIN_TEXT_PX = 18
SAFE = 28  # px of the slide edge that text never touches
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]")


@dataclass
class Problem:
    slide: int
    what: str
    box: tuple | None = None  # x, y, w, h in slide px

    def __str__(self) -> str:
        return f"Diapositiva {self.slide}: {self.what}" if self.slide else f"Tota la presentació: {self.what}"


@dataclass
class Report:
    pdf: str
    sheet: str | None
    slides: int
    problems: list = field(default_factory=list)
    slide_images: list = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.problems

    def __str__(self) -> str:
        head = f"{self.slides} diapositives -> {self.pdf}"
        if self.sheet:
            head += f"\nFull de revisió: {self.sheet} (obre'l amb read_file i mira'l)"
        if not self.problems:
            return head + "\nNo he trobat problemes mesurables. Mira el full igualment."
        lines = [head, f"{len(self.problems)} problemes (marcats en vermell al full):"]
        lines += [f"- {p}" for p in self.problems]
        return "\n".join(lines)


# ---------------------------------------------------------------- render


def render(html: str, pdf: str = "/tmp/presentacio.pdf",
           sheet: str | None = "/mnt/data/revisio-diapositives.png",
           slides_dir: str | None = None, forcar: bool = False) -> Report:
    """Lay out `html` (a whole document or just the <section class="slide"> elements).

    The final render (sheet=None) refuses to leave a PDF while measurable problems remain,
    unless forcar=True: a deck is never delivered with a problem the reviewer already saw."""
    from weasyprint import CSS, HTML
    from weasyprint.text.fonts import FontConfiguration

    if os.path.isfile(html):
        with open(html, encoding="utf-8") as fh:
            html = fh.read()
    if "<html" not in html.lower():
        html = f'<!doctype html><html lang="ca"><head><meta charset="utf-8"></head><body>{html}</body></html>'

    html = _resolve_svg_vars(html)
    fonts = FontConfiguration()
    sheets = [CSS(string=_font_faces(html), base_url=os.path.join(RES, "fonts") + "/", font_config=fonts),
              CSS(filename=os.path.join(SCRIPTS, "base.css"), font_config=fonts)]
    doc = HTML(string=html, base_url=SCRIPTS + "/").render(stylesheets=sheets, font_config=fonts)
    os.makedirs(os.path.dirname(os.path.abspath(pdf)), exist_ok=True)
    doc.write_pdf(pdf)

    problems: list[Problem] = []
    declared = len(re.findall(r'<section[^>]*class="[^"]*\bslide\b', html))
    if declared and len(doc.pages) > declared:
        problems.append(Problem(len(doc.pages), f"hi ha {len(doc.pages)} pàgines però {declared} "
                                "diapositives: algun contingut no hi cap i ha passat a una pàgina nova"))
    for n, page in enumerate(doc.pages, 1):
        problems += _check_page(n, page)
    for ch in sorted(set(EMOJI.findall(_strip_tags(html)))):
        problems.append(Problem(0, f"hi ha un emoji ({ch}); fes servir text o una forma dibuixada"))
    for fam in _missing_families(html):
        problems.append(Problem(0, f"la lletra «{fam}» no està instal·lada i surt una de substitució; "
                                   "tria'n una de exemples/tipografies.png"))

    if sheet is None and problems and not forcar:
        os.remove(pdf)
        raise RuntimeError("No lliuro el PDF: encara hi ha problemes. Corregeix-los i torna-hi.\n"
                           + "\n".join(f"- {p}" for p in problems))

    images = _rasterise(pdf, slides_dir)
    sheet_path = _contact_sheet(images, problems, sheet) if sheet and images else None
    return Report(pdf=pdf, sheet=sheet_path, slides=len(doc.pages), problems=problems,
                  slide_images=images if slides_dir else [])


def _font_faces(html: str) -> str:
    """Only the @font-face rules of the families the deck names (and base.css's defaults):
    WeasyPrint loads every declared face, and loading all of them costs seconds per render."""
    with open(os.path.join(RES, "fonts", "fonts.css"), encoding="utf-8") as fh:
        rules = [line for line in fh if line.startswith("@font-face")]
    text = (html + open(os.path.join(SCRIPTS, "base.css"), encoding="utf-8").read()).lower()
    keep = [r for r in rules if re.search(r'font-family: "([^"]+)"', r).group(1).lower() in text]
    return "".join(keep)


GENERIC = {"serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "inherit", "initial",
           "unset", "math", "emoji", "ui-serif", "ui-sans-serif", "ui-monospace"}


def _missing_families(html: str) -> list[str]:
    """Families the deck asks for (directly or through a custom property) that are not installed."""
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, flags=re.S | re.I))
    css += "\n".join(re.findall(r'style="([^"]*)"', html))
    tokens = dict(re.findall(r"(--[\w-]+)\s*:\s*([^;}]+)", css))
    values = []
    for v in re.findall(r"font(?:-family)?\s*:\s*([^;}\n]+)", css):
        values.append(v)
        values += [tokens.get(name, "") for name in re.findall(r"var\((--[\w-]+)", v)]
    with open(os.path.join(RES, "fonts", "catalog.json"), encoding="utf-8") as fh:
        have = {f["family"].lower() for f in json.load(fh)}
    missing = []
    for v in values:  # only the first family of each list: the rest are fallbacks
        first = re.match(r"\s*[\"']([^\"']+)[\"']", v)
        name = first and first.group(1)
        if name and name.lower() not in have and name.lower() not in GENERIC and name not in missing:
            missing.append(name)
    return missing


def _tokens(html: str) -> dict:
    """Custom properties from base.css and every :root block in the deck (last one wins)."""
    with open(os.path.join(SCRIPTS, "base.css"), encoding="utf-8") as fh:
        css = fh.read()
    css += "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, flags=re.S | re.I))
    tokens = {}
    for block in re.findall(r":root\s*\{(.*?)\}", css, flags=re.S):
        for name, value in re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", block):
            tokens[name] = value.strip()
    return tokens


def _resolve_svg_vars(html: str) -> str:
    """WeasyPrint's SVG renderer ignores CSS custom properties: inline them inside <svg>."""
    tokens = _tokens(html)

    def value(name, fallback=None, depth=0):
        v = tokens.get(name, fallback or "")
        return _VAR.sub(lambda m: value(m.group(1), m.group(2), depth + 1), v) if depth < 5 else v

    def fix_svg(m):
        return _VAR.sub(lambda v: value(v.group(1), v.group(2)).replace('"', "'"), m.group(0))

    return re.sub(r"<svg\b.*?</svg>", fix_svg, html, flags=re.S | re.I)


_VAR = re.compile(r"var\((--[\w-]+)\s*(?:,\s*([^()]*))?\)")


def _strip_tags(text: str) -> str:
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.S | re.I)
    return re.sub(r"<[^>]+>", " ", text)


# ---------------------------------------------------------------- checks


def _walk(box, ancestors=()):
    yield box, ancestors
    for child in getattr(box, "children", None) or ():
        yield from _walk(child, ancestors + (box,))


def _positioned(boxes) -> bool:
    return any(getattr(b, "style", None) is not None and b.style["position"] in ("absolute", "fixed", "relative")
               for b in boxes)


def _rgba(color):
    if color is None:
        return None
    try:
        r, g, b, a = color
    except (TypeError, ValueError):
        return None
    return r, g, b, a


def _luminance(rgb):
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _contrast(fg, bg):
    a, b = sorted((_luminance(fg), _luminance(bg)), reverse=True)
    return (a + 0.05) / (b + 0.05)


def _background(ancestors):
    for box in reversed(ancestors):
        c = _rgba(box.style["background_color"])
        if c and c[3] > 0.5:
            return c[:3]
        if box.style["background_image"] and any(i[0] != "none" for i in box.style["background_image"] if isinstance(i, tuple)):
            return None  # image or gradient: can't judge
    return (1.0, 1.0, 1.0)


def _is_bleed(ancestors) -> bool:
    for a in ancestors:
        el = getattr(a, "element", None)
        if el is not None and "bleed" in (el.get("class") or "").split():
            return True
    return False


def _check_page(n: int, page) -> list[Problem]:
    from weasyprint.formatting_structure import boxes as B

    out: list[Problem] = []
    texts = []
    under = []  # texts that a later or positioned graphic could cover
    graphics = []  # (order, rect, positioned) of pictures, icons and maps that may paint over text
    order = 0
    for box, anc in _walk(page._page_box):
        order += 1
        if isinstance(box, B.ReplacedBox) and box.width and box.height:
            z = box.style["z_index"]
            if not (isinstance(z, int) and z < 0):
                graphics.append((order, (box.position_x, box.position_y, box.width, box.height),
                                 _positioned(anc + (box,))))
            continue
        if not isinstance(box, B.TextBox) or not box.text.strip():
            continue
        x, y, w, h = box.position_x, box.position_y, box.width, box.height
        line_box = next((a for a in reversed(anc) if isinstance(a, B.LineBox)), None)
        if line_box is not None:  # the line's own height, not the font's ascent+descent
            y, h = line_box.position_y, line_box.height
        size = box.style["font_size"]
        snippet = box.text.strip()[:40]
        rect = (x, y, w, h)
        if _is_bleed(anc):
            continue  # deliberate bleed: type cut by the slide edge, checked by eye
        texts.append((rect, box, anc))
        under.append((order, rect, _positioned(anc), snippet))
        if x < -1 or y < -1 or x + w > SLIDE_W + 1 or y + h > SLIDE_H + 1:
            out.append(Problem(n, f"el text «{snippet}» surt de la diapositiva", rect))
            continue
        for a in reversed(anc):
            if isinstance(a, (B.LineBox, B.InlineBox)):
                continue
            if a.style["height"] != "auto" or a.style["overflow"] == "hidden":
                bx, by = a.content_box_x(), a.content_box_y()
                bw, bh = a.width, a.height
                is_slide = a.element is not None and "slide" in (a.element.get("class") or "").split()
                if is_slide:
                    # Folios and bleeds may sit in the padding; only the outer safe area is off limits.
                    if x < SAFE or y < SAFE or x + w > SLIDE_W - SAFE or y + h > SLIDE_H - SAFE:
                        out.append(Problem(n, f"el text «{snippet}» queda enganxat a la vora (menys de {SAFE}px)", rect))
                elif (y + h > by + bh + 2 or x + w > bx + bw + 2) and a.element_tag not in ("html", "body"):
                    out.append(Problem(n, f"el text «{snippet}» no cap dins la seva caixa", rect))
                break
        if size < MIN_TEXT_PX - 0.1:
            out.append(Problem(n, f"lletra massa petita ({size:.0f}px, mínim {MIN_TEXT_PX}px) a «{snippet}»", rect))
        fg = _rgba(box.style["color"])
        bg = _background(anc)
        if fg and bg:
            ratio = _contrast(fg[:3], bg)
            bold = box.style["font_weight"] >= 600
            large = size >= 32 or (bold and size >= 24)
            need = 3.0 if large else 4.5
            if ratio < need:
                out.append(Problem(n, f"poc contrast ({ratio:.1f}:1, cal {need}:1) a «{snippet}»", rect))

    # A picture, icon or map that collides with text. Only a positioned graphic placed before
    # the text is a deliberate background; anything else that overlaps is a layout accident
    # (a flow element spilling over its neighbour, or a graphic painted on top).
    for t_order, (x, y, w, h), t_pos, snippet in under:
        for g_order, g, g_pos in graphics:
            if g_pos and g_order < t_order:
                continue
            ix = min(x + w, g[0] + g[2]) - max(x, g[0])
            iy = min(y + h, g[1] + g[3]) - max(y, g[1])
            if ix > 6 and iy > h * 0.3:
                out.append(Problem(n, f"un gràfic i el text «{snippet}» es trepitgen", (x, y, w, h)))
                break

    # Two graphics that only partly overlap: side-by-side charts, icons or maps colliding.
    # A graphic laid mostly over another (a texture behind a chart) is deliberate.
    for i, (_, a, _) in enumerate(graphics):
        for _, b, _ in graphics[i + 1:]:
            ix = min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0])
            iy = min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1])
            if ix > 6 and iy > 6 and ix * iy < 0.5 * min(a[2] * a[3], b[2] * b[3]):
                union = (min(a[0], b[0]), min(a[1], b[1]), max(a[0] + a[2], b[0] + b[2]) - min(a[0], b[0]),
                         max(a[1] + a[3], b[1] + b[3]) - min(a[1], b[1]))
                out.append(Problem(n, f"dos gràfics es trepitgen ({ix:.0f}px d'amplada)", union))

    # Text from different blocks drawn on top of each other.
    def block_of(anc):
        for a in reversed(anc):
            if not isinstance(a, (B.LineBox, B.InlineBox)):
                return id(a)
        return None

    seen = set()
    for i, (r1, b1, a1) in enumerate(texts):
        for r2, b2, a2 in texts[i + 1:]:
            if block_of(a1) == block_of(a2):
                continue
            ix = min(r1[0] + r1[2], r2[0] + r2[2]) - max(r1[0], r2[0])
            iy = min(r1[1] + r1[3], r2[1] + r2[3]) - max(r1[1], r2[1])
            if ix > 4 and iy > min(r1[3], r2[3]) * 0.35:
                key = (b1.text.strip()[:20], b2.text.strip()[:20])
                if key in seen:
                    continue
                seen.add(key)
                union = (min(r1[0], r2[0]), min(r1[1], r2[1]),
                         max(r1[0] + r1[2], r2[0] + r2[2]) - min(r1[0], r2[0]),
                         max(r1[1] + r1[3], r2[1] + r2[3]) - min(r1[1], r2[1]))
                out.append(Problem(n, f"«{key[0]}» i «{key[1]}» es trepitgen", union))
    return out


# ---------------------------------------------------------------- pictures


def _rasterise(pdf: str, slides_dir: str | None, dpi: int = 48) -> list[str]:
    """One PNG per slide (dpi 48 -> 640x360). Uses pdftoppm, else pypdfium2."""
    out_dir = slides_dir or tempfile.mkdtemp(prefix="neska-slides-")
    os.makedirs(out_dir, exist_ok=True)
    if slides_dir:
        dpi = 96  # full size for close looks
    prefix = os.path.join(out_dir, "diapositiva")
    if shutil.which("pdftoppm"):
        subprocess.run(["pdftoppm", "-r", str(dpi), "-png", pdf, prefix], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(pdf)
        for i, page in enumerate(doc, 1):
            page.render(scale=dpi / 72).to_pil().save(f"{prefix}-{i:02d}.png")
    return sorted(os.path.join(out_dir, f) for f in os.listdir(out_dir)
                  if f.startswith("diapositiva") and f.endswith(".png"))


def _contact_sheet(images: list[str], problems: list[Problem], path: str) -> str:
    from PIL import Image, ImageDraw

    cols = 2 if len(images) <= 8 else 3
    tile_w = 640 if cols == 2 else 520
    tile_h = round(tile_w * SLIDE_H / SLIDE_W)
    gap, label = 16, 26
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tile_w + (cols + 1) * gap,
                              rows * (tile_h + label) + (rows + 1) * gap), (226, 222, 216))
    draw = ImageDraw.Draw(sheet)
    scale = tile_w / SLIDE_W
    for i, img_path in enumerate(images):
        col, row = i % cols, i // cols
        x0 = gap + col * (tile_w + gap)
        y0 = gap + row * (tile_h + label + gap)
        with Image.open(img_path) as im:
            sheet.paste(im.convert("RGB").resize((tile_w, tile_h)), (x0, y0 + label))
        mine = [p for p in problems if p.slide == i + 1]
        draw.text((x0, y0 + 6), f"{i + 1}" + (f"  ·  {len(mine)} problemes" if mine else ""),
                  fill=(176, 0, 0) if mine else (60, 56, 52))
        for p in mine:
            if p.box:
                bx, by, bw, bh = p.box
                draw.rectangle([x0 + bx * scale - 2, y0 + label + by * scale - 2,
                                x0 + (bx + bw) * scale + 2, y0 + label + (by + bh) * scale + 2],
                               outline=(220, 0, 0), width=3)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    sheet.save(path)
    return path


# ---------------------------------------------------------------- charts


def _fmt(v, unit):
    s = f"{v:,.1f}" if isinstance(v, float) and not float(v).is_integer() else f"{int(round(v)):,}"
    s = s.replace(",", "·").replace(".", ",").replace("·", ".")  # 12.345,5 (Catalan)
    return s + unit


def _esc(t) -> str:
    return _html.escape(str(t))


def bars(labels, values, highlight=None, unit="", width=1104, height=400, ghost=None,
         color="var(--accent)", rest="var(--line)", ink="var(--ink)", muted="var(--muted)",
         font="var(--text)") -> str:
    """Vertical bars with values on top. `highlight` = index (or list) drawn in `color`;
    the others use `rest`. With highlight=None every bar uses `color`. `ghost` = indices of
    targets or forecasts, drawn as a dashed outline (never mix them up with real data)."""
    n = len(values)
    hl = set([highlight] if isinstance(highlight, int) else (highlight or []))
    gh = set([ghost] if isinstance(ghost, int) else (ghost or []))
    top, bottom = 44, 44
    plot_h = height - top - bottom
    vmax = max(values) or 1
    slot = width / n
    bar_w = min(slot * 0.62, 120)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
             f'viewBox="0 0 {width} {height}" style="font-family:{font}">']
    for i, (lab, v) in enumerate(zip(labels, values)):
        h = plot_h * v / vmax
        x = i * slot + (slot - bar_w) / 2
        y = top + plot_h - h
        on = (not hl) or i in hl
        fill = color if on else rest
        if i in gh:
            parts.append(f'<rect x="{x + 1:.1f}" y="{y + 1:.1f}" width="{bar_w - 2:.1f}" height="{max(h - 2, 0):.1f}" '
                         f'style="fill:none;stroke:{color if on else muted};stroke-width:2;stroke-dasharray:8 6"/>')
        else:
            parts.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{h:.1f}" style="fill:{fill}"/>')
        parts.append(f'<text x="{x + bar_w / 2:.1f}" y="{y - 12:.1f}" text-anchor="middle" '
                     f'style="font-size:22px;font-weight:{600 if on and hl else 500};fill:{ink if on else muted}">{_esc(_fmt(v, unit))}</text>')
        parts.append(f'<text x="{x + bar_w / 2:.1f}" y="{height - 12}" text-anchor="middle" '
                     f'style="font-size:20px;fill:{muted}">{_esc(lab)}</text>')
    parts.append(f'<line x1="0" x2="{width}" y1="{top + plot_h + 0.5}" y2="{top + plot_h + 0.5}" style="stroke:{ink};stroke-width:1"/>')
    parts.append("</svg>")
    return "".join(parts)


def share(parts, highlight=0, unit=" %", width=1104, height=88,
          color="var(--accent)", rest="var(--line)", ink="var(--ink)", muted="var(--muted)",
          on_color="var(--on-accent)", font="var(--text)") -> str:
    """One bar split into shares (100 %). `parts` = [(label, value), ...]; the highlighted share
    is drawn in `color` with its value inside, the others in `rest`. Labels go underneath."""
    total = sum(v for _, v in parts) or 1
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height + 44}" '
           f'viewBox="0 0 {width} {height + 44}" style="font-family:{font}">']
    x = 0.0
    for i, (lab, v) in enumerate(parts):
        w = width * v / total
        on = i == highlight
        out.append(f'<rect x="{x:.1f}" y="0" width="{max(w - 3, 0):.1f}" height="{height}" style="fill:{color if on else rest}"/>')
        if w > 90:
            out.append(f'<text x="{x + 18:.1f}" y="{height / 2 + 12:.1f}" style="font-size:{34 if on else 26}px;'
                       f'font-weight:600;fill:{on_color if on else ink}">{_esc(_fmt(v, unit))}</text>')
        out.append(f'<text x="{x:.1f}" y="{height + 34}" style="font-size:20px;fill:{ink if on else muted}">{_esc(lab)}</text>')
        x += w
    out.append("</svg>")
    return "".join(out)


def hbars(labels, values, highlight=None, unit="", width=1104, row=56, label_w=300,
          color="var(--accent)", rest="var(--line)", ink="var(--ink)", muted="var(--muted)",
          font="var(--text)") -> str:
    """Horizontal bars, one row per label, value at the end of each bar. Best for ranking."""
    n = len(values)
    hl = set([highlight] if isinstance(highlight, int) else (highlight or []))
    height = n * row
    vmax = max(values) or 1
    plot_w = width - label_w - 120
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
             f'viewBox="0 0 {width} {height}" style="font-family:{font}">']
    for i, (lab, v) in enumerate(zip(labels, values)):
        y = i * row
        w = plot_w * v / vmax
        on = (not hl) or i in hl
        parts.append(f'<text x="0" y="{y + row * 0.62:.1f}" style="font-size:22px;fill:{ink if on else muted}">{_esc(lab)}</text>')
        parts.append(f'<rect x="{label_w}" y="{y + row * 0.2:.1f}" width="{w:.1f}" height="{row * 0.6:.1f}" style="fill:{color if on else rest}"/>')
        parts.append(f'<text x="{label_w + w + 14:.1f}" y="{y + row * 0.62:.1f}" '
                     f'style="font-size:22px;font-weight:{600 if on and hl else 500};fill:{ink if on else muted}">{_esc(_fmt(v, unit))}</text>')
    parts.append("</svg>")
    return "".join(parts)


def line(labels, series: dict, highlight=None, unit="", width=1104, height=400, area=False,
         marks=None, end_labels=None, color="var(--accent)", rest="var(--muted)",
         fill="var(--tint)", ink="var(--ink)", muted="var(--muted)", font="var(--text)") -> str:
    """Lines over time. `series` = {"name": [values]}; `highlight` = the series name drawn in
    `color` (others in `rest`, thinner). `area=True` fills under the highlighted line (profiles,
    accumulations). `marks` = {index: "text"} annotates points of the highlighted line. The last
    value of each line is labelled directly (`end_labels=False` to skip it; default: only when
    there is more than one series)."""
    names = list(series)
    hl = highlight or names[0]
    if end_labels is None:
        end_labels = len(names) > 1
    top, bottom = 56 if marks else 30, 44
    right = 170 if end_labels else 24
    plot_w, plot_h = width - right, height - top - bottom
    vals = [v for s in series.values() for v in s]
    vmin, vmax = min(0, min(vals)), max(vals) or 1
    n = len(labels)

    def pt(i, v):
        return (i * plot_w / max(n - 1, 1), top + plot_h - plot_h * (v - vmin) / (vmax - vmin))

    base_y = top + plot_h
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
             f'viewBox="0 0 {width} {height}" style="font-family:{font}">']
    for name in sorted(names, key=lambda s: s == hl):
        on = name == hl
        pts = [pt(i, v) for i, v in enumerate(series[name])]
        d = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        if on and area:
            parts.append(f'<polygon points="{pts[0][0]:.1f},{base_y} {d} {pts[-1][0]:.1f},{base_y}" style="fill:{fill}"/>')
        parts.append(f'<polyline points="{d}" style="fill:none;stroke:{color if on else rest};'
                     f'stroke-width:{5 if on else 2};stroke-linejoin:round;stroke-linecap:round"/>')
        if end_labels:
            lx, ly = pts[-1]
            parts.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="{6 if on else 4}" style="fill:{color if on else rest}"/>')
            parts.append(f'<text x="{lx + 14:.1f}" y="{ly + 7:.1f}" style="font-size:20px;font-weight:{600 if on else 400};'
                         f'fill:{ink if on else muted}">{_esc(_fmt(series[name][-1], unit))} {_esc(name)}</text>')
        if on and marks:
            for i, text in marks.items():
                mx, my = pts[i]
                anchor = "start" if mx < plot_w * 0.15 else ("end" if mx > plot_w * 0.85 else "middle")
                parts.append(f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="9" style="fill:{color};stroke:#FFFFFF;stroke-width:3"/>')
                parts.append(f'<text x="{mx:.1f}" y="{my - 22:.1f}" text-anchor="{anchor}" '
                             f'style="font-size:22px;font-weight:600;fill:{ink}">{_esc(text)}</text>')
    parts.append(f'<line x1="0" x2="{plot_w}" y1="{base_y + 0.5}" y2="{base_y + 0.5}" style="stroke:{ink};stroke-width:1"/>')
    step = max(1, n // 8)
    for i in range(0, n, step):
        x, _ = pt(i, vmin)
        anchor = "start" if i == 0 else ("end" if i == n - 1 else "middle")
        parts.append(f'<text x="{x:.1f}" y="{height - 12}" text-anchor="{anchor}" style="font-size:20px;fill:{muted}">{_esc(labels[i])}</text>')
    parts.append("</svg>")
    return "".join(parts)


# Icons, maps, pictograms and photo treatments live in neska_recursos; re-exported here so a
# deck needs one import.
from neska_recursos import (RES, anell, apilades, bandera, calendari, calor, cascada,  # noqa: E402,F401
                            embut, foto, icon, icones, interval, lloc, mapa, mapa_noms, minigrafic,
                            pendent, pictograma, trama, treemap)
