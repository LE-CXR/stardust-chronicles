/* 档案换人时做一次短入场。格子不再跟指针倾斜（去掉模板感 3D）。触屏不启用。 */
(function () {
  "use strict";
  if (matchMedia("(pointer: coarse)").matches) return;

  var panel = document.getElementById("panel");
  if (panel && window.MutationObserver) {
    var first = true, lastRun = 0, lastSym = "";
    new MutationObserver(function () {
      if (first) { first = false; return; }
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
