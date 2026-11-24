// Solmar Bay: the game itself. Boots the renderer, builds the city, wires
// every system together and runs the loop. The player is Rico Marlowe, a
// driver for Vera Costa: on foot he walks, in a car he drives, and the
// Solmar PD notices both. Click Play, take the first job, and mind the
// stars. The loop also serves the staged screenshots (?shot=...): there
// the world is frozen in its staged pose and only the camera looks.
import { WORLD, PLAYER, WANTED, GARAGE_PRICES } from './config.js';
import { makeRng } from './rng.js';
import { loadSave, writeSave } from './save.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { buildCity, resolveColliders } from './city.js';
import { makeVehicle, driveVehicle, removeVehicle } from './cars.js';
import { makeTraffic, updateTraffic } from './traffic.js';
import { makePeds, updatePeds } from './peds.js';
import { makePolice, updatePolice, clearPolice } from './police.js';
import { fireShot, applyHit } from './combat.js';
import { makeMissions, startMission, startFare, checkStep, tickMission, currentMission } from './missions.js';
import { makeHud, startMenuHtml, garageMenuHtml, missionsMenuHtml } from './hud.js';
import { makeRenderer, updateCamera } from './render.js';
import { stageShot } from './shots.js';

const THREE = window.THREE;
const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const rng = makeRng(20261124);

const { renderer, scene, camera } = makeRenderer(canvas);
const city = buildCity(scene, rng);
const input = makeInput(canvas);
const audio = makeAudio();
const hud = makeHud();

// Rico, on foot: a red shirt, dark trousers, built from boxes.
function makePlayerMesh() {
  const group = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  legs.position.y = 0.4;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), new THREE.MeshLambertMaterial({ color: 0xe74c3c }));
  torso.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xf1c27d }));
  head.position.y = 1.7;
  group.add(legs, torso, head);
  group.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  scene.add(group);
  return group;
}

const saved = loadSave();
const G = {
  scene, renderer, camera, city, input, audio, hud, rng,
  time: 0, mode: 'menu', shotMode: false, shotPose: null,
  cash: saved ? saved.cash : 0,
  hp: PLAYER.hp,
  maxHp: saved && saved.armor ? PLAYER.armoredHp : PLAYER.hp,
  upgrades: { engine: saved ? saved.engine : false, armor: saved ? saved.armor : false },
  missionIndex: saved ? saved.missionIndex : 0,
  doneMissions: saved ? saved.done : [],
  fareIndex: 0,
  wanted: 0, lastCrimeAt: -100,
  player: { x: 60, z: 20, heading: Math.PI, speed: 0, inVehicle: false, mesh: makePlayerMesh() },
  vehicle: null, parked: [],
  traffic: [], peds: [], police: null, missions: null,
};

G.police = makePolice(scene);
G.missions = makeMissions(scene);
G.missions.index = G.missionIndex;
G.missions.done = G.doneMissions.slice();
G.traffic = makeTraffic(scene, rng, 14);
G.peds = makePeds(scene, rng, 18);

// Cars parked around the city, free for the taking — at a price in stars.
const PARKED_SPOTS = [
  { kind: 'sedan', x: 60, z: 32, heading: Math.PI / 2 },
  { kind: 'boat', x: 205, z: 70, heading: Math.PI },
  { kind: 'pickup', x: -30, z: 60, heading: 0 },
  { kind: 'bike', x: 72, z: 10, heading: 0 },
  { kind: 'sedan', x: -90, z: -60, heading: Math.PI },
  { kind: 'sedan', x: 90, z: 120, heading: -Math.PI / 2 },
];
for (const spot of PARKED_SPOTS) {
  G.parked.push(makeVehicle(scene, spot.kind, spot.x, spot.z, spot.heading));
}

