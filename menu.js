// TER-RPG front-end: title, character creation, world generation, then real-time gameplay.
// Original implementation inspired by the familiar single-player sandbox flow.

const PLAYER_DEFS = {
  lys:{id:"lys",name:"Lys",role:"Bladebound",style:"Melee",mode:"classic",image:"assets/player-lys.svg",description:"Balanced wanderer with a fast sword start.",stats:{str:6,agi:6,vit:5,foc:4},weapon:"wooden sword",accent:"gold"},
  kael:{id:"kael",name:"Kael",role:"Bell Warden",style:"Guardian",mode:"classic",image:"assets/player-kael.svg",description:"Durable protector built for close-range survival.",stats:{str:5,agi:4,vit:7,foc:4},weapon:"shell shield",accent:"violet"},
  vera:{id:"vera",name:"Vera",role:"Wayfinder",style:"Ranger",mode:"classic",image:"assets/player-vera.svg",description:"Agile scout with extra focus for ranged gear.",stats:{str:4,agi:7,vit:5,foc:6},weapon:"hunter bow",accent:"cyan"}
};

const WORLD_DEFS = {
  everdawn:{id:"everdawn",name:"Everdawn",size:"large",difficulty:"classic",type:"everdawn",evil:"random",image:"assets/world-everdawn.svg",description:"Green valleys, deep stone and a forgiving first frontier.",seedSalt:137},
  ashenreach:{id:"ashenreach",name:"Ashenreach",size:"large",difficulty:"expert",type:"ashenreach",evil:"corruption",image:"assets/world-ashen.svg",description:"Ash, fire and crystal create a harsher first journey.",seedSalt:491},
  frostfall:{id:"frostfall",name:"Frostfall",size:"large",difficulty:"expert",type:"frostfall",evil:"crimson",image:"assets/world-frostfall.svg",description:"Frozen surface zones and bright, dangerous caverns.",seedSalt:823},
  nullreach:{id:"nullreach",name:"Nullreach",size:"large",difficulty:"master",type:"nullreach",evil:"random",image:"assets/world-null.svg",description:"Void terrain, corrupted spaces and extreme encounters.",seedSalt:1201}
};

const PLAYER_STORE="terrpg.players.v1";
const WORLD_STORE="terrpg.worlds.v1";
const MENU_STATE={
  playerId:localStorage.getItem("terrpg.player")||"lys",
  worldId:localStorage.getItem("terrpg.world")||"everdawn",
  selectedPlayerId:localStorage.getItem("terrpg.player")||"lys",
  selectedWorldId:localStorage.getItem("terrpg.world")||"everdawn",
  screen:"loading"
};

function menuEl(id){return document.getElementById(id);}
function hasTerrpgSave(){try{return !!localStorage.getItem(TER_SAVE_KEY);}catch(e){return false;}}
function loadCustomPlayers(){try{const v=JSON.parse(localStorage.getItem(PLAYER_STORE)||"[]");return Array.isArray(v)?v:[];}catch(e){return[];}}
function saveCustomPlayers(v){localStorage.setItem(PLAYER_STORE,JSON.stringify(v));}
function loadCustomWorlds(){try{const v=JSON.parse(localStorage.getItem(WORLD_STORE)||"[]");return Array.isArray(v)?v:[];}catch(e){return[];}}
function saveCustomWorlds(v){localStorage.setItem(WORLD_STORE,JSON.stringify(v));}
function allPlayers(){return [...Object.values(PLAYER_DEFS),...loadCustomPlayers()];}
function allWorlds(){return [...Object.values(WORLD_DEFS),...loadCustomWorlds()];}
function selectedPlayer(){return allPlayers().find(p=>p.id===MENU_STATE.selectedPlayerId)||PLAYER_DEFS.lys;}
function selectedWorld(){return allWorlds().find(w=>w.id===MENU_STATE.selectedWorldId)||WORLD_DEFS.everdawn;}

