import * as THREE from "../lib/three.module.js";

/* 影片：一条连续镜头 —— 星尘里氢和氦先出现，恒星把表一格一格往后写，
   超新星那一下把剩下的重元素砸进来，最后镜头推近，交还给可以点的周期表。 */

const byId = (id) => document.getElementById(id);
const fEl = byId("film");
const gate = byId("film-gate");
const audio = byId("film-audio");
const subEl = byId("film-sub");
const actEl = byId("film-act");
const barEl = byId("film-bar");
const tcEl = byId("film-tc");
const flashEl = byId("film-flash");

const CAT_COLOR = { "碱金属":0xff8a5c, "碱土金属":0xffc266, "过渡金属":0x8fb6d6, "贫金属":0xa8c4b8,
  "类金属":0x9fd3c7, "非金属":0x8ee0b0, "卤素":0xc8f08a, "稀有气体":0xc9a8f0, "镧系":0xf0a8c0, "锕系":0xe0a0a0 };
const BURST = 52.89;

let acts = [], cues = [], total = 110.79;
let renderer, scene, camera, stars, nodes = [], rings = [], glowTex;
let playing = false, t0 = 0, raf = 0, onDone = null, done = false;
let lastT = 0;
let audioOk = false;
let chordPlayer = null, spectra = null;

const SX = 9.2, SY = 10.6, OXC = 9.5, OYC = 4.6;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function rng(seed) {
  return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rnd = rng(137);

/* 元素什么时候到：顺序就是核合成的顺序，重元素等超新星 */
function arrival(z) {
  if (z <= 2) return 2.6 + (z - 1) * 2.4;
  if (z <= 8) return 14 + (z - 3) * 2.0;
  if (z <= 26) return 25 + (z - 9) * 1.5;
  return BURST + 0.06 + (z - 27) * 0.055 + rnd() * 0.4;
}
const flight = (z) => (z <= 26 ? 1.7 : 0.85);

function tileTexture(el) {
  const W = 160, H = 184;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const hex = CAT_COLOR[el.categoryZh] || 0x9fb4c4;
  const rgb = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].join(",");
  g.beginPath();
  g.moveTo(18, 2); g.arcTo(W - 2, 2, W - 2, H - 2, 18); g.arcTo(W - 2, H - 2, 2, H - 2, 18);
  g.arcTo(2, H - 2, 2, 2, 18); g.arcTo(2, 2, W - 2, 2, 18); g.closePath();
  g.fillStyle = "rgba(10,16,26,.94)"; g.fill();
  g.lineWidth = 4; g.strokeStyle = "rgba(" + rgb + ",.88)"; g.stroke();
  g.fillStyle = "rgba(" + rgb + ",.9)"; g.fillRect(2, 2, 9, H - 4);
  g.fillStyle = "rgba(158,178,198,.95)"; g.font = "26px Consolas,monospace"; g.fillText(String(el.z), 24, 40);
  g.fillStyle = "#ffffff"; g.font = "600 78px 'Microsoft YaHei'"; g.textAlign = "center";
  g.fillText(el.symbol, W / 2 + 6, 122);
  g.fillStyle = "rgba(216,230,242,.95)"; g.font = "32px 'Microsoft YaHei'";
  g.fillText(el.nameZh, W / 2 + 6, 166);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
}

function buildScene(els) {
  const canvas = byId("film-canvas");
  const mobile = innerWidth < 760;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070d, 0.0007);
  camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 4000);

  const quad = new THREE.PlaneGeometry(7.0, 8.1);
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  const g2 = glowCanvas.getContext("2d");
  const grd = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,.9)");
  grd.addColorStop(0.4, "rgba(255,255,255,.22)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g2.fillStyle = grd; g2.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(glowCanvas);

  nodes = els.slice().sort((a, b) => a.z - b.z).map((el) => {
    const hex = CAT_COLOR[el.categoryZh] || 0x9fb4c4;
    const tile = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({
      map: tileTexture(el), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: hex,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.0 }));
    scene.add(tile); scene.add(halo);
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1), r = 200 + rnd() * 320;
    return {
      z: el.z, symbol: el.symbol, tile, halo,
      from: new THREE.Vector3(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.7, r * Math.cos(ph)),
      to: new THREE.Vector3((el.col - OXC) * SX, (OYC - el.row) * SY, 0),
      at: arrival(el.z), dur: flight(el.z),
      rx: (rnd() * 2 - 1) * 0.9, ry: (rnd() * 2 - 1) * 0.9,
      phase: rnd() * Math.PI * 2
    };
  });

  const N = mobile ? 6000 : 14000, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1), r = 300 + rnd() * 1500;
    pos[i*3] = r*Math.sin(ph)*Math.cos(th);
    pos[i*3+1] = r*Math.sin(ph)*Math.sin(th);
    pos[i*3+2] = r*Math.cos(ph);
  }
  stars = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0xbcd4ea, size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0.7 }));
  scene.add(stars);

  for (let k = 0; k < 3; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd9a0,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    s.visible = false; scene.add(s); rings.push(s);
  }
  render(0);
}

