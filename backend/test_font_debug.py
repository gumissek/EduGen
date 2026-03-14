"""Test script: verify Polish diacritics in xhtml2pdf output."""
from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


def _find_font_path(name):
    search_dirs = [
        Path("/usr/share/fonts"),
        Path("C:/Windows/Fonts"),
        Path("/Library/Fonts"),
        Path.home() / "Library" / "Fonts",
    ]
    for d in search_dirs:
        if not d.exists():
            continue
        for p in d.rglob(name):
            return str(p).replace("\\", "/")
    return None


def register_fonts():
    font_sets = [
        ("DejaVuSans", "DejaVuSans.ttf", "DejaVuSans-Bold.ttf",
         "DejaVuSans-Oblique.ttf", "DejaVuSans-BoldOblique.ttf"),
        ("Arial", "arial.ttf", "arialbd.ttf", "ariali.ttf", "arialbi.ttf"),
    ]
    for family, regular, bold, italic, bold_italic in font_sets:
        reg_path = _find_font_path(regular)
        if not reg_path:
            continue

        pdfmetrics.registerFont(TTFont(family, reg_path))
        bold_rlab = family
        italic_rlab = family
        bi_rlab = family

        bold_path = _find_font_path(bold)
        if bold_path:
            bold_rlab = f"{family}-Bold"
            pdfmetrics.registerFont(TTFont(bold_rlab, bold_path))
        italic_path = _find_font_path(italic)
        if italic_path:
            italic_rlab = f"{family}-Italic"
            pdfmetrics.registerFont(TTFont(italic_rlab, italic_path))
        bi_path = _find_font_path(bold_italic)
        if bi_path:
            bi_rlab = f"{family}-BoldItalic"
            pdfmetrics.registerFont(TTFont(bi_rlab, bi_path))

        pdfmetrics.registerFontFamily(
            family, normal=family, bold=bold_rlab,
            italic=italic_rlab, boldItalic=bi_rlab,
        )
        print(f"Registered: {family} (regular={reg_path})")
        return family
    return "Helvetica"


family = register_fonts()
print(f"Using font family: {family}")

from xhtml2pdf import pisa
import tempfile

html_doc = (
    f"<html><head><meta charset='utf-8'/>"
    f"<style>"
    f"@page {{ size: A4; margin: 2cm; }}"
    f"body {{ font-family: {family}; font-size: 12px; line-height: 1.5; }}"
    f"h1 {{ font-family: {family}; font-size: 20px; }}"
    f"p, li, td, th {{ font-family: {family}; }}"
    f"</style></head><body>"
    f"<h1>Test polskich znaków</h1>"
    f"<p>ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ</p>"
    f"<p>Zażółć gęślą jaźń</p>"
    f"<p><strong>Pogrubiony: żółw</strong></p>"
    f"<p><em>Kursywa: źrebię</em></p>"
    f"</body></html>"
)

tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
tmp_path = tmp.name
tmp.close()

with open(tmp_path, "wb") as f:
    result = pisa.CreatePDF(html_doc, dest=f)

print(f"PDF errors: {result.err}")
print(f"PDF saved to: {tmp_path}")

with open(tmp_path, "rb") as f:
    content = f.read()
    has_helvetica = b"/Helvetica" in content
    print(f"Contains /Helvetica: {has_helvetica}")
    if not has_helvetica:
        print("SUCCESS: No Helvetica fallback - Polish characters should render correctly!")
