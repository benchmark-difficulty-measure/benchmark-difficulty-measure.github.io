/* Synthetic, deterministic Figure 1 illustration. No paper results are changed.
 * Scores are equal-weight means over the displayed synthetic item locations.
 * The uniform score uses midpoint integration over [0,1]. */
(function () {
  "use strict";
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var mean = function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; };
  var modelA = function (z) { return 0.90 - 0.65 * z; };
  var modelB = function (z) { return modelA(z) + 0.18 / (1 + Math.exp(-20 * (z - 0.68))); };
  var before = function (z) { return 0.84 - 0.60 * z; };
  var halfWidth = 0.11;
  function improvement(z, center) {
    var distance = Math.abs(z - center) / halfWidth;
    return distance >= 1 ? 0 : 0.22 * Math.pow(Math.cos(distance * Math.PI / 2), 2);
  }
  function syntheticItems(center, n) {
    var items = [];
    for (var i = 0; i < n; i++) {
      var u = (i + 0.5) / n;
      var q = u < 0.5 ? Math.sqrt(2 * u) - 1 : 1 - Math.sqrt(2 - 2 * u);
      items.push(clamp(center + 0.22 * q));
    }
    return items;
  }
  var target = syntheticItems(0.76, 64);
  var baseItems = [0.04, 0.10, 0.17, 0.24, 0.31, 0.38, 0.45, 0.84, 0.90, 0.96];
  function mismatch(center) {
    var items = syntheticItems(center, 64);
    return { items: items, target: target.slice(), a: mean(items.map(modelA)), b: mean(items.map(modelB)), targetA: mean(target.map(modelA)), targetB: mean(target.map(modelB)) };
  }
  function coverage(center, addProbe) {
    var items = baseItems.slice();
    if (addProbe) items.push(center);
    items.sort(function (a, b) { return a - b; });
    var uniformBefore = 0, uniformAfter = 0;
    for (var i = 0; i < 2000; i++) {
      var z = (i + 0.5) / 2000;
      uniformBefore += before(z) / 2000;
      uniformAfter += (before(z) + improvement(z, center)) / 2000;
    }
    return { items: items, before: mean(items.map(before)), after: mean(items.map(function (z) { return before(z) + improvement(z, center); })), uniformBefore: uniformBefore, uniformAfter: uniformAfter };
  }
  // Export only the pure simulation for reproducible numeric checks in Node.
  if (typeof module !== "undefined" && module.exports) module.exports = { mismatch: mismatch, coverage: coverage, improvement: improvement, before: before, modelA: modelA, modelB: modelB };
  if (typeof document === "undefined") return;
  var root = document.getElementById("figure1-interactive");
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var ns = "http://www.w3.org/2000/svg";
  var color = { blue: "#2457c5", orange: "#d9822b", green: "#3f8f4f", gray: "#9aa0a6", line: "#e6e6e6" };
  function el(tag, attrs, parent, text) {
    var node = document.createElementNS(ns, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    parent.appendChild(node);
    return node;
  }
  function text(parent, x, y, value, attrs) { return el("text", Object.assign({ x: x, y: y }, attrs || {}), parent, value); }
  function chartFrame(svg, title) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = Math.max(250, svg.clientWidth || 480), H = 360;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    el("title", {}, svg, title);
    var sx = function (z) { return 35 + z * (W - 49); };
    var sy = function (v) { return 25 + (1 - v) * 125; };
    [0, 0.5, 1].forEach(function (v) {
      el("line", { x1: sx(0), x2: sx(1), y1: sy(v), y2: sy(v), stroke: color.line, "stroke-dasharray": "3 4" }, svg);
      text(svg, 27, sy(v) + 4, String(v), { "text-anchor": "end" });
    });
    text(svg, sx(0), 13, "Conditional performance", { "font-size": 10 });
    el("line", { x1: sx(0), x2: sx(1), y1: 325, y2: 325, stroke: color.gray }, svg);
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      el("line", { x1: sx(v), x2: sx(v), y1: 325, y2: 329, stroke: color.gray }, svg);
      text(svg, sx(v), 342, String(v), { "text-anchor": "middle" });
    });
    text(svg, (sx(0) + sx(1)) / 2, 359, "Question difficulty  →", { "text-anchor": "middle" });
    return { sx: sx, sy: sy, W: W };
  }
  function curve(svg, frame, fn, stroke, dashed) {
    var d = "";
    for (var i = 0; i <= 240; i++) { var z = i / 240; d += (i ? "L" : "M") + frame.sx(z).toFixed(2) + "," + frame.sy(fn(z)).toFixed(2); }
    return el("path", { d: d, fill: "none", stroke: stroke, "stroke-width": 2.3, "stroke-linecap": "round", "stroke-dasharray": dashed ? "5 3" : "none" }, svg);
  }
  function histogram(svg, frame, items, base, stroke) {
    var bins = Array(24).fill(0);
    items.forEach(function (z) { bins[Math.min(23, Math.floor(z * 24))]++; });
    bins.forEach(function (count, i) {
      if (!count) return;
      var height = count / 64 * 210;
      var rect = el("rect", { x: frame.sx(i / 24), y: base - height, width: Math.max(1, frame.sx((i + 1) / 24) - frame.sx(i / 24) - 1), height: height, fill: stroke, "fill-opacity": 0.23, stroke: stroke, "stroke-width": 0.7 }, svg);
      el("title", {}, rect, count + " of 64 equally weighted items in this difficulty bin");
    });
    el("line", { x1: frame.sx(0), x2: frame.sx(1), y1: base, y2: base, stroke: color.line }, svg);
  }
  var scores = function (a, b, labels) { return labels[0] + " " + (100 * a).toFixed(1) + " · " + labels[1] + " " + (100 * b).toFixed(1); };
  var pp = function (v) { return (v * 100).toFixed(2) + " pp"; };
  function drawMismatch() {
    var center = Number($("f1-emphasis").value) / 100;
    var result = mismatch(center), svg = $("f1-mismatch-chart");
    var f = chartFrame(svg, "Measure mismatch: fixed models, changing benchmark difficulty weights");
    curve(svg, f, modelA, color.blue);
    curve(svg, f, modelB, color.orange);
    text(svg, f.sx(0), 184, "Benchmark · 64 equally weighted items", { fill: color.blue });
    histogram(svg, f, result.items, 247, color.blue);
    text(svg, f.sx(0), 271, "Fixed target distribution", { fill: color.orange });
    histogram(svg, f, result.target, 320, color.orange);
    $("f1-emphasis-value").textContent = center.toFixed(2);
    $("f1-benchmark-scores").textContent = scores(result.a, result.b, ["A", "B"]);
    $("f1-target-scores").textContent = scores(result.targetA, result.targetB, ["A", "B"]);
    $("f1-benchmark-gap").textContent = "Gap " + pp(result.b - result.a);
    $("f1-target-gap").textContent = "Gap " + pp(result.targetB - result.targetA);
    $("f1-mismatch-takeaway").textContent = center < 0.45
      ? "Most test questions lie where the models behave similarly, concealing their difference on harder questions."
      : center < 0.68
        ? "More questions now cover the region where the models differ. Their observed score gap grows."
        : "The benchmark now emphasizes harder questions. The model curves have not changed—only the evaluation weights have.";
    svg.setAttribute("aria-label", "Illustrative model gap: benchmark " + pp(result.b - result.a) + ", fixed target " + pp(result.targetB - result.targetA));
  }
  function drawCoverage() {
    var center = Number($("f1-progress").value) / 100, probe = $("f1-add-probe").checked;
    var result = coverage(center, probe), svg = $("f1-coverage-chart"), f = chartFrame(svg, "Coverage gaps: a local improvement can be invisible when no benchmark item samples it");
    el("rect", { x: f.sx(0.45), y: 25, width: f.sx(0.84) - f.sx(0.45), height: 125, fill: color.green, opacity: 0.08 }, svg);
    var area = "M" + f.sx(center - halfWidth) + "," + f.sy(before(center - halfWidth));
    for (var i = 0; i <= 80; i++) { var z = center - halfWidth + 2 * halfWidth * i / 80; area += "L" + f.sx(z) + "," + f.sy(before(z) + improvement(z, center)); }
    area += "L" + f.sx(center + halfWidth) + "," + f.sy(before(center + halfWidth)) + "Z";
    el("path", { d: area, fill: color.green, opacity: 0.18 }, svg);
    curve(svg, f, before, color.gray, true);
    curve(svg, f, function (z) { return before(z) + improvement(z, center); }, color.blue);
    text(svg, f.sx(0), 184, "Benchmark · " + result.items.length + " equally weighted items");
    el("rect", { x: f.sx(0.45), y: 195, width: f.sx(0.84) - f.sx(0.45), height: 54, fill: color.green, opacity: 0.10 }, svg);
    el("line", { x1: f.sx(0), x2: f.sx(1), y1: 247, y2: 247, stroke: color.line }, svg);
    baseItems.forEach(function (z) {
      el("line", { x1: f.sx(z), x2: f.sx(z), y1: 213, y2: 247, stroke: color.blue, "stroke-width": 1.5 }, svg);
      var dot = el("circle", { cx: f.sx(z), cy: 213, r: 3, fill: color.blue }, svg);
      el("title", {}, dot, "Original synthetic item: difficulty " + z.toFixed(2));
    });
    if (probe) {
      el("line", { x1: f.sx(center), x2: f.sx(center), y1: 205, y2: 247, stroke: color.green, "stroke-width": 2 }, svg);
      var added = el("circle", { cx: f.sx(center), cy: 205, r: 5, fill: color.green, stroke: "white", "stroke-width": 1.5 }, svg);
      el("title", {}, added, "Added probe item at difficulty " + center.toFixed(2));
    }
    text(svg, f.sx(0), 271, "Local improvement interval · width 0.22");
    el("rect", { x: f.sx(center - halfWidth), y: 287, width: f.sx(center + halfWidth) - f.sx(center - halfWidth), height: 12, rx: 3, fill: color.green, "fill-opacity": 0.24 }, svg);
    el("circle", { cx: f.sx(center), cy: 293, r: 3.5, fill: color.green }, svg);
    $("f1-progress-value").textContent = center.toFixed(2);
    $("f1-training-scores").textContent = scores(result.before, result.after, ["Before", "after"]);
    $("f1-uniform-scores").textContent = scores(result.uniformBefore, result.uniformAfter, ["Before", "after"]);
    $("f1-observed-gain").textContent = "+" + pp(result.after - result.before);
    $("f1-uniform-gain").textContent = "+" + pp(result.uniformAfter - result.uniformBefore);
    $("f1-coverage-takeaway").textContent = probe
      ? "The added item samples the improvement peak. Before and after scores are both computed on this augmented benchmark."
      : result.after - result.before < 1e-9
        ? "The model improves inside the empty interval, but the benchmark reports exactly zero progress."
        : "The improvement overlaps existing questions, so some of the training progress becomes visible to the benchmark.";
    svg.setAttribute("aria-label", "Illustrative training gain: observed " + pp(result.after - result.before) + ", uniform difficulty " + pp(result.uniformAfter - result.uniformBefore) + (probe ? ", with one added probe item" : ""));
  }
  root.hidden = false;
  drawMismatch(); drawCoverage();
  $("f1-emphasis").addEventListener("input", drawMismatch);
  $("f1-progress").addEventListener("input", drawCoverage);
  $("f1-add-probe").addEventListener("change", drawCoverage);
  $("f1-reset").addEventListener("click", function () {
    $("f1-emphasis").value = "24"; $("f1-progress").value = "65"; $("f1-add-probe").checked = false;
    drawMismatch(); drawCoverage();
  });
  var original = document.querySelector(".teaser-figure");
  if (original) {
    var disclosure = document.createElement("details");
    disclosure.className = "f1-original wide";
    var summary = document.createElement("summary");
    summary.textContent = "View original Figure 1 from the paper";
    original.parentNode.insertBefore(disclosure, original);
    disclosure.appendChild(summary); disclosure.appendChild(original);
    window.addEventListener("beforeprint", function () { disclosure.dataset.wasOpen = String(disclosure.open); disclosure.open = true; });
    window.addEventListener("afterprint", function () { disclosure.open = disclosure.dataset.wasOpen === "true"; });
  }
  var oldWidth = 0;
  function redraw() { var width = root.clientWidth; if (Math.abs(width - oldWidth) > 2) { oldWidth = width; drawMismatch(); drawCoverage(); } }
  if ("ResizeObserver" in window) new ResizeObserver(redraw).observe(root);
  else window.addEventListener("resize", redraw);
})();
