import * as THREE from "three";

const BEST_KEY = "saguaro-hop-best";
const CHUNK = 68;
const EYE = 1.62;
const GRAVITY = 32;
const JUMP = 11.2;
const PLAYER_R = 0.42;

const canvas = document.getElementById("c");
const overlay = document.getElementById("overlay");
const pauseEl = document.getElementById("pause");
const deadEl = document.getElementById("dead");
const hud = document.getElementById("hud");
const crosshair = document.getElementById("crosshair");
const hatBrim = document.getElementById("hat-brim");
const flash = document.getElementById("flash");
const heatFx = document.getElementById("heat");
const floaters = document.getElementById("floaters");
const toast = document.getElementById("pickup-toast");
const startBtn = document.getElementById("start-btn");
const againBtn = document.getElementById("again-btn");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xe39a58, 0.0115);

const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.08, 620);
const player = new THREE.Object3D();
player.add(camera);
scene.add(player);

let yaw = 0;
let pitch = 0;
let dragging = false;
const stickVec = { x: 0, y: 0 };

const clock = new THREE.Clock();
const keys = new Set();
const chunks = new Map();
const tumbleweeds = [];
const particles = [];
const colliders = [];

let worldSeed = 1;
let state = "menu";
let score = 0;
let coins = 0;
let lives = 3;
let water = 1;
let combo = 1;
let comboTimer = 0;
let distance = 0;
let spawn = new THREE.Vector3();
let velY = 0;
let onGround = false;
let jumpsLeft = 2;
let invuln = 0;
let chili = 0;
let shake = 0;
let bob = 0;
let toastT = 0;
let hintT = 8;
let muted = false;
let sunTick = 0;
let lastPos = new THREE.Vector3();
let sun;
let sandTex;
let mountainRing;
let vulturePivot;
let cactusArms;
let audio;

const cactusMat = new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 0.82, flatShading: true });
const cactusDark = new THREE.MeshStandardMaterial({ color: 0x244f28, roughness: 0.86, flatShading: true });
const sandMat = new THREE.MeshStandardMaterial({ color: 0xd7b074, roughness: 1 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.95, flatShading: true });
const mesaMat = new THREE.MeshStandardMaterial({ color: 0xc46a3a, roughness: 0.92, flatShading: true });
const goldMat = new THREE.MeshStandardMaterial({
  color: 0xffd24a,
  roughness: 0.28,
  metalness: 0.85,
  emissive: 0x6a4a00,
  emissiveIntensity: 0.45,
});
const turqMat = new THREE.MeshStandardMaterial({
  color: 0x2ec4b6,
  roughness: 0.35,
  metalness: 0.4,
  emissive: 0x0a4a44,
  emissiveIntensity: 0.5,
});
const weedMat = new THREE.MeshStandardMaterial({ color: 0x6a4a22, roughness: 1, flatShading: true });
const snakeMat = new THREE.MeshStandardMaterial({ color: 0x6b5b2a, roughness: 0.7, flatShading: true });
const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3d8a3a, roughness: 0.8, flatShading: true });

function mulberry(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashChunk(cx, cz) {
  return (worldSeed ^ Math.imul(cx, 374761393) ^ Math.imul(cz, 668265263)) | 0;
}

function makeCanvasTex(size, paint) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  paint(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function buildTextures() {
  sandTex = makeCanvasTex(512, (ctx, n) => {
    ctx.fillStyle = "#c9a066";
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 14000; i++) {
      const r = 160 + Math.random() * 70;
      const g = 120 + Math.random() * 50;
      const b = 60 + Math.random() * 40;
      ctx.fillStyle = `rgba(${r},${g},${b},${0.15 + Math.random() * 0.4})`;
      ctx.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 3, 1 + Math.random() * 2);
    }
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(120,80,40,${0.08 + Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * n, Math.random() * n);
      ctx.quadraticCurveTo(Math.random() * n, Math.random() * n, Math.random() * n, Math.random() * n);
      ctx.stroke();
    }
  });
  sandTex.repeat.set(90, 90);
  sandMat.map = sandTex;
}

