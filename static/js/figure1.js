/* Synthetic, deterministic Figure 1 illustration. No paper results are changed.
 * Scores are equal-weight means over the displayed synthetic item locations. */
(function () {
  "use strict";
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var mean = function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; };
  var modelA = function (z) { return 0.90 - 0.65 * z; };
  var modelB = function (z) { return modelA(z) + 0.18 / (1 + Math.exp(-20 * (z - 0.68))); };
  var before = function (z) { return 0.84 - 0.60 * z; };
  var halfWidth = 0.11;
  var closeThreshold = 0.03;
  function gapVerdict(result) {
    var benchmarkGap = result.b - result.a, targetGap = result.targetB - result.targetA;
    return Math.abs(benchmarkGap - targetGap) <= closeThreshold + Number.EPSILON ? "Close!" : "Not close!";
  }
  function isMissedProgress(observedGain, localGain) {
    return localGain > 0 && Math.abs(observedGain) * 100 < 0.005;
  }
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
  function coverage(center, addProbe, gainScale) {
    gainScale = typeof gainScale === "number" ? clamp(gainScale) : 1;
    var items = baseItems.slice();
    if (addProbe) items.push(center);
    items.sort(function (a, b) { return a - b; });
    return { items: items, before: mean(items.map(before)), after: mean(items.map(function (z) { return before(z) + gainScale * improvement(z, center); })) };
  }
  function movieFrame(seconds) {
    var t = Math.max(0, Math.min(32, Number(seconds) || 0));
    var ease = function (x) { x = clamp(x); return x * x * (3 - 2 * x); };
    return {
      seconds: t,
      scene: t < 3 ? 0 : t < 10 ? 1 : t < 14 ? 2 : t < 20 ? 3 : t < 25 ? 4 : 5,
      chapter: t < 14 ? "mismatch" : "coverage",
      center: 0.24 + 0.52 * ease((t - 3) / 7),
      gainScale: ease((t - 14) / 6),
      probe: t >= 25
    };
  }
  // Export only the pure simulation for reproducible numeric checks in Node.
  if (typeof module !== "undefined" && module.exports) module.exports = { mismatch: mismatch, coverage: coverage, improvement: improvement, before: before, modelA: modelA, modelB: modelB, gapVerdict: gapVerdict, isMissedProgress: isMissedProgress, movieFrame: movieFrame };
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
    $("f1-emphasis").setAttribute("aria-valuetext", "Difficulty emphasis " + center.toFixed(2));
    $("f1-benchmark-scores").textContent = scores(result.a, result.b, ["A", "B"]);
    $("f1-target-scores").textContent = scores(result.targetA, result.targetB, ["A", "B"]);
    $("f1-benchmark-gap").textContent = "Gap " + pp(result.b - result.a);
    $("f1-target-gap").textContent = "Gap " + pp(result.targetB - result.targetA);
    var verdict = gapVerdict(result);
    $("f1-gap-verdict").textContent = verdict;
    $("f1-gap-verdict").classList.toggle("is-close", verdict === "Close!");
    $("f1-mismatch-takeaway").textContent = Math.abs(center - 0.76) < 1e-9
      ? "The benchmark distribution matches the target, so both report the same model gap. The model curves have not changed. Only the evaluation weights have."
      : verdict === "Close!"
        ? "The benchmark's model gap is close to the target gap. The model curves stay fixed; only the evaluation weights change."
        : "The benchmark understates the model gap compared with the target. The models stay fixed, but the difficulty distribution changes the comparison.";
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
    $("f1-observed-gain").textContent = "+" + pp(result.after - result.before);
    var missed = isMissedProgress(result.after - result.before, improvement(center, center));
    $("f1-observed-card").classList.toggle("is-missed", missed);
    $("f1-missed-progress").hidden = !missed;
    $("f1-coverage-takeaway").classList.toggle("is-missed", missed);
    $("f1-coverage-takeaway").textContent = probe
      ? "The added item samples the improvement peak. Before and after scores are both computed on this augmented benchmark."
      : result.after - result.before < 1e-9
        ? "The model improves where the benchmark has no questions, so the benchmark misses the progress entirely."
        : missed
          ? "The model improves, but the benchmark reports almost no gain."
          : "The improvement overlaps existing questions, so some of the training progress becomes visible to the benchmark.";
    svg.setAttribute("aria-label", "Illustrative training gain: observed " + pp(result.after - result.before) + (probe ? ", with one added probe item" : ""));
  }
  function setupMovie() {
    var dialog = $("f1-movie"), opener = $("f1-watch");
    if (!dialog || !opener || typeof dialog.showModal !== "function") {
      if (opener) opener.hidden = true;
      return;
    }
    var playButton = $("f1-movie-play"), seek = $("f1-movie-seek");
    var elapsed = 0, playing = false, raf = 0, previous = null, lastRender = 0, lastScene = -1;
    var bodyOverflow = "", movieWidth = 0, returnFocus = opener;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var aligned = mismatch(0.76), targetGap = pp(aligned.targetB - aligned.targetA);
    var scenes = [
      ["The benchmark can hide a model gap.", "The benchmark samples a different difficulty mix from the target, so the same models look much closer."],
      ["Change the benchmark's difficulty weights.", "Watch the benchmark move toward the target distribution. The model curves stay fixed."],
      ["The reported gap now matches the target.", "Both comparisons now report a " + targetGap + " gap. Only the difficulty weights changed."],
      ["Training improves the model inside a coverage gap.", "The after-training curve rises where the benchmark has no questions."],
      ["Real progress. No change in the score.", "Every existing question lies outside the improved region, so the observed benchmark gain remains +0.00 pp."],
      ["One question makes the progress visible.", "Add a question at the improvement peak. Evaluating both model versions on the same augmented benchmark reveals +2.00 pp."]
    ];
    function render(seconds) {
      var state = movieFrame(seconds), isMismatch = state.chapter === "mismatch";
      dialog.dataset.scene = String(state.scene);
      if (state.scene !== lastScene) {
        lastScene = state.scene;
        $("f1-movie-scene").textContent = scenes[state.scene][0];
        $("f1-movie-description").textContent = scenes[state.scene][1];
        $("f1-chapter-mismatch").setAttribute("aria-pressed", String(isMismatch));
        $("f1-chapter-coverage").setAttribute("aria-pressed", String(!isMismatch));
        $("f1-movie-legend").innerHTML = isMismatch
          ? '<span><i class="f1-key f1-blue"></i>Model A</span><span><i class="f1-key f1-orange"></i>Model B</span>'
          : '<span><i class="f1-key f1-gray"></i>Before training</span><span><i class="f1-key f1-blue"></i>After training</span>';
      }
      $("f1-movie-comparison").hidden = !isMismatch;
      $("f1-movie-gain-card").hidden = isMismatch;
      var svg = $("f1-movie-chart"), f = chartFrame(svg, scenes[state.scene][0]);
      if (isMismatch) {
        var result = mismatch(state.center);
        curve(svg, f, modelA, color.blue);
        curve(svg, f, modelB, color.orange);
        text(svg, (f.sx(0) + f.sx(1)) / 2, 168, "Same two models throughout", { "text-anchor": "middle" });
        text(svg, f.sx(0), 187, "Benchmark questions");
        histogram(svg, f, result.items, 247, color.blue);
        text(svg, f.sx(0), 271, "Target distribution");
        histogram(svg, f, result.target, 320, color.orange);
        $("f1-movie-benchmark-scores").textContent = scores(result.a, result.b, ["A", "B"]);
        $("f1-movie-target-scores").textContent = scores(result.targetA, result.targetB, ["A", "B"]);
        $("f1-movie-benchmark-gap").textContent = pp(result.b - result.a);
        $("f1-movie-target-gap").textContent = pp(result.targetB - result.targetA);
        var verdict = gapVerdict(result);
        $("f1-movie-verdict").textContent = verdict;
        $("f1-movie-verdict").classList.toggle("is-close", verdict === "Close!");
        svg.setAttribute("aria-label", "Fixed models. Benchmark model gap " + pp(result.b - result.a) + "; target gap " + targetGap);
      } else {
        var center = 0.65, gain = state.gainScale;
        var coverageResult = coverage(center, state.probe, gain);
        var after = function (z) { return before(z) + gain * improvement(z, center); };
        el("rect", { x: f.sx(0.45), y: 25, width: f.sx(0.84) - f.sx(0.45), height: 125, fill: color.green, opacity: 0.08 }, svg);
        var area = "M" + f.sx(center - halfWidth) + "," + f.sy(before(center - halfWidth));
        for (var i = 0; i <= 80; i++) {
          var z = center - halfWidth + 2 * halfWidth * i / 80;
          area += "L" + f.sx(z) + "," + f.sy(after(z));
        }
        area += "L" + f.sx(center + halfWidth) + "," + f.sy(before(center + halfWidth)) + "Z";
        el("path", { d: area, fill: color.green, opacity: 0.23 }, svg);
        curve(svg, f, before, color.gray, true);
        curve(svg, f, after, color.blue);
        if (gain > 0.25) text(svg, f.sx(center), f.sy(after(center)) - 10, "Local improvement", { "text-anchor": "middle" });
        text(svg, f.sx(0), 184, "Benchmark · " + coverageResult.items.length + " equally weighted questions");
        el("rect", { x: f.sx(0.45), y: 195, width: f.sx(0.84) - f.sx(0.45), height: 54, fill: color.green, opacity: 0.10 }, svg);
        el("line", { x1: f.sx(0), x2: f.sx(1), y1: 247, y2: 247, stroke: color.line }, svg);
        baseItems.forEach(function (z) {
          el("line", { x1: f.sx(z), x2: f.sx(z), y1: 213, y2: 247, stroke: color.blue, "stroke-width": 1.5 }, svg);
          el("circle", { cx: f.sx(z), cy: 213, r: 3, fill: color.blue }, svg);
        });
        if (state.probe) {
          var reveal = clamp((seconds - 25) / 1.2);
          el("line", { x1: f.sx(center), x2: f.sx(center), y1: 205, y2: 247, stroke: color.green, "stroke-width": 2 }, svg);
          el("circle", { cx: f.sx(center), cy: 205, r: 5, fill: color.green, stroke: "white", "stroke-width": 1.5 }, svg);
          if (reveal < 1) el("circle", { cx: f.sx(center), cy: 205, r: 7 + 15 * reveal, fill: "none", stroke: color.green, opacity: 1 - reveal, "stroke-width": 2 }, svg);
          text(svg, f.sx(center), 274, "One new question", { "text-anchor": "middle" });
        } else text(svg, (f.sx(0.45) + f.sx(0.84)) / 2, 274, "No questions here", { "text-anchor": "middle" });
        el("rect", { x: f.sx(center - halfWidth), y: 291, width: f.sx(center + halfWidth) - f.sx(center - halfWidth), height: 12, rx: 3, fill: color.green, opacity: 0.24 }, svg);
        var observed = coverageResult.after - coverageResult.before;
        var missed = isMissedProgress(observed, gain * improvement(center, center));
        $("f1-movie-training-scores").textContent = scores(coverageResult.before, coverageResult.after, ["Before", "after"]);
        $("f1-movie-gain").textContent = "+" + pp(observed);
        $("f1-movie-gain-card").classList.toggle("is-missed", missed);
        $("f1-movie-gain-label").textContent = state.probe ? "Progress detected" : missed ? "Missed progress" : "Before the improvement";
        $("f1-movie-gain-note").textContent = state.probe ? "Both model versions are evaluated on the same 11 questions." : "10 questions. None samples the improved region.";
        svg.setAttribute("aria-label", "Local training improvement. Observed benchmark gain +" + pp(observed) + (state.probe ? ", after adding one question" : ", with no question in the improvement region"));
      }
      seek.value = String(seconds);
      $("f1-movie-time").textContent = "0:" + String(Math.floor(seconds)).padStart(2, "0") + " / 0:32";
      seek.setAttribute("aria-valuetext", seconds.toFixed(1) + " seconds of 32. " + scenes[state.scene][0]);
    }
    function pause() {
      playing = false;
      window.cancelAnimationFrame(raf);
      previous = null;
      playButton.textContent = elapsed >= 32 ? "Replay" : "Play";
    }
    function tick(timestamp) {
      if (!playing) return;
      if (previous !== null) elapsed = Math.min(32, elapsed + (timestamp - previous) / 1000);
      previous = timestamp;
      if (timestamp - lastRender >= 32 || elapsed >= 32) {
        render(elapsed);
        lastRender = timestamp;
      }
      if (elapsed >= 32) pause();
      else raf = window.requestAnimationFrame(tick);
    }
    function play() {
      if (elapsed >= 32) elapsed = 0;
      pause();
      playing = true;
      playButton.textContent = "Pause";
      render(elapsed);
      raf = window.requestAnimationFrame(tick);
    }
    function jump(seconds) {
      var resume = playing;
      pause();
      elapsed = seconds;
      render(elapsed);
      if (resume) play();
    }
    opener.addEventListener("click", function () {
      elapsed = 0; lastScene = -1;
      returnFocus = opener;
      bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
      render(0);
      if (!reducedMotion.matches) play();
      else pause();
      playButton.focus({ preventScroll: true });
    });
    playButton.addEventListener("click", function () { if (playing) pause(); else play(); });
    seek.addEventListener("input", function () { pause(); elapsed = Number(seek.value); render(elapsed); playButton.textContent = elapsed >= 32 ? "Replay" : "Play"; });
    $("f1-chapter-mismatch").addEventListener("click", function () { jump(0); });
    $("f1-chapter-coverage").addEventListener("click", function () { jump(14); });
    $("f1-movie-close").addEventListener("click", function () { dialog.close(); });
    $("f1-movie-explore").addEventListener("click", function () { returnFocus = $("f1-emphasis"); dialog.close(); });
    dialog.addEventListener("close", function () {
      pause();
      document.body.style.overflow = bodyOverflow;
      returnFocus.focus({ preventScroll: returnFocus === opener });
    });
    dialog.addEventListener("click", function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });
    function resizeMovie() {
      if (!dialog.open) return;
      var width = $("f1-movie-chart").clientWidth;
      if (Math.abs(width - movieWidth) > 1) { movieWidth = width; render(elapsed); }
    }
    if ("ResizeObserver" in window) new ResizeObserver(resizeMovie).observe(dialog);
    else window.addEventListener("resize", resizeMovie);
  }
  root.hidden = false;
  drawMismatch(); drawCoverage();
  setupMovie();
  $("f1-emphasis").addEventListener("input", drawMismatch);
  $("f1-progress").addEventListener("input", drawCoverage);
  $("f1-add-probe").addEventListener("change", drawCoverage);
  $("f1-reset").addEventListener("click", function () {
    $("f1-emphasis").value = "24"; $("f1-progress").value = "65"; $("f1-add-probe").checked = false;
    drawMismatch(); drawCoverage();
  });
  var oldWidth = 0;
  function redraw() { var width = root.clientWidth; if (Math.abs(width - oldWidth) > 2) { oldWidth = width; drawMismatch(); drawCoverage(); } }
  if ("ResizeObserver" in window) new ResizeObserver(redraw).observe(root);
  else window.addEventListener("resize", redraw);
})();
