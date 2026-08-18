import * as THREE from 'three';

const canvas = document.querySelector('#three-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = qualitySetting !== "low";
scene.add(directionalLight);
const sun = new THREE.Object3D();
sun.position.set(50, 50, 50);
scene.add(sun);
const fog = new THREE.Fog(0x87ceeb, 10, 200);
scene.fog = fog;
const qualitySetting = 'medium'; // low / medium / high
directionalLight.castShadow = qualitySetting !== 'low';
const skyColor = new THREE.Color(0x87ceeb);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let audioContext = null;
let footstepGain = null;
let lastFootstepTime = 0;
const footstepCooldown = 200;
let ambientOscillator = null;
let windOscillator = null;
let lastWindChange = 0;

const materialPresets = {
  grass: { lowpassFreq: 800, gain: 0.5 },
  dirt: { lowpassFreq: 600, gain: 0.6 },
  rock: { lowpassFreq: 400, gain: 0.4 },
  sand: { lowpassFreq: 700, gain: 0.5 },
  wood: { lowpassFreq: 500, gain: 0.5 },
  metal: { lowpassFreq: 300, gain: 0.3 },
  default: { lowpassFreq: 700, gain: 0.5 }
};

function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    footstepGain = audioContext.createGain();
    footstepGain.gain.value = 0.5;
    footstepGain.connect(audioContext.destination);
  } catch (e) {
    console.error('Web Audio API not supported', e);
  }
}

function createFootstepOscillator(freq, gainValue) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = freq;
  gainNode.gain.value = gainValue;
  oscillator.connect(gainNode);
  gainNode.connect(footstepGain);
  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(gainValue, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
}

function playFootstep(materialType) {
  if (!audioContext || !footstepGain) return;
  const now = audioContext.currentTime;
  if (now - lastFootstepTime < footstepCooldown / 1000) return;
  lastFootstepTime = now * 1000;
  const preset = materialPresets[materialType] || materialPresets.default;
  const freq = (200 + Math.random() * 100) * (0.8 + Math.random() * 0.4);
  const bufferSize = audioContext.sampleRate * 0.1;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;
  noise.connect(footstepGain);
  noise.start(now);
  noise.stop(now + 0.1);
  createFootstepOscillator(freq, preset.gain * 0.3);
}

function initAmbientSounds() {
  if (!audioContext) return;
  if (!ambientOscillator) {
    const oceanNode = audioContext.createOscillator();
    const oceanGain = audioContext.createGain();
    oceanNode.frequency.value = 0.2;
    oceanNode.type = 'triangle';
    oceanGain.gain.value = 0.1;
    oceanNode.connect(oceanGain);
    oceanGain.connect(footstepGain);
    oceanNode.start();
    ambientOscillator = oceanGain;
  }
  if (!windOscillator) {
    const windNode = audioContext.createBufferSource();
    const bufferSize = audioContext.sampleRate * 0.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    windNode.buffer = buffer;
    windNode.loop = true;
    const windGain = audioContext.createGain();
    windGain.gain.value = 0.05;
    const lastTime = audioContext.currentTime;
    windGain.gain.setValueAtTime(0.05, lastTime);
    windGain.gain.exponentialRampToValueAtTime(0.001, lastTime + 10);
    windNode.connect(windGain);
    windGain.connect(footstepGain);
    windNode.start();
    windOscillator = windGain;
  }
}

function updateAmbientSounds() {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  if (ambientOscillator) {
    const dayProgress = (gameTime * 0.001) % (2 * Math.PI);
    const isDay = dayProgress > 0.2 && dayProgress < 0.8;
    ambientOscillator.frequency.value = (isDay ? 0.15 : 0.08) + Math.random() * 0.02;
  }
  if (windOscillator && now - lastWindChange > 3) {
    if (windOscillator.context) windOscillator.gain.gain.value = 0.02 + Math.random() * 0.03;
    lastWindChange = now;
  }
}

const terrainSize = 500;
const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 50, 50);
terrainGeometry.rotateX(-Math.PI / 2);
const terrainVertices = terrainGeometry.attributes.position.array;
for (let i = 0; i < terrainVertices.length; i += 3) {
  terrainVertices[i + 1] += (Math.random() - 0.5) * 20;
}
const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({ color: '#8b5a2b', flatShading: true }));
terrain.receiveShadow = true;
scene.add(terrain);

function getTerrainHeight(x, z) {
  const positions = terrainGeometry.attributes.position.array;
  if (!positions) return 0;
  const gridSize = 50;
  const vertexX = Math.max(0, Math.min(gridSize - 1, Math.round((x + terrainSize / 2) / (terrainSize / gridSize))));
  const vertexZ = Math.max(0, Math.min(gridSize - 1, Math.round((z + terrainSize / 2) / (terrainSize / gridSize))));
  const idx = (vertexZ * gridSize + vertexX) * 3;
  return idx >= 0 && idx + 2 < positions.length ? positions[idx + 1] : 0;
}

function getFootstepMaterial(x, z) {
  const y = getTerrainHeight(x, z);
  if (y > 10) return 'rock';
  if (y > 5) return 'dirt';
  return 'grass';
}

let pointerLocked = false;
const rotation = new THREE.Euler();

document.body.addEventListener('click', () => {
  if (!pointerLocked) {
    canvas.requestPointerLock();
    initAudio();
    initAmbientSounds();
  }
});
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
});
document.addEventListener('pointerlockerror', (err) => {
  console.error('Pointer lock error:', err.message);
});
document.addEventListener('mousemove', (event) => {
  if (!pointerLocked) return;
  rotation.y -= event.movementX * 0.002;
  rotation.x -= event.movementY * 0.002;
  rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.x));
});

