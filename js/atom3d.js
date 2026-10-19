import * as THREE from "../lib/three.module.js";

/* 元素档案里的三维原子：核 + 按主量子数分层的电子轨道。
   电子数来自 shells（真实数据）；轨道形状仍是示意，面板里的说明照旧。 */

const BY_Z = new Map((window.STARDUST_ELEMENTS || []).map((e) => [e.z, e]));
let ISO = null;
fetch("data/isotopes.json").then(function (r) { return r.json(); }).then(function (d) {
  ISO = d.elements || {};
  if (built) build(built);
}).catch(function () {});
const BRASS = 0xd8a55a, ELECTRON = 0x7fa4c0, RING = 0x9a7b4f;

let capEl = null, mixEl = null;
const canvas = document.createElement("canvas");
canvas.className = "atom3d";
canvas.setAttribute("aria-hidden", "true");

const holder = document.createElement("div");
holder.className = "atom-holder";
holder.appendChild(canvas);
const badge = document.createElement("span");
badge.className = "atom-badge";
badge.textContent = "点击展开";
holder.appendChild(badge);
capEl = document.createElement("p");
capEl.className = "atom-iso";
holder.appendChild(capEl);
mixEl = document.createElement("div");
mixEl.className = "atom-mix";
holder.appendChild(mixEl);

const MIXC = ["#d8a55a", "#9fb0c0", "#c2ab84"];
function renderMix(el) {
  if (!mixEl) return;
  const rec = ISO && ISO[String(el.z)];
  if (!rec || !rec.mixes || !rec.mixes.length) { mixEl.innerHTML = ""; return; }
  mixEl.innerHTML = rec.mixes.map(function (m, i) {
    return '<i style="flex:' + (m.abundance * 100).toFixed(3) + ";background:" + MIXC[i % MIXC.length] +
      '" title="' + el.symbol + "-" + m.A + " " + (m.abundance * 100).toFixed(2) + '%"></i>';
  }).join("");
}

function isoText(el) {
  const rec = ISO && ISO[String(el.z)];
  if (!rec || !rec.mixes || !rec.mixes.length) return "无天然同位素 · 合成元素";
  const parts = rec.mixes.slice(0, 3).map(function (m) {
    const pct = (m.abundance * 100).toFixed(m.abundance >= 0.9999 ? 0 : 2);
    return el.symbol + "-" + m.A + " " + pct + "%";
  });
  return "天然同位素：" + parts.join(" · ");
}

const focusLayer = document.createElement("div");
focusLayer.className = "atom-focus";
focusLayer.innerHTML =
  '<div class="af-inner"><div class="af-head"><b class="af-sym"></b><span class="af-name"></span>' +
  '<span class="af-note">拖动旋转 · Esc 关闭</span></div><div class="af-stage"></div>' +
  '<div class="af-foot"><span class="af-shells"></span>' +
  '<button type="button" class="af-close">关闭</button></div></div>';
document.body.appendChild(focusLayer);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
camera.position.set(0, 0, 40);

/* 核子要有体积感就得吃光：一盏暖主光 + 一盏冷轮廓光 + 环境补光 */
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xffe4bd, 2.1);
keyLight.position.set(7, 9, 11);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x7fa9d8, 1.5);
rimLight.position.set(-9, -5, -9);
scene.add(rimLight);

const atom = new THREE.Group();
scene.add(atom);

const rings = [];
let nucleus = null, nucT0 = 0, highlight = -1;
let baseZ = 40, focused = false, userX = 0, dragging = false, lastX = 0, lastY = 0, dragMoved = 0;
let focusT0 = 0, focusHalo = null, lastCounts = null, renderOn = true, renders = 0;
let nucInst = null, nucBase = null, nucPhase = null, nucScale = 0.3, jitterFrame = 0;
const jDummy = new THREE.Object3D();
let built = 0, tiltX = 0, tiltY = 0, aimX = 0, aimY = 0, raf = 0, frames = 0, lastW = 0;

const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const ringGeo = new THREE.TorusGeometry(1, 0.009, 8, 128);
const ringGlowGeo = new THREE.TorusGeometry(1, 0.055, 8, 96);
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

