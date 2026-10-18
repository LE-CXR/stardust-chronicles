/* 窄屏导航：给 18 族做一条可点的刻度，省掉 2.5 屏的盲滑。
   独立脚本，不动 app.js 的渲染逻辑；表格重绘时用 MutationObserver 重新标刻度。 */
(function () {
  "use strict";
  var STAGE = null, SCROLL = null, TABLE = null, MAP = null;

  function build() {
    SCROLL = document.getElementById("table-scroll");
    TABLE = document.getElementById("table");
    STAGE = SCROLL && SCROLL.parentElement;
    if (!SCROLL || !TABLE || !STAGE) return;
    if (!MAP) {
      MAP = document.createElement("div");
      MAP.className = "rowmap";
      MAP.setAttribute("aria-label", "按族跳转");
      var ticks = document.createElement("div");
      ticks.className = "rowmap-ticks";
      MAP.appendChild(ticks);
      var hint = document.createElement("p");
      hint.className = "rowmap-hint";
      hint.textContent = "点刻度跳到任意一族";
      MAP.appendChild(hint);
      STAGE.insertBefore(MAP, SCROLL.nextSibling);
      for (var g = 0; g < 18; g++) {
        (function (idx) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "rowmap-tick";
          b.setAttribute("aria-label", "第 " + (idx + 1) + " 族");
          b.addEventListener("click", function () { jump(idx); });
          ticks.appendChild(b);
        })(g);
      }
      SCROLL.addEventListener("scroll", sync, { passive: true });
    }
    var narrow = innerWidth < 760;
    MAP.hidden = !narrow || SCROLL.classList.contains("overview");
    if (narrow) sync();
  }

  function step() { return SCROLL.scrollWidth / 18; }

  function jump(idx) {
    var left = idx * step() - 10;
    if (SCROLL.scrollTo) SCROLL.scrollTo({ left: left, behavior: "smooth" });
    else SCROLL.scrollLeft = left;
  }

  function sync() {
    if (!MAP || MAP.hidden) return;
    var s = step();
    if (!s) return;
    var first = Math.floor(SCROLL.scrollLeft / s);
    var last = Math.ceil((SCROLL.scrollLeft + SCROLL.clientWidth) / s) - 1;
    var ticks = MAP.querySelectorAll(".rowmap-tick");
    for (var i = 0; i < ticks.length; i++) {
      ticks[i].classList.toggle("is-on", i >= first && i <= last);
      ticks[i].classList.toggle("is-edge", i === first || i === last);
    }
  }

  function boot() {
    build();
    addEventListener("resize", build, { passive: true });
    var dock = document.getElementById("density");
    if (dock) dock.addEventListener("click", function () { setTimeout(build, 60); });
    if (TABLE && window.MutationObserver) {
      new MutationObserver(function () { sync(); }).observe(TABLE, { childList: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