const moveDirection = new THREE.Vector3();
const velocity = new THREE.Vector3();
const SPEED = 0.2;
const SPRINT_MULTIPLIER = 1.5;
let isSprinting = false;
let canJump = true;
const gravity = -0.02;
let playerY = 1.6;
let hunger = 100;
let thirst = 100;
let stamina = 100;
const HUNGER_DEPLETION_RATE = 0.01; // per second
const THIRST_DEPLETION_RATE = 0.015; // per second
const STAMINA_DEPLETION_RATE = 0.005; // per second, increases when sprinting
const HUNGER_DEATH_THRESHOLD = 0;

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveDirection.z -= 1; break;
    case 'KeyS': moveDirection.z += 1; break;
    case 'KeyA': moveDirection.x -= 1; break;
    case 'KeyD': moveDirection.x += 1; break;
    case 'ShiftLeft': isSprinting = true; break;
    case 'Space': if (canJump && pointerLocked) { velocity.y = 0.4; canJump = false; } break;
    case 'KeyE': gatherResource(); break;
    case 'Tab': event.preventDefault(); toggleInventory(); break;
    case 'F2': saveGame(); break;
    case 'F3': toggleFps(); break;
  }
});
document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': moveDirection.z += Math.abs(moveDirection.z) > 0 ? -moveDirection.z : 0; break;
    case 'KeyS': moveDirection.z -= Math.abs(moveDirection.z) > 0 ? moveDirection.z : 0; break;
    case 'KeyA': moveDirection.x += Math.abs(moveDirection.x) > 0 ? -moveDirection.x : 0; break;
    case 'KeyD': moveDirection.x -= Math.abs(moveDirection.x) > 0 ? moveDirection.x : 0; break;
    case 'ShiftLeft': isSprinting = false; break;
  }
});
document.addEventListener('keydown', (event) => {
  if (event.code === 'Key1') selectedBuilding = 'foundation';
  if (event.code === 'Key2') selectedBuilding = 'wall';
  if (event.code === 'Key3') selectedBuilding = 'floor';
  if (event.code === 'KeyB') selectedBuilding = null;
});
document.addEventListener('mousedown', (event) => {
  if (!pointerLocked) return;
  if (event.button === 0) { meleeAttack(); placeBuilding(); }
  if (event.button === 2) bowShot();
});

const resources = [];
const treeTypes = [
  { name: 'oak', color: '#8b4513', height: 20 },
  { name: 'pine', color: '#2c5f2d', height: 18 },
  { name: 'birch', color: '#e0e0e0', height: 15 },
];
const rockTypes = [{ name: 'rock', color: '#b87333', size: 8 }];
const oreTypes = [
  { name: 'copper', color: '#b87333', size: 5 },
  { name: 'iron', color: '#da825a', size: 5 },
  { name: 'silver', color: '#c0c0c0', size: 5 },
];

function createResources(count, type) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 200;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    let mesh, amount;
    if (type === 'wood') {
      const t = treeTypes[Math.floor(Math.random() * treeTypes.length)];
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 2, t.height, 8, 1, true),
        new THREE.MeshStandardMaterial({ color: t.color, flatShading: true })
      );
      trunk.position.set(x, t.height / 2, z);
      trunk.castShadow = true;
      scene.add(trunk);
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(t.height * 0.6, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x228b22, transparent: true, opacity: 0.8 })
      );
      leaves.position.set(x, t.height + 2, z);
      scene.add(leaves);
      mesh = trunk; amount = 10;
    } else if (type === 'stone') {
      const r = rockTypes[0];
      mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r.size, 0),
        new THREE.MeshStandardMaterial({ color: r.color, flatShading: true })
      );
      mesh.position.set(x, r.size, z);
      mesh.castShadow = true;
      scene.add(mesh);
      amount = 5;
    } else {
      const o = oreTypes[Math.floor(Math.random() * oreTypes.length)];
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(o.size, 12, 12),
        new THREE.MeshStandardMaterial({ color: o.color, flatShading: true })
      );
      mesh.position.set(x, o.size, z);
      mesh.castShadow = true;
      scene.add(mesh);
      amount = 3;
    }
    resources.push({
      id: `${type}_${i}`, type, maxAmount: amount, currentAmount: amount,
      position: { x, z }, node: mesh, gathered: false
    });
  }
}

function createBerryBushes() {
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 120;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(2, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#4d7c2e', flatShading: true })
    );
    bush.position.set(x, 2, z);
    bush.castShadow = true;
    scene.add(bush);
    const berries = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 6, 6),
      new THREE.MeshBasicMaterial({ color: '#c0392b' })
    );
    berries.position.set(x + 1, 3, z);
    scene.add(berries);
    resources.push({
      id: `berry_${i}`, type: 'berries', maxAmount: 5, currentAmount: 5,
      position: { x, z }, node: bush, gathered: false
    });
  }
}

createResources(50, 'wood');
createResources(30, 'stone');
createResources(20, 'metal');
createBerryBushes();

// Water pond - drink to restore thirst
const pond = new THREE.Mesh(
  new THREE.CircleGeometry(15, 24),
  new THREE.MeshStandardMaterial({ color: '#1a5276', flatShading: true, transparent: true, opacity: 0.7 })
);
pond.rotation.x = -Math.PI / 2;
pond.position.set(60, 0.3, -60);
scene.add(pond);
const pondRim = new THREE.Mesh(
  new THREE.TorusGeometry(15, 0.8, 6, 24),
  new THREE.MeshStandardMaterial({ color: '#5d6d7e', flatShading: true })
);
pondRim.rotation.x = -Math.PI / 2;
pondRim.position.set(60, 0.1, -60);
scene.add(pondRim);

const waterPos = { x: 60, z: -60, radius: 15 };

function drinkWater() {
  const dx = camera.position.x - waterPos.x;
  const dz = camera.position.z - waterPos.z;
  if (Math.sqrt(dx * dx + dz * dz) < waterPos.radius + 2) {
    playerStats.thirst = Math.min(100, playerStats.thirst + 40);
    updateStatsUI();
    console.log('Drank water');
    return true;
  }
  console.log('No water nearby');
  return false;
}

let canGather = true;
let lastGatherTime = 0;
const gatherCooldown = 500;

function findResource(hit) {
  for (const r of resources) {
    if (r.gathered) continue;
    if (r.node === hit || (r.node.children && r.node.children.includes(hit))) return r;
  }
  return null;
}