/* 远处的尘埃：给三维空间一点尺度感，不抢主体（要等 dotTex 定义之后再建） */
const dustGeo = new THREE.BufferGeometry();
const DUST = 120;
const dustPos = new Float32Array(DUST * 3);
(function seedDust() {
  let s = 20261019;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < DUST; i++) {
    const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
    const r = 11 + rnd() * 13;
    dustPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    dustPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
    dustPos[i * 3 + 2] = r * Math.cos(ph);
  }
})();
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: 0x9fc0de, size: 0.55, map: dotTex, transparent: true, opacity: 0.3,
  depthWrite: false, sizeAttenuation: true,
}));
scene.add(dust);


function clearAtom() {
  for (let i = atom.children.length - 1; i >= 0; i--) {
    const c = atom.children[i];
    atom.remove(c);
    c.traverse && c.traverse((n) => {
      if (n.geometry && n.geometry !== sphereGeo && n.geometry !== ringGeo &&
          n.geometry !== ringGlowGeo && n.geometry !== coreGeo) n.geometry.dispose();
      if (n.material) n.material.dispose();
    });
  }
  rings.length = 0;
}


function labelSprite(text) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(251,246,234,.86)";
  g.beginPath(); g.roundRect(4, 10, 120, 44, 11); g.fill();
  g.strokeStyle = "rgba(150,120,80,.38)"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#5c462a"; g.font = "600 25px 'Microsoft YaHei'";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 64, 33);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }));
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

  // 原子核：发光芯 + 一小圈暖 halo。halo 必须比 K 层小，否则最内层电子会被洗掉
  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.3 }));
  core.scale.setScalar(0.55);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd7a0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(6.2, 6.2, 1);
  nuc.add(halo);
  focusHalo = halo;
  nuc.add(core);

  /* 核子：有天然同位素数据就按真实质子/中子数摆，没有就退回示意 */
  const iso = ISO && ISO[String(el.z)];
  const protons = el.z;
  const total = iso ? Math.max(protons, iso.A) : Math.min(48, Math.max(2, Math.round(el.z * 0.9)));
  const rnd = (function (s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })(z * 7919);
  const nucR = Math.min(5.0, Math.max(1.0, 3.2 * Math.cbrt(total / 56)));
  const inst = new THREE.InstancedMesh(sphereGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.22 }), total);
  const dummy = new THREE.Object3D();
  const dummyPositions = new Float32Array(total * 3);
  const cProton = new THREE.Color(BRASS), cNeutron = new THREE.Color(0x9fb0c0),
    cSchematic = new THREE.Color(0xc2ab84);
  for (let i = 0; i < total; i++) {
    const u = rnd(), th = rnd() * 6.283, ph = Math.acos(2 * rnd() - 1);
    const r = nucR * Math.cbrt(u) * 0.82;
    dummy.position.set(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
    dummyPositions[i*3] = dummy.position.x; dummyPositions[i*3+1] = dummy.position.y; dummyPositions[i*3+2] = dummy.position.z;
    dummy.scale.setScalar(total <= 4 ? 0.42 : 0.34);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    inst.setColorAt(i, iso ? (i < protons ? cProton : cNeutron) : cSchematic);
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  nuc.add(inst);
  nucInst = inst;
  nucBase = new Float32Array(inst.count * 3);
  nucPhase = new Float32Array(inst.count);
  nucScale = total <= 4 ? 0.42 : 0.34;
  for (let i = 0; i < inst.count; i++) {
    nucBase[i*3] = dummyPositions[i*3];
    nucBase[i*3+1] = dummyPositions[i*3+1];
    nucBase[i*3+2] = dummyPositions[i*3+2];
    nucPhase[i] = i * 0.7;
  }
  if (capEl) capEl.textContent = isoText(el);
  renderMix(el);
  lastCounts = iso
    ? { z: el.z, protons: protons, neutrons: total - protons, total: total, isotope: iso.A, estimated: false }
    : { z: el.z, protons: null, neutrons: null, total: total, isotope: null, estimated: true };

  // 电子层：第 i 层一个环，电子沿环均匀排布并绕行
  const shells = el.shells || [];
  const R0 = 6.6, DR = 2.35;   /* K 层必须落在核与 halo 之外，否则第一层看不见 */
  shells.forEach((count, i) => {
    const radius = R0 + i * DR;
    const ring = new THREE.Group();
    const bx = 1.22 - i * 0.27, by = i * 0.72, bz = i * 0.38;
    ring.rotation.set(bx, by, bz);
    ring.scale.setScalar(0.001);
    atom.add(ring);

    /* 轨道：一条清晰细环 + 一圈很淡的辉光，叠出“发光轨道”的层次 */
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xc9a86a, transparent: true, opacity: 0.52,
      blending: THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.Mesh(ringGeo, lineMat);
    line.scale.set(radius, radius, 1);
    ring.add(line);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xb08d4f, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false });
    const glowRing = new THREE.Mesh(ringGlowGeo, glowMat);
    glowRing.scale.set(radius, radius, 1);
    ring.add(glowRing);

    const spin = new THREE.Group();
    ring.add(spin);

    // 电子：按该层真实电子数排布
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

    const eMat = new THREE.PointsMaterial({
      color: 0xe6f4ff, size: 2.0, map: dotTex, transparent: true, opacity: 0.95,
      depthWrite: false, sizeAttenuation: true });
    spin.add(new THREE.Points(eGeo, eMat));

    /* 两圈叠加的辉光让电子像有体积的小光球 */
    const eGlowMat = new THREE.PointsMaterial({
      color: 0x5f9fd6, size: 5.0, map: dotTex, transparent: true, opacity: 0.32,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    spin.add(new THREE.Points(eGeo, eGlowMat));

    /* 拖尾：同一组点滞后一点角度，形成很轻的彗尾 */
    const tails = [];
    [0.085, 0.17].forEach((lag, ti) => {
      const g = new THREE.Group();
      g.rotation.z = -lag;
      const m = new THREE.PointsMaterial({
        color: 0x4f8cc4, size: 3.8 - ti * 0.9, map: dotTex, transparent: true,
        opacity: 0.14 - ti * 0.06, depthWrite: false,
        blending: THREE.AdditiveBlending, sizeAttenuation: true });
      g.add(new THREE.Points(eGeo, m));
      spin.add(g);
      tails.push(m);
    });

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
    const cMat = new THREE.PointsMaterial({
      color: 0x7fa4c0, size: 1.6, map: dotTex, transparent: true, opacity: 0.15,
      depthWrite: false, sizeAttenuation: true });
    spin.add(new THREE.Points(cGeo, cMat));

    rings.push({ ring, spin, lineMat, glowMat, eMat, eGlowMat, cMat, tails,
      speed: 0.52 / Math.sqrt(radius) * (i % 2 ? -1 : 1),
      t0: performance.now() + i * 70, bx, by, bz });
  });

  const outer = R0 + Math.max(0, shells.length - 1) * DR + 2.2;
  /* 自检用：最内层半径必须大于核 + halo，否则 K 层会被核光淹没 */
  window.__atomInfo = {
    z: el.z, shells: shells.slice(),
    radii: shells.map((_, i) => R0 + i * DR),
    nucleusMax: nucR + (total <= 4 ? 0.42 : 0.34),
    haloRadius: 3.1,
  };
  baseZ = outer / Math.tan(Math.PI * 19 / 180) * 0.96;
  camera.position.z = baseZ * (focused ? 0.72 : 1);
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
  const now = performance.now();
  if (++frames % 20 === 0) {
    if (canvas.clientWidth && canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; sizeToBox(); }
    /* 影片盖着、或原子滚出视野时停渲染；rAF 继续排队，回来立刻恢复 */
    const film = document.querySelector(".film");
    const filmUp = film && !film.hidden;
    const bb = canvas.getBoundingClientRect();
    renderOn = !filmUp && bb.bottom > -40 && bb.top < innerHeight + 40;
  }
  if (!renderOn && !focused) return;
  tiltX += (aimX - tiltX) * 0.06;
  tiltY += (aimY - tiltY) * 0.06;
  atom.rotation.x = -0.18 + tiltX + userX;
  if (focused) {
    const k = Math.min(1, Math.max(0, (now - focusT0) / 900));
    const e = 1 - Math.pow(1 - k, 3);
    camera.position.z = baseZ * (1.55 - 0.53 * e);
    camera.position.y = 9 * (1 - e);
    camera.lookAt(0, 0, 0);
    if (focusHalo) focusHalo.material.opacity = 0.58 + 0.16 * Math.sin(now * 0.0016);
  }
  atom.rotation.y += 0.0032;
  atom.rotation.y += 0;
  atom.rotation.z = tiltY * 0.4;
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
    const lit = highlight === -1 || highlight === i;
    r.lineMat.opacity += ((lit ? 0.9 : 0.18) - r.lineMat.opacity) * 0.2;
    r.glowMat.opacity += ((lit ? 0.15 : 0.03) - r.glowMat.opacity) * 0.2;
    r.eMat.opacity += ((lit ? 0.98 : 0.32) - r.eMat.opacity) * 0.2;
    r.eGlowMat.opacity += ((lit ? 0.4 : 0.1) - r.eGlowMat.opacity) * 0.2;
    r.cMat.opacity += ((lit ? 0.15 : 0.06) - r.cMat.opacity) * 0.2;
    r.tails.forEach((m, ti) => {
      const base = 0.16 - ti * 0.07;
      m.opacity += ((lit ? base : base * 0.35) - m.opacity) * 0.2;
    });
    r.eMat.size = highlight === i ? 2.9 + 0.35 * Math.sin(now * 0.005) : 2.2;
  }
  if (dust) {
    dust.rotation.y += 0.00045;
    dust.rotation.x = Math.sin(now * 0.00008) * 0.06;
  }
  if (nucInst && nucBase && ++jitterFrame % 2 === 0) {
    const tt = now * 0.0011;
    for (let i = 0; i < nucInst.count; i++) {
      const b = i * 3;
      jDummy.position.set(
        nucBase[b] + Math.sin(tt + nucPhase[i]) * 0.05,
        nucBase[b + 1] + Math.cos(tt * 1.1 + nucPhase[i]) * 0.05,
        nucBase[b + 2] + Math.sin(tt * 0.9 + nucPhase[i] * 1.3) * 0.05);
      jDummy.scale.setScalar(nucScale);
      jDummy.updateMatrix();
      nucInst.setMatrixAt(i, jDummy.matrix);
    }
    nucInst.instanceMatrix.needsUpdate = true;
  }
  renders++;
  renderer.render(scene, camera);
}

