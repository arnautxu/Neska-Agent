"""Neska deck builder: clean, editorial PowerPoint decks with python-pptx.

Usage (inside the code sandbox):

    import sys; sys.path.insert(0, "/mnt/data/skills/neska-presentacions/scripts")
    from neska_deck import Deck

    d = Deck(title="Pla de llançament", author="Equip Neska")
    d.cover("Pla de llançament", "Tardor 2026", kicker="Proposta")
    d.section("01", "On som")
    d.bullets("El que hem après", ["Punt u", "Punt dos", "Punt tres"])
    d.stat("+38%", "vendes respecte al trimestre passat", note="Font: CRM, oct. 2026")
    d.chart("Vendes per mes", ["Gen", "Feb", "Mar"], {"2025": [10, 12, 9], "2026": [14, 15, 18]})
    d.table("Pressupost", [["Partida", "Import"], ["Disseny", "4.000 €"], ["Web", "6.500 €"]])
    d.two_columns("Abans i després", "Abans", ["..."], "Després", ["..."])
    d.quote("Una frase que valgui la pena.", "Nom Cognom, càrrec")
    d.closing("Gràcies", "nom@empresa.cat")
    d.save("/mnt/data/pla-llançament.pptx")

Every slide gets speaker notes when you pass notes="...".
Style: white background, near-black text, one brown accent, generous space,
hairline rules, no shadows, no gradients, no clip art.
"""

from __future__ import annotations

from typing import Iterable, Sequence

from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Inches, Pt

INK = RGBColor(0x16, 0x16, 0x16)
MUTED = RGBColor(0x5C, 0x5C, 0x5C)
LINE = RGBColor(0xD9, 0xD6, 0xD2)
ACCENT = RGBColor(0x6B, 0x3A, 0x1E)
PAPER = RGBColor(0xFF, 0xFF, 0xFF)
TINT = RGBColor(0xF6, 0xF2, 0xEE)
SERIES = [ACCENT, INK, RGBColor(0xB0, 0x8A, 0x6E), RGBColor(0x8C, 0x8C, 0x8C)]

# Fonts installed on almost every computer, so the deck looks the same everywhere.
SERIF = "Georgia"
SANS = "Arial"

W, H = Inches(13.333), Inches(7.5)
M = Inches(0.8)  # outer margin


