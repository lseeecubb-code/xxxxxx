// 2D sandbox world: procedural terrain, mining, building, movement, camera,
// simple enemy spawning, day/night, particles, and the world render loop.

let inputBound = false;

function noise2(x, y, seed) {
  let n = Math.sin((x * 127.1 + y * 311.7 + seed * 74.7)) * 43758.5453123;
  return n - Math.floor(n);
}

function createWorld() {
  const tiles = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill("air"));
  let surface = 34;
  for (let x = 0; x < WORLD_W; x++) {
    const wave = Math.sin(x / 13) * 2 + Math.sin(x / 31) * 4 + (noise2(x, 0, GAME.seed) - 0.5) * 5;
    surface = clamp(Math.floor(35 + wave), 25, 45);
    const zone = x < 50 ? "quiet" : x < 95 ? "frontier" : x < 125 ? "ash" : "void";
    for (let y = surface; y < WORLD_H; y++) {
      let block = "stone";
      if (y === surface) block = zone === "ash" ? "ash" : zone === "void" ? "stone" : "grass";
      else if (y < surface + 5) block = zone === "frontier" ? "dirt" : "dirt";
      if (zone === "quiet" && y >= surface && y <= surface + 2 && Math.sin(x / 9) > 0.55) block = "sand";
      if (zone === "frontier" && y > surface + 9 && y % 17 === 0) block = "iron";
      if (zone === "ash" && y > surface + 8 && x % 19 === 0) block = "crystal";
      if (zone === "void" && y > surface + 5 && x % 23 === 0) block = "obsidian";
      const cave = y > surface + 7 && y < WORLD_H - 5 && noise2(x * 1.7, y * 1.3, GAME.seed + 11) > 0.84;
      if (cave && y > surface + 4) block = "air";
      if (block === "stone" && noise2(x, y, GAME.seed + 4) > 0.965) block = "copper";
      if (block === "stone" && noise2(x, y, GAME.seed + 9) > 0.982) block = "silver";
      if (block === "stone" && noise2(x, y, GAME.seed + 21) > 0.994) block = "gold";
      tiles[y][x] = block;
    }
    for (let y = surface - 1; y > Math.max(3, surface - 4); y--) {
      if (noise2(x, y, GAME.seed + 5) > 0.68) tiles[y][x] = "air";
    }
  }
  // Spawn trees on the early surface.
  for (let x = 3; x < WORLD_W - 3; x += randint(5, 10)) {
    let surfaceY = -1;
    for (let y = 0; y < 55; y++) if (tiles[y][x] !== "air") { surfaceY = y; break; }
    if (surfaceY > 3 && tiles[surfaceY][x] === "grass") {
      const h = randint(3, 6);
      for (let y = surfaceY - h; y < surfaceY; y++) if (tiles[y]?.[x] === "air") tiles[y][x] = "wood";
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 0; dy++) {
        const yy = surfaceY - h + dy, xx = x + dx;
        if (tiles[yy]?.[xx] === "air" && Math.abs(dx) + Math.abs(dy) < 4) tiles[yy][xx] = "grass";
      }
    }
  }
  return tiles;
}

function zoneAtX(x) {
  if (x < 50) return { name:"The Quiet Road", biome:"quiet", enemies:["rat","slime","goblin","wolf","mossling","burrow rat"] };
  if (x < 95) return { name:"The Broken Frontier", biome:"frontier", enemies:["skeleton","zombie","bandit","orc","armored goblin","frontier marksman","harpy"] };
  if (x < 125) return { name:"The Cathedral of Ash", biome:"ash", enemies:["fire elemental","witch","mire witch","bellbound acolyte","bellbound cantor","ashbound sentinel"] };
  if (x < 150) return { name:"The Null Expanse", biome:"null", enemies:["wraith","null leech","ice golem","glasswing moth","index hound","the watcher"] };
  return { name:"The Hollow Kingdom", biome:"hollow", enemies:["hollow sentinel","troll","stone golem","lich","dragon","the author","the last save"] };
}

function playerSolidAt(x, y) {
  const left = Math.floor(x - GAME.player.width / 2);
  const right = Math.floor(x + GAME.player.width / 2);
  const top = Math.floor(y - GAME.player.height);
  const bottom = Math.floor(y);
  for (let ty = top; ty <= bottom; ty++) for (let tx = left; tx <= right; tx++) {
    if (ty < 0 || ty >= WORLD_H || tx < 0 || tx >= WORLD_W) return true;
    if (BLOCKS[GAME.world[ty][tx]]?.solid) return true;
  }
  return false;
}

