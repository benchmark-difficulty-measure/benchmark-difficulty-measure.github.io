# BenchFill project page

Project website for the paper **Your Benchmark Is an Empirical Measure Over Difficulty**
(Yifan Sun\*, Naicheng Yu\*, Jiawen Gong\*, Jingyan Shen, Huan Zhang; \*equal contribution).

- Website (after deployment): https://naicheng-yu.github.io/Benchfill-Website/
- Code: https://github.com/ASTRAL-Group/benchmark-difficulty-measure

This is a plain static site with no build step. It runs from the repository root on GitHub Pages
and uses relative paths only, so it works under the `/Benchfill-Website/` sub-path.

## Structure

```
index.html                 single page; all text content lives here
static/css/style.css       styles
static/js/main.js          math rendering, nav, copy-to-clipboard, lightbox, tabs, paper tables
static/js/charts.js        interactive figures (ECDF explorer, gap-filling before/after, Table 2 chart)
static/data/benchmarks.js  Table 1 metrics + normalized item difficulties   (generated)
static/data/gapfill.js     Table 2 values + BenchFill gap/insertion data     (generated)
static/images/             figures rendered from the paper PDF, icons, social preview image
static/images/fig5/        per-benchmark panels of paper Figure 5 (explorer fallback)
static/pdf/                hosted copy of the paper
scripts/extract_figures.py re-render figures from the paper PDF
scripts/build_data.py      regenerate static/data/*.js from the code release
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

- **All displayed numbers come from the final paper.** Table 1 (25 benchmarks), Table 2,
  Table 11, Table 12, and Table 13 are transcribed into `scripts/build_data.py` / `static/js/main.js`
  / `index.html`.
- **ECDF explorer.** The item-level normalized difficulties are min-max normalized IRT
  `b_mean` estimates from `irt_results/*_difficulty.csv` in the code release. `build_data.py` bundles
  a benchmark's items only if the recomputed DDM (same-size uniform reference at bin midpoints),
  Max Gap, and Top-5 Gap Sum (endpoint gaps included) agree with Table 1 within 0.001. That holds for
  10 benchmarks: MATH-500, Minerva-Math, OlympiadBench, Gaokao2023en, AIME24, AIME25, AIME26,
  HumanEval, MBPP+, and IFEval. For the other 15, the explorer shows that benchmark's panel from
  paper Figure 5 instead of plotting new curves.
- **Gap-filling widget.** Original difficulties from the same release files, plus the 24 items in
  `new_item_records.csv` (`difficulty` and `target` divided by 10). `build_data.py` asserts that the
  recomputed Top-3 Gap Sum reduction and Target Dev. reproduce Table 2's BenchFill column; the widget
  shows only the benchmarks whose item-level data also reproduces Table 1 (AIME24, AIME25, AIME26,
  Gaokao2023en, IFEval). Table 2 and its chart show the paper's values for all eight.
- **Displayed metrics** (tiles, tables, chart) always use the paper's reported values, never recomputed ones.
- **Figures.** Rendered at 432 dpi directly from the vector paper PDF by `scripts/extract_figures.py`,
  except Figures 6 and 7, which use the regenerated larger-font versions of the same plots
  (`rebuttal_analysis/first_round/first_round_calibration_filtered.png` and
  `rebuttal_analysis/multiround/multiround_target_deviation_selected.png` in the experiment workspace).
  `extract_figures.py` leaves them untouched.
- The measure-view schematic in the "Measure View" section is illustrative and labelled as such.

To regenerate (PyMuPDF and NumPy required):

```bash
python scripts/build_data.py   ../benchfill-release static/data
python scripts/extract_figures.py ../path/to/paper.pdf static/images
```

## Things to update at release

- `index.html`: replace the grey **arXiv (soon)** button with the arXiv link (search for `TODO`) and
  update the BibTeX entry with arXiv metadata.
- `static/pdf/benchfill_paper.pdf`: replace if the paper is revised.

## Deployment

GitHub Pages serves the site from the `main` branch, repository root
(**Settings → Pages → Deploy from a branch → `main` / `(root)`**). Pushing to `main` redeploys it
within a minute or two. No GitHub Actions workflow is needed because there is no build step.