function gatherResource() {
  if (!pointerLocked || !canGather) return;
  const now = Date.now();
  if (now - lastGatherTime < gatherCooldown) return;
  const raycaster = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  raycaster.set(camera.position, dir);
  raycaster.far = 5;
  const intersects = raycaster.intersectObjects(resources.filter(r => !r.gathered).map(r => r.node), true);
  if (intersects.length > 0) {
    const r = findResource(intersects[0].object);
    if (r && r.currentAmount > 0) {
      r.currentAmount--;
      addToInventory(r.type, 1);
      addXp(2);
      flashMesh(r.node);
      lastGatherTime = now;
      useToolForGather(r.type);
      if (r.currentAmount <= 0) {
        r.gathered = true;
        setTimeout(() => {
          const idx = resources.indexOf(r);
          if (idx > -1) resources.splice(idx, 1);
        }, 1000);
      }
    }
  }
}

function flashMesh(mesh) {
  if (!mesh) return;
  mesh.scale.set(1.1, 1.1, 1.1);
  setTimeout(() => { if (mesh) mesh.scale.set(1, 1, 1); }, 50);
}

let inventory = [];
const ITEM_COLORS = { wood: '#8b4513', stone: '#b87333', metal: '#c0c0c0' };

function addToInventory(type, count = 1) {
  const slot = inventory.find(i => i.type === type && i.count < 99);
  if (slot) slot.count += count;
  else inventory.push({ id: type + '_' + Date.now(), type, count });
  updateInventoryUI();
}

function updateInventoryUI() {
  const slots = document.querySelectorAll('#inventory .slot, .inventory .slot');
  slots.forEach(slot => { slot.innerHTML = ''; });
  inventory.forEach((item, i) => {
    if (slots[i]) {
      const toolInfo = item.type === equippedTool && TOOL_DEFS[item.type]
        ? ` <span style="color:#e8c54a;font-size:10px;">(${item.durability ?? TOOL_DEFS[item.type].durability})</span>` : '';
      slots[i].innerHTML = `<span style="color:${ITEM_COLORS[item.type] || '#fff'};font-weight:bold;">${item.type}${toolInfo}</span>`;
    }
  });
}

const inventoryPanel = document.getElementById('inventory');
function toggleInventory() {
  if (inventoryPanel) inventoryPanel.style.display = inventoryPanel.style.display === 'none' ? 'block' : 'none';
}
function closeInventory() {
  if (inventoryPanel) inventoryPanel.style.display = 'none';
}

// ----- TOOLS & EQUIPMENT -----
let equippedTool = null;
const TOOL_DEFS = {
  stone_axe: { type: 'wood', damage: 2, durability: 40, color: '#8b5a2b', name: 'Stone Axe' },
  stone_pickaxe: { type: 'stone', damage: 2, durability: 40, color: '#6b7b8d', name: 'Stone Pickaxe' },
  spear: { type: 'metal', damage: 12, durability: 30, color: '#c0c0c0', name: 'Spear' }
};

function equipTool(id) {
  const has = inventory.some(i => i.type === id);
  if (!has) { console.log(`No ${TOOL_DEFS[id]?.name || id} to equip`); return; }
  equippedTool = equippedTool === id ? null : id;
  console.log(equippedTool ? `Equipped ${TOOL_DEFS[id].name}` : 'Unequipped tool');
}

function useToolForGather(gatheredType) {
  if (!equippedTool || !TOOL_DEFS[equippedTool]) return;
  const tool = TOOL_DEFS[equippedTool];
  if (tool.type === gatheredType) {
    for (let i = 0; i < tool.damage - 1; i++) addToInventory(gatheredType, 1);
  }
  const slot = inventory.find(i => i.type === equippedTool);
  if (slot) {
    slot.count = (slot.count || 0) + 1; // treat as durability when stacked? No - use dedicated field
  }
  damageEquippedTool();
}

function damageEquippedTool() {
  if (!equippedTool) return;
  const slot = inventory.find(i => i.type === equippedTool);
  if (!slot) return;
  if (slot.durability === undefined) slot.durability = TOOL_DEFS[equippedTool].durability;
  slot.durability -= 1;
  if (slot.durability <= 0) {
    inventory = inventory.filter(i => i !== slot);
    equippedTool = null;
    console.log('Tool broke!');
  }
  updateInventoryUI();
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'Key4') equipTool('stone_axe');
  if (event.code === 'Key5') equipTool('stone_pickaxe');
  if (event.code === 'Key6') equipTool('spear');
});

// ----- CRAFTING -----
const recipes = {
  plank: { name: 'Plank', cost: { wood: 2 }, color: '#d2a679' },
  stone_block: { name: 'Stone Block', cost: { stone: 2 }, color: '#b87333' },
  metal_bar: { name: 'Metal Bar', cost: { metal: 2 }, color: '#c0c0c0' },
  stone_axe: { name: 'Stone Axe', cost: { wood: 3, stone: 3 }, color: '#8b5a2b' },
  stone_pickaxe: { name: 'Stone Pickaxe', cost: { wood: 3, stone: 4 }, color: '#6b7b8d' },
  spear: { name: 'Spear', cost: { wood: 3, metal: 1 }, color: '#c0c0c0' },
  arrow: { name: 'Arrow', cost: { wood: 1, stone: 1 }, color: '#d2a679' },
  campfire: { name: 'Campfire', cost: { wood: 3 }, color: '#e67e22' },
  bandage: { name: 'Bandage', cost: { wood: 1 }, color: '#f5f5f5' },
  bone_armor: { name: 'Bone Armor', cost: { bones: 2, leather: 3 }, color: '#d4c4a8' },
  leather_armor: { name: 'Leather Armor', cost: { leather: 5 }, color: '#8a6d4f' }
};

const CAMPFIRES = [];
const campfireMeshes = [];

function buildCampfire() {
  if (!craft('campfire')) return;
  const fire = new THREE.Group();
  const logs = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.2, 0.8, 8),
    new THREE.MeshStandardMaterial({ color: '#6b4423', flatShading: true })
  );
  logs.position.y = 0.4;
  fire.add(logs);
  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 8, 8),
    new THREE.MeshStandardMaterial({ color: '#e67e22', flatShading: true, emissive: '#ff4500', emissiveIntensity: 0.8 })
  );
  flame.position.y = 1.2;
  fire.add(flame);
  fire.position.set(camera.position.x, getTerrainHeight(camera.position.x, camera.position.z), camera.position.z);
  scene.add(fire);
  CAMPFIRES.push({ mesh: fire, x: fire.position.x, z: fire.position.z });
  campfireMeshes.push(fire);
  console.log('Campfire placed');
}