class Deck:
    def __init__(self, title: str = "", author: str = "Neska", accent: RGBColor | None = None):
        self.prs = Presentation()
        self.prs.slide_width, self.prs.slide_height = W, H
        self.prs.core_properties.title = title
        self.prs.core_properties.author = author
        self.accent = accent or ACCENT
        self.footer = title
        self._n = 0

    # ---------- low-level helpers ----------
    def _slide(self, notes: str | None = None, tint: bool = False):
        s = self.prs.slides.add_slide(self.prs.slide_layouts[6])  # blank
        bg = s.background.fill
        bg.solid()
        bg.fore_color.rgb = TINT if tint else PAPER
        self._n += 1
        if notes:
            s.notes_slide.notes_text_frame.text = notes
        return s

    def _text(self, s, x, y, w, h, text, size=18, font=SANS, color=INK, bold=False,
              align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.15):
        tb = s.shapes.add_textbox(x, y, w, h)
        tf = tb.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = anchor
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        lines = text if isinstance(text, list) else [text]
        for i, line in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = align
            p.line_spacing = spacing
            r = p.add_run()
            r.text = line
            r.font.size = Pt(size)
            r.font.name = font
            r.font.bold = bold
            r.font.color.rgb = color
        return tb

    def _rule(self, s, x, y, w, color=LINE, weight=0.75):
        ln = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x, y, x + w, y)
        ln.line.color.rgb = color
        ln.line.width = Pt(weight)
        return ln

    def _chrome(self, s):
        """Footer: deck title left, slide number right, hairline above."""
        self._rule(s, M, H - Inches(0.62), W - 2 * M)
        if self.footer:
            self._text(s, M, H - Inches(0.5), Inches(8), Inches(0.3), self.footer, 10, color=MUTED)
        self._text(s, W - M - Inches(1), H - Inches(0.5), Inches(1), Inches(0.3),
                   f"{self._n:02d}", 10, color=MUTED, align=PP_ALIGN.RIGHT)

    def _title(self, s, title, kicker=None):
        y = M
        if kicker:
            self._text(s, M, y, Inches(8), Inches(0.3), kicker.upper(), 11, color=self.accent, bold=True)
            y += Inches(0.4)
        self._text(s, M, y, W - 2 * M, Inches(1.0), title, 34, SERIF)
        return y + Inches(1.15)

    # ---------- slide types ----------
    def cover(self, title: str, subtitle: str = "", kicker: str = "", notes: str | None = None):
        s = self._slide(notes)
        bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, M, M, Inches(0.12), Inches(0.12))
        bar.fill.solid(); bar.fill.fore_color.rgb = self.accent; bar.line.fill.background()
        if kicker:
            self._text(s, M + Inches(0.3), M - Inches(0.04), Inches(8), Inches(0.3), kicker.upper(), 12,
                       color=self.accent, bold=True)
        self._text(s, M, Inches(2.4), W - 2 * M, Inches(2.4), title, 60, SERIF, anchor=MSO_ANCHOR.BOTTOM,
                   spacing=1.0)
        self._rule(s, M, Inches(5.1), Inches(1.4), self.accent, 1.5)
        if subtitle:
            self._text(s, M, Inches(5.35), W - 2 * M, Inches(1), subtitle, 20, color=MUTED)
        return s

    def section(self, number: str, title: str, notes: str | None = None):
        s = self._slide(notes, tint=True)
        self._text(s, M, Inches(2.2), Inches(3), Inches(1.4), number, 80, SERIF, color=self.accent)
        self._text(s, M, Inches(3.8), W - 2 * M, Inches(1.5), title, 44, SERIF)
        return s

    def bullets(self, title: str, points: Sequence[str], kicker: str | None = None,
                notes: str | None = None):
        s = self._slide(notes)
        y = self._title(s, title, kicker)
        size = 22 if len(points) <= 4 else 18
        gap = Inches(0.85) if len(points) <= 4 else Inches(0.62)
        for i, pt in enumerate(points):
            self._text(s, M, y + i * gap, Inches(0.6), Inches(0.5), f"{i + 1:02d}", 13,
                       color=self.accent, bold=True)
            self._text(s, M + Inches(0.7), y + i * gap - Inches(0.04), W - 2 * M - Inches(0.7),
                       gap, pt, size)
        self._chrome(s)
        return s

    def stat(self, value: str, label: str, note: str = "", kicker: str | None = None,
             notes: str | None = None):
        s = self._slide(notes)
        if kicker:
            self._text(s, M, M, Inches(8), Inches(0.3), kicker.upper(), 11, color=self.accent, bold=True)
        self._text(s, M, Inches(1.6), W - 2 * M, Inches(2.6), value, 140, SERIF, color=self.accent,
                   anchor=MSO_ANCHOR.BOTTOM, spacing=0.9)
        self._text(s, M, Inches(4.5), Inches(9), Inches(1.2), label, 26)
        if note:
            self._text(s, M, Inches(5.8), Inches(9), Inches(0.4), note, 12, color=MUTED)
        self._chrome(s)
        return s

    def stats(self, title: str, items: Sequence[tuple[str, str]], notes: str | None = None):
        """Up to 4 (value, label) pairs side by side."""
        s = self._slide(notes)
        y = self._title(s, title)
        n = max(1, len(items))
        col = (W - 2 * M) / n
        for i, (val, lab) in enumerate(items):
            x = M + int(col * i)
            self._rule(s, x, y + Inches(0.3), int(col) - Inches(0.3), self.accent if i == 0 else LINE, 1.25)
            self._text(s, x, y + Inches(0.5), int(col) - Inches(0.3), Inches(1.3), val, 54, SERIF)
            self._text(s, x, y + Inches(1.9), int(col) - Inches(0.4), Inches(1.2), lab, 16, color=MUTED)
        self._chrome(s)
        return s

    def two_columns(self, title: str, left_title: str, left: Sequence[str], right_title: str,
                    right: Sequence[str], notes: str | None = None):
        s = self._slide(notes)
        y = self._title(s, title)
        cw = (W - 2 * M - Inches(0.6)) / 2
        for i, (ct, pts) in enumerate(((left_title, left), (right_title, right))):
            x = M + int((cw + Inches(0.6)) * i)
            self._text(s, x, y, int(cw), Inches(0.4), ct.upper(), 12, color=self.accent, bold=True)
            self._rule(s, x, y + Inches(0.45), int(cw))
            self._text(s, x, y + Inches(0.65), int(cw), Inches(3.5), [f"— {p}" for p in pts], 18,
                       spacing=1.35)
        self._chrome(s)
        return s

    def chart(self, title: str, categories: Sequence[str], series: dict[str, Iterable[float]],
              kind: str = "bar", number_format: str = "#,##0", kicker: str | None = None,
              notes: str | None = None):
        """kind: bar | column | line | pie. Native, editable PowerPoint chart."""
        s = self._slide(notes)
        y = self._title(s, title, kicker)
        data = CategoryChartData()
        data.categories = list(categories)
        for name, vals in series.items():
            data.add_series(name, list(vals))
        ct = {
            "bar": XL_CHART_TYPE.COLUMN_CLUSTERED,
            "column": XL_CHART_TYPE.COLUMN_CLUSTERED,
            "hbar": XL_CHART_TYPE.BAR_CLUSTERED,
            "line": XL_CHART_TYPE.LINE_MARKERS,
            "pie": XL_CHART_TYPE.DOUGHNUT,
        }[kind]
        gf = s.shapes.add_chart(ct, M, y, W - 2 * M, H - y - Inches(0.9), data)
        ch = gf.chart
        ch.font.name, ch.font.size, ch.font.color.rgb = SANS, Pt(12), MUTED
        ch.has_legend = len(series) > 1 or kind == "pie"
        if ch.has_legend:
            ch.legend.position = XL_LEGEND_POSITION.TOP
            ch.legend.include_in_layout = False
        plot = ch.plots[0]
        if kind == "pie":
            for i, pt in enumerate(plot.series[0].points):
                pt.format.fill.solid(); pt.format.fill.fore_color.rgb = SERIES[i % len(SERIES)]
        else:
            for i, ser in enumerate(plot.series):
                color = SERIES[i % len(SERIES)]
                if kind == "line":
                    ser.format.line.color.rgb = color
                    ser.format.line.width = Pt(2.5)
                    ser.smooth = False
                else:
                    ser.format.fill.solid(); ser.format.fill.fore_color.rgb = color
            if kind in ("bar", "column", "hbar"):
                plot.gap_width = 60
            va = ch.value_axis
            va.has_major_gridlines = True
            va.major_gridlines.format.line.color.rgb = LINE
            va.format.line.fill.background()
            va.tick_labels.number_format = number_format
            va.tick_labels.number_format_is_linked = False
            ch.category_axis.format.line.color.rgb = LINE
        self._chrome(s)
        return s

    def table(self, title: str, rows: Sequence[Sequence[str]], col_widths: Sequence[float] | None = None,
              notes: str | None = None):
        """rows[0] is the header. Keep it to ~8 rows; split bigger tables."""
        s = self._slide(notes)
        y = self._title(s, title)
        nr, nc = len(rows), len(rows[0])
        rh = Inches(0.5)
        gt = s.shapes.add_table(nr, nc, M, y, W - 2 * M, rh * nr)
        tbl = gt.table
        tbl.first_row = True
        if col_widths:
            tot = sum(col_widths)
            for i, cw in enumerate(col_widths):
                tbl.columns[i].width = Emu(int((W - 2 * M) * cw / tot))
        for r in range(nr):
            for c in range(nc):
                cell = tbl.cell(r, c)
                cell.fill.solid()
                cell.fill.fore_color.rgb = PAPER if r else TINT
                cell.margin_left = cell.margin_right = Inches(0.12)
                tf = cell.text_frame
                tf.text = str(rows[r][c])
                p = tf.paragraphs[0]
                p.alignment = PP_ALIGN.RIGHT if c and _looks_numeric(rows[r][c]) else PP_ALIGN.LEFT
                f = p.runs[0].font if p.runs else p.font
                f.name, f.size, f.color.rgb = SANS, Pt(14 if r else 12), INK if r else ACCENT
                is_total = r == nr - 1 and str(rows[r][0]).strip().lower() in ("total", "totals", "suma")
                f.bold = r == 0 or is_total
                if is_total:
                    cell.fill.fore_color.rgb = TINT
        self._chrome(s)
        return s

    def quote(self, text: str, who: str = "", notes: str | None = None):
        s = self._slide(notes, tint=True)
        self._text(s, M, Inches(1.2), Inches(1), Inches(1), "“", 120, SERIF, color=self.accent)
        self._text(s, M + Inches(0.2), Inches(2.4), W - 2 * M - Inches(1.5), Inches(3), text, 36, SERIF,
                   spacing=1.2)
        if who:
            self._text(s, M + Inches(0.2), Inches(5.6), Inches(8), Inches(0.4), who, 14, color=MUTED)
        return s

    def image(self, title: str, path: str, caption: str = "", notes: str | None = None):
        s = self._slide(notes)
        y = self._title(s, title)
        pic = s.shapes.add_picture(path, M, y)
        maxw, maxh = W - 2 * M, H - y - Inches(1.1)
        r = min(maxw / pic.width, maxh / pic.height, 1.0)
        pic.width, pic.height = int(pic.width * r), int(pic.height * r)
        if caption:
            self._text(s, M, y + pic.height + Inches(0.1), maxw, Inches(0.3), caption, 11, color=MUTED)
        self._chrome(s)
        return s

    def closing(self, title: str = "Gràcies", contact: str = "", notes: str | None = None):
        s = self._slide(notes)
        self._text(s, M, Inches(2.4), W - 2 * M, Inches(2), title, 72, SERIF, anchor=MSO_ANCHOR.BOTTOM)
        self._rule(s, M, Inches(4.7), Inches(1.4), self.accent, 1.5)
        if contact:
            self._text(s, M, Inches(4.95), W - 2 * M, Inches(0.6), contact, 18, color=MUTED)
        return s

    def save(self, path: str) -> str:
        self.prs.save(path)
        return path


def _looks_numeric(v) -> bool:
    t = str(v).replace(".", "").replace(",", "").replace("€", "").replace("%", "").replace(" ", "")
    t = t.lstrip("+-")
    return t.isdigit()
