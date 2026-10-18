/* 桌面故事模式：把章节正文做成右栏顶部的一张卡，跟着导轨一起换。
   卡里的按钮只是去点 app.js 已有的按钮/格子，不复制状态。 */
(function () {
  "use strict";
  var STORY = window.STARDUST_STORY || { chapters: [] };
  if (!STORY.chapters.length) return;
  var wrap = null, card = null, panel = null, storyEl = null, last = -1;

  function init() {
    panel = document.getElementById("panel");
    storyEl = document.getElementById("story");
    if (!panel || !storyEl || wrap) return;
    wrap = document.createElement("div");
    wrap.className = "panel-wrap";
    panel.parentNode.insertBefore(wrap, panel);
    wrap.appendChild(panel);
    card = document.createElement("section");
    card.className = "chapter-card";
    card.hidden = true;
    wrap.insertBefore(card, panel);
    card.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button") : null;
      if (!b) return;
      if (b.dataset.z) {
        var cell = document.querySelector('.cell[data-z="' + b.dataset.z + '"]');
        if (cell) cell.click();
      } else if (b.dataset.nav === "prev") {
        var p = document.getElementById("prev-ch");
        if (p && !p.disabled) p.click();
      } else if (b.dataset.nav === "next") {
        var n = document.getElementById("next-ch");
        if (n) n.click();
      }
    });
  }

  function activeIndex() {
    var d = storyEl.querySelector('.dots button[aria-current="true"]');
    return d ? +d.getAttribute("data-chapter") : 0;
  }

  function render() {
    if (!card) return;
    var mode = document.getElementById("mode-story");
    var on = mode && mode.getAttribute("aria-pressed") === "true" && innerWidth >= 1100;
    card.hidden = !on;
    if (!on) { last = -1; return; }
    var i = activeIndex();
    if (i === last) return;
    last = i;
    var ch = STORY.chapters[i];
    if (!ch) return;
    var els = window.STARDUST_ELEMENTS || [];
    var chips = (ch.elements || []).map(function (z) {
      var el = null;
      for (var k = 0; k < els.length; k++) if (els[k].z === z) { el = els[k]; break; }
      return el ? '<button type="button" data-z="' + z + '">' + el.symbol + "</button>" : "";
    }).join("");
    card.innerHTML =
      '<p class="cc-kicker">第 ' + (i + 1) + " 章 · " + ch.kicker + "</p>" +
      "<h3>" + ch.title + "</h3>" +
      '<p class="cc-body">' + ch.body + "</p>" +
      '<div class="cc-chips">' + chips + "</div>" +
      '<div class="cc-nav">' +
      '<button type="button" data-nav="prev"' + (i === 0 ? " disabled" : "") + ">上一章</button>" +
      '<button type="button" class="is-primary" data-nav="next">' +
      (i === STORY.chapters.length - 1 ? "改为自由探索" : "下一章") + "</button></div>";
  }

  function boot() {
    init();
    if (!card) return;
    if (window.MutationObserver) {
      new MutationObserver(function () { setTimeout(render, 40); })
        .observe(storyEl, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
    }
    addEventListener("resize", render, { passive: true });
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("#mode-story, #mode-explore")) setTimeout(render, 120);
    }, true);
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