function setMenuScreen(name){
  MENU_STATE.screen=name;
  ["mainMenu","playerSelector","worldSelector","playerCreator","worldCreator"].forEach(id=>{const el=menuEl(id);if(el)el.hidden=true;});
  const target={main:"mainMenu",player:"playerSelector",world:"worldSelector",createPlayer:"playerCreator",createWorld:"worldCreator"}[name];
  if(target)menuEl(target).hidden=false;
}

function customPortrait(p){
  const c={skin:p.skin||"#a96f48",hair:p.hair||"#6f3e28",shirt:p.shirt||"#5d7791",pants:p.pants||"#334055",boots:p.boots||"#241b2a"};
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="18" fill="#07101a"/><circle cx="90" cy="50" r="27" fill="'+c.skin+'"/><path d="M62 44q28-39 56 0v11H62z" fill="'+c.hair+'"/><rect x="58" y="77" width="64" height="62" rx="9" fill="'+c.shirt+'"/><rect x="62" y="139" width="24" height="22" fill="'+c.pants+'"/><rect x="94" y="139" width="24" height="22" fill="'+c.pants+'"/><rect x="58" y="151" width="29" height="10" fill="'+c.boots+'"/><rect x="93" y="151" width="29" height="10" fill="'+c.boots+'"/><circle cx="80" cy="51" r="3" fill="#151019"/><circle cx="101" cy="51" r="3" fill="#151019"/></svg>';
  return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
}
function playerImage(p){return p.custom?customPortrait(p):p.image;}

function renderPlayerSelector(){
  const list=menuEl("playerCards"),detail=menuEl("playerDetail");
  const players=allPlayers();
  list.innerHTML=players.map(p=>{
    const sel=p.id===MENU_STATE.selectedPlayerId;
    return '<button class="selector-card '+(sel?"selected":"")+'" data-player="'+p.id+'" type="button"><img src="'+playerImage(p)+'" alt=""><span class="card-copy"><strong>'+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.role)+' · '+escapeHtml(p.style||"Adventurer")+'</small><small>'+escapeHtml((p.mode||"classic").toUpperCase())+' · '+escapeHtml(p.description||"Adventurer")+'</small></span><span class="card-mark">'+(sel?"◆":"◇")+'</span></button>';
  }).join("");
  list.querySelectorAll("[data-player]").forEach(b=>b.addEventListener("click",()=>{MENU_STATE.selectedPlayerId=b.dataset.player;renderPlayerSelector();}));
  const p=selectedPlayer();
  detail.innerHTML='<div><b>'+escapeHtml(p.name)+'</b><span>'+escapeHtml(p.role)+' · '+escapeHtml(p.style||"Adventurer")+'</span></div><div class="stat-strip">'+Object.entries(p.stats||{}).map(([k,v])=>'<span>'+k.toUpperCase()+' <b>'+v+'</b></span>').join("")+'</div>';
  const del=menuEl("deletePlayerButton");if(del)del.disabled=!p.custom;
}

function renderWorldSelector(){
  const list=menuEl("worldCards"),detail=menuEl("worldDetail");
  list.innerHTML=allWorlds().map(w=>{
    const sel=w.id===MENU_STATE.selectedWorldId;
    return '<button class="selector-card world-card '+(sel?"selected":"")+'" data-world="'+w.id+'" type="button"><img src="'+w.image+'" alt=""><span class="card-copy"><strong>'+escapeHtml(w.name)+'</strong><small>'+escapeHtml(w.size)+' World · '+escapeHtml(w.difficulty)+(w.custom?" · CUSTOM":"")+'</small><small>'+escapeHtml(w.description||"Sandbox world")+'</small></span><span class="card-mark">'+(sel?"◆":"◇")+'</span></button>';
  }).join("");
  list.querySelectorAll("[data-world]").forEach(b=>b.addEventListener("click",()=>{MENU_STATE.selectedWorldId=b.dataset.world;renderWorldSelector();}));
  const w=selectedWorld();
  detail.innerHTML='<div><b>'+escapeHtml(w.name)+'</b><span>'+escapeHtml(w.size)+' world · '+escapeHtml(w.difficulty)+'</span></div><div class="seed-readout">SEED · '+(w.seed??"random")+" · EVIL · "+escapeHtml(w.evil||"random")+'</div>';
  menuEl("selectedWorldLabel").textContent=w.name;
  const del=menuEl("deleteWorldButton");if(del)del.disabled=!w.custom;
}

