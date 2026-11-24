// Solmar Bay — Sunset Run. The game loop, the player, driving, entering cars,
// the garage, busts and deaths, and the start menu. Shot mode (?shot=chase
// etc.) stages one frozen frame for a screenshot instead of playing.
const THREE = window.THREE;

import { makeRng } from './rng.js';
import { VEHICLES, POIS, PLAYER, PRICES, ENGINE_BONUS, ARMOR_BONUS, WANTED } from './config.js';
import { createRenderer, updateCamera } from './render.js';
import { buildCity } from './city.js';
import { makeVehicle, spinWheels } from './cars.js';
import { Traffic } from './traffic.js';
import { Peds } from './peds.js';
import { Police } from './police.js';
import { shoot } from './combat.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { stageShot, SHOT_NAMES } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1);
const shotName = params.get('shot');
const rng = makeRng(seed);

const canvas = document.getElementById('game');
const { renderer, scene, camera } = createRenderer(canvas);
const city = buildCity(scene, rng);
const traffic = new Traffic(scene, rng, 10);
const peds = new Peds(scene, rng, 18);
const police = new Police(scene);
const input = new Input();
const audio = new AudioSys();
const hud = new HUD();
const save = loadSave() || { cash: 0, engine: 0, armor: 0 };

// Rico Marlowe, on foot.
function makePlayerMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.1, 8), new THREE.MeshLambertMaterial({ color: 0x8a2a3a }));
  body.position.y = 0.95;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd9a986 }));
  head.position.y = 1.72;
  g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a2a33 }));
  legs.position.y = 0.35;
  g.add(legs);
  return g;
}

const player = {
  onFoot: true,
  pos: new THREE.Vector3(2, 0, 14),
  heading: Math.PI,
  speed: 0,
  health: PLAYER.maxHealth + save.armor * ARMOR_BONUS,
  maxHealth: PLAYER.maxHealth + save.armor * ARMOR_BONUS,
  cash: save.cash,
  wanted: 0,
  vehicle: null,
  vehicleKind: null,
};
const playerMesh = makePlayerMesh();
playerMesh.position.copy(player.pos);
scene.add(playerMesh);

// Parked cars the player can steal, including the shot vehicles.
const parked = [];
function park(kind, color, x, z, heading) {
  const v = makeVehicle(kind, color);
  v.group.position.set(x, 0, z);
  v.group.rotation.y = heading;
  scene.add(v.group);
  parked.push({ v, kind, x, z });
  return v;
}
park('sedan', 0xc22a2a, 0, 10, 0.3); // the red sedan for First Wheels
const marinaSkiff = park('skiff', 0xe8e4da, -170, 148, Math.PI / 2); // the harbour skiff
park('bike', 0x2a6ac2, 8, -6, -0.8); // Coast Runner by the plaza
park('pickup', 0xe07a1e, 44, 34, Math.PI); // a pickup by the garage
const shotSedan = park('sedan', 0xc22a2a, -145, 60, Math.PI);
const shotPickup = park('pickup', 0xe07a1e, -145, 40, Math.PI);
const shotSkiff = park('skiff', 0xe8e4da, -168, 142, Math.PI / 2);

let started = false;
let saveTimer = 0;

function saveGame() {
  storeSave({ cash: Math.floor(player.cash), engine: save.engine, armor: save.armor });
}

function respawn() {
  if (player.vehicle) {
    parked.push({ v: player.vehicle, kind: player.vehicleKind, x: player.pos.x, z: player.pos.z });
    player.vehicle = null;
    player.vehicleKind = null;
  }
  player.onFoot = true;
  player.pos.set(2, 0, 14);
  player.heading = Math.PI;
  player.speed = 0;
  player.health = player.maxHealth;
  player.wanted = 0;
  police.setWanted(0, player.pos.x, player.pos.z);
  playerMesh.visible = true;
}

const G = {
  scene,
  camera,
  renderer,
  rng,
  time: 0,
  shotMode: false,
  cameraOverride: null,
  paused: false,
  player,
  playerMesh,
  parked,
  traffic,
  peds,
  police,
  missions: null,
  hud,
  input,
  audio,
  tracers: [],
  shotSedan,
  shotPickup,
  shotSkiff,
  marinaSkiff,
  toast: (t) => hud.showToast(t),
  addWanted(n) {
    player.wanted = Math.min(5, player.wanted + n);
    police.setWanted(player.wanted, player.pos.x, player.pos.z);
  },
  damagePlayer(n) {
    if (player.health <= 0) return;
    player.health -= n;
    if (player.health <= 0) {
      player.cash = Math.max(0, player.cash - WANTED.deathFine);
      hud.showToast(`Wasted — $${WANTED.deathFine} hospital bill`);
      saveGame();
      respawn();
    }
  },
  busted() {
    player.cash = Math.max(0, player.cash - WANTED.bustFine);
    hud.showToast(`Busted — $${WANTED.bustFine} fine`);
    saveGame();
    respawn();
  },
};

