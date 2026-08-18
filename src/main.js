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
directionalLight.castShadow = true;
scene.add(directionalLight);
const sun = new THREE.Object3D();
sun.position.set(50, 50, 50);
scene.add(sun);
const fog = new THREE.Fog(0x87ceeb, 10, 200);
scene.fog = fog;
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
createResources(50, 'wood');
createResources(30, 'stone');
createResources(20, 'metal');

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
      flashMesh(r.node);
      lastGatherTime = now;
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
      slots[i].innerHTML = `<span style="color:${ITEM_COLORS[item.type] || '#fff'};font-weight:bold;">${item.type} x${item.count}</span>`;
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

function meleeAttack() { attack('Melee', meleeDamage, 5, '#ff4444'); }
function bowShot() { attack('Bow', bowDamage, bowRange, '#5dade2'); }

const wildlife = [];
function createWildlife(x, z, type) {
  const sizes = { deer: 4, boar: 6, wolf: 5 };
  const speeds = { deer: 1.5, boar: 1.0, wolf: 2.0 };
  const colors = { deer: '#6b4c4c', boar: '#8b4513', wolf: '#2c5f2d' };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(sizes[type], 12, 12),
    new THREE.MeshStandardMaterial({ color: colors[type], flatShading: true })
  );
  mesh.position.set(x, sizes[type], z);
  mesh.castShadow = true;
  scene.add(mesh);
  const entity = {
    mesh, type, x, z,
    health: 3, maxHealth: 3, speed: speeds[type],
    state: 'wandering', timer: 0, wanderRadius: 30
  };
  wildlife.push(entity);
  return entity;
}
createWildlife(100, 100, 'deer');
createWildlife(-80, 150, 'boar');
createWildlife(200, -100, 'wolf');

function removeWildlife(w) {
  const idx = wildlife.indexOf(w);
  if (idx > -1) {
    scene.remove(w.mesh);
    wildlife.splice(idx, 1);
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
    if (distance < 30) {
      w.state = 'fleeing';
      tx = w.x + (dx / (distance + 0.001)) * 20;
      tz = w.z + (dz / (distance + 0.001)) * 20;
    } else if (distance < 100) {
      w.state = 'chasing';
      tx = px; tz = pz;
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
    if (distance > 200) {
      w.x = 100 + Math.random() * 200;
      w.z = 100 + Math.random() * 200;
    }
  });
}

let selectedBuilding = null;
const buildingTypes = {
  foundation: { size: 20, color: '#8b5a2b' },
  wall: { size: 2, color: '#7a5230' },
  floor: { size: 20, color: '#9b7a4a' }
};

function placeBuilding() {
  if (!selectedBuilding || attackCooldown > 0) return;
  const def = buildingTypes[selectedBuilding];
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(def.size, 2, def.size),
    new THREE.MeshStandardMaterial({ color: def.color, flatShading: true })
  );
  building.position.set(camera.position.x, 1, camera.position.z);
  building.castShadow = true;
  scene.add(building);
  console.log(`Placed ${selectedBuilding}`);
}

const SAVE_VERSION = 1;
function saveGame() {
  const gameState = {
    version: SAVE_VERSION,
    playerPosition: { x: camera.position.x, y: playerY, z: camera.position.z },
    rotation: { x: rotation.x, y: rotation.y },
    inventory: inventory.map(i => ({ ...i })),
    timeOfDay: gameTime,
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

let gameTime = 0;
let lastFrameTime = performance.now();
let fpsFrames = 0;
let fpsTime = 0;
let footstepAccum = 0;
let fpsVisible = false;

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
  gatherPrompt.style.display = (pointerLocked && hit.length > 0) ? 'block' : 'none';

  renderer.render(scene, camera);
}
animate();