function archetypeStats(style){
  const s=String(style||"balanced").toLowerCase();
  return s==="guardian"?{str:5,agi:4,vit:7,foc:4}:s==="ranged"?{str:4,agi:7,vit:5,foc:6}:s==="mystic"?{str:3,agi:5,vit:5,foc:9}:{str:6,agi:6,vit:5,foc:4};
}
function archetypeWeapon(style){
  const s=String(style||"balanced").toLowerCase();
  return s==="guardian"?"shell shield":s==="ranged"?"hunter bow":"wooden sword";
}

function renderCreatorPreview(){
  const p=menuEl("creatorPreview");if(!p)return;
  p.src=customPortrait({skin:menuEl("creatorSkin").value,hair:menuEl("creatorHair").value,shirt:menuEl("creatorShirt").value,pants:menuEl("creatorPants").value,boots:menuEl("creatorBoots").value});
}
function renderWorldCreatorPreview(){
  const type=menuEl("creatorWorldType").value,size=menuEl("creatorWorldSize").value,difficulty=menuEl("creatorWorldDifficulty").value,name=(menuEl("creatorWorldName").value.trim()||"MY WORLD").toUpperCase();
  menuEl("worldCreatorPreview").src=worldAsset(type);
  menuEl("worldCreatorSummary").textContent=name+" · "+size.toUpperCase()+" · "+difficulty.toUpperCase();
}
function randomSeed(){return Math.floor(Math.random()*900000000)+100000000;}
function randomizeWorldSeed(){menuEl("creatorWorldSeed").value=randomSeed();}

function createPlayerFromForm(){
  const name=menuEl("creatorPlayerName").value.trim().slice(0,24)||"Adventurer";
  const mode=menuEl("creatorPlayerMode").value,style=menuEl("creatorPlayerStyle").value;
  const p={id:"custom-"+Date.now().toString(36),name,role:style==="guardian"?"Guardian":style==="ranged"?"Ranger":style==="mystic"?"Mystic":"Adventurer",style:style.charAt(0).toUpperCase()+style.slice(1),mode,description:"Custom character created in TER-RPG.",stats:archetypeStats(style),weapon:archetypeWeapon(style),skin:menuEl("creatorSkin").value,hair:menuEl("creatorHair").value,shirt:menuEl("creatorShirt").value,pants:menuEl("creatorPants").value,boots:menuEl("creatorBoots").value,custom:true};
  const players=loadCustomPlayers();players.push(p);saveCustomPlayers(players);
  MENU_STATE.selectedPlayerId=p.id;renderPlayerSelector();setMenuScreen("player");toastMsg("PLAYER CREATED · "+p.name.toUpperCase());
}
function deleteSelectedPlayer(){
  const p=selectedPlayer();if(!p.custom)return;
  saveCustomPlayers(loadCustomPlayers().filter(x=>x.id!==p.id));MENU_STATE.selectedPlayerId="lys";renderPlayerSelector();toastMsg("PLAYER DELETED");
}

function worldAsset(type){return type==="ashenreach"?"assets/world-ashen.svg":type==="frostfall"?"assets/world-frostfall.svg":type==="nullreach"?"assets/world-null.svg":"assets/world-everdawn.svg";}