const _v = new THREE.Vector3();
function render(t) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const vis = clamp01((t - (n.at - 0.8)) / 0.6);
    const e = easeOut(clamp01((t - n.at) / n.dur));
    _v.copy(n.from).lerp(n.to, e);
    n.tile.position.copy(_v); n.halo.position.copy(_v);
    n.tile.rotation.x = (1 - e) * n.rx;
    n.tile.rotation.y = (1 - e) * n.ry;
    let boost = 1;
    if (n.z === 1) boost += 0.5 * smoothstep(89.4, 90.6, t) * (1 - smoothstep(93.2, 94.4, t));
    if (n.z === 11) boost += 0.5 * smoothstep(93.6, 94.8, t) * (1 - smoothstep(97.4, 98.6, t));
    const scale = vis * (0.55 + 0.45 * e) * boost;
    n.tile.scale.setScalar(scale);
    const hs = (11.5 + 5 * (1 - e)) * scale;
    n.halo.scale.set(hs, hs, 1);
    n.halo.material.opacity = vis * (0.14 + 0.3 * (1 - e) + 0.05 * Math.sin(t * 1.7 + n.phase)) *
      (n.z === 1 || n.z === 11 ? boost : 1);
    n.tile.visible = vis > 0.001;
    n.halo.visible = vis > 0.001;
  }

  // 相机
  let x, y, z;
  if (t <= 6.5) {
    const e = easeOut(t / 6.5);
    x = THREE.MathUtils.lerp(-170, 0, e); y = THREE.MathUtils.lerp(120, 6, e); z = THREE.MathUtils.lerp(340, 150, e);
  } else if (t <= BURST) {
    const k = (t - 6.5) / (BURST - 6.5);
    x = Math.sin(t * 0.21) * 7; y = 6 + Math.sin(t * 0.17) * 3; z = THREE.MathUtils.lerp(150, 133, k);
  } else if (t <= 89.4) {
    const k = (t - BURST) / (89.4 - BURST);
    x = Math.sin(t * 0.16) * 9; y = -1 + Math.sin(t * 0.13) * 3; z = THREE.MathUtils.lerp(136, 134, k);
  } else {
    const k = clamp01((t - 89.4) / (105.6 - 89.4));
    x = Math.sin(t * 0.12) * 4; y = -8 + Math.sin(t * 0.1) * 1.5; z = THREE.MathUtils.lerp(150, 158, k);
  }
  /* 竖屏放不下 18 列的构图：拉远，并在最后两幕改成沿表格横移的镜头 */
  if (innerWidth / innerHeight < 1) {
    const zoom = 1.58;
    x *= zoom; y *= zoom; z *= zoom;
    if (t > 89.4) x += THREE.MathUtils.lerp(-40, 40, clamp01((t - 89.4) / (105.6 - 89.4)));
  }
  if (t > BURST && t < BURST + 0.9) {
    const q = 1 - (t - BURST) / 0.9;
    x += Math.sin(t * 90) * 5 * q; y += Math.cos(t * 77) * 4 * q;
  }
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);

  // 超新星冲击波
  const q = t - BURST;
  rings.forEach((s, i) => {
    const k = clamp01((q - i * 0.18) / 2.6);
    s.visible = q > i * 0.18 && k < 1;
    const sc = 60 + k * 900;
    s.scale.set(sc, sc, 1);
    s.material.opacity = (1 - k) * 0.55;
  });
  flashEl.style.opacity = q > 0 && q < 0.34 ? String(0.62 * (1 - q / 0.34)) : "0";

  stars.rotation.y = t * 0.006;
  renderer.render(scene, camera);
}

function actLabel(t) {
  let a = acts[0];
  for (const x of acts) if (t >= x.start) a = x;
  const name = a.name.replace(/^\d+\s*/, "");
  return String(acts.indexOf(a) + 1).padStart(2, "0") + " / " + name;
}
function subtitle(t) {
  let s = "";
  for (const c of cues) if (t >= c.start && t <= c.start + c.dur + 0.25) s = c.text;
  return s;
}
function tc(t) {
  const f = Math.floor((t % 1) * 30);
  return [Math.floor(t / 3600), Math.floor(t / 60) % 60, Math.floor(t) % 60, f]
    .map((v) => String(v).padStart(2, "0")).join(":");
}

let lastAct = "";
function updateUI(t) {
  const a = actLabel(t);
  if (a !== lastAct) { lastAct = a; actEl.textContent = a; }
  actEl.classList.toggle("is-on", t > 0.6);
  const s = subtitle(t);
  if (subEl.textContent !== s) subEl.textContent = s;
  subEl.classList.toggle("is-on", !!s);
  barEl.style.width = (clamp01(t / total) * 100).toFixed(2) + "%";
  tcEl.textContent = tc(t);
}

