/* 开场：星尘流动，再落到周期表的格子上。 */
(function () {
  const SCENES = [
    {
      id: "dust",
      kicker: "星尘编年史",
      title: "你身上的原子，比太阳还老。",
      sub: "不是地球现造的。更老的恒星烧过它们，有的还更早。",
      ms: 5400,
    },
    {
      id: "bang",
      kicker: "太初",
      title: "一开始只有最上面几格。",
      sub: "大爆炸后的核合成留下氢、氦，和极少的锂。碳要等恒星把三个氦核拼在一起。",
      ms: 6000,
    },
    {
      id: "star",
      kicker: "恒星的炉",
      title: "恒星把周期表往后写。",
      sub: "碳和氧来自氦燃烧。铁附近聚变不再放能。更重的核靠中子俘获。",
      ms: 6200,
    },
    {
      id: "body",
      kicker: "成为你",
      title: "氧最多，然后是碳和氢。",
      sub: "这是解剖学教材里的数量级，不是一张体检单。接下来是 118 格可核对的表。",
      ms: 6200,
    },
    {
      id: "assemble",
      kicker: "归位",
      title: "118 种元素，各自归位。",
      sub: "谱线、焰色、电子层只写核对过的。没有把握的，留空。",
      ms: 4800,
    },
  ];

  const RGB = {
    warm: "244, 232, 214",
    cool: "214, 206, 196",
    gold: "231, 181, 162",
    alkali: "196, 85, 74",
    alkaline: "196, 132, 58",
    transition: "167, 132, 60",
    post: "109, 140, 76",
    metalloid: "47, 141, 132",
    nonmetal: "61, 126, 174",
    halogen: "93, 100, 182",
    noble: "138, 98, 168",
    lanthanide: "184, 93, 120",
    actinide: "164, 90, 112",
  };

  function makeSprite(rgb) {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, `rgba(${rgb}, 1)`);
    grd.addColorStop(0.42, `rgba(${rgb}, 0.35)`);
    grd.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function smooth(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function easeOut(t) {
    const x = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - x, 3);
  }

  function bodyPoints(w, h) {
    const s = Math.min(w, h);
    const cx = w * 0.5;
    const y0 = h * 0.36;
    const pts = [];
    function fill(x, y, rx, ry, n) {
      for (let i = 0; i < n; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random());
        pts.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]);
      }
    }
    fill(cx, y0, s * 0.055, s * 0.068, 90);
    fill(cx, y0 + s * 0.16, s * 0.09, s * 0.12, 200);
    fill(cx - s * 0.12, y0 + s * 0.15, s * 0.03, s * 0.1, 70);
    fill(cx + s * 0.12, y0 + s * 0.15, s * 0.03, s * 0.1, 70);
    fill(cx - s * 0.04, y0 + s * 0.34, s * 0.032, s * 0.12, 80);
    fill(cx + s * 0.04, y0 + s * 0.34, s * 0.032, s * 0.12, 80);
    return pts;
  }

  function StardustIntro() {}

  StardustIntro.prototype.start = function start(opts) {
    this.stop();
    this.opts = opts;
    this.root = document.getElementById("intro");
    this.canvas = document.getElementById("intro-canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.kicker = document.getElementById("intro-kicker");
    this.title = document.getElementById("intro-title");
    this.sub = document.getElementById("intro-sub");
    this.labels = document.getElementById("intro-labels");
    this.dots = document.getElementById("intro-dots");
    this.copy = document.getElementById("intro-copy");
    this.sprites = {};
    Object.keys(RGB).forEach((key) => {
      this.sprites[key] = makeSprite(RGB[key]);
    });
    this.scene = 0;
    this.sceneStart = performance.now();
    this.running = true;
    this.fading = false;
    this.revealed = false;
    this.root.hidden = false;
    this.root.classList.remove("is-fading");
    this.resize();
    this.renderCopy(true);
    this.drawDots();
    this.loop = (now) => this.frame(now);
    this.onResize = () => this.resize();
    window.addEventListener("resize", this.onResize);
    this.raf = requestAnimationFrame(this.loop);
  };

  StardustIntro.prototype.stop = function stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.onResize) window.removeEventListener("resize", this.onResize);
  };

  StardustIntro.prototype.skip = function skip() {
    if (!this.running) return;
    this.finish();
  };

  StardustIntro.prototype.advance = function advance() {
    if (!this.running || this.fading) return;
    if (this.scene >= SCENES.length - 1) {
      this.finish();
      return;
    }
    this.goto(this.scene + 1);
  };

  StardustIntro.prototype.goto = function goto(index) {
    this.scene = index;
    this.sceneStart = performance.now();
    if (this.particles) {
      this.particles.forEach((p) => {
        p.sx = p.x;
        p.sy = p.y;
      });
    }
    if (SCENES[index].id === "assemble") this.prepareAssemble();
    this.renderCopy(false);
    this.drawDots();
  };

  StardustIntro.prototype.reveal = function reveal() {
    if (this.revealed) return;
    this.revealed = true;
    if (this.opts && this.opts.onReveal) this.opts.onReveal();
  };

  StardustIntro.prototype.finish = function finish() {
    if (this.fading) return;
    this.reveal();
    this.fading = true;
    this.root.classList.add("is-fading");
    window.setTimeout(() => {
      this.stop();
      this.root.hidden = true;
      this.root.classList.remove("is-fading");
      if (this.opts && this.opts.onDone) this.opts.onDone();
    }, 720);
  };

  StardustIntro.prototype.resize = function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.w = w;
    this.h = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.particles) {
      const area = w * h;
      const count = Math.max(380, Math.min(1500, Math.round(area / 1200)));
      this.particles = [];
      for (let i = 0; i < count; i += 1) {
        const hueRoll = Math.random();
        this.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 0,
          vy: 0,
          sx: Math.random() * w,
          sy: Math.random() * h,
          tx: 0,
          ty: 0,
          r: Math.random() < 0.08 ? 2.4 : 0.55 + Math.random() * 1.35,
          tone: hueRoll > 0.82 ? "cool" : hueRoll > 0.55 ? "gold" : "warm",
          phase: Math.random() * Math.PI * 2,
          keep: true,
          cat: null,
        });
      }
    } else {
      this.particles.forEach((p) => {
        p.sx = p.x;
        p.sy = p.y;
      });
      if (SCENES[this.scene].id === "assemble") this.prepareAssemble();
      this.sceneStart = performance.now();
    }
  };

  StardustIntro.prototype.prepareAssemble = function prepareAssemble() {
    const targets = (this.opts.getTargets && this.opts.getTargets()) || [];
    const parts = this.particles;
    if (!targets.length) {
      parts.forEach((p) => {
        p.keep = true;
        p.tx = p.x;
        p.ty = p.y;
      });
      return;
    }
    const budget = Math.floor(parts.length * 0.86);
    const per = Math.max(2, Math.floor(budget / targets.length));
    let cursor = 0;
    targets.forEach((t) => {
      for (let k = 0; k < per && cursor < parts.length; k += 1, cursor += 1) {
        const p = parts[cursor];
        p.keep = true;
        p.cat = t.cat;
        p.tx = t.x + (Math.random() - 0.5) * t.w * 0.55;
        p.ty = t.y + (Math.random() - 0.5) * t.h * 0.55;
      }
    });
    for (; cursor < parts.length; cursor += 1) {
      const p = parts[cursor];
      p.keep = false;
      p.cat = null;
      p.tx = p.x + (Math.random() - 0.5) * 80;
      p.ty = p.y - 40 - Math.random() * 80;
    }
  };

  StardustIntro.prototype.targetsFor = function targetsFor(id) {
    const w = this.w;
    const h = this.h;
    const parts = this.particles;
    if (id === "bang") {
      return parts.map((p, i) => {
        const ang = (i / parts.length) * Math.PI * 2 * 3;
        const rad = 16 + (i % 28) * 3.2;
        return [w * 0.5 + Math.cos(ang) * rad, h * 0.48 + Math.sin(ang) * rad * 0.58];
      });
    }
    if (id === "star") {
      const centers = [
        [0.3, 0.5],
        [0.5, 0.42],
        [0.72, 0.54],
      ];
      return parts.map((p, i) => {
        const c = centers[i % 3];
        const ang = i * 2.15;
        const rad = 12 + (i % 26) * 2.4;
        return [w * c[0] + Math.cos(ang) * rad, h * c[1] + Math.sin(ang) * rad * 0.72];
      });
    }
    if (id === "body") {
      if (!this.body || this.bodyW !== w || this.bodyH !== h) {
        this.body = bodyPoints(w, h);
        this.bodyW = w;
        this.bodyH = h;
      }
      return parts.map((p, i) => this.body[i % this.body.length]);
    }
    return null;
  };

  StardustIntro.prototype.frame = function frame(now) {
    if (!this.running) return;
    const scene = SCENES[this.scene];
    const elapsed = now - this.sceneStart;
    if (elapsed >= scene.ms) {
      if (this.scene >= SCENES.length - 1) this.finish();
      else this.goto(this.scene + 1);
    }
    this.step(now);
    this.draw(now);
    if (scene.id === "assemble") {
      const u = Math.max(0, Math.min(1, elapsed / scene.ms));
      const fade = u < 0.72 ? 0 : (u - 0.72) / 0.28;
      if (fade > 0) this.reveal();
      this.root.style.setProperty("--intro-fade", String(fade));
      this.root.style.pointerEvents = fade > 0.35 ? "none" : "auto";
    } else {
      this.root.style.setProperty("--intro-fade", "0");
      this.root.style.pointerEvents = "auto";
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  StardustIntro.prototype.step = function step(now) {
    const scene = SCENES[this.scene];
    const t = now / 1000;
    const u = Math.max(0, Math.min(1, (now - this.sceneStart) / scene.ms));
    const e = easeOut(Math.min(1, u / 0.7));
    const lerpTargets = scene.id === "dust" || scene.id === "assemble" ? null : this.targetsFor(scene.id);
    const w = this.w;
    const h = this.h;
    this.particles.forEach((p, i) => {
      if (scene.id === "dust") {
        const a = Math.sin(p.x * 0.0015 + t * 0.22) + Math.cos(p.y * 0.0017 - t * 0.16);
        p.vx = p.vx * 0.96 + Math.cos(a) * 0.045;
        p.vy = p.vy * 0.96 + Math.sin(a * 1.2) * 0.045;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 10;
        if (p.x > w + 20) p.x = -10;
        if (p.y < -20) p.y = h + 10;
        if (p.y > h + 20) p.y = -10;
        return;
      }
      if (scene.id === "assemble") {
        const ee = easeOut(Math.min(1, u / 0.78));
        p.x = p.sx + (p.tx - p.sx) * ee;
        p.y = p.sy + (p.ty - p.sy) * ee;
        return;
      }
      const tgt = lerpTargets[i];
      const wob = (1 - e) * 10;
      p.x = p.sx + (tgt[0] - p.sx) * e + Math.sin(t * 1.8 + p.phase) * wob;
      p.y = p.sy + (tgt[1] - p.sy) * e + Math.cos(t * 1.4 + p.phase) * wob;
    });
  };

  StardustIntro.prototype.draw = function draw(now) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const scene = SCENES[this.scene];
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1c1916");
    g.addColorStop(0.48, "#141210");
    g.addColorStop(1, "#0c0b09");
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w * 0.55, h * 0.42);
    ctx.rotate(-0.4);
    const band = ctx.createRadialGradient(0, 0, 10, 0, 0, w * 0.48);
    band.addColorStop(0, "rgba(196, 92, 62, 0.16)");
    band.addColorStop(0.42, "rgba(244, 220, 196, 0.05)");
    band.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = band;
    ctx.fillRect(-w, -h * 0.28, w * 2, h * 0.56);
    ctx.restore();
    this.drawOrnament(now, scene);

    ctx.globalCompositeOperation = "lighter";
    const u = Math.max(0, Math.min(1, (now - this.sceneStart) / scene.ms));
    this.particles.forEach((p) => {
      let tone = p.tone;
      if (scene.id === "assemble" && p.cat && RGB[p.cat]) tone = p.cat;
      if (scene.id === "bang") tone = "cool";
      if (scene.id === "star") tone = p.tone === "cool" ? "cool" : "gold";
      const sprite = this.sprites[tone] || this.sprites.warm;
      let alpha = 0.55 + Math.sin(now / 420 + p.phase) * 0.18;
      if (!p.keep && scene.id === "assemble") alpha *= 1 - smooth(u);
      const size = p.r * (scene.id === "assemble" ? 8 : 11);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (scene.id === "dust") this.drawStreaks();
  };

  StardustIntro.prototype.drawOrnament = function drawOrnament(now, scene) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const u = Math.max(0, Math.min(1, (now - this.sceneStart) / scene.ms));
    ctx.save();
    ctx.lineCap = "round";
    if (scene.id === "bang") {
      const rings = [0.16, 0.28, 0.42];
      rings.forEach((scale, index) => {
        const radius = easeOut(Math.min(1, u * 1.3 - index * 0.08)) * Math.min(w, h) * scale;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(231, 181, 162, ${0.28 - index * 0.07})`;
        ctx.lineWidth = 1.25;
        ctx.arc(w * 0.5, h * 0.48, Math.max(1, radius), 0, Math.PI * 2);
        ctx.stroke();
      });
    } else if (scene.id === "star") {
      const centers = [
        [0.3, 0.5],
        [0.5, 0.42],
        [0.72, 0.54],
      ];
      centers.forEach((c, index) => {
        const x = w * c[0];
        const y = h * c[1];
        const spin = now / 900 + index;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(231, 181, 162, 0.45)";
        ctx.lineWidth = 1.4;
        ctx.arc(x, y, 28 + index * 10, spin, spin + 1.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = "rgba(246, 241, 232, 0.2)";
        ctx.arc(x, y, 48 + index * 6, -spin * 0.6, -spin * 0.6 + 1.1);
        ctx.stroke();
      });
    } else if (scene.id === "body") {
      const s = Math.min(w, h);
      const cx = w * 0.5;
      const y0 = h * 0.36;
      const grow = easeOut(Math.min(1, u / 0.45));
      ctx.translate(cx, y0 + s * 0.2);
      ctx.scale(grow, grow);
      ctx.translate(-cx, -(y0 + s * 0.2));
      ctx.beginPath();
      ctx.strokeStyle = "rgba(246, 241, 232, 0.28)";
      ctx.lineWidth = 1.2;
      ctx.ellipse(cx, y0, s * 0.05, s * 0.062, 0, 0, Math.PI * 2);
      ctx.moveTo(cx, y0 + s * 0.062);
      ctx.lineTo(cx, y0 + s * 0.26);
      ctx.moveTo(cx, y0 + s * 0.1);
      ctx.lineTo(cx - s * 0.11, y0 + s * 0.2);
      ctx.moveTo(cx, y0 + s * 0.1);
      ctx.lineTo(cx + s * 0.11, y0 + s * 0.2);
      ctx.moveTo(cx, y0 + s * 0.26);
      ctx.lineTo(cx - s * 0.05, y0 + s * 0.42);
      ctx.moveTo(cx, y0 + s * 0.26);
      ctx.lineTo(cx + s * 0.05, y0 + s * 0.42);
      ctx.stroke();
    }
    ctx.restore();
  };

  StardustIntro.prototype.drawStreaks = function drawStreaks() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(246, 241, 232, 0.28)";
    ctx.lineWidth = 1;
    this.particles.forEach((p, index) => {
      if (index % 18 !== 0) return;
      const len = 6 + p.r * 4;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * len, p.y - p.vy * len);
      ctx.stroke();
    });
    ctx.restore();
  };

  StardustIntro.prototype.renderCopy = function renderCopy(immediate) {
    const scene = SCENES[this.scene];
    const apply = () => {
      this.kicker.textContent = scene.kicker;
      this.title.textContent = scene.title;
      this.sub.textContent = scene.sub;
      this.renderLabels(scene.id);
      const next = document.getElementById("intro-next");
      if (next) next.textContent = this.scene === SCENES.length - 1 ? "进入周期表" : "继续";
      this.copy.classList.remove("is-in");
      void this.copy.offsetWidth;
      this.copy.classList.add("is-in");
    };
    if (immediate) {
      apply();
      return;
    }
    this.copy.classList.remove("is-in");
    this.copy.classList.add("is-out");
    window.setTimeout(() => {
      apply();
      this.copy.classList.remove("is-out");
    }, 220);
  };

  StardustIntro.prototype.renderLabels = function renderLabels(id) {
    const host = this.labels;
    host.innerHTML = "";
    host.className = "intro-labels label-" + id;
    if (id === "bang") {
      host.innerHTML = '<p class="constellation">氢<span>氦</span>锂</p>';
    } else if (id === "star") {
      host.innerHTML =
        '<p class="cluster c1">氢 · 氦 · 锂</p>' +
        '<p class="cluster c2">碳 · 氧</p>' +
        '<p class="cluster c3">铁附近</p>';
    } else if (id === "body") {
      host.innerHTML =
        '<ul class="body-chips"><li>氧</li><li>碳</li><li>氢</li><li>氮</li><li>钙</li><li>磷</li></ul>';
    }
  };

  StardustIntro.prototype.drawDots = function drawDots() {
    this.dots.innerHTML = SCENES.map((scene, i) => {
      const on = i === this.scene ? " is-on" : "";
      return `<span class="dot${on}"></span>`;
    }).join("");
  };

  window.StardustIntro = new StardustIntro();
})();
