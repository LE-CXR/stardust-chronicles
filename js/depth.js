/* 桌面端的第三维：
   1) 格子跟着指针做很小的俯仰/偏航（幅度只有 4–5°，是"卡片"不是"陀螺"）；
   2) 元素档案每次换人，整块内容做一次 280ms 的三维入场。
   触屏不启用。 */
(function () {
  "use strict";
  if (matchMedia("(pointer: coarse)").matches) return;

  var cur = null, fx = 0, fy = 0, raf = 0;

  function apply() {
    raf = 0;
    if (!cur) return;
    cur.style.transform =
      "perspective(560px) translateY(-3px) scale(1.03) rotateX(" +
      (-fy * 7).toFixed(2) + "deg) rotateY(" + (fx * 9).toFixed(2) + "deg)";
  }

  document.addEventListener("pointermove", function (e) {
    var cell = e.target.closest ? e.target.closest(".cell[data-z]") : null;
    if (cell !== cur) {
      if (cur) cur.style.transform = "";
      cur = cell;
    }
    if (!cell) return;
    var r = cell.getBoundingClientRect();
    fx = (e.clientX - (r.left + r.width / 2)) / r.width;
    fy = (e.clientY - (r.top + r.height / 2)) / r.height;
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });

  document.addEventListener("pointerleave", function () {
    if (cur) cur.style.transform = "";
    cur = null;
  }, true);

  var panel = document.getElementById("panel");
  if (panel && window.MutationObserver) {
    var first = true, lastRun = 0, lastSym = "";
    new MutationObserver(function () {
      if (first) { first = false; return; }
      /* 窄屏档案是底部抽屉：它自己的 translateY 不能被入场动画的 transform 顶掉，
         而且重播一次就是一次 8px 弹跳，所以这里直接不做。 */
      if (innerWidth < 1100) return;
      var sym = panel.querySelector(".symbol-xl");
      var key = sym ? sym.textContent.trim() : "";
      if (!key || key === lastSym) return;
      var now = performance.now();
      if (now - lastRun < 350) return;
      lastRun = now;
      lastSym = key;
      panel.classList.remove("depth-in");
      void panel.offsetWidth;
      panel.classList.add("depth-in");
    }).observe(panel, { childList: true, subtree: true });
  }
})();
