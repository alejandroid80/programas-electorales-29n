#!/usr/bin/env python3
"""Genera una infografia vertical con las leyes y reformas clave de la XIV y XV legislaturas."""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

S = 2  # supersampling para bordes y tipografia suaves
W, H = 1080, 1350

PAPER = "#F7F5F0"
INK = "#16233A"
MUTED = "#5E6875"
BORDER = "#E4DED4"
RED = "#B5232A"
PURPLE = "#6C3A8E"
TEAL = "#0E7C7B"
GREEN = "#2E9E6B"
GOLD = "#E4B23C"
BAND14 = "#1B2A44"
BAND15 = "#123B3C"
WHITE = "#FFFFFF"

FONT_REG = "/usr/share/fonts/lato-fonts/Lato-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/lato-fonts/Lato-Bold.ttf"
FONT_BLACK = "/usr/share/fonts/lato-fonts/Lato-Black.ttf"

DATA_14 = [
    ("Ingreso Mínimo Vital", "JUN 2020", "Renta mínima estatal para hogares sin ingresos: gran ampliación de la protección social."),
    ("Nueva ley de educación (LOMLOE)", "DIC 2020", "Deroga la LOMCE y refuerza la escuela pública, la inclusión y la formación profesional."),
    ("Eutanasia regulada", "MAR 2021", "Ley Orgánica 3/2021: se despenaliza la eutanasia y se regula el derecho a morir dignamente."),
    ("Reforma laboral", "DIC 2021", "RDL 32/2021: desaparece el contrato por obra, se potencia el indefinido y vuelve la ultraactividad."),
    ("Ley del «solo sí es sí»", "SEP 2022", "Ley Orgánica 10/2022: el consentimiento pasa a ser el centro de los delitos sexuales."),
    ("Ley de Memoria Democrática", "OCT 2022", "Ley 20/2022: sustituye a la de Memoria Histórica y declara ilegal la dictadura franquista."),
    ("Ley trans y nueva ley del aborto", "FEB 2023", "Derechos trans sin informes psicológicos ni hormonación obligatoria; aborto en la sanidad pública."),
    ("Ley por el Derecho a la Vivienda", "MAY 2023", "Ley 12/2023: limitación de alquileres en zonas tensionadas y control a grandes tenedores."),
]

DATA_15 = [
    ("Reforma del artículo 49", "FEB 2024", "Tercera reforma constitucional: «personas con discapacidad» sustituye a «disminuidos»."),
    ("Ley de amnistía", "JUN 2024", "Ley Orgánica 1/2024 para la normalización institucional, política y social en Cataluña."),
    ("Renovación del CGPJ y el TC", "JUL 2024", "Acuerdo PSOE-PP que desbloquea el Consejo General del Poder Judicial tras cinco años."),
    ("Ley de paridad", "AGO 2024", "Ley Orgánica 2/2024: paridad en las listas electorales y presencia equilibrada en los órganos de decisión."),
    ("Reforma de la Justicia", "ENE 2025", "Ley Orgánica 1/2025 de eficiencia del Servicio Público de Justicia: más oralidad y digitalización."),
    ("Decretos de vivienda", "OCT 2026", "RDL 29/2026, vivienda asequible: convalidado por la Resolución 23755, de 12-11-2026 (BOE 283); RDL 28/2026, derogado."),
]

NOTE_15 = "Sin Presupuestos Generales del Estado en toda la legislatura: rigieron las cuentas de 2023."


def px(v: int) -> int:
    return int(round(v * S))


def font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    path = {"regular": FONT_REG, "bold": FONT_BOLD, "black": FONT_BLACK}[weight]
    return ImageFont.truetype(path, px(size))


def text_width(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont) -> float:
    bbox = draw.textbbox((0, 0), text, font=f)
    return (bbox[2] - bbox[0]) / S


def rounded(draw: ImageDraw.ImageDraw, xy, radius: int, fill, outline=None, width=1):
    box = tuple(px(v) for v in xy)
    draw.rounded_rectangle(box, radius=px(radius), fill=fill, outline=outline, width=px(width) if outline else 1)


def line(draw, xy, fill, width=1):
    draw.line(tuple(px(v) for v in xy), fill=fill, width=px(width))


def put(draw, xy, text, f, fill, anchor=None):
    draw.text((px(xy[0]), px(xy[1])), text, font=f, fill=fill, anchor=anchor)


def fit(draw, text, f, max_width: float) -> str:
    if text_width(draw, text, f) <= max_width:
        return text
    out = text
    while out and text_width(draw, out + "...", f) > max_width:
        out = out[:-1]
    print(f"AVISO: texto recortado -> {text}", file=sys.stderr)
    return out.rstrip() + "..."


