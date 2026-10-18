/* 桌面「看故事」的章节导轨：竖排在表格左边，点一章表格就换一次导览。
   它不改 app.js 的状态，只是去点 app.js 自己渲染的那排小圆点。 */
(function () {
  "use strict";
  var STORY = window.STARDUST_STORY || { chapters: [] };
  if (!STORY.chapters.length) return;
  var rail = null, layout = null, storyEl = null;

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function build() {
    layout = document.querySelector(".layout");
    storyEl = document.getElementById("story");
    if (!layout || !storyEl) return;
    if (!rail) {
      rail = document.createElement("nav");
      rail.className = "rail";
      rail.setAttribute("aria-label", "章节");
      rail.innerHTML = '<p class="rail-cap">章 节</p>' +
        STORY.chapters.map(function (c, i) {
          return '<button type="button" class="rail-item" data-i="' + i + '">' +
            "<b>" + pad(i + 1) + "</b><span>" + c.kicker + "</span></button>";
        }).join("");
      layout.insertBefore(rail, layout.firstChild);
      rail.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest(".rail-item") : null;
        if (!b) return;
        var dot = storyEl.querySelector('.dots button[data-chapter="' + b.dataset.i + '"]');
        if (dot) dot.click();
      });
    }
    sync();
  }

  function storyMode() {
    var m = document.getElementById("mode-story");
    return !!(m && m.getAttribute("aria-pressed") === "true");
  }

  function sync() {
    if (!rail || !layout) return;
    var on = storyMode();
    var wide = innerWidth >= 1100;
    rail.hidden = !(on && wide);
    layout.classList.toggle("has-rail", on && wide);
    var cur = storyEl.querySelector('.dots button[aria-current="true"]');
    var act = cur ? +cur.getAttribute("data-chapter") : -1;
    var items = rail.querySelectorAll(".rail-item");
    for (var i = 0; i < items.length; i++) items[i].classList.toggle("is-on", i === act);
  }

  function boot() {
    build();
    addEventListener("resize", sync, { passive: true });
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("#mode-story, #mode-explore, .dots")) setTimeout(sync, 30);
    }, true);
    if (window.MutationObserver) new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
