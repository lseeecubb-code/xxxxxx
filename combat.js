// Real-time combat layer.
// It keeps the turn-based game's enemy roster, attack data, weapon skills, spells,
// ailments, weaknesses and cinematic scene registry, but runs continuously in the world.

const SPELLS = {
  "ember spark": { cost:2, element:"fire", damage:[10,16], effect:{type:"burn",chance:45,damage:3,turns:3} },
  frostbite: { cost:2, element:"frost", damage:[9,15], effect:{type:"slow",chance:55,turns:2} },
  mend: { cost:3, heal:[18,28] },
  ward: { cost:2, self:{type:"shield",absorb:18,turns:3} },
  "storm lash": { cost:4, element:"fire", damage:[18,28], effect:{type:"weakened",chance:40,turns:2} },
  restore: { cost:2, cure:true },
  "sun lance": { cost:3, element:"fire", damage:[17,25], effect:{type:"burn",chance:55,damage:4,turns:2} },
  "rime barrier": { cost:3, self:{type:"fortified",turns:3} },
  "verdant pulse": { cost:4, heal:[34,46], cure:true },
  "static bind": { cost:4, element:"lightning", damage:[20,29], effect:{type:"weakened",chance:50,turns:2} },
  "last stand": { cost:3, self:{type:"empowered",turns:2} },
};

function ensureCombatState() {
  const p = GAME.player;
  if (!p.cooldowns) p.cooldowns = {};
  if (!p.effects) p.effects = [];
  if (p.guardUntil == null) p.guardUntil = 0;
  if (p.shield == null) p.shield = 0;
}

function showScene(sceneKey, label = "") {
  const opening = GAME_SCENES.openings && GAME_SCENES.openings[sceneKey];
  const now = performance.now();
  GAME.scene = { key:sceneKey, label, until:now+1900, started:now };
  if (opening) {
    print("\n[" + (opening.title || "ENCOUNTER") + "]");
    for (const line of opening.lines || []) print(line);
  } else if (label) {
    print("\n[" + title(String(label)) + "]");
  }
  toastMsg(label || title(sceneKey));
}

function showAttackScene(sceneKey, monsterName, attackName) {
  const recipe = GAME_SCENES.attackVisuals && GAME_SCENES.attackVisuals[sceneKey];
  GAME.scene = {
    key: sceneKey,
    label: attackName,
    until: performance.now() + Math.max(900, recipe?.duration || 1500),
    started: performance.now(),
    recipe: recipe || null,
  };
  print("  ✦ " + title(monsterName) + " uses " + title(attackName) + " [" + sceneKey + "]");
}

function chooseEnemyAttack(enemy) {
  const m = monsters[enemy.name];
  const entries = Object.entries(m?.abilities || {});
  const candidates = entries.filter(([,a]) => !a.chance || Math.random() < Math.max(0.02, a.chance/100));
  if (!candidates.length) return { name:"basic attack", data:m?.basic_attack || {damage:[2,5]} };
  const [name,data] = choice(candidates);
  return { name, data };
}

function effectOn(target, effect) {
  if (!target || !effect) return;
  const turns = effect.turns || 2;
  const current = target.effects || (target.effects = []);
  const old = current.find((e) => e.type === effect.type);
  if (old) { old.turns = Math.max(old.turns, turns); old.damage = Math.max(old.damage || 0, effect.damage || 0); }
  else current.push({type:effect.type, turns, damage:effect.damage || 0});
}

function tickEffects(target, dt) {
  if (!target?.effects?.length) return;
  target.effectTick = (target.effectTick || 0) + dt;
  if (target.effectTick < 1) return;
  target.effectTick = 0;
  for (const e of target.effects) {
    if (e.damage && ["poison","burn","bleed"].includes(e.type)) {
      if (target === GAME.player) {
        target.hp = Math.max(0, target.hp - e.damage);
        GAME.particles.push({x:target.x,y:target.y-1.4,life:.55,text:"-" + e.damage,bad:true});
      } else hurtEnemy(target, e.damage, e.type);
    }
    e.turns--;
  }
  target.effects = target.effects.filter((e) => e.turns > 0);
}

function playerCanAct() {
  return GAME.player.hp > 0;
}

function getWeaponSkill(name) {
  const weapon = ITEMS[GAME.player.equipment.weapon];
  const skills = weapon?.skills || [];
  if (!skills.length || !SKILLS) return null;
  const id = name || skills[0];
  return SKILLS[id] ? { name:id, data:SKILLS[id] } : null;
}

