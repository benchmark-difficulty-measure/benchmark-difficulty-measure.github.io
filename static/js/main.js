/* BenchFill project page: page-level behaviour and paper tables.
   All numbers below are transcribed from the paper; see README.md for provenance. */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent, text) {
    var node = document.createElementNS(SVGNS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (text != null) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  /** SVG text with italic/subscript runs: parts = [[text, "i" | "sub" | ""], ...]. */
  function mathText(parent, attrs, parts) {
    var t = el("text", attrs, parent);
    parts.forEach(function (p) {
      var a = {};
      if (p[1] === "i") a["font-style"] = "italic";
      if (p[1] === "sub") { a["baseline-shift"] = "sub"; a["font-size"] = "75%"; a["font-style"] = "italic"; }
      el("tspan", a, t, p[0]);
    });
    return t;
  }
  window.BF = { el: el, $: $, $$: $$ };

  /* ---------------- paper tables ---------------- */

  // Paper Table 11 (benchmark calibration).
  var TABLE11 = [
    ["Minerva-Math", [0.601, 0.649, 0.790], [0.455, 0.514, 0.667], [0.122, 0.115, 0.005]],
    ["MATH-500", [0.930, 0.942, 0.958], [0.879, 0.878, 0.909], [0.164, 0.165, 0.099]],
    ["Gaokao2023en", [0.888, 0.895, 0.951], [0.788, 0.790, 0.879], [0.088, 0.086, 0.029]],
    ["AIME24", [0.944, 0.942, 0.944], [0.848, 0.847, 0.848], [0.077, 0.108, 0.019]],
    ["AIME25", [0.958, 0.936, 0.972], [0.909, 0.854, 0.915], [0.079, 0.126, 0.020]],
    ["AIME26", [0.949, 0.950, 0.970], [0.870, 0.867, 0.901], [0.085, 0.108, 0.017]],
    ["AMC23", [0.937, 0.934, 0.937], [0.848, 0.848, 0.848], [0.088, 0.093, 0.025]],
    ["OlympiadBench", [0.916, 0.910, 0.916], [0.818, 0.806, 0.818], [0.064, 0.067, 0.008]],
    ["Average", [0.890, 0.895, 0.930], [0.802, 0.801, 0.848], [0.096, 0.109, 0.028]]
  ];

  // Paper Table 12 (localized-improvement detection).
  var TABLE12 = [
    { bench: "AIME24", model: "Olmo-3.1-32B-Think", rows: [["Original", "+0.104", "0.500100", false], ["Original + BenchFill", "+2.419", "0.005940", true], ["Original + Baseline", "+0.202", "0.458000", false]] },
    { bench: "AIME25", model: "Phi-4", rows: [["Original", "+1.042", "0.184100", false], ["Original + BenchFill", "+3.730", "0.000450", true], ["Original + Baseline", "+0.907", "0.214200", false]] },
    { bench: "AIME26", model: "Llama-3.1-8B-Instruct", rows: [["Original", "+0.208", "0.418400", false], ["Original + BenchFill", "+3.427", "0.000010", true], ["Original + Baseline", "+0.101", "0.498000", false]] }
  ];

  // Paper Table 2 average row.
  var TABLE2_AVG = { baseline: 17.52, benchfill: 32.67, oracle: 35.06, devBaseline: 0.048, devBenchfill: 0.005 };
  window.BF.TABLE2_AVG = TABLE2_AVG;

  function td(text, cls) {
    var c = document.createElement("td");
    if (cls) c.className = cls;
    c.innerHTML = text;
    return c;
  }

  function buildTable1() {
    var body = $("#table1 tbody");
    if (!body || !window.BENCHMARKS) return;
    var lastDomain = null;
    window.BENCHMARKS.forEach(function (b) {
      if (b.domain !== lastDomain) {
        var dr = document.createElement("tr");
        dr.className = "domain-row";
        dr.appendChild(td(b.domain)).colSpan = 6;
        body.appendChild(dr);
        lastDomain = b.domain;
      }
      var tr = document.createElement("tr");
      tr.className = "clickable";
      tr.dataset.name = b.name;
      tr.tabIndex = 0;
      tr.setAttribute("aria-label", b.name + ": open in explorer");
      tr.appendChild(td(b.name));
      tr.appendChild(td(b.domain));
      tr.appendChild(td(b.ddm.toFixed(3), "num" + (b.ddm >= 0.10 ? " hi" : "")));
      tr.appendChild(td(b.maxGap.toFixed(3), "num" + (b.maxGap >= 0.10 ? " hi" : "")));
      tr.appendChild(td(b.top5.toFixed(3), "num" + (b.top5 >= 0.30 ? " hi" : "")));
      tr.appendChild(td(String(b.n), "num"));
      body.appendChild(tr);
    });
    // Sanity check of the counts quoted in the text against Table 1.
    var c1 = 0, c2 = 0, c3 = 0;
    window.BENCHMARKS.forEach(function (b) { c1 += b.ddm >= 0.10; c2 += b.maxGap >= 0.10; c3 += b.top5 >= 0.30; });
    if (window.BENCHMARKS.length !== 25 || c1 !== 10 || c2 !== 8 || c3 !== 10) {
      console.warn("Table 1 counts differ from the text:", window.BENCHMARKS.length, c1, c2, c3);
    }
  }

  function buildTable2() {
    var body = $("#table2 tbody");
    if (!body || !window.GAPFILL) return;
    var rows = window.GAPFILL.map(function (g) { return [g.name, g.paper]; });
    rows.push(["Average", TABLE2_AVG]);
    rows.forEach(function (r) {
      var p = r[1], tr = document.createElement("tr");
      if (r[0] === "Average") tr.className = "avg";
      tr.appendChild(td(r[0]));
      tr.appendChild(td(p.baseline.toFixed(2), "num"));
      tr.appendChild(td(p.benchfill.toFixed(2), "num best"));
      tr.appendChild(td(p.oracle.toFixed(2), "num"));
      tr.appendChild(td(p.devBaseline.toFixed(3), "num"));
      tr.appendChild(td(p.devBenchfill.toFixed(3), "num best"));
      body.appendChild(tr);
    });
  }

  function buildTable11() {
    var body = $("#table11 tbody");
    if (!body) return;
    TABLE11.forEach(function (r) {
      var tr = document.createElement("tr");
      if (r[0] === "Average") tr.className = "avg";
      tr.appendChild(td(r[0]));
      [[r[1], "max"], [r[2], "max"], [r[3], "min"]].forEach(function (grp) {
        var vals = grp[0];
        var best = grp[1] === "max" ? Math.max.apply(null, vals) : Math.min.apply(null, vals);
        vals.forEach(function (v) { tr.appendChild(td(v.toFixed(3), "num" + (v === best ? " best" : ""))); });
      });
      body.appendChild(tr);
    });
  }

  function buildTable12() {
    var body = $("#table12 tbody");
    if (!body) return;
    TABLE12.forEach(function (c) {
      c.rows.forEach(function (r, i) {
        var tr = document.createElement("tr");
        if (r[3]) tr.className = "bf-row";
        if (i === 0) {
          var cell = td("<b>" + c.bench + "</b><small>" + c.model + "</small>", "case");
          cell.rowSpan = c.rows.length;
          tr.appendChild(cell);
        }
        tr.appendChild(td(r[0]));
        tr.appendChild(td(r[1], "num"));
        tr.appendChild(td(r[2], "num"));
        tr.appendChild(td(r[3] ? '<span class="yes" aria-label="detected">&#10003;</span>' : '<span class="no" aria-label="not detected">&times;</span>', "num"));
        body.appendChild(tr);
      });
    });
  }

  /* ---------------- measure schematic (illustrative, not data) ---------------- */
  function buildSchematic() {
    var svg = $("#measure-schematic");
    if (!svg) return;
    var X0 = 44, X1 = 404, YTOP = 26, YAX = 196;
    var sx = function (z) { return X0 + z * (X1 - X0); };
    var sy = function (v) { return YAX - v * (YAX - YTOP); };
    var s = function (z) { return 0.86 - 0.62 / (1 + Math.exp(-(z - 0.55) * 7)) + 0.04 * Math.sin(5 * z); };
    // Illustrative item difficulties with one deliberately empty interval.
    var items = [0.05, 0.09, 0.13, 0.18, 0.22, 0.26, 0.31, 0.35, 0.40, 0.46, 0.80, 0.88, 0.95];
    var mean = items.reduce(function (a, z) { return a + s(z); }, 0) / items.length;
    var gapLo = 0.46, gapHi = 0.80;

    var defs = el("defs", {}, svg);
    var mk = el("marker", { id: "sch-arrow", viewBox: "0 0 8 8", refX: "4", refY: "4", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L8,4 L0,8 z", fill: "#3c4043" }, mk);

    el("rect", { x: sx(gapLo), y: YTOP - 6, width: sx(gapHi) - sx(gapLo), height: YAX - YTOP + 6, fill: "rgba(63,143,79,0.10)" }, svg);
    // axes
    el("line", { x1: X0, y1: YAX, x2: X1 + 8, y2: YAX, stroke: "#3c4043", "stroke-width": 1.2, "marker-end": "url(#sch-arrow)" }, svg);
    el("line", { x1: X0, y1: YAX, x2: X0, y2: YTOP - 12, stroke: "#3c4043", "stroke-width": 1.2, "marker-end": "url(#sch-arrow)" }, svg);
    mathText(svg, { x: X0 + 8, y: YTOP - 6, "font-size": 13, fill: "#3c4043" }, [["s", "i"], ["θ", "sub"], ["(", ""], ["z", "i"], [")", ""]]);
    el("text", { x: X0, y: YAX + 15, "text-anchor": "middle", "font-size": 11, fill: "#5f6368" }, svg, "0");
    el("text", { x: X1, y: YAX + 15, "text-anchor": "middle", "font-size": 11, fill: "#5f6368" }, svg, "1");
    el("text", { x: (X0 + X1) / 2, y: YAX + 15, "text-anchor": "middle", "font-size": 11.5, fill: "#3c4043" }, svg, "difficulty");

    // curve
    var d = "";
    for (var i = 0; i <= 120; i++) { var z = i / 120; d += (i ? "L" : "M") + sx(z).toFixed(1) + "," + sy(s(z)).toFixed(1); }
    el("path", { d: d, fill: "none", stroke: "#2457c5", "stroke-width": 2.2 }, svg);
    // stems
    items.forEach(function (z) {
      el("line", { x1: sx(z), y1: YAX, x2: sx(z), y2: sy(s(z)), stroke: "#2457c5", "stroke-opacity": 0.45, "stroke-width": 1.4 }, svg);
      el("circle", { cx: sx(z), cy: sy(s(z)), r: 3.4, fill: "#fff", stroke: "#2457c5", "stroke-width": 1.6 }, svg);
    });
    // mean line = S_B
    el("line", { x1: X0, y1: sy(mean), x2: X1, y2: sy(mean), stroke: "#1d1d1f", "stroke-dasharray": "4 3", "stroke-width": 1.1 }, svg);
    mathText(svg, { x: X1, y: sy(mean) - 6, "text-anchor": "end", "font-size": 12, fill: "#1d1d1f" }, [["S", "i"], ["B", "sub"], ["(θ) = average stem height", ""]]);

    // point masses below the axis
    var YM = 268;
    el("line", { x1: X0, y1: YM, x2: X1, y2: YM, stroke: "#9aa0a6", "stroke-width": 1 }, svg);
    items.forEach(function (z) {
      el("line", { x1: sx(z), y1: YM, x2: sx(z), y2: YM - 16, stroke: "#1d1d1f", "stroke-width": 1.5 }, svg);
      el("circle", { cx: sx(z), cy: YM - 16, r: 2.6, fill: "#1d1d1f" }, svg);
    });
    mathText(svg, { x: X0 - 8, y: YM - 4, "text-anchor": "end", "font-size": 13, fill: "#3c4043" }, [["ν", "i"], ["B", "sub"]]);
    el("text", { x: sx(0.18), y: YM + 18, "text-anchor": "middle", "font-size": 11, fill: "#5f6368" }, svg, "each item: mass 1/n");
    var gx0 = sx(gapLo) + 3, gx1 = sx(gapHi) - 3, gy = YM - 26;
    el("path", { d: "M" + gx0 + "," + (gy + 5) + "V" + gy + "H" + gx1 + "V" + (gy + 5), fill: "none", stroke: "#3f8f4f", "stroke-width": 1.4 }, svg);
    el("text", { x: (gx0 + gx1) / 2, y: gy - 5, "text-anchor": "middle", "font-size": 11.5, fill: "#2f6f3c", "font-weight": 600 }, svg, "largest gap: no mass");
  }

  /* ---------------- interactions ---------------- */
  function renderMath() {
    if (typeof window.renderMathInElement !== "function") return;
    window.renderMathInElement(document.body, {
      delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
      throwOnError: false,
      strict: "ignore",
      trust: function (ctx) { return ctx.command === "\\htmlClass"; },
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "svg"]
    });
  }

  function navHighlight() {
    var links = $$(".nav-links a");
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var ids = Object.keys(map).filter(function (id) { return document.getElementById(id); });
    if (!("IntersectionObserver" in window)) return;
    var visible = {};
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var current = null;
      ids.forEach(function (id) { if (visible[id] && !current) current = id; });
      if (current) {
        links.forEach(function (a) { a.classList.remove("active"); });
        map[current].classList.add("active");
        var bar = $(".nav-links");
        var a = map[current];
        if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: a.offsetLeft - 20, behavior: "smooth" });
      }
    }, { rootMargin: "-50px 0px -65% 0px" });
    ids.forEach(function (id) { obs.observe(document.getElementById(id)); });
  }

  function copyBibtex() {
    var btn = $("#copy-bibtex");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var text = $("#bibtex-src").textContent;
      var done = function () {
        btn.classList.add("copied");
        btn.querySelector("span").textContent = "Copied";
        setTimeout(function () { btn.classList.remove("copied"); btn.querySelector("span").textContent = "Copy"; }, 1800);
      };
      var fallback = function () {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  }

  function lightbox() {
    var box = $("#lightbox");
    if (!box) return;
    var img = box.querySelector("img"), cap = box.querySelector(".lightbox-cap"), closeBtn = box.querySelector(".lightbox-close");
    var lastFocus = null;
    function close() { box.hidden = true; img.removeAttribute("src"); document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
    $$("a.zoomable").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        lastFocus = a;
        img.src = a.getAttribute("href");
        img.alt = (a.querySelector("img") || {}).alt || "";
        cap.textContent = a.dataset.caption || "";
        box.hidden = false;
        document.body.style.overflow = "hidden";
        closeBtn.focus();
      });
    });
    box.addEventListener("click", function (e) { if (e.target === box || e.target === img) close(); });
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) close(); });
  }

  function tabs() {
    $$("[data-tabs]").forEach(function (root) {
      var btns = $$("[role=tab]", root);
      function select(btn) {
        btns.forEach(function (b) {
          var on = b === btn;
          b.setAttribute("aria-selected", String(on));
          b.tabIndex = on ? 0 : -1;
          document.getElementById(b.getAttribute("aria-controls")).hidden = !on;
        });
      }
      btns.forEach(function (b, i) {
        b.addEventListener("click", function () { select(b); });
        b.addEventListener("keydown", function (e) {
          var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
          if (j === null) return;
          var nb = btns[(j + btns.length) % btns.length];
          select(nb); nb.focus();
        });
      });
    });
  }

  buildTable1();
  buildTable2();
  buildTable11();
  buildTable12();
  buildSchematic();
  renderMath();
  navHighlight();
  copyBibtex();
  lightbox();
  tabs();
})();
