#!/usr/bin/env node
// Logic tests for Wildlands Survival. Bundles main.js with __TEST__ flag,
// stubs the DOM/WebGL/audio environment, and exercises core game logic.
import fs from 'fs';
import { execSync } from 'child_process';

const results = { pass: 0, fail: 0 };
const failures = [];

function test(name, fn) {
  try {
    fn();
    results.pass++;
    console.log('  PASS  ' + name);
  } catch (e) {
    results.fail++;
    failures.push({ name, err: e.message });
    console.log('  FAIL  ' + name + ' -> ' + e.message);
  }
}

// 1. Bundle with __TEST__ define
execSync('npx esbuild src/main.js --bundle --format=esm --define:window.__TEST__=true --outfile=/tmp/game-test.mjs', { stdio: 'pipe' });

const ver = 'WebGL 2.0';
const noop = () => {};
const glHandler = {
  get(t, p) {
    if (p === 'getParameter') return (pp) => { if (pp === 0x8B8C) return ver; if (pp === 0x9246) return 'GLSL ES 3.00'; return 0; };
    if (p === 'getContextAttributes') return () => ({ antialias: true });
    if (p === 'getExtension') return () => ({});
    if (p === 'getShaderPrecisionFormat' || p === 'getVertexShaderPrecisionFormat') return () => ({ rangeMin: 0, rangeMax: 0, precision: 0 });
    if (p === 'getSupportedExtensions') return () => [];
    if (p === 'getProgramParameter' || p === 'getShaderParameter') return () => true;
    if (p === 'getShaderInfoLog' || p === 'getProgramInfoLog') return () => '';
    if (p === 'getError') return () => 0;
    if (p === 'checkFramebufferStatus') return () => 0x8CD5;
    if (p === 'isContextLost') return () => false;
    if (p === 'canvas') return {};
    if (p === 'VERSION') return 0x8B8C;
    if (p === 'SHADING_LANGUAGE_VERSION') return 0x9246;
    if (p === 'drawingBufferWidth') return 1920;
    if (p === 'drawingBufferHeight') return 1080;
    if (p === 'createShader' || p === 'createProgram' || p === 'createTexture' || p === 'createBuffer' || p === 'createFramebuffer' || p === 'createRenderbuffer') return () => ({});
    if (p === 'getUniformLocation' || p === 'getFramebufferAttachmentParameter') return () => ({});
    if (p === 'getAttribLocation') return () => 0;
    if (p === 'getActiveUniform' || p === 'getActiveAttrib') return () => ({ name: 'u_dummy', size: 1, type: 0x8B50 });
    if (p === 'getUniformIndices') return () => [0];
    if (p === 'getActiveUniforms') return () => [0];
    if (typeof p === 'string') {
      if (/^[A-Z0-9_]+$/.test(p)) return 0;
      return noop;
    }
    return undefined;
  },
  set(t, p, v) { t[p] = v; return true; }
};
const glStub = new Proxy({}, glHandler);
const makeEl = () => ({ style: {}, appendChild() {}, addEventListener() {}, remove() {}, removeChild() {}, set innerHTML(v) {}, get innerHTML() { return ''; }, set textContent(v) {}, getContext: () => glStub, classList: { add() {}, remove() {} }, parentNode: null, requestPointerLock() {}, width: 0, height: 0 });

