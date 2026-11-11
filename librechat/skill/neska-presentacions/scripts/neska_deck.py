"""Neska deck builder: editorial PowerPoint decks with python-pptx.

Usage (inside the code sandbox):

    import sys; sys.path.insert(0, "/mnt/data/skills/neska-presentacions/scripts")
    from neska_deck import Deck

    d = Deck(title="Pla de llançament", author="Equip Neska")
    d.cover("Pla de llançament", "Tardor 2026", kicker="Proposta")
    d.agenda(["On som", "Què proposem", "Números", "Calendari"])
    d.section("01", "On som", "El punt de partida en dues diapositives")
    d.bullets("Tres raons per fer-ho ara", ["Clients: ens ho demanen", "Marge: el doble", "Equip: ja hi és"])
    d.cards("Què inclou", [("Web", "Botiga pròpia amb 12 productes"), ("Enviaments", "48 h a tot el país")])
    d.stat("+38%", "vendes respecte al trimestre passat", note="Font: CRM, oct. 2026")
    d.stats("El primer any", [("91.700 €", "vendes"), ("1.900", "comandes"), ("45%", "marge")])
    d.chart("Les vendes es multipliquen per 4", ["Gen", "Feb", "Mar"], {"2026": [10, 12, 18]},
            takeaway="El Nadal duplica la venda mensual")
    d.table("Pressupost", [["Partida", "Import"], ["Disseny", "4.000 €"], ["Total", "4.000 €"]])
    d.timeline("Calendari", [("Nov", "Plataforma"), ("Des", "Fotos i proves"), ("Gen", "Llançament")])
    d.two_columns("Abans i després", "Abans", ["..."], "Després", ["..."])
    d.quote("Una frase que valgui la pena.", "Nom Cognom, càrrec")
    d.closing("Gràcies", "nom@empresa.cat")
    d.save("/mnt/data/pla-llancament.pptx")

Every slide takes notes="..." for speaker notes.
Style: paper-white slides with near-black type and one accent colour; cover, section,
big-number and closing slides are full-bleed colour so the deck has rhythm. No shadows,
no gradients, no clip art.
"""

from __future__ import annotations

from typing import Iterable, Sequence

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

INK = RGBColor(0x16, 0x16, 0x16)
MUTED = RGBColor(0x6A, 0x66, 0x62)
LINE = RGBColor(0xE2, 0xDE, 0xD9)
ACCENT = RGBColor(0x6B, 0x3A, 0x1E)
PAPER = RGBColor(0xFF, 0xFF, 0xFF)
TINT = RGBColor(0xF5, 0xF1, 0xEC)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
ON_DARK_MUTED = RGBColor(0xB9, 0xB3, 0xAC)

# Fonts installed on almost every computer, so the deck looks the same everywhere.
SERIF = "Georgia"
SANS = "Arial"

W, H = Inches(13.333), Inches(7.5)
M = Inches(0.75)  # outer margin
CONTENT_W = W - 2 * M


def _mix(a: RGBColor, b: RGBColor, t: float) -> RGBColor:
    """Blend colour a towards b by t (0..1)."""
    return RGBColor(*(int(a[i] + (b[i] - a[i]) * t) for i in range(3)))


