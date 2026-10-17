/* Project page: page-level behaviour and paper tables.
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
  window.BF = { el: el, $: $, $$: $$ };

  /* ---------------- paper tables ---------------- */

  // Paper Table 2 (gap filling): Top-3 Gap Sum Reduction (%) and Target Dev.
  var TABLE2 = [
    ["AIME24", 6.90, 35.57, 35.57, 0.057, 0.005],
    ["AIME25", 27.44, 37.56, 37.56, 0.016, 0.005],
    ["AIME26", 17.94, 33.04, 33.04, 0.045, 0.002],
    ["AMC23", 24.47, 35.19, 35.78, 0.009, 0.003],
    ["Gaokao2023en", 11.45, 38.88, 45.47, 0.152, 0.004],
    ["BBH-3 objects", 14.83, 29.88, 32.80, 0.026, 0.006],
    ["MMLU-Pro-Biology", 22.23, 30.13, 36.84, 0.046, 0.006],
    ["IFEval", 14.94, 21.09, 23.44, 0.036, 0.007]
  ].map(function (r) {
    return { name: r[0], p: { baseline: r[1], ours: r[2], oracle: r[3], devBaseline: r[4], devOurs: r[5] } };
  });
  var TABLE2_AVG = { baseline: 17.52, ours: 32.67, oracle: 35.06, devBaseline: 0.048, devOurs: 0.005 };
  window.BF.TABLE2 = TABLE2;
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
    if (window.BENCHMARKS.length !== 25 || c1 !== 10 || c2 !== 8 || c3 !== 9) {
      console.warn("Table 1 counts differ from the text:", window.BENCHMARKS.length, c1, c2, c3);
    }
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

  buildTable1();
  renderMath();
  navHighlight();
  copyBibtex();
  lightbox();
})();
