"""Extract the paper's figures as high-resolution PNGs for the website.

Figures are rendered directly from the vector PDF (no screenshots), cropped to the
union of the figure's drawings, text and images above its caption.

Usage:
    python scripts/extract_figures.py PATH/TO/paper.pdf static/images

Requires PyMuPDF (`pip install pymupdf`).
"""
import sys
from pathlib import Path

import pymupdf

ZOOM = 6  # 432 dpi; ~2400 px wide for full-width figures

# (output name, 1-based page, caption prefix)
FIGURES = [
    ("fig1_teaser", 2, "Figure 1"),
    ("fig2_pipeline", 5, "Figure 2"),
    ("fig4_benchfill", 8, "Figure 4"),
]
# Figures 6 and 7 (fig6_first_round.png, fig7_multi_round.png) are NOT extracted from the PDF:
# the site uses the regenerated larger-font versions of the same plots (see README).

# Figure 5 panels (page 35): title text -> (column, row). Used as static fallbacks
# in the explorer for benchmarks whose item-level difficulties are not bundled.
FIG5_LAYOUT = [
    ["AIME26", "AMC23", "MATH-500"],
    ["OlympiadBench", "Gaokao2023en", "GPQA-Diamond"],
    ["ScienceQA", "HumanEval", "CORE-Bench Hard"],
    ["SWE-bench-Mini", "GAIA", "USACO"],
    ["IFEval", "MedQA", "MMLU-Pro-Biology"],
    ["MMLU-Pro-Chemistry", "MMLU-Pro-Physics", "BBH-3 objects"],
    ["BBH-5 objects", "BBH-7 objects", "ZebraLogic"],
]
FIG5_COLS = [(134.0, 250.0), (256.0, 372.0), (378.0, 494.0)]  # axes x-extent (pt)
FIG5_ROW_TOP = [101.7, 170.3, 238.8, 307.3, 375.8, 444.4, 512.9]  # title tops (pt)


def figure_bbox(page, caption_prefix):
    blocks = page.get_text("blocks")
    cap_y = next(b[1] for b in blocks if b[4].startswith(caption_prefix))
    prev = [b[3] for b in blocks if b[4].startswith(("Figure", "Table")) and b[3] < cap_y]
    y_top = max(prev) + 2 if prev else 60
    rects = [dr["rect"] for dr in page.get_drawings()
             if dr["rect"].y0 >= y_top and dr["rect"].y1 <= cap_y and dr["rect"].width < 600]
    rects += [pymupdf.Rect(b[:4]) for b in blocks if b[1] >= y_top and b[3] <= cap_y]
    for im in page.get_images(full=True):
        rects += [r for r in page.get_image_rects(im[0]) if r.y0 >= y_top and r.y1 <= cap_y]
    bb = rects[0]
    for r in rects[1:]:
        bb |= r
    return bb + (-3, -3, 3, 3)


def slug(name):
    return name.lower().replace(" ", "-")


def main(pdf_path, out_dir):
    out = Path(out_dir)
    (out / "fig5").mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    mat = pymupdf.Matrix(ZOOM, ZOOM)
    for name, pno, cap in FIGURES:
        page = doc[pno - 1]
        bb = figure_bbox(page, cap)
        page.get_pixmap(matrix=mat, clip=bb, alpha=False).save(out / f"{name}.png")
        print(name, [round(v, 1) for v in bb])
        if name == "fig1_teaser":
            # Split the two panels at the vertical dashed divider for mobile layouts.
            mid = 321.5
            for suffix, clip in (("a", pymupdf.Rect(bb.x0, bb.y0, mid - 1, bb.y1)),
                                 ("b", pymupdf.Rect(mid + 2, bb.y0, bb.x1, bb.y1))):
                page.get_pixmap(matrix=mat, clip=clip, alpha=False).save(out / f"{name}_{suffix}.png")

    page = doc[34]
    for r, row in enumerate(FIG5_LAYOUT):
        y0 = FIG5_ROW_TOP[r] - 1
        y1 = (FIG5_ROW_TOP[r + 1] - 1) if r + 1 < len(FIG5_ROW_TOP) else 598.0
        for c, title in enumerate(row):
            x0, x1 = FIG5_COLS[c]
            clip = pymupdf.Rect(x0 - 8 if c == 0 else x0, y0, x1, y1)
            page.get_pixmap(matrix=mat, clip=clip, alpha=False).save(out / "fig5" / f"{slug(title)}.png")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
