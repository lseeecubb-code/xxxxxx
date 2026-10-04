// Campaign structure adapted from THE LAST SAVE for the sandbox world.
// The player can explore freely; entering deeper regions and defeating story bosses advances chapters.

const STORY_CHAPTERS = [
  {id:0,title:"The Quiet Road",area:"The Quiet Road",level:1,summary:"A road, an inn, and the first page of a broken world.",objective:"Reach the deeper road and survive your first hunts."},
  {id:1,title:"The Broken Frontier",area:"The Broken Frontier",level:3,summary:"The road gives way to camps, scouts and rusted machines.",objective:"Push into the frontier and defeat its warband threats."},
  {id:2,title:"The Cathedral of Ash",area:"The Cathedral of Ash",level:5,summary:"Ash falls upward beneath bells that remember older names.",objective:"Silence the Cathedral's sentinels and find what answers the bell."},
  {id:3,title:"The Null Expanse",area:"The Null Expanse",level:7,summary:"A region where terrain and memory refuse to agree.",objective:"Cross the Expanse and survive its missing pieces."},
  {id:4,title:"The Unfinished Room",area:"The Null Expanse",level:9,summary:"Walls appear only when you stop looking at them.",objective:"Explore the unfinished spaces and recover a way forward."},
  {id:5,title:"Outside the World",area:"The Hollow Kingdom",level:11,summary:"The map ends, but the world keeps generating.",objective:"Find the first hero's trail beyond the known map."},
  {id:6,title:"The Archive of Attempts",area:"The Hollow Kingdom",level:13,summary:"Every failed journey is catalogued somewhere.",objective:"Recover the catalogue and confront the Archive's guardians."},
  {id:7,title:"The Hollow Kingdom",area:"The Hollow Kingdom",level:16,summary:"A kingdom with nobody left to rule it.",objective:"Rebuild a route through the hollow lands."},
  {id:8,title:"The Margin",area:"The Hollow Kingdom",level:18,summary:"The page edges become a playable place.",objective:"Survive the redline and its wardens."},
  {id:9,title:"The Blank Page",area:"The Hollow Kingdom",level:20,summary:"There is room here for one final rewrite.",objective:"Reach the blank page and defeat its authoring forces."},
  {id:10,title:"The Last Autosave",area:"The Hollow Kingdom",level:22,summary:"The final save point waits beyond the last rendered room.",objective:"Defeat The Last Save and choose what remains."},
];

const STORY_BOSSES = {
  0:"goblin king",
  1:"orc warlord",
  2:"the bell without a tongue",
  3:"the watcher",
  4:"the leftover",
  5:"the first hero",
  6:"the archivist",
  7:"the hollow sentinel",
  8:"margin warden",
  9:"the author",
  10:"the last save",
};

const ENDINGS = {
  remember:{title:"REMEMBER",text:"You keep the old world visible. The road is difficult, but nothing is quietly erased."},
  release:{title:"RELEASE",text:"You let the old world go. The blank space becomes room for something new."},
  rewrite:{title:"REWRITE",text:"You alter the final rules. The world survives, but it no longer behaves exactly as before."},
};

function ensureStory(){
  GAME.story ||= {chapter:0,ending:null,moments:[],started:false,completed:false};
}

function storyIntro(){
  ensureStory();
  if(GAME.story.started) return;
  GAME.story.started=true;
  print("============================================================");
  print("THE LAST SAVE · SANDBOX EDITION");
  print("============================================================");
  print("A world has been generated beneath the terminal.");
  print("Mine it. Build it. Fight what approaches.");
  print("Mira's first note: the road is already changing.");
  print("Type 'story' to see the campaign route.");
}

function currentChapter(){ ensureStory(); return STORY_CHAPTERS[GAME.story.chapter]; }

function storyOnKill(name){
  ensureStory();
  const boss=STORY_BOSSES[GAME.story.chapter];
  if(name!==boss) return;
  const chapter=currentChapter();
  if(GAME.player.level<chapter.level) return;
  GAME.story.moments.push("Defeated "+title(name)+" in Chapter "+chapter.id+".");
  if(chapter.id>=STORY_CHAPTERS.length-1){
    GAME.story.completed=true;
    GAME.flags.lastSave=true;
    print("THE FINAL SAVE HAS BEEN DEFEATED.");
    print("Type 'ending' to choose: remember / release / rewrite.");
    return;
  }
  GAME.story.chapter++;
  const next=currentChapter();
  print("CHAPTER ADVANCED → "+next.id+" · "+next.title);
  print(next.summary);
  print("OBJECTIVE: "+next.objective);
}

function showStory(){
  ensureStory();
  const c=currentChapter();
  print("STORY · CHAPTER "+c.id+" — "+c.title);
  print(c.area+" · recommended level "+c.level);
  print(c.summary);
  print("OBJECTIVE: "+c.objective);
  print("BOSS: "+title(STORY_BOSSES[c.id]));
  print("Progress through the sandbox naturally; story bosses can be summoned with 'fight <boss>'.");
}

function showGuide(){
  ensureStory();
  print("CAMPAIGN ROUTE");
  STORY_CHAPTERS.forEach((c)=>print((c.id<GAME.story.chapter?"✓":c.id===GAME.story.chapter?"→":"·")+" "+c.id+" · "+c.title+" · Lv "+c.level+" · "+title(STORY_BOSSES[c.id])));
}

function showEnding(){
  ensureStory();
  if(!GAME.story.completed){ print("The final choice is still locked. Defeat The Last Save first."); return; }
  if(GAME.story.ending){ print(ENDINGS[GAME.story.ending].title); print(ENDINGS[GAME.story.ending].text); return; }
  print("ENDING");
  print("remember · release · rewrite");
  GAME.awaitingEnding=true;
}

function chooseEnding(name){
  ensureStory();
  const key=String(name||"").trim().toLowerCase();
  if(!ENDINGS[key]) return false;
  GAME.story.ending=key;
  GAME.story.moments.push("Ending chosen: "+key+".");
  print(ENDINGS[key].title);
  print(ENDINGS[key].text);
  return true;
}

function showChronicle(){
  ensureStory();
  print("CAMPAIGN CHRONICLE");
  (GAME.story.moments||[]).slice(-20).forEach((m)=>print("  "+m));
  if(!(GAME.story.moments||[]).length) print("  No major moments recorded yet.");
  if(GAME.story.ending) print("Ending: "+title(GAME.story.ending));
}
