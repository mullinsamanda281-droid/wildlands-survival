## Low-Poly Survival Game - TODO Queue

### Cycle 1: Foundation & Core Systems

### CRITICAL
TODO-001: Initialize Vite project with Three.js renderer and basic three.js setup
- [x] Vite configured with Three.js (base: process.env.GITHUB_PAGES_BASE || '/')
- [x] Basic renderer, camera, and render loop
- [x] index.html with canvas
- [x] GitHub Pages base path configured dynamically

TODO-002: First-person camera with pointer lock and mouse look
- [x] Pointer lock implementation
- [x] Mouse look / camera rotation
- [x] Movement direction based on camera orientation
- [x] WASD movement with camera-relative direction
- [x] Sprint (Shift), Jump (Space), gravity, ground detection

TODO-003: Basic low-poly terrain generation (heightmap + biomes)
- [x] Procedural heightmap generation with vertex displacement
- [x] Biome distribution (grass, rock, sand areas)
- [x] Simple low-poly geometry with flat shading
- [x] Terrain height detection for collision

TODO-004: Player stats system (health, hunger, thirst, stamina)
- [x] Stat variables with depletion rates
- [x] UI display for stats in HUD
- [x] Death condition when health reaches 0
- [x] Hunger/thirst/stamina depletion over time

### HIGH
TODO-005: Day/night cycle with lighting changes
- [x] Sun/moon position animation
- [x] Sky color transition from day to night
- [x] Fog density changes
- [x] Time-of-day affects visibility and wildlife behavior

### MEDIUM
TODO-006: Resource system - wood, stone, metal nodes
- [x] Wood trees with gathering interaction
- [x] Stone rocks with mining interaction
- [x] Metal ore nodes with harvesting
- [x] Resource health and amount system
- [x] Gathering interaction from camera raycast
- [x] Respawn timer basics

TODO-007: Inventory system with hotbar
- [x] Item slots and stacking (max 99 per slot)
- [x] Hotbar (1-9 keys)
- [x] TAB to open/close inventory
- [x] Item pickup adds to inventory
- [x] Item drop removes from inventory

TODO-008: Crafting system basics
- [x] Recipe database (minimum 5 recipes implemented)
- [x] Crafting UI (hotkey C opens crafting, grid display)
- [x] Consume resources, create item (basic crafting)

TODO-009: Building system - foundation and wall placement
- [x] Building types: foundation, wall, floor
- [x] Grid snapping preview ghost
- [x] Valid/invalid placement feedback (green/red)
- [x] Resource consumption on place
- [x] Hotkey 1-3 to select building type

### DEPLOYMENT
TODO-010: GitHub Actions workflow for GitHub Pages
- [x] Deploy.yml configured with npm ci, npm run build, upload dist
- [x] GITHUB_PAGES_BASE environment variable set for Vite base path
- [x] peaceiris/actions-gh-pages@v4 workflow configured
- [x] Verify deployment configuration with subpath base URL

## Cycle 2: Gameplay Systems

### CRITICAL
TODO-011: Gathering system - trees, rocks, resource nodes
- [x] Raycast interaction from camera (implemented via [E] gather)
- [x] [E] prompt for gathering (visual feedback)
- [x] Resource depletion and inventory addition

TODO-012: Combat system - melee and ranged
- [x] Left mouse melee attack (cooldown system)
- [x] Right mouse bow shot (cooldown system)
- [x] Attack cooldown system implemented
- [x] Damage numbers/hit feedback (screen-center floating text)
- [x] Enemy health and death system (wildlife health, remove + respawn)

### HIGH
TODO-013: Wildlife AI - deer, boar basic states
- [x] Wander state with distance-based behavior
- [x] Flee when player approaches (within 30 units)
- [x] Chase when player nearby (within 100 units)
- [x] Simple distance-based AI with wander timer
- [x] Performance-friendly reset far from player
- [x] updateWildlifeAI wired into render loop with deltaTime

### MEDIUM
TODO-014: Save/load system using localStorage
- [x] Save game state (seed, position, stats, inventory, resources)
- [x] Load game
- [x] New game option
- [x] F2 to save, F3 to load hotkeys

### LOW
TODO-015: Quality settings (low/medium/high)
- [x] Shadow toggle (directionalLight.castShadow enabled/disabled)
- [x] Draw distance control (terrain grid size adjustment)
- [x] Vegetation density (tree/rock count adjustment)

## Cycle 3: Polish & Release

### HIGH
TODO-016: UI/UX polish - HUD, crosshair, inventory screen
- [x] Survival HUD (health, hunger, thirst, stamina) - implemented in index.html
- [x] Crosshair - implemented in index.html
- [x] Crafting building UI - implemented

### MEDIUM
TODO-017: Sound system - footsteps, ambient, UI clicks
- [x] WebAudio setup - initAudio() function implemented
- [x] Footstep sounds based on material - grass/dirt/rock/sand/wood/metal detection
- [x] Ambient ocean/wind - initAmbientSounds() and updateAmbientSounds() implemented

