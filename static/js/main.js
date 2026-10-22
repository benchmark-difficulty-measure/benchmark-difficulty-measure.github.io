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
        dr.appendChild(td(b.domain)).colSpan = 5;
        body.appendChild(dr);
        lastDomain = b.domain;
      }
      var tr = document.createElement("tr");
      tr.className = "clickable";
      tr.dataset.name = b.name;
      tr.tabIndex = 0;
      tr.setAttribute("aria-label", b.name + ": open in explorer");
      tr.appendChild(td(b.name));
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
    var sections = links.map(function (a) {
      return { link: a, element: document.getElementById(a.getAttribute("href").slice(1)) };
    }).filter(function (entry) { return entry.element; });
    if (!sections.length) return;
    var nav = $(".nav"), bar = $(".nav-links"), current = null, queued = false;
    function activate(entry) {
      if (current === entry) return;
      current = entry;
      links.forEach(function (a) {
        var active = a === entry.link;
        a.classList.toggle("active", active);
        if (active) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
      if (bar.scrollWidth > bar.clientWidth) {
        var linkBox = entry.link.getBoundingClientRect(), barBox = bar.getBoundingClientRect();
        if (linkBox.left < barBox.left || linkBox.right > barBox.right) {
          bar.scrollTo({ left: bar.scrollLeft + linkBox.left - barBox.left - 16, behavior: "smooth" });
        }
      }
    }
    function update() {
      queued = false;
      var line = nav.getBoundingClientRect().bottom + 16;
      var active = sections[0];
      sections.forEach(function (entry) {
        if (entry.element.getBoundingClientRect().top <= line) active = entry;
      });
      // The last section may never reach the activation line when scrolling stops at the page bottom.
      if (document.documentElement.scrollHeight > window.innerHeight &&
          window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        active = sections[sections.length - 1];
      }
      activate(active);
    }
    function schedule() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    }
    sections.forEach(function (entry) {
      entry.link.addEventListener("click", function (event) {
        if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) activate(entry);
      });
    });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    window.addEventListener("load", schedule);
    if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(document.body);
    update();
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
