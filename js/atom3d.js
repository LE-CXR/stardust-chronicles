import * as THREE from "../lib/three.module.js";

/* 元素档案里的三维原子：核 + 按主量子数分层的电子轨道。
   电子数来自 shells（真实数据）；轨道形状仍是示意，面板里的说明照旧。 */

const BY_Z = new Map((window.STARDUST_ELEMENTS || []).map((e) => [e.z, e]));
const BRASS = 0xd8a55a, ELECTRON = 0x7fa4c0, RING = 0x9a7b4f;

const canvas = document.createElement("canvas");
canvas.className = "atom3d";
canvas.setAttribute("aria-hidden", "true");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
camera.position.set(0, 0, 40);

const atom = new THREE.Group();
scene.add(atom);
const rings = [];
let nucleus = null, nucT0 = 0;
let built = 0, tiltX = 0, tiltY = 0, aimX = 0, aimY = 0, raf = 0, frames = 0, lastW = 0;

const sphereGeo = new THREE.SphereGeometry(1, 12, 10);
const ringGeo = new THREE.TorusGeometry(1, 0.012, 6, 96);
const coreGeo = new THREE.IcosahedronGeometry(1, 2);
const dotCanvas = document.createElement("canvas");
dotCanvas.width = dotCanvas.height = 64;
const d2 = dotCanvas.getContext("2d");
const dg = d2.createRadialGradient(32, 32, 0, 32, 32, 32);
dg.addColorStop(0, "rgba(255,255,255,1)");
dg.addColorStop(0.45, "rgba(210,230,245,.55)");
dg.addColorStop(1, "rgba(210,230,245,0)");
d2.fillStyle = dg; d2.fillRect(0, 0, 64, 64);
const dotTex = new THREE.CanvasTexture(dotCanvas);
const glowCanvas = document.createElement("canvas");
glowCanvas.width = glowCanvas.height = 128;
const g2 = glowCanvas.getContext("2d");
const grd = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
grd.addColorStop(0, "rgba(255,226,168,.9)");
grd.addColorStop(0.4, "rgba(216,165,90,.28)");
grd.addColorStop(1, "rgba(216,165,90,0)");
g2.fillStyle = grd; g2.fillRect(0, 0, 128, 128);
const glowTex = new THREE.CanvasTexture(glowCanvas);


function clearAtom() {
  for (let i = atom.children.length - 1; i >= 0; i--) {
    const c = atom.children[i];
    atom.remove(c);
    c.traverse && c.traverse((n) => {
      if (n.geometry && n.geometry !== sphereGeo && n.geometry !== ringGeo && n.geometry !== coreGeo) n.geometry.dispose();
      if (n.material) n.material.dispose();
    });
  }
  rings.length = 0;
}

function build(z) {
  const el = BY_Z.get(Number(z));
  if (!el) return;
  clearAtom();
  built = Number(z);
  const nuc = new THREE.Group();
  atom.add(nuc);
  nucleus = nuc; nucT0 = performance.now();
  nuc.scale.setScalar(0.001);

  // 原子核：一个发光芯，外面裹着若干核子（按序数缩放，最多 48 颗）
  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: BRASS, transparent: true, opacity: 0.95 }));
  core.scale.setScalar(1.6);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(13, 13, 1);
  nuc.add(halo);
  nuc.add(core);

  const nucleons = Math.min(48, Math.max(2, Math.round(el.z * 0.9)));
  const rnd = (function (s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(z * 7919);
  for (let i = 0; i < nucleons; i++) {
    const r = 2.1 * Math.cbrt(rnd()), th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1);
    const m = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({
      color: i % 2 ? BRASS : 0xf1e3c8, transparent: true, opacity: 0.55 }));
    m.scale.setScalar(0.34);
    m.position.set(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
    nuc.add(m);
  }

  // 电子层：第 i 层一个环，电子沿环均匀排布并绕行
  const shells = el.shells || [];
  shells.forEach((count, i) => {
    const radius = 5.2 + i * 2.5;
    const ring = new THREE.Group();
    const bx = 1.25 - i * 0.3, by = i * 0.8, bz = i * 0.4;
    ring.rotation.set(bx, by, bz);
    ring.scale.setScalar(0.001);
    atom.add(ring);

    const line = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: RING, transparent: true, opacity: 0.46 }));
    line.scale.set(radius, radius, 1);
    ring.add(line);

    const spin = new THREE.Group();
    ring.add(spin);

    // 电子：按该层真实电子数排布，用光点渲染
    const n = Math.max(1, count);
    const epos = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      epos[k * 3] = Math.cos(a) * radius;
      epos[k * 3 + 1] = Math.sin(a) * radius;
      epos[k * 3 + 2] = 0;
    }
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute("position", new THREE.BufferAttribute(epos, 3));
    spin.add(new THREE.Points(eGeo, new THREE.PointsMaterial({
      color: 0x3f6f96, size: 2.6, map: dotTex, transparent: true, opacity: 0.95,
      depthWrite: false, sizeAttenuation: true })));

    // 电子云：轨道附近的概率薄雾（示意，不额外声明数值）
    const cn = Math.min(180, 48 + count * 5);
    const cpos = new Float32Array(cn * 3);
    const rr = (function (seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(z * 131 + i * 17);
    for (let k = 0; k < cn; k++) {
      const a = rr() * Math.PI * 2;
      const rad = radius + (rr() - 0.5) * 0.42;
      cpos[k * 3] = Math.cos(a) * rad;
      cpos[k * 3 + 1] = Math.sin(a) * rad;
      cpos[k * 3 + 2] = (rr() - 0.5) * 0.28;
    }
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute("position", new THREE.BufferAttribute(cpos, 3));
    spin.add(new THREE.Points(cGeo, new THREE.PointsMaterial({
      color: 0x7fa4c0, size: 1.6, map: dotTex, transparent: true, opacity: 0.15,
      depthWrite: false, sizeAttenuation: true })));

    rings.push({ ring, spin, speed: 0.5 / Math.sqrt(radius) * (i % 2 ? -1 : 1),
      t0: performance.now() + i * 70, bx, by, bz });
  });

  const outer = 5.2 + Math.max(0, shells.length - 1) * 2.5 + 1.6;
  camera.position.z = outer / Math.tan(Math.PI * 19 / 180) * 1.05;
  camera.lookAt(0, 0, 0);
  sizeToBox();
}

