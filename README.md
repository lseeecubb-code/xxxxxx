# TER-RPG

TER-RPG is a Terraria-inspired 2D sandbox RPG built with the same simple, browser-first structure as THE LAST SAVE: an index.html entry point with the game split into focused JavaScript files.

The project combines:
- a Terraria-style sandbox world
- mining, building, exploration, movement, caves and procedural terrain
- real-time enemy combat
- the RPG systems and content from THE LAST SAVE
- a terminal command layer for inspecting and controlling the world
- browser saves

## Play

Open index.html in a modern browser, or host the repository with GitHub Pages or another static web server.

There is no backend required for the current prototype. Save data is stored locally in the browser.

## Controls

### World

| Control | Action |
| --- | --- |
| W / Up Arrow / Space | Jump |
| A / Left Arrow | Move left |
| D / Right Arrow | Move right |
| Mouse left | Mine a block or attack a targeted enemy |
| Mouse right | Place the selected block |
| 1-9 | Select a hotbar slot |
| E | Attack |
| Q | Cast the first known spell |
| F | Use a potion |
| Shift | Brief guard window |
| I | Inventory |
| C | Crafting |
| / | Focus the terminal command input |

### Terminal commands

Type commands into the terminal at the bottom of the screen.

    help
    explore
    mine
    place dirt
    inventory
    craft iron sword
    recipes
    fight goblin
    attack
    spell ember spark
    use potion
    equip iron sword
    stats
    bestiary
    quests
    party
    perks
    story
    guide
    chronicle
    town
    save
    load
    new

## RPG systems

TER-RPG carries over the turn-based game's data-driven RPG concepts, adapted for real-time play.

### Combat

Enemies use the same broad content model as THE LAST SAVE:
- enemy-specific attacks
- accuracy and attack types
- poison, burn, bleed, slow and weakened status effects
- elemental weaknesses
- healing and defensive abilities
- elite encounters
- boss openings
- attack-triggered scenes
- enemy drops and experience

Combat scenes are routed through scenes.js, keeping combat data separate from presentation.

### Character progression

The project includes Strength, Agility, Vitality, Focus, level and XP, weapon skills, spells, perks, equipment bonuses, critical hits, dodge and defense, and energy.

The perk trees include Warrior, Rogue and Mage paths.

### Items and crafting

The RPG content files provide a large pool of weapons, armor, shields and offhands, headgear, boots, trinkets, consumables, crafting materials, monster parts, crystals and cores, and recipes.

Use:
    recipes
    recipes <search>
    craft <item> [amount]
    inventory
    equip <item>
    use <item>

## World

The sandbox world is generated from a seed and divided into themed regions such as:
1. The Quiet Road
2. The Broken Frontier
3. The Cathedral of Ash
4. The Null Expanse
5. The Hollow Kingdom

The world currently contains several block and material types, caves, ore generation, surface vegetation, trees, a day/night cycle, enemies, and a camera that follows the player.

The world layer is intentionally independent from the terminal layer so more sandbox mechanics can be added without rewriting the command system.

## Story

The campaign structure follows the turn-based game's chapter progression while allowing the player to explore the sandbox between major encounters.

The current story framework includes 11 chapters, chapter bosses, a campaign chronicle and three endings:
- Remember
- Release
- Rewrite

Terminal commands:
    story
    guide
    chronicle
    ending

## Companions, quests and achievements

The port includes a foundation for Mira, Kael and Nyx, side quests, companion affinity and bond scenes, perk progression, achievements, towns and resting, campaign flags and progression.

These systems are connected to the sandbox so victories and exploration can contribute to RPG progression.

## Saves

Save data is stored in browser local storage.

Commands:
    save
    load
    new

The save includes the generated world, player state, inventory, enemies, discovered content, RPG progression and story state.

## Project structure

    TER-RPG/
    ├── index.html       # page entry point and script loading
    ├── styles.css       # black terminal/sandbox UI styling
    ├── index.js         # browser bootstrap and terminal command router
    ├── helpers.js       # shared state, stats, items and utility helpers
    ├── world.js         # terrain generation, movement, mining, building and rendering
    ├── combat.js        # real-time combat, spells, effects and scene hooks
    ├── crafting.js      # crafting bridge using RPG recipes
    ├── systems.js       # perks, companions, quests, towns and achievements
    ├── story.js         # chapter progression, chronicle and endings
    ├── save.js          # browser save/load/new-game handling
    ├── items.js         # weapons, armor, consumables, recipes and shop data
    ├── monsters.js      # enemy and boss data
    └── scenes.js        # centralized openings and attack scene mappings

## Architecture

The game intentionally follows the same straightforward style as THE LAST SAVE:

    index.html
       └── index.js
            ├── helpers.js
            ├── world.js
            ├── combat.js
            ├── crafting.js
            ├── systems.js
            ├── story.js
            ├── save.js
            ├── items.js
            ├── monsters.js
            └── scenes.js

The goal is to keep data and systems separated, so new blocks, enemies, weapons, bosses, quests and scenes can be added without turning the entire game into one file.

## Current status

This is an active prototype/foundation, not a finished Terraria replacement.

The current implementation establishes the core sandbox + RPG architecture and ports a substantial amount of the turn-based game's content. Larger Terraria-style systems such as a much bigger world, more biomes, extensive NPC simulation, wiring, liquids, advanced building, more boss behavior, multiplayer and the full breadth of Terraria content still need to be developed.

## Inspiration and content

TER-RPG is intended as an original Terraria-inspired project using its own implementation and presentation. It does not include Terraria's proprietary source code or copied game assets.

THE LAST SAVE's original gameplay data is being reused and adapted as part of the connected RPG design in this repository.