def draw_section(draw, y_band, title, subtitle, band_color, accent, accent2, items, y_start, step, height, roman):
    rounded(draw, (48, y_band, 1032, y_band + 58), 14, band_color)
    rounded(draw, (48, y_band, 53, y_band + 58), 3, accent)
    rounded(draw, (1027, y_band, 1032, y_band + 58), 3, accent2)

    put(draw, (72, y_band + 8), title, font(27, "black"), WHITE)
    put(draw, (72, y_band + 35), subtitle, font(15), "#C8D2DF" if band_color == BAND14 else "#BFD8D5")

    ghost = font(56, "black")
    put(draw, (1004, y_band + 1), roman, ghost, "#2A3A57" if band_color == BAND14 else "#20504F", anchor="ra")

    for i, (name, date, desc) in enumerate(items, 1):
        y = y_start + (i - 1) * step
        rounded(draw, (48, y, 1032, y + height), 12, WHITE, BORDER, 1)
        rounded(draw, (48, y + 8, 53, y + height - 8), 3, accent)

        # numero
        rounded(draw, (66, y + 12, 104, y + height - 12), 9, accent)
        put(draw, (85, y + 12 + (height - 24) / 2), f"{i:02d}", font(15, "black"), WHITE, anchor="mm")

        # fecha
        df = font(14, "bold")
        dw = text_width(draw, date, df)
        rounded(draw, (1008 - dw - 22, y + 10, 1008, y + 32), 7, "#F2E8D3" if accent == RED else "#DCEEEA")
        put(draw, (1008 - dw - 11, y + 15), date, df, "#8A5B12" if accent == RED else "#0B6361")

        put(draw, (120, y + 9), fit(draw, name, font(23, "bold"), 870 - dw), font(23, "bold"), INK)
        put(draw, (120, y + 36), fit(draw, desc, font(15), 880), font(15), MUTED)


def main():
    out = Path(__file__).resolve().parents[1] / "assets" / "resumen-legislativo-coalicion.png"
    out.parent.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGB", (px(W), px(H)), PAPER)
    d = ImageDraw.Draw(img)

    # bandera discreta arriba
    d.rectangle((0, 0, px(360), px(10)), fill=RED)
    d.rectangle((px(360), 0, px(720), px(10)), fill=GOLD)
    d.rectangle((px(720), 0, px(W), px(10)), fill=RED)

    put(d, (48, 40), "RESUMEN LEGISLATIVO / ESPAÑA", font(17, "black"), RED)
    put(d, (48, 74), "Dos legislaturas de", font(52, "black"), INK)
    put(d, (48, 132), "gobierno de coalición", font(52, "black"), INK)
    put(d, (48, 199), "Leyes y reformas clave - XIV y XV legislatura (2020-2026)", font(18), MUTED)

    # insignia XIV / XV
    rounded(d, (846, 62, 1032, 176), 16, "#EDE8DE")
    put(d, (939, 96), "XIV", font(38, "black"), RED, anchor="mm")
    put(d, (939, 144), "XV", font(38, "black"), TEAL, anchor="mm")
    line(d, (874, 120, 1004, 120), "#D2CABC", 1)
    put(d, (939, 182), "COALICIÓN", font(12, "bold"), MUTED, anchor="ma")

    line(d, (48, 232, 1032, 232), BORDER, 2)

    draw_section(d, 248, "XIV LEGISLATURA", "DIC 2019 - MAY 2023  /  PSOE + UNIDAS PODEMOS",
                 BAND14, RED, PURPLE, DATA_14, 318, 63, 56, "XIV")

    draw_section(d, 826, "XV LEGISLATURA", "AGO 2023 - OCT 2026  /  PSOE + SUMAR",
                 BAND15, TEAL, GREEN, DATA_15, 896, 59, 54, "XV")

    # nota final
    ny = 896 + len(DATA_15) * 59 + 8
    rounded(d, (48, ny, 1032, ny + 44), 12, "#EDE8DE")
    put(d, (66, ny + 14), NOTE_15, font(16, "bold"), INK)

    line(d, (48, 1314, 1032, 1314), BORDER, 1)
    put(d, (48, 1323), "Fuentes: BOE, Congreso de los Diputados y La Moncloa. Selección de hitos, no exhaustiva.", font(13), MUTED)

    img = img.resize((W, H), Image.Resampling.LANCZOS)
    img.save(out, optimize=True)
    print(out)


if __name__ == "__main__":
    main()