function nearestParked(maxDist) {
  let best = null, bestD = maxDist;
  for (const car of G.parked) {
    const d = Math.hypot(car.x - G.player.x, car.z - G.player.z);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function enterVehicle(car) {
  G.parked = G.parked.filter((c) => c !== car);
  G.vehicle = car;
  G.player.inVehicle = true;
  G.player.x = car.x; G.player.z = car.z; G.player.heading = car.heading;
  G.player.mesh.visible = false;
  audio.blip(520);
}

function exitVehicle() {
  const car = G.vehicle;
  if (!car) return;
  G.parked.push(car);
  G.vehicle = null;
  G.player.inVehicle = false;
  G.player.x = car.x + Math.cos(car.heading) * 2.5;
  G.player.z = car.z + Math.sin(car.heading) * 2.5;
  G.player.mesh.visible = true;
}

function bustPlayer() {
  const fine = Math.min(G.cash, WANTED.bustFine);
  G.cash -= fine;
  G.hp = G.maxHp;
  G.wanted = 0;
  G.lastCrimeAt = -100;
  clearPolice(G.police, scene);
  if (G.vehicle) { G.parked.push(G.vehicle); G.vehicle = null; }
  G.player.inVehicle = false;
  G.player.mesh.visible = true;
  G.player.x = 0; G.player.z = 0; G.player.heading = 0;
  hud.setCash(G.cash);
  hud.setWanted(0);
  hud.setHealth(G.hp, G.maxHp);
  writeSave(G);
  hud.showMenu(`<h2 style="margin:0 0 10px">BUSTED</h2>
    <p>The Solmar PD caught up with you. Fine: <b>$${fine}</b>.</p>
    <button id="respawnBtn" style="font-size:16px;padding:10px 26px;border-radius:8px;border:0;background:#2e7d32;color:#fff;cursor:pointer">Back on the street</button>`);
  document.getElementById('respawnBtn').addEventListener('click', () => {
    audio.unlock();
    hud.hideMenu();
    G.mode = 'play';
  });
  G.mode = 'busted';
}

function openGarage() {
  G.mode = 'garage';
  hud.showMenu(garageMenuHtml(G));
  hud.menuCard.querySelectorAll('button[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'close') { hud.hideMenu(); G.mode = 'play'; return; }
      const price = GARAGE_PRICES[act];
      if (act === 'repair') {
        if (G.cash < price) { hud.toast('Not enough cash to repair.'); return; }
        G.cash -= price; G.hp = G.maxHp; audio.cash();
        hud.setCash(G.cash); hud.setHealth(G.hp, G.maxHp);
        hud.toast('Repaired to full health.');
      }
      if (act === 'engine' && !G.upgrades.engine) {
        if (G.cash < price) { hud.toast('Not enough cash for the engine.'); return; }
        G.cash -= price; G.upgrades.engine = true; audio.cash();
        hud.setCash(G.cash); writeSave(G);
        hud.showMenu(garageMenuHtml(G));
        openGarageRefresh();
      }
      if (act === 'armor' && !G.upgrades.armor) {
        if (G.cash < price) { hud.toast('Not enough cash for armour.'); return; }
        G.cash -= price; G.upgrades.armor = true;
        G.maxHp = PLAYER.armoredHp; G.hp = G.maxHp; audio.cash();
        hud.setCash(G.cash); hud.setHealth(G.hp, G.maxHp); writeSave(G);
        hud.showMenu(garageMenuHtml(G));
        openGarageRefresh();
      }
    });
  });
  function openGarageRefresh() {
    hud.menuCard.querySelectorAll('button[data-act]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.dataset.act === 'close') { hud.hideMenu(); G.mode = 'play'; }
      });
    });
  }
}

function openMissionsMenu() {
  G.mode = 'paused';
  hud.showMenu(missionsMenuHtml(G));
  hud.menuCard.querySelectorAll('button[data-act="close"]').forEach((btn) => {
    btn.addEventListener('click', () => { hud.hideMenu(); G.mode = 'play'; });
  });
}

function startPlaying() {
  audio.unlock();
  hud.hideMenu();
  G.mode = 'play';
  if (!currentMission(G.missions) && G.missions.done.length === 0) {
    // Nothing started yet: open with the first job.
  }
  if (!G.missions.active && currentMission(G.missions)) startMission(G);
  else if (!G.missions.active && !currentMission(G.missions)) {
    hud.setObjective('Press T for a taxi fare', 0);
  }
}