function bindWorldInput() {
  if (inputBound) return;
  inputBound = true;
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    GAME.keys[key] = true;
    if (/^[1-9]$/.test(event.key)) {
      GAME.selectedHotbar = Number(event.key) - 1;
      const selected = HOTBAR[GAME.selectedHotbar];
      if (ITEMS[selected] && GAME.inventory[selected]) equipItem(selected);
      else toastMsg("HOTBAR " + event.key + " · " + selected.toUpperCase());
    }
    if (["arrowleft","arrowright","arrowup","arrowdown"," ","a","d","w","s"].includes(key) && document.activeElement !== termInput) {
      event.preventDefault();
    }
    if (key === "i" && document.activeElement !== termInput) {
      refreshInventory(); togglePanel(inventoryPanel, true); togglePanel(craftPanel, false);
    }
    if (key === "c" && document.activeElement !== termInput) {
      refreshCrafting(); togglePanel(craftPanel, true); togglePanel(inventoryPanel, false);
    }
    if (key === "e" && document.activeElement !== termInput) playerAttack();
    if (key === "q" && document.activeElement !== termInput) castPlayerSpell("ember spark");
  });
  window.addEventListener("keyup", (event) => {
    GAME.keys[event.key.toLowerCase()] = false;
  });
  const canvas = document.getElementById("world");
  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    GAME.mouse.x = event.clientX - rect.left;
    GAME.mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener("mousedown", (event) => {
    event.preventDefault();
    if (event.button === 0) GAME.mouse.down = true;
    if (event.button === 2) GAME.mouse.rightDown = true;
  });
  canvas.addEventListener("mouseup", (event) => {
    if (event.button === 0) GAME.mouse.down = false;
    if (event.button === 2) GAME.mouse.rightDown = false;
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
}

function ensureWorld() {
  if (GAME.world) return;
  GAME.world = createWorld();
  GAME.worldGenComplete = true;
  bindWorldInput();
}

function spawnEnemy(name, x, y, elite = false) {
  if (!monsters[name] || GAME.enemies.length >= 26) return;
  const m = monsters[name];
  const scale = 1 + Math.max(0, GAME.player.level - (m.level || 1)) * 0.06;
  GAME.enemies.push({
    id: Math.random().toString(36).slice(2),
    name,
    displayName: elite ? "elite " + title(name) : title(name),
    x, y, vx: 0, vy: 0,
    radius: 0.42,
    hp: Math.max(1, Math.round(m.hp * scale * (elite ? 1.35 : 1))),
    maxHp: Math.max(1, Math.round(m.hp * scale * (elite ? 1.35 : 1))),
    elite: !!elite,
    aiTime: random(0.2, 2),
    attackCd: random(0.2, 1.5),
    effects: [],
    scene: null,
  });
}

function findSurface(x) {
  const tx = clamp(Math.floor(x), 1, WORLD_W - 2);
  for (let y = 1; y < WORLD_H; y++) if (BLOCKS[GAME.world[y][tx]]?.solid) return y;
  return 20;
}

function spawnAmbientEnemy() {
  const zone = zoneAtX(GAME.player.x);
  if (GAME.enemies.length >= 12) return;
  const name = choice(zone.enemies.filter((n) => monsters[n]));
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = clamp(Math.floor(GAME.player.x + side * random(8, 15)), 2, WORLD_W - 3);
  const surface = findSurface(x);
  if (surface < 3) return;
  spawnEnemy(name, x, surface - 0.01, Math.random() < 0.08);
}

function nearestEnemy(radius = 6) {
  let best = null, bestD = radius;
  for (const e of GAME.enemies) {
    if (e.hp <= 0) continue;
    const d = distance(GAME.player, e);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function nearestEnemyName() {
  const e = nearestEnemy(30);
  return e ? e.name : "slime";
}

function tileUnderCursor() {
  const tx = Math.floor(GAME.mouse.worldX);
  const ty = Math.floor(GAME.mouse.worldY);
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return null;
  return { tx, ty, block: GAME.world[ty][tx] };
}

function updateMouseWorld() {
  const c = document.getElementById("world");
  GAME.mouse.worldX = GAME.camera.x + GAME.mouse.x / TILE;
  GAME.mouse.worldY = GAME.camera.y + GAME.mouse.y / TILE;
}

function mineTarget() {
  const target = tileUnderCursor() || { tx:Math.floor(GAME.player.x), ty:Math.floor(GAME.player.y + 1), block:GAME.world[Math.floor(GAME.player.y+1)][Math.floor(GAME.player.x)] };
  const d = Math.hypot(target.tx + 0.5 - GAME.player.x, target.ty + 0.5 - (GAME.player.y - 0.6));
  if (d > 6) { toastMsg("TOO FAR"); return false; }
  if (!BLOCKS[target.block]?.solid) return false;
  GAME.world[target.ty][target.tx] = "air";
  const drop = BLOCKS[target.block].drop;
  if (drop && drop !== "sand" && drop !== "snow" && drop !== "ash") addItem(drop, 1, true);
  GAME.particles.push({ x:target.tx+0.5, y:target.ty+0.5, life:0.5, text:"+" + (drop || target.block) });
  toastMsg("MINED " + target.block.toUpperCase());
  return true;
}

function mineOrAttackAtCursor() {
  updateMouseWorld();
  const selected = HOTBAR[GAME.selectedHotbar];
  if (USABLE_ITEMS[selected]) {
    useCombatItem(selected);
    return;
  }
  if (ITEMS[selected]) {
    playerAttack(enemyAtCursor(1.05) || null);
    return;
  }
  const enemy = GAME.enemies.find((e) => {
    const dx = GAME.mouse.worldX - e.x, dy = GAME.mouse.worldY - (e.y - 0.6);
    return Math.hypot(dx,dy) < 0.8;
  });
  if (enemy) {
    playerAttack(enemy);
    return;
  }
  mineTarget();
}

function placeBlock(name) {
  const allowed = new Set(["dirt","stone","sand","wood","copper","iron","silver","gold","obsidian","crystal"]);
  const block = allowed.has(name) ? name : "dirt";
  const target = tileUnderCursor() || { tx:Math.floor(GAME.player.x + 1), ty:Math.floor(GAME.player.y), block:"air" };
  const d = Math.hypot(target.tx + 0.5 - GAME.player.x, target.ty + 0.5 - (GAME.player.y - 0.6));
  if (d > 6 || BLOCKS[target.block]?.solid) return false;
  if (!removeItem(block, 1)) return false;
  GAME.world[target.ty][target.tx] = block;
  toastMsg("PLACED " + block.toUpperCase());
  return true;
}

function placeAtCursor() {
  updateMouseWorld();
  const blockItem = HOTBAR[GAME.selectedHotbar];
  if (BLOCKS[blockItem]?.solid) placeBlock(blockItem);
  else if (blockItem === "torch") placeBlock("wood");
  else placeBlock("dirt");
}

function hurtEnemy(enemy, amount, source = "attack", effect = null) {
  if (!enemy || enemy.hp <= 0) return;
  enemy.hp = Math.max(0, enemy.hp - Math.max(1, Math.round(amount)));
  GAME.particles.push({ x:enemy.x, y:enemy.y - 0.8, life:0.7, text:"-" + Math.round(amount), bad:false });
  if (effect && percent(effect.chance || 0)) enemy.effects.push({ type:effect.type, turns:effect.turns || 2, damage:effect.damage || 0 });
  if (enemy.hp <= 0) {
    addItem("coin", randint(3, 12), true);
    const m = monsters[enemy.name];
    if (m?.drops) {
      for (const [item, data] of Object.entries(m.drops)) {
        if (percent(data.chance || 0)) addItem(item, randint(data.min_drop || 1, data.max_drop || 1), true);
      }
    }
    giveXp(Math.max(10, Math.floor((m?.hp || 20) * (enemy.elite ? 1.6 : 0.65))));
    GAME.discovered.add(enemy.name);
    GAME.enemies = GAME.enemies.filter((e) => e !== enemy);
    GAME.flags.totalKills = (GAME.flags.totalKills || 0) + 1;
    recordQuestKill(enemy.name);
    storyOnKill(enemy.name);
    checkProgressionAchievements();
    print("DEFEATED " + enemy.displayName + ".");
  }
}

function updateEnemy(enemy, dt) {
  if (enemy.hp <= 0) return;
  const p = GAME.player;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  enemy.aiTime -= dt;
  enemy.attackCd -= dt;
  if (Math.abs(dx) < 10) {
    enemy.vx += Math.sign(dx) * dt * 2.2;
    enemy.vx = clamp(enemy.vx, -2, 2);
  } else enemy.vx *= 0.92;
  enemy.vy += 12 * dt;
  const nextX = enemy.x + enemy.vx * dt;
  if (!solidAtEntity(nextX, enemy.y, 0.36, 1.2)) enemy.x = nextX; else enemy.vx *= -0.45;
  const nextY = enemy.y + enemy.vy * dt;
  if (!solidAtEntity(enemy.x, nextY, 0.36, 1.2)) enemy.y = nextY; else {
    if (enemy.vy > 0) enemy.y = Math.floor(enemy.y) + 0.001;
    enemy.vy = 0;
  }
  if (enemy.attackCd <= 0 && distance(enemy, p) < 1.25) {
    enemy.attackCd = random(0.9, 1.8);
    monsterAttack(enemy);
  }
}

function solidAtEntity(x, y, halfWidth, height) {
  const left = Math.floor(x - halfWidth), right = Math.floor(x + halfWidth);
  const top = Math.floor(y - height), bottom = Math.floor(y);
  for (let ty=top;ty<=bottom;ty++) for (let tx=left;tx<=right;tx++) {
    if (ty<0 || ty>=WORLD_H || tx<0 || tx>=WORLD_W) return true;
    if (BLOCKS[GAME.world[ty][tx]]?.solid) return true;
  }
  return false;
}

function updatePlayer(dt) {
  const p = GAME.player;
  const active = document.activeElement !== termInput;
  const left = active && (GAME.keys.a || GAME.keys.arrowleft);
  const right = active && (GAME.keys.d || GAME.keys.arrowright);
  const jump = active && (GAME.keys.w || GAME.keys.arrowup || GAME.keys[" "]);
  const accel = 14;
  if (left) p.vx -= accel * dt;
  if (right) p.vx += accel * dt;
  if (!left && !right) p.vx *= Math.pow(0.02, dt);
  p.vx = clamp(p.vx, -5, 5);
  if (jump && Math.abs(p.vy) < 0.1 && solidAtEntity(p.x, p.y + 0.08, 0.28, 1.4)) p.vy = -6.8;
  p.vy += 15 * dt;
  const nx = p.x + p.vx * dt;
  if (!solidAtEntity(nx, p.y, 0.28, 1.4)) p.x = clamp(nx, 1, WORLD_W-2); else p.vx *= -0.15;
  const ny = p.y + p.vy * dt;
  if (!solidAtEntity(p.x, ny, 0.28, 1.4)) p.y = ny; else {
    if (p.vy > 0) p.y = Math.floor(p.y) + 0.001;
    p.vy = 0;
  }
  if (p.y > WORLD_H + 2) {
    p.y = findSurface(p.x) - 0.02;
    p.hp = Math.max(1, p.hp - 15);
  }
}

function exploreArea() {
  ensureWorld();
  const zone = zoneAtX(GAME.player.x);
  print("EXPLORE · " + zone.name);
  print("Biome: " + zone.biome + " · Nearby enemies: " + zone.enemies.filter((n) => monsters[n]).map(title).join(", "));
  for (let i = 0; i < 2; i++) {
    const choices = zone.enemies.filter((n) => monsters[n]);
    if (!choices.length) break;
    const name = choice(choices);
    const x = clamp(Math.floor(GAME.player.x + random(-7, 9)), 2, WORLD_W - 3);
    spawnEnemy(name, x, Math.max(1, findSurface(x) - 0.01), Math.random() < 0.05);
  }
  GAME.discovered.add(zone.name);
  toastMsg("AREA DISCOVERED · " + zone.name.toUpperCase());
}

function updateGame(time) {
  ensureWorld();
  const dt = Math.min(0.033, GAME.lastTime ? (time - GAME.lastTime) / 1000 : 0.016);
  GAME.lastTime = time;
  GAME.time += dt * 4.2;
  updateMouseWorld();
  updatePlayer(dt);
  if (GAME.mouse.down) {
    GAME.useHeldUntil = GAME.useHeldUntil || 0;
    if (performance.now() >= GAME.useHeldUntil) {
      mineOrAttackAtCursor();
      GAME.useHeldUntil = performance.now() + 145;
    }
  } else {
    GAME.useHeldUntil = 0;
  }
  if (GAME.mouse.rightDown) {
    GAME.placeUntil = GAME.placeUntil || 0;
    if (performance.now() >= GAME.placeUntil) {
      placeAtCursor();
      GAME.placeUntil = performance.now() + 110;
    }
  } else {
    GAME.placeUntil = 0;
  }
  for (const e of GAME.enemies) updateEnemy(e, dt);
  updateProjectiles(dt);
  GAME.enemies = GAME.enemies.filter((e) => e.hp > 0);
  GAME.spawnCooldown -= dt;
  if (GAME.spawnCooldown <= 0) {
    GAME.spawnCooldown = random(1.5, 3.5);
    if (Math.random() < 0.8) spawnAmbientEnemy();
  }
  for (const particle of GAME.particles) {
    particle.life -= dt;
    particle.y -= dt * 0.4;
  }
  GAME.particles = GAME.particles.filter((p) => p.life > 0);
  const zone = zoneAtX(GAME.player.x);
  GAME.currentZone = zone.name;
  const targetCamX = GAME.player.x - GAME.render.width / TILE / 2;
  const targetCamY = GAME.player.y - GAME.render.height / TILE * 0.42;
  GAME.camera.x += (targetCamX - GAME.camera.x) * Math.min(1, dt * 6);
  GAME.camera.y += (targetCamY - GAME.camera.y) * Math.min(1, dt * 6);
  GAME.camera.x = clamp(GAME.camera.x, 0, WORLD_W - GAME.render.width/TILE);
  GAME.camera.y = clamp(GAME.camera.y, 0, WORLD_H - GAME.render.height/TILE);
  GAME.saveTick += dt;
  if (GAME.saveTick > 7) { saveGame(true); GAME.saveTick = 0; }
}

function drawWorld() {
  ensureWorld();
  const canvas = document.getElementById("world");
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.setTransform(GAME.render.dpr, 0, 0, GAME.render.dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const zone = zoneAtX(GAME.player.x);
  const daylight = (Math.sin((GAME.time / 1440) * Math.PI * 2 - Math.PI/2) + 1) / 2;
  ctx.fillStyle = zone.biome === "ash" ? "#130d0d" : zone.biome === "void" ? "#05030a" : "#050a10";
  ctx.fillRect(0, 0, w, h);
  const stars = 80;
  ctx.fillStyle = "#ffffff99";
  for (let i=0;i<stars;i++) {
    const sx = (i * 83 % Math.max(1,w));
    const sy = (i * 41 % Math.max(1,h*0.48));
    if (daylight < 0.48) ctx.fillRect(sx, sy, 1, 1);
  }
  const viewW = Math.ceil(w/TILE)+2, viewH=Math.ceil(h/TILE)+2;
  const startX=Math.floor(GAME.camera.x), startY=Math.floor(GAME.camera.y);
  for (let y=0;y<viewH;y++) for (let x=0;x<viewW;x++) {
    const tx=startX+x, ty=startY+y;
    if (!GAME.world[ty]?.[tx]) continue;
    const b=GAME.world[ty][tx];
    if (b==="air") continue;
    const def=BLOCKS[b] || BLOCKS.stone;
    const px=(tx-GAME.camera.x)*TILE, py=(ty-GAME.camera.y)*TILE;
    ctx.fillStyle=def.color;
    ctx.fillRect(px, py, TILE+1, TILE+1);
    if (b!=="dirt" && b!=="stone") {
      ctx.fillStyle="#00000022"; ctx.fillRect(px,py+TILE-5,TILE+1,5);
    }
    if (b==="crystal") { ctx.fillStyle="#e8e0ff99"; ctx.fillRect(px+8,py+7,5,16); }
    if (b==="gold") { ctx.fillStyle="#fff1c488"; ctx.fillRect(px+5,py+6,4,4); ctx.fillRect(px+18,py+17,4,4); }
  }
  if (GAME.mouse.worldX >= 0 && GAME.mouse.worldY >= 0) {
    const mx = (GAME.mouse.worldX - GAME.camera.x) * TILE;
    const my = (GAME.mouse.worldY - GAME.camera.y) * TILE;
    ctx.strokeStyle = "#ffffff88";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 6, my - 6, 12, 12);
  }
  for (const d of GAME.drops) {
    const px=(d.x-GAME.camera.x)*TILE, py=(d.y-GAME.camera.y)*TILE;
    ctx.fillStyle="#e9cf86"; ctx.fillRect(px-3,py-3,6,6);
  }
  for (const e of GAME.enemies) {
    const px=(e.x-GAME.camera.x)*TILE, py=(e.y-GAME.camera.y)*TILE;
    ctx.fillStyle=e.elite ? "#ffd66b" : "#c94358";
    ctx.fillRect(px-12, py-28, 24, 28);
    ctx.fillStyle="#000";
    ctx.fillRect(px-8,py-20,5,5); ctx.fillRect(px+3,py-20,5,5);
    ctx.fillStyle="#ff6b7e"; ctx.fillRect(px-15,py-34,30,3);
    ctx.fillStyle="#7ee0b0"; ctx.fillRect(px-15,py-34,30*(e.hp/e.maxHp),3);
    ctx.font="16px ui-monospace"; ctx.textAlign="center"; ctx.fillStyle="#f1ecfa";
    ctx.fillText(monsters[e.name]?.icon || "?", px, py-38);
  }
  const p=GAME.player;
  const px=(p.x-GAME.camera.x)*TILE, py=(p.y-GAME.camera.y)*TILE;
  const aimX = GAME.mouse.worldX - p.x, aimY = GAME.mouse.worldY - (p.y - 0.8);
  const facing = Math.sign(aimX || 1);
  ctx.save();
  ctx.translate(px,py);
  ctx.scale(facing,1);
  ctx.fillStyle="#e9cf86"; ctx.fillRect(-10,-44,20,44);
  ctx.fillStyle="#f1ecfa"; ctx.fillRect(px-8,py-52,16,12);
  ctx.fillStyle="#050505"; ctx.fillRect(-5,-49,3,3); ctx.fillRect(2,-49,3,3);
  ctx.strokeStyle="#e9cf86"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(8,-28); ctx.lineTo(24,-22); ctx.stroke();
  ctx.restore();
  if (GAME.scene) {
    const left = Math.max(0, GAME.scene.until - performance.now());
    const total = Math.max(1, GAME.scene.until - GAME.scene.started);
    const progress = clamp(left / total, 0, 1);
    const key = String(GAME.scene.key || "").toLowerCase();
    const hue = key.includes("fire") || key.includes("ember") || key.includes("hell") ? "#ff6b4a" :
      key.includes("frost") || key.includes("white") ? "#bfe7ff" :
      key.includes("redline") ? "#ff3838" : "#d5c8ff";
    ctx.fillStyle = "#000";
    ctx.globalAlpha = Math.min(0.72, 0.28 + progress * 0.42);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = Math.min(1, progress * 1.2);
    ctx.strokeStyle = hue;
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.font = "700 18px ui-monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = hue;
    ctx.fillText(String(GAME.scene.label || GAME.scene.key || "SCENE").toUpperCase(), w / 2, h * 0.30);
    const glyphs = GAME.scene.recipe?.glyphs || ["◆", "▣", "✦", "//", "ERR"];
    for (let i = 0; i < Math.min(18, glyphs.length * 4); i++) {
      const gx = (i * 137) % Math.max(1, w);
      const gy = h * 0.45 + ((i * 71) % Math.max(1, h * 0.42));
      ctx.globalAlpha = 0.18 + ((Math.sin(performance.now() / 200 + i) + 1) / 4) * progress;
      ctx.fillText(glyphs[i % glyphs.length], gx, gy);
    }
    ctx.globalAlpha = 1;
  }
  for (const part of GAME.particles) {
    ctx.globalAlpha=Math.max(0,part.life/0.7);
    ctx.fillStyle=part.bad ? "#ff6b7e" : "#e9cf86";
    ctx.font="12px ui-monospace"; ctx.textAlign="center";
    ctx.fillText(part.text, (part.x-GAME.camera.x)*TILE, (part.y-GAME.camera.y)*TILE);
    ctx.globalAlpha=1;
  }
  // Minimal hotbar.
  const slotW=44, baseX=Math.floor((w-(HOTBAR.length*slotW))/2), baseY=h-54;
  for (let i=0;i<HOTBAR.length;i++) {
    ctx.fillStyle=i===GAME.selectedHotbar ? "#2d263f" : "#060606dd";
    ctx.strokeStyle=i===GAME.selectedHotbar ? "#e9cf86" : "#1c1730";
    ctx.fillRect(baseX+i*slotW,baseY,40,40); ctx.strokeRect(baseX+i*slotW,baseY,40,40);
    ctx.font="10px ui-monospace"; ctx.textAlign="left"; ctx.fillStyle="#7e7691"; ctx.fillText(String(i+1),baseX+i*slotW+3,baseY+10);
    ctx.textAlign="center"; ctx.fillStyle="#d7d1e1"; ctx.font="15px ui-monospace";
    ctx.fillText((ITEMS[HOTBAR[i]]?.id==="weapon"?"⚔":BLOCKS[HOTBAR[i]]?.solid?"■":USABLE_ITEMS[HOTBAR[i]]?"✚":"·"),baseX+i*slotW+20,baseY+27);
  }
}