class Deck:
    def __init__(self, title: str = "", author: str = "Neska", accent: RGBColor | None = None):
        self.prs = Presentation()
        self.prs.slide_width, self.prs.slide_height = W, H
        self.prs.core_properties.title = title
        self.prs.core_properties.author = author
        self.accent = accent or ACCENT
        self.soft = _mix(self.accent, PAPER, 0.72)  # light accent for secondary data
        self.footer = title
        self._n = 0

    # ---------- low-level helpers ----------
    def _slide(self, notes: str | None = None, bg: RGBColor = PAPER):
        s = self.prs.slides.add_slide(self.prs.slide_layouts[6])  # blank
        fill = s.background.fill
        fill.solid()
        fill.fore_color.rgb = bg
        self._n += 1
        if notes:
            s.notes_slide.notes_text_frame.text = notes
        return s

    def _text(self, s, x, y, w, h, text, size=18, font=SANS, color=INK, bold=False,
              align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.15, space_after=0):
        tb = s.shapes.add_textbox(int(x), int(y), int(w), int(h))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = anchor
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        lines = text if isinstance(text, list) else [text]
        for i, line in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = align
            p.line_spacing = spacing
            if space_after:
                p.space_after = Pt(space_after)
            r = p.add_run()
            r.text = line
            r.font.size = Pt(size)
            r.font.name = font
            r.font.bold = bold
            r.font.color.rgb = color
        return tb

    def _box(self, s, x, y, w, h, color):
        r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, int(x), int(y), int(w), int(h))
        r.fill.solid()
        r.fill.fore_color.rgb = color
        r.line.fill.background()
        _flat(r)
        return r

    def _rule(self, s, x, y, w, color=LINE, weight=0.75):
        # Hairlines are thin filled rectangles: connectors render as thick bars in some
        # previewers (including the chat's).
        return self._box(s, x, y, w, Pt(weight), color)

    def _kicker(self, s, x, y, text, color=None):
        """Small uppercase label with a square bullet."""
        color = color or self.accent
        self._box(s, x, y + Pt(3), Pt(7), Pt(7), color)
        self._text(s, x + Pt(15), y, Inches(8), Inches(0.3), text.upper(), 11, color=color, bold=True)

    def _chrome(self, s, dark=False):
        """Footer: deck title left, slide number right."""
        c = ON_DARK_MUTED if dark else MUTED
        if self.footer:
            self._text(s, M, H - Inches(0.48), Inches(8), Inches(0.25), self.footer, 9, color=c)
        self._text(s, W - M - Inches(1), H - Inches(0.48), Inches(1), Inches(0.25),
                   f"{self._n:02d}", 9, color=c, bold=True, align=PP_ALIGN.RIGHT)

    def _title(self, s, title, kicker=None, color=INK):
        """Title block at the top; returns the y where content can start."""
        y = Inches(0.6)
        if kicker:
            self._kicker(s, M, y, kicker)
            y += Inches(0.42)
        two_lines = len(title) > 44
        size = 30 if two_lines else 36
        h = Inches(1.1) if two_lines else Inches(0.65)
        self._text(s, M, y, CONTENT_W, h, title, size, SERIF, color=color, spacing=1.0)
        return y + h + Inches(0.5)

    # ---------- slide types ----------
    def cover(self, title: str, subtitle: str = "", kicker: str = "", notes: str | None = None,
              date: str = ""):
        """Full-bleed ink cover with an accent band."""
        s = self._slide(notes, bg=INK)
        self._box(s, 0, 0, Inches(0.28), H, self.accent)
        x = M + Inches(0.3)
        if kicker:
            self._kicker(s, x, Inches(0.8), kicker, color=WHITE)
        size = 60 if len(title) <= 34 else 48
        self._text(s, x, Inches(1.6), W - x - Inches(1.6), Inches(3.4), title, size, SERIF,
                   color=WHITE, anchor=MSO_ANCHOR.BOTTOM, spacing=0.98)
        self._box(s, x, Inches(5.3), Inches(1.0), Pt(3), self.accent)
        if subtitle:
            self._text(s, x, Inches(5.55), W - x - M, Inches(0.8), subtitle, 20, color=ON_DARK_MUTED)
        if date:
            self._text(s, W - M - Inches(3), H - Inches(0.7), Inches(3), Inches(0.3), date, 11,
                       color=ON_DARK_MUTED, align=PP_ALIGN.RIGHT)
        return s

    def agenda(self, items: Sequence[str], title: str = "Què veurem", notes: str | None = None):
        """Numbered table of contents in a two-column editorial layout."""
        s = self._slide(notes)
        self._text(s, M, Inches(0.6), Inches(4), Inches(2), title, 40, SERIF, spacing=1.0)
        self._box(s, M, Inches(1.55), Inches(0.8), Pt(3), self.accent)
        x = Inches(5.4)
        w = W - x - M
        n = len(items)
        row = min(Inches(1.0), (H - Inches(1.6)) / max(n, 1))
        for i, item in enumerate(items):
            y = Inches(0.75) + row * i
            self._text(s, x, y, Inches(0.9), row, f"{i + 1:02d}", 26, SERIF, color=self.accent)
            self._text(s, x + Inches(1.0), y + Inches(0.06), w - Inches(1.0), row, item, 22)
            self._rule(s, x, y + row - Inches(0.18), w)
        self._chrome(s)
        return s

    def section(self, number: str, title: str, subtitle: str = "", notes: str | None = None):
        """Full-bleed accent divider."""
        s = self._slide(notes, bg=self.accent)
        self._text(s, M, Inches(0.7), Inches(6), Inches(2.6), number, 150, SERIF,
                   color=_mix(self.accent, WHITE, 0.25), spacing=0.9)
        self._text(s, M, Inches(3.9), W - 2 * M, Inches(1.6), title, 48, SERIF, color=WHITE,
                   anchor=MSO_ANCHOR.BOTTOM, spacing=1.0)
        if subtitle:
            self._text(s, M, Inches(5.7), Inches(9), Inches(0.8), subtitle, 18,
                       color=_mix(self.accent, WHITE, 0.7))
        self._chrome(s, dark=True)
        return s

    def bullets(self, title: str, points: Sequence[str], kicker: str | None = None,
                notes: str | None = None):
        """Numbered points. "Lead: detail" puts the lead in bold above the detail."""
        s = self._slide(notes)
        y0 = self._title(s, title, kicker)
        n = max(1, len(points))
        avail = H - y0 - Inches(0.9)
        row = min(Inches(1.1), avail / n)
        for i, pt in enumerate(points):
            y = y0 + row * i
            self._rule(s, M, y, CONTENT_W)
            self._text(s, M, y + Inches(0.18), Inches(0.8), Inches(0.5), f"{i + 1:02d}", 20, SERIF,
                       color=self.accent)
            lead, _, detail = pt.partition(":")
            if detail.strip():
                self._text(s, M + Inches(1.0), y + Inches(0.18), Inches(3.6), row, lead.strip(), 19,
                           bold=True)
                self._text(s, M + Inches(4.8), y + Inches(0.18), CONTENT_W - Inches(4.8), row,
                           detail.strip(), 19, color=MUTED)
            else:
                self._text(s, M + Inches(1.0), y + Inches(0.18), CONTENT_W - Inches(1.0), row, pt, 21)
        self._chrome(s)
        return s

    def cards(self, title: str, items: Sequence[tuple[str, str]], kicker: str | None = None,
              notes: str | None = None):
        """2-4 tinted cards, each (heading, short text)."""
        s = self._slide(notes)
        y = self._title(s, title, kicker)
        n = max(1, min(len(items), 4))
        gap = Inches(0.3)
        cw = (CONTENT_W - gap * (n - 1)) / n
        ch = min(Inches(3.6), H - y - Inches(1.0))
        for i, (head, body) in enumerate(items[:4]):
            x = M + (cw + gap) * i
            self._box(s, x, y, cw, ch, TINT)
            self._box(s, x, y, cw, Pt(4), self.accent)
            self._text(s, x + Inches(0.35), y + Inches(0.4), Inches(1), Inches(0.5), f"{i + 1:02d}", 14,
                       color=self.accent, bold=True)
            self._text(s, x + Inches(0.35), y + Inches(0.9), cw - Inches(0.7), Inches(1.0), head, 26, SERIF,
                       spacing=1.0)
            self._text(s, x + Inches(0.35), y + Inches(1.75), cw - Inches(0.7), ch - Inches(2.0), body, 17,
                       color=MUTED, spacing=1.25)
        self._chrome(s)
        return s

    def stat(self, value: str, label: str, note: str = "", kicker: str | None = None,
             notes: str | None = None):
        """One big number on a full accent slide."""
        s = self._slide(notes, bg=self.accent)
        if kicker:
            self._kicker(s, M, Inches(0.7), kicker, color=WHITE)
        size = 180 if len(value) <= 5 else 130
        self._text(s, M, Inches(1.0), CONTENT_W, Inches(3.6), value, size, SERIF, color=WHITE,
                   anchor=MSO_ANCHOR.BOTTOM, spacing=0.85)
        self._box(s, M, Inches(4.95), Inches(1.0), Pt(3), WHITE)
        self._text(s, M, Inches(5.2), Inches(9), Inches(1.0), label, 28, SERIF, color=WHITE)
        if note:
            self._text(s, M, Inches(6.25), Inches(9), Inches(0.4), note, 12,
                       color=_mix(self.accent, WHITE, 0.7))
        self._chrome(s, dark=True)
        return s

    def stats(self, title: str, items: Sequence[tuple[str, str]], kicker: str | None = None,
              notes: str | None = None):
        """2-4 key figures side by side; the first one is highlighted."""
        s = self._slide(notes)
        y = self._title(s, title, kicker)
        n = max(1, min(len(items), 4))
        gap = Inches(0.3)
        cw = (CONTENT_W - gap * (n - 1)) / n
        ch = Inches(3.4)
        for i, (val, lab) in enumerate(items[:4]):
            x = M + (cw + gap) * i
            hi = i == 0
            self._box(s, x, y, cw, ch, self.accent if hi else TINT)
            size = 54 if max(len(v) for v, _ in items[:4]) <= 7 else 42
            self._text(s, x + Inches(0.35), y + Inches(0.35), cw - Inches(0.7), Inches(1.6), val, size, SERIF,
                       color=WHITE if hi else INK, anchor=MSO_ANCHOR.BOTTOM, spacing=0.9)
            self._rule(s, x + Inches(0.35), y + Inches(2.15), Inches(0.6), WHITE if hi else self.accent, 2)
            self._text(s, x + Inches(0.35), y + Inches(2.35), cw - Inches(0.7), Inches(0.9), lab, 16,
                       color=_mix(self.accent, WHITE, 0.8) if hi else MUTED, spacing=1.2)
        self._chrome(s)
        return s

    def two_columns(self, title: str, left_title: str, left: Sequence[str], right_title: str,
                    right: Sequence[str], notes: str | None = None):
        """Contrast slide: left column muted, right column highlighted (before/after, us/them)."""
        s = self._slide(notes)
        y = self._title(s, title)
        gap = Inches(0.3)
        cw = (CONTENT_W - gap) / 2
        ch = min(H - y - Inches(1.0), Inches(1.4) + Inches(0.72) * max(len(left), len(right)))
        for i, (ct, pts) in enumerate(((left_title, left), (right_title, right))):
            x = M + (cw + gap) * i
            hi = i == 1
            self._box(s, x, y, cw, ch, INK if hi else TINT)
            self._text(s, x + Inches(0.45), y + Inches(0.4), cw - Inches(0.9), Inches(0.4), ct.upper(), 12,
                       color=WHITE if hi else self.accent, bold=True)
            yy = y + Inches(1.0)
            for p in pts:
                self._box(s, x + Inches(0.45), yy + Inches(0.12), Pt(6), Pt(6), self.accent if not hi else WHITE)
                self._text(s, x + Inches(0.75), yy, cw - Inches(1.2), Inches(0.8), p, 18,
                           color=WHITE if hi else INK, spacing=1.15)
                yy += Inches(0.72)
        self._chrome(s)
        return s

    def chart(self, title: str, categories: Sequence[str], series: dict[str, Iterable[float]],
              kind: str = "bar", number_format: str = "#,##0", kicker: str | None = None,
              takeaway: str = "", highlight: int | None = -1, notes: str | None = None):
        """Native, editable chart. kind: bar | column | hbar | line | pie.

        With one series, bars are soft accent and `highlight` (default: the last one) is full
        accent; pass highlight=None to colour them all. `takeaway` adds a side note with the
        conclusion.
        """
        s = self._slide(notes)
        y = self._title(s, title, kicker)
        data = CategoryChartData()
        data.categories = list(categories)
        vals_list = []
        for name, vals in series.items():
            vals = list(vals)
            vals_list.append(vals)
            data.add_series(name, vals)
        ct = {
            "bar": XL_CHART_TYPE.COLUMN_CLUSTERED,
            "column": XL_CHART_TYPE.COLUMN_CLUSTERED,
            "hbar": XL_CHART_TYPE.BAR_CLUSTERED,
            "line": XL_CHART_TYPE.LINE_MARKERS,
            "pie": XL_CHART_TYPE.DOUGHNUT,
        }[kind]
        side = Inches(3.4) if takeaway else 0
        cw = CONTENT_W - side - (Inches(0.4) if takeaway else 0)
        gf = s.shapes.add_chart(ct, M, y, int(cw), int(H - y - Inches(0.85)), data)
        ch = gf.chart
        ch.has_title = False  # the slide title already says it
        ch.font.name, ch.font.size, ch.font.color.rgb = SANS, Pt(12), MUTED
        multi = len(series) > 1
        ch.has_legend = multi or kind == "pie"
        if ch.has_legend:
            ch.legend.position = XL_LEGEND_POSITION.TOP if kind != "pie" else XL_LEGEND_POSITION.RIGHT
            ch.legend.include_in_layout = False
            ch.legend.font.size = Pt(12)
        plot = ch.plots[0]
        palette = [self.accent, INK, self.soft, RGBColor(0xA6, 0xA1, 0x9B)]
        if kind == "pie":
            for i, pt in enumerate(plot.series[0].points):
                pt.format.fill.solid()
                pt.format.fill.fore_color.rgb = palette[i % len(palette)]
        else:
            for i, ser in enumerate(plot.series):
                if kind == "line":
                    ser.format.line.color.rgb = palette[i % len(palette)]
                    ser.format.line.width = Pt(3)
                    ser.smooth = False
                    ser.marker.format.fill.solid()
                    ser.marker.format.fill.fore_color.rgb = palette[i % len(palette)]
                    ser.marker.format.line.fill.background()
                    continue
                ser.format.fill.solid()
                if multi or highlight is None:
                    ser.format.fill.fore_color.rgb = palette[i % len(palette)]
                else:
                    ser.format.fill.fore_color.rgb = self.soft
                    n = len(vals_list[0])
                    idx = highlight % n if n else 0
                    pt = ser.points[idx]
                    pt.format.fill.solid()
                    pt.format.fill.fore_color.rgb = self.accent
            if kind in ("bar", "column", "hbar"):
                plot.gap_width = 45
                if not multi:
                    plot.has_data_labels = True
                    dl = plot.data_labels
                    dl.number_format = number_format
                    dl.number_format_is_linked = False
                    dl.font.size = Pt(11)
                    dl.font.color.rgb = INK
                    dl.position = XL_LABEL_POSITION.OUTSIDE_END
            va = ch.value_axis
            va.has_major_gridlines = kind == "line" or multi
            if va.has_major_gridlines:
                va.major_gridlines.format.line.color.rgb = LINE
            va.format.line.fill.background()
            va.tick_labels.number_format = number_format
            va.tick_labels.number_format_is_linked = False
            if kind in ("bar", "column", "hbar") and not multi:
                va.visible = False  # labels on the bars carry the numbers
            ch.category_axis.format.line.color.rgb = LINE
            ch.category_axis.tick_labels.font.size = Pt(12)
        if takeaway:
            x = W - M - side
            self._box(s, x, y, side, Pt(3), self.accent)
            self._text(s, x, y + Inches(0.3), side, Inches(3.5), takeaway, 22, SERIF, spacing=1.15)
        self._chrome(s)
        return s

    def table(self, title: str, rows: Sequence[Sequence[str]], col_widths: Sequence[float] | None = None,
              kicker: str | None = None, notes: str | None = None):
        """rows[0] is the header. Keep it to ~8 rows; split bigger tables. A last row starting
        with "Total" is highlighted."""
        s = self._slide(notes)
        y = self._title(s, title, kicker)
        nr, nc = len(rows), len(rows[0])
        rh = min(Inches(0.52), (H - y - Inches(1.0)) / nr)
        gt = s.shapes.add_table(nr, nc, M, int(y), CONTENT_W, int(rh * nr))
        tbl = gt.table
        tbl.first_row = True
        tbl.horz_banding = False
        if col_widths:
            tot = sum(col_widths)
            for i, cw in enumerate(col_widths):
                tbl.columns[i].width = Emu(int(CONTENT_W * cw / tot))
        elif nc == 2:
            tbl.columns[0].width = Emu(int(CONTENT_W * 0.7))
            tbl.columns[1].width = Emu(int(CONTENT_W * 0.3))
        for r in range(nr):
            tbl.rows[r].height = int(rh)
            is_total = r == nr - 1 and str(rows[r][0]).strip().lower() in ("total", "totals", "suma")
            for c in range(nc):
                cell = tbl.cell(r, c)
                cell.fill.solid()
                cell.fill.fore_color.rgb = INK if r == 0 else (TINT if is_total else PAPER)
                cell.margin_left = cell.margin_right = Inches(0.18)
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                tf = cell.text_frame
                tf.text = str(rows[r][c])
                p = tf.paragraphs[0]
                p.alignment = PP_ALIGN.RIGHT if c and _looks_numeric(rows[r][c]) else PP_ALIGN.LEFT
                if r == 0 and c and nc == 2:
                    p.alignment = PP_ALIGN.RIGHT
                f = p.runs[0].font if p.runs else p.font
                f.name = SANS
                f.size = Pt(12 if r == 0 else 15)
                f.color.rgb = WHITE if r == 0 else (self.accent if is_total else INK)
                f.bold = r == 0 or is_total
        self._chrome(s)
        return s

    def timeline(self, title: str, steps: Sequence[tuple[str, str]], kicker: str | None = None,
                 notes: str | None = None):
        """3-6 steps along a line, each (when, what)."""
        s = self._slide(notes)
        y = self._title(s, title, kicker) + Inches(0.6)
        n = max(1, min(len(steps), 6))
        seg = CONTENT_W / n
        self._rule(s, M, y + Inches(0.13), CONTENT_W, LINE, 2)
        for i, (when, what) in enumerate(steps[:6]):
            x = M + seg * i
            last = i == n - 1
            d = Inches(0.28)
            dot = s.shapes.add_shape(MSO_SHAPE.OVAL, int(x), int(y), int(d), int(d))
            dot.fill.solid()
            dot.fill.fore_color.rgb = self.accent if last else INK
            dot.line.fill.background()
            _flat(dot)
            self._text(s, x, y + Inches(0.55), seg - Inches(0.3), Inches(0.5), when.upper(), 13,
                       color=self.accent, bold=True)
            self._text(s, x, y + Inches(1.0), seg - Inches(0.35), Inches(2.4), what, 19, SERIF, spacing=1.15)
        self._chrome(s)
        return s

    def quote(self, text: str, who: str = "", notes: str | None = None):
        s = self._slide(notes, bg=TINT)
        self._text(s, M, Inches(0.5), Inches(2), Inches(2), "“", 200, SERIF, color=self.accent)
        self._text(s, M + Inches(0.1), Inches(2.3), W - 2 * M - Inches(1.5), Inches(3.2), text, 38, SERIF,
                   spacing=1.15)
        if who:
            self._rule(s, M + Inches(0.1), Inches(5.75), Inches(0.6), self.accent, 2)
            self._text(s, M + Inches(0.1), Inches(5.95), Inches(8), Inches(0.4), who, 15, color=MUTED)
        self._chrome(s)
        return s

    def image(self, title: str, path: str, caption: str = "", notes: str | None = None):
        s = self._slide(notes)
        y = self._title(s, title)
        pic = s.shapes.add_picture(path, M, int(y))
        maxw, maxh = CONTENT_W, H - y - Inches(1.1)
        r = min(maxw / pic.width, maxh / pic.height, 1.0)
        pic.width, pic.height = int(pic.width * r), int(pic.height * r)
        if caption:
            self._text(s, M, y + pic.height + Inches(0.1), maxw, Inches(0.3), caption, 11, color=MUTED)
        self._chrome(s)
        return s

    def closing(self, title: str = "Gràcies", contact: str = "", notes: str | None = None):
        s = self._slide(notes, bg=INK)
        self._box(s, 0, 0, Inches(0.28), H, self.accent)
        x = M + Inches(0.3)
        self._text(s, x, Inches(1.8), W - x - M, Inches(2.6), title, 80, SERIF, color=WHITE,
                   anchor=MSO_ANCHOR.BOTTOM, spacing=0.95)
        self._box(s, x, Inches(4.75), Inches(1.0), Pt(3), self.accent)
        if contact:
            self._text(s, x, Inches(5.0), W - x - M, Inches(0.8), contact, 20, color=ON_DARK_MUTED)
        return s

    def save(self, path: str) -> str:
        self.prs.save(path)
        return path


def _flat(shape) -> None:
    """Drop the theme style (shadow, outline) that python-pptx gives every autoshape."""
    shape.shadow.inherit = False
    style = shape._element.find("{http://schemas.openxmlformats.org/presentationml/2006/main}style")
    if style is not None:
        shape._element.remove(style)


def _looks_numeric(v) -> bool:
    t = str(v).replace(".", "").replace(",", "").replace("€", "").replace("%", "").replace(" ", "")
    t = t.lstrip("+-")
    return t.isdigit()