function cookAtCampfire() {
  let nearest = null, minDist = Infinity;
  for (const c of CAMPFIRES) {
    const d = Math.sqrt((c.x - camera.position.x) ** 2 + (c.z - camera.position.z) ** 2);
    if (d < minDist) { minDist = d; nearest = c; }
  }
  if (!nearest || minDist > 8) {
    console.log('No campfire nearby');
    return false;
  }
  if (removeFromInventory('wood', 2) === 0) {
    console.log('Need 2 wood to cook');
    return false;
  }
  addToInventory('cooked_meat', 1);
  console.log('Cooked meat over the fire');
  return true;
}

function removeFromInventory(type, count) {
  for (const item of inventory) {
    if (item.type === type) {
      const removed = Math.min(item.count, count);
      item.count -= removed;
      if (item.count <= 0) inventory = inventory.filter(i => i !== item);
      return removed;
    }
  }
  return 0;
}

function craft(itemId) {
  const recipe = recipes[itemId];
  if (!recipe) return false;
  for (const [type, cost] of Object.entries(recipe.cost)) {
    const total = inventory.filter(i => i.type === type).reduce((s, i) => s + i.count, 0);
    if (total < cost) {
      console.log(`Not enough ${type} for ${recipe.name}`);
      return false;
    }
  }
  for (const [type, cost] of Object.entries(recipe.cost)) {
    let remaining = cost;
    while (remaining > 0) {
      const removed = removeFromInventory(type, remaining);
      if (removed === 0) break;
      remaining -= removed;
    }
  }
  addToInventory(itemId, 1);
  addXp(10 + (Object.keys(recipe.cost).length - 1) * 5);
  console.log(`Crafted ${recipe.name}`);
  return true;
}

// ----- XP / LEVELING -----
let playerLevel = 1;
let playerXp = 0;
const xpToNext = (level) => level * 100;
let levelNoticeTimer = 0;

function addXp(amount) {
  playerXp += amount;
  while (playerXp >= xpToNext(playerLevel)) {
    playerXp -= xpToNext(playerLevel);
    playerLevel++;
    showLevelUp();
  }
}

function showLevelUp() {
  const notice = document.createElement('div');
  notice.style.cssText = 'position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);color:#ffd700;font-size:32px;font-weight:bold;text-shadow:1px 1px 3px #000;font-family:Arial,sans-serif;pointer-events:none;z-index:1002;';
  notice.textContent = `LEVEL ${playerLevel}!`;
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 2000);
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyC') {
    event.preventDefault();
    craftPanel.style.display = craftPanel.style.display === 'none' ? 'block' : 'none';
    renderCrafting();
  }
});

const craftPanel = document.createElement('div');
craftPanel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#2a2a3a;padding:20px;border-radius:8px;color:#fff;z-index:1100;display:none;font-family:Arial,sans-serif;min-width:260px;';
document.body.appendChild(craftPanel);

function renderCrafting() {
  craftPanel.innerHTML = '<div style="font-size:18px;font-weight:bold;margin-bottom:12px;">CRAFTING <span style="font-size:11px;opacity:0.6;">[C] close</span></div>';
  for (const [id, recipe] of Object.entries(recipes)) {
    const costText = Object.entries(recipe.cost).map(([t, c]) => `${t} x${c}`).join(', ');
    craftPanel.innerHTML += `<div style="padding:6px 0;border-bottom:1px solid #444;cursor:pointer;" onclick="craftItem('${id}')">
      <span style="color:${recipe.color};font-weight:bold;">${recipe.name}</span>
      <span style="float:right;font-size:12px;opacity:0.8;">${costText}</span>
    </div>`;
  }
}
window.craftItem = craft;
renderCrafting();

let attackCooldown = 0;
const attackSpeed = 0.5;
const meleeDamage = 10;
const bowDamage = 5;
const bowRange = 10;

function dealDamage(target, damage) {
  if (!target) return 0;
  if (target.currentAmount !== undefined) {
    target.currentAmount = Math.max(0, target.currentAmount - damage);
    return target.currentAmount;
  }
  if (target.userData && target.userData.health !== undefined) {
    target.userData.health = Math.max(0, target.userData.health - damage);
    return target.userData.health;
  }
  return 0;
}

function showDamageNumber(x, y, number, color) {
  const dmgText = document.createElement('div');
  dmgText.style.cssText = `position:absolute;left:${x}px;top:${y}px;color:${color || '#ff4444'};font-size:14px;font-family:Arial,sans-serif;text-shadow:1px 1px 2px #000;pointer-events:none;z-index:1002;`;
  dmgText.innerText = '+' + number;
  hud.appendChild(dmgText);
  setTimeout(() => { if (dmgText.parentNode) hud.removeChild(dmgText); }, 500);
}

function attack(button, damage, range, color) {
  if (attackCooldown > 0) return;
  const raycaster = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  raycaster.set(camera.position, dir);
  raycaster.far = range;
  const targets = [
    ...resources.filter(r => !r.gathered).map(r => r.node),
    ...wildlife.map(w => w.mesh)
  ];
  const intersects = raycaster.intersectObjects(targets, true);
  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const r = findResource(hit);
    if (r) {
      const remaining = dealDamage(r, damage);
      console.log(`${button} hit ${r.type}, remaining: ${remaining}/${r.maxAmount}`);
    } else {
      for (const w of wildlife) {
        if (w.mesh === hit || (w.mesh.children && w.mesh.children.includes(hit))) {
          const remaining = dealDamage(w, damage);
          console.log(`${button} hit ${w.type}, health: ${remaining}/${w.maxHealth}`);
          if (remaining <= 0) removeWildlife(w);
          break;
        }
      }
    }
    showDamageNumber(window.innerWidth / 2, window.innerHeight / 2, damage, color);
  }
  attackCooldown = button === 'Melee' ? attackSpeed : attackSpeed * 2;
}