### LOW
TODO-018: Debug F3 mode with FPS counter
- [x] FPS counter overlay (green, top-right, toggled with F3)
- [x] Toggle visibility

### DEPLOYMENT
TODO-019: Final GitHub Pages verification
- [x] Custom domain if applicable - N/A
- [x] Asset path verification under subpath - confirmed with GITHUB_PAGES_BASE
- [x] Mobile browser compatibility check - basic compatibility verified

## Cycle 4: Code Quality / Deconfliction (CURRENT)

### CRITICAL
TODO-020: Fix corrupted main.js from repeated appends
- [x] Remove duplicate rotation declarations (const + let)
- [x] Remove mid-file export statements
- [x] Fix undefined variables (intersected, inventory, updateInventoryUI, closeInventory)
- [x] Fix UI elements referenced by animate() before declaration
- [x] Wire updateWildlifeAI into the render loop with deltaTime
- [x] Fix wildlife entity speed reference (entity.userData -> entity.speed)
- [x] Fix damage number screen coordinates (screenX/screenY -> viewport center)
- [x] Fix weapon attacks to hit wildlife (not just resources)
- [x] Compact 1075+ lines -> 701 lines with all systems intact
- [x] Verify production build passes

TODO-021: Fix vite.config.js rolloutOptions typo
- [x] rolloutOptions -> rollupOptions so asset naming applies

### BLOCKED
TODO-022: Push to GitHub and verify live deployment
- [x] git init + remote + initial commit
- [ ] Trigger GitHub Actions workflow
- [ ] Verify deployed URL serves the game
- [ ] Git repo initialized locally; remote push requires GitHub credentials

## FOLLOW-UP IDEAS (next audit)
- [x] Add crafting recipes that consume gathered wood/stone/metal
- [x] Building resource cost enforcement (currently free placement)
- [x] Hunting loot drops from wildlife
- [x] Add player stats depletion wired to gameplay + death screen
- [x] Add hunger/thirst item consumption (berries, cooked meat)
- [x] Add berry bushes as gatherable food source
- [x] Health bar + hunger/thirst bars in HUD with IDs
- [x] Add water source for thirst (pond/river interact)
- [x] Add melee damage from wildlife attacking the player
- [x] Edge clamping for wildlife spawn/reset to stay in-bounds
- [x] Add tools with durability (hatchet -> faster wood, pickaxe -> faster stone, spear -> melee) [tribals.io/oxide core loop]
- [ ] Add hunting skinning loot (leather, bones) and bone armor / bandages [oxide]
- [x] Add building tier upgrades wood->stone->metal [oxide]
- [x] Add health recovery: bandages crafted from cloth
- [x] Add more wildlife variety (chicken passive, bear aggressive) [tribals.io]
- [x] Add cooking mechanic (campfire converts wood->cooked_meat)
- [x] Add arrow projectile visual instead of hitscan
- [x] Add more wildlife variety (chicken passive, bear aggressive) [tribals.io]
- [x] Add raw meat drops + cooked/raw food chain
- [x] Add bandage healing mechanic
- [x] Add tool hotkeys 4/5/6 (axe/pickaxe/spear)
- [ ] Add unit tests or at minimum a smoke-test script
- [ ] Add fog distance + shadow quality settings toggles in-game
- [x] Add campfire cooking station + recipe
- [x] Add bow ammunition requirement (arrows crafted from wood/stone)
- [ ] Add wolf pack behavior (multiple wolves attack together)
- [ ] Add multiplayer notes: party/clan systems (out of scope for static single-player, record as future)
- [ ] Add building decay + toolbox upkeep [tribals.io/oxide] (out of scope for single-player, record as future)
- [ ] Add experience/leveling via crafting [tribals.io]
## Cycle 5: tribals.io / Oxide Reference Alignment (COMPLETE)
GOAL: Match the Rust-style survival loop from tribals.io and Oxide references.
- [x] Fixed corrupted main.js (duplicate decls, mid-file exports, undefined vars, AI never called)
- [x] Tools with durability: stone axe (4=wood fast), stone pickaxe (5=stone fast), spear (6=melee dmg)
- [x] Tool hotkeys 4/5/6, durability display in HUD + inventory
- [x] Building tier upgrades wood->stone->metal via [U] on facing building
- [x] Bandages craftable + [V] heal 30hp
- [x] Campfire [G] build + [T] cook meat (consumes wood)
- [x] Arrow ammo requirement for bow (craft arrows)
- [x] Wildlife variety: chicken (passive, fast), bear (aggressive, tanky 15dmg)
- [x] Raw meat + cooked meat food chain, meat drops from hunting
- [x] Berry bushes, pond drinking [Q]
- [x] Building costs enforced from inventory
- [x] Base and subpath (GitHub Pages) production builds verified

NEXT: git init + push for live deployment (blocked on user credentials) or
deeper content expansion (XP/levels, more biomes, larger map).
