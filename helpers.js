// Shared runtime helpers. This mirrors THE LAST SAVE's small global-helper style,
// while the new game uses a canvas world instead of a terminal-only renderer.

const GAME_VERSION = "0.1.0";
const TILE = 32;
const WORLD_W = 180;
const WORLD_H = 100;

const BLOCKS = {
  air: { solid: false, color: "#00000000" },
  grass: { solid: true, color: "#3d7b42", drop: "wood" },
  dirt: { solid: true, color: "#6d4c41", drop: "dirt" },
  stone: { solid: true, color: "#66616f", drop: "stone" },
  sand: { solid: true, color: "#b39a62", drop: "sand" },
  snow: { solid: true, color: "#c7d8df", drop: "snow" },
  ash: { solid: true, color: "#5a4a51", drop: "ash" },
  wood: { solid: true, color: "#6b4327", drop: "wood" },
  crystal: { solid: true, color: "#8d73d8", drop: "crystal" },
  copper: { solid: true, color: "#a7664a", drop: "copper ore" },
  iron: { solid: true, color: "#898b91", drop: "iron" },
  silver: { solid: true, color: "#c0c8d1", drop: "silver ore" },
  gold: { solid: true, color: "#d6b84c", drop: "gold ore" },
  obsidian: { solid: true, color: "#272033", drop: "obsidian" },
};

const START_INV = { coin: 100, wood: 35, stone: 20, iron: 8, potion: 2 };
const HOTBAR = ["wooden sword", "stone", "dirt", "wood", "torch", "potion", "bomb", "ember spark", "frostbite"];

const percent = (chance) => (Math.random() * 100) < chance;
const random = (a = 0, b = 1) => a + Math.random() * (b - a);
const randint = (a, b) => Math.floor(random(a, b + 1));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const title = (s) => String(s).replace(/\b[a-z]/gi, (c) => c.toUpperCase());

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function itemCategory(name) {
  if (ITEMS[name]) {
    const id = ITEMS[name].id;
    return ({ weapon:"Weapons", armor:"Armor", offhand:"Shields", head:"Headgear", feet:"Footwear", trinket:"Trinkets" })[id] || "Gear";
  }
  if (USABLE_ITEMS[name]) return "Consumables";
  return "Materials";
}

function describeBuffs(name) {
  const d = ITEMS[name] || {};
  const out = [];
  if (d.damage) out.push("+" + d.damage + " damage");
  if (d.max_hp) out.push((d.max_hp > 0 ? "+" : "") + d.max_hp + " max HP");
  if (d.defense) out.push("+" + d.defense + " defense");
  if (d.guard) out.push("+" + Math.round(d.guard * 100) + "% guard");
  if (d.parry) out.push("+" + d.parry + "% parry");
  if (d.dodge) out.push("+" + d.dodge + "% dodge");
  if (d.crit) out.push("+" + d.crit + "% crit");
  return out.join(", ");
}

function describeUsable(name) {
  const d = USABLE_ITEMS[name] || {};
  const out = [];
  if (d.heal) out.push("heals " + (d.heal >= 999 ? "to full" : d.heal + " HP"));
  if (d.energy) out.push("restores " + d.energy + " energy");
  if (d.damage) out.push("deals " + d.damage + " damage");
  if (d.effect) out.push("may inflict " + d.effect.type);
  if (d.stun) out.push("stuns");
  if (d.cure) out.push("cleanses");
  return out.join(", ");
}

function addItem(name, amount = 1, quiet = false) {
  if (!amount) return;
  GAME.inventory[name] = (GAME.inventory[name] || 0) + amount;
  if (!quiet) print("Obtained <" + title(name) + "> (" + amount + "x)");
}

function removeItem(name, amount = 1) {
  const have = GAME.inventory[name] || 0;
  if (have < amount) {
    print("Not enough " + name + ".");
    return false;
  }
  GAME.inventory[name] = have - amount;
  if (!GAME.inventory[name]) delete GAME.inventory[name];
  return true;
}

function rollDamage(range) {
  if (!Array.isArray(range) || range.length < 2) return 1;
  return randint(Math.max(1, range[0]), Math.max(1, range[1]));
}

