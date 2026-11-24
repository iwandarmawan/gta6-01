// Solmar Bay: the game loop and all the wiring between the modules.
// Rico Marlowe, a driver for hire, runs jobs for Vera Costa across a sun-soaked
// coastal city: steal cars, outrun the Solmar PD, and spend the pay at the garage.
import { GARAGE, PLAYER_HP_MAX, PLAYER_WALK_SPEED, WORLD } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { buildCity } from './city.js';
import { clampVehicle, driveVehicle, makeVehicle } from './cars.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPeds, updatePeds } from './peds.js';
import { createCombat, shoot, updateCombat } from './combat.js';
import { addWanted, bustPlayer, createPolice, updatePolice } from './police.js';
import { buyUpgrade, startNextJob, updateMission } from './missions.js';
import { createHud, updateHud } from './hud.js';
import { createRenderer, updateCamera } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;

function makePlayerMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xc23b2e }),
  );
  body.position.y = 1.05;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.MeshLambertMaterial({ color: 0xe8b88a }),
  );
  head.position.y = 1.75;
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x2a2a34 }),
  );
  legs.position.y = 0.3;
  group.add(body, head, legs);
  return group;
}

// Move a point with a radius, sliding along building colliders instead of
// passing through them. Returns the new [x, z].
function moveWithCollision(G, x, z, dx, dz, radius) {
  const hit = (nx, nz) => {
    for (const c of G.city.colliders) {
      if (nx > c.minX - radius && nx < c.maxX + radius && nz > c.minZ - radius && nz < c.maxZ + radius) return true;
    }
    return false;
  };
  let nx = x + dx;
  let nz = z + dz;
  if (!hit(nx, z)) x = nx;
  if (!hit(x, nz)) z = nz;
  return [x, z];
}

function init() {
  const { renderer, scene, camera } = createRenderer();
  const saved = loadSave();
  const G = {
    renderer,
    scene,
    camera,
    input: createInput(),
    audio: createAudio(),
    mode: 'menu',
    paused: false,
    shotCam: false,
    beacon: null,
    beaconMesh: null,
    mission: null,
    packages: null,
    vehicles: [],
    wantedDecay: 0,
    objectiveBase: '',
    player: {
      x: 10,
      z: 10,
      heading: 0,
      hp: PLAYER_HP_MAX,
      cash: saved?.cash ?? 0,
      wanted: 0,
      vehicle: null,
      upgrades: { engine: saved?.engine ?? false, armor: saved?.armor ?? false },
      done: new Set(saved?.done ?? []),
      mesh: null,
    },
  };
  G.city = buildCity(scene);
  G.traffic = createTraffic(scene, 14);
  G.peds = createPeds(scene, 18);
  G.police = createPolice(scene);
  G.combat = createCombat(scene);
  G.hud = createHud(G);
  G.save = () => writeSave({ cash: G.player.cash, upgrades: G.player.upgrades, done: G.player.done });

  const P = G.player;
  P.mesh = makePlayerMesh();
  P.mesh.position.set(P.x, 0, P.z);
  scene.add(P.mesh);

  // Parked, stealable vehicles: the mission sedan, a pickup, the Coast Runner
  // by the garage, and the skiff at the marina.
  const parked = [
    ['sedan', 60, 32, 0],
    ['pickup', -60, 60, Math.PI / 2],
    ['moto', GARAGE.pos[0] + 16, GARAGE.pos[1] - 4, 0],
    ['boat', 172, 100, Math.PI],
  ];
  for (const [kind, x, z, heading] of parked) {
    const v = makeVehicle(kind, x, z, heading);
    scene.add(v.group);
    G.vehicles.push(v);
  }

  // Menu, pause, garage and shooting.
  document.getElementById('start-btn').addEventListener('click', () => {
    G.audio.unlock();
    G.mode = 'play';
    G.hud.showMenu(false);
    G.hud.banner('Solmar Bay', 'Rico Marlowe — driver for hire. Press M for a job.');
    if (!G.mission) startNextJob(G);
  });
  document.getElementById('garage-close').addEventListener('click', () => G.hud.showGarage(false));
  for (const btn of document.querySelectorAll('[data-upgrade]')) {
    btn.addEventListener('click', () => buyUpgrade(G, btn.dataset.upgrade));
  }
  addEventListener('keydown', (e) => {
    G.audio.unlock();
    if (e.code === 'KeyP' && G.mode === 'play') {
      G.paused = !G.paused;
      G.hud.showPause(G.paused);
    }
    if (e.code === 'KeyM' && G.mode === 'play' && !G.paused) startNextJob(G);
    if (e.code === 'KeyG' && G.mode === 'play' && !G.paused) {
      const nearGarage = Math.hypot(P.x - GARAGE.pos[0], P.z - GARAGE.pos[1]) < 16;
      if (nearGarage) G.hud.showGarage(true);
    }
    if (e.code === 'KeyE' && G.mode === 'play' && !G.paused) toggleVehicle(G);
  });
  addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('.overlay')) return;
    G.audio.unlock();
    if (G.mode === 'play' && !G.paused) shoot(G);
  });

  if (shotName) {
    stageShot(G, shotName);
  } else {
    G.hud.showMenu(true);
    document.getElementById('status').textContent = 'ready';
  }
  return G;
}

