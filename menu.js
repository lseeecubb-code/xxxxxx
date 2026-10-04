// TER-RPG front-end flow: loading screen, main menu, player selector and world selector.
// The screens are original UI built for this real-time sandbox.

const PLAYER_DEFS = {
  lys: {
    id:"lys", name:"Lys", role:"Bladebound", style:"Melee",
    image:"assets/player-lys.svg",
    description:"Balanced wanderer with a fast sword start.",
    stats:{str:6,agi:6,vit:5,foc:4}, weapon:"wooden sword",
    accent:"gold"
  },
  kael: {
    id:"kael", name:"Kael", role:"Bell Warden", style:"Guardian",
    image:"assets/player-kael.svg",
    description:"Durable protector built for close-range survival.",
    stats:{str:5,agi:4,vit:7,foc:4}, weapon:"shell shield",
    accent:"violet"
  },
  vera: {
    id:"vera", name:"Vera", role:"Wayfinder", style:"Ranged",
    image:"assets/player-vera.svg",
    description:"Agile scout with extra focus for spells and ranged gear.",
    stats:{str:4,agi:7,vit:5,foc:6}, weapon:"hunter bow",
    accent:"cyan"
  }
};

const WORLD_DEFS = {
  everdawn: {
    id:"everdawn", name:"Everdawn", size:"Large", difficulty:"Classic",
    image:"assets/world-everdawn.svg", description:"Green valleys, deep stone and the safest starting route.",
    seedSalt:137
  },
  ashenreach: {
    id:"ashenreach", name:"Ashenreach", size:"Large", difficulty:"Hard",
    image:"assets/world-ashen.svg", description:"A smoky world with more ash, crystal and dangerous night pressure.",
    seedSalt:491
  },
  frostfall: {
    id:"frostfall", name:"Frostfall", size:"Large", difficulty:"Expert",
    image:"assets/world-frostfall.svg", description:"Cold surface biomes, bright caverns and harsher exploration.",
    seedSalt:823
  },
  nullreach: {
    id:"nullreach", name:"Nullreach", size:"Large", difficulty:"Nightmare",
    image:"assets/world-null.svg", description:"Corrupted terrain, void materials and the strongest early threats.",
    seedSalt:1201
  }
};

const MENU_STATE = {
  playerId: localStorage.getItem("terrpg.player") || "lys",
  worldId: localStorage.getItem("terrpg.world") || "everdawn",
  screen: "loading"
};

function menuEl(id){ return document.getElementById(id); }

function hasTerrpgSave(){
  try { return !!localStorage.getItem(TER_SAVE_KEY); } catch (error) { return false; }
}

function setMenuScreen(name){
  MENU_STATE.screen=name;
  ["mainMenu","playerSelector","worldSelector"].forEach((id)=>{
    const el=menuEl(id);
    if(el) el.hidden=true;
  });
  if(name==="main") menuEl("mainMenu").hidden=false;
  if(name==="player") menuEl("playerSelector").hidden=false;
  if(name==="world") menuEl("worldSelector").hidden=false;
}

function selectedPlayer(){
  return PLAYER_DEFS[MENU_STATE.playerId] || PLAYER_DEFS.lys;
}

function selectedWorld(){
  return WORLD_DEFS[MENU_STATE.worldId] || WORLD_DEFS.everdawn;
}

function renderPlayerSelector(){
  const list=menuEl("playerCards");
  const detail=menuEl("playerDetail");
  if(!list||!detail) return;
  list.innerHTML=Object.values(PLAYER_DEFS).map((p)=>{
    const selected=p.id===MENU_STATE.playerId;
    return '<button class="selector-card '+(selected?"selected":"")+'" data-player="'+p.id+'" type="button">'+
      '<img src="'+p.image+'" alt="">'+
      '<span class="card-copy"><strong>'+p.name+'</strong><small>'+p.role+' · '+p.style+'</small><small>'+p.description+'</small></span>'+
      '<span class="card-mark">'+(selected?"◆":"◇")+'</span>'+
    '</button>';
  }).join("");
  list.querySelectorAll("[data-player]").forEach((button)=>{
    button.addEventListener("click",()=>{
      MENU_STATE.playerId=button.dataset.player;
      localStorage.setItem("terrpg.player",MENU_STATE.playerId);
      renderPlayerSelector();
    });
  });
  const p=selectedPlayer();
  detail.innerHTML='<div><b>'+p.name+'</b><span>'+p.role+' · '+p.style+'</span></div>'+
    '<div class="stat-strip">'+Object.entries(p.stats).map(([k,v])=>'<span>'+k.toUpperCase()+' <b>'+v+'</b></span>').join("")+'</div>';
}

function renderWorldSelector(){
  const list=menuEl("worldCards");
  const detail=menuEl("worldDetail");
  if(!list||!detail) return;
  list.innerHTML=Object.values(WORLD_DEFS).map((w)=>{
    const selected=w.id===MENU_STATE.worldId;
    return '<button class="selector-card world-card '+(selected?"selected":"")+'" data-world="'+w.id+'" type="button">'+
      '<img src="'+w.image+'" alt="">'+
      '<span class="card-copy"><strong>'+w.name+'</strong><small>'+w.size+' World · '+w.difficulty+'</small><small>'+w.description+'</small></span>'+
      '<span class="card-mark">'+(selected?"◆":"◇")+'</span>'+
    '</button>';
  }).join("");
  list.querySelectorAll("[data-world]").forEach((button)=>{
    button.addEventListener("click",()=>{
      MENU_STATE.worldId=button.dataset.world;
      localStorage.setItem("terrpg.world",MENU_STATE.worldId);
      renderWorldSelector();
    });
  });
  const w=selectedWorld();
  detail.innerHTML='<div><b>'+w.name+'</b><span>'+w.size+' world · '+w.difficulty+'</span></div>'+
    '<div class="seed-readout">WORLD CODE · '+w.seedSalt+' · generated fresh when you press PLAY</div>';
  const label=menuEl("selectedWorldLabel");
  if(label) label.textContent=w.name;
}

