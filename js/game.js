(() => {
  "use strict";

  const W = 1280;
  const H = 720;
  const TRAIL_Y = 508;
  const STORAGE_KEY = "saguaroLeapStats";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const muteBtn = document.getElementById("mute");

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const chance = (p) => Math.random() < p;
  const wrap = (v, m) => ((v % m) + m) % m;

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function lerpHex(a, b, t) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    const r = Math.round(lerp(A.r, B.r, t));
    const g = Math.round(lerp(A.g, B.g, t));
    const bl = Math.round(lerp(A.b, B.b, t));
    return `rgb(${r},${g},${bl})`;
  }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  const TRIVIA = [
    "Saguaros can live 150–200 years and may wait 50 years to grow an arm.",
    "The Grand Canyon is 277 miles long and more than a mile deep.",
    "Sedona's red rocks get their color from iron oxide in the sandstone.",
    "Arizona turquoise has been mined and traded for over a thousand years.",
    "The palo verde, Arizona's state tree, photosynthesizes through its green bark.",
    "The Colorado River carved the Grand Canyon over millions of years.",
    "Monument Valley's buttes rise nearly 1,000 feet above the desert floor.",
    "A saguaro bloom is Arizona's state flower — white, nocturnal, and bat-pollinated.",
    "The Kaibab, Coconino, and Redwall layers stripe the Grand Canyon like a timeline.",
    "Arizona has some of the darkest, clearest night skies in the lower 48.",
  ];

  const BIOMES = [
    {
      id: "sonoran",
      name: "Sonoran Desert",
      tagline: "Saguaro country at first light",
      sky: ["#12364a", "#c56a3a", "#f0c36a"],
      sun: "#ffd166",
      sunY: 128,
      sand: ["#e8c17a", "#c9843c"],
      rock: ["#9c6b3c", "#5c4033"],
      plant: "#1b4332",
      haze: "rgba(255,186,110,0.10)",
      night: false,
      canyon: false,
      strata: ["#d9a066", "#c47a3a", "#a85b2b", "#7a3e22"],
    },
    {
      id: "sedona",
      name: "Sedona Red Rocks",
      tagline: "Iron-red cathedrals and vortex dust",
      sky: ["#2a1a3a", "#d45a2a", "#f2b05a"],
      sun: "#ffe08a",
      sunY: 150,
      sand: ["#e0a060", "#c45c26"],
      rock: ["#c23b22", "#7a1f14"],
      plant: "#2d6a4f",
      haze: "rgba(255,90,40,0.10)",
      night: false,
      canyon: false,
      strata: ["#e07a3d", "#c4451a", "#9b2226", "#6a040f"],
    },
    {
      id: "canyon",
      name: "Grand Canyon",
      tagline: "A mile of sky below the rim",
      sky: ["#4c2a3a", "#e07a3d", "#f4d35e"],
      sun: "#ffefbf",
      sunY: 96,
      sand: ["#d4a373", "#9c5a32"],
      rock: ["#9b2226", "#6a040f"],
      plant: "#344e41",
      haze: "rgba(180,120,90,0.16)",
      night: false,
      canyon: true,
      strata: ["#f1e3c6", "#d9a066", "#c4451a", "#9b2226", "#6f1d1b", "#3d2914", "#1d3557"],
    },
    {
      id: "monuments",
      name: "Monument Valley",
      tagline: "Mittens, mesas, and a wide red sky",
      sky: ["#1d3557", "#e76f51", "#ffd166"],
      sun: "#fff3bf",
      sunY: 140,
      sand: ["#e9c46a", "#b5651d"],
      rock: ["#bc3908", "#6a040f"],
      plant: "#3a5a40",
      haze: "rgba(255,160,80,0.10)",
      night: false,
      canyon: false,
      strata: ["#e76f51", "#c4451a", "#9b2226", "#6a040f"],
    },
    {
      id: "night",
      name: "Arizona Night Sky",
      tagline: "Dark skies over sleeping saguaros",
      sky: ["#070b16", "#14213d", "#3d2b4d"],
      sun: "#f8f0d8",
      sunY: 90,
      sand: ["#4a3728", "#2b2118"],
      rock: ["#2b2d42", "#1b1b2f"],
      plant: "#081c15",
      haze: "rgba(80,100,160,0.12)",
      night: true,
      canyon: false,
      strata: ["#3d405b", "#2b2d42", "#1b1b2f", "#0d1b2a"],
    },
  ];

  class Sfx {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.muted = false;
      this.wind = null;
      this.echo = null;
    }

    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.22;
      this.master.connect(this.ctx.destination);

      const echo = this.ctx.createDelay(1.2);
      echo.delayTime.value = 0.28;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.28;
      echo.connect(fb);
      fb.connect(echo);
      const echoOut = this.ctx.createGain();
      echoOut.gain.value = 0;
      echo.connect(echoOut);
      echoOut.connect(this.master);
      this.echo = { delay: echo, mix: echoOut };

      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuf;
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 280;
      filter.Q.value = 0.35;
      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.12;
      noise.connect(filter);
      filter.connect(windGain);
      windGain.connect(this.master);
      noise.start();
      this.wind = { filter, gain: windGain };
    }

    setMuted(muted) {
      this.muted = muted;
      if (this.master) this.master.gain.value = muted ? 0 : 0.22;
    }

    tone(freq, dur, type, gain, slide) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || "triangle";
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.master);
      if (this.echo) g.connect(this.echo.delay);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    jump(air) {
      this.tone(air ? 420 : 280, 0.12, "square", 0.08, air ? 620 : 420);
    }

    collect(kind) {
      const f = kind === "gold" ? 880 : kind === "turquoise" ? 740 : kind === "chili" ? 520 : 640;
      this.tone(f, 0.14, "sine", 0.09, f * 1.5);
    }

    hit() {
      this.tone(120, 0.28, "sawtooth", 0.12, 50);
    }

    canyonEcho() {
      if (!this.ctx || this.muted) return;
      this.tone(180, 0.4, "sine", 0.05, 90);
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.value = 220;
      g.gain.setValueAtTime(0.04, t + 0.22);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.connect(g);
      g.connect(this.master);
      o.start(t + 0.22);
      o.stop(t + 0.72);
    }

    whoosh() {
      this.tone(90, 0.35, "sawtooth", 0.04, 40);
    }

    setCanyon(on, speed) {
      if (!this.wind) return;
      this.wind.filter.frequency.value = on ? 220 : 320;
      this.wind.gain.gain.value = 0.08 + speed * 0.004;
      if (this.echo) this.echo.mix.gain.value = on ? 0.55 : 0.08;
    }
  }

  class Particle {
    constructor(x, y, opts) {
      this.x = x;
      this.y = y;
      this.vx = opts.vx || 0;
      this.vy = opts.vy || 0;
      this.life = opts.life || 40;
      this.max = this.life;
      this.size = opts.size || 3;
      this.color = opts.color || "#e9c46a";
      this.g = opts.g || 0;
      this.spin = opts.spin || 0;
      this.ang = rand(0, Math.PI * 2);
      this.kind = opts.kind || "dot";
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += this.g * dt;
      this.ang += this.spin * dt;
      this.life -= dt;
    }

    draw(c, camX) {
      const a = clamp(this.life / this.max, 0, 1);
      const x = this.x - camX;
      const y = this.y;
      c.save();
      c.globalAlpha = a;
      if (this.kind === "spark") {
        c.strokeStyle = this.color;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - this.vx * 0.6, y - this.vy * 0.6);
        c.stroke();
      } else if (this.kind === "ring") {
        c.strokeStyle = this.color;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x, y, this.size * (1 - a) * 2 + this.size, 0, Math.PI * 2);
        c.stroke();
      } else {
        c.fillStyle = this.color;
        c.beginPath();
        c.arc(x, y, this.size * a, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }

  class Player {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = 80;
      this.y = TRAIL_Y;
      this.vy = 0;
      this.w = 46;
      this.h = 118;
      this.onGround = true;
      this.jumps = 0;
      this.squash = 1;
      this.stretch = 1;
      this.invuln = 0;
      this.shield = false;
      this.chili = 0;
      this.dead = false;
      this.fallTimer = 0;
      this.rot = 0;
      this.bob = 0;
      this.coyote = 0;
      this.buffer = 0;
      this.blink = 0;
    }

    get hitbox() {
      return { x: this.x + 10, y: this.y - this.h + 18, w: this.w - 18, h: this.h - 22 };
    }

    jump(sfx) {
      if (this.dead) return false;
      const can = this.onGround || this.coyote > 0 || this.jumps < 2;
      if (!can) {
        this.buffer = 8;
        return false;
      }
      const air = !this.onGround && this.coyote <= 0;
      this.vy = (air ? -16.2 : -17.4) * (this.chili > 0 ? 1.08 : 1);
      this.onGround = false;
      this.jumps = air ? this.jumps + 1 : 1;
      this.coyote = 0;
      this.stretch = 1.18;
      this.squash = 0.86;
      sfx.jump(air);
      return !air;
    }

    update(dt, gravity, overGap) {
      this.bob += dt * 0.35;
      this.blink += dt;
      if (this.buffer > 0) this.buffer -= dt;
      if (this.invuln > 0) this.invuln -= dt;
      if (this.chili > 0) this.chili -= dt;

      if (this.dead) {
        this.vy += gravity * 1.15 * dt;
        this.y += this.vy * dt;
        this.rot += 0.12 * dt;
        this.fallTimer += dt;
        return;
      }

      if (this.onGround) {
        this.coyote = 9;
        this.jumps = 0;
      } else if (this.coyote > 0) {
        this.coyote -= dt;
      }

      this.vy += gravity * dt;
      this.y += this.vy * dt;

      if (!overGap && this.y >= TRAIL_Y) {
        this.y = TRAIL_Y;
        if (this.vy > 3) this.squash = 1.16;
        this.vy = 0;
        this.onGround = true;
        this.jumps = 0;
      } else if (overGap || this.y < TRAIL_Y) {
        this.onGround = false;
      }

      this.squash = lerp(this.squash, 1, 0.18);
      this.stretch = lerp(this.stretch, 1, 0.18);
    }

    draw(c, camX, t) {
      const x = this.x - camX;
      const y = this.y;
      const flash = this.invuln > 0 && Math.floor(t / 4) % 2 === 0;
      c.save();
      c.translate(x + this.w / 2, y);
      c.rotate(this.rot);
      c.scale(this.squash, this.stretch);
      if (flash) c.globalAlpha = 0.45;
      drawSaguaro(c, 0, 0, this, t);
      if (this.shield) {
        c.strokeStyle = "rgba(64,196,180,0.85)";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(0, -this.h * 0.55, 48 + Math.sin(t * 0.12) * 3, 0, Math.PI * 2);
        c.stroke();
      }
      if (this.chili > 0) {
        c.fillStyle = "rgba(255,110,30,0.28)";
        c.beginPath();
        c.ellipse(0, -40, 30, 70, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }

  function drawSaguaro(c, x, y, player, t) {
    const run = player && player.onGround ? Math.sin(t * 0.45) : 0;
    const armLift = player && !player.onGround ? -10 : run * 4;
    c.save();
    c.translate(x, y);

    c.fillStyle = "rgba(40,20,0,0.25)";
    c.beginPath();
    c.ellipse(0, 4, 22, 7, 0, 0, Math.PI * 2);
    c.fill();

    const bodyGrad = c.createLinearGradient(-18, 0, 18, 0);
    bodyGrad.addColorStop(0, "#1b4332");
    bodyGrad.addColorStop(0.45, "#40916c");
    bodyGrad.addColorStop(1, "#1b4332");

    function column(cx, cy, w, h, r) {
      c.fillStyle = bodyGrad;
      roundRect(c, cx - w / 2, cy - h, w, h, r);
      c.fill();
      c.strokeStyle = "rgba(8,28,21,0.28)";
      c.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(cx + i * (w / 4), cy - h + 8);
        c.lineTo(cx + i * (w / 4), cy - 6);
        c.stroke();
      }
      c.strokeStyle = "rgba(255,255,220,0.35)";
      c.lineWidth = 1;
      for (let s = 10; s < h - 8; s += 11) {
        c.beginPath();
        c.moveTo(cx - w / 2 + 3, cy - s);
        c.lineTo(cx - w / 2 - 4, cy - s - 3);
        c.moveTo(cx + w / 2 - 3, cy - s - 4);
        c.lineTo(cx + w / 2 + 4, cy - s - 7);
        c.stroke();
      }
    }

    column(-28, -46 + armLift, 16, 44, 8);
    roundRect(c, -28, -54 + armLift, 22, 14, 7);
    c.fill();
    column(26, -58 - armLift, 16, 52, 8);
    roundRect(c, 4, -66 - armLift, 22, 14, 7);
    c.fill();
    column(0, 0, 36, 118, 16);

    c.fillStyle = "#f1faee";
    c.beginPath();
    c.ellipse(-2, -122, 7, 5, -0.4, 0, Math.PI * 2);
    c.ellipse(6, -124, 6, 4, 0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#f4a261";
    c.beginPath();
    c.arc(0, -126, 3.2, 0, Math.PI * 2);
    c.fill();

    const wink = player && Math.floor(player.blink / 180) % 9 === 0;
    c.fillStyle = "#081c15";
    if (player && player.dead) {
      c.strokeStyle = "#081c15";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-8, -88);
      c.lineTo(-2, -82);
      c.moveTo(-8, -82);
      c.lineTo(-2, -88);
      c.moveTo(4, -88);
      c.lineTo(10, -82);
      c.moveTo(4, -82);
      c.lineTo(10, -88);
      c.stroke();
    } else if (wink) {
      c.fillRect(-8, -85, 6, 2);
      c.beginPath();
      c.arc(8, -85, 3.2, 0, Math.PI * 2);
      c.fill();
    } else {
      c.beginPath();
      c.arc(-5, -85, 3.4, 0, Math.PI * 2);
      c.arc(7, -85, 3.4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(-4, -86, 1.1, 0, Math.PI * 2);
      c.arc(8, -86, 1.1, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#081c15";
    c.lineWidth = 2;
    c.beginPath();
    if (player && !player.onGround) {
      c.arc(1, -74, 6, 0.15, Math.PI - 0.15);
    } else {
      c.arc(1, -72, 5, 0.2, Math.PI - 0.2);
    }
    c.stroke();
    c.restore();
  }

  class Entity {
    constructor(type, x, y, extra) {
      this.type = type;
      this.x = x;
      this.y = y;
      Object.assign(this, extra || {});
      this.dead = false;
      this.phase = rand(0, Math.PI * 2);
      this.rot = 0;
    }
  }

  class Game {
    constructor() {
      this.sfx = new Sfx();
      this.player = new Player();
      this.reset(true);
      this.state = "title";
      this.time = 0;
      this.uiPulse = 0;
      this.high = this.loadHigh();
      this.trivia = TRIVIA[0];
      this.keys = new Set();
      this.scale = 1;
      this.dpr = 1;
      this.shake = 0;
      this.titleCactus = 0;
    }

    loadHigh() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").high || 0;
      } catch (e) {
        return 0;
      }
    }

    saveHigh() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ high: this.high }));
      } catch (e) {
        /* ignore quota */
      }
    }

    reset(keepState) {
      this.player.reset();
      this.camX = 0;
      this.lookDown = 0;
      this.speed = 7.1;
      this.distance = 0;
      this.score = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.turquoise = 0;
      this.entities = [];
      this.gaps = [];
      this.particles = [];
      this.stars = Array.from({ length: 90 }, () => ({
        x: Math.random() * W,
        y: Math.random() * 280,
        s: rand(0.6, 2.2),
        tw: rand(0, Math.PI * 2),
      }));
      this.biomeIndex = 0;
      this.biomeT = 0;
      this.announce = { text: "", sub: "", life: 0 };
      this.nextSpawn = 520;
      this.banner = { text: "", life: 0 };
      this.condors = [
        { x: 900, y: 120, s: 0.6, dir: -1 },
        { x: 400, y: 80, s: 0.4, dir: 1 },
      ];
      this.echoRings = [];
      this.heat = 0;
      this.biomeCycle = 0;
      this.gameOverReason = "";
      if (!keepState) this.state = "playing";
    }

    biome() {
      return BIOMES[this.biomeIndex % BIOMES.length];
    }

    overGap(px) {
      const bodyLeft = px + 12;
      const bodyRight = px + 34;
      return this.gaps.some((g) => bodyLeft > g.x + 10 && bodyRight < g.x + g.w - 10);
    }

    spawnPattern() {
      const x = this.player.x + W + rand(40, 160);
      const diff = clamp(this.distance / 4000, 0, 1);
      const biome = this.biome();
      const roll = Math.random();

      if (biome.canyon && roll < 0.28 + diff * 0.08) {
        this.spawnCanyonLeap(x);
        return;
      }
      if (roll < 0.18) {
        this.spawnGap(x, rand(90, 140 + diff * 40), true);
      } else if (roll < 0.38) {
        this.entities.push(new Entity("tumbleweed", x, TRAIL_Y - 18, { r: 18, vx: -1.2 }));
        if (chance(0.45 + diff * 0.2)) {
          this.entities.push(new Entity("tumbleweed", x + 90, TRAIL_Y - 16, { r: 16, vx: -1.4 }));
        }
      } else if (roll < 0.55) {
        this.entities.push(new Entity("rock", x, TRAIL_Y, { w: 54, h: 42 }));
        this.arcCollect(x + 20, 1);
      } else if (roll < 0.68) {
        this.entities.push(new Entity("snake", x, TRAIL_Y, { w: 70, h: 28 }));
      } else if (roll < 0.8) {
        this.entities.push(new Entity("hawk", x, TRAIL_Y - rand(130, 190), { w: 56, h: 24, amp: rand(16, 34) }));
      } else if (roll < 0.9) {
        this.entities.push(new Entity("dustdevil", x, TRAIL_Y, { h: 110, w: 36 }));
      } else {
        this.entities.push(new Entity("barrel", x, TRAIL_Y, { w: 40, h: 36 }));
        this.entities.push(new Entity("rock", x + 130, TRAIL_Y, { w: 48, h: 50 }));
      }

      if (chance(0.55)) this.arcCollect(x + rand(40, 180), randi(2, 5));
      if (chance(0.08)) this.entities.push(new Entity("chili", x + 60, TRAIL_Y - 90, { w: 22, h: 28 }));
      if (chance(0.06)) this.entities.push(new Entity("amulet", x + 80, TRAIL_Y - 110, { w: 24, h: 24 }));
    }

    spawnGap(x, w, withGems) {
      this.gaps.push({ x, w });
      this.entities.push(new Entity("gap", x, TRAIL_Y, { w, h: 40 }));
      if (withGems) this.arcCollect(x + w * 0.15, 4, w * 0.7);
    }

    spawnCanyonLeap(x) {
      const w = rand(210, 280);
      this.gaps.push({ x, w });
      this.entities.push(new Entity("gap", x, TRAIL_Y, { w, h: 40, canyonLeap: true }));
      this.arcCollect(x + 20, 7, w - 40);
      this.entities.push(new Entity("gold", x + w * 0.5, TRAIL_Y - 168, { w: 20, h: 20 }));
    }

    arcCollect(x, n, span) {
      const width = span || n * 36;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const kind = chance(0.12) ? "gold" : chance(0.55) ? "turquoise" : "copper";
        this.entities.push(
          new Entity(kind, x + t * width, TRAIL_Y - 70 - Math.sin(t * Math.PI) * 70, { w: 18, h: 18 })
        );
      }
    }

    burst(x, y, color, n, kind) {
      for (let i = 0; i < n; i++) {
        this.particles.push(
          new Particle(x, y, {
            vx: rand(-4, 4),
            vy: rand(-6, -1),
            g: 0.18,
            life: rand(18, 36),
            size: rand(2, 5),
            color,
            kind: kind || "dot",
          })
        );
      }
    }

    start() {
      this.sfx.ensure();
      if (this.sfx.ctx && this.sfx.ctx.state === "suspended") this.sfx.ctx.resume();
      this.reset();
      this.state = "playing";
      const b = this.biome();
      this.announce = { text: b.name, sub: b.tagline, life: 140 };
    }

    togglePause() {
      if (this.state === "playing") this.state = "paused";
      else if (this.state === "paused") this.state = "playing";
    }

    jump() {
      if (this.state === "title" || this.state === "gameover") {
        this.start();
        return;
      }
      if (this.state !== "playing") return;
      const fromGround = this.player.jump(this.sfx);
      if (fromGround && this.biome().canyon) {
        this.sfx.canyonEcho();
        this.echoRings.push({ x: this.player.x + 20, y: this.player.y - 80, life: 40, max: 40 });
      }
      this.burst(this.player.x + 20, this.player.y, "#e9c46a", 6);
    }

    update(dt) {
      this.time += dt;
      this.uiPulse += dt;
      this.titleCactus += dt;
      if (this.shake > 0) this.shake -= dt * 0.6;

      if (this.state === "title") {
        this.camX += 0.55 * dt;
        return;
      }
      if (this.state === "paused") return;

      const biome = this.biome();
      this.sfx.setCanyon(biome.canyon, this.speed);

      if (this.state === "gameover") {
        this.player.update(dt, 0.55, true);
        this.particles.forEach((p) => p.update(dt));
        this.particles = this.particles.filter((p) => p.life > 0);
        return;
      }

      const chiliBoost = this.player.chili > 0 ? 1.22 : 1;
      this.speed = lerp(this.speed, (7.1 + this.distance / 2800) * chiliBoost, 0.03);
      this.speed = clamp(this.speed, 6.5, 15.5);
      this.player.x += this.speed * dt;
      this.distance += this.speed * dt;
      this.camX = this.player.x - 220;

      if (this.comboTimer > 0) this.comboTimer -= dt;
      else this.combo = 0;

      const cycle = Math.floor(this.distance / 2400);
      if (cycle !== this.biomeCycle) {
        this.biomeCycle = cycle;
        this.biomeIndex = cycle % BIOMES.length;
        const b = this.biome();
        this.announce = { text: b.name, sub: b.tagline, life: 150 };
        this.burst(this.player.x + 40, this.player.y - 40, "#ffd166", 18, "spark");
      }
      if (this.announce.life > 0) this.announce.life -= dt;
      if (this.banner.life > 0) this.banner.life -= dt;

      const over = this.overGap(this.player.x);
      const bigGap = this.gaps.some(
        (g) => this.player.x > g.x - 80 && this.player.x < g.x + g.w + 40 && g.w > 180
      );
      this.lookDown = lerp(this.lookDown, biome.canyon || bigGap || over ? 1 : 0, 0.06);

      this.player.update(dt, 0.62, over);

      if (this.player.buffer > 0 && (this.player.onGround || this.player.coyote > 0 || this.player.jumps < 2)) {
        this.player.buffer = 0;
        this.jump();
      }

      if (over && this.player.y > TRAIL_Y + 18) {
        this.die("The canyon claimed another traveler.");
        this.sfx.whoosh();
      }

      if (this.player.x > this.nextSpawn) {
        this.spawnPattern();
        this.nextSpawn = this.player.x + rand(300, 520) - this.speed * 8;
      }

      this.gaps = this.gaps.filter((g) => g.x + g.w > this.camX - 80);

      for (const e of this.entities) {
        this.updateEntity(e, dt);
      }
      this.entities = this.entities.filter((e) => !e.dead && e.x > this.camX - 160);

      if (this.player.onGround && Math.floor(this.time) % 5 === 0) {
        this.particles.push(
          new Particle(this.player.x + 8, TRAIL_Y - 2, {
            vx: rand(-3, -1),
            vy: rand(-1.2, -0.2),
            life: 16,
            size: 3,
            color: biome.sand[0],
            g: 0.05,
          })
        );
      }

      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => p.life > 0);
      this.echoRings.forEach((r) => (r.life -= dt));
      this.echoRings = this.echoRings.filter((r) => r.life > 0);

      this.condors.forEach((k, i) => {
        k.x += k.dir * k.s * dt * 1.4;
        k.y += Math.sin((this.time + i * 40) * 0.03) * 0.3;
        if (k.x < this.camX - 100) k.x = this.camX + W + rand(40, 300);
      });

      this.heat += dt * 0.04;
    }

    updateEntity(e, dt) {
      e.phase += dt * 0.1;
      if (e.type === "tumbleweed") {
        e.rot += 0.18 * dt;
        e.x += (e.vx || -1) * dt;
        e.y = TRAIL_Y - e.r + Math.abs(Math.sin(e.phase * 2.2)) * 10;
      }
      if (e.type === "hawk") {
        e.y += Math.sin(e.phase * 2.4) * 0.7;
        e.x -= 0.6 * dt;
      }
      if (e.type === "dustdevil") {
        e.rot += 0.25 * dt;
      }
      if (e.type === "snake") {
        e.strike = Math.sin(e.phase * 3) > 0.65;
      }

      const collectible = ["turquoise", "copper", "gold", "chili", "amulet"].includes(e.type);
      if (collectible) {
        const dx = this.player.x + 22 - e.x;
        const dy = this.player.y - 60 - e.y;
        if (dx * dx + dy * dy < 50 * 50) {
          this.collect(e);
        }
        return;
      }
      if (e.type === "gap") return;

      const pb = this.player.hitbox;
      const ew = e.w || (e.r ? e.r * 2 : 30);
      const eh = e.h || (e.r ? e.r * 2 : 30);
      const ex = e.type === "tumbleweed" ? e.x - e.r : e.x;
      const ey = e.type === "tumbleweed" ? e.y - e.r : e.y - eh;
      if (this.overlaps(pb.x, pb.y, pb.w, pb.h, ex, ey, ew, eh)) {
        if (e.type === "dustdevil") {
          this.player.vy = -14;
          this.player.onGround = false;
          this.shake = 8;
          this.burst(e.x, e.y - 40, "#d9a066", 10);
          e.dead = true;
          this.sfx.whoosh();
        } else {
          this.hitHazard(e);
        }
      }
    }

    overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    collect(e) {
      e.dead = true;
      this.combo += 1;
      this.comboTimer = 90;
      const mult = 1 + Math.min(8, this.combo) * 0.15;
      const pts = ({ turquoise: 50, copper: 25, gold: 120, chili: 40, amulet: 80 }[e.type] || 10) * mult;
      this.score += Math.round(pts);
      if (e.type === "turquoise") this.turquoise += 1;
      if (e.type === "chili") this.player.chili = 240;
      if (e.type === "amulet") {
        this.player.shield = true;
        this.banner = { text: "Turquoise ward!", life: 80 };
      }
      this.sfx.collect(e.type);
      const colors = {
        turquoise: "#40c4b4",
        copper: "#d4a054",
        gold: "#ffd166",
        chili: "#e63946",
        amulet: "#80ffdb",
      };
      this.burst(e.x, e.y, colors[e.type], 10, "spark");
      if (this.combo >= 5 && this.combo % 5 === 0) {
        this.banner = { text: this.combo + " streak!", life: 70 };
      }
    }

    hitHazard(e) {
      if (this.player.invuln > 0 || this.player.dead) return;
      if (this.player.shield) {
        this.player.shield = false;
        this.player.invuln = 70;
        e.dead = true;
        this.shake = 10;
        this.burst(this.player.x, this.player.y - 50, "#40c4b4", 16, "spark");
        this.sfx.hit();
        return;
      }
      const reasons = {
        tumbleweed: "Tumbleweed takedown.",
        rock: "Sandstone wins this round.",
        snake: "A rattler said hello.",
        hawk: "The sky claimed the right of way.",
        barrel: "Barrel cactus: very round, very sharp.",
      };
      this.die(reasons[e.type] || "The desert is undefeated.");
    }

    die(reason) {
      if (this.player.dead) return;
      this.player.dead = true;
      this.player.vy = -8;
      this.shake = 16;
      this.gameOverReason = reason;
      this.trivia = TRIVIA[randi(0, TRIVIA.length - 1)];
      this.sfx.hit();
      this.burst(this.player.x + 20, this.player.y - 60, "#40916c", 22, "spark");
      if (this.score > this.high) {
        this.high = this.score;
        this.saveHigh();
      }
      setTimeout(() => {
        if (this.player.dead) this.state = "gameover";
      }, 700);
    }

    draw() {
      const biome = this.biome();
      const cam = this.camX;
      ctx.save();
      if (this.shake > 0) {
        ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
      }
      const dip = this.lookDown * 70;
      ctx.translate(0, -dip * 0.15);

      this.drawSky(biome);
      this.drawCelestial(biome);
      if (biome.night) this.drawStars(biome);
      this.drawFarLand(biome, cam);
      this.drawCondors(cam, biome);
      this.drawMidLand(biome, cam);
      this.drawHeat(biome);
      this.drawTrail(biome, cam);
      this.drawCanyonDepth(biome, cam);
      this.drawGaps(biome, cam);
      this.particles.forEach((p) => p.draw(ctx, cam));
      this.entities.forEach((e) => this.drawEntity(e, cam, biome));
      if (this.state !== "title") this.player.draw(ctx, cam, this.time);
      this.drawEcho(cam);
      this.drawForeground(biome, cam);
      this.drawVignette(biome);
      ctx.restore();

      if (this.state === "title") this.drawTitle();
      else if (this.state === "paused") this.drawPause();
      else if (this.state === "gameover") this.drawGameOver();
      else this.drawHud(biome);
    }

    drawSky(biome) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, biome.sky[0]);
      g.addColorStop(0.48, biome.sky[1]);
      g.addColorStop(1, biome.sky[2]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    drawCelestial(biome) {
      const x = 1020;
      const y = biome.sunY;
      const glow = ctx.createRadialGradient(x, y, 10, x, y, 160);
      glow.addColorStop(0, biome.night ? "rgba(248,240,216,0.9)" : "rgba(255,236,170,0.95)");
      glow.addColorStop(0.25, biome.night ? "rgba(248,240,216,0.18)" : "rgba(255,180,80,0.35)");
      glow.addColorStop(1, "rgba(255,180,80,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 160, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = biome.sun;
      ctx.beginPath();
      ctx.arc(x, y, biome.night ? 22 : 38, 0, Math.PI * 2);
      ctx.fill();
      if (!biome.night) {
        ctx.strokeStyle = "rgba(255,220,140,0.18)";
        ctx.lineWidth = 3;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + this.time * 0.002;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * 50, y + Math.sin(a) * 50);
          ctx.lineTo(x + Math.cos(a) * 90, y + Math.sin(a) * 90);
          ctx.stroke();
        }
      }
    }

    drawStars(biome) {
      ctx.save();
      this.stars.forEach((s) => {
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(this.time * 0.04 + s.tw));
        ctx.globalAlpha = tw;
        ctx.fillStyle = "#f8f0d8";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 0.18;
      ctx.save();
      ctx.translate(W * 0.45, 90);
      ctx.rotate(-0.4);
      const milky = ctx.createLinearGradient(0, -30, 0, 30);
      milky.addColorStop(0, "rgba(255,255,255,0)");
      milky.addColorStop(0.5, "rgba(210,220,255,0.9)");
      milky.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = milky;
      ctx.fillRect(-500, -18, 1000, 36);
      ctx.restore();
      if (Math.sin(this.time * 0.02) > 0.97) {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(200, 40);
        ctx.lineTo(340, 110);
        ctx.stroke();
      }
      ctx.restore();
    }

    mesa(c, x, y, w, h, color, shade) {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w * 0.12, y - h);
      c.lineTo(x + w * 0.88, y - h);
      c.lineTo(x + w, y);
      c.closePath();
      c.fill();
      c.fillStyle = shade;
      c.fillRect(x + w * 0.18, y - h - 16, w * 0.64, 18);
    }

    cactusSil(c, x, y, s, color) {
      c.fillStyle = color;
      c.fillRect(x, y - 70 * s, 10 * s, 70 * s);
      c.fillRect(x - 16 * s, y - 48 * s, 16 * s, 8 * s);
      c.fillRect(x - 16 * s, y - 48 * s, 8 * s, 22 * s);
      c.fillRect(x + 10 * s, y - 40 * s, 14 * s, 8 * s);
      c.fillRect(x + 16 * s, y - 52 * s, 8 * s, 20 * s);
    }

    drawFarLand(biome, cam) {
      const par = cam * 0.15;
      ctx.fillStyle = lerpHex(biome.rock[1], biome.sky[1], 0.45);
      ctx.beginPath();
      ctx.moveTo(0, 360);
      for (let i = 0; i <= 14; i++) {
        const x = i * 110 - wrap(par, 110);
        const y = 250 + Math.sin(i * 0.9 + biome.name.length) * 28;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W + 40, 400);
      ctx.lineTo(0, 400);
      ctx.fill();

      if (biome.id === "monuments" || biome.id === "sedona") {
        for (let i = -1; i < 6; i++) {
          const x = i * 280 - wrap(cam * 0.22, 280);
          this.mesa(ctx, x + 40, 400, 120 + (i % 3) * 30, 90 + (i % 2) * 40, biome.rock[0], biome.strata[0]);
        }
      }
      if (biome.canyon) {
        this.drawFarRim(cam);
      }
    }

    drawFarRim(cam) {
      const par = cam * 0.2;
      const layers = [
        { y: 330, h: 36, col: "#d9c5a0" },
        { y: 360, h: 40, col: "#d4a373" },
        { y: 394, h: 44, col: "#c4451a" },
        { y: 430, h: 48, col: "#9b2226" },
        { y: 470, h: 40, col: "#6f1d1b" },
      ];
      layers.forEach((layer, li) => {
        ctx.fillStyle = layer.col;
        ctx.globalAlpha = 0.55 + li * 0.08;
        ctx.beginPath();
        ctx.moveTo(-20, layer.y + layer.h);
        for (let i = 0; i <= 16; i++) {
          const x = i * 90 - wrap(par * (1 + li * 0.05), 90);
          ctx.lineTo(x, layer.y + Math.sin(i * 0.7 + li) * 8);
        }
        ctx.lineTo(W + 20, layer.y + layer.h);
        ctx.closePath();
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      const riverY = 505;
      const rg = ctx.createLinearGradient(0, riverY, 0, riverY + 18);
      rg.addColorStop(0, "#40916c");
      rg.addColorStop(1, "#1d3557");
      ctx.fillStyle = rg;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(0, riverY, W, 10);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#80ffdb";
      for (let i = 0; i < 8; i++) {
        const x = wrap(i * 180 - cam * 0.25 + this.time * 0.4, W);
        ctx.fillRect(x, riverY + 3, 18, 2);
      }
      ctx.globalAlpha = 1;
    }

    drawMidLand(biome, cam) {
      const par = cam * 0.45;
      ctx.fillStyle = biome.rock[0];
      ctx.beginPath();
      ctx.moveTo(0, TRAIL_Y);
      for (let i = 0; i <= 18; i++) {
        const x = i * 90 - wrap(par, 90);
        ctx.lineTo(x, 390 + Math.sin(i * 1.1) * 22);
      }
      ctx.lineTo(W, TRAIL_Y);
      ctx.closePath();
      ctx.fill();

      for (let i = -1; i < 10; i++) {
        const x = i * 160 - wrap(cam * 0.5, 160);
        this.cactusSil(ctx, x + 30, TRAIL_Y - 8, 0.7 + (i % 3) * 0.15, biome.plant);
      }

      if (biome.id === "sedona") {
        ctx.strokeStyle = "rgba(255,210,120,0.18)";
        ctx.lineWidth = 2;
        for (let v = 0; v < 3; v++) {
          ctx.beginPath();
          const cx = 400 + v * 220;
          for (let a = 0; a < 18; a++) {
            const ang = a * 0.4 + this.time * 0.01 + v;
            const r = 20 + a * 3;
            ctx.lineTo(cx + Math.cos(ang) * r, 300 + Math.sin(ang) * r * 0.4);
          }
          ctx.stroke();
        }
      }
    }

    drawHeat(biome) {
      if (biome.night) return;
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = biome.haze;
      for (let i = 0; i < 6; i++) {
        const y = 240 + i * 28 + Math.sin(this.heat + i) * 6;
        ctx.fillRect(0, y, W, 10);
      }
      ctx.restore();
    }

    drawTrail(biome, cam) {
      const g = ctx.createLinearGradient(0, TRAIL_Y, 0, H);
      g.addColorStop(0, biome.sand[0]);
      g.addColorStop(1, biome.sand[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, TRAIL_Y, W, H - TRAIL_Y);

      ctx.strokeStyle = "rgba(90,50,20,0.18)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 24; i++) {
        const x = i * 80 - wrap(cam, 80);
        ctx.beginPath();
        ctx.moveTo(x, TRAIL_Y + 8);
        ctx.quadraticCurveTo(x + 30, TRAIL_Y + 22, x + 70, TRAIL_Y + 10);
        ctx.stroke();
      }

      if (biome.canyon) {
        ctx.fillStyle = "#6a040f";
        ctx.fillRect(0, TRAIL_Y, W, 14);
        ctx.fillStyle = "#bc6c25";
        ctx.fillRect(0, TRAIL_Y, W, 6);
      }
    }

    drawCanyonDepth(biome, cam) {
      if (!biome.canyon && this.lookDown < 0.2) return;
      const top = TRAIL_Y + 14;
      const depth = H - top + 90;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, W, depth);
      ctx.clip();

      const strata = biome.strata;
      const h = depth / strata.length;
      strata.forEach((col, i) => {
        ctx.fillStyle = col;
        const wobble = Math.sin(this.time * 0.01 + i) * 4;
        ctx.fillRect(0, top + i * h + wobble, W, h + 6);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(0, top + i * h + h * 0.7, W, 4);
      });

      const fog = ctx.createLinearGradient(0, top, 0, H);
      fog.addColorStop(0, "rgba(255,200,140,0.05)");
      fog.addColorStop(0.45, "rgba(120,70,40,0.08)");
      fog.addColorStop(1, "rgba(20,40,70,0.45)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, top, W, depth);

      ctx.fillStyle = "#1d3557";
      ctx.globalAlpha = 0.85;
      const riverY = H - 34 + Math.sin(this.time * 0.03) * 2;
      roundRect(ctx, 200, riverY, 880, 16, 8);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#80ffdb";
      ctx.fillRect(260 + wrap(this.time * 0.8, 600), riverY + 5, 40, 3);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = "rgba(255,236,200,0.08)";
      ctx.lineWidth = 18;
      for (let i = 0; i < 4; i++) {
        const x = 180 + i * 280;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + 40, H);
        ctx.stroke();
      }

      if (biome.canyon) {
        ctx.font = "700 11px Nunito, sans-serif";
        ctx.fillStyle = "rgba(255,246,229,0.28)";
        const labels = ["Kaibab", "Coconino", "Redwall", "Vishnu Schist"];
        labels.forEach((lab, i) => ctx.fillText(lab, 24, top + 28 + i * 44));
      }
      ctx.restore();
    }

    drawGaps(biome, cam) {
      this.gaps.forEach((g) => {
        const x = g.x - cam;
        if (x + g.w < -20 || x > W + 20) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, TRAIL_Y, g.w, H - TRAIL_Y);
        ctx.clip();

        const strata = biome.strata;
        strata.forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.fillRect(x, TRAIL_Y + i * 28, g.w, 32);
        });
        const mist = ctx.createLinearGradient(0, TRAIL_Y, 0, H);
        mist.addColorStop(0, "rgba(80,40,20,0.08)");
        mist.addColorStop(1, "rgba(20,30,50,0.62)");
        ctx.fillStyle = mist;
        ctx.fillRect(x, TRAIL_Y, g.w, H - TRAIL_Y);
        ctx.fillStyle = "#1d3557";
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x + 6, H - 30, g.w - 12, 10);
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "#80ffdb";
        ctx.fillRect(x + 16, H - 26, Math.max(12, g.w * 0.2), 3);
        ctx.globalAlpha = 1;
        ctx.restore();

        ctx.fillStyle = "#3d2314";
        ctx.fillRect(x - 7, TRAIL_Y - 10, 14, 22);
        ctx.fillRect(x + g.w - 7, TRAIL_Y - 10, 14, 22);
        ctx.fillStyle = "#bc6c25";
        ctx.fillRect(x - 7, TRAIL_Y - 10, 14, 5);
        ctx.fillRect(x + g.w - 7, TRAIL_Y - 10, 14, 5);
      });
    }

    drawEntity(e, cam, biome) {
      const x = e.x - cam;
      if (x < -80 || x > W + 80) return;
      if (e.type === "gap") return;
      ctx.save();
      if (e.type === "tumbleweed") this.drawTumbleweed(x, e);
      else if (e.type === "rock") this.drawRock(x, e, biome);
      else if (e.type === "snake") this.drawSnake(x, e);
      else if (e.type === "hawk") this.drawHawk(x, e);
      else if (e.type === "dustdevil") this.drawDevil(x, e);
      else if (e.type === "barrel") this.drawBarrel(x, e);
      else if (e.type === "turquoise") this.drawGem(x, e.y, "#40c4b4", e.phase);
      else if (e.type === "copper") this.drawGem(x, e.y, "#d4a054", e.phase);
      else if (e.type === "gold") this.drawGem(x, e.y, "#ffd166", e.phase);
      else if (e.type === "chili") this.drawChili(x, e);
      else if (e.type === "amulet") this.drawAmulet(x, e);
      ctx.restore();
    }

    drawTumbleweed(x, e) {
      ctx.translate(x, e.y);
      ctx.rotate(e.rot);
      ctx.strokeStyle = "#6f4e37";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, e.r - (i % 3) * 3, i, i + 2.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(i) * e.r, Math.sin(i) * e.r);
        ctx.stroke();
      }
    }

    drawRock(x, e, biome) {
      ctx.fillStyle = biome.rock[0];
      ctx.beginPath();
      ctx.moveTo(x, TRAIL_Y);
      ctx.lineTo(x + 8, TRAIL_Y - e.h);
      ctx.lineTo(x + e.w * 0.7, TRAIL_Y - e.h * 0.75);
      ctx.lineTo(x + e.w, TRAIL_Y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,220,180,0.18)";
      ctx.beginPath();
      ctx.moveTo(x + 12, TRAIL_Y - 8);
      ctx.lineTo(x + 14, TRAIL_Y - e.h + 8);
      ctx.lineTo(x + 22, TRAIL_Y - 8);
      ctx.fill();
    }

    drawSnake(x, e) {
      ctx.strokeStyle = "#6a994e";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, TRAIL_Y - 6);
      ctx.bezierCurveTo(x + 18, TRAIL_Y - 24, x + 36, TRAIL_Y + 4, x + 58, TRAIL_Y - (e.strike ? 26 : 10));
      ctx.stroke();
      ctx.fillStyle = "#386641";
      ctx.beginPath();
      ctx.arc(x + 60, TRAIL_Y - (e.strike ? 28 : 12), 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e63946";
      ctx.fillRect(x + 66, TRAIL_Y - (e.strike ? 28 : 12), 8, 2);
    }

    drawHawk(x, e) {
      const flap = Math.sin(e.phase * 8) * 10;
      ctx.translate(x, e.y);
      ctx.fillStyle = "#1b1b1b";
      ctx.beginPath();
      ctx.moveTo(-28, flap);
      ctx.quadraticCurveTo(0, -8, 28, -flap);
      ctx.quadraticCurveTo(0, 8, -28, flap);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawDevil(x, e) {
      ctx.translate(x + 18, TRAIL_Y);
      ctx.strokeStyle = "rgba(210,170,110,0.55)";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const w = 8 + i * 5;
        ctx.ellipse(Math.sin(e.rot + i) * 4, -i * 22, w, 8, e.rot, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    drawBarrel(x, e) {
      const g = ctx.createLinearGradient(x, 0, x + e.w, 0);
      g.addColorStop(0, "#2d6a4f");
      g.addColorStop(0.5, "#95d5b2");
      g.addColorStop(1, "#1b4332");
      ctx.fillStyle = g;
      roundRect(ctx, x, TRAIL_Y - e.h, e.w, e.h, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,220,0.4)";
      for (let i = 6; i < e.h; i += 8) {
        ctx.beginPath();
        ctx.moveTo(x + 4, TRAIL_Y - i);
        ctx.lineTo(x - 2, TRAIL_Y - i - 3);
        ctx.stroke();
      }
    }

    drawGem(x, y, color, phase) {
      const bob = Math.sin(phase * 2 + y) * 4;
      ctx.translate(x, y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(-6, -6, 6, 4);
    }

    drawChili(x, e) {
      const bob = Math.sin(e.phase * 3) * 3;
      ctx.fillStyle = "#e63946";
      ctx.beginPath();
      ctx.ellipse(x, e.y + bob, 7, 14, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2d6a4f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 4, e.y + bob - 12);
      ctx.lineTo(x + 8, e.y + bob - 18);
      ctx.stroke();
    }

    drawAmulet(x, e) {
      const bob = Math.sin(e.phase * 2) * 4;
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, e.y + bob, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#40c4b4";
      ctx.beginPath();
      ctx.arc(x, e.y + bob, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    drawEcho(cam) {
      this.echoRings.forEach((r) => {
        const a = r.life / r.max;
        ctx.strokeStyle = `rgba(255,236,200,${a * 0.55})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x - cam, r.y, (1 - a) * 90 + 10, 0, Math.PI * 2);
        ctx.stroke();
      });
    }

    drawCondors(cam, biome) {
      this.condors.forEach((k) => {
        ctx.save();
        ctx.translate(k.x - cam * 0.3, k.y);
        ctx.fillStyle = biome.night ? "rgba(0,0,0,0.65)" : "rgba(20,10,0,0.55)";
        ctx.beginPath();
        ctx.moveTo(-26, 4);
        ctx.quadraticCurveTo(0, -10, 26, 4);
        ctx.quadraticCurveTo(0, 2, -26, 4);
        ctx.fill();
        ctx.restore();
      });
    }

    drawForeground(biome, cam) {
      ctx.fillStyle = biome.plant;
      for (let i = -1; i < 8; i++) {
        const x = i * 220 - wrap(cam * 1.15, 220);
        ctx.globalAlpha = 0.35;
        this.cactusSil(ctx, x, H - 10, 1.4, biome.plant);
      }
      ctx.globalAlpha = 1;
      if (biome.canyon) {
        ctx.fillStyle = "rgba(40,10,0,0.35)";
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, H - 70);
        ctx.lineTo(180, H);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(W, H);
        ctx.lineTo(W, H - 90);
        ctx.lineTo(W - 220, H);
        ctx.fill();
      }
    }

    drawVignette(biome) {
      const v = ctx.createRadialGradient(W / 2, H / 2, 180, W / 2, H / 2, 740);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, biome.night ? "rgba(0,0,0,0.55)" : "rgba(40,10,0,0.32)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
    }

    panel(x, y, w, h) {
      ctx.fillStyle = "rgba(18, 35, 46, 0.72)";
      roundRect(ctx, x, y, w, h, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(212,160,84,0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawHud(biome) {
      ctx.font = "800 18px Nunito, sans-serif";
      ctx.fillStyle = "#fff6e5";
      ctx.textAlign = "left";
      ctx.fillText("SCORE  " + Math.floor(this.score), 28, 40);
      ctx.fillStyle = "#40c4b4";
      ctx.fillText("TURQUOISE  " + this.turquoise, 28, 64);
      ctx.fillStyle = "#ffd166";
      ctx.textAlign = "right";
      ctx.fillText(biome.name.toUpperCase(), W - 28, 40);
      ctx.fillStyle = "rgba(255,246,229,0.8)";
      ctx.font = "700 14px Nunito, sans-serif";
      ctx.fillText(Math.floor(this.distance / 40) + " desert yards", W - 28, 62);
      if (this.combo > 1) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd166";
        ctx.font = "800 22px Nunito, sans-serif";
        ctx.fillText("x" + this.combo.toFixed(0) + " streak", W / 2, 44);
      }
      if (this.announce.life > 0) {
        const a = clamp(this.announce.life / 30, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff6e5";
        ctx.font = "48px Paytone One, Impact, sans-serif";
        ctx.fillText(this.announce.text, W / 2, 150);
        ctx.font = "700 18px Nunito, sans-serif";
        ctx.fillStyle = "#ffd166";
        ctx.fillText(this.announce.sub, W / 2, 180);
        ctx.restore();
      }
      if (this.banner.life > 0) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#80ffdb";
        ctx.font = "800 26px Nunito, sans-serif";
        ctx.fillText(this.banner.text, W / 2, 210);
      }
      if (this.player.chili > 0) {
        ctx.textAlign = "left";
        ctx.fillStyle = "#e63946";
        ctx.font = "800 14px Nunito, sans-serif";
        ctx.fillText("CHILI HEAT", 28, 88);
      }
    }

    drawTitle() {
      this.panel(160, 80, 960, 560);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd166";
      ctx.font = "700 16px Nunito, sans-serif";
      ctx.fillText("THE GRAND CANYON STATE", W / 2, 130);
      ctx.fillStyle = "#fff6e5";
      ctx.font = "72px Paytone One, Impact, sans-serif";
      ctx.fillText("SAGUARO LEAP", W / 2, 210);
      ctx.font = "700 20px Nunito, sans-serif";
      ctx.fillStyle = "#40c4b4";
      ctx.fillText("Jump a cactus across Arizona — deserts, red rocks, and the rim.", W / 2, 250);

      ctx.save();
      ctx.translate(W / 2, 430 + Math.sin(this.titleCactus * 0.08) * 8);
      ctx.scale(1.15, 1.15);
      drawSaguaro(ctx, 0, 0, null, this.titleCactus);
      ctx.restore();

      this.drawSunburstFlag(W / 2, 340);

      const pulse = 0.7 + 0.3 * Math.sin(this.uiPulse * 0.1);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 22px Nunito, sans-serif";
      ctx.fillText("Press Space or Tap to hit the trail", W / 2, 520);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,246,229,0.8)";
      ctx.font = "700 16px Nunito, sans-serif";
      ctx.fillText("High score  " + this.high, W / 2, 552);
      ctx.font = "700 14px Nunito, sans-serif";
      ctx.fillText("Double-jump · grab turquoise · leap the canyon · chili peppers make you fast", W / 2, 586);
    }

    drawSunburstFlag(x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 13; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#c41e3a" : "#ffd166";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const a0 = (i / 13) * Math.PI - Math.PI / 2;
        const a1 = ((i + 1) / 13) * Math.PI - Math.PI / 2;
        ctx.arc(0, 0, 70, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#b87333";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawPause() {
      this.drawHud(this.biome());
      this.panel(390, 240, 500, 200);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff6e5";
      ctx.font = "48px Paytone One, Impact, sans-serif";
      ctx.fillText("Paused", W / 2, 330);
      ctx.font = "700 18px Nunito, sans-serif";
      ctx.fillStyle = "#ffd166";
      ctx.fillText("Press P or tap to keep riding the rim", W / 2, 380);
    }

    drawGameOver() {
      this.panel(180, 90, 920, 540);
      ctx.textAlign = "center";
      ctx.fillStyle = "#e76f51";
      ctx.font = "56px Paytone One, Impact, sans-serif";
      ctx.fillText("Trail's End", W / 2, 170);
      ctx.fillStyle = "#fff6e5";
      ctx.font = "700 20px Nunito, sans-serif";
      ctx.fillText(this.gameOverReason, W / 2, 210);
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 28px Nunito, sans-serif";
      ctx.fillText("Score  " + Math.floor(this.score), W / 2, 270);
      ctx.fillStyle = "#40c4b4";
      ctx.font = "700 18px Nunito, sans-serif";
      ctx.fillText(
        "Turquoise " + this.turquoise + "   ·   " + Math.floor(this.distance / 40) + " yards   ·   Best " + this.high,
        W / 2,
        308
      );
      this.panel(250, 340, 780, 130);
      ctx.fillStyle = "#ffd166";
      ctx.font = "700 14px Nunito, sans-serif";
      ctx.fillText("ARIZONA FACT", W / 2, 370);
      ctx.fillStyle = "#fff6e5";
      ctx.font = "700 16px Nunito, sans-serif";
      wrapText(ctx, this.trivia, W / 2, 404, 720, 24);
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 20px Nunito, sans-serif";
      ctx.fillText("Press Space or Tap to ride again", W / 2, 560);
    }
  }

  function wrapText(c, text, x, y, max, lh) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (const w of words) {
      const test = line + w + " ";
      if (c.measureText(test).width > max) {
        c.fillText(line, x, yy);
        line = w + " ";
        yy += lh;
      } else line = test;
    }
    c.fillText(line, x, yy);
  }

  const game = new Game();

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.dpr = dpr;
  }

  window.addEventListener("resize", resize);
  resize();

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
      e.preventDefault();
      if (!game.keys.has(e.code)) game.jump();
      game.keys.add(e.code);
    }
    if (e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      if (game.state === "playing" || game.state === "paused") game.togglePause();
    }
  });
  window.addEventListener("keyup", (e) => game.keys.delete(e.code));

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (game.state === "paused") game.togglePause();
    else game.jump();
  });

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    game.sfx.ensure();
    game.sfx.setMuted(!game.sfx.muted);
    muteBtn.setAttribute("aria-pressed", String(game.sfx.muted));
    muteBtn.textContent = game.sfx.muted ? "♪ Sound off" : "♪ Sound on";
  });

  let last = performance.now();
  function loop(now) {
    const raw = (now - last) / 16.666;
    last = now;
    const dt = clamp(raw, 0, 2.2);
    game.update(dt);
    game.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