function enemyAtCursor(radius = 0.9) {
  updateMouseWorld();
  let best = null, bestD = radius;
  for (const enemy of GAME.enemies) {
    if (enemy.hp <= 0) continue;
    const d = Math.hypot(GAME.mouse.worldX - enemy.x, GAME.mouse.worldY - (enemy.y - 0.6));
    if (d < bestD) { best = enemy; bestD = d; }
  }
  return best;
}

function selectTarget(target) {
  if (target) return target;
  return enemyAtCursor(1.0) || nearestEnemy(9);
}

function startCombat(name = "") {
  ensureWorld();
  ensureCombatState();
  let target = typeof name === "object" ? name : null;
  if (!target && name) {
    const wanted = findMonsterMatch(name);
    if (wanted) target = GAME.enemies.find((e) => e.name === wanted);
    if (!target && monsters[wanted]) {
      const x = clamp(Math.floor(GAME.player.x + 4), 2, WORLD_W-3);
      spawnEnemy(wanted, x, Math.max(1, findSurface(x)-0.01), true);
      target = GAME.enemies[GAME.enemies.length-1];
    }
  }
  if (!target) target = nearestEnemy(12);
  if (!target) {
    print("No enemy nearby.");
    return false;
  }
  GAME.combat = { targetId:target.id, active:true, lastAttack:null };
  GAME.discovered.add(target.name);
  const opening = getMonsterOpening(target.name);
  if (opening) {
    print("\n[" + (opening.title || "ENCOUNTER") + "]");
    for (const line of opening.lines || []) print(line);
    GAME.scene = {
      key: opening.scene || "opening",
      label: opening.title || target.displayName,
      until: performance.now() + 1500,
      started: performance.now(),
      recipe: GAME_SCENES.openingVisuals?.[opening.scene] || null
    };
  }
  if (opening?.scene && GAME_SCENES.openingVisuals?.[opening.scene]) {
    GAME.scene = {
      key:opening.scene,label:opening.title,until:performance.now()+1200,started:performance.now(),
      recipe:GAME_SCENES.openingVisuals[opening.scene]
    };
  }
  print("ENGAGED " + target.displayName + " · HP " + target.hp + "/" + target.maxHp);
  return true;
}

function combatTarget() {
  const id = GAME.combat?.targetId;
  if (id) {
    const found = GAME.enemies.find((e) => e.id === id && e.hp > 0);
    if (found) return found;
  }
  const target = nearestEnemy(8);
  if (target && GAME.combat) GAME.combat.targetId = target.id;
  return target;
}

function playerAttack(target = null) {
  ensureWorld();
  ensureCombatState();
  const p = GAME.player;
  if (!playerCanAct()) return false;
  const enemy = selectTarget(target || combatTarget());
  if (!enemy) { toastMsg("NO TARGET"); return false; }
  const ranged = /bow|staff|wand|scepter|rod/i.test(weapon);
  if (!ranged && distance(p, enemy) > 2.8 && target == null) { toastMsg("GET CLOSER"); return false; }
  const now = performance.now();
  if ((p.cooldownUntil || 0) > now) return false;
  const weapon = p.equipment.weapon || "wooden sword";
  const item = ITEMS[weapon] || {damage:3};
  const skill = GAME.player.nextSkill ? getWeaponSkill(GAME.player.nextSkill) : getWeaponSkill(item.skills?.[0]);
  const data = skill?.data || {damage_mult:1, type:"normal"};
  const base = rollDamage(C.PLAYER_DAMAGE) + Math.floor((getPlayerStats().damage + (item.damage || 0)) * 0.6);
  const mult = data.damage_mult || 1;
  let damage = Math.max(1, Math.round(base * mult));
  if (Math.random()*100 < (C.CRIT + getPlayerStats().crit + (data.crit_bonus || 0))) {
    damage = Math.round(damage * C.CRIT_MULT);
    print("CRITICAL!");
  }
  const weak = monsters[enemy.name]?.weak?.[data.element || ""] || 0;
  if (weak) damage = Math.round(damage * (1 + weak/100));
  if (ranged) {
    fireProjectile({
      x:p.x + (GAME.mouse.worldX-p.x)*0.08,
      y:p.y - 0.8,
      tx:GAME.mouse.worldX,
      ty:GAME.mouse.worldY,
      speed:18,
      damage,
      effect:data.effect || null,
      source:"player"
    });
  } else {
    hurtEnemy(enemy, damage, skill?.name || "basic attack", data.effect);
  }
  if (data.recoil) p.hp = Math.max(1, p.hp - data.recoil);
  p.energy = clamp(p.energy + 1, 0, p.maxEnergy);
  p.cooldownUntil = now + (data.cooldown ? data.cooldown*350 : data.type === "slow" ? 520 : 260);
  if (GAME.combat) GAME.combat.active = true;
  return true;
}