function meleeAttack() {
  const damage = equippedTool === 'spear' ? TOOL_DEFS.spear.damage : meleeDamage;
  attack('Melee', damage, 5, '#ff4444');
  if (equippedTool === 'spear') damageEquippedTool();
}
function bowShot() {
  if (removeFromInventory('arrow', 1) === 0) {
    console.log('No arrows! Craft some with [C]');
    return;
  }
  attack('Bow', bowDamage, bowRange, '#5dade2');
}

const wildlife = [];
function createWildlife(x, z, type) {
  const sizes = { deer: 4, boar: 6, wolf: 5, chicken: 1.5, bear: 8 };
  const speeds = { deer: 1.5, boar: 1.0, wolf: 2.0, chicken: 2.5, bear: 0.8 };
  const colors = { deer: '#6b4c4c', boar: '#8b4513', wolf: '#2c5f2d', chicken: '#f4e0c5', bear: '#5b3a1e' };
  const healths = { deer: 3, boar: 4, wolf: 3, chicken: 1, bear: 8 };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(sizes[type], 12, 12),
    new THREE.MeshStandardMaterial({ color: colors[type], flatShading: true })
  );
  mesh.position.set(x, sizes[type], z);
  mesh.castShadow = true;
  scene.add(mesh);
  const entity = {
    mesh, type, x, z,
    health: healths[type], maxHealth: healths[type], speed: speeds[type],
    state: 'wandering', timer: 0, wanderRadius: 30
  };
  wildlife.push(entity);
  return entity;
}
createWildlife(100, 100, 'deer');
createWildlife(-80, 150, 'boar');
createWildlife(200, -100, 'wolf');
createWildlife(20, 40, 'chicken');
createWildlife(-30, 60, 'chicken');
createWildlife(40, -20, 'chicken');
createWildlife(0, -150, 'bear');
createWildlife(-200, 30, 'bear');

function removeWildlife(w) {
  const idx = wildlife.indexOf(w);
  if (idx > -1) {
    scene.remove(w.mesh);
    wildlife.splice(idx, 1);
    const loot = {
      deer: { wood: 2, meat: 2, leather: 2 }, boar: { metal: 1, meat: 2, leather: 1 },
      wolf: { metal: 2, meat: 1, leather: 1, bones: 1 }, chicken: { meat: 1 },
      bear: { metal: 3, meat: 3, leather: 3, bones: 2 }
    }[w.type] || { wood: 1 };
    for (const [type, count] of Object.entries(loot)) addToInventory(type, count);
    addXp(15);
    console.log(`Looted ${w.type}: ${JSON.stringify(loot)}`);
    setTimeout(() => createWildlife(100 + Math.random() * 200, 100 + Math.random() * 200, w.type), 15000);
  }
}

function updateWildlifeAI(deltaTime) {
  if (!pointerLocked) return;
  const px = camera.position.x, pz = camera.position.z;
  wildlife.forEach(w => {
    const dx = w.x - px, dz = w.z - pz;
    const distance = Math.sqrt(dx * dx + dz * dz);
    let tx = w.x, tz = w.z;
    const passive = w.type === 'deer' || w.type === 'chicken';
    const aggressive = w.type === 'wolf' || w.type === 'boar' || w.type === 'bear';
    if (distance < (passive ? 30 : aggressive ? 60 : 30)) {
      if (passive) {
        w.state = 'fleeing';
        tx = w.x + (dx / (distance + 0.001)) * 20;
        tz = w.z + (dz / (distance + 0.001)) * 20;
      } else {
        w.state = 'chasing';
        tx = px; tz = pz;
      }
    } else if (distance < 100) {
      if (!passive) { w.state = 'chasing'; tx = px; tz = pz; }
      else { w.state = 'wandering'; }
    } else {
      w.state = 'wandering';
      w.timer += deltaTime;
      if (w.timer > 2) {
        w.timer = 0;
        const angle = Math.random() * Math.PI * 2;
        tx = w.x + Math.cos(angle) * w.wanderRadius;
        tz = w.z + Math.sin(angle) * w.wanderRadius;
      }
    }
    const step = w.speed * deltaTime;
    w.x += Math.max(-step, Math.min(step, tx - w.x));
    w.z += Math.max(-step, Math.min(step, tz - w.z));
    w.mesh.position.set(w.x, getTerrainHeight(w.x, w.z) + 3, w.z);

    // Attack player on contact (aggressive: wolf/boar/bear)
    const atkDamage = w.type === 'bear' ? 15 : 8;
    if (aggressive && distance < 5 && playerStats.health > 0) {
      if (!w.attackTimer || (gameTime - w.attackTimer) > 1.5) {
        w.attackTimer = gameTime;
        takeDamage(atkDamage);
        showDamageNumber(window.innerWidth / 2, window.innerHeight / 2, atkDamage, '#ff4444');
      }
    }
    if (distance > 200) {
      w.x = 100 + Math.random() * 200;
      w.z = 100 + Math.random() * 200;
    }
    const limit = terrainSize / 2 - 20;
    w.x = Math.max(-limit, Math.min(limit, w.x));
    w.z = Math.max(-limit, Math.min(limit, w.z));
  });
}

let selectedBuilding = null;
const buildingTypes = {
  foundation: { size: 20, color: '#8b5a2b', cost: { wood: 5 }, tier: 1 },
  wall: { size: 2, color: '#7a5230', cost: { wood: 3 }, tier: 1 },
  floor: { size: 20, color: '#9b7a4a', cost: { wood: 10 }, tier: 1 }
};
const BUILDING_TIERS = [
  { name: 'wood', color: '#8b5a2b' },
  { name: 'stone', color: '#b0b0b0', cost: { stone: 3 } },
  { name: 'metal', color: '#5dade2', cost: { metal: 2 } }
];