function createWorldFromForm(){
  const name=menuEl("creatorWorldName").value.trim().slice(0,28)||"My World";
  const size=menuEl("creatorWorldSize").value,difficulty=menuEl("creatorWorldDifficulty").value,type=menuEl("creatorWorldType").value,evil=menuEl("creatorWorldEvil").value,special=menuEl("creatorWorldSpecial").value;
  let seed=parseInt(menuEl("creatorWorldSeed").value,10);if(!Number.isFinite(seed))seed=randomSeed();
  const w={id:"custom-"+Date.now().toString(36),name,size,difficulty,type,evil,special,image:worldAsset(type),description:"Custom generated sandbox world.",seed,seedSalt:seed%10000,custom:true};
  const worlds=loadCustomWorlds();worlds.push(w);saveCustomWorlds(worlds);MENU_STATE.selectedWorldId=w.id;renderWorldSelector();setMenuScreen("world");toastMsg("WORLD GENERATED · "+name.toUpperCase());
}

function applyPlayerPreset(def){
  const p=GAME.player,s=def.stats||archetypeStats("balanced");
  p.str=s.str;p.agi=s.agi;p.vit=s.vit;p.foc=s.foc;
  p.equipment={weapon:"wooden sword",offhand:null,head:null,armor:null,feet:null,trinket:null};
  if(def.weapon&&ITEMS[def.weapon]){const slot=ITEMS[def.weapon].id||"weapon";p.equipment[slot]=def.weapon;}
  p.weapon=p.equipment.weapon||"wooden sword";
  p.spells=def.style==="Mystic"?["ember spark","frostbite","mend"]:def.style==="Ranger"?["ember spark","frostbite","mend"]:def.style==="Guardian"?["mend","ember spark"]:["ember spark","mend"];
  GAME.playerId=def.id;recalcPlayer();p.hp=p.maxHp;p.energy=p.maxEnergy;
}

function commitSelection(){MENU_STATE.playerId=MENU_STATE.selectedPlayerId;MENU_STATE.worldId=MENU_STATE.selectedWorldId;localStorage.setItem("terrpg.player",MENU_STATE.playerId);localStorage.setItem("terrpg.world",MENU_STATE.worldId);}

function startSelectedAdventure(){
  const p=selectedPlayer(),w=selectedWorld();
  if(!p||!w)return;
  if(p.mode==="journey"&&String(w.difficulty).toLowerCase()!=="journey"){toastMsg("CHOOSE A JOURNEY WORLD");return;}
  if(p.mode!=="journey"&&String(w.difficulty).toLowerCase()==="journey"){toastMsg("JOURNEY CHARACTER REQUIRED");return;}
  commitSelection();
  newGame({seed:Number.isFinite(w.seed)?w.seed:freshSeedForWorld(w),worldPreset:w.type||"everdawn",worldName:w.name,worldSize:String(w.size).toLowerCase(),worldDifficulty:String(w.difficulty).toLowerCase(),worldEvil:w.evil,playerId:p.id});
  applyPlayerPreset(p);
  GAME.world=createWorld();GAME.worldGenComplete=true;GAME.currentZone="The Quiet Road";GAME.camera.x=0;GAME.camera.y=0;GAME.player.x=12;GAME.player.y=findSurface(12)-0.02;GAME.enemies=[];GAME.projectiles=[];GAME.discovered=new Set();GAME.flags.worldName=w.name;saveGame(true);
  enterGameplay();
}
function freshSeedForWorld(w){return (Math.floor(Math.random()*900000000)+(w.seedSalt||0))%1000000000;}

function continueAdventure(){if(!loadGame()){toastMsg("NO SAVE FOUND");setMenuScreen("player");return;}MENU_STATE.selectedPlayerId=GAME.playerId||MENU_STATE.selectedPlayerId;MENU_STATE.selectedWorldId=GAME.worldPreset||MENU_STATE.selectedWorldId;enterGameplay();}
function enterGameplay(){menuEl("bootScreen").hidden=true;menuEl("menuBackdrop").hidden=true;menuEl("gameShell").hidden=false;consolePanel.hidden=true;resizeCanvas();document.getElementById("world").focus();startGameLoop();toastMsg("WORLD READY");}
function returnToMenu(){stopGameLoop();GAME.mouse.down=false;GAME.mouse.rightDown=false;menuEl("gameShell").hidden=true;menuEl("menuBackdrop").hidden=false;renderPlayerSelector();renderWorldSelector();setMenuScreen("main");menuEl("continueButton").disabled=!hasTerrpgSave();}

