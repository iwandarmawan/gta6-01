// main.js — Solmar Bay: Storm Run. Wires every system together: storm city,
// vehicles, traffic, peds, police + heli, missions, combat, HUD, save.
// In shot mode (?shot=chase|play|drive|mission) the scene is staged by shots.js
// and dt is frozen at 0 so nothing overwrites the staging.
import THREE from './three-shim.js';
import { mulberry32 } from './rng.js';
import { WORLD, PLAZA_POS, GARAGE_POS, MISSION_DEFS } from './config.js';
import { createRenderer } from './render.js';
import { buildCity } from './city.js';
import { makeVehicle, placeCar, driveCar } from './cars.js';
import { makeTraffic } from './traffic.js';
import { makePeds } from './peds.js';
import { makePolice, updatePolice, updateHeli } from './police.js';
import { createCombat } from './combat.js';
import { createMissions, updateMissions, missionTargetPos, completeCarMission } from './missions.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, saveGame } from './save.js';
import { shotName, stageShot } from './shots.js';

const rand = mulberry32(WORLD.seed);
const { renderer, scene, camera, dirLight } = createRenderer();
const city = buildCity(scene, rand);
const input = createInput();
const audio = createAudio();
const saved = loadSave();

const G = {
  renderer, scene, camera, dirLight,
  colliders: city.colliders, spots: city.spots,
  mode: 'foot', vehicle: null, shotMode: false, shotCamera: null,
  started: false, wanted: 0, cash: saved ? saved.cash : 0,
  health: saved ? saved.health : 100, maxHealth: saved ? saved.maxHealth : 100,
  upgrades: { engine: !!(saved && saved.engine), armor: !!(saved && saved.armor) },
  playerPos: { x: PLAZA_POS.x, z: PLAZA_POS.z + 6 },
  missionTarget: null, wantedTimer: 0, bustCooldown: 0, saveTimer: 0,
};
G.missions = createMissions();
if (saved && saved.missionIndex) {
  const idx = Math.min(saved.missionIndex, 6);
  G.missions.index = idx;
  if (idx >= 6) {
    G.missions.storyDone = true; G.missions.current = null;
    G.missions.objective = 'Taxi fare — drop the passenger at Palm Plaza';
  } else {
    G.missions.current = MISSION_DEFS[idx];
    G.missions.objective = MISSION_DEFS[idx].objective;
    G.missions.timer = MISSION_DEFS[idx].timer || 0;
  }
}

// Player on foot (red shirt, Rico Marlowe).
const playerGroup = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0xc03030, roughness: 0.9 }));
  body.position.y = 0.85; playerGroup.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8b08a, roughness: 0.8 }));
  head.position.y = 1.6; playerGroup.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 }));
  legs.position.y = 0.25; playerGroup.add(legs);
}
playerGroup.position.set(G.playerPos.x, 0, G.playerPos.z);
scene.add(playerGroup);
G.player = { group: playerGroup, heading: 0 };

// Parked vehicles the player can steal.
G.vehicles = {};
const sedan = makeVehicle('sedan'); placeCar(sedan, -12, 2, 2.2, 0); scene.add(sedan.group); G.vehicles.sedan = sedan;
const pickup = makeVehicle('pickup'); placeCar(pickup, 60, -40, 0.4, 0); scene.add(pickup.group); G.vehicles.pickup = pickup;
const runner = makeVehicle('runner'); placeCar(runner, GARAGE_POS.x + 4, GARAGE_POS.z - 10, 1.2, 0); scene.add(runner.group); G.vehicles.runner = runner;
const skiff = makeVehicle('skiff'); placeCar(skiff, 124, -112, 0.8, 0); scene.add(skiff.group); G.vehicles.skiff = skiff;

G.traffic = makeTraffic(scene, rand);
G.peds = makePeds(scene, rand);
G.police = makePolice(scene);
G.combat = createCombat(scene);
G.hud = createHud(city.spots);

// Mission beacon: gold pillar + ring at the current target.
const beacon = new THREE.Group();
{
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  pillar.position.y = 13; beacon.add(pillar);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd24a }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; beacon.add(ring);
}
beacon.position.set(PLAZA_POS.x, 0, PLAZA_POS.z);
scene.add(beacon);
G.beacon = beacon;