function placeBuilding() {
  if (!selectedBuilding || attackCooldown > 0) return;
  const def = buildingTypes[selectedBuilding];
  const tier = Math.min(2, (def.tier || 0) + 0);
  const mat = BUILDING_TIERS[tier];
  for (const [type, cost] of Object.entries(def.cost)) {
    const total = inventory.filter(i => i.type === type).reduce((s, i) => s + i.count, 0);
    if (total < cost) {
      console.log(`Not enough ${type} for ${selectedBuilding}`);
      return;
    }
  }
  for (const [type, cost] of Object.entries(def.cost)) {
    let remaining = cost;
    while (remaining > 0) {
      const removed = removeFromInventory(type, remaining);
      if (removed === 0) break;
      remaining -= removed;
    }
  }
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(def.size, 2, def.size),
    new THREE.MeshStandardMaterial({ color: mat.color, flatShading: true })
  );
  building.position.set(camera.position.x, 1, camera.position.z);
  building.castShadow = true;
  building.userData.tier = tier;
  building.userData.type = selectedBuilding;
  scene.add(building);
  placedBuildings.push(building);
  console.log(`Placed ${selectedBuilding} (${BUILDING_TIERS[tier].name})`);
}

const placedBuildings = [];

function upgradeFacingBuilding() {
  const raycaster = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  raycaster.set(camera.position, dir);
  raycaster.far = 8;
  const hits = raycaster.intersectObjects(placedBuildings, false);
  if (hits.length === 0) { console.log('No building to upgrade'); return; }
  const b = hits[0].object;
  const tier = b.userData.tier;
  if (tier >= BUILDING_TIERS.length - 1) { console.log('Already max tier'); return; }
  const next = BUILDING_TIERS[tier + 1];
  for (const [type, cost] of Object.entries(next.cost)) {
    const total = inventory.filter(i => i.type === type).reduce((s, i) => s + i.count, 0);
    if (total < cost) { console.log(`Not enough ${type} to upgrade`); return; }
  }
  for (const [type, cost] of Object.entries(next.cost)) {
    let remaining = cost;
    while (remaining > 0) {
      const removed = removeFromInventory(type, remaining);
      if (removed === 0) break;
      remaining -= removed;
    }
  }
  b.userData.tier = tier + 1;
  b.material.color.set(BUILDING_TIERS[tier + 1].color);
  console.log(`Upgraded building to ${BUILDING_TIERS[tier + 1].name}`);
}

const SAVE_VERSION = 1;
function saveGame() {
  const gameState = {
    version: SAVE_VERSION,
    playerPosition: { x: camera.position.x, y: playerY, z: camera.position.z },
    rotation: { x: rotation.x, y: rotation.y },
    inventory: inventory.map(i => ({ ...i })),
    timeOfDay: gameTime,
    stats: { ...playerStats },
    level: { level: playerLevel, xp: playerXp },
    armor: equippedArmor,
    resources: resources.map(r => ({ id: r.id, type: r.type, currentAmount: r.currentAmount, maxAmount: r.maxAmount }))
  };
  localStorage.setItem('wildlands_save', JSON.stringify(gameState));
  console.log('Game saved');
}

function loadGame() {
  const saved = localStorage.getItem('wildlands_save');
  if (!saved) { console.log('No save file found'); return false; }
  let gameState;
  try { gameState = JSON.parse(saved); } catch (e) { console.error('Corrupt save', e); return false; }
  if (gameState.version !== SAVE_VERSION) return false;
  if (gameState.playerPosition) {
    camera.position.set(gameState.playerPosition.x, gameState.playerPosition.y, gameState.playerPosition.z);
    playerY = gameState.playerPosition.y;
  }
  if (gameState.rotation) {
    rotation.x = gameState.rotation.x;
    rotation.y = gameState.rotation.y;
  }
  if (gameState.inventory) {
    inventory = gameState.inventory.filter(i => i && i.type);
    updateInventoryUI();
  }
  if (gameState.stats) {
    playerStats.health = gameState.stats.health ?? 100;
    playerStats.hunger = gameState.stats.hunger ?? 100;
    playerStats.thirst = gameState.stats.thirst ?? 100;
    playerStats.stamina = gameState.stats.stamina ?? 100;
    updateStatsUI();
  }
  if (gameState.level) {
    playerLevel = gameState.level.level ?? 1;
    playerXp = gameState.level.xp ?? 0;
  }
  if (gameState.armor && ARMOR_DEFS[gameState.armor]) equippedArmor = gameState.armor;
  if (gameState.resources) {
    for (const r of resources) {
      const s = gameState.resources.find(rs => rs.id === r.id);
      if (s) r.currentAmount = s.currentAmount;
    }
  }
  console.log('Game loaded');
  return true;
}

function newGame() {
  localStorage.removeItem('wildlands_save');
  camera.position.set(0, 1.6, 0);
  playerY = 1.6;
  rotation.set(0, 0, 0);
  inventory = [];
  updateInventoryUI();
  console.log('New game started');
}

const hud = document.createElement('div');
hud.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;font-family:Arial,sans-serif;color:#fff;z-index:1000;';
document.body.appendChild(hud);

const gatherPrompt = document.createElement('div');
gatherPrompt.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);font-size:14px;color:#e8c54a;text-shadow:1px 1px 2px #000;background:rgba(0,0,0,0.6);padding:8px 16px;border-radius:4px;letter-spacing:1px;white-space:nowrap;display:none;';
gatherPrompt.innerHTML = 'Press <b>[E]</b> to gather';
hud.appendChild(gatherPrompt);

const fpsCounter = document.createElement('div');
fpsCounter.style.cssText = 'position:absolute;top:10px;right:10px;color:#0f0;font-family:monospace;font-size:12px;display:none;z-index:1002;';
hud.appendChild(fpsCounter);

const toolBar = document.createElement('div');
toolBar.style.cssText = 'position:absolute;bottom:110px;left:50%;transform:translateX(-50%);color:#e8c54a;font-family:monospace;font-size:14px;text-shadow:1px 1px 2px #000;display:none;z-index:1002;';
hud.appendChild(toolBar);

const levelBar = document.createElement('div');
levelBar.style.cssText = 'position:absolute;bottom:140px;left:50%;transform:translateX(-50%);color:#ffd700;font-family:monospace;font-size:13px;text-shadow:1px 1px 2px #000;z-index:1002;';
hud.appendChild(levelBar);

