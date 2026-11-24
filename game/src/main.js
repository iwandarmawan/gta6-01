// Solmar Bay — Foggy Morning. Main loop: build the city, run the game,
// stage scripted shots (?shot=chase|play|drive|mission&seed=5) frozen in
// time for the screenshots.
import THREE from 'three';
import { buildCity } from './city.js';
import { makeVehicle, makeDriver, driveCar } from './cars.js';
import { makeTraffic, updateTraffic } from './traffic.js';
import { makePeds, updatePeds } from './peds.js';
import { makePolice, updatePolice } from './police.js';
import { makeMissions, updateMissions, buyUpgrade, startTaxiFare, currentMission } from './missions.js';
import { makeHud, updateHud } from './hud.js';
import { makeInput } from './input.js';
import { makeCombat, fireShot, updateCombat } from './combat.js';
import { saveGame, loadGame } from './save.js';
import { makeAudio } from './audio.js';
import { makeRenderer } from './render.js';
import { stageShot } from './shots.js';
import { PLAZA, MARINA, GARAGE } from './config.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotMode = !!shotName;

const { renderer, camera } = makeRenderer();
const scene = new THREE.Scene();
const city = buildCity(scene);
const hud = makeHud();
const input = makeInput();
const audio = makeAudio();
const combat = makeCombat(scene);
const missions = makeMissions(scene);
const police = makePolice(scene);
const traffic = makeTraffic(scene, 10);
const peds = makePeds(scene, 18);

// Player figure: Rico Marlowe, red shirt.
const playerMesh = new THREE.Group();
const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.35), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
pBody.position.y = 0.95;
playerMesh.add(pBody);
const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), new THREE.MeshLambertMaterial({ color: 0xd8b08a }));
pHead.position.y = 1.6;
playerMesh.add(pHead);
scene.add(playerMesh);

// Vehicles parked around the city.
function park(kind, x, z, heading) {
  const v = makeVehicle(kind);
  scene.add(v);
  return makeDriver(v, x, z, heading);
}
const drivers = {
  sedan: park('sedan', PLAZA.x + 4, PLAZA.z + 6, 0.4),
  pickup: park('pickup', GARAGE.x + 12, GARAGE.z, -Math.PI / 2),
  bike: park('bike', GARAGE.x - 10, GARAGE.z + 4, 0),
  boat: park('boat', MARINA.x, MARINA.z + 6, Math.PI),
};

const player = { x: PLAZA.x, z: PLAZA.z + 2, heading: 0, speed: 0, onFoot: true, vehicle: null };
const hudState = {
  wanted: 0, cash: 0, health: 100, objective: missions.objective,
  timer: 0, speed: 0, stateLabel: 'E · ON FOOT',
  target: missions.target, player, police: police.cars,
};

// Restore a previous save (rebuilds story state from mission defs on a
// partial save instead of crashing — the round-14 save-restore fix).
const saved = loadGame();
if (saved) {
  missions.cash = saved.cash;
  missions.index = saved.index;
  missions.upgrades = saved.upgrades;
  missions.health = saved.health;
  hudState.cash = saved.cash;
  hudState.health = saved.health;
}

let camPos = new THREE.Vector3(20, 14, 30);
let camTarget = new THREE.Vector3(0, 1, 0);

function nearestVehicle(maxDist = 4.5) {
  let best = null, bestD = maxDist;
  for (const key of Object.keys(drivers)) {
    const d = drivers[key];
    const dist = Math.hypot(d.x - player.x, d.z - player.z);
    if (dist < bestD) { best = d; bestD = dist; }
  }
  return best;
}