function updateMissionTarget() {
  G.missionTarget = missionTargetPos(G.missions, city.spots);
  if (G.missionTarget) { G.beacon.position.set(G.missionTarget.x, 0, G.missionTarget.z); G.beacon.visible = true; }
  else G.beacon.visible = false;
}
updateMissionTarget();

const events = {
  cash(pay) { G.cash += pay; audio.cash(); saveGame(G); updateMissionTarget(); },
  toast(msg) { G.hud.setToast(msg); },
};

function nearestVehicle(maxD) {
  let best = null, bestD = maxD;
  for (const k in G.vehicles) {
    const v = G.vehicles[k];
    const d = Math.hypot(v.group.position.x - G.playerPos.x, v.group.position.z - G.playerPos.z);
    if (d < bestD) { best = v; bestD = d; }
  }
  return best;
}

function collidePoint(x, z, r) {
  for (const c of G.colliders) {
    const hw = c.hw + r, hd = c.hd + r;
    const dx = x - c.x, dz = z - c.z;
    if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
      const px = hw - Math.abs(dx), pz = hd - Math.abs(dz);
      if (px < pz) x = c.x + Math.sign(dx || 1) * hw;
      else z = c.z + Math.sign(dz || 1) * hd;
    }
  }
  return { x, z };
}