/* 面板每次重绘都会换掉内容，但 canvas 节点可以整体搬过去，WebGL 上下文不丢 */
let mountedAt = 0;

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
  /* 只在位置不对时才搬。搬一个已存在的节点本身就会触发 childList 变更，
     若无条件搬，下面的 MutationObserver 会每 30ms 再进来一次，形成永久循环。 */
  function putAfter(node) {
    if (!node) return false;
    if (holder.parentElement === node.parentElement && holder.previousElementSibling === node) return true;
    node.insertAdjacentElement("afterend", holder);
    return true;
  }
  if (!putAfter(head) && !putAfter(anchor)) {
    if (svg.parentElement && holder.previousElementSibling !== svg) {
      svg.parentElement.insertBefore(holder, svg.nextSibling);
    }
  }
  mountedAt = performance.now();
  sizeToBox();
  const cell = document.querySelector('.cell[aria-pressed="true"]');
  if (cell && Number(cell.dataset.z) !== built) build(cell.dataset.z);
  /* 面板里的电子层列表与三维轨道联动：指到 K 层，K 环亮、其余退后 */
  document.querySelectorAll("#panel .shell-list li").forEach(function (li, i) {
    if (li.dataset.wired) return;
    li.dataset.wired = "1";
    li.style.cursor = "pointer";
    li.addEventListener("pointerenter", function () { highlight = i; });
    li.addEventListener("pointerleave", function () { highlight = -1; });
  });
}

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  aimX = ((e.clientY - r.top) / r.height - 0.5) * 0.5;
  aimY = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
}, { passive: true });
canvas.addEventListener("pointerleave", () => { aimX = 0; aimY = 0; });