function applyPlayerPreset(def){
  const p=GAME.player;
  p.str=def.stats.str; p.agi=def.stats.agi; p.vit=def.stats.vit; p.foc=def.stats.foc;
  p.weapon=def.weapon;
  p.equipment.weapon=def.weapon;
  p.spells=def.id==="vera"?["ember spark","frostbite","mend"]:def.id==="kael"?["mend","ember spark"]:["ember spark","mend"];
  p.hp=p.maxHp; p.energy=p.maxEnergy;
  GAME.playerId=def.id;
  recalcPlayer();
  p.hp=p.maxHp; p.energy=p.maxEnergy;
}

function freshSeedForWorld(world){
  const base=Math.floor(Math.random()*900000000);
  return (base + world.seedSalt) % 1000000000;
}

function startSelectedAdventure(){
  const p=selectedPlayer();
  const w=selectedWorld();
  newGame({seed:freshSeedForWorld(w), worldPreset:w.id, playerId:p.id});
  applyPlayerPreset(p);
  GAME.world = createWorld();
  GAME.worldGenComplete = true;
  GAME.currentZone = "The Quiet Road";
  GAME.camera.x = 0; GAME.camera.y = 0;
  GAME.player.x = 12;
  GAME.player.y = findSurface(12)-0.02;
  GAME.enemies = [];
  GAME.discovered = new Set();
  GAME.flags.worldName=w.name;
  saveGame(true);
  enterGameplay();
}

function continueAdventure(){
  if(!loadGame()){
    toastMsg("NO SAVE FOUND");
    setMenuScreen("world");
    return;
  }
  enterGameplay();
}

function enterGameplay(){
  menuEl("bootScreen").hidden=true;
  menuEl("menuBackdrop").hidden=true;
  menuEl("gameShell").hidden=false;
  setMenuScreen("main");
  menuEl("mainMenu").hidden=true;
  consolePanel.hidden=true;
  bindWorldInput();
  resizeCanvas();
  document.getElementById("world").focus();
  startGameLoop();
  toastMsg("WORLD READY");
}

function returnToMenu(){
  GAME.gameStarted=false;
  if(GAME.mouse){ GAME.mouse.down=false; GAME.mouse.rightDown=false; }
  menuEl("gameShell").hidden=true;
  menuEl("menuBackdrop").hidden=false;
  menuEl("bootScreen").hidden=true;
  renderPlayerSelector();
  renderWorldSelector();
  setMenuScreen("main");
  menuEl("continueButton").disabled=!hasTerrpgSave();
}

function bootMenu(){
  const fill=menuEl("loadingFill");
  const percentEl=menuEl("loadingPercent");
  const label=menuEl("loadingLabel");
  let progress=0;
  const tips=[
    "Different worlds change the danger curve, not the core controls.",
    "Hold left mouse to keep mining or attacking.",
    "Use the number keys to cycle your hotbar.",
    "Explore deeper regions to meet the RPG campaign bosses."
  ];
  menuEl("bootTip").textContent=tips[Math.floor(Math.random()*tips.length)];
  const timer=setInterval(()=>{
    progress=Math.min(100,progress+Math.floor(7+Math.random()*15));
    if(fill) fill.style.width=progress+"%";
    if(percentEl) percentEl.textContent=progress+"%";
    if(label) label.textContent=progress<45?"GENERATING STARTUP DATA…":progress<82?"BUILDING MENU…":"READY";
    if(progress>=100){
      clearInterval(timer);
      setTimeout(()=>{
        menuEl("bootScreen").hidden=true;
        menuEl("menuBackdrop").hidden=false;
        menuEl("gameShell").hidden=true;
        renderPlayerSelector();
        renderWorldSelector();
        setMenuScreen("main");
        menuEl("continueButton").disabled=!hasTerrpgSave();
      },220);
    }
  },75);
}

function initMenu(){
  menuEl("playButton").addEventListener("click",()=>setMenuScreen("world"));
  menuEl("continueButton").addEventListener("click",continueAdventure);
  menuEl("playerMenuButton").addEventListener("click",()=>{renderPlayerSelector();setMenuScreen("player");});
  menuEl("worldMenuButton").addEventListener("click",()=>{renderWorldSelector();setMenuScreen("world");});
  menuEl("playerBack").addEventListener("click",()=>setMenuScreen("main"));
  menuEl("worldBack").addEventListener("click",()=>setMenuScreen("main"));
  menuEl("selectorWorldButton").addEventListener("click",()=>setMenuScreen("world"));
  menuEl("startWorldButton").addEventListener("click",startSelectedAdventure);
  menuEl("selectorPlayerButton").addEventListener("click",()=>setMenuScreen("world"));
  menuEl("menuButton").addEventListener("click",returnToMenu);
  bootMenu();
}