function getPlayerStats() {
  const p = GAME.player;
  const slots = ["weapon","offhand","head","armor","feet","trinket"];
  const s = { damage: 0, maxHp: 100 + (p.vit - 5) * 4, defense: 0, guard: 0, parry: 0, dodge: 0, crit: 0, maxEnergy: 6 };
  for (const slot of slots) {
    const name = p.equipment[slot];
    if (!name || !ITEMS[name]) continue;
    const d = ITEMS[name];
    s.damage += d.damage || 0;
    s.maxHp += d.max_hp || 0;
    s.defense += d.defense || 0;
    s.guard += d.guard || 0;
    s.parry += d.parry || 0;
    s.dodge += d.dodge || 0;
    s.crit += d.crit || 0;
    s.maxEnergy += d.max_energy || 0;
  }
  s.damage += Math.floor(Math.max(0, p.str - 5) / 2);
  s.dodge += Math.floor(Math.max(0, p.agi - 5) / 2);
  s.parry += Math.floor(Math.max(0, p.agi - 5) / 2);
  s.maxHp += Math.max(0, p.vit - 5) * 3;
  s.maxEnergy += Math.floor(Math.max(0, p.foc - 5) / 4);
  return s;
}

function recalcPlayer() {
  const p = GAME.player;
  const old = p.maxHp || 100;
  const stats = getPlayerStats();
  p.maxHp = Math.max(20, stats.maxHp);
  p.maxEnergy = Math.max(2, stats.maxEnergy);
  p.hp = clamp(p.hp + (p.maxHp - old), 0, p.maxHp);
  p.energy = clamp(p.energy, 0, p.maxEnergy);
}

function giveXp(amount) {
  const p = GAME.player;
  p.xp += Math.max(0, Math.floor(amount));
  while (p.xp >= p.level * 100) {
    p.xp -= p.level * 100;
    p.level++;
    p.statPoints++;
    p.skillPoints++;
    p.hp = p.maxHp;
    p.energy = p.maxEnergy;
    recalcPlayer();
    print("LEVEL UP → " + p.level + " · +1 stat point · +1 perk point");
  }
}

function equipItem(name) {
  const item = ITEMS[name];
  if (!item || !GAME.inventory[name]) {
    print("You do not have '" + name + "'.");
    return false;
  }
  GAME.player.equipment[item.id] = name;
  recalcPlayer();
  print("Equipped " + title(name) + " — " + (describeBuffs(name) || "no bonuses"));
  return true;
}

function findItemMatch(query) {
  const q = String(query || "").trim().toLowerCase();
  const keys = Object.keys(ITEMS);
  return keys.find((k) => k === q) || keys.find((k) => k.includes(q)) || null;
}

function findMonsterMatch(query) {
  const q = String(query || "").trim().toLowerCase();
  const keys = Object.keys(monsters);
  return keys.find((k) => k === q) || keys.find((k) => k.includes(q)) || null;
}

function worldClockText() {
  const totalMinutes = Math.floor(GAME.time % (24 * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0");
}

const GAME = {
  seed: Math.floor(Math.random() * 1e9),
  day: 1,
  time: 360,
  currentZone: "The Quiet Road",
  worldPreset: "everdawn",
  worldName: "Everdawn",
  worldSize: "large",
  worldDifficulty: "classic",
  playerId: "lys",
  camera: { x: 0, y: 0 },
  render: { width: 1280, height: 720, dpr: 1 },
  keys: {},
  mouse: { x: 0, y: 0, worldX: 0, worldY: 0, down: false },
  selectedHotbar: 0,
  inventory: { ...START_INV },
  player: {
    x: 12, y: 10, vx: 0, vy: 0, width: 0.7, height: 1.4,
    hp: 100, maxHp: 100, energy: 4, maxEnergy: 6,
    level: 1, xp: 0, str: 5, agi: 5, vit: 5, foc: 5,
    statPoints: 0, skillPoints: 0, equipment: { weapon:"wooden sword", offhand:null, head:null, armor:null, feet:null, trinket:null },
    weapon: "wooden sword", spells: ["ember spark","mend"], perks: [],
  },
  world: null,
  enemies: [],
  particles: [],
  drops: [],
  combat: null,
  history: [],
  flags: {},
  discovered: new Set(),
  worldGenComplete: false,
  spawnCooldown: 0,
  saveTick: 0,
};

function syncLegacyPlayerView() {
  GAME.player.weapon = GAME.player.equipment.weapon || "wooden sword";
  recalcPlayer();
}
syncLegacyPlayerView();