const panel = document.getElementById("panel");
if (panel) {
  new MutationObserver(() => {
    /* 忽略 mount 自己造成的变更；真换元素时再挂一次 */
    if (performance.now() - mountedAt < 120) return;
    setTimeout(mount, 30);
  }).observe(panel, { childList: true, subtree: true });
  addEventListener("resize", sizeToBox, { passive: true });
  mount();
  tick();
}


/* ---------- 专注模式：把同一块画布搬进全屏展台，WebGL 上下文不重建 ---------- */
function openFocus() {
  const cell = document.querySelector('.cell[aria-pressed="true"]');
  const el = cell ? BY_Z.get(Number(cell.dataset.z)) : null;
  if (!el) return;
  focused = true;
  focusLayer.querySelector(".af-sym").textContent = el.symbol;
  const iso = ISO && ISO[String(el.z)];
  focusLayer.querySelector(".af-name").textContent = el.nameZh + " · " + (el.nameEn || "") +
    (iso ? " · " + el.symbol + "-" + iso.A + " · 丰度 " + (iso.abundance * 100).toFixed(2) + "%" : " · 无天然丰度数据");
  const shellTxt = (el.shells || []).map(function (c, i) {
    return String.fromCharCode(75 + i) + " " + c;
  }).join("   ");
  const isoNow = ISO && ISO[String(el.z)];
  focusLayer.querySelector(".af-shells").innerHTML = shellTxt +
    (isoNow
      ? ' <span class="af-key"><i class="p"></i>质子 ' + el.z + '<i class="n"></i>中子 ' + (isoNow.A - el.z) + "</span>"
      : ' <span class="af-key">核子示意 · 无天然丰度数据</span>');
  focusLayer.querySelector(".af-stage").appendChild(canvas);
  focusLayer.classList.add("is-on");
  userX = 0;
  focusT0 = performance.now();
  camera.position.z = baseZ * 1.02;
  sizeToBox();
}
function closeFocus() {
  if (!focused) return;
  focused = false;
  focusLayer.classList.remove("is-on");
  holder.insertBefore(canvas, badge);
  camera.position.z = baseZ;
  camera.position.y = 0;
  camera.lookAt(0, 0, 0);
  sizeToBox();
}
canvas.addEventListener("click", function () {
  /* 拖过模型就别顺手打开专注模式了 */
  if (dragMoved > 8) { dragMoved = 0; return; }
  if (!focused) openFocus();
});
focusLayer.addEventListener("click", function (e) {
  if (e.target === focusLayer || e.target.classList.contains("af-close")) closeFocus();
});
addEventListener("keydown", function (e) { if (e.key === "Escape") closeFocus(); });
function endDrag(e) {
  if (!dragging) return;
  dragging = false;
  document.body.classList.remove("atom-dragging");
  try { if (e && e.pointerId != null) canvas.releasePointerCapture(e.pointerId); } catch (err) {}
}

