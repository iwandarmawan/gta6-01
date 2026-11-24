// main.js — Solmar Bay: Dawn Patrol. Wires the city, vehicles, missions,
// police, HUD and the shot system together.
import THREE from 'three';
import { createRenderer, createScene, createCamera } from './render.js';
import { buildCity } from './city.js';
import { makeCar, placeCar, driveCar } from './cars.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { spawnPeds, updatePeds } from './peds.js';
import { spawnPolice, makeHeli, updatePolice, updateHeli } from './police.js';
import { shoot } from './combat.js';
import { missionState, makeBeacon, placeBeacon, missionTarget, updateMissions } from './missions.js';
import { initHud, updateHud } from './hud.js';
import { initInput, pressed } from './input.js';
import { loadSave, storeSave } from './save.js';
import { stageShot } from './shots.js';
import { WORLD, PLAYER, GARAGE } from './config.js';
import { sfx } from './audio.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotMode = !!shotName;

const renderer = createRenderer();
const { scene, sun } = createScene();
const camera = createCamera();
const cityRefs = buildCity(scene);

const save = loadSave();
const state = {
  scene, camera, renderer, shotMode,
  cash: save.cash, hp: save.hp, engine: save.engine, armor: save.armor,
  wanted: 0, toast: '', toastAt: 0,
  vehicle: null, missions: missionState(save),
  beaconPos: { x: 8, z: 6 },
  time: 0,
};

// Player: Rico Marlowe, red shirt, on foot at the plaza.
const player = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: 0xc23a2e, roughness: 0.8 }));
  body.position.y = 0.95; body.castShadow = true;
  player.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 }));
  head.position.y = 1.65; player.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: 0.9 }));
  legs.position.y = 0.3; player.add(legs);
}
player.position.set(0, 0, 10);
scene.add(player);
state.player = player;

// Vehicles.
const sedan = makeCar('sedan'); placeCar(sedan, 8, 6, Math.PI * 0.75, 0); scene.add(sedan);
const pickup = makeCar('pickup'); placeCar(pickup, 30, -40, Math.PI / 2, 0); scene.add(pickup);
const bike = makeCar('bike'); placeCar(bike, 20, -48, 0, 0); scene.add(bike);
const skiff = makeCar('skiff'); placeCar(skiff, WORLD.marina.x + 5, 175, 0, 0); scene.add(skiff);
state.sedan = sedan; state.pickup = pickup; state.bike = bike; state.skiff = skiff;
state.vehicles = [sedan, pickup, bike, skiff];

state.traffic = spawnTraffic(scene);
state.peds = spawnPeds(scene);
state.police = spawnPolice(scene);
const heli = makeHeli();
heli.position.set(60, 30, 60);
scene.add(heli);
state.heli = heli;

const beacon = makeBeacon();
scene.add(beacon);
state.beacon = beacon;
{
  const t = missionTarget(state.missions);
  placeBeacon(beacon, t.x, t.z);
  state.beaconPos = { x: t.x, z: t.z };
}

const hud = initHud();
initInput();

let lastShot = false;
function nearVehicle(who, car, dist = 3.2) {
  const dx = who.position.x - car.position.x;
  const dz = who.position.z - car.position.z;
  return dx * dx + dz * dz < dist * dist;
}

