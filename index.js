// TER-RPG entry point. Similar module-driven structure to THE LAST SAVE,
// but the primary renderer is a 2D canvas world with the terminal retained for commands.

const termScreen = document.getElementById("screen");
const termInput = document.getElementById("command");
const inventoryPanel = document.getElementById("inventoryPanel");
const craftPanel = document.getElementById("craftPanel");
const inventoryList = document.getElementById("inventoryList");
const craftList = document.getElementById("craftList");
const toast = document.getElementById("toast");

let commandHistory = [];
let historyIndex = -1;

function print(text = "") {
  termScreen.textContent += (termScreen.textContent ? "\n" : "") + String(text);
  termScreen.scrollTop = termScreen.scrollHeight;
}

function toastMsg(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastMsg.timer);
  toastMsg.timer = setTimeout(() => toast.classList.remove("show"), 1200);
}

function renderHud() {
  const p = GAME.player;
  const maxHp = p.maxHp;
  const maxEnergy = p.maxEnergy;
  const xpGoal = p.level * 100;
  const hpPct = Math.max(0, Math.min(100, (p.hp / maxHp) * 100));
  const enPct = Math.max(0, Math.min(100, (p.energy / maxEnergy) * 100));
  const xpPct = Math.max(0, Math.min(100, (p.xp / xpGoal) * 100));
  document.getElementById("hpFill").style.width = hpPct + "%";
  document.getElementById("hpText").textContent = p.hp + "/" + maxHp;
  document.getElementById("energyFill").style.width = enPct + "%";
  document.getElementById("energyText").textContent = p.energy + "/" + maxEnergy;
  document.getElementById("xpFill").style.width = xpPct + "%";
  document.getElementById("xpText").textContent = p.xp + "/" + xpGoal;
  document.getElementById("zoneLabel").textContent = WORLD.currentZone.toUpperCase();
  document.getElementById("clockLabel").textContent = "DAY " + WORLD.day + " · " + worldClockText();
}

function refreshInventory() {
  const names = Object.keys(GAME.inventory).filter((name) => GAME.inventory[name] > 0).sort();
  inventoryList.innerHTML = names.length
    ? names.map((name) => {
        const amount = GAME.inventory[name];
        const info = ITEMS[name] || USABLE_ITEMS[name] || {};
        const desc = ITEMS[name] ? describeBuffs(name) : describeUsable(name);
        return '<div class="entry"><strong>' + escapeHtml(name) + ' ×' + amount + '</strong><small>' + escapeHtml(desc || itemCategory(name)) + '</small></div>';
      }).join("")
    : '<div class="entry">Inventory empty.</div>';
}

function refreshCrafting() {
  const names = Object.keys(recipes).sort();
  craftList.innerHTML = names.map((name) => {
    const ing = recipes[name];
    const ready = Object.entries(ing).every(([item, need]) => (GAME.inventory[item] || 0) >= need);
    const req = Object.entries(ing).map(([item, need]) => need + " " + item).join(", ");
    return '<div class="entry"><strong>' + escapeHtml(name) + (ready ? " ✓" : "") + '</strong><small>' + escapeHtml(req) + '</small></div>';
  }).join("");
}

function togglePanel(panel, visible) {
  panel.hidden = !visible;
}

function showHelp() {
  print("TER-RPG commands:");
  print("  help — show this help");
  print("  explore — reveal nearby terrain and encounters");
  print("  mine — mine the block under the cursor");
  print("  place [block] — place a block in front of you");
  print("  inventory — open inventory");
  print("  craft [item] — craft an item");
  print("  fight — target the nearest enemy");
  print("  attack — use your equipped weapon");
  print("  spell [name] — cast a known spell");
  print("  save / load — local save slot");
  print("  stats — show RPG stats");
  print("  bestiary — show discovered enemies");
  print("  scenes — list scene hooks");
  print("  new — start a fresh world");
}

function showStats() {
  const p = GAME.player;
  print("STATS");
  print("Level " + p.level + " · STR " + p.str + " · AGI " + p.agi + " · VIT " + p.vit + " · FOC " + p.foc);
  print("HP " + p.hp + "/" + p.maxHp + " · Energy " + p.energy + "/" + p.maxEnergy + " · Coins " + (GAME.inventory.coin || 0));
  print("Weapon: " + (p.weapon || "wooden sword"));
  print("Position: " + p.x.toFixed(1) + ", " + p.y.toFixed(1));
}

