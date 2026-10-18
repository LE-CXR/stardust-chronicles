/* 导览：切章时把该章的元素错峰点亮一次，并把右侧档案落到第一个元素上。
   数据来自 app.js 已经渲染好的 chips（它们就是这一章涉及的原子序数）。 */
(function () {
  "use strict";
  var STORY = window.STARDUST_STORY || { chapters: [] };
  var storyEl = null, lastKey = null, timer = 0;

  function chapterKey() {
    var k = storyEl && storyEl.querySelector(".kicker");
    return k ? k.textContent.trim() : "";
  }

  function cellsOfChapter() {
    var cur = storyEl.querySelector('.dots button[aria-current="true"]');
    var idx = cur ? +cur.getAttribute("data-chapter") : -1;
    var ch = STORY.chapters[idx];
    var zs = (ch && ch.elements) || [];
    return zs.map(function (z) {
      return document.querySelector('.cell[data-z="' + z + '"]');
    }).filter(Boolean);
  }

  function breathe(cells) {
    cells.forEach(function (cell, i) {
      cell.classList.remove("is-tour");
      cell.style.setProperty("--k", i);
      // 强制重排，让重复切章也能重新播一次
      void cell.offsetWidth;
      cell.classList.add("is-tour");
    });
    clearTimeout(timer);
    timer = setTimeout(function () {
      cells.forEach(function (cell) { cell.classList.remove("is-tour"); });
    }, 2600);
  }

  function syncDim() {
    var mode = document.getElementById("mode-story");
    var on = mode && mode.getAttribute("aria-pressed") === "true";
    var cur = storyEl && storyEl.querySelector('.dots button[aria-current="true"]');
    var idx = cur ? +cur.getAttribute("data-chapter") : -1;
    var ch = STORY.chapters[idx];
    var set = {};
    ((ch && ch.elements) || []).forEach(function (z) { set[z] = 1; });
    var cells = document.querySelectorAll("#table .cell[data-z]");
    for (var i = 0; i < cells.length; i++) {
      var z = cells[i].dataset.z;
      cells[i].classList.toggle("is-dim", !!on && !set[z]);
    }
  }

  function follow() {
    if (!storyEl) return;
    var mode = document.getElementById("mode-story");
    if (!mode || mode.getAttribute("aria-pressed") !== "true") { lastKey = null; return; }
    var key = chapterKey();
    if (!key || key === lastKey) return;
    lastKey = key;
    var cells = cellsOfChapter();
    if (!cells.length) return;
    breathe(cells);
    syncDim();
    /* 导览自动选中只在桌面做；手机上会把底部档案顶出来 */
    if (innerWidth >= 1100) setTimeout(function () { cells[0].click(); }, 260);
  }

  function boot() {
    storyEl = document.getElementById("story");
    if (!storyEl) return;
    if (window.MutationObserver) {
      new MutationObserver(function () { setTimeout(follow, 40); })
        .observe(storyEl, { childList: true, subtree: true });
    }
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("#mode-story, #mode-explore")) setTimeout(function () { follow(); syncDim(); }, 150);
    }, true);
    follow();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