// Get in the nearest parked vehicle, or get out of the one being driven.
function toggleVehicle(G) {
  const P = G.player;
  if (P.vehicle) {
    const v = P.vehicle;
    v.driver = null;
    P.vehicle = null;
    P.x = v.x - Math.sin(v.heading) * 3;
    P.z = v.z - Math.cos(v.heading) * 3;
    P.heading = v.heading;
    P.mesh.visible = true;
    P.mesh.position.set(P.x, 0, P.z);
    return;
  }
  let best = null;
  let bestDist = 4.5;
  for (const v of G.vehicles) {
    if (v.driver) continue;
    const d = Math.hypot(P.x - v.x, P.z - v.z);
    if (d < bestDist) {
      bestDist = d;
      best = v;
    }
  }
  if (best) {
    best.driver = 'player';
    P.vehicle = best;
    P.mesh.visible = false;
    P.x = best.x;
    P.z = best.z;
    P.heading = best.heading;
    // Stealing a car is a crime: the PD notices.
    addWanted(G, 1);
    G.audio.blip(440, 0.1, 'square', 0.1);
  }
}

function updatePlayer(G, dt) {
  const P = G.player;
  const input = G.input;
  if (P.vehicle) {
    const v = P.vehicle;
    const throttle = input.down('KeyW') || input.down('ArrowUp') ? 1 : input.down('KeyS') || input.down('ArrowDown') ? -0.7 : 0;
    const steer = (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0) - (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
    const boost = P.upgrades.engine ? 1.25 : 1;
    const oldX = v.x;
    const oldZ = v.z;
    driveVehicle(v, steer, throttle, dt, boost);
    clampVehicle(v, WORLD);
    // Buildings stop the car: undo the move that entered one.
    for (const c of G.city.colliders) {
      if (v.x > c.minX - 1 && v.x < c.maxX + 1 && v.z > c.minZ - 1 && v.z < c.maxZ + 1) {
        v.x = oldX;
        v.z = oldZ;
        v.speed *= 0.4;
        break;
      }
    }
    P.x = v.x;
    P.z = v.z;
    P.heading = v.heading;
    G.audio.engine(Math.abs(v.speed) / v.spec.top, true);
  } else {
    const turn = (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0) - (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
    P.heading += turn * 2.6 * dt;
    const forward = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 0.6 : 0);
    const dx = Math.sin(P.heading) * forward * PLAYER_WALK_SPEED * dt;
    const dz = Math.cos(P.heading) * forward * PLAYER_WALK_SPEED * dt;
    const [nx, nz] = moveWithCollision(G, P.x, P.z, dx, dz, 0.8);
    P.x = Math.max(-WORLD / 2 + 2, Math.min(WORLD / 2 - 2, nx));
    P.z = Math.max(-WORLD / 2 + 2, Math.min(WORLD / 2 - 2, nz));
    P.mesh.position.set(P.x, Math.abs(Math.sin(performance.now() / 180)) * 0.08, P.z);
    P.mesh.rotation.y = P.heading;
    G.audio.engine(0, false);
  }
  if (P.hp <= 0) bustPlayer(G);
}

const G = init();
const clock = new THREE.Clock();
let statusSet = false;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (G.mode === 'play' && !G.paused) {
    updatePlayer(G, dt);
    updateTraffic(G.traffic, dt);
    updatePeds(G.peds, dt);
    updatePolice(G, dt);
    updateCombat(G, dt);
    updateMission(G, dt);
    // The mission clock counts down in the objective line.
    if (G.mission && G.mission.timer > 0) {
      G.hud.objectiveEl.textContent = `${G.objectiveBase} — ${Math.ceil(G.mission.timer)}s`;
    }
  } else if (G.mode === 'shot') {
    updateTraffic(G.traffic, dt * 0.2);
    updatePeds(G.peds, dt * 0.2);
  }
  updateHud(G, dt);
  updateCamera(G, dt);
  G.renderer.render(G.scene, G.camera);
  if (!statusSet && !shotName) {
    statusSet = true;
    document.getElementById('status').textContent = 'ready';
  }
}
frame();