function addSky() {
  const geo = new THREE.SphereGeometry(500, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: `
      varying vec3 vP;
      void main() {
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vP;
      void main() {
        float h = normalize(vP).y;
        vec3 bottom = vec3(0.98, 0.42, 0.16);
        vec3 band = vec3(1.0, 0.72, 0.38);
        vec3 top = vec3(0.28, 0.48, 0.78);
        vec3 col = mix(bottom, band, smoothstep(-0.2, 0.18, h));
        col = mix(col, top, smoothstep(0.12, 0.72, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(geo, mat));

  const sunGeo = new THREE.SphereGeometry(18, 24, 16);
  const sunMesh = new THREE.Mesh(
    sunGeo,
    new THREE.MeshBasicMaterial({ color: 0xffe7a0, fog: false })
  );
  sunMesh.position.set(-180, 78, -220);
  scene.add(sunMesh);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(28, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff9a4a, transparent: true, opacity: 0.28, fog: false, depthWrite: false })
  );
  glow.position.copy(sunMesh.position);
  scene.add(glow);
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0xffc888, 0x6a3a18, 0.85));
  sun = new THREE.DirectionalLight(0xffd4a0, 1.35);
  sun.position.set(-40, 58, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 140;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -50;
  sun.shadow.camera.right = sun.shadow.camera.top = 50;
  sun.shadow.bias = -0.0007;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffb070, 0.22));
}

function addGround() {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), sandMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.name = "ground";
  scene.add(mesh);
  return mesh;
}

function addMountains() {
  mountainRing = new THREE.Group();
  const rng = mulberry(99);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const g = new THREE.ConeGeometry(18 + rng() * 28, 22 + rng() * 48, 5);
    const m = new THREE.Mesh(
      g,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.05 + rng() * 0.04, 0.45, 0.22 + rng() * 0.1),
        roughness: 1,
        flatShading: true,
      })
    );
    const d = 210 + rng() * 40;
    m.position.set(Math.cos(a) * d, 8, Math.sin(a) * d);
    m.rotation.y = rng() * 6;
    mountainRing.add(m);
  }
  scene.add(mountainRing);
}

function addVultures() {
  vulturePivot = new THREE.Group();
  vulturePivot.position.y = 28;
  const wing = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.6, 0, 0),
    new THREE.Vector3(1.6, 0, 0),
    new THREE.Vector3(0, 0, 0.8),
  ]);
  const mat = new THREE.MeshBasicMaterial({ color: 0x1a0e08, side: THREE.DoubleSide, fog: true });
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(wing, mat);
    const a = (i / 5) * Math.PI * 2;
    b.position.set(Math.cos(a) * 16, Math.sin(i) * 2, Math.sin(a) * 16);
    b.rotation.x = 0.4;
    vulturePivot.add(b);
  }
  scene.add(vulturePivot);
}

function addSpines(target, rng, count, radius, h) {
  const spineGeo = new THREE.ConeGeometry(0.03, 0.18, 3);
  const spineMat = new THREE.MeshStandardMaterial({ color: 0xf4e6c4, roughness: 0.6 });
  for (let i = 0; i < count; i++) {
    const s = new THREE.Mesh(spineGeo, spineMat);
    const a = rng() * Math.PI * 2;
    const y = (rng() - 0.15) * h;
    s.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    s.lookAt(s.position.clone().add(s.position.clone().setY(0)));
    s.rotation.z += Math.PI / 2;
    target.add(s);
  }
}

function makeSaguaro(rng) {
  const g = new THREE.Group();
  const h = 3.2 + rng() * 2.8;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, h, 8), cactusMat);
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);
  const arms = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < arms; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const ah = 0.9 + rng() * 1.1;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, ah, 7), cactusDark);
    arm.position.set(side * 0.42, 1.1 + rng() * (h - 2), 0);
    arm.rotation.z = -side * (0.7 + rng() * 0.4);
    arm.castShadow = true;
    g.add(arm);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.7 + rng() * 0.8, 7), cactusMat);
    up.position.set(side * (0.7 + ah * 0.25), arm.position.y + 0.55, 0);
    up.castShadow = true;
    g.add(up);
  }
  addSpines(g, rng, 10, 0.4, h);
  g.userData = { kind: "saguaro", r: 0.55, h };
  return g;
}

function makeBarrel(rng) {
  const g = new THREE.Group();
  const h = 0.7 + rng() * 0.35;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), barrelMat);
  body.scale.set(1, h / 0.7, 1);
  body.position.y = 0.42;
  body.castShadow = true;
  g.add(body);
  const flower = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshStandardMaterial({ color: 0xff7a2d, emissive: 0x401000 }));
  flower.position.y = 0.85;
  g.add(flower);
  g.userData = { kind: "barrel", r: 0.55, h: 0.9 };
  return g;
}

function makeTumbleweed() {
  const g = new THREE.Group();
  const stick = new THREE.CylinderGeometry(0.018, 0.03, 1.05, 4);
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(stick, weedMat);
    m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    g.add(m);
  }
  g.castShadow = true;
  return g;
}

function makeCoin(big) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.5 : 0.36, big ? 0.5 : 0.36, 0.08, 16), goldMat);
  rim.rotation.x = Math.PI / 2;
  const gem = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.22 : 0.15, big ? 0.22 : 0.15, 0.09, 8), turqMat);
  gem.rotation.x = Math.PI / 2;
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(big ? 0.7 : 0.52, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  g.add(rim, gem, halo);
  g.userData = { kind: big ? "nugget" : "coin", value: big ? 50 : 10 };
  return g;
}

function makeCanteen() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.38, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a6d8a, metalness: 0.4, roughness: 0.4, emissive: 0x042030 })
  );
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 6), goldMat);
  cap.position.y = 0.24;
  g.add(body, cap);
  g.userData = { kind: "water" };
  return g;
}

function makeChili() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xe22b12, roughness: 0.45, emissive: 0x4a0800, emissiveIntensity: 0.4 })
  );
  body.scale.set(0.7, 1.6, 0.7);
  body.rotation.z = 0.4;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 4), cactusDark);
  stem.position.set(-0.02, 0.28, 0);
  g.add(body, stem);
  g.userData = { kind: "chili" };
  return g;
}

function makeFlower() {
  const g = new THREE.Group();
  const pet = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.18, 5),
    new THREE.MeshStandardMaterial({ color: 0xff6ea8, emissive: 0x401020, emissiveIntensity: 0.4 })
  );
  pet.position.y = 0.1;
  g.add(pet);
  g.userData = { kind: "life" };
  return g;
}

function makeSnake() {
  const g = new THREE.Group();
  let x = 0;
  for (let i = 0; i < 8; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.09 - i * 0.006, 6, 5), snakeMat);
    seg.position.set(x, 0.08, 0);
    g.add(seg);
    x += 0.14;
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), new THREE.MeshStandardMaterial({ color: 0x5a4a20 }));
  head.position.set(-0.12, 0.12, 0);
  g.add(head);
  g.userData = { kind: "snake", r: 0.55 };
  return g;
}

function makeMesa(rng) {
  const g = new THREE.Group();
  const w = 3.5 + rng() * 4.5;
  const d = 3.2 + rng() * 4;
  const h = 1.6 + rng() * 3.2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mesaMat);
  base.position.y = h / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.28, d * 0.92), rockMat);
  cap.position.y = h + 0.1;
  cap.castShadow = true;
  g.add(cap);
  g.userData = {
    kind: "mesa",
    minx: -w / 2,
    maxx: w / 2,
    minz: -d / 2,
    maxz: d / 2,
    h: h + 0.28,
  };
  return g;
}

function makeSign(rng) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), rockMat);
  post.position.y = 1.1;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 0.08),
    new THREE.MeshStandardMaterial({ color: rng() > 0.5 ? 0x2f6b34 : 0x8b1e12, roughness: 0.8 })
  );
  board.position.y = 2.0;
  g.add(post, board);
  g.userData = { kind: "sign", r: 0.3, h: 2.2 };
  return g;
}

function createArms() {
  cactusArms = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a8a3c, roughness: 0.78, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a642c, roughness: 0.8, flatShading: true });
  function arm(side) {
    const a = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.48, 6), mat);
    upper.rotation.z = side * 0.95;
    upper.position.set(side * 0.28, -0.18, -0.48);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), dark);
    pad.position.set(side * 0.5, -0.4, -0.58);
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 4), new THREE.MeshStandardMaterial({ color: 0xf0e0c0 }));
    claw.position.set(side * 0.56, -0.48, -0.64);
    claw.rotation.x = Math.PI / 2;
    a.add(upper, pad, claw);
    a.userData.side = side;
    return a;
  }
  const left = arm(-1);
  const right = arm(1);
  left.position.set(-0.12, -0.22, 0.08);
  right.position.set(0.12, -0.22, 0.08);
  cactusArms.add(left, right);
  camera.add(cactusArms);
}

function spawnParticles(pos, color, n, speed, life) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 4, 3),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    m.position.copy(pos);
    m.userData.v = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed);
    m.userData.life = life;
    m.userData.max = life;
    scene.add(m);
    particles.push(m);
  }
}

function AudioBus() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  this.ctx = Ctx ? new Ctx() : null;
  this.master = null;
  this.wind = null;
  if (this.ctx) {
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
  }
}
AudioBus.prototype.resume = function () {
  if (this.ctx && this.ctx.state !== "running") this.ctx.resume();
};
AudioBus.prototype.beep = function (freq, dur, type, vol, slide) {
  if (muted || !this.ctx) return;
  const t = this.ctx.currentTime;
  const o = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  o.type = type || "square";
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
  g.gain.setValueAtTime(vol || 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(this.master);
  o.start(t);
  o.stop(t + dur + 0.02);
};
AudioBus.prototype.noise = function (dur, vol, hp) {
  if (muted || !this.ctx) return;
  const n = this.ctx.sampleRate * dur;
  const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = this.ctx.createBufferSource();
  src.buffer = buf;
  const f = this.ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = hp || 800;
  const g = this.ctx.createGain();
  const t = this.ctx.currentTime;
  g.gain.setValueAtTime(vol || 0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(this.master);
  src.start();
};
AudioBus.prototype.startWind = function () {
  if (!this.ctx || this.wind) return;
  const n = this.ctx.sampleRate * 3;
  const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
  const src = this.ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = this.ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 500;
  const g = this.ctx.createGain();
  g.gain.value = 0.04;
  src.connect(f);
  f.connect(g);
  g.connect(this.master);
  src.start();
  this.wind = src;
};

function playerObj() {
  return player;
}

function setLook(nextYaw, nextPitch) {
  yaw = nextYaw;
  pitch = Math.max(-1.22, Math.min(1.22, nextPitch));
  player.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function lookDelta(dx, dy) {
  setLook(yaw - dx * 0.0025, pitch - dy * 0.0022);
}

function isPointerLocked() {
  return document.pointerLockElement === renderer.domElement;
}

function tryPointerLock() {
  if (!renderer.domElement.requestPointerLock) return;
  try {
    renderer.domElement.requestPointerLock();
  } catch (err) {
    /* drag-to-look still works */
  }
}

function playerFeet() {
  return playerObj().position.y - EYE;
}

function groundAt(x, z) {
  let h = 0;
  for (const c of colliders) {
    if (c.kind !== "mesa") continue;
    const wx = x - c.x;
    const wz = z - c.z;
    if (wx > c.minx - PLAYER_R && wx < c.maxx + PLAYER_R && wz > c.minz - PLAYER_R && wz < c.maxz + PLAYER_R) {
      h = Math.max(h, c.h);
    }
  }
  return h;
}

function unloadChunk(key) {
  const ch = chunks.get(key);
  if (!ch) return;
  for (const o of ch.objects) scene.remove(o);
  for (let i = colliders.length - 1; i >= 0; i--) {
    if (colliders[i].chunk === key) colliders.splice(i, 1);
  }
  chunks.delete(key);
}

function spawnChunk(cx, cz) {
  const key = `${cx},${cz}`;
  if (chunks.has(key)) return;
  const rng = mulberry(hashChunk(cx, cz));
  const originX = cx * CHUNK;
  const originZ = cz * CHUNK;
  const objects = [];
  const isOrigin = cx === 0 && cz === 0;

  const dunes = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < dunes; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), sandMat);
    const s = 3.2 + rng() * 6;
    d.scale.set(s, 0.22 + rng() * 0.18, s * (0.65 + rng() * 0.4));
    const dx = originX + (rng() - 0.5) * CHUNK;
    const dz = originZ + (rng() - 0.5) * CHUNK;
    if (Math.hypot(dx, dz) < 22) continue;
    d.position.set(dx, -0.12, dz);
    d.receiveShadow = true;
    scene.add(d);
    objects.push(d);
  }

  const cacti = isOrigin ? 4 : 7 + Math.floor(rng() * 8);
  for (let i = 0; i < cacti; i++) {
    const s = makeSaguaro(rng);
    const x = originX + (rng() - 0.5) * (CHUNK - 6);
    const z = originZ + (rng() - 0.5) * (CHUNK - 6);
    if (Math.hypot(x, z) < 8) continue;
    s.position.set(x, 0, z);
    s.rotation.y = rng() * 6;
    scene.add(s);
    objects.push(s);
    colliders.push({ kind: "saguaro", x, z, r: 0.55, h: s.userData.h, chunk: key });
  }

  const barrels = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < barrels; i++) {
    const b = makeBarrel(rng);
    const x = originX + (rng() - 0.5) * (CHUNK - 8);
    const z = originZ + (rng() - 0.5) * (CHUNK - 8);
    if (Math.hypot(x, z) < 6) continue;
    b.position.set(x, 0, z);
    scene.add(b);
    objects.push(b);
    colliders.push({ kind: "barrel", x, z, r: 0.6, h: 0.9, mesh: b, chunk: key });
  }

  if (rng() > 0.35) {
    const mesa = makeMesa(rng);
    const x = originX + (rng() - 0.5) * (CHUNK - 12);
    const z = originZ + (rng() - 0.5) * (CHUNK - 12);
    if (Math.hypot(x, z) > 10) {
      mesa.position.set(x, 0, z);
      scene.add(mesa);
      objects.push(mesa);
      const u = mesa.userData;
      colliders.push({ kind: "mesa", x, z, minx: u.minx, maxx: u.maxx, minz: u.minz, maxz: u.maxz, h: u.h, chunk: key });
      const n = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const coin = makeCoin(false);
        const hy = u.h + 1.1 + i * 0.35;
        coin.position.set(x + (rng() - 0.5) * 1.6, hy, z + (rng() - 0.5) * 1.4);
        coin.userData.baseY = hy;
        scene.add(coin);
        objects.push(coin);
      }
    }
  }

  const coinCount = isOrigin ? 4 : 7 + Math.floor(rng() * 8);
  for (let i = 0; i < coinCount; i++) {
    const big = rng() > 0.92;
    const coin = makeCoin(big);
    const x = originX + (rng() - 0.5) * (CHUNK - 4);
    const z = originZ + (rng() - 0.5) * (CHUNK - 4);
    if (isOrigin && Math.hypot(x, z) < 10) continue;
    const hover = 0.85 + rng() * 1.4 + (rng() > 0.75 ? 1.4 : 0);
    coin.position.set(x, hover, z);
    coin.userData.baseY = hover;
    coin.userData.spin = rng() * 6;
    scene.add(coin);
    objects.push(coin);
  }

  if (isOrigin) {
    for (let i = 1; i <= 14; i++) {
      const coin = makeCoin(i === 10);
      const hover = i % 4 === 0 ? 2.15 : 1.05;
      const xOff = i % 5 === 0 ? (i % 2 ? 1.15 : -1.15) : 0;
      coin.position.set(xOff, hover, -2.2 - i * 2.15);
      coin.userData.baseY = hover;
      scene.add(coin);
      objects.push(coin);
    }
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      const coin = makeCoin(false);
      coin.position.set(Math.cos(ang) * 5.2, 1.02, Math.sin(ang) * 5.2);
      coin.userData.baseY = 1.02;
      scene.add(coin);
      objects.push(coin);
    }
    const barrel = makeBarrel(rng);
    barrel.position.set(2.4, 0, -18);
    scene.add(barrel);
    objects.push(barrel);
    colliders.push({ kind: "barrel", x: 2.4, z: -18, r: 0.6, h: 0.9, mesh: barrel, chunk: key });
    const jug = makeCanteen();
    jug.position.set(-1.6, 0.75, -12);
    jug.userData.baseY = 0.75;
    scene.add(jug);
    objects.push(jug);
    for (const wz of [-16, -30]) {
      const weed = makeTumbleweed();
      weed.position.set(-18, 0.7, wz);
      weed.scale.setScalar(1.4);
      scene.add(weed);
      objects.push(weed);
      tumbleweeds.push({ mesh: weed, vx: 8.5, vz: 0.2, r: 0.75, spin: 1 });
    }
  }

  if (rng() > 0.55) {
    const w = makeCanteen();
    w.position.set(originX + (rng() - 0.5) * CHUNK * 0.7, 0.7, originZ + (rng() - 0.5) * CHUNK * 0.7);
    w.userData.baseY = 0.7;
    scene.add(w);
    objects.push(w);
  }
  if (rng() > 0.72) {
    const c = makeChili();
    c.position.set(originX + (rng() - 0.5) * CHUNK * 0.7, 0.8, originZ + (rng() - 0.5) * CHUNK * 0.7);
    c.userData.baseY = 0.8;
    scene.add(c);
    objects.push(c);
  }
  if (rng() > 0.88) {
    const f = makeFlower();
    f.position.set(originX + (rng() - 0.5) * CHUNK * 0.7, 0.7, originZ + (rng() - 0.5) * CHUNK * 0.7);
    f.userData.baseY = 0.7;
    scene.add(f);
    objects.push(f);
  }

  const snakes = isOrigin ? 0 : rng() > 0.45 ? 1 + Math.floor(rng() * 2) : 0;
  for (let i = 0; i < snakes; i++) {
    const s = makeSnake();
    const x = originX + (rng() - 0.5) * (CHUNK - 8);
    const z = originZ + (rng() - 0.5) * (CHUNK - 8);
    if (Math.hypot(x, z) < 12) continue;
    s.position.set(x, 0, z);
    s.userData.home = new THREE.Vector3(x, 0, z);
    s.userData.dir = rng() * Math.PI * 2;
    scene.add(s);
    objects.push(s);
  }

  if (rng() > 0.7) {
    const sign = makeSign(rng);
    sign.position.set(originX + (rng() - 0.5) * 20, 0, originZ + (rng() - 0.5) * 20);
    sign.rotation.y = rng() * 6;
    scene.add(sign);
    objects.push(sign);
  }

  const weeds = isOrigin ? 0 : 2 + Math.floor(rng() * 3);
  for (let i = 0; i < weeds; i++) {
    const w = makeTumbleweed();
    const x = originX + (rng() - 0.5) * CHUNK;
    const z = originZ + (rng() - 0.5) * CHUNK;
    w.position.set(x, 0.7, z);
    w.scale.setScalar(1.25 + rng() * 0.35);
    scene.add(w);
    objects.push(w);
    tumbleweeds.push({
      mesh: w,
      vx: (rng() - 0.25) * 7 + 3,
      vz: (rng() - 0.5) * 6,
      r: 0.7,
      spin: rng() * 4,
    });
  }

  chunks.set(key, { objects });
}

function updateChunks() {
  const p = playerObj().position;
  const cx = Math.floor(p.x / CHUNK);
  const cz = Math.floor(p.z / CHUNK);
  const keep = new Set();
  for (let z = -2; z <= 2; z++) {
    for (let x = -2; x <= 2; x++) {
      const k = `${cx + x},${cz + z}`;
      keep.add(k);
      spawnChunk(cx + x, cz + z);
    }
  }
  for (const k of [...chunks.keys()]) {
    if (!keep.has(k)) unloadChunk(k);
  }
}

function resetWorld() {
  for (const k of [...chunks.keys()]) unloadChunk(k);
  for (const t of tumbleweeds) scene.remove(t.mesh);
  tumbleweeds.length = 0;
  colliders.length = 0;
  for (const p of particles) scene.remove(p);
  particles.length = 0;
  worldSeed = (Math.random() * 1e9) | 0;
  score = 0;
  coins = 0;
  lives = 3;
  water = 1;
  combo = 1;
  comboTimer = 0;
  distance = 0;
  velY = 0;
  onGround = true;
  jumpsLeft = 2;
  invuln = 2.4;
  chili = 0;
  shake = 0;
  hintT = 8;
  sunTick = 0;
  const obj = playerObj();
  obj.position.set(0, EYE, 0);
  obj.rotation.set(0, 0, 0);
  spawn.set(0, EYE, 0);
  lastPos.copy(obj.position);
  setLook(0, 0);
  camera.position.set(0, 0, 0);
  updateChunks();
  updateHud();
}

function updateHud() {
  document.getElementById("score").textContent = Math.floor(score).toLocaleString();
  document.getElementById("coins").textContent = String(coins);
  document.getElementById("miles").textContent = (distance / 1609).toFixed(2);
  document.getElementById("combo").textContent = `x${combo}`;
  document.getElementById("combo-wrap").classList.toggle("hidden", combo < 2);
  document.getElementById("water-bar").style.width = `${Math.max(0, water) * 100}%`;
  const hearts = document.getElementById("hearts");
  hearts.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const el = document.createElement("i");
    el.textContent = "🌵";
    if (i < lives) el.className = "on";
    hearts.appendChild(el);
  }
  document.getElementById("best").textContent = Number(localStorage.getItem(BEST_KEY) || 0).toLocaleString();
  heatFx.classList.toggle("on", water < 0.28);
}

function showToast(msg) {
  toast.textContent = msg;
  toastT = 1.6;
}

function floater(text) {
  const el = document.createElement("div");
  el.className = "floater";
  el.textContent = text;
  floaters.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function bang(kind) {
  flash.className = kind;
  flash.offsetHeight;
  requestAnimationFrame(() => {
    /* retrigger */
  });
  setTimeout(() => {
    if (flash.className === kind) flash.className = "";
  }, 360);
}

function hit(amount, reason) {
  if (invuln > 0 || state !== "play") return;
  lives -= amount;
  invuln = 1.15;
  shake = 0.45;
  water = Math.max(0, water - 0.08);
  audio.beep(140, 0.25, "sawtooth", 0.16, 60);
  audio.noise(0.2, 0.1, 400);
  bang("hurt");
  showToast(reason);
  spawnParticles(playerObj().position.clone().add(new THREE.Vector3(0, -0.4, 0)), 0xc45c26, 12, 4, 0.45);
  updateHud();
  if (lives <= 0) die();
}

function die() {
  state = "dead";
  if (document.exitPointerLock) document.exitPointerLock();
  document.getElementById("touch-ui").classList.add("hidden");
  const best = Math.max(Math.floor(score), Number(localStorage.getItem(BEST_KEY) || 0));
  localStorage.setItem(BEST_KEY, String(best));
  document.getElementById("dead-stats").textContent =
    `Score ${Math.floor(score).toLocaleString()} · ${coins} coins · ${(distance / 1609).toFixed(2)} miles of Sonoran dust. Record ${best.toLocaleString()}.`;
  deadEl.classList.remove("hidden");
  hud.classList.add("hidden");
  hatBrim.classList.add("hidden");
  crosshair.classList.add("hidden");
  audio.beep(220, 0.4, "triangle", 0.12, 80);
  audio.beep(160, 0.55, "sine", 0.1, 50);
}

function collect(obj, list) {
  const kind = obj.userData.kind;
  const pos = obj.position.clone();
  scene.remove(obj);
  const idx = list.indexOf(obj);
  if (idx >= 0) list.splice(idx, 1);
  if (kind === "coin" || kind === "nugget") {
    comboTimer = 2.4;
    combo = Math.min(12, combo + (kind === "nugget" ? 2 : 1));
    const gain = (obj.userData.value || 10) * combo;
    score += gain;
    coins += 1;
    floater(`+${gain}`);
    bang("gold");
    audio.beep(kind === "nugget" ? 880 : 740, 0.12, "square", 0.1, 1400);
    audio.beep(kind === "nugget" ? 1180 : 980, 0.16, "triangle", 0.08);
    spawnParticles(pos, 0xffd24a, 10, 3.5, 0.4);
    showToast(kind === "nugget" ? "TURQUOISE NUGGET" : "GOLD");
  } else if (kind === "water") {
    water = 1;
    lives = Math.min(3, lives + (lives < 3 && Math.random() < 0.05 ? 1 : 0));
    bang("water");
    audio.beep(420, 0.15, "sine", 0.1, 700);
    spawnParticles(pos, 0x5ee0ff, 12, 3, 0.45);
    showToast("CANTEEN FILLED");
  } else if (kind === "chili") {
    chili = 6.5;
    bang("chili");
    audio.beep(200, 0.2, "sawtooth", 0.12, 90);
    spawnParticles(pos, 0xe22b12, 14, 4, 0.5);
    showToast("CHILI KICK — BOOT IT");
  } else if (kind === "life") {
    lives = Math.min(3, lives + 1);
    audio.beep(520, 0.2, "triangle", 0.1, 900);
    spawnParticles(pos, 0xff6ea8, 14, 3, 0.5);
    showToast("NIGHT-BLOOMING CEREUS");
  }
  updateHud();
}

function tryJump() {
  if (state !== "play") return;
  if (jumpsLeft <= 0) return;
  const first = onGround || jumpsLeft === 2;
  velY = first ? JUMP : JUMP * 0.88;
  onGround = false;
  jumpsLeft -= 1;
  audio.noise(0.12, 0.07, 1200);
  audio.beep(first ? 180 : 240, 0.08, "square", 0.05, 80);
}

function updatePlayer(dt) {
  const obj = playerObj();
  const sprint = keys.has("shift") && water > 0.05;
  const speed = (chili > 0 ? 16.5 : sprint ? 13.2 : 8.4);
  if (sprint) water = Math.max(0, water - dt * 0.07);
  else water = Math.max(0, water - dt * 0.012);
  if (water <= 0.001) {
    water = 0;
    sunTick += dt;
    if (sunTick > 1.6) {
      sunTick = 0;
      hit(1, "SUNSTROKE — FIND WATER");
    }
  } else {
    sunTick = 0;
  }

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const wish = new THREE.Vector3();
  if (keys.has("w") || keys.has("arrowup")) wish.add(forward);
  if (keys.has("s") || keys.has("arrowdown")) wish.sub(forward);
  if (keys.has("d")) wish.add(right);
  if (keys.has("a")) wish.sub(right);
  wish.addScaledVector(forward, stickVec.y);
  wish.addScaledVector(right, stickVec.x);
  if (keys.has("arrowleft") || keys.has("q")) lookDelta(-420 * dt, 0);
  if (keys.has("arrowright") || keys.has("e")) lookDelta(420 * dt, 0);
  const moving = wish.lengthSq() > 0.0001;
  if (moving) {
    wish.normalize().multiplyScalar(speed * dt);
    obj.position.add(wish);
  }

  velY -= GRAVITY * dt;
  obj.position.y += velY * dt;

  const gh = groundAt(obj.position.x, obj.position.z);
  const feet = obj.position.y - EYE;
  if (feet <= gh + 0.02 && velY <= 0) {
    if (!onGround && velY < -6) {
      spawnParticles(new THREE.Vector3(obj.position.x, gh + 0.1, obj.position.z), 0xc9a066, 8, 2.2, 0.35);
      audio.noise(0.08, 0.05, 500);
      shake = Math.min(0.2, shake + 0.08);
    }
    obj.position.y = gh + EYE;
    velY = 0;
    onGround = true;
    jumpsLeft = 2;
  } else {
    onGround = false;
  }

  for (const c of colliders) {
    if (c.kind !== "saguaro") continue;
    const dx = obj.position.x - c.x;
    const dz = obj.position.z - c.z;
    const dist = Math.hypot(dx, dz);
    const min = PLAYER_R + c.r;
    if (dist < min && feet < c.h - 0.2 && obj.position.y > 0.2) {
      const push = (min - dist) / Math.max(dist, 0.001);
      obj.position.x += dx * push;
      obj.position.z += dz * push;
      if (dist < min * 0.72) hit(1, "OUCH — SAGUARO SPINES");
    }
  }

  for (const c of colliders) {
    if (c.kind !== "barrel") continue;
    const dx = obj.position.x - c.x;
    const dz = obj.position.z - c.z;
    if (Math.hypot(dx, dz) < PLAYER_R + c.r && feet < c.h + 0.45 && velY < 0) {
      velY = JUMP * 1.35;
      onGround = false;
      jumpsLeft = 1;
      audio.beep(320, 0.1, "square", 0.08, 520);
      spawnParticles(new THREE.Vector3(c.x, 0.9, c.z), 0x4caf50, 10, 3, 0.4);
      showToast("BARREL BOUNCE");
    }
  }

  const step = obj.position.distanceTo(lastPos);
  distance += step;
  score += step * 0.35;
  lastPos.copy(obj.position);

  bob += (moving && onGround ? 1 : 0) * dt * speed * 1.4;
  const b = moving && onGround ? Math.sin(bob * 2.2) * 0.045 : 0;
  const sx = shake > 0 ? (Math.random() - 0.5) * shake * 0.35 : 0;
  const sz = shake > 0 ? (Math.random() - 0.5) * shake * 0.35 : 0;
  camera.position.set(sx, b, sz);
  camera.fov += ((chili > 0 ? 88 : 78) - camera.fov) * Math.min(1, dt * 6);
  camera.updateProjectionMatrix();

  if (cactusArms) {
    const t = performance.now() / 1000;
    cactusArms.children.forEach((arm) => {
      if (!arm.userData.side) return;
      const side = arm.userData.side;
      const walk = moving && onGround ? Math.sin(t * 8 + side) * 0.25 : 0;
      arm.rotation.x = onGround ? walk : -0.55;
      arm.position.y = onGround ? 0 : 0.08;
    });
  }

  if (invuln > 0) invuln -= dt;
  if (chili > 0) chili -= dt;
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 1;
  }
  water = Math.min(1, water);
}

function updateWeeds(dt) {
  const p = playerObj().position;
  const feet = p.y - EYE;
  for (let i = tumbleweeds.length - 1; i >= 0; i--) {
    const w = tumbleweeds[i];
    if (!w.mesh.parent) {
      tumbleweeds.splice(i, 1);
      continue;
    }
    w.mesh.position.x += w.vx * dt;
    w.mesh.position.z += w.vz * dt;
    w.mesh.position.y = 0.7 + Math.abs(Math.sin(performance.now() / 400 + w.spin)) * 0.1;
    w.mesh.rotation.x += w.vx * dt * 0.8;
    w.mesh.rotation.z += w.vz * dt * 0.8;
    const dx = p.x - w.mesh.position.x;
    const dz = p.z - w.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < PLAYER_R + w.r && feet < 1.05) {
      hit(1, "TUMBLEWEED TACKLE");
      w.vx += Math.sign(w.mesh.position.x - p.x) * 4;
      w.vz += Math.sign(w.mesh.position.z - p.z) * 4;
    }
    if (dist > CHUNK * 3.2) {
      scene.remove(w.mesh);
      tumbleweeds.splice(i, 1);
    }
  }
}

function updatePickups(dt) {
  const p = playerObj().position;
  const t = performance.now() / 1000;
  for (const ch of chunks.values()) {
    for (let i = ch.objects.length - 1; i >= 0; i--) {
      const o = ch.objects[i];
      const k = o.userData.kind;
      if (!k) continue;
      if (k === "coin" || k === "nugget" || k === "water" || k === "chili" || k === "life") {
        const dist = o.position.distanceTo(p);
        if (dist < 3.4) {
          o.position.lerp(p, 1 - Math.pow(0.08, dt));
        } else {
          const base = o.userData.baseY || 0.8;
          o.position.y = base + Math.sin(t * 3 + o.position.x) * 0.12;
        }
        o.rotation.y += dt * 2.4;
        if (dist < 1.9) collect(o, ch.objects);
      } else if (k === "snake") {
        o.userData.dir += dt * 0.7;
        const home = o.userData.home;
        o.position.x = home.x + Math.sin(o.userData.dir) * 2.2;
        o.position.z = home.z + Math.cos(o.userData.dir * 0.8) * 2.2;
        o.rotation.y = o.userData.dir;
        const dist = Math.hypot(p.x - o.position.x, p.z - o.position.z);
        if (dist < 6 && dist > 1.4 && Math.random() < 0.02) audio.beep(900 + Math.random() * 200, 0.05, "square", 0.03);
        if (dist < 0.85 && p.y - EYE < 0.55) hit(1, "RATTLESNAKE");
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.life -= dt;
    p.position.addScaledVector(p.userData.v, dt);
    p.userData.v.y -= 8 * dt;
    p.material.opacity = Math.max(0, p.userData.life / p.userData.max);
    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }
}

function applyCameraExtras(dt) {
  const p = playerObj().position;
  sun.position.set(p.x - 40, 58, p.z - 30);
  sun.target.position.set(p.x, 0, p.z);
  sun.target.updateMatrixWorld();
  mountainRing.position.x = p.x;
  mountainRing.position.z = p.z;
  vulturePivot.position.x = p.x + 10;
  vulturePivot.position.z = p.z - 8;
  vulturePivot.rotation.y += dt * 0.35;
  const g = scene.getObjectByName("ground");
  if (g) {
    g.position.x = p.x;
    g.position.z = p.z;
    sandTex.offset.set(p.x / (2400 / 90), p.z / (2400 / 90));
  }
  if (shake > 0) shake = Math.max(0, shake - dt * 1.8);
}

function beginPlay() {
  audio.resume();
  audio.startWind();
  resetWorld();
  state = "play";
  overlay.classList.add("hidden");
  deadEl.classList.add("hidden");
  pauseEl.classList.add("hidden");
  hud.classList.remove("hidden");
  hatBrim.classList.remove("hidden");
  crosshair.classList.remove("hidden");
  document.getElementById("touch-ui").classList.remove("hidden");
  renderer.domElement.style.cursor = "grab";
  tryPointerLock();
  audio.beep(330, 0.1, "square", 0.08, 500);
  showToast("DRAG or grab mouse to look · WASD or stick to mosey");
}

function togglePause() {
  if (state === "play") {
    state = "pause";
    if (document.exitPointerLock) document.exitPointerLock();
    pauseEl.classList.remove("hidden");
  } else if (state === "pause") {
    state = "play";
    pauseEl.classList.add("hidden");
    tryPointerLock();
    clock.getDelta();
  }
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  if (state === "play") {
    updateChunks();
    updatePlayer(dt);
    updateWeeds(dt);
    updatePickups(dt);
    updateParticles(dt);
    applyCameraExtras(dt);
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) toast.textContent = "";
    }
    if (hintT > 0) {
      hintT -= dt;
      document.getElementById("run-hint").style.opacity = hintT > 0 ? String(Math.min(1, hintT)) : "0";
    }
    document.getElementById("score").textContent = Math.floor(score).toLocaleString();
    document.getElementById("miles").textContent = (distance / 1609).toFixed(2);
    document.getElementById("water-bar").style.width = `${Math.max(0, water) * 100}%`;
    document.getElementById("combo").textContent = `x${combo}`;
    document.getElementById("combo-wrap").classList.toggle("hidden", combo < 2);
  } else if (state === "menu") {
    const t = performance.now() / 1000;
    const obj = playerObj();
    obj.position.set(Math.sin(t * 0.12) * 10, 3.6, 14 + Math.cos(t * 0.1) * 5);
    obj.rotation.y = t * 0.08;
    camera.rotation.x = -0.16;
    mountainRing.position.x = obj.position.x;
    mountainRing.position.z = obj.position.z;
    vulturePivot.position.set(obj.position.x + 8, 28, obj.position.z - 6);
    vulturePivot.rotation.y += dt * 0.25;
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function keyOf(e) {
  const k = e.key.toLowerCase();
  if (k === " ") return "space";
  return k;
}

window.addEventListener("resize", onResize);
window.addEventListener("keydown", (e) => {
  const k = keyOf(e);
  if (["w", "a", "s", "d", " ", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k) || e.code === "Space") {
    e.preventDefault();
  }
  keys.add(k);
  if (k === " " || k === "space") tryJump();
  if (k === "p") togglePause();
  if (k === "m") {
    muted = !muted;
    showToast(muted ? "MUTED" : "SOUND ON");
  }
  if (k === "r" && state === "dead") beginPlay();
});
window.addEventListener("keyup", (e) => keys.delete(keyOf(e)));

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (state !== "play") return;
  if (e.button !== 0) return;
  dragging = true;
  renderer.domElement.style.cursor = "grabbing";
  try {
    renderer.domElement.setPointerCapture(e.pointerId);
  } catch (err) {
    /* ignore */
  }
  tryPointerLock();
});
window.addEventListener("pointerup", () => {
  dragging = false;
  if (state === "play" && !isPointerLocked()) renderer.domElement.style.cursor = "grab";
});
window.addEventListener("pointermove", (e) => {
  if (state !== "play") return;
  if (isPointerLocked() || dragging) lookDelta(e.movementX, e.movementY);
});
document.addEventListener("pointerlockchange", () => {
  if (state === "play") renderer.domElement.style.cursor = isPointerLocked() ? "none" : "grab";
});

function bindStick() {
  const el = document.getElementById("stick");
  const knob = document.getElementById("stick-knob");
  let active = false;
  const setFrom = (x, y) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (x - cx) / (r.width * 0.5);
    let dy = (y - cy) / (r.height * 0.5);
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    stickVec.x = dx;
    stickVec.y = -dy;
    knob.style.transform = `translate(${dx * 28}px, ${dy * 28}px)`;
  };
  const end = () => {
    active = false;
    stickVec.x = 0;
    stickVec.y = 0;
    knob.style.transform = "translate(0, 0)";
  };
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    active = true;
    el.setPointerCapture(e.pointerId);
    setFrom(e.clientX, e.clientY);
  });
  el.addEventListener("pointermove", (e) => {
    if (!active) return;
    setFrom(e.clientX, e.clientY);
  });
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

document.getElementById("jump-btn").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  tryJump();
});
document.getElementById("sprint-btn").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  keys.add("shift");
});
document.getElementById("sprint-btn").addEventListener("pointerup", () => keys.delete("shift"));
document.getElementById("sprint-btn").addEventListener("pointerleave", () => keys.delete("shift"));

startBtn.addEventListener("click", () => beginPlay());
againBtn.addEventListener("click", () => beginPlay());
pauseEl.addEventListener("click", () => {
  if (state === "pause") togglePause();
});

audio = new AudioBus();
buildTextures();
addSky();
addLights();
addGround();
addMountains();
addVultures();
createArms();
bindStick();
updateHud();
spawnChunk(0, 0);
playerObj().position.set(0, 8, 14);
loop();