function update(dt) {
  G.time += dt;
  const P = G.player;

  // Keys that act once per press.
  if (input.consume('KeyP') || input.consume('Escape')) {
    if (G.mode === 'play') {
      G.mode = 'paused';
      hud.showMenu('<h2>PAUSED</h2><p>Solmar Bay waits for no one — except now.</p><button id="resumeBtn" style="font-size:16px;padding:10px 26px;border-radius:8px;border:0;background:#2e7d32;color:#fff;cursor:pointer">Resume</button>');
      document.getElementById('resumeBtn').addEventListener('click', () => { hud.hideMenu(); G.mode = 'play'; });
    } else if (G.mode === 'paused') { hud.hideMenu(); G.mode = 'play'; }
  }
  if (input.consume('KeyM') && G.mode === 'play') openMissionsMenu();
  if (input.consume('KeyG') && G.mode === 'play') openGarage();
  if (input.consume('KeyT') && G.mode === 'play') {
    if (!G.missions.active) startFare(G);
    else hud.toast('Finish the current job first.');
  }
  if (input.consume('KeyE') && G.mode === 'play') {
    if (P.inVehicle) exitVehicle();
    else {
      const car = nearestParked(4.5);
      if (car) {
        enterVehicle(car);
        const { addWanted } = { addWanted: (g, s) => { g.wanted = Math.min(5, g.wanted + s); g.lastCrimeAt = g.time; g.hud.setWanted(g.wanted); } };
        addWanted(G, WANTED.steal);
        hud.toast('You stole a car — the PD noticed.');
      }
    }
  }
  if (input.consume('Mouse0') && G.mode === 'play') {
    audio.unlock();
    audio.shot();
    const hit = fireShot(G, camera);
    const result = applyHit(G, hit);
    if (result === 'ped') hud.toast('You hit a pedestrian — wanted level up.');
    if (result === 'police') hud.toast('You shot at the police — wanted level up.');
  }

  if (G.mode !== 'play') return;

  // Move: on foot the player walks where they face; in a car they drive it.
  if (P.inVehicle && G.vehicle) {
    const v = G.vehicle;
    const throttle = input.down('KeyW', 'ArrowUp') ? 1 : input.down('KeyS', 'ArrowDown') ? -1 : 0;
    const steer = input.down('KeyA', 'ArrowLeft') ? -1 : input.down('KeyD', 'ArrowRight') ? 1 : 0;
    v.boost = G.upgrades.engine ? 1.25 : 1;
    driveVehicle(v, throttle, steer, input.down('Space'), dt);
    P.x = v.x; P.z = v.z; P.heading = v.heading; P.speed = v.speed;
    resolveColliders(P, 1.6, city.colliders);
    v.x = P.x; v.z = P.z;
    v.mesh.position.set(v.x, v.kind === 'boat' ? 0.1 : 0, v.z);
    // Running over a pedestrian at speed is a crime the whole city sees.
    for (const ped of G.peds) {
      if (!ped.down && Math.abs(v.speed) > 5 && Math.hypot(ped.x - v.x, ped.z - v.z) < 2) {
        ped.down = true; ped.mesh.visible = false;
        G.wanted = Math.min(5, G.wanted + WANTED.hitPed);
        G.lastCrimeAt = G.time; hud.setWanted(G.wanted);
        hud.toast('You hit a pedestrian — wanted level up.');
      }
    }
  } else {
    const run = input.down('ShiftLeft', 'ShiftRight');
    const speed = run ? PLAYER.run : PLAYER.walk;
    const fwd = input.down('KeyW', 'ArrowUp') ? 1 : input.down('KeyS', 'ArrowDown') ? -0.6 : 0;
    const turn = input.down('KeyA', 'ArrowLeft') ? -1 : input.down('KeyD', 'ArrowRight') ? 1 : 0;
    P.heading += turn * 2.4 * dt;
    P.speed = fwd * speed;
    P.x += -Math.sin(P.heading) * P.speed * dt;
    P.z += -Math.cos(P.heading) * P.speed * dt;
    P.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, P.x));
    P.z = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, P.z));
    resolveColliders(P, 0.8, city.colliders);
    P.mesh.position.set(P.x, 0, P.z);
    P.mesh.rotation.y = P.heading;
  }

  // The world keeps moving: traffic, pedestrians, the police, the clock.
  updateTraffic(G.traffic, dt);
  updatePeds(G.peds, rng, dt);
  const rammed = updatePolice(G.police, scene, P, G.wanted, dt, G.time);
  if (rammed) {
    G.hp -= 8;
    hud.setHealth(G.hp, G.maxHp);
    hud.toast('Ram! The PD is on you.');
    if (G.vehicle) G.vehicle.speed *= 0.4;
    if (G.hp <= 0) { bustPlayer(); return; }
  }
  if (G.wanted > 0 && G.time - G.lastCrimeAt > WANTED.decaySeconds) {
    G.wanted--;
    G.lastCrimeAt = G.time;
    hud.setWanted(G.wanted);
  }
  tickMission(G, dt);
  checkStep(G, P.x, P.z);
  city.update(G.time);
  audio.engine(G.vehicle ? Math.abs(G.vehicle.speed) / G.vehicle.spec.top : 0, !!G.vehicle);
  audio.siren(G.wanted > 0, G.time);

  // The HUD reads the game every frame.
  hud.setSpeed(Math.abs(P.speed) * 3.6);
  hud.setHealth(G.hp, G.maxHp);
  hud.setCompass(((-P.heading * 180) / Math.PI % 360 + 360) % 360);
  hud.drawMap(G);
  G.missionIndex = G.missions.index;
  G.doneMissions = G.missions.done;
}

// Boot: the start menu in normal play, the staged shot when asked.
const shotName = stageShot(G);
if (shotName) {
  G.mode = 'play';
  // stageShot already set the objective (with its timer, when it has one).
  hud.drawMap(G);
  // A staged shot is a frozen frame: the camera is fixed and the world holds still.
} else {
  hud.setCash(G.cash);
  hud.setHealth(G.hp, G.maxHp);
  hud.setWanted(0);
  hud.setObjective('Press Play, then take the first job', 0);
  hud.showMenu(startMenuHtml());
  document.getElementById('playBtn').addEventListener('click', startPlaying);
  hud.menuCard.addEventListener('click', (e) => { if (e.target.id === 'playBtn') startPlaying(); });
}

let last = performance.now();
let announced = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  if (G.mode === 'play' && !G.shotMode) update(dt);
  if (G.mode === 'play' && G.shotMode) city.update(G.time += dt);
  updateCamera(camera, G.player, dt, G.shotMode ? G.shotPose : null);
  renderer.render(scene, camera);
  if (!announced) {
    statusEl.textContent = 'ready';
    announced = true;
  }
}
requestAnimationFrame(frame);
