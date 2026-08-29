(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = 1280;
  const H = 720;
  const GROUND = 548;
  const PLAYER_X = 280;

  const BEST_KEY = "saguaroLeapBest";
  const MUTE_KEY = "saguaroLeapMute";

  const ui = {
    hud: document.getElementById("hud"),
    score: document.getElementById("score"),
    distance: document.getElementById("distance"),
    gems: document.getElementById("gems"),
    best: document.getElementById("best"),
    title: document.getElementById("titleScreen"),
    pause: document.getElementById("pauseScreen"),
    over: document.getElementById("overScreen"),
    overCause: document.getElementById("overCause"),
    overScore: document.getElementById("overScore"),
    overDistance: document.getElementById("overDistance"),
    overGems: document.getElementById("overGems"),
    newRecord: document.getElementById("newRecord"),
    muteBtn: document.getElementById("muteBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
  };

  const audio = createAudio();
  audio.muted = localStorage.getItem(MUTE_KEY) === "1";
  syncMuteButton();

  const input = {
    jumpHeld: false,
    jumpQueued: 0,
    ignorePointer: false,
  };

  const game = {
    state: "title",
    time: 0,
    last: 0,
    shake: 0,
    best: Number(localStorage.getItem(BEST_KEY) || 0),
  };

  ui.best.textContent = String(game.best);

  let world = createWorld();

  function createWorld() {
    return {
      distance: 0,
      score: 0,
      gems: 0,
      speed: 340,
      genX: 0,
      camX: 0,
      player: {
        x: 180,
        y: GROUND - 96,
        w: 46,
        h: 96,
        vx: 0,
        vy: 0,
        onGround: true,
        coyote: 0,
        jumpCut: false,
        facing: 1,
        squash: 1,
        hatBounce: 0,
        alive: true,
        cause: "",
      },
      platforms: [],
      hazards: [],
      pickups: [],
      particles: [],
      clouds: seedClouds(),
      mesas: seedMesas(),
      birds: [],
      wind: 0,
    };
  }

  function seedClouds() {
    return Array.from({ length: 8 }, (_, i) => ({
      x: i * 220 + Math.random() * 80,
      y: 50 + Math.random() * 140,
      w: 90 + Math.random() * 120,
      speed: 8 + Math.random() * 12,
    }));
  }

  function seedMesas() {
    return Array.from({ length: 10 }, (_, i) => ({
      x: i * 280 + Math.random() * 60,
      w: 140 + Math.random() * 180,
      h: 70 + Math.random() * 90,
      layer: i % 3,
    }));
  }

  function resetWorld() {
    world = createWorld();
    spawnStart();
    fillAhead();
  }

  function spawnStart() {
    world.platforms.push(makePlatform(0, GROUND, 720, "rim"));
    world.genX = 720;
  }

  function difficulty() {
    return Math.min(1, world.distance / 2800);
  }

  function fillAhead() {
    const d = difficulty();
    while (world.genX < world.camX + 1800) {
      const gap = 95 + d * 150 + Math.random() * (40 + d * 70);
      const width = Math.max(118, 270 - d * 120 + Math.random() * 90);
      const yJitter = Math.sin(world.genX * 0.004) * 36 + (Math.random() - 0.5) * 48;
      const y = clamp(GROUND + yJitter, 430, 590);
      const kind = Math.random() < 0.18 ? "mesa" : "rim";
      const plat = makePlatform(world.genX + gap, y, width, kind);
      world.platforms.push(plat);
      maybeSpawnHazards(plat, d);
      maybeSpawnPickups(plat, gap, d);
      world.genX = plat.x + plat.w;
    }
  }

  function makePlatform(x, y, w, kind) {
    return { x, y, w, h: 26, kind, strata: Math.floor(Math.random() * 4) };
  }

  function maybeSpawnHazards(plat, d) {
    if (plat.w < 150) return;
    const roll = Math.random();
    if (roll < 0.22 + d * 0.18) {
      world.hazards.push({
        type: "snake",
        x: plat.x + 40 + Math.random() * (plat.w - 90),
        y: plat.y,
        w: 46,
        h: 22,
        t: Math.random() * 10,
        plat,
      });
    } else if (roll < 0.34 + d * 0.22) {
      world.hazards.push({
        type: "tumbleweed",
        x: plat.x + plat.w - 20,
        y: plat.y,
        w: 34,
        h: 34,
        rot: 0,
        vx: -80 - d * 70 - Math.random() * 40,
        plat,
      });
    }
    if (Math.random() < 0.12 + d * 0.12) {
      world.hazards.push({
        type: "hawk",
        x: plat.x + 80,
        y: plat.y - 150 - Math.random() * 70,
        w: 54,
        h: 28,
        t: Math.random() * 6,
        baseY: plat.y - 150,
      });
    }
  }

  function maybeSpawnPickups(plat, gap, d) {
    const gems = 1 + (Math.random() < 0.35 ? 1 : 0);
    for (let i = 0; i < gems; i += 1) {
      const overGap = Math.random() < 0.45 && gap > 120;
      world.pickups.push({
        type: Math.random() < 0.18 ? "gold" : "turquoise",
        x: overGap
          ? plat.x - gap * (0.35 + Math.random() * 0.3)
          : plat.x + 24 + Math.random() * (plat.w - 48),
        y: overGap ? plat.y - 90 - Math.random() * 50 : plat.y - 58 - Math.random() * 36,
        grabbed: false,
        t: Math.random() * 5,
      });
    }
    if (Math.random() < 0.08 + d * 0.05) {
      world.pickups.push({
        type: "flower",
        x: plat.x + plat.w * 0.5,
        y: plat.y - 62,
        grabbed: false,
        t: 0,
      });
    }
  }

  function startGame() {
    resetWorld();
    game.state = "playing";
    game.shake = 0;
    show("hud");
    hide("title", "pause", "over");
    audio.unlock();
    audio.playStart();
  }

  function pauseGame() {
    if (game.state !== "playing") return;
    game.state = "paused";
    show("pause");
  }

  function resumeGame() {
    if (game.state !== "paused") return;
    game.state = "playing";
    hide("pause");
    game.last = performance.now();
  }

  function endGame(cause) {
    if (game.state !== "playing") return;
    world.player.alive = false;
    world.player.cause = cause;
    game.state = "over";
    game.shake = 14;
    audio.playDeath();
    burst(world.player.x + 20, world.player.y + 40, "#3d8a38", 22);
    burst(world.player.x + 20, world.player.y + 40, "#f3d5a5", 10);

    const isRecord = world.score > game.best;
    if (isRecord) {
      game.best = world.score;
      localStorage.setItem(BEST_KEY, String(game.best));
    }
    ui.overCause.textContent = cause;
    ui.overScore.textContent = String(world.score);
    ui.overDistance.textContent = formatDistance(world.distance);
    ui.overGems.textContent = String(world.gems);
    ui.newRecord.hidden = !isRecord;
    ui.best.textContent = String(game.best);
    hide("pause");
    show("over");
  }

  function show(...keys) {
    keys.forEach((k) => {
      const el = k === "hud" ? ui.hud : k === "title" ? ui.title : k === "pause" ? ui.pause : ui.over;
      el.hidden = false;
    });
  }

  function hide(...keys) {
    keys.forEach((k) => {
      const el = k === "hud" ? ui.hud : k === "title" ? ui.title : k === "pause" ? ui.pause : ui.over;
      el.hidden = true;
    });
  }

  function tryJump() {
    const p = world.player;
    if (!p.alive) return;
    if (p.onGround || p.coyote > 0) {
      p.vy = -820;
      p.onGround = false;
      p.coyote = 0;
      p.jumpCut = false;
      p.squash = 1.18;
      p.hatBounce = 1;
      audio.playJump();
      dust(p.x + 22, p.y + p.h, 8);
    } else {
      input.jumpQueued = 0.12;
    }
  }

  function update(dt) {
    game.time += dt;
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 28);

    world.clouds.forEach((c) => {
      c.x -= c.speed * dt;
      if (c.x < world.camX - 200) c.x = world.camX + W + Math.random() * 400;
    });

    if (Math.random() < dt * 0.4) {
      world.birds.push({
        x: world.camX + W + 40,
        y: 80 + Math.random() * 160,
        s: 70 + Math.random() * 50,
        t: Math.random() * 4,
      });
    }
    world.birds = world.birds.filter((b) => b.x > world.camX - 80);
    world.birds.forEach((b) => {
      b.x -= b.s * dt;
      b.t += dt;
    });

    if (game.state !== "playing") return;

    const d = difficulty();
    world.speed = 340 + d * 210;
    world.wind += dt;

    const p = world.player;
    p.x += world.speed * dt;
    world.distance = Math.max(world.distance, p.x - 180);
    world.score = Math.floor(world.distance * 0.4) + world.gems * 25;

    if (input.jumpQueued > 0) {
      input.jumpQueued -= dt;
      if (p.onGround || p.coyote > 0) tryJump();
    }

    if (!p.onGround) {
      p.vy += 2150 * dt;
      if (!input.jumpHeld && !p.jumpCut && p.vy < -120) {
        p.vy *= 0.45;
        p.jumpCut = true;
      }
      p.vy = Math.min(p.vy, 1500);
    }
    p.y += p.vy * dt;
    p.coyote = Math.max(0, p.coyote - dt);
    p.squash += (1 - p.squash) * Math.min(1, dt * 12);
    p.hatBounce += (0 - p.hatBounce) * Math.min(1, dt * 6);

    p.onGround = false;
    world.platforms.forEach((plat) => {
      const withinX = p.x + p.w > plat.x + 6 && p.x < plat.x + plat.w - 6;
      const feet = p.y + p.h;
      if (withinX && p.vy >= 0 && feet >= plat.y && feet <= plat.y + 28 && p.y < plat.y) {
        p.y = plat.y - p.h;
        p.vy = 0;
        if (!p.onGround) {
          p.squash = 0.82;
          dust(p.x + 22, plat.y, 6);
          audio.playLand();
        }
        p.onGround = true;
        p.coyote = 0.1;
      }
    });

    if (p.onGround && Math.random() < dt * 14) dust(p.x + 8, p.y + p.h, 1);

    world.hazards.forEach((h) => {
      h.t = (h.t || 0) + dt;
      if (h.type === "tumbleweed") {
        h.x += h.vx * dt;
        h.rot += dt * 8;
      }
      if (h.type === "hawk") {
        h.y = h.baseY + Math.sin(h.t * 3) * 28;
        h.x -= (40 + d * 40) * dt;
      }
      if (h.type === "snake") {
        h.x = h.plat.x + 36 + Math.sin(h.t * 2) * Math.min(40, h.plat.w * 0.2);
      }
      if (aabb(p, hitbox(h))) {
        const causes = {
          snake: "A rattlesnake said howdy!",
          hawk: "A canyon hawk claimed the air!",
          tumbleweed: "A tumbleweed bowled you over!",
        };
        endGame(causes[h.type] || "The desert won this round.");
      }
    });

    world.pickups.forEach((item) => {
      if (item.grabbed) return;
      item.t += dt;
      const box = { x: item.x - 16, y: item.y - 16, w: 32, h: 32 };
      if (aabb(p, box)) {
        item.grabbed = true;
        if (item.type === "gold") {
          world.score += 80;
          burst(item.x, item.y, "#f4d35e", 14);
        } else if (item.type === "flower") {
          world.score += 40;
          p.vy = Math.min(p.vy, -640);
          p.onGround = false;
          burst(item.x, item.y, "#ff7aa2", 16);
        } else {
          world.gems += 1;
          world.score += 25;
          burst(item.x, item.y, "#40c4b4", 14);
        }
        audio.playGem();
      }
    });

    if (p.y > H + 80) endGame("You tumbled into the Grand Canyon!");

    world.camX += (p.x - PLAYER_X - world.camX) * Math.min(1, dt * 8);
    fillAhead();
    cull();
    stepParticles(dt);
    paintHud();
  }

  function hitbox(h) {
    if (h.type === "hawk") return { x: h.x - 18, y: h.y - 10, w: 50, h: 22 };
    if (h.type === "tumbleweed") return { x: h.x - 14, y: h.y - 30, w: 28, h: 30 };
    return { x: h.x - 18, y: h.y - 20, w: 40, h: 20 };
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function cull() {
    const minX = world.camX - 400;
    world.platforms = world.platforms.filter((p) => p.x + p.w > minX);
    world.hazards = world.hazards.filter((h) => h.x > minX - 80);
    world.pickups = world.pickups.filter((p) => !p.grabbed && p.x > minX);
  }

  function dust(x, y, n) {
    for (let i = 0; i < n; i += 1) {
      world.particles.push({
        x,
        y,
        vx: -40 - Math.random() * 80,
        vy: -20 - Math.random() * 40,
        life: 0.35 + Math.random() * 0.25,
        max: 0.6,
        size: 2 + Math.random() * 3,
        color: "rgba(210,170,110,0.7)",
      });
    }
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 160;
      world.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.45 + Math.random() * 0.3,
        max: 0.75,
        size: 3 + Math.random() * 3,
        color,
      });
    }
  }

  function stepParticles(dt) {
    world.particles.forEach((pt) => {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 80 * dt;
    });
    world.particles = world.particles.filter((pt) => pt.life > 0);
  }

  function paintHud() {
    ui.score.textContent = String(world.score);
    ui.distance.textContent = formatDistance(world.distance);
    ui.gems.textContent = String(world.gems);
    ui.best.textContent = String(Math.max(game.best, world.score));
  }

  function formatDistance(px) {
    const yards = Math.floor(px / 8);
    if (yards >= 1760) return `${(yards / 1760).toFixed(2)} mi`;
    return `${yards} yd`;
  }

  function draw() {
    const t = game.time;
    const sunset = 0.25 + difficulty() * 0.75;
    ctx.save();
    if (game.shake) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }
    drawSky(sunset, t);
    drawFarCanyon();
    drawClouds();
    drawBirds();
    drawChasms();
    world.platforms.forEach(drawPlatform);
    world.pickups.forEach(drawPickup);
    world.hazards.forEach(drawHazard);
    if (world.player.alive || game.state === "over") drawCactus(world.player);
    drawParticles();
    drawForeground();
    ctx.restore();
    if (game.state === "title") drawTitleGlow(t);
  }

  function drawSky(sunset, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, lerpColor("#1b1147", "#2a0c28", sunset));
    g.addColorStop(0.35, lerpColor("#5b2a6e", "#c44536", sunset));
    g.addColorStop(0.62, lerpColor("#ee8a4c", "#ff6b35", sunset));
    g.addColorStop(1, lerpColor("#ffd166", "#f4a261", sunset));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const sunX = 980;
    const sunY = 90 + sunset * 70;
    const sg = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 180);
    sg.addColorStop(0, "rgba(255,244,180,0.95)");
    sg.addColorStop(0.3, "rgba(255,170,70,0.55)");
    sg.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe8a3";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 42 + Math.sin(t) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFarCanyon() {
    const cam = world.camX;
    const layers = [
      { color: "#6b2c22", par: 0.12, y: 310, h: 220 },
      { color: "#8a3a24", par: 0.22, y: 360, h: 250 },
      { color: "#a34728", par: 0.38, y: 410, h: 280 },
    ];
    layers.forEach((layer, li) => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      const shift = -((cam * layer.par) % 320);
      for (let x = -40; x <= W + 80; x += 40) {
        const n = Math.sin((x + cam * layer.par) * 0.01 + li) * 28 + Math.sin((x + cam) * 0.004) * 18;
        ctx.lineTo(x + shift, layer.y + n);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      world.mesas.forEach((m, i) => {
        if (i % 3 !== li) return;
        const x = ((m.x - cam * layer.par) % (W + 400)) - 80;
        ctx.fillStyle = shade(layer.color, -12);
        roundishMesa(x, layer.y - m.h * 0.25, m.w * (0.7 + li * 0.1), m.h * 0.55);
      });
    });

    const riverY = 640;
    ctx.fillStyle = "#1f6f73";
    ctx.beginPath();
    ctx.moveTo(0, riverY);
    for (let x = 0; x <= W; x += 20) {
      ctx.lineTo(x, riverY + Math.sin(x * 0.02 + cam * 0.01) * 4);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
    ctx.fillStyle = "rgba(80, 220, 200, 0.35)";
    ctx.fillRect(0, riverY + 6, W, 8);
  }

  function roundishMesa(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + 10, y + 16);
    ctx.lineTo(x + w * 0.2, y);
    ctx.lineTo(x + w * 0.8, y + 6);
    ctx.lineTo(x + w - 8, y + 20);
    ctx.lineTo(x + w + 6, y + h);
    ctx.closePath();
    ctx.fill();
  }

  function drawClouds() {
    ctx.fillStyle = "rgba(255, 230, 200, 0.28)";
    world.clouds.forEach((c) => {
      const x = c.x - world.camX * 0.2;
      cloud(x, c.y, c.w);
    });
  }

  function cloud(x, y, w) {
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.25, y - 8, w * 0.28, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x - w * 0.2, y - 4, w * 0.22, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBirds() {
    ctx.strokeStyle = "rgba(40, 18, 12, 0.55)";
    ctx.lineWidth = 2;
    world.birds.forEach((b) => {
      const x = b.x - world.camX * 0.35;
      const flap = Math.sin(b.t * 8) * 6;
      ctx.beginPath();
      ctx.moveTo(x - 10, b.y + flap);
      ctx.quadraticCurveTo(x, b.y - 4, x + 10, b.y + flap);
      ctx.stroke();
    });
  }

  function drawChasms() {
    const plats = world.platforms.slice().sort((a, b) => a.x - b.x);
    for (let i = 0; i < plats.length - 1; i += 1) {
      const a = plats[i];
      const b = plats[i + 1];
      const left = sx(a.x + a.w);
      const right = sx(b.x);
      if (right < -40 || left > W + 40 || right - left < 8) continue;
      drawGap(left, right, Math.min(a.y, b.y));
    }
    if (plats.length) {
      const last = plats[plats.length - 1];
      drawGap(sx(last.x + last.w), W + 40, last.y);
      const first = plats[0];
      if (sx(first.x) > 0) drawGap(-40, sx(first.x), first.y);
    }
  }

  function drawGap(left, right, rimY) {
    const mid = (left + right) / 2;
    ctx.beginPath();
    ctx.moveTo(left, rimY);
    ctx.lineTo(right, rimY);
    ctx.lineTo(right + 30, H);
    ctx.lineTo(left - 30, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, rimY, 0, H);
    g.addColorStop(0, "#9a4328");
    g.addColorStop(0.25, "#7a2f1c");
    g.addColorStop(0.5, "#5c2416");
    g.addColorStop(0.75, "#3a1a14");
    g.addColorStop(1, "#1c1010");
    ctx.fillStyle = g;
    ctx.fill();

    const bands = ["#c45c26", "#a34720", "#d4a574", "#6b2d1a", "#8b3a1f", "#3e2218"];
    bands.forEach((color, i) => {
      const y = rimY + 24 + i * 28;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(left - 20, y, right - left + 40, 10);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#2a9d8f";
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(mid, H - 28, Math.max(16, (right - left) * 0.18), 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawPlatform(plat) {
    const x = sx(plat.x);
    const y = plat.y;
    const w = plat.w;
    if (x > W + 40 || x + w < -40) return;

    ctx.fillStyle = "#6b2a16";
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + w + 6, y);
    ctx.lineTo(x + w - 10, H);
    ctx.lineTo(x + 12, H);
    ctx.fill();

    const bands = ["#b85a2a", "#8f3b1c", "#d9a066", "#5e2814"];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + 4, y + 18 + i * 16, w - 8, 8);
    });

    ctx.fillStyle = plat.kind === "mesa" ? "#e6c38a" : "#d7b07a";
    roundRect(x - 4, y - 8, w + 8, 18, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(x + 8, y - 4, w * 0.4, 3);

    if (plat.kind === "mesa") {
      ctx.fillStyle = "#2f7a32";
      for (let i = 0; i < 2; i += 1) {
        const cx = x + 20 + i * (w * 0.45);
        saguaroSilhouette(cx, y - 8, 0.35 + (i % 2) * 0.1);
      }
    }
  }

  function saguaroSilhouette(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillRect(-6, -50, 12, 50);
    ctx.fillRect(-18, -34, 12, 6);
    ctx.fillRect(-18, -34, 6, 16);
    ctx.fillRect(6, -28, 12, 6);
    ctx.fillRect(12, -28, 6, 14);
    ctx.restore();
  }

  function drawPickup(item) {
    if (item.grabbed) return;
    const x = sx(item.x);
    const y = item.y + Math.sin(item.t * 4) * 5;
    if (item.type === "turquoise") {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#2a9d8f";
      ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = "#7ee8dc";
      ctx.fillRect(-5, -5, 8, 8);
      ctx.restore();
    } else if (item.type === "gold") {
      ctx.fillStyle = "#f4d35e";
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff1b8";
      ctx.beginPath();
      ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ff7aa2";
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + item.t;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5, 3, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHazard(h) {
    const x = sx(h.x);
    if (h.type === "snake") {
      ctx.fillStyle = "#c9a227";
      ctx.beginPath();
      ctx.ellipse(x, h.y - 8, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5c4310";
      for (let i = -10; i <= 10; i += 6) ctx.fillRect(x + i, h.y - 12, 3, 3);
      ctx.fillStyle = "#2d5a27";
      ctx.beginPath();
      ctx.arc(x + 16, h.y - 16, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e23";
      ctx.fillRect(x + 20, h.y - 16, 8, 2);
      ctx.fillStyle = "#111";
      ctx.fillRect(x + 18, h.y - 18, 2, 2);
    } else if (h.type === "tumbleweed") {
      ctx.save();
      ctx.translate(x, h.y - 16);
      ctx.rotate(h.rot);
      ctx.strokeStyle = "#8a5a28";
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, 6 + (i % 3) * 4, i, i + 2.4);
        ctx.stroke();
      }
      ctx.restore();
    } else if (h.type === "hawk") {
      ctx.save();
      ctx.translate(x, h.y);
      ctx.fillStyle = "#5a3418";
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      const wing = Math.sin((h.t || 0) * 10) * 10;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-4, -18 + wing, 16, -4);
      ctx.quadraticCurveTo(0, -6, -6, 0);
      ctx.fill();
      ctx.fillStyle = "#c45c26";
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(28, 3);
      ctx.lineTo(20, 5);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCactus(p) {
    const x = sx(p.x) + p.w / 2;
    const y = p.y + p.h;
    const run = game.state === "playing" && p.onGround;
    const bob = run ? Math.sin(game.time * 14) * 3 : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(2 - p.squash, p.squash);

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2f7a32";
    roundRect(-16, -96 + bob, 32, 96, 16);
    ctx.fill();
    ctx.fillStyle = "#3d9a40";
    roundRect(-10, -90 + bob, 12, 86, 10);
    ctx.fill();

    ctx.fillStyle = "#2f7a32";
    const arm = Math.sin(game.time * (run ? 12 : 3)) * 4;
    roundRect(-34, -64 + arm, 20, 10, 5);
    ctx.fill();
    roundRect(-34, -64 + arm, 10, 28, 5);
    ctx.fill();
    roundRect(14, -52 - arm, 20, 10, 5);
    ctx.fill();
    roundRect(24, -52 - arm, 10, 24, 5);
    ctx.fill();

    ctx.strokeStyle = "rgba(220,255,210,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i += 1) {
      const yy = -18 - i * 12;
      ctx.beginPath();
      ctx.moveTo(-12, yy);
      ctx.lineTo(-20, yy - 4);
      ctx.moveTo(12, yy - 4);
      ctx.lineTo(20, yy - 8);
      ctx.stroke();
    }

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-6, -72 + bob, 4.5, 0, Math.PI * 2);
    ctx.arc(6, -72 + bob, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0b08";
    const glance = p.onGround ? 1.2 : 0;
    ctx.beginPath();
    ctx.arc(-5 + glance, -72 + bob, 2, 0, Math.PI * 2);
    ctx.arc(7 + glance, -72 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a0b08";
    ctx.beginPath();
    ctx.arc(0, -64 + bob, 5, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.fillStyle = "#6b3a12";
    ctx.beginPath();
    ctx.moveTo(-22, -96 + bob - p.hatBounce * 8);
    ctx.lineTo(22, -96 + bob - p.hatBounce * 8);
    ctx.lineTo(14, -112 + bob - p.hatBounce * 8);
    ctx.lineTo(-14, -112 + bob - p.hatBounce * 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8b5a2b";
    ctx.beginPath();
    ctx.ellipse(0, -96 + bob - p.hatBounce * 8, 26, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#40c4b4";
    ctx.fillRect(-8, -100 + bob - p.hatBounce * 8, 16, 3);

    ctx.restore();
  }

  function drawParticles() {
    world.particles.forEach((pt) => {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(sx(pt.x), pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawForeground() {
    ctx.fillStyle = "#4a1f12";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 30) {
      const y = H - 18 - Math.abs(Math.sin((x + world.camX) * 0.02)) * 16;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.fill();
  }

  function drawTitleGlow(t) {
    ctx.fillStyle = `rgba(255, 200, 120, ${0.04 + Math.sin(t * 2) * 0.02})`;
    ctx.fillRect(0, 0, W, H);
  }

  function sx(worldX) {
    return worldX - world.camX;
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function lerpColor(a, b, t) {
    const pa = hex(a);
    const pb = hex(b);
    const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
    const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
    const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }

  function hex(h) {
    const n = h.replace("#", "");
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  }

  function shade(color, amt) {
    const [r, g, b] = hex(color.length === 7 ? color : "#888888");
    return `rgb(${clamp(r + amt, 0, 255)},${clamp(g + amt, 0, 255)},${clamp(b + amt, 0, 255)})`;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - (game.last || now)) / 1000);
    game.last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function onJumpPress(fromPointer) {
    if (fromPointer && input.ignorePointer) return;
    if (game.state === "title") startGame();
    else if (game.state === "over") startGame();
    else if (game.state === "paused") resumeGame();
    else if (game.state === "playing") tryJump();
  }

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
      e.preventDefault();
      if (!e.repeat) {
        input.jumpHeld = true;
        onJumpPress(false);
      }
    }
    if (e.code === "KeyP" || e.code === "Escape") {
      if (game.state === "playing") pauseGame();
      else if (game.state === "paused") resumeGame();
    }
    if (e.code === "KeyM") toggleMute();
  });

  window.addEventListener("keyup", (e) => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) input.jumpHeld = false;
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (e.target.closest && e.target.closest("button")) return;
    input.jumpHeld = true;
    onJumpPress(true);
  });
  window.addEventListener("pointerup", () => {
    input.jumpHeld = false;
  });

  document.getElementById("playBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    startGame();
  });
  document.getElementById("retryBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    startGame();
  });
  document.getElementById("resumeBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    resumeGame();
  });
  ui.pauseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (game.state === "playing") pauseGame();
    else resumeGame();
  });
  ui.muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMute();
  });

  document.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("pointerdown", () => {
      input.ignorePointer = true;
    });
  });
  window.addEventListener("pointerup", () => {
    setTimeout(() => {
      input.ignorePointer = false;
    }, 50);
  });

  function toggleMute() {
    audio.muted = !audio.muted;
    localStorage.setItem(MUTE_KEY, audio.muted ? "1" : "0");
    syncMuteButton();
  }

  function syncMuteButton() {
    ui.muteBtn.textContent = audio.muted ? "×" : "♪";
    ui.muteBtn.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
  }

  window.addEventListener("resize", resize);
  resetWorld();
  world.camX = 0;
  resize();
  paintHud();
  requestAnimationFrame(loop);

  function createAudio() {
    const api = {
      ctx: null,
      muted: false,
      unlock() {
        if (!api.ctx) api.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (api.ctx.state === "suspended") api.ctx.resume();
      },
      tone(freq, dur, type, gain, slide) {
        if (api.muted || !api.ctx) return;
        const o = api.ctx.createOscillator();
        const g = api.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, api.ctx.currentTime);
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, api.ctx.currentTime + dur);
        g.gain.setValueAtTime(gain, api.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, api.ctx.currentTime + dur);
        o.connect(g);
        g.connect(api.ctx.destination);
        o.start();
        o.stop(api.ctx.currentTime + dur + 0.02);
      },
      playJump() {
        api.tone(420, 0.12, "square", 0.05, 680);
      },
      playLand() {
        api.tone(110, 0.08, "triangle", 0.04, 70);
      },
      playGem() {
        api.tone(660, 0.08, "sine", 0.05, 990);
        setTimeout(() => api.tone(880, 0.1, "sine", 0.04), 50);
      },
      playDeath() {
        api.tone(300, 0.35, "sawtooth", 0.06, 80);
      },
      playStart() {
        api.tone(392, 0.1, "triangle", 0.05, 523);
        setTimeout(() => api.tone(523, 0.12, "triangle", 0.05, 659), 90);
      },
    };
    return api;
  }
})();
