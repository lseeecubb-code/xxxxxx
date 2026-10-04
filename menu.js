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

const PLAYER_STORE="terrpg.players.v1";
const WORLD_STORE="terrpg.worlds.v1";
const MENU_STATE={
  playerId:localStorage.getItem("terrpg.player")||"lys",
  worldId:localStorage.getItem("terrpg.world")||"everdawn",
  screen:"loading",
  selectedPlayerId:localStorage.getItem("terrpg.player")||"lys",
  selectedWorldId:localStorage.getItem("terrpg.world")||"everdawn"
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

function selectedPlayer(){return allPlayers().find(p=>p.id===MENU_STATE.selectedPlayerId)||PLAYER_DEFS.lys;}
function selectedWorld(){return allWorlds().find(w=>w.id===MENU_STATE.selectedWorldId)||WORLD_DEFS.everdawn;}


function customPortrait(p){
  const colors={skin:"#a96f48",hair:"#6f3e28",shirt:"#5d7791",pants:"#334055",boots:"#241b2a"};
  for(const k of Object.keys(colors))if(/^#[0-9a-f]{6}$/i.test(String(p[k]||"")))colors[k]=p[k];
  const s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="18" fill="#07101a"/><circle cx="90" cy="50" r="27" fill="'+colors.skin+'"/><path d="M62 44q28-39 56 0v11H62z" fill="'+colors.hair+'"/><rect x="58" y="77" width="64" height="62" rx="9" fill="'+colors.shirt+'"/><rect x="62" y="139" width="24" height="22" fill="'+colors.pants+'"/><rect x="94" y="139" width="24" height="22" fill="'+colors.pants+'"/><rect x="58" y="151" width="29" height="10" fill="'+colors.boots+'"/><rect x="93" y="151" width="29" height="10" fill="'+colors.boots+'"/><circle cx="80" cy="51" r="3" fill="#151019"/><circle cx="101" cy="51" r="3" fill="#151019"/></svg>';
  return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(s);
}
function playerImage(p){return p.custom?customPortrait(p):p.image;}

function renderPlayerSelector(){
  const list=menuEl("playerCards"),detail=menuEl("playerDetail");
  if(!list||!detail)return;
  list.innerHTML=allPlayers().map(p=>{
    const sel=p.id===MENU_STATE.selectedPlayerId;
    const mode=p.mode||"classic";
    return '<button class="selector-card '+(sel?"selected":"")+'" data-player="'+p.id+'" type="button"><img src="'+playerImage(p)+'" alt=""><span class="card-copy"><strong>'+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.role)+' · '+escapeHtml(p.style||"Starter")+'</small><small>'+escapeHtml(mode.toUpperCase())+' · '+escapeHtml(p.description||"Adventurer")+'</small></span><span class="card-mark">'+(sel?"◆":"◇")+'</span></button>';
  }).join("");
  list.querySelectorAll("[data-player]").forEach(b=>b.addEventListener("click",()=>{MENU_STATE.selectedPlayerId=b.dataset.player;renderPlayerSelector();}));
  const p=selectedPlayer();
  detail.innerHTML='<div><b>'+escapeHtml(p.name)+'</b><span>'+escapeHtml(p.role)+' · '+escapeHtml(p.style||"Starter")+'</span></div><div class="stat-strip">'+Object.entries(p.stats||{}).map(([k,v])=>'<span>'+k.toUpperCase()+' <b>'+v+'</b></span>').join("")+'</div><div class="mode-readout">CHARACTER MODE · '+escapeHtml((p.mode||"classic").toUpperCase())+'</div>';
  const del=menuEl("deletePlayerButton");if(del)del.disabled=!p.custom;
}

function renderWorldSelector(){
  const list=menuEl("worldCards"),detail=menuEl("worldDetail");
  if(!list||!detail)return;
  list.innerHTML=allWorlds().map(w=>{
    const sel=w.id===MENU_STATE.worldId;
    return '<button class="selector-card world-card '+(sel?"selected":"")+'" data-world="'+w.id+'" type="button"><img src="'+w.image+'" alt=""><span class="card-copy"><strong>'+escapeHtml(w.name)+'</strong><small>'+escapeHtml(w.size)+' World · '+escapeHtml(w.difficulty)+(w.custom?" · CUSTOM":"")+'</small><small>'+escapeHtml(w.description)+'</small></span><span class="card-mark">'+(sel?"◆":"◇")+'</span></button>';
  }).join("");
  list.querySelectorAll("[data-world]").forEach(b=>b.addEventListener("click",()=>{MENU_STATE.selectedWorldId=b.dataset.world;renderWorldSelector();}));
  const w=selectedWorld();
  detail.innerHTML='<div><b>'+escapeHtml(w.name)+'</b><span>'+escapeHtml(w.size)+' world · '+escapeHtml(w.difficulty)+'</span></div><div class="seed-readout">SEED · '+(w.seed??"fresh random")+' · '+escapeHtml(w.type||"everdawn")+' terrain profile</div>';
  menuEl("selectedWorldLabel").textContent=w.name;
  const del=menuEl("deleteWorldButton"); if(del)del.disabled=!w.custom;
}

function applyPlayerPreset(def){
  const p=GAME.player,s=def.stats||archetypeStats("balanced");
  p.str=s.str;p.agi=s.agi;p.vit=s.vit;p.foc=s.foc;
  p.equipment.weapon="wooden sword";p.equipment.offhand=null;
  if(def.weapon&&ITEMS[def.weapon]){
    if(ITEMS[def.weapon].id==="offhand")p.equipment.offhand=def.weapon;
    else p.equipment.weapon=def.weapon;
  }
  p.weapon=p.equipment.weapon;p.spells=def.style==="Mystic"?["ember spark","frostbite","mend"]:def.style==="Ranged"?["ember spark","frostbite","mend"]:def.style==="Guardian"?["mend","ember spark"]:["ember spark","mend"];GAME.playerId=def.id;recalcPlayer();p.hp=p.maxHp;p.energy=p.maxEnergy;}

function startSelectedAdventure(){
  const p=selectedPlayer(),w=selectedWorld();
  if((p.mode==="journey" && w.difficulty!=="journey") || (p.mode!=="journey" && w.difficulty==="journey")){toastMsg("CHARACTER AND WORLD MODES MUST MATCH");return;}
  commitSelectedPlayer();commitSelectedWorld();newGame({seed:Number.isFinite(w.seed)?w.seed:freshSeedForWorld(w),worldPreset:w.type||w.id,worldName:w.name,worldSize:w.size,worldDifficulty:w.difficulty,worldEvil:w.evil,playerId:p.id});applyPlayerPreset(p);GAME.world=createWorld();GAME.worldGenComplete=true;GAME.currentZone="The Quiet Road";GAME.camera.x=0;GAME.camera.y=0;GAME.player.x=12;GAME.player.y=findSurface(12)-0.02;GAME.enemies=[];GAME.discovered=new Set();GAME.flags.worldName=w.name;saveGame(true);enterGameplay();}

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
  stopGameLoop();
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

function selectPlayerAndContinue(){commitSelectedPlayer();renderWorldSelector();setMenuScreen("world");}
function openNewPlayer(){setMenuScreen("createPlayer");}
function openNewWorld(){setMenuScreen("createWorld");}

function initMenu(){
    menuEl("playButton").addEventListener("click",()=>{renderPlayerSelector();setMenuScreen("player");});
  menuEl("continueButton").addEventListener("click",continueAdventure);
    menuEl("playerMenuButton").addEventListener("click",openNewPlayer);
    menuEl("worldMenuButton").addEventListener("click",openNewWorld);
  menuEl("playerBack").addEventListener("click",()=>setMenuScreen("main"));
  menuEl("worldBack").addEventListener("click",()=>setMenuScreen("main"));
  menuEl("selectorWorldButton").addEventListener("click",()=>{renderPlayerSelector();setMenuScreen("player");});
    menuEl("startWorldButton").addEventListener("click",startSelectedAdventure);
  menuEl("selectorPlayerButton").addEventListener("click",()=>setMenuScreen("world"));
  menuEl("menuButton").addEventListener("click",returnToMenu);
  renderCreatorPreview();
  renderWorldCreatorPreview();
  bootMenu();
}