function showBestiary() {
  const names = Object.keys(monsters).slice().sort();
  print("BESTIARY — " + names.length + " enemies loaded from THE LAST SAVE");
  names.slice(0, 70).forEach((name) => {
    const m = monsters[name];
    print("  " + title(name) + " · HP " + m.hp + " · level " + (m.level || "?"));
  });
  if (names.length > 70) print("  …and " + (names.length - 70) + " more.");
}

function showScenes() {
  const openings = Object.keys(GAME_SCENES.openings || {});
  const attacks = Object.values(GAME_SCENES.attacks || {}).reduce((n, map) => n + Object.keys(map).length, 0);
  print("SCENE REGISTRY");
  print(openings.length + " monster/boss openings");
  print(attacks + " attack → scene routes");
  print("Use fight [enemy] to trigger opening and attack scenes in-world.");
}

async function handleCommand(raw) {
  const line = raw.trim();
  if (!line) return;
  commandHistory.push(line);
  if (commandHistory.length > 80) commandHistory.shift();
  historyIndex = commandHistory.length;

  const [command, ...rest] = line.split(/\s+/);
  const arg = rest.join(" ").trim().toLowerCase();
  switch (command.toLowerCase()) {
    case "help": showHelp(); break;
    case "stats": showStats(); break;
    case "inventory":
    case "i":
      refreshInventory(); togglePanel(inventoryPanel, true); togglePanel(craftPanel, false); break;
    case "craft":
    case "c":
      if (!arg) { refreshCrafting(); togglePanel(craftPanel, true); togglePanel(inventoryPanel, false); break; }
      craftItem(arg); break;
    case "recipes": listRecipes(arg); break;
    case "use": useCombatItem(arg || "potion"); break;
    case "equip": {
      const item = findItemMatch(arg);
      if (item) equipItem(item); else print("Unknown gear: " + arg);
      break;
    }
    case "quests": showQuests(); break;
    case "party": showParty(); break;
    case "perks": if (arg) unlockPerk(arg); else showPerks(); break;
    case "story": showStory(); break;
    case "guide": showGuide(); break;
    case "chronicle": showChronicle(); break;
    case "ending":
      if (arg && chooseEnding(arg)) break;
      showEnding();
      break;
    case "town": showTown(); break;
    case "explore": exploreArea(); break;
    case "mine": mineTarget(); break;
    case "place": placeBlock(arg || "dirt"); break;
    case "fight": startCombat(arg || nearestEnemyName()); break;
    case "attack": playerAttack(); break;
    case "spell": castPlayerSpell(arg || "ember spark"); break;
    case "bestiary":
    case "journal": showBestiary(); break;
    case "scenes": showScenes(); break;
    case "save": saveGame(); break;
    case "load": loadGame(); break;
    case "new": newGame(); break;
    default:
      print("Unknown command '" + command + "'. Type 'help'.");
  }
}

termInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const value = termInput.value;
    if (value.trim()) print(">>> " + value.trim());
    termInput.value = "";
    await handleCommand(value);
    renderHud();
    saveGame(true);
  } else if (event.key === "ArrowUp") {
    if (!commandHistory.length) return;
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    termInput.value = commandHistory[historyIndex] || "";
  } else if (event.key === "ArrowDown") {
    if (!commandHistory.length) return;
    event.preventDefault();
    historyIndex = Math.min(commandHistory.length, historyIndex + 1);
    termInput.value = commandHistory[historyIndex] || "";
  }
});

document.getElementById("closeInventory").addEventListener("click", () => togglePanel(inventoryPanel, false));
document.getElementById("closeCraft").addEventListener("click", () => togglePanel(craftPanel, false));

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "i") {
    refreshInventory(); togglePanel(inventoryPanel, true); togglePanel(craftPanel, false);
  }
  if (event.key.toLowerCase() === "c") {
    refreshCrafting(); togglePanel(craftPanel, true); togglePanel(inventoryPanel, false);
  }
  if (event.key === "/" && document.activeElement !== termInput) {
    event.preventDefault();
    termInput.focus();
  }
});

function startup() {
  if (!loadGame()) {
    newGame();
    print("TER-RPG initialized.");
    print("A sandbox world is ready. Type 'help' to see the command layer.");
  } else {
    print("Save restored.");
  }
  termInput.focus();
  resizeCanvas();
  requestAnimationFrame(gameFrame);
}

function resizeCanvas() {
  const canvas = document.getElementById("world");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  GAME.render.dpr = dpr;
  GAME.render.width = canvas.clientWidth;
  GAME.render.height = canvas.clientHeight;
}

function gameFrame(time) {
  updateGame(time);
  drawWorld();
  renderHud();
  requestAnimationFrame(gameFrame);
}

window.addEventListener("resize", resizeCanvas);
startup();