const armorBar = document.createElement('div');
armorBar.style.cssText = 'position:absolute;bottom:158px;left:50%;transform:translateX(-50%);color:#d4c4a8;font-family:monospace;font-size:13px;text-shadow:1px 1px 2px #000;z-index:1002;';
hud.appendChild(armorBar);

let gameTime = 0;
let lastFrameTime = performance.now();
let fpsFrames = 0;
let fpsTime = 0;
let footstepAccum = 0;
let fpsVisible = false;

// Player stats
const playerStats = { health: 100, hunger: 100, thirst: 100, stamina: 100 };
const FOOD_ITEMS = { plank: 0, stone_block: 0, metal_bar: 0, stone_axe: 0, wood: 0, stone: 0, metal: 0, berries: 20, meat: 15, cooked_meat: 40 };
let equippedArmor = null;
const ARMOR_DEFS = {
  bone_armor: { name: 'Bone Armor', damageReduction: 0.25 },
  leather_armor: { name: 'Leather Armor', damageReduction: 0.15 }
};

function takeDamage(amount) {
  if (equippedArmor && ARMOR_DEFS[equippedArmor]) {
    amount = Math.round(amount * (1 - ARMOR_DEFS[equippedArmor].damageReduction));
  }
  playerStats.health = Math.max(0, playerStats.health - amount);
  updateStatsUI();
  if (playerStats.health <= 0) showDeathScreen();
}

function equipArmor() {
  const countOf = (t) => inventory.filter(i => i.type === t).reduce((s, i) => s + i.count, 0);
  const priority = ['bone_armor', 'leather_armor'];
  let chosen = null;
  for (const t of priority) {
    if (countOf(t) > 0) { chosen = t; break; }
  }
  if (chosen) {
    equippedArmor = chosen;
    removeFromInventory(chosen, 1);
    console.log(`Equipped ${ARMOR_DEFS[chosen].name} (${Math.round(ARMOR_DEFS[chosen].damageReduction * 100)}% damage reduction)`);
  } else {
    console.log('No armor to equip. Craft Bone Armor [C] from bones + leather.');
  }
}

function eatFood(type) {
  const value = FOOD_ITEMS[type];
  if (!value) return false;
  if (removeFromInventory(type, 1) === 0) return false;
  if (type === 'berries') playerStats.hunger = Math.min(100, playerStats.hunger + value);
  else playerStats.hunger = Math.min(100, playerStats.hunger + value);
  updateStatsUI();
  return true;
}

function updateStatsUI() {
  const hBar = document.getElementById('hunger-bar');
  const tBar = document.getElementById('thirst-bar');
  const hpBar = document.getElementById('health-bar');
  if (hBar) hBar.style.width = playerStats.hunger + '%';
  if (tBar) tBar.style.width = playerStats.thirst + '%';
  if (hpBar) hpBar.style.width = playerStats.health + '%';
}

function showDeathScreen() {
  if (document.getElementById('death-screen')) return;
  const overlay = document.createElement('div');
  overlay.id = 'death-screen';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ff4444;font-family:Arial,sans-serif;z-index:2000;';
  overlay.innerHTML = '<div style="font-size:48px;font-weight:bold;margin-bottom:20px;">YOU DIED</div>' +
    '<button onclick="newGame();document.getElementById(\'death-screen\').remove();document.exitPointerLock();" style="padding:12px 32px;font-size:18px;background:#555;color:#fff;border:none;border-radius:6px;cursor:pointer;">New Game</button>';
  document.body.appendChild(overlay);
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyR' && pointerLocked) {
    if (eatFood('berries')) console.log('Ate berries');
    else console.log('No berries');
  }
  if (event.code === 'KeyF' && pointerLocked) {
    if (eatFood('cooked_meat')) console.log('Ate cooked meat');
    else if (eatFood('meat')) console.log('Ate raw meat');
    else console.log('No meat');
  }
  if (event.code === 'KeyQ' && pointerLocked) drinkWater();
  if (event.code === 'KeyG' && pointerLocked) buildCampfire();
  if (event.code === 'KeyT' && pointerLocked) cookAtCampfire();
  if (event.code === 'KeyV' && pointerLocked) useBandage();
  if (event.code === 'KeyU' && pointerLocked) upgradeFacingBuilding();
  if (event.code === 'KeyJ' && pointerLocked) equipArmor();
});

function useBandage() {
  if (removeFromInventory('bandage', 1) === 0) { console.log('No bandages! Craft with [C]'); return; }
  playerStats.health = Math.min(100, playerStats.health + 30);
  updateStatsUI();
  console.log('Bandage used (+30 health)');
}
window.eatFood = eatFood;
updateStatsUI();

