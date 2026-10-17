"""Render the paper's figures as high-resolution PNGs for the website.

Figures 1 and 2 are cropped from the compiled paper PDF (vector, no screenshots).
Figures 4 and 5 are rendered directly from the paper's own figure files
(Fig/search.pdf and Fig/ecdf_paper.pdf in the paper repository).

Usage:
    python scripts/extract_figures.py PATH/TO/paper.pdf PATH/TO/paper/Fig static/images

Requires PyMuPDF (`pip install pymupdf`).
"""
import sys
from pathlib import Path

import pymupdf

ZOOM = 6  # 432 dpi; ~2400 px wide for full-width figures
WIDTH = 2400  # px, for figures rendered from standalone figure files

# (output name, 1-based page, caption prefix): cropped from the compiled paper
FIGURES = [
    ("fig1_teaser", 2, "Figure 1"),
    ("fig2_pipeline", 5, "Figure 2"),
]

# (output name, figure file): rendered from the paper's Fig/ directory
FIGURE_FILES = [
    ("fig4_benchfill", "search.pdf"),
    ("fig5_gap_filling", "ecdf_paper.pdf"),
]


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


def main(pdf_path, fig_dir, out_dir):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
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

    for name, fname in FIGURE_FILES:
        page = pymupdf.open(Path(fig_dir) / fname)[0]
        z = WIDTH / page.rect.width
        pix = page.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=False)
        pix.save(out / f"{name}.png")
        print(name, pix.width, pix.height)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