function sizeToBox() {
  const w = Math.max(160, canvas.clientWidth || 240);
  const h = Math.max(180, canvas.clientHeight || 240);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function tick() {
  raf = requestAnimationFrame(tick);
  if (!canvas.isConnected) return;
  if (document.hidden) return;
  if (++frames % 20 === 0 && canvas.clientWidth && canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; sizeToBox(); }
  tiltX += (aimX - tiltX) * 0.06;
  tiltY += (aimY - tiltY) * 0.06;
  atom.rotation.x = -0.18 + tiltX;
  atom.rotation.y += 0.0032;
  atom.rotation.y += 0;
  atom.rotation.z = tiltY * 0.4;
  const now = performance.now();
  if (nucleus) {
    const k = Math.min(1, Math.max(0, (now - nucT0) / 380));
    nucleus.scale.setScalar(0.001 + 0.999 * (1 - Math.pow(1 - k, 3)));
  }
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    const k = Math.min(1, Math.max(0, (now - r.t0) / 430));
    const e = 1 - Math.pow(1 - k, 3);
    r.ring.scale.setScalar(0.001 + 0.999 * e);
    r.ring.rotation.y = r.by + (1 - e) * 1.1;
    r.ring.rotation.x = r.bx + (1 - e) * 0.35;
    r.ring.rotation.z = r.bz;
    r.spin.rotation.z += r.speed * 0.012;
  }
  renderer.render(scene, camera);
}

/* 面板每次重绘都会换掉内容，但 canvas 节点可以整体搬过去，WebGL 上下文不丢 */
function mount() {
  const svg = document.querySelector("#panel .shell-svg");
  if (!svg) return;
  svg.style.display = "none";
  const titles = document.querySelectorAll("#panel .section-title");
  let anchor = null;
  for (let i = 0; i < titles.length; i++) {
    if (titles[i].textContent.trim() === "\u7535\u5b50\u5c42") { anchor = titles[i]; break; }
  }
  const head = document.querySelector("#panel .panel-head");
  if (head) head.insertAdjacentElement("afterend", canvas);
  else if (anchor) anchor.insertAdjacentElement("afterend", canvas);
  else svg.parentElement.insertBefore(canvas, svg.nextSibling);
  sizeToBox();
  const cell = document.querySelector('.cell[aria-pressed="true"]');
  if (cell && Number(cell.dataset.z) !== built) build(cell.dataset.z);
}

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  aimX = ((e.clientY - r.top) / r.height - 0.5) * 0.5;
  aimY = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
}, { passive: true });
canvas.addEventListener("pointerleave", () => { aimX = 0; aimY = 0; });

const panel = document.getElementById("panel");
if (panel) {
  new MutationObserver(() => setTimeout(mount, 30)).observe(panel, { childList: true, subtree: true });
  addEventListener("resize", sizeToBox, { passive: true });
  mount();
  tick();
}

window.__atomDebug = function () {
  return { rings: rings.length, s0: rings[0] ? rings[0].ring.scale.x : -1,
    nuc: nucleus ? nucleus.scale.x : -1, conn: canvas.isConnected,
    hidden: document.hidden, z: built, frames: frames };
};
window.__atomRender = function () { renderer.render(scene, camera); return true; };
window.__atomPixels = function () {
  const gl = renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let sum = 0, nz = 0;
  for (let i = 0; i < buf.length; i += 4) { sum += buf[i + 3]; if (buf[i + 3] > 8) nz++; }
  return { w: w, h: h, meanA: +(sum / (w * h)).toFixed(2), nz: nz };
};
window.__atomInfo = function () {
  renderer.render(scene, camera);
  const i = renderer.info.render;
  return { calls: i.calls, tris: i.triangles, points: i.points,
    camZ: +camera.position.z.toFixed(2), aspect: +camera.aspect.toFixed(3),
    children: atom.children.length, atomScale: +atom.scale.x.toFixed(3),
    atomRotY: +atom.rotation.y.toFixed(3) };
};
