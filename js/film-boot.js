/* 先占位，等 three.js 模块加载完再交给它 —— app.js 是普通脚本，不能等 import。
   file:// 下浏览器禁止加载 ES 模块，所以那里直接跳过影片（表格照常可用）。 */
(function () {
  var queue = [];
  var fileMode = location.protocol === "file:";
  window.StardustIntro = {
    start: function (opts) {
      if (fileMode) {
        var film = document.getElementById("film");
        if (film) film.hidden = true;
        if (opts && opts.onDone) opts.onDone();
        return;
      }
      if (window.__filmStart) window.__filmStart(opts);
      else queue.push(opts);
    },
    advance: function () { if (window.__filmAdvance) window.__filmAdvance(); },
    skip: function () { if (window.__filmSkip) window.__filmSkip(); }
  };
  window.__filmDrain = function () {
    var list = queue; queue = [];
    for (var i = 0; i < list.length; i++) window.__filmStart && window.__filmStart(list[i]);
  };
  if (!fileMode) {
    ["js/film.js", "js/atom3d.js"].forEach(function (src) {
      var s = document.createElement("script");
      s.type = "module";
      s.src = src;
      document.head.appendChild(s);
    });
  }
})();
