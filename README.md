# Benchmark Difficulty Measure project page

Project website for the paper **Your Benchmark Is an Empirical Measure Over Difficulty**
(Yifan Sun\*, Naicheng Yu\*, Jiawen Gong\*, Jingyan Shen, Huan Zhang; \*equal contribution).

- Website (after deployment): https://benchmark-difficulty-measure.github.io/
- Code: https://github.com/ASTRAL-Group/benchmark-difficulty-measure

This is a plain static site with no build step. It runs from the repository root on GitHub Pages
and uses relative paths, supporting both the domain root and a repository sub-path.

## Structure

```
index.html                 single page; all text content lives here
static/css/style.css       styles
static/js/main.js          math rendering, nav, copy-to-clipboard, lightbox, Table 1
static/js/charts.js        interactive ECDF explorer
static/js/figure1.js       synthetic Figure 1 simulation with computed scores
static/css/figure1.css     scoped styles for the Figure 1 enhancement
static/data/benchmarks.js  Table 1 metrics + normalized item difficulties   (generated)
static/images/             paper figures, icons, social preview image
static/pdf/                hosted copy of the paper
scripts/extract_figures.py re-render figures from the paper PDF and the paper's Fig/ files
scripts/build_data.py      regenerate static/data/benchmarks.js from the code release
scripts/check_figure1.cjs  numeric checks for the synthetic Figure 1 simulation
.nojekyll                  serve files as-is on GitHub Pages
```

External runtime dependencies (loaded from CDNs, version-pinned with SRI where applicable):
KaTeX 0.16.11 (jsDelivr) for equations, Google Fonts (Google Sans, Noto Sans).
The interactive figures are hand-written SVG with no charting library.

## Local preview

```bash
# from the directory that CONTAINS benchfill-website/, to mimic the GitHub Pages sub-path:
mkdir -p /tmp/bf-serve && ln -sfn "$PWD/benchfill-website" /tmp/bf-serve/Benchfill-Website
cd /tmp/bf-serve && python3 -m http.server 8000
# open http://localhost:8000/Benchfill-Website/

# or simply, at the domain root:
cd benchfill-website && python3 -m http.server 8000   # http://localhost:8000/
```

## Data provenance

- **Interactive Figure 1.** A clearly labeled synthetic illustration with two controls:
  shift the benchmark's difficulty emphasis while keeping the model curves and target fixed,
  or move a compact local improvement across a coverage gap. The optional probe item
  demonstrates observing an improvement; it is not a BenchFill algorithm run. Scores use
  equal-weight synthetic items. The left slider restores
  the difficulty scale from 0.15 to 0.85, starting at 0.24; the target is centered at 0.76.
  A single verdict below both cards compares the benchmark model gap with the target model
  gap, labeling them “Close!” when their difference is at most 3 percentage points. Local
  improvements that the benchmark reports as +0.00 pp are highlighted as missed progress.
  The coverage example displays only the observed benchmark gain.
  A 32-second guided animation reuses these models and item locations. It first moves
  the benchmark toward the target, then grows an improvement inside the coverage gap
  and adds one probe item. Playback supports pause, replay, chapter selection, and
  scrubbing. It starts only on request, pauses in background tabs, and opens paused
  when reduced motion is preferred. Closing it preserves the sliders' current state.
  The static Figure 1 is not displayed.
  Run `node scripts/check_figure1.cjs` to verify the weighting and coverage examples.
- **AIME24 release.** Updated to 20 generated items / 50 total, matching the final paper
  and the current curated release.

- **All experimental numbers come from the final paper** (Table 1 for 25 benchmarks,
  Table 13, and the four-benchmark gap-filling figure), transcribed into `scripts/build_data.py`, `static/js/main.js`, and `index.html`.
- **ECDF explorer.** Item-level difficulties are min-max normalized IRT `b_mean` estimates from the
  release's Difficulty Artifact (`data/benchmarks/<benchmark>/difficulty.csv`). `build_data.py`
  bundles a benchmark's items only if the recomputed DDM (same-size uniform reference at bin
  midpoints), Max Gap, and Top-5 Gap Sum (endpoint gaps included) agree with Table 1 within 0.001.
  All 25 benchmarks currently pass.
- **Displayed metrics** (tiles, tables, chart) always use the paper's reported values, never recomputed ones.
- **Figures.** Figures 1 and 2 are cropped at 432 dpi from the vector paper PDF; Figure 4
  (`Fig/search.pdf`) and the four-benchmark gap-filling figure (`Fig/ecdf_paper.pdf`) are rendered
  from the paper's own figure files. `scripts/extract_figures.py` does both.
- **Results focus.** The page highlights the four released gap-filled benchmarks: AIME24, AIME25,
  AIME26, and AMC23, followed by representative generated items. The eight-benchmark Table 2
  comparison is not displayed.
- **Augmented benchmark table.** Counts of original (`-origin-`) and generated (`-fill-`) items in
  the release's `data/filled_benchs/*.json`.

To regenerate (PyMuPDF and NumPy required):

```bash
python scripts/build_data.py      ../benchfill-release static/data
python scripts/extract_figures.py ../path/to/paper.pdf ../benchmark-paper-overleaf/Fig static/images
```

## Things to update at release

- `index.html`: replace the grey **arXiv (soon)** button with the arXiv link (search for `TODO`) and
  update the BibTeX entry with arXiv metadata.
- `static/pdf/benchfill_paper.pdf`: replace if the paper is revised.

## Deployment

GitHub Pages serves the site from the `main` branch, repository root
(**Settings → Pages → Deploy from a branch → `main` / `(root)`**). Pushing to `main` redeploys it
after GitHub completes its deployment workflow. No GitHub Actions workflow is needed because there is no build step.