function useCombatItem(name) {
  const key = findItemMatch(name);
  if (!key || !USABLE_ITEMS[key]) {
    print("Unknown combat item: " + name);
    return false;
  }
  if (!removeItem(key, 1)) return false;
  const d = USABLE_ITEMS[key];
  const p = GAME.player;
  GAME.usedCombatItem = true;
  if (d.heal) p.hp = clamp(p.hp + d.heal, 0, p.maxHp);
  if (d.energy) p.energy = clamp(p.energy + d.energy, 0, p.maxEnergy);
  if (d.damage) { const enemy = combatTarget(); if (enemy) hurtEnemy(enemy, d.damage, key, d.effect); }
  if (d.effect && !d.damage) effectOn(p, d.effect);
  if (d.self?.type === "shield") p.shield = Math.max(p.shield, d.self.absorb || 12);
  toastMsg("USED " + title(key));
  return true;
}

function castPlayerSpell(name = "ember spark") {
  ensureCombatState();
  const key = String(name || "ember spark").trim().toLowerCase();
  const sp = SPELLS[key];
  if (!sp) { print("Unknown spell '" + key + "'."); return false; }
  if (GAME.player.energy < sp.cost) { toastMsg("NOT ENOUGH ENERGY"); return false; }
  GAME.player.energy -= sp.cost;
  const p = GAME.player;
  if (sp.heal) {
    const amount = rollDamage(sp.heal);
    p.hp = clamp(p.hp + amount, 0, p.maxHp);
    GAME.particles.push({x:p.x,y:p.y-1.4,life:.6,text:"+"+amount,bad:false});
    print("CAST " + title(key) + " · +" + amount + " HP");
    return true;
  }
  if (sp.self) {
    if (sp.self.type === "shield") p.shield = Math.max(p.shield, sp.self.absorb || 18);
    else effectOn(p, {type:sp.self.type,turns:sp.self.turns||2});
    print("CAST " + title(key));
    return true;
  }
  const enemy = combatTarget();
  if (!enemy) { p.energy += sp.cost; return false; }
  let damage = rollDamage(sp.damage);
  damage = Math.round(damage * (1 + Math.max(0,p.foc-5)*0.03));
  if (sp.element) {
    const weak = monsters[enemy.name]?.weak?.[sp.element] || 0;
    damage = Math.round(damage * (1 + weak/100));
  }
  fireProjectile({
    x:p.x, y:p.y-0.9, tx:GAME.mouse.worldX, ty:GAME.mouse.worldY,
    speed:20, damage, effect:sp.effect || null, source:"player", element:sp.element || null
  });
  print("CAST " + title(key) + " · " + damage + " damage");
  return true;
}

function monsterAttack(enemy) {
  const p = GAME.player;
  if (!enemy || enemy.hp <= 0 || p.hp <= 0) return;
  const {name, data} = chooseEnemyAttack(enemy);
  const move = makeAttack(name, data);
  const sceneKey = getAttackScene(enemy.name, name);
  if (sceneKey) showAttackScene(sceneKey, enemy.name, name);
  const now = performance.now();
  const dodgeChance = getPlayerStats().dodge + (p.guardUntil > now ? 25 : 0);
  if (move.dodgeable !== false && Math.random()*100 < Math.min(90, dodgeChance)) {
    print("DODGED " + title(enemy.name) + "'s " + title(name));
    return;
  }
  if (move.parryable !== false && GAME.player.parryUntil > now) {
    print("PARRIED " + title(name) + "!");
    if (GAME.combat) GAME.combat.lastAttack = "parry";
    return;
  }
  let amount = move.damage ? rollDamage(move.damage) : 0;
  if (enemy.elite) amount = Math.round(amount * 1.15);
  amount = Math.max(1, Math.round(amount - getPlayerStats().defense * 0.35));
  if (p.guardUntil > now && move.blockable !== false) amount = Math.round(amount * Math.max(0.1, 1-getPlayerStats().guard-0.45));
  if (p.shield > 0 && amount > 0) {
    const absorbed = Math.min(p.shield, amount);
    p.shield -= absorbed;
    amount -= absorbed;
  }
  if (amount > 0) p.hp = Math.max(0, p.hp - amount);
  GAME.particles.push({x:p.x,y:p.y-1.5,life:.55,text:"-"+amount,bad:true});
  if (move.special_effect && percent(move.special_effect.chance || 0)) effectOn(p, move.special_effect);
  if (move.heal) enemy.hp = Math.min(enemy.maxHp, enemy.hp + rollDamage(move.heal));
  if (p.hp <= 0) {
    print("YOU FALL.");
    p.hp = Math.max(1, Math.floor(p.maxHp * 0.3));
    p.x = clamp(p.x - 2,1,WORLD_W-2);
    p.y = findSurface(p.x)-0.01;
    GAME.combat = null;
    print("A strange autosave drags you back to the road.");
  }
}

