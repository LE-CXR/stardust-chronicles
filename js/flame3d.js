import * as THREE from "../lib/three.module.js";

/* 元素的焰色：三层程序化火焰片（不同 z、不同噪声相位）+ 上升余烬。
   颜色只取 data/elements.js 里已核对的 flame.swatch；没有焰色的元素不伪造。 */

const canvas = document.createElement("canvas");
canvas.className = "flame3d";
canvas.setAttribute("aria-hidden", "true");

const holder = document.createElement("div");
holder.className = "flame-holder";
holder.appendChild(canvas);
const touch = document.createElement("span");
touch.className = "flame-touch";
touch.textContent = "移动指针看侧面";
holder.appendChild(touch);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
camera.position.set(0, 0, 3.4);

const group = new THREE.Group();
scene.add(group);

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uT;
uniform float uSeed;
uniform float uGain;
uniform float uAspect;
uniform vec3 uColor;
uniform vec3 uHot;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.55, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}

void main() {
  /* x 按高度归一化：窗口再宽，火焰也不会被拉成一片红 */
  vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y);
  float t = uT;
  float y = clamp(vUv.y * 1.08, 0.0, 1.0);

  float n  = fbm(vec2(p.x * 4.2 + uSeed, y * 3.0 - t * 1.35));
  float n2 = fbm(vec2(p.x * 8.0 - uSeed, y * 6.0 - t * 2.05));

  /* 火舌中心随上升气流摆动 */
  float cx = (n - 0.5) * 0.16 * smoothstep(0.02, 0.85, y);
  float dx = abs(p.x - cx);

  /* 底部宽、往上收尖；边缘用第二层噪声撕开 */
  /* 主锥体 + 底部外扩的火裙，读起来才像一盏燃烧器而不是打火机 */
  float skirt = 0.17 * smoothstep(0.24, 0.02, y);
  float w = (0.36 * pow(max(0.0, 1.0 - y), 0.5) + skirt) * smoothstep(-0.01, 0.035, y);
  float edge = dx / max(w, 0.0015) + (n2 - 0.5) * 0.5;
  float body = 1.0 - smoothstep(0.35, 0.95, edge);

  float core = (1.0 - smoothstep(0.0, 0.5, dx / max(w * 0.62, 0.0015)))
             * (1.0 - smoothstep(0.1, 0.82, y));
  vec3 col = mix(uColor, uHot, core * 0.55);

  /* 托盘附近一圈很弱的地面光 */
  float glow = exp(-16.0 * length(vec2(p.x * 1.9, (y - 0.04) * 2.4))) * 0.22;
  col += uColor * glow;
  /* 燃烧器边沿：一条压扁的冷光，把火焰“钉”在底部 */
  float burner = exp(-pow((vUv.y - 0.028) / 0.013, 2.0)) * exp(-pow(p.x / 0.46, 2.0));
  col += mix(uColor, uHot, 0.5) * burner * 0.55;

  float a = body * (0.55 + 0.45 * core) * (0.92 + 0.08 * sin(t * 7.0 + uSeed)) + glow + burner * 0.3;
  gl_FragColor = vec4(col * (1.0 + 0.35 * body + 0.35 * core), clamp(a * uGain, 0.0, 1.0));
}`;

const mats = [], planes = [];
[[-0.55, 1.05, 0.001, 0.75], [0.0, 1.22, 2.7, 1.0], [0.55, 0.92, 5.1, 0.6]].forEach((p, i) => {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uT: { value: 0 },
      uSeed: { value: p[2] },
      uGain: { value: p[3] },
      uAspect: { value: 1 },
      uColor: { value: new THREE.Color(0xd23b4a) },
      uHot: { value: new THREE.Color(0xfff1cf) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  /* 面片尺寸在 sizeToBox() 里按视锥铺满，uv 与舞台一一对应 */
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  plane.position.set(0, 0, p[0]);
  group.add(plane);
  mats.push(mat);
  planes.push(plane);
});

/* 余烬 */
const EMBERS = 56;
const emberGeo = new THREE.BufferGeometry();
const emberPos = new Float32Array(EMBERS * 3);
const emberSeed = new Float32Array(EMBERS);
for (let i = 0; i < EMBERS; i++) {
  emberSeed[i] = Math.random();
  emberPos[i * 3] = (Math.random() - 0.5) * 0.18;
  emberPos[i * 3 + 1] = Math.random() - 0.5;
  emberPos[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
}
emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
const emberMat = new THREE.PointsMaterial({
  color: 0xffcf8a, size: 0.035, transparent: true, opacity: 0.45,
  depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
});
const embers = new THREE.Points(emberGeo, emberMat);
group.add(embers);

let cur = null, colorHex = 0xd23b4a;
let aimX = 0, aimY = 0, tiltX = 0, tiltY = 0;
let raf = 0, frames = 0, renderOn = true, lastW = 0, t0 = performance.now(), flameH = 3;
let reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function sizeToBox() {
  const w = Math.max(120, canvas.clientWidth || 240);
  const h = Math.max(110, canvas.clientHeight || 180);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  flameH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
  mats.forEach((m) => { m.uniforms.uAspect.value = camera.aspect; });
  planes.forEach((pl) => pl.scale.set(flameH * camera.aspect, flameH, 1));
  embers.scale.set(flameH, flameH, flameH);
}

function setColor(hex) {
  const c = new THREE.Color(hex);
  colorHex = hex;
  mats.forEach((m) => m.uniforms.uColor.value.copy(c));
  emberMat.color.copy(c).lerp(new THREE.Color(0xfff0c8), 0.55);
}

function tick() {
  raf = requestAnimationFrame(tick);
  if (!canvas.isConnected || document.hidden) return;
  if (++frames % 24 === 0) {
    if (canvas.clientWidth && canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; sizeToBox(); }
    const film = document.querySelector(".film");
    const bb = canvas.getBoundingClientRect();
    renderOn = !(film && !film.hidden) && bb.bottom > -60 && bb.top < innerHeight + 60;
  }
  if (!renderOn) return;

  const now = performance.now();
  const t = (now - t0) / 1000;
  tiltX += (aimX - tiltX) * 0.06;
  tiltY += (aimY - tiltY) * 0.06;
  group.rotation.y = tiltY + (reduce ? 0 : Math.sin(t * 0.4) * 0.05);
  group.rotation.x = -tiltX * 0.6;

  const tt = reduce ? 0.6 : t;
  mats.forEach((m, i) => {
    m.uniforms.uT.value = tt + i * 0.7;
    planes[i].scale.setScalar(1 + Math.sin(tt * 1.6 + i) * 0.012);
  });

  const pos = emberGeo.attributes.position.array;
  for (let i = 0; i < EMBERS; i++) {
    pos[i * 3 + 1] += 0.0016 + emberSeed[i] * 0.0042;
    pos[i * 3] += Math.sin(tt * 2 + emberSeed[i] * 9) * 0.0007;
    if (pos[i * 3 + 1] > 0.52) {
      pos[i * 3 + 1] = -0.48;
      pos[i * 3] = (Math.random() - 0.5) * 0.26;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }
  }
  emberGeo.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  aimY = ((e.clientX - r.left) / r.width - 0.5) * 0.55;
  aimX = ((e.clientY - r.top) / r.height - 0.5) * 0.35;
}, { passive: true });
canvas.addEventListener("pointerleave", () => { aimX = 0; aimY = 0; });
addEventListener("resize", sizeToBox, { passive: true });

/* 面板重绘后把画布搬进新的 .flame-slot；没有焰色数据就收起来 */
let mountedAt = 0;
function mount() {
  const slot = document.querySelector("#panel .flame-slot");
  if (!slot) {
    if (holder.parentElement) holder.remove();
    cur = null;
    return;
  }
  if (holder.parentElement !== slot) slot.appendChild(holder);
  const hex = slot.dataset.color || "";
  if (hex && hex !== cur) { cur = hex; setColor(hex); }
  mountedAt = performance.now();
  sizeToBox();
}

const panel = document.getElementById("panel");
if (panel) {
  new MutationObserver(() => {
    if (performance.now() - mountedAt < 120) return;
    setTimeout(mount, 30);
  }).observe(panel, { childList: true, subtree: true });
  mount();
  tick();
}
