/* 宇宙背景：三层星点 + 一层星云，随指针做很小的透视转向。
   放在最底层，内容仍是原来的纸面；两者叠成"纸片浮在星海里"。 */
(function () {
  "use strict";
  var canvas = document.createElement("canvas");
  canvas.className = "cosmos";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var stars = [], nebula = null;
  var px = 0, py = 0, tx = 0, ty = 0, t0 = performance.now();

  function rng(s) {
    return function () { s |= 0; s = s + 0x6D2B79F5 | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  function buildNebula() {
    nebula = document.createElement("canvas");
    nebula.width = W; nebula.height = H;
    var g = nebula.getContext("2d");
    g.fillStyle = "#05070d";
    g.fillRect(0, 0, W, H);
    var spots = [
      [0.24, 0.18, 0.55, "56,74,110"],
      [0.82, 0.32, 0.48, "92,64,54"],
      [0.55, 0.86, 0.6, "40,58,86"]
    ];
    spots.forEach(function (s) {
      var r = Math.max(W, H) * s[2];
      var grd = g.createRadialGradient(W * s[0], H * s[1], 0, W * s[0], H * s[1], r);
      grd.addColorStop(0, "rgba(" + s[3] + ",.20)");
      grd.addColorStop(0.55, "rgba(" + s[3] + ",.06)");
      grd.addColorStop(1, "rgba(" + s[3] + ",0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
    });
  }

  function resize() {
    W = canvas.width = Math.round(innerWidth * DPR);
    H = canvas.height = Math.round(innerHeight * DPR);
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    buildNebula();
    var n = Math.round((innerWidth * innerHeight) / 5200);
    n = Math.max(240, Math.min(620, n));
    var r = rng(20261018);
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: r() * W, y: r() * H,
        r: (0.4 + r() * 1.5) * DPR,
        d: 0.25 + r() * 0.9,
        a: 0.25 + r() * 0.55,
        p: r() * 6.283,
        s: 0.02 + r() * 0.05
      });
    }
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (document.hidden) return;
    var t = (now - t0) / 1000;
    tx += (px - tx) * 0.06;
    ty += (py - ty) * 0.06;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (nebula) ctx.drawImage(nebula, 0, 0);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var ox = tx * 34 * s.d * DPR, oy = ty * 22 * s.d * DPR;
      var tw = 0.72 + 0.28 * Math.sin(t * (0.6 + s.s * 8) + s.p);
      ctx.fillStyle = "rgba(226,236,248," + (s.a * tw).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(s.x + ox, s.y + oy, s.r, 0, 6.283);
      ctx.fill();
    }
  }

  addEventListener("pointermove", function (e) {
    px = (e.clientX / innerWidth - 0.5) * 2;
    py = (e.clientY / innerHeight - 0.5) * 2;
    canvas.style.transform =
      "perspective(1100px) rotateY(" + (px * 1.1).toFixed(2) + "deg) rotateX(" +
      (-py * 0.8).toFixed(2) + "deg) scale(1.03)";
  }, { passive: true });
  addEventListener("resize", resize, { passive: true });

  document.documentElement.classList.add("cosmic");
  resize();
  requestAnimationFrame(draw);
})();