function update(dt) {
  state.time += dt;
  // Lighthouse beam sweeps; birds drift east with the dawn.
  if (cityRefs.beam) cityRefs.beam.rotation.y += dt * 0.4;
  for (const b of cityRefs.birds) {
    b.position.x += dt * 2.2;
    if (b.position.x > 200) b.position.x = -200;
  }
  updateTraffic(state.traffic, dt);
  updatePeds(state.peds, dt, state.time);

  // On foot.
  if (!state.vehicle) {
    const speed = pressed('run') ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const fwd = (pressed('up') ? 1 : 0) - (pressed('down') ? 1 : 0);
    const strafe = (pressed('right') ? 1 : 0) - (pressed('left') ? 1 : 0);
    if (fwd || strafe) {
      const a = player.rotation.y;
      player.position.x += (Math.sin(a) * fwd + Math.cos(a) * strafe) * speed * dt;
      player.position.z += (Math.cos(a) * fwd - Math.sin(a) * strafe) * speed * dt;
    }
    if (pressed('left')) player.rotation.y += 2.4 * dt;
    if (pressed('right')) player.rotation.y -= 2.4 * dt;
    if (pressed('interact')) {
      for (const car of state.vehicles) {
        if (nearVehicle(player, car)) {
          state.vehicle = car;
          state.toast = car.userData.kind === 'skiff' ? 'Boarded the skiff' : 'Stole the ' + car.userData.kind;
          state.toastAt = performance.now();
          sfx.pickup();
          break;
        }
      }
    }
    if (pressed('shoot') && !lastShot) shoot(state);
    // In shot mode the staged camera survives: the chase-cam code below
    // would otherwise overwrite it every frame (it does not depend on dt).
    if (!shotMode) {
      camera.position.set(
        player.position.x - Math.sin(player.rotation.y) * 9,
        5.5,
        player.position.z - Math.cos(player.rotation.y) * 9);
      camera.lookAt(player.position.x, 1.6, player.position.z);
    }
  } else {
    // Driving.
    const input = { up: pressed('up'), down: pressed('down'), left: pressed('left'), right: pressed('right') };
    const boost = state.engine ? GARAGE.engineBoost : 1;
    const colliding = state.vehicle.position.z > WORLD.seaZ && state.vehicle.userData.kind !== 'skiff';
    driveCar(state.vehicle, dt, input, { boost, colliding });
    if (pressed('interact')) {
      state.vehicle = null;
      state.toast = 'Got out';
      state.toastAt = performance.now();
    }
    if (pressed('shoot') && !lastShot) shoot(state);
    const v = state.vehicle;
    const back = 11 + Math.abs(v.userData.speed || 0) * 0.12;
    // In shot mode the staged camera survives (see the on-foot branch).
    if (!shotMode) {
      camera.position.set(
        v.position.x - Math.sin(v.userData.heading) * back,
        6.5,
        v.position.z - Math.cos(v.userData.heading) * back);
      camera.lookAt(v.position.x, 1.4, v.position.z);
    }
  }
  lastShot = pressed('shoot');

  updateMissions(state, dt);
  updatePolice(state.police, state.vehicle || player, dt, state.wanted);
  // In shot mode the heli stays exactly where the shot staged it:
  // updateHeli repositions it absolutely every frame, ignoring dt.
  if (!shotMode) updateHeli(heli, state.vehicle || player, dt, state.time, state.wanted);
  // Wanted decays slowly when the player stays out of trouble.
  if (state.wanted > 0 && Math.random() < dt * 0.02) state.wanted -= 1;
  // Garage: drive in and press E to buy upgrades (repair $50 / engine $400 / armor $300).
  if (state.vehicle) {
    const dx = state.vehicle.position.x - WORLD.garage.x;
    const dz = state.vehicle.position.z - WORLD.garage.z;
    if (dx * dx + dz * dz < 100) {
      if (!state.engine && state.cash >= GARAGE.engine) {
        state.cash -= GARAGE.engine; state.engine = true;
        state.toast = 'Engine upgrade fitted (+25% speed)';
        state.toastAt = performance.now();
      } else if (!state.armor && state.cash >= GARAGE.armor) {
        state.cash -= GARAGE.armor; state.armor = true;
        state.hp = Math.min(150, state.hp + GARAGE.armorHp);
        state.toast = 'Armor fitted (+50 HP)';
        state.toastAt = performance.now();
      } else if (state.hp < 100 && state.cash >= GARAGE.repair) {
        state.cash -= GARAGE.repair; state.hp = 100;
        state.toast = 'Repaired ($50)';
        state.toastAt = performance.now();
      }
    }
  }
  updateHud(hud, state);
  storeSave(state);
}

let last = performance.now();
let frames = 0;
function loop(now) {
  const dt = shotMode ? 0 : Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
  if (++frames === 3) document.getElementById('status').textContent = 'ready';
  requestAnimationFrame(loop);
}

if (shotMode) {
  // Screenshots are the product: the menu overlay must never cover the frame.
  const menu = document.getElementById('menu');
  if (menu) menu.style.display = 'none';
  stageShot(state, shotName);
  updateHud(hud, state);
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
document.getElementById('status').textContent = 'ready';
requestAnimationFrame(loop);