function combatTick(dt) {
  ensureCombatState();
  if (GAME.player.cooldownUntil && performance.now() > GAME.player.cooldownUntil) GAME.player.cooldownUntil = 0;
  tickEffects(GAME.player, dt);
  for (const enemy of GAME.enemies) tickEffects(enemy, dt);
  if (GAME.combat?.active) {
    const enemy = combatTarget();
    if (!enemy) { GAME.combat = null; return; }
  }
  GAME.player.parryUntil = GAME.player.parryUntil || 0;
}

const oldUpdateGame = updateGame;
updateGame = function(time) {
  oldUpdateGame(time);
  const dt = Math.min(0.033, GAME.lastCombatTime ? (time-GAME.lastCombatTime)/1000 : 0.016);
  GAME.lastCombatTime = time;
  combatTick(dt);
  if (GAME.scene && time > GAME.scene.until) GAME.scene = null;
};

window.addEventListener("keydown", (event) => {
  if (document.activeElement === termInput) return;
  const k = event.key.toLowerCase();
  if (k === "e") playerAttack();
  if (k === "q") castPlayerSpell(GAME.player.spells?.[0] || "ember spark");
  if (k === "f") useCombatItem("potion");
  if (k === "shift") GAME.player.guardUntil = performance.now() + 500;
});

function combatCommandAction(action, arg) {
  if (action === "attack") return playerAttack();
  if (action === "spell") return castPlayerSpell(arg || "ember spark");
  if (action === "item") return useCombatItem(arg || "potion");
  if (action === "fight") return startCombat(arg || "");
  return false;
}


function fireProjectile({x,y,tx,ty,speed=18,damage=5,effect=null,source="player",element=null}) {
  GAME.projectiles ||= [];
  const dx = tx - x, dy = ty - y, len = Math.max(0.001, Math.hypot(dx,dy));
  GAME.projectiles.push({
    x,y,vx:dx/len*speed,vy:dy/len*speed,life:2.2,damage,effect,source,element,radius:0.18
  });
}

function updateProjectiles(dt) {
  if (!GAME.projectiles?.length) return;
  for (const pr of GAME.projectiles) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.x < 0 || pr.y < 0 || pr.x >= WORLD_W || pr.y >= WORLD_H) pr.life = 0;
    if (pr.source === "player") {
      for (const enemy of GAME.enemies) {
        if (enemy.hp <= 0) continue;
        if (Math.hypot(pr.x-enemy.x, pr.y-(enemy.y-0.6)) < 0.65) {
          hurtEnemy(enemy, pr.damage, "projectile", pr.effect);
          pr.life = 0;
          break;
        }
      }
    } else if (pr.source === "enemy") {
      const p = GAME.player;
      if (Math.hypot(pr.x-p.x, pr.y-(p.y-0.7)) < 0.7) {
        p.hp = Math.max(0, p.hp - pr.damage);
        p.effects ||= [];
        if (pr.effect) effectOn(p,pr.effect);
        pr.life = 0;
      }
    }
  }
  GAME.projectiles = GAME.projectiles.filter((p)=>p.life>0);
}

const previousDrawWorld = drawWorld;
drawWorld = function() {
  previousDrawWorld();
  const canvas = document.getElementById("world");
  const ctx = canvas.getContext("2d");
  if (!GAME.projectiles?.length) return;
  ctx.save();
  for (const pr of GAME.projectiles) {
    const px=(pr.x-GAME.camera.x)*TILE, py=(pr.y-GAME.camera.y)*TILE;
    ctx.fillStyle = pr.element === "fire" ? "#ff6b4a" : pr.element === "frost" ? "#bfe7ff" : pr.element === "lightning" ? "#e5d6ff" : "#f1ecfa";
    ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
};
