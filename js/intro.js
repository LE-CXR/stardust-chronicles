/* 开场：星尘流动，再落到周期表的格子上。 */
(function () {
  const SCENES = [
    {
      id: "dust",
      kicker: "星尘编年史",
      title: "比太阳更早的火，还留在你身上。",
      sub: "你体内的原子不是地球现造的。它们来自更老的恒星，以及比恒星更早的几分钟。",
      ms: 5400,
    },
    {
      id: "bang",
      kicker: "太初",
      title: "最初，周期表只有最上面的三格。",
      sub: "大爆炸后的核合成留下氢、氦，和极少的锂。碳要等恒星把三个氦核拼在一起。",
      ms: 6000,
    },
    {
      id: "star",
      kicker: "恒星的炉",
      title: "然后，恒星把表一格一格往后写。",
      sub: "碳和氧来自氦的燃烧。铁附近，聚变不再净放出能量。更重的核，要靠中子俘获。",
      ms: 6200,
    },
    {
      id: "body",
      kicker: "成为你",
      title: "氧最多，然后是碳和氢。",
      sub: "这是解剖学教材里的数量级，不是一张体检单。真正要读的，是接下来这 118 格。",
      ms: 6200,
    },
    {
      id: "assemble",
      kicker: "归位",
      title: "星尘站回自己的格子。",
      sub: "谱线、焰色、电子层，只写核对过的部分。没有把握的，就留空。",
      ms: 4800,
    },
  ];

  const RGB = {
    warm: "244, 228, 204",
    cool: "176, 214, 236",
    gold: "228, 186, 106",
    alkali: "224, 122, 104",
    alkaline: "227, 161, 90",
    transition: "226, 197, 107",
    post: "156, 186, 122",
    metalloid: "94, 184, 164",
    nonmetal: "106, 174, 214",
    halogen: "139, 150, 224",
    noble: "176, 138, 212",
    lanthanide: "224, 138, 160",
    actinide: "210, 122, 144",
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

  StardustIntro.prototype.finish = function finish() {
    if (this.fading) return;
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
      const fade = u < 0.78 ? 0 : (u - 0.78) / 0.22;
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
    const e = smooth(Math.min(1, u / 0.72));
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
        const ee = smooth(Math.min(1, u / 0.8));
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
    g.addColorStop(0, "#101820");
    g.addColorStop(0.45, "#081116");
    g.addColorStop(1, "#060c10");
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w * 0.55, h * 0.42);
    ctx.rotate(-0.45);
    const band = ctx.createRadialGradient(0, 0, 10, 0, 0, w * 0.48);
    band.addColorStop(0, "rgba(226, 198, 150, 0.16)");
    band.addColorStop(0.45, "rgba(120, 150, 170, 0.05)");
    band.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = band;
    ctx.fillRect(-w, -h * 0.28, w * 2, h * 0.56);
    ctx.restore();

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
    };
    if (immediate) {
      apply();
      return;
    }
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