globalThis.window = { addEventListener() {}, innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1, AudioContext: undefined, requestAnimationFrame: () => 0 };
globalThis.document = { createElement: () => makeEl(), querySelector: () => makeEl(), querySelectorAll: () => [], getElementById: () => makeEl(), body: { appendChild() {}, addEventListener() {}, style: {} }, addEventListener() {}, exitPointerLock() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.requestAnimationFrame = () => 0;
globalThis.performance = { now: () => 0 };
globalThis.addEventListener = () => {};
globalThis.navigator = {};

await import('/tmp/game-test.mjs');
const api = globalThis.window.__testAPI;

function totalOf(type) {
  return api.getInventory().filter(i => i.type === type).reduce((s, i) => s + i.count, 0);
}

console.log('\n-- Inventory & Crafting --');
test('addToInventory stacks items', () => {
  api.resetInventory();
  api.addToInventory('wood', 3);
  api.addToInventory('wood', 2);
  if (totalOf('wood') !== 5) throw new Error('expected 5 wood, got ' + totalOf('wood'));
});

test('craft consumes resources and produces item', () => {
  api.resetInventory();
  api.addToInventory('wood', 3);
  api.addToInventory('stone', 3);
  const ok = api.craft('stone_axe');
  if (!ok) throw new Error('craft failed');
  if (totalOf('stone_axe') !== 1) throw new Error('no stone_axe crafted');
  if (totalOf('wood') !== 0 || totalOf('stone') !== 0) throw new Error('resources not consumed');
});

test('craft fails without enough resources', () => {
  api.resetInventory();
  api.addToInventory('wood', 1);
  const ok = api.craft('stone_axe');
  if (ok) throw new Error('craft should have failed');
});

test('removeFromInventory removes partial amounts', () => {
  api.resetInventory();
  api.addToInventory('wood', 5);
  const removed = api.removeFromInventory('wood', 3);
  if (removed !== 3) throw new Error('expected 3 removed, got ' + removed);
  if (totalOf('wood') !== 2) throw new Error('expected 2 left');
});

console.log('\n-- Combat & Damage --');
test('dealDamage damages wildlife entity health', () => {
  const wolf = { health: 20, maxHealth: 20, userData: {} };
  const remaining = api.dealDamage(wolf, 8);
  if (remaining !== 12) throw new Error('expected 12 remaining, got ' + remaining);
  if (wolf.health !== 12) throw new Error('wolf.health not updated');
});

test('dealDamage does not go below zero', () => {
  const deer = { health: 5 };
  const remaining = api.dealDamage(deer, 999);
  if (remaining !== 0) throw new Error('expected 0, got ' + remaining);
});

test('takeDamage applies and clamps to 0', () => {
  api.getPlayerStats().health = 100;
  api.takeDamage(30);
  if (api.getPlayerStats().health !== 70) throw new Error('expected 70, got ' + api.getPlayerStats().health);
  api.takeDamage(500);
  if (api.getPlayerStats().health !== 0) throw new Error('expected 0, got ' + api.getPlayerStats().health);
});

console.log('\n-- Survival Stats --');
test('eatFood restores hunger', () => {
  api.resetInventory();
  api.addToInventory('cooked_meat', 2);
  api.getPlayerStats().hunger = 50;
  const ok = api.eatFood('cooked_meat');
  if (!ok) throw new Error('eatFood failed');
  if (api.getPlayerStats().hunger !== 90) throw new Error('expected 90 hunger, got ' + api.getPlayerStats().hunger);
});

console.log('\n-- XP / Leveling --');
test('addXp accumulates and levels up', () => {
  api.addXp(0);
  api.addXp(150);
  const lvl = api.getLevel();
  if (lvl.level < 1) throw new Error('level not advanced: ' + JSON.stringify(lvl));
});

console.log('\n-- Armor --');
test('equipArmor consumes one armor item', () => {
  api.resetInventory();
  api.addToInventory('bone_armor', 1);
  api.equipArmor();
  if (totalOf('bone_armor') !== 0) throw new Error('armor not consumed');
});

console.log('\n-- Death / Respawn --');
test('takeDamage can kill player (health reaches 0)', () => {
  api.resetPlayerHealth();
  api.takeDamage(100);
  if (!api.isPlayerDead()) throw new Error('player should be dead at 0 health');
  api.resetPlayerHealth();
});

console.log('\n==================================');
console.log('RESULTS: ' + results.pass + ' passed, ' + results.fail + ' failed');
if (results.fail > 0) {
  console.log('FAILURES:');
  failures.forEach(f => console.log('  - ' + f.name + ': ' + f.err));
  process.exit(1);
}