function bootMenu(){
  const fill=menuEl("loadingFill"),pct=menuEl("loadingPercent"),label=menuEl("loadingLabel");let progress=0;
  const tick=setInterval(()=>{progress=Math.min(100,progress+10+Math.floor(Math.random()*10));if(fill)fill.style.width=progress+"%";if(pct)pct.textContent=progress+"%";if(label)label.textContent=progress<40?"LOADING ASSETS…":progress<80?"PREPARING MENUS…":"READY";if(progress>=100){clearInterval(tick);menuEl("bootScreen").hidden=true;menuEl("menuBackdrop").hidden=false;renderPlayerSelector();renderWorldSelector();setMenuScreen("main");menuEl("continueButton").disabled=!hasTerrpgSave();}},65);
  menuEl("bootTip").textContent=["Choose a character, then choose a world.","Every seed creates a different terrain layout.","Large worlds take longer to generate.","Your characters and worlds are saved locally."][Math.floor(Math.random()*4)];
}

function initMenu(){
  menuEl("playButton").addEventListener("click",()=>{renderPlayerSelector();setMenuScreen("player");});
  menuEl("continueButton").addEventListener("click",continueAdventure);
  menuEl("playerMenuButton").addEventListener("click",()=>setMenuScreen("createPlayer"));
  menuEl("worldMenuButton").addEventListener("click",()=>setMenuScreen("createWorld"));
  menuEl("playerBack").addEventListener("click",()=>setMenuScreen("main"));
  menuEl("worldBack").addEventListener("click",()=>setMenuScreen("player"));
  menuEl("selectorWorldButton").addEventListener("click",()=>{commitSelection();renderWorldSelector();setMenuScreen("world");});
  menuEl("selectorPlayerButton").addEventListener("click",()=>{renderPlayerSelector();setMenuScreen("player");});
  menuEl("createPlayerButton").addEventListener("click",()=>setMenuScreen("createPlayer"));
  menuEl("createWorldButton").addEventListener("click",()=>setMenuScreen("createWorld"));
  menuEl("cancelPlayerCreator").addEventListener("click",()=>{renderPlayerSelector();setMenuScreen("player");});
  menuEl("cancelWorldCreator").addEventListener("click",()=>{renderWorldSelector();setMenuScreen("world");});
  menuEl("savePlayerCreator").addEventListener("click",createPlayerFromForm);
  menuEl("generateWorldButton").addEventListener("click",createWorldFromForm);
  menuEl("randomWorldSeed").addEventListener("click",randomizeWorldSeed);
  menuEl("deletePlayerButton").addEventListener("click",deleteSelectedPlayer);
  menuEl("deleteWorldButton").addEventListener("click",()=>{const w=selectedWorld();if(!w.custom)return;saveCustomWorlds(loadCustomWorlds().filter(x=>x.id!==w.id));MENU_STATE.selectedWorldId="everdawn";renderWorldSelector();toastMsg("WORLD DELETED");});
  ["creatorSkin","creatorHair","creatorShirt","creatorPants","creatorBoots"].forEach(id=>menuEl(id).addEventListener("input",renderCreatorPreview));
  ["creatorWorldName","creatorWorldType","creatorWorldSize","creatorWorldDifficulty"].forEach(id=>menuEl(id).addEventListener("input",renderWorldCreatorPreview));
  ["creatorWorldEvil","creatorWorldSpecial"].forEach(id=>menuEl(id).addEventListener("change",renderWorldCreatorPreview));
  menuEl("menuButton").addEventListener("click",returnToMenu);
  renderCreatorPreview();renderWorldCreatorPreview();bootMenu();
}
