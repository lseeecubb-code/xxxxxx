// Local save bridge. Like THE LAST SAVE, the campaign lives in browser storage,
// but here the save also keeps the generated sandbox world.

const TER_SAVE_KEY = "terrpg.save.v1";

function serializableGame() {
  return {
    version: GAME_VERSION,
    seed: GAME.seed,
    day: GAME.day,
    time: GAME.time,
    currentZone: GAME.currentZone,
    world: GAME.world,
    player: GAME.player,
    inventory: GAME.inventory,
    enemies: GAME.enemies,
    flags: GAME.flags,
    progress: GAME.progress || null,
    story: GAME.story || null,
    discovered: [...GAME.discovered],
  };
}

function saveGame(silent = false) {
  try {
    localStorage.setItem(TER_SAVE_KEY, JSON.stringify(serializableGame()));
    const status = document.getElementById("saveStatus");
    if (status) status.textContent = "AUTOSAVE " + new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    if (!silent) print("GAME SAVED.");
    return true;
  } catch (error) {
    if (!silent) print("SAVE FAILED: " + error.message);
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(TER_SAVE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved || !Array.isArray(saved.world)) return false;
    GAME.seed = saved.seed || GAME.seed;
    GAME.day = saved.day || 1;
    GAME.time = Number(saved.time) || 360;
    GAME.currentZone = saved.currentZone || "The Quiet Road";
    GAME.world = saved.world;
    GAME.player = {
      ...GAME.player,
      ...(saved.player || {}),
      equipment: { ...GAME.player.equipment, ...(saved.player?.equipment || {}) },
      spells: Array.isArray(saved.player?.spells) ? saved.player.spells : GAME.player.spells,
      perks: Array.isArray(saved.player?.perks) ? saved.player.perks : [],
    };
    GAME.inventory = { ...START_INV, ...(saved.inventory || {}) };
    GAME.enemies = Array.isArray(saved.enemies) ? saved.enemies : [];
    GAME.flags = saved.flags || {};
    GAME.progress = saved.progress || null;
    GAME.story = saved.story || null;
    GAME.discovered = new Set(saved.discovered || []);
    GAME.combat = null;
    GAME.scene = null;
    GAME.worldGenComplete = true;
    syncLegacyPlayerView();
    return true;
  } catch (error) {
    console.warn("TER-RPG load failed", error);
    return false;
  }
}

function newGame() {
  try { localStorage.removeItem(TER_SAVE_KEY); } catch (error) {}
  GAME.seed = Math.floor(Math.random() * 1e9);
  GAME.day = 1;
  GAME.time = 360;
  GAME.currentZone = "The Quiet Road";
  GAME.world = createWorld();
  GAME.enemies = [];
  GAME.particles = [];
  GAME.drops = [];
  GAME.combat = null;
  GAME.flags = {};
  GAME.progress = {quests:{},companions:{recruited:[],active:[],affinity:{},bondStep:{}},achievements:{},perks:[],storyMoments:[],faction:null,ending:null,hideout:{level:0,trophies:[]}};
  GAME.story = {chapter:0,ending:null,moments:[],started:false,completed:false};
  GAME.discovered = new Set();
  GAME.selectedHotbar = 0;
  GAME.player = {
    x: 12, y: findSurface(12)-0.01, vx:0, vy:0, width:.7, height:1.4,
    hp:100, maxHp:100, energy:4, maxEnergy:6, level:1, xp:0,
    str:5, agi:5, vit:5, foc:5, statPoints:0, skillPoints:0,
    equipment:{weapon:"wooden sword",offhand:null,head:null,armor:null,feet:null,trinket:null},
    weapon:"wooden sword",spells:["ember spark","mend"],perks:[],cooldowns:{},effects:[],
    guardUntil:0,parryUntil:0,shield:0
  };
  GAME.saveTick = 0;
  syncLegacyPlayerView();
  saveGame(true);
  return true;
}

