"""Build the static data files used by the website's interactive figures.

Reads the official BenchFill code release (IRT difficulties and the 24 released
gap-filling items) and writes two JavaScript data files:

  static/data/benchmarks.js  - Table 1 metrics for all 25 benchmarks, plus normalized
                               item difficulties for benchmarks whose released IRT
                               estimates reproduce Table 1 exactly.
  static/data/gapfill.js     - Table 2 values for the 8 benchmarks, plus original difficulties,
                               top-3 gaps, targets and the three BenchFill items (the widget
                               only displays benchmarks whose items reproduce Table 1).

The paper is the source of truth for every displayed metric. This script recomputes
the metrics from the released difficulties and refuses to bundle item-level data
for a benchmark unless it matches the paper (Table 1 within 0.001; Table 2
BenchFill reduction to two decimals).

Usage:
    python scripts/build_data.py PATH/TO/benchfill-release static/data
"""
import csv
import json
import sys
from pathlib import Path

import numpy as np

# ----- Paper, Table 1 (DDM, Max Gap, Top-5 Sum, #items) and Table 3 (domain) -----
TABLE1 = [
    # name, domain, DDM, MaxGap, Top5, n, release key
    ("MATH-500", "Math", 0.164, 0.058, 0.175, 500, "math-500"),
    ("Minerva-Math", "Math", 0.122, 0.031, 0.149, 272, "minerva_math"),
    ("OlympiadBench", "Math", 0.064, 0.048, 0.142, 675, "olympiadbench"),
    ("Gaokao2023en", "Math", 0.088, 0.055, 0.183, 385, "gaokao2023en"),
    ("AMC23", "Math", 0.088, 0.175, 0.528, 40, "amc23"),
    ("AIME24", "Math", 0.077, 0.179, 0.502, 30, "aime24"),
    ("AIME25", "Math", 0.079, 0.158, 0.492, 30, "aime25"),
    ("AIME26", "Math", 0.085, 0.119, 0.507, 30, "aime26"),
    ("HumanEval", "Coding", 0.148, 0.165, 0.423, 164, "humaneval"),
    ("MBPP+", "Coding", 0.163, 0.049, 0.214, 378, "mbpp"),
    ("GAIA", "Agentic Tasks", 0.084, 0.051, 0.218, 165, None),
    ("CORE-Bench Hard", "Agentic Tasks", 0.036, 0.113, 0.363, 45, None),
    ("SWE-bench-Mini", "Agentic Tasks", 0.053, 0.149, 0.469, 50, None),
    ("USACO", "Agentic Tasks", 0.080, 0.082, 0.354, 307, None),
    ("MMLU-Pro-Biology", "Science", 0.125, 0.043, 0.176, 717, "mmlu_bio"),
    ("MMLU-Pro-Chemistry", "Science", 0.114, 0.072, 0.192, 1132, None),
    ("MMLU-Pro-Physics", "Science", 0.121, 0.035, 0.157, 1299, None),
    ("GPQA-Diamond", "Science", 0.080, 0.066, 0.263, 198, None),
    ("ScienceQA", "Science", 0.178, 0.045, 0.175, 4241, None),
    ("IFEval", "Instruction Following", 0.159, 0.046, 0.190, 541, "ifeval"),
    ("BBH-3 objects", "Logic", 0.090, 0.088, 0.354, 250, "bbh_3obj"),
    ("BBH-5 objects", "Logic", 0.099, 0.128, 0.332, 250, None),
    ("BBH-7 objects", "Logic", 0.077, 0.059, 0.279, 250, None),
    ("ZebraLogic", "Logic", 0.080, 0.027, 0.127, 1000, None),
    ("MedQA", "Medicine", 0.157, 0.042, 0.178, 1273, None),
]

FULL_NAMES = {
    "SWE-bench-Mini": "SWE-bench Verified (Mini)",
    "BBH-3 objects": "BIG-Bench Hard Logical Deduction (3 objects)",
    "BBH-5 objects": "BIG-Bench Hard Logical Deduction (5 objects)",
    "BBH-7 objects": "BIG-Bench Hard Logical Deduction (7 objects)",
}

# ----- Paper, Table 2 -----
TABLE2 = [
    # name, release key, baseline, benchfill, oracle, dev_baseline, dev_benchfill
    ("AIME24", "aime24", 6.90, 35.57, 35.57, 0.057, 0.005),
    ("AIME25", "aime25", 27.44, 37.56, 37.56, 0.016, 0.005),
    ("AIME26", "aime26", 17.94, 33.04, 33.04, 0.045, 0.002),
    ("AMC23", "amc23", 24.47, 35.19, 35.78, 0.009, 0.003),
    ("Gaokao2023en", "gaokao2023en", 11.45, 38.88, 45.47, 0.152, 0.004),
    ("BBH-3 objects", "bbh_3obj", 14.83, 29.88, 32.80, 0.026, 0.006),
    ("MMLU-Pro-Biology", "mmlu_bio", 22.23, 30.13, 36.84, 0.046, 0.006),
    ("IFEval", "ifeval", 14.94, 21.09, 23.44, 0.036, 0.007),
]


