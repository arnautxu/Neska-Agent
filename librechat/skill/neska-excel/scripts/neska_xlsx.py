"""Neska Excel helpers (openpyxl + pandas).

    import sys; sys.path.insert(0, "/mnt/data/skills/neska-excel/scripts")
    from neska_xlsx import describe, style_table, add_chart

describe(path)            -> text overview of every sheet (size, headers, formulas, sample rows)
style_table(ws, ...)      -> Neska look: bold header, hairline borders, number formats, widths, frozen header, filter
add_chart(ws, ...)        -> native Excel chart from a range
"""

from __future__ import annotations

from openpyxl import load_workbook
from openpyxl.chart import BarChart, LineChart, PieChart, Reference
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

INK = "161616"
ACCENT = "6B3A1E"
TINT = "F6F2EE"
LINE = "D9D6D2"
SERIES = [ACCENT, INK, "B08A6E", "8C8C8C"]


def describe(path: str, sample_rows: int = 5) -> str:
    """Overview of a workbook without losing formulas (reads it twice: formulas and cached values)."""
    wb_f = load_workbook(path, data_only=False)
    wb_v = load_workbook(path, data_only=True)
    out = []
    for ws in wb_f.worksheets:
        wv = wb_v[ws.title]
        n_formulas = sum(
            1 for row in ws.iter_rows() for c in row if isinstance(c.value, str) and c.value.startswith("=")
        )
        out.append(f"## Full «{ws.title}»: {ws.max_row} files x {ws.max_column} columnes, "
                   f"{n_formulas} fórmules, rang {ws.dimensions}")
        if ws.merged_cells.ranges:
            out.append(f"   cel·les combinades: {len(ws.merged_cells.ranges)}")
        for r, row in enumerate(wv.iter_rows(values_only=True), start=1):
            if r > sample_rows + 1:
                break
            out.append("   " + " | ".join("" if v is None else str(v) for v in row))
    return "\n".join(out)


def style_table(ws, header_row: int = 1, first_col: int = 1, last_col: int | None = None,
                last_row: int | None = None, number_formats: dict[str, str] | None = None,
                freeze: bool = True, autofilter: bool = True) -> None:
    """number_formats maps a column letter to a format, e.g. {"C": '#,##0.00 €', "D": '0.0%'}."""
    last_col = last_col or ws.max_column
    last_row = last_row or ws.max_row
    thin = Side(style="thin", color=LINE)
    for c in range(first_col, last_col + 1):
        cell = ws.cell(header_row, c)
        cell.font = Font(bold=True, color=ACCENT, name="Arial")
        cell.fill = PatternFill("solid", fgColor=TINT)
        cell.border = Border(bottom=Side(style="medium", color=ACCENT))
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    for r in range(header_row + 1, last_row + 1):
        for c in range(first_col, last_col + 1):
            cell = ws.cell(r, c)
            cell.font = Font(color=INK, name="Arial")
            cell.border = Border(bottom=thin)
    for col, fmt in (number_formats or {}).items():
        for r in range(header_row + 1, last_row + 1):
            ws[f"{col}{r}"].number_format = fmt
    for c in range(first_col, last_col + 1):
        letter = get_column_letter(c)
        width = max((len(str(ws.cell(r, c).value or "")) for r in range(header_row, last_row + 1)), default=8)
        ws.column_dimensions[letter].width = min(max(10, width + 2), 50)
    ws.row_dimensions[header_row].height = 24
    if freeze:
        ws.freeze_panes = ws.cell(header_row + 1, first_col)
    if autofilter:
        ws.auto_filter.ref = f"{get_column_letter(first_col)}{header_row}:{get_column_letter(last_col)}{last_row}"
    ws.sheet_view.showGridLines = False


def add_chart(ws, kind: str, title: str, data_cols: tuple[int, int], cat_col: int, header_row: int,
              last_row: int, anchor: str = "H2", y_title: str | None = None):
    """kind: bar | line | pie. data_cols is (first, last) column index, header row included as series names."""
    chart = {"bar": BarChart, "line": LineChart, "pie": PieChart}[kind]()
    chart.title = title
    if kind == "bar":
        chart.type, chart.gapWidth = "col", 60
    data = Reference(ws, min_col=data_cols[0], max_col=data_cols[1], min_row=header_row, max_row=last_row)
    cats = Reference(ws, min_col=cat_col, min_row=header_row + 1, max_row=last_row)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    if kind != "pie":
        for i, s in enumerate(chart.series):
            color = SERIES[i % len(SERIES)]
            if kind == "line":
                s.graphicalProperties.line.solidFill = color
                s.graphicalProperties.line.width = 28000
            else:
                s.graphicalProperties.solidFill = color
                s.graphicalProperties.line.solidFill = color
        if y_title:
            chart.y_axis.title = y_title
    chart.width, chart.height = 18, 9
    ws.add_chart(chart, anchor)
    return chart