function tick() {
  if (!playing) return;
  const t = (audioOk && !audio.paused && !audio.ended) ? audio.currentTime
    : (performance.now() - t0) / 1000;
  lastT = t;
  render(t);
  updateUI(t);
  if (t >= total - 0.9) { finish(); return; }
  raf = requestAnimationFrame(tick);
}

function finish() {
  if (done) return;
  done = true; playing = false;
  cancelAnimationFrame(raf);
  try { audio.pause(); } catch (e) {}
  document.body.classList.add("archive-in");
  fEl.classList.add("is-out");
  setTimeout(() => {
    fEl.hidden = true;
    if (onDone) onDone();
    showListenHint();
  }, 900);
}

/* 影片结束那一刻才提示：这个站最特别的东西是听得见的，但得让人知道 */
function showListenHint() {
  try { if (sessionStorage.getItem("stardust-hint") === "1") return; } catch (e) {}
  const tip = document.createElement("div");
  tip.className = "listen-hint";
  tip.innerHTML = "<i></i>悬浮任意元素，能听见它的光谱";
  document.body.appendChild(tip);
  requestAnimationFrame(() => tip.classList.add("is-on"));
  let gone = false;
  const hide = () => {
    if (gone) return;
    gone = true;
    tip.classList.remove("is-on");
    setTimeout(() => tip.remove(), 500);
    try { sessionStorage.setItem("stardust-hint", "1"); } catch (e) {}
  };
  setTimeout(hide, 9000);
  const table = byId("table");
  if (table) table.addEventListener("pointerover", hide, { once: true, passive: true });
}

function startFilm(opts) {
  onDone = opts && opts.onDone;
  done = false; playing = false; lastAct = "";
  fEl.hidden = false;
  fEl.classList.remove("is-out");
  gate.classList.remove("is-out");
  if (!renderer) {
    Promise.all([fetch("data/acts.json").then((r) => r.json()),
                 fetch("data/elements.json").then((r) => r.json())]).then(([tl, data]) => {
      acts = tl.acts; cues = tl.cues; total = tl.total;
      buildScene(data.elements);
    }).catch(() => finish());
  } else {
    render(0); updateUI(0);
  }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
}

function begin() {
  gate.classList.add("is-out");
  audioOk = false;
  try {
    audio.currentTime = 0;
    const p = audio.play();
    if (p && p.then) p.then(() => { audioOk = true; }).catch(() => { audioOk = false; });
    else audioOk = true;
  } catch (e) { audioOk = false; }
  t0 = performance.now();
  playing = true;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(tick);
}

/* ---------- 元素的声音：悬浮/点按就响 ---------- */
let au = null;
async function initChords() {
  if (!window.StardustAudio) return;
  try {
    spectra = await fetch("data/spectra.json").then((r) => r.json());
    au = new window.StardustAudio();
    au.setSpectra(spectra);
  } catch (e) { au = null; }
}
function playElement(z) {
  if (!au) return;
  au.unlock();
  const n = nodes.find((x) => x.z === Number(z));
  if (n) au.playChord(n.symbol, { dur: 3.2, gain: 0.18 });
}
function bindTableAudio() {
  const table = byId("table");
  if (!table) return;
  let last = 0;
  table.addEventListener("pointerover", (e) => {
    const cell = e.target.closest("[data-z]");
    if (!cell) return;
    const z = cell.getAttribute("data-z");
    if (z === last) return;
    last = z; playElement(z);
  }, { passive: true });
  table.addEventListener("click", (e) => {
    const cell = e.target.closest("[data-z]");
    if (cell) playElement(cell.getAttribute("data-z"));
  });
}

window.__filmStart = startFilm;
window.__filmAdvance = () => { try { audio.currentTime = Math.min(audio.currentTime + 12, total - 1); } catch (e) {} };
window.__filmSkip = finish;
window.__playElement = playElement;
/* 外部时钟：逐帧渲染与出片用（不依赖音频 seek，本地静态服务器也能跑） */
window.__filmSeek = (ms) => {
  const t = Math.max(0, ms / 1000);
  playing = false; cancelAnimationFrame(raf);
  lastT = t; render(t); updateUI(t);
  return { t, act: actLabel(t), sub: subtitle(t) };
};
window.__filmState = () => ({
  t: +lastT.toFixed(2), playing, done, nodes: nodes.length, cues: cues.length, acts: acts.length,
  audio: { paused: !!audio.paused, ended: !!audio.ended, ct: +audio.currentTime.toFixed(2),
           dur: +(audio.duration || 0).toFixed(2), err: audio.error ? audio.error.code : 0 }
});
byId("film-play").addEventListener("click", () => {
  if (au) au.unlock();
  begin();
});
byId("film-skip").addEventListener("click", finish);
byId("film-direct").addEventListener("click", finish);
addEventListener("resize", () => {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});

initChords();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindTableAudio);
} else {
  bindTableAudio();
}
window.__filmDrain && window.__filmDrain();