def load_normalized(release, key):
    path = release / "irt_results" / f"{key}_difficulty.csv"
    rows = list(csv.DictReader(open(path)))
    b = np.array([float(r["b_mean"]) for r in rows])
    z = (b - b.min()) / (b.max() - b.min())  # min-max normalization to [0, 1]
    return np.sort(z)


def gaps_with_endpoints(z):
    """Adjacent spacings of sorted difficulties, including the boundary gaps at 0 and 1."""
    pts = np.concatenate([[0.0], np.sort(z), [1.0]])
    return pts[:-1], np.diff(pts)


def ddm(z):
    """W1 to a same-size empirical uniform reference with points at bin midpoints."""
    z = np.sort(z)
    n = len(z)
    return float(np.mean(np.abs(z - (np.arange(n) + 0.5) / n)))


def topk_sum(z, k):
    _, g = gaps_with_endpoints(z)
    return float(np.sort(g)[::-1][:k].sum())


def main(release_dir, out_dir):
    release = Path(release_dir)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    benchmarks = []
    for name, domain, d, mg, t5, n, key in TABLE1:
        entry = {"name": name, "fullName": FULL_NAMES.get(name, name), "domain": domain,
                 "ddm": d, "maxGap": mg, "top5": t5, "n": n, "items": None}
        if key is not None:
            z = load_normalized(release, key)
            got = (round(ddm(z), 4), round(topk_sum(z, 1), 4), round(topk_sum(z, 5), 4), len(z))
            # Agreement within one unit of the paper's last reported digit.
            ok = all(abs(a - b) <= 0.001 + 1e-9 for a, b in zip(got[:3], (d, mg, t5))) and got[3] == n
            status = "bundled" if ok else "NOT bundled (does not reproduce Table 1)"
            print(f"{name:18s} recomputed={got} paper={(d, mg, t5, n)} -> {status}")
            if ok:
                entry["items"] = [round(float(v), 6) for v in z]
        benchmarks.append(entry)

    matches_table1 = {b["name"] for b in benchmarks if b["items"] is not None}
    records = list(csv.DictReader(open(release / "new_item_records.csv")))
    gapfill = []
    for name, key, base, bf, orc, dev_b, dev_bf in TABLE2:
        z = load_normalized(release, key)
        left, g = gaps_with_endpoints(z)
        order = np.argsort(g)[::-1][:3]
        recs = sorted([r for r in records if r["benchmark"] == key], key=lambda r: r["top_gap"])
        new = [float(r["difficulty"]) / 10 for r in recs]
        tgt = [float(r["target"]) / 10 for r in recs]
        before = topk_sum(z, 3)
        after = topk_sum(np.concatenate([z, new]), 3)
        red = 100 * (1 - after / before)
        dev = float(np.mean(np.abs(np.array(new) - np.array(tgt))))
        assert abs(round(red, 2) - bf) < 1e-9, (name, red, bf)
        assert abs(round(dev, 3) - dev_bf) < 1e-9, (name, dev, dev_bf)
        print(f"{name:18s} BenchFill reduction {red:.2f}% (paper {bf}), dev {dev:.4f} (paper {dev_bf})")
        gapfill.append({
            "name": name,
            # The before/after widget only shows benchmarks whose item-level data reproduces Table 1.
            "itemsMatchTable1": name in matches_table1,
            "items": [round(float(v), 6) for v in z],
            "gaps": [{"lo": round(float(left[i]), 6), "hi": round(float(left[i] + g[i]), 6),
                      "target": t, "inserted": v}
                     for i, t, v in zip(order, tgt, new)],
            "top3Before": round(before, 6),
            "top3After": round(after, 6),
            "paper": {"baseline": base, "benchfill": bf, "oracle": orc,
                      "devBaseline": dev_b, "devBenchfill": dev_bf},
        })

    header = "// Generated by scripts/build_data.py from the BenchFill code release. Do not edit by hand.\n"
    (out / "benchmarks.js").write_text(
        header + "window.BENCHMARKS = " + json.dumps(benchmarks, separators=(",", ":")) + ";\n")
    (out / "gapfill.js").write_text(
        header + "window.GAPFILL = " + json.dumps(gapfill, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