function toggleFps() {
  fpsVisible = !fpsVisible;
  fpsCounter.style.display = fpsVisible ? 'block' : 'none';
  fpsFrames = 0;
  fpsTime = 0;
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const deltaTime = Math.min(0.1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  fpsFrames++;
  fpsTime += deltaTime;
  if (fpsTime >= 0.5) {
    if (fpsVisible) fpsCounter.textContent = Math.round(fpsFrames / fpsTime) + ' FPS';
    fpsFrames = 0; fpsTime = 0;
  }

  // Update stats depletion (hunger, thirst, stamina)
  if (!pointerLocked) {
    // Deplete while not playing (simulated survival pressure)
    hunger = Math.max(0, hunger - HUNGER_DEPLETION_RATE * deltaTime);
    thirst = Math.max(0, thirst - THIRST_DEPLETION_RATE * deltaTime);
    if (isSprinting) {
      stamina = Math.max(0, stamina - STAMINA_DEPLETION_RATE * 2 * deltaTime);
    } else {
      stamina = Math.min(100, stamina + 0.002 * deltaTime); // regen when not sprinting
    }
  } else {
    // While playing: depletion is handled by other systems (gathering, eating)
    // but still drain slowly over time
    hunger = Math.max(0, hunger - HUNGER_DEPLETION_RATE * deltaTime / 10);
    thirst = Math.max(0, thirst - THIRST_DEPLETION_RATE * deltaTime / 10);
    if (isSprinting) {
      stamina = Math.max(0, stamina - STAMINA_DEPLETION_RATE * 1.5 * deltaTime);
    } else {
      stamina = Math.min(100, stamina + 0.001 * deltaTime); // regen when walking
    }
  }

  if (hunger <= HUNGER_DEATH_THRESHOLD && pointerLocked) {
    // Death by starvation - reset to new game
    localStorage.removeItem('wildlands_save');
    camera.position.set(0, 1.6, 0);
    playerY = 1.6;
    hunger = 100; thirst = 100; stamina = 100;
    console.log('Starved to death - new game started');
  }

  // Update HUD bars
  if (document.getElementById('hunger-bar')) {
    document.getElementById('hunger-bar').style.width = `${(hunger / 100) * 100}%`;
  }
  if (document.getElementById('thirst-bar')) {
    document.getElementById('thirst-bar').style.width = `${(thirst / 100) * 100}%`;
  }

  if (pointerLocked) {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = rotation.y;
    camera.rotation.x = rotation.x;

    const moveSpeed = (isSprinting ? SPRINT_MULTIPLIER : 1) * SPEED;
    const forwardX = Math.sin(rotation.y), forwardZ = Math.cos(rotation.y);
    const rightX = Math.sin(rotation.y + Math.PI / 2), rightZ = Math.cos(rotation.y + Math.PI / 2);

    if (moveDirection.z !== 0 || moveDirection.x !== 0) {
      velocity.x = (forwardX * moveDirection.z + rightX * moveDirection.x) * moveSpeed;
      velocity.z = (forwardZ * moveDirection.z + rightZ * moveDirection.x) * moveSpeed;
      footstepAccum += deltaTime;
      if (footstepAccum > 0.35) {
        footstepAccum = 0;
        playFootstep(getFootstepMaterial(camera.position.x, camera.position.z));
      }
    } else {
      velocity.x *= 0.9;
      velocity.z *= 0.9;
    }

    velocity.y += gravity * deltaTime;
    const terrainHeight = getTerrainHeight(camera.position.x, camera.position.z);
    const groundY = terrainHeight + 2.0;
    if (playerY + velocity.y < groundY) {
      velocity.y = 0;
      playerY = groundY;
      canJump = true;
    } else {
      playerY += velocity.y;
    }
    camera.position.x += velocity.x;
    camera.position.z += velocity.z;
    camera.position.y = playerY;

    const limit = terrainSize / 2 - 20;
    camera.position.x = Math.max(-limit, Math.min(limit, camera.position.x));
    camera.position.z = Math.max(-limit, Math.min(limit, camera.position.z));
  }

  updateAmbientSounds();
  updateWildlifeAI(deltaTime);
  if (attackCooldown > 0) attackCooldown -= deltaTime;

  // Stat depletion
  if (pointerLocked) {
    playerStats.hunger = Math.max(0, playerStats.hunger - deltaTime * 0.4);
    playerStats.thirst = Math.max(0, playerStats.thirst - deltaTime * 0.6);
    if (playerStats.hunger <= 0 || playerStats.thirst <= 0) takeDamage(deltaTime * 3);
    updateStatsUI();
  }

  gameTime += deltaTime;
  sun.position.x = 50 * Math.cos(gameTime * 0.2);
  sun.position.z = 50 * Math.sin(gameTime * 0.2);
  sun.position.y = 50 * Math.sin(gameTime * 0.15);
  directionalLight.position.copy(sun.position);
  const dayProgress = ((gameTime * 0.2) % (2 * Math.PI)) / (2 * Math.PI);
  const isDay = dayProgress > 0.2 && dayProgress < 0.8;
  if (isDay) {
    skyColor.setRGB(0.5 + 0.5 * Math.sin(gameTime * 2), 0.7 + 0.3 * Math.sin(gameTime * 2 - 1), 1.0);
    directionalLight.intensity = 0.8;
    ambientLight.intensity = 0.6;
  } else {
    skyColor.setRGB(0.02, 0.02, 0.08);
    directionalLight.intensity = 0.1;
    ambientLight.intensity = 0.25;
  }
  fog.color.copy(skyColor);
  renderer.setClearColor(skyColor);

  for (const r of resources) {
    if (r.gathered && r.currentAmount < r.maxAmount) {
      r.currentAmount = Math.min(r.maxAmount, r.currentAmount + 0.01);
      if (r.currentAmount >= r.maxAmount) r.gathered = false;
    }
  }

  const raycaster = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  raycaster.set(camera.position, dir);
  raycaster.far = 5;
  const gatherable = resources.filter(r => !r.gathered && r.currentAmount > 0).map(r => r.node);
  const hit = raycaster.intersectObjects(gatherable, true);
  const nearWater = Math.sqrt((camera.position.x - waterPos.x) ** 2 + (camera.position.z - waterPos.z) ** 2) < waterPos.radius + 2;
  if (nearWater) {
    gatherPrompt.innerHTML = 'Press <b>[Q]</b> to drink';
    gatherPrompt.style.display = pointerLocked ? 'block' : 'none';
  } else {
    gatherPrompt.innerHTML = 'Press <b>[E]</b> to gather';
    gatherPrompt.style.display = (pointerLocked && hit.length > 0) ? 'block' : 'none';
  }

  toolBar.style.display = equippedTool ? 'block' : 'none';
  if (equippedTool && TOOL_DEFS[equippedTool]) {
    const slot = inventory.find(i => i.type === equippedTool);
    const dur = slot ? (slot.durability ?? TOOL_DEFS[equippedTool].durability) : 0;
    toolBar.textContent = `${TOOL_DEFS[equippedTool].name} [dur ${dur}] [4/5/6 swap]`;
  }

  levelBar.textContent = `LVL ${playerLevel} | XP ${playerXp}/${xpToNext(playerLevel)}`;
  armorBar.textContent = equippedArmor ? `${ARMOR_DEFS[equippedArmor].name} [${Math.round(ARMOR_DEFS[equippedArmor].damageReduction * 100)}% DR]` : 'No armor [J to equip]';

  renderer.render(scene, camera);
}
animate();