const missions = new Missions(G);
G.missions = missions;

function collideCircle(x, z, r) {
  for (const c of city.colliders) {
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
  }
  return false;
}

function tryEnterVehicle() {
  let best = null;
  let bestD = 3.5;
  for (const entry of parked) {
    const d = Math.hypot(entry.x - player.pos.x, entry.z - player.pos.z);
    if (d < bestD) {
      bestD = d;
      best = entry;
    }
  }
  if (!best) return;
  parked.splice(parked.indexOf(best), 1);
  player.vehicle = best.v;
  player.vehicleKind = best.kind;
  player.onFoot = false;
  player.speed = 0;
  playerMesh.visible = false;
  G.addWanted(WANTED.stealCar);
  hud.showToast(`You took the ${VEHICLES[best.kind].name}`);
  audio.chime();
}

function exitVehicle() {
  const v = player.vehicle;
  parked.push({ v, kind: player.vehicleKind, x: player.pos.x, z: player.pos.z });
  player.vehicle = null;
  player.vehicleKind = null;
  player.onFoot = true;
  player.speed = 0;
  player.pos.x += Math.cos(player.heading) * 2.5;
  player.pos.z -= Math.sin(player.heading) * 2.5;
  playerMesh.visible = true;
}

function updatePlayer(dt) {
  const p = player;
  if (p.onFoot) {
    let move = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) move = 1;
    if (input.down('KeyS') || input.down('ArrowDown')) move = -0.6;
    if (input.down('KeyA')) p.heading += 2.4 * dt;
    if (input.down('KeyD')) p.heading -= 2.4 * dt;
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    const sp = (run ? PLAYER.runSpeed : PLAYER.walkSpeed) * move;
    p.speed = sp;
    const nx = p.pos.x + Math.sin(p.heading) * sp * dt;
    const nz = p.pos.z + Math.cos(p.heading) * sp * dt;
    if (!collideCircle(nx, nz, 0.6) && nx > -152 && nx < 200 && nz > -200 && nz < 200) {
      p.pos.x = nx;
      p.pos.z = nz;
    }
    if (input.wasPressed('KeyE')) tryEnterVehicle();
  } else {
    const veh = p.vehicle;
    const spec = veh.spec;
    const top = spec.top * (1 + save.engine * ENGINE_BONUS);
    const fwd = input.down('KeyW') || input.down('ArrowUp');
    const back = input.down('KeyS') || input.down('ArrowDown');
    if (fwd) p.speed = Math.min(top, p.speed + spec.accel * dt);
    else if (back) p.speed = Math.max(-10, p.speed - spec.accel * 1.2 * dt);
    else p.speed *= Math.max(0, 1 - 0.5 * dt);
    if (input.down('Space')) p.speed *= Math.max(0, 1 - 3 * dt);
    const steer = (input.down('KeyA') ? 1 : 0) - (input.down('KeyD') ? 1 : 0);
    if (Math.abs(p.speed) > 0.5) {
      p.heading += steer * spec.turn * dt * Math.min(1, Math.abs(p.speed) / 12) * Math.sign(p.speed);
    }
    const nx = p.pos.x + Math.sin(p.heading) * p.speed * dt;
    const nz = p.pos.z + Math.cos(p.heading) * p.speed * dt;
    const isBoat = p.vehicleKind === 'skiff';
    const blocked =
      collideCircle(nx, nz, 1.6) ||
      (isBoat ? nx > -148 : nx < -152) ||
      nx < -200 || nx > 200 || nz < -200 || nz > 200;
    if (!blocked) {
      p.pos.x = nx;
      p.pos.z = nz;
    } else {
      if (Math.abs(p.speed) > 15) G.damagePlayer((Math.abs(p.speed) - 15) * 0.4);
      p.speed *= 0.4;
    }
    veh.group.position.set(p.pos.x, isBoat ? -0.2 : 0, p.pos.z);
    veh.group.rotation.y = p.heading;
    spinWheels(veh, dt, p.speed);
    if (input.wasPressed('KeyE')) exitVehicle();
  }
  playerMesh.position.set(p.pos.x, 0, p.pos.z);
  playerMesh.rotation.y = p.heading;
  playerMesh.visible = p.onFoot;
  audio.setEngine(p.onFoot ? 0 : Math.abs(p.speed) / 34);
}