function update(dt) {
  // Driving / walking.
  if (player.vehicle) {
    driveCar(player.vehicle, input, dt, city.colliders, missions.upgrades);
    player.x = player.vehicle.x;
    player.z = player.vehicle.z;
    player.heading = player.vehicle.heading;
    hudState.speed = player.vehicle.speed;
    hudState.stateLabel = 'W · DRIVING';
    audio.setEngine(player.vehicle.speed, 34);
  } else {
    const walk = 5.5;
    let mx = 0, mz = 0;
    if (input.forward) { mx += Math.sin(player.heading); mz += Math.cos(player.heading); }
    if (input.back) { mx -= Math.sin(player.heading); mz -= Math.cos(player.heading); }
    if (input.left) player.heading += 2.4 * dt;
    if (input.right) player.heading -= 2.4 * dt;
    player.x += mx * walk * dt;
    player.z += mz * walk * dt;
    player.x = Math.max(-145, Math.min(195, player.x));
    player.z = Math.max(-195, Math.min(195, player.z));
    hudState.speed = (mx || mz) ? walk : 0;
    hudState.stateLabel = 'E · ON FOOT';
    audio.setEngine(0, 34);
  }
  playerMesh.position.set(player.x, 0, player.z);
  playerMesh.rotation.y = player.heading;
  playerMesh.visible = player.onFoot;

  // Enter / exit a vehicle.
  if (input.interact) {
    input.interact = false;
    if (player.vehicle) {
      const d = player.vehicle;
      player.vehicle = null;
      player.onFoot = true;
      player.x = d.x + Math.sin(d.heading + Math.PI / 2) * 3;
      player.z = d.z + Math.cos(d.heading + Math.PI / 2) * 3;
    } else {
      const d = nearestVehicle();
      if (d) {
        player.vehicle = d;
        player.onFoot = false;
        if (d.kind === 'boat') hudState.wanted = Math.max(hudState.wanted, 1);
      }
    }
  }
  // Fire.
  if (input.fire) {
    input.fire = false;
    const origin = new THREE.Vector3(player.x, 1.2, player.z);
    if (fireShot(combat, origin, player.heading, police)) {
      hudState.wanted = Math.min(5, hudState.wanted + 1);
    }
  }
  // Repair at the garage.
  if (input.repair) {
    input.repair = false;
    const nearGarage = Math.hypot(player.x - GARAGE.x, player.z - GARAGE.z) < 14;
    if (nearGarage) buyUpgrade(missions, 'repair');
  }

  updateMissions(missions, player, dt);
  updatePolice(police, player, hudState.wanted, dt, shotMode);
  updateTraffic(traffic, dt);
  updatePeds(peds, dt);
  updateCombat(combat, dt);

  hudState.cash = missions.cash;
  hudState.health = missions.health;
  hudState.objective = missions.objective;
  hudState.timer = missions.timer;
  hudState.target = missions.target;

  // Chase camera — skipped entirely in shot mode (round-13 bug 3).
  if (!shotMode) {
    const back = player.vehicle ? 11 : 7;
    const up = player.vehicle ? 5 : 3.5;
    const want = new THREE.Vector3(
      player.x - Math.sin(player.heading) * back,
      up,
      player.z - Math.cos(player.heading) * back
    );
    camPos.lerp(want, Math.min(1, dt * 4));
    camTarget.lerp(new THREE.Vector3(player.x, 1.2, player.z), Math.min(1, dt * 6));
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
  }

  updateHud(hud, hudState);
}

let firstFrame = true;
function frame() {
  const dt = shotMode ? 0 : Math.min(0.05, clockDelta());
  if (!shotMode) update(dt);
  else if (firstFrame) { updateHud(hud, hudState); firstFrame = false; }
  renderer.render(scene, camera);
  if (firstFrame && !shotMode) {
    firstFrame = false;
    document.getElementById('status').textContent = 'ready';
  }
  requestAnimationFrame(frame);
}

let last = performance.now();
function clockDelta() {
  const now = performance.now();
  const d = (now - last) / 1000;
  last = now;
  return d;
}

// Stage the requested shot, then freeze the world and render it.
if (shotMode) {
  stageShot({ scene, camera, player, drivers, police, missions, hudState, traffic, peds }, shotName);
  // update() never runs in shot mode, so place Rico's figure by hand.
  playerMesh.position.set(player.x, 0, player.z);
  playerMesh.rotation.y = player.heading;
  playerMesh.visible = player.onFoot;
  document.getElementById('menu').style.display = 'none';
  // Sync the HUD once with the staged state, then render frozen frames.
  updateHud(hud, hudState);
  renderer.render(scene, camera);
  document.getElementById('status').textContent = 'ready';
  // Keep rendering (static) so the headless capture can take its time.
  requestAnimationFrame(frame);
} else {
  document.getElementById('menu').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    audio.start();
  });
  setInterval(() => saveGame(missions), 10000);
  requestAnimationFrame(frame);
}