canvas.addEventListener("pointerdown", function (e) {
  /* 拖模型不是选字：阻止默认行为，并清掉可能已经开始的选区 */
  e.preventDefault();
  dragging = true; lastX = e.clientX; lastY = e.clientY; dragMoved = 0;
  document.body.classList.add("atom-dragging");
  try { const s = window.getSelection(); if (s) s.removeAllRanges(); } catch (err) {}
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});
/* 双保险：画布内的拖选/原生拖拽一律拦掉 */
canvas.addEventListener("selectstart", function (e) { e.preventDefault(); });
canvas.addEventListener("dragstart", function (e) { e.preventDefault(); });
canvas.addEventListener("pointermove", function (e) {
  if (!dragging) return;
  dragMoved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
  atom.rotation.y += (e.clientX - lastX) * 0.006;
  userX = Math.max(-1.1, Math.min(1.1, userX + (e.clientY - lastY) * 0.004));
  lastX = e.clientX; lastY = e.clientY;
});
["pointerup", "pointercancel"].forEach(function (ev) {
  canvas.addEventListener(ev, endDrag);
});
addEventListener("blur", endDrag);

window.__atomDebug = function () {
  return { rings: rings.length, s0: rings[0] ? rings[0].ring.scale.x : -1,
    nuc: nucleus ? nucleus.scale.x : -1, conn: canvas.isConnected,
    hidden: document.hidden, z: built, frames: frames, renders: renders, counts: lastCounts };
};
window.__atomJitter = function () {
  return nucInst ? { x: +nucInst.instanceMatrix.array[12].toFixed(4), n: nucInst.count } : null;
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