function update(dt, t) {
  const axis = input.axis();
  // Garage: keys 1/2/3 near Rico's Garage.
  const nearGarage = Math.hypot(G.playerPos.x - GARAGE_POS.x, G.playerPos.z - GARAGE_POS.z) < 14;
  if (nearGarage && G.mode === 'foot') {
    if (input.pressed('Digit1') && G.cash >= 50 && G.health < G.maxHealth) { G.cash -= 50; G.health = G.maxHealth; audio.cash(); G.hud.setToast('Repaired — $50'); }
    if (input.pressed('Digit2') && G.cash >= 400 && !G.upgrades.engine) { G.cash -= 400; G.upgrades.engine = true; audio.cash(); G.hud.setToast('Engine upgrade fitted — +25% speed'); }
    if (input.pressed('Digit3') && G.cash >= 300 && !G.upgrades.armor) { G.cash -= 300; G.upgrades.armor = true; G.maxHealth = 150; G.health = 150; audio.cash(); G.hud.setToast('Armor fitted — +50 HP'); }
  }
  if (input.pressed('KeyE')) {
    if (G.mode === 'drive' && G.vehicle) {
      // Exit the vehicle.
      G.mode = 'foot';
      G.playerPos = { x: G.vehicle.group.position.x + 3, z: G.vehicle.group.position.z + 3 };
      G.player.heading = G.vehicle.heading;
      G.player.group.position.set(G.playerPos.x, 0, G.playerPos.z);
      G.player.group.visible = true;
      G.vehicle.speed = 0;
      G.vehicle = null;
    } else {
      const v = nearestVehicle(4.5);
      if (v) {
        G.mode = 'drive'; G.vehicle = v;
        G.player.group.visible = false;
        if (G.wanted < 1) { G.wanted = 1; G.hud.setToast('Stolen! The police are on you.'); audio.siren(); }
        completeCarMission(G.missions, events);
        updateMissionTarget();
      } else if (nearGarage) {
        G.hud.setToast("Rico's Garage — 1 repair $50 · 2 engine $400 · 3 armor $300");
      }
    }
  }
  if (G.mode === 'drive' && G.vehicle) {
    const inp = { f: axis.f, s: axis.s, brake: input.down('Space') };
    driveCar(G.vehicle, inp, dt, G.colliders, { engine: G.upgrades.engine });
    G.playerPos = { x: G.vehicle.group.position.x, z: G.vehicle.group.position.z };
    G.player.heading = G.vehicle.heading;
  } else {
    // On foot.
    G.player.heading -= axis.s * dt * 2.4;
    const run = input.down('ShiftLeft') ? 9 : 5.5;
    const sp = axis.f * run;
    let nx = G.playerPos.x + Math.sin(G.player.heading) * sp * dt;
    let nz = G.playerPos.z + Math.cos(G.player.heading) * sp * dt;
    if (nx > WORLD.seaX - 1) nx = WORLD.seaX - 1;
    const c = collidePoint(nx, nz, 0.5);
    G.playerPos = c;
    G.player.group.position.set(G.playerPos.x, 0, G.playerPos.z);
    G.player.group.rotation.y = G.player.heading;
    if (input.pressed('KeyF')) {
      G.combat.shoot(G.playerPos, G.player.heading, G.police, audio, (n) => { G.wanted = Math.min(5, G.wanted + n); });
    }
  }
  // Wanted: decays when no police are close; police ram costs health.
  if (G.wanted > 0) {
    let near = false;
    for (const p of G.police.cars) {
      const d = Math.hypot(p.v.group.position.x - G.playerPos.x, p.v.group.position.z - G.playerPos.z);
      if (d < 40) near = true;
      if (d < 3.5 && G.bustCooldown <= 0) {
        G.health -= 5; G.bustCooldown = 1; audio.bump();
        G.hud.setToast('Ram! Health ' + Math.max(0, Math.round(G.health)));
      }
    }
    if (!near) { G.wantedTimer += dt; if (G.wantedTimer > 20) { G.wanted = Math.max(0, G.wanted - 1); G.wantedTimer = 0; } }
    else G.wantedTimer = 0;
  }
  G.bustCooldown = Math.max(0, G.bustCooldown - dt);
  if (G.health <= 0) { // Busted: fine, respawn at the plaza, wanted cleared.
    G.cash = Math.max(0, G.cash - 100);
    G.health = G.maxHealth; G.wanted = 0;
    G.playerPos = { x: PLAZA_POS.x, z: PLAZA_POS.z + 6 };
    G.player.group.position.set(G.playerPos.x, 0, G.playerPos.z);
    if (G.vehicle) { G.vehicle.speed = 0; G.vehicle = null; }
    G.mode = 'foot'; G.player.group.visible = true;
    G.hud.setToast('BUSTED — $100 fine. Back at Palm Plaza.');
    saveGame(G);
  }

  G.traffic.update(dt);
  G.peds.update(dt, t);
  updatePolice(G.police, G.playerPos, G.wanted, dt, G.colliders, audio);
  updateHeli(G.police, G.playerPos, dt, t);
  G.combat.update(dt);
  updateMissions(G.missions, G.playerPos, dt, city.spots, events);
  G.hud.setObjective(G.missions.objective + (G.missions.timer > 0 ? ' — ' + Math.ceil(G.missions.timer) + 's' : ''));
  city.update(dt, t, camera, dirLight);

  // Chase camera (live play only; shot mode keeps the staged camera).
  if (!G.shotMode) {
    const fx = Math.sin(G.player.heading), fz = Math.cos(G.player.heading);
    const tx = G.playerPos.x - fx * 10, tz = G.playerPos.z - fz * 10;
    const lx = G.playerPos.x + fx * 10, lz = G.playerPos.z + fz * 10;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 5);
    camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 5);
    camera.position.y += (4.6 - camera.position.y) * Math.min(1, dt * 5);
    camera.lookAt(lx, 1.5, lz);
  } else if (G.shotCamera) {
    camera.position.copy(G.shotCamera.pos);
    camera.lookAt(G.shotCamera.look);
  }
  G.hud.update(G, dt);
  G.saveTimer += dt;
  if (G.saveTimer > 10) { G.saveTimer = 0; saveGame(G); }
  input.flushEdges();
}

// Menu: click to play (hidden at once in shot mode).
const menu = document.getElementById('menu');
menu.addEventListener('click', () => { menu.style.display = 'none'; G.started = true; });
document.getElementById('menu-title').textContent = 'SOLMAR BAY — STORM RUN';

const clock = new THREE.Clock();
let elapsed = 0;
let firstFrame = true;
function animate() {
  requestAnimationFrame(animate);
  const dt = G.shotMode ? 0 : Math.min(clock.getDelta(), 0.05);
  if (!G.shotMode) elapsed += dt;
  update(dt, elapsed);
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    document.getElementById('status').textContent = 'ready';
  }
}

const shot = shotName();
if (shot) stageShot(G, shot);
G.hud.setObjective(G.missions.objective);
animate();