// Garage panel.
const garageEl = document.getElementById('garage');
const garageInfo = document.getElementById('garage-info');
function garageOpen() {
  return !garageEl.classList.contains('hidden');
}
function refreshGarage() {
  garageInfo.textContent = `Cash $${Math.floor(player.cash)} · Engine Lv${save.engine} · Armor Lv${save.armor} · Health ${Math.floor(player.health)}/${player.maxHealth}`;
}
document.getElementById('buy-repair').addEventListener('click', () => {
  if (player.cash >= PRICES.repair && player.health < player.maxHealth) {
    player.cash -= PRICES.repair;
    player.health = player.maxHealth;
    hud.showToast('Repaired — good as new');
    saveGame();
  } else {
    hud.showToast(player.cash < PRICES.repair ? 'Not enough cash' : 'Already at full health');
  }
  refreshGarage();
});
document.getElementById('buy-engine').addEventListener('click', () => {
  if (save.engine >= 2) hud.showToast('Engine already maxed');
  else if (player.cash < PRICES.engine) hud.showToast('Not enough cash');
  else {
    player.cash -= PRICES.engine;
    save.engine++;
    hud.showToast('Engine upgraded +25% top speed');
    saveGame();
  }
  refreshGarage();
});
document.getElementById('buy-armor').addEventListener('click', () => {
  if (save.armor >= 2) hud.showToast('Armor already maxed');
  else if (player.cash < PRICES.armor) hud.showToast('Not enough cash');
  else {
    player.cash -= PRICES.armor;
    save.armor++;
    player.maxHealth += ARMOR_BONUS;
    player.health += ARMOR_BONUS;
    hud.showToast('Armor fitted +50 HP');
    saveGame();
  }
  refreshGarage();
});

// Start menu.
const menuEl = document.getElementById('menu');
menuEl.addEventListener('click', () => {
  menuEl.classList.add('hidden');
  started = true;
  audio.ensure();
});
window.addEventListener('keydown', () => audio.ensure(), { once: true });
window.addEventListener('mousedown', () => audio.ensure(), { once: true });

// Shot mode: stage one frozen frame, no menu, no gameplay.
if (shotName && SHOT_NAMES.includes(shotName)) {
  menuEl.classList.add('hidden');
  started = true;
  stageShot(shotName, G);
}

let last = performance.now();
let readySet = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.time += dt;

  if (!G.shotMode && started && !G.paused) {
    updatePlayer(dt);
    traffic.update(dt);
    peds.update(dt, G.time);
    police.update(dt, G.time, G);
    missions.update(dt);
    city.update(dt, G.time);
    audio.setSiren(player.wanted > 0, dt);
    saveTimer += dt;
    if (saveTimer > 5) {
      saveTimer = 0;
      saveGame();
    }
    if (input.clicked) shoot(G);
    if (input.wasPressed('KeyM')) {
      if (!missions.active) missions.startFare();
      else hud.showToast(missions.current().intro);
    }
    if (input.wasPressed('KeyG')) {
      const near = Math.hypot(player.pos.x - POIS.garage.x, player.pos.z - POIS.garage.z) < 16;
      if (near) {
        garageEl.classList.toggle('hidden');
        refreshGarage();
      } else if (garageOpen()) {
        garageEl.classList.add('hidden');
      } else {
        hud.showToast('Drive to Rico\'s Garage to tune up');
      }
    }
    if (input.wasPressed('KeyP')) {
      G.paused = !G.paused;
      hud.showToast(G.paused ? 'Paused — press P to resume' : 'Resumed');
    }
  } else {
    city.update(dt, G.time);
  }

  for (let i = G.tracers.length - 1; i >= 0; i--) {
    const tr = G.tracers[i];
    tr.ttl -= dt;
    if (tr.ttl <= 0) {
      G.scene.remove(tr.line);
      tr.line.geometry.dispose();
      tr.line.material.dispose();
      G.tracers.splice(i, 1);
    }
  }

  updateCamera(G, dt);
  hud.update(G, dt);
  renderer.render(scene, camera);
  if (!readySet) {
    readySet = true;
    document.getElementById('status').textContent = 'ready';
  }
  input.endFrame();
}
requestAnimationFrame(frame);
