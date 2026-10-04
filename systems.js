// Ported progression systems from THE LAST SAVE, adapted to the real-time sandbox.
// These definitions are intentionally data-first so index.js and the world/combat layers can evolve independently.

const PERKS = {
  "iron thews": { tree:"Warrior", req:[], desc:"+10% physical damage." },
  "iron wall": { tree:"Warrior", req:["iron thews"], desc:"Guard absorbs more damage." },
  "iron blood": { tree:"Warrior", req:["iron wall"], desc:"+18 maximum HP." },
  "iron counter": { tree:"Warrior", req:["iron blood"], desc:"Parries can counterattack." },
  "shade step": { tree:"Rogue", req:[], desc:"+8% dodge." },
  "killing edge": { tree:"Rogue", req:["shade step"], desc:"+8% critical chance." },
  "blade work": { tree:"Rogue", req:["killing edge"], desc:"+8% parry chance." },
  venomous: { tree:"Rogue", req:["blade work"], desc:"Bleed and poison hit harder." },
  "elemental attunement": { tree:"Mage", req:[], desc:"+12% elemental damage." },
  "efficient mind": { tree:"Mage", req:["elemental attunement"], desc:"Spells cost 1 less energy." },
  "arcane surge": { tree:"Mage", req:["efficient mind"], desc:"+15% elemental damage and +1 max energy." },
  "lingering hex": { tree:"Mage", req:["arcane surge"], desc:"Your status effects last longer." },
};

const COMPANION_DEFS = {
  mira:{name:"Mira",role:"support",personality:"She writes while she fights, and never looks surprised.",joinChapter:0,baseHp:55,damage:[5,9],ai:"healer",
    joinText:"Mira closes her journal. \"If the road is going to keep changing, I should walk it with you.\"",
    bond:["She writes down the silences.","She shares the letter she never sent.","She gives you her field journal.","She asks to build a free archive."]},
  kael:{name:"Kael",role:"tank",personality:"A quiet bell-warden who would rather be hit than let you be hit.",joinChapter:2,baseHp:80,damage:[6,10],ai:"tank",
    joinText:"Kael rests his shield. \"Until the bells stop, I stand with you.\"",
    bond:["He admits he still listens for a vanished village.","He shows the cracked bell in his shield.","He fights for the future, not the past.","He hangs the mended bell beside the road."]},
  nyx:{name:"Nyx",role:"striker",personality:"A Null Expanse scout who treats silence as a weapon.",joinChapter:3,baseHp:48,damage:[8,13],ai:"dps",
    joinText:"Nyx appears from a missing patch of road. \"You notice deletions. So do I.\"",
    bond:["Their first name was erased.","They show a map fragment with one star.","They choose a name and ask you to remember it.","They find a refuge beyond the map."]},
};

const TOWNS = {
  wayrest:{name:"Wayrest",chapter:0,description:"A small inn and forge at the start of the Quiet Road."},
  frontier:{name:"Frontier Camp",chapter:1,description:"Canvas, coal smoke and a cracked sky."},
  ashmarket:{name:"Ashmarket",chapter:2,description:"Stalls beneath bells that nobody trusts."},
  annex:{name:"Archive Annex",chapter:6,description:"A reading room that sells things other lives left behind."},
};

const SIDE_QUESTS = {
  vermin:{name:"Vermin on the Road",target:"rat",need:5,reward:{xp:40,coin:40,potion:2}},
  quiet_road_pests:{name:"Green in the Grass",target:"mossling",need:3,reward:{xp:55,coin:35,"moon herb":2}},
  burrow_under_wayrest:{name:"Something Under the Cellar",target:"burrow rat",need:3,reward:{xp:75,coin:55,meat:2},requires:["quiet_road_pests"]},
  lanterns_out:{name:"Thieves in the Twilight",target:"lantern thief",need:2,reward:{xp:105,coin:75,"lantern glass":1},requires:["burrow_under_wayrest"]},
  roots_under_wayrest:{name:"The Old Road's Heart",target:"mossback guardian",need:1,reward:{xp:155,coin:120,"guardian bark":2,"moon herb":2},requires:["quiet_road_pests","burrow_under_wayrest","lanterns_out"]},
  quiet_arrows:{name:"No Safe Pass",target:"frontier marksman",need:2,reward:{xp:105,coin:85,"clockwork spring":2}},
  frontier_dispatch:{name:"Cut the Signal Line",target:"frontier outrider",need:3,reward:{xp:220,coin:150,"signal wire":2,"clockwork spring":2}},
  bell_silence:{name:"Silence the Second Bell",target:"bellbound acolyte",need:3,reward:{xp:180,coin:120,"black salt":3}},
  cathedral_chorus:{name:"A Voice in Every Bell",target:"bellbound cantor",need:3,reward:{xp:320,coin:240,"resonant bell":1,"black salt":2}},
  silent_bell:{name:"The Bell Without a Tongue",target:"the bell without a tongue",need:1,reward:{xp:700,coin:500,"bellshard maul":1},requires:["bell_silence","cathedral_chorus"]},
  missing_energy:{name:"A Hunger in the Null",target:"null leech",need:2,reward:{xp:260,coin:160,"void crystal":2}},
  star_glass_survey:{name:"A Sky in Pieces",target:"glasswing moth",need:4,reward:{xp:430,coin:260,"star glass":2,"ancient crystal":1}},
  ashen_reliquary:{name:"The Bell Beneath the Ash",target:"ashbound sentinel",need:3,reward:{xp:360,coin:220,"ember core":2,"black salt":2}},
  hollow_patrol:{name:"The Last Patrol",target:"hollow sentinel",need:3,reward:{xp:780,coin:460,"oath fragment":2,"ancient crystal":2}},
  unwritten_index:{name:"The Unwritten Index",target:"index hound",need:1,reward:{xp:520,coin:300,"soul shard":2,"ancient crystal":2}},
  far_edges:{name:"Where the Map Ends",target:"the lost cartographer",need:1,reward:{xp:1250,coin:850,"cartographer's compass":1},requires:["star_glass_survey","ashen_reliquary","hollow_patrol"]},
  overdue_books:{name:"Overdue by Several Lifetimes",target:"footnote mimic",need:1,reward:{xp:420,coin:240,"ancient crystal":2}},
};

const ACHIEVEMENTS = {
  first_blood:{name:"First Blood",desc:"Defeat your first enemy."},
  unnamed:{name:"A King Without a Name",desc:"Defeat the Unnamed King."},
  hunter:{name:"Hundredfold",desc:"Defeat 100 enemies."},
  witness:{name:"Seen",desc:"Defeat The Witness."},
  last_save:{name:"The File Closes",desc:"Defeat The Last Save."},
  party:{name:"Not Alone",desc:"Recruit every companion."},
  dedicated:{name:"Specialist",desc:"Complete a perk tree."},
  wealthy:{name:"Heavy Purse",desc:"Hold 1000 coin."},
  maker:{name:"Made by Hand",desc:"Craft a large collection of recipes."},
  mossback_slayer:{name:"Heart of the Old Road",desc:"Defeat the Mossback Guardian."},
  beyond_the_map:{name:"Beyond the Map",desc:"Defeat the Lost Cartographer."},
  unanswered:{name:"The Unanswered Bell",desc:"Defeat the Bell Without a Tongue."},
};

function ensureProgressionState(){
  GAME.progress ||= {
    quests:{}, companions:{recruited:[],active:[],affinity:{},bondStep:{}},
    achievements:{}, perks:[], storyMoments:[], faction:null, ending:null,
    hideout:{level:0,trophies:[]}, flags:{}, usedCombatItem:false,
  };
}

function questState(id){
  ensureProgressionState();
  return GAME.progress.quests[id] || {status:"locked",progress:0};
}

function questAvailable(id){
  const q=SIDE_QUESTS[id]; if(!q) return false;
  if((q.requires||[]).some((req)=>questState(req).status!=="done")) return false;
  return true;
}

function acceptQuest(id){
  ensureProgressionState();
  const q=SIDE_QUESTS[id]; if(!q) return false;
  const st=questState(id);
  if(st.status==="done"||st.status==="active") return false;
  if(!questAvailable(id)){ print("That quest is not available yet."); return false; }
  GAME.progress.quests[id]={status:"active",progress:0};
  print("QUEST ACCEPTED: "+q.name);
  print(q.target ? "Objective: defeat "+q.need+" × "+title(q.target)+"." : "");
  return true;
}

function recordQuestKill(name){
  ensureProgressionState();
  for(const [id,q] of Object.entries(SIDE_QUESTS)){
    const st=questState(id);
    if(st.status!=="active"||name!==q.target) continue;
    st.progress=Math.min(q.need,(st.progress||0)+1);
    if(st.progress>=q.need){
      st.status="done";
      GAME.progress.quests[id]=st;
      print("QUEST COMPLETE: "+q.name);
      for(const [reward,amount] of Object.entries(q.reward||{})){
        if(reward==="xp") giveXp(amount);
        else addItem(reward,amount,true);
      }
    } else GAME.progress.quests[id]=st;
  }
}

