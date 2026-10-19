/* 桌面端的"掠过"手感：悬停任意一格，浮出一张轻卡——符号、中英文名、它自己的光谱。
   声音由 film.js 的悬浮监听负责，这里只管视觉，避免重复发声。 */
(function () {
  "use strict";
  if (matchMedia("(pointer: coarse)").matches) return;

  var els = window.STARDUST_ELEMENTS || [];
  var byZ = {};
  els.forEach(function (e) { byZ[e.z] = e; });
  var card = null, cur = null, showTimer = 0, hideTimer = 0;

  function ensure() {
    if (card) return card;
    card = document.createElement("div");
    card.className = "hovercard";
    card.setAttribute("aria-hidden", "true");
    document.body.appendChild(card);
    return card;
  }

  function spectrum(el) {
    var lines = (el.lines || []).slice()
      .sort(function (a, b) { return (b.intensity || 1) - (a.intensity || 1); }).slice(0, 6);
    if (!lines.length) return '<div class="hc-spec is-empty">无可见强线</div>';
    return '<div class="hc-spec">' + lines.map(function (l) {
      var x = ((l.nm - 380) / 400) * 100;
      return '<i style="left:' + x.toFixed(2) + '%"></i>';
    }).join("") + "</div>";
  }

  function render(el) {
    var c = ensure();
    c.innerHTML =
      '<div class="hc-head">' +
        '<b class="hc-sym">' + el.symbol + "</b>" +
        '<span class="hc-names"><em>' + el.nameZh + "</em><small>" + (el.nameEn || "") + "</small></span>" +
        '<span class="hc-sound">\u266a</span>' +
      "</div>" +
      '<div class="hc-meta">' + el.z + " · " + (el.categoryZh || "") +
        (el.period ? " · 第 " + el.period + " 周期" : "") + "</div>" +
      spectrum(el) +
      '<div class="hc-foot">380 nm &mdash; 780 nm</div>';
    return c;
  }

  function place(cell) {
    var w = card.offsetWidth, h = card.offsetHeight;
    /* 别落在周期表上：贴着右侧档案栏的底部出现，只临时盖住档案自己的页脚。
       窄屏（抽屉/底弹层）不放浮卡，点一下就能看完整档案。 */
    var panel = document.getElementById("panel");
    if (!panel) return;
    var pr = panel.getBoundingClientRect();
    var x = Math.max(12, Math.min(pr.right - w - 12, innerWidth - w - 12));
    var y = Math.min(pr.bottom, innerHeight) - h - 12;
    if (y < 12) y = 12;
    card._pos = { x: Math.round(x), y: Math.round(y) };
    applyTilt(0, 0);
  }


  function applyTilt(kx, ky) {
    if (!card || !card._pos) return;
    card.style.transform = "perspective(700px) translate(" + card._pos.x + "px," + card._pos.y +
      "px) rotateX(" + (-ky * 5).toFixed(2) + "deg) rotateY(" + (kx * 7).toFixed(2) + "deg)";
  }

  function hide() {
    cur = null;
    clearTimeout(showTimer);
    if (card) card.classList.remove("is-on");
  }

  document.addEventListener("pointerover", function (e) {
    if (innerWidth < 1100) return;
    var cell = e.target.closest ? e.target.closest(".cell[data-z]") : null;
    if (!cell || cell === cur) return;
    cur = cell;
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    showTimer = setTimeout(function () {
      if (!cur) return;
      var el = byZ[+cur.dataset.z];
      if (!el) return;
      render(el);
      place(cur);
      requestAnimationFrame(function () { card.classList.add("is-on"); });
    }, 90);
  }, { passive: true });

  document.addEventListener("pointerout", function (e) {
    var cell = e.target.closest ? e.target.closest(".cell[data-z]") : null;
    if (!cell || cell !== cur) return;
    cur = null;
    clearTimeout(showTimer);
    hideTimer = setTimeout(function () {
      if (!cur) hide();
    }, 130);
  }, { passive: true });

  document.addEventListener("pointermove", function (e) {
    if (!card || !card.classList.contains("is-on") || !cur) return;
    var r = cur.getBoundingClientRect();
    applyTilt((e.clientX - (r.left + r.width / 2)) / r.width, (e.clientY - (r.top + r.height / 2)) / r.height);
  }, { passive: true });
  addEventListener("scroll", hide, { passive: true, capture: true });
  addEventListener("resize", hide, { passive: true });
})();