function recruitCompanion(id){
  ensureProgressionState();
  const c=COMPANION_DEFS[id]; if(!c||GAME.progress.companions.recruited.includes(id)) return;
  GAME.progress.companions.recruited.push(id);
  if(!GAME.progress.companions.active.length) GAME.progress.companions.active.push(id);
  print("COMPANION JOINED: "+c.name+" · "+c.role);
  print(c.joinText);
}

function changeBond(id, delta=10){
  ensureProgressionState();
  if(!GAME.progress.companions.recruited.includes(id)) return;
  const c=GAME.progress.companions;
  c.affinity[id]=clamp((c.affinity[id]||0)+delta,0,100);
  const step=Math.floor((c.affinity[id]||0)/25);
  const old=c.bondStep[id]||0;
  if(step>old){
    c.bondStep[id]=step;
    const line=COMPANION_DEFS[id]?.bond?.[step-1];
    if(line) print("MIRA_BOND".startsWith(COMPANION_DEFS[id].name.toUpperCase())?line:COMPANION_DEFS[id].name+" remembers: "+line);
  }
}

function awardAchievement(id){
  ensureProgressionState();
  if(!ACHIEVEMENTS[id]||GAME.progress.achievements[id]) return;
  GAME.progress.achievements[id]=Date.now();
  print("ACHIEVEMENT UNLOCKED: "+ACHIEVEMENTS[id].name);
  print(ACHIEVEMENTS[id].desc);
  addItem("coin",50,true);
}

function checkProgressionAchievements(){
  ensureProgressionState();
  const kills=GAME.flags.totalKills||0;
  if(kills>=1) awardAchievement("first_blood");
  if(kills>=100) awardAchievement("hunter");
  if(kills>=1000) awardAchievement("wealthy");
  if(GAME.flags.mossback) awardAchievement("mossback_slayer");
  if(GAME.flags.cartographer) awardAchievement("beyond_the_map");
  if(GAME.flags.bellTongue) awardAchievement("unanswered");
  if(GAME.flags.unnamedKing) awardAchievement("unnamed");
  if(GAME.flags.witness) awardAchievement("witness");
  if(GAME.flags.lastSave) awardAchievement("last_save");
  if(GAME.progress.companions.recruited.length>=3) awardAchievement("party");
  if(GAME.progress.perks.some((p)=>p==="iron counter"||p==="venomous"||p==="lingering hex")) awardAchievement("dedicated");
  if((GAME.inventory.coin||0)>=1000) awardAchievement("wealthy");
}

function showQuests(){
  ensureProgressionState();
  print("QUESTS");
  for(const [id,q] of Object.entries(SIDE_QUESTS)){
    const st=questState(id);
    const icon=st.status==="done"?"✓":st.status==="active"?"→":questAvailable(id)?"·":"🔒";
    print(icon+" "+q.name+" · "+(st.progress||0)+"/"+q.need);
  }
}

function showParty(){
  ensureProgressionState();
  print("PARTY");
  GAME.progress.companions.recruited.forEach((id)=>{
    const c=COMPANION_DEFS[id];
    print("  "+c.name+" · "+c.role+" · affinity "+(GAME.progress.companions.affinity[id]||0));
  });
  if(!GAME.progress.companions.recruited.length) print("  Nobody has joined yet.");
}

function showPerks(){
  ensureProgressionState();
  print("PERKS");
  ["Warrior","Rogue","Mage"].forEach((tree)=>{
    print("\n["+tree+"]");
    Object.entries(PERKS).filter(([,p])=>p.tree===tree).forEach(([id,p])=>{
      const owned=GAME.progress.perks.includes(id)?"✓":"·";
      print("  "+owned+" "+title(id)+" — "+p.desc);
    });
  });
}

function unlockPerk(id){
  ensureProgressionState();
  if(!PERKS[id]) return false;
  if(GAME.progress.perks.includes(id)){ print("Already learned."); return false; }
  const missing=PERKS[id].req.filter((req)=>!GAME.progress.perks.includes(req));
  if(missing.length){ print("Requires: "+missing.join(", ")); return false; }
  if(GAME.player.skillPoints<=0){ print("No perk points available."); return false; }
  GAME.player.skillPoints--;
  GAME.progress.perks.push(id);
  print("PERK LEARNED: "+title(id));
  recalcPlayer();
  return true;
}

function showTown(){
  ensureProgressionState();
  const zone=zoneAtX(GAME.player.x).biome;
  const town=GAME.player.x<50?TOWNS.wayrest:GAME.player.x<95?TOWNS.frontier:GAME.player.x<125?TOWNS.ashmarket:TOWNS.annex;
  print("TOWN · "+town.name);
  print(town.description);
  print("Resting restores HP and energy.");
  GAME.player.hp=GAME.player.maxHp; GAME.player.energy=GAME.player.maxEnergy;
  print("Rested.");
}
