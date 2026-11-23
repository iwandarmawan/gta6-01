// Solmar Bay — bootstrap and game loop. Builds the world, wires
// every system together, runs the state machine (menu / playing /
// paused / over) and drives the player on foot, by car and by boat.

import { WORLD, PLACES, KEYS, TUNING } from './config.js';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { loadSave, storeSave } from './save.js';
import { createAudio } from './audio.js';
import { buildCity } from './city.js';
import { createRenderer, updateDayNight, createCameraRig } from './render.js';
import { makeCar, driveCar, makeBoat, driveBoat } from './cars.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './peds.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { applyShot } from './shots.js';

const THREE = window.THREE;

window.addEventListener('error', (e) => {
  window.__gameError = (window.__gameError || '') + (e.message || e.error) + '\n';
  const d = document.getElementById('err');
  if (d) d.textContent = window.__gameError;
});
window.addEventListener('unhandledrejection', (e) => {
  window.__gameError = (window.__gameError || '') + 'rejection: ' + e.reason + '\n';
  const d = document.getElementById('err');
  if (d) d.textContent = window.__gameError;
});

const container = document.getElementById('game');
const save = loadSave();
const input = createInput(window);
const audio = createAudio();
audio.setMuted(save.muted);
const env = createRenderer(container);
const rig = createCameraRig(env.camera);
const city = buildCity(env.scene, WORLD.seed);
const traffic = createTraffic(env.scene, city, makeRng(WORLD.seed + 5));
const peds = createPedestrians(env.scene, city, WORLD.seed);
const police = createPolice(env.scene, city, makeRng(WORLD.seed + 9));

// The player on foot: blue jacket, red cap, visible from behind.
function makePlayerMesh() {
  const group = new THREE.Group();
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2f38 });
  for (const lx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.28), legMat);
    leg.position.set(lx, 0.28, 0);
    leg.castShadow = true;
    group.add(leg);
  }
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 1.0, 0.45),
    new THREE.MeshLambertMaterial({ color: 0x2e5fa8 }),
  );
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xf0c8a0 }),
  );
  head.position.y = 1.85;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10),
    new THREE.MeshLambertMaterial({ color: 0xc23b2e }),
  );
  cap.position.y = 2.06;
  group.add(cap);
  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.05, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xc23b2e }),
  );
  brim.position.set(0, 2.0, 0.32);
  group.add(brim);
  return group;
}

const playerGroup = makePlayerMesh();
playerGroup.position.set(PLACES.playerStart.x, 0, PLACES.playerStart.z);
playerGroup.rotation.y = PLACES.playerStart.heading;
env.scene.add(playerGroup);

const player = {
  group: playerGroup,
  pos: playerGroup.position,
  heading: PLACES.playerStart.heading,
  speed: 0,
  vehicle: 'foot',
  car: null,
  boat: null,
};

// Parked cars the player can steal, plus the player's own red car.
const parkedCars = [];
function parkCar(x, z, heading, color) {
  const car = makeCar(env.scene, x, z, heading, color, false);
  parkedCars.push(car);
  return car;
}
const playerCar = parkCar(-20, -40, 0, 0xc23b2e);
parkCar(-140, 36, Math.PI / 2, 0xe8c832);
parkCar(40, -84, 0, 0xeeeeee);
parkCar(170, -84, Math.PI / 2, 0x3aa655);

const boat = makeBoat(env.scene, 244, 72);

const hud = createHud();

const game = {
  mode: 'menu',
  time: 0,
  timeOfDay: 0.42,
  timeFrozen: false,
  cash: save.cash,
  save,
  env, rig, city, input, audio, hud, police, peds, traffic,
  player, playerCar, boat,
  snapCamera: false,
  parkCars: parkedCars,
};

game.saveGame = function saveGame() {
  save.cash = game.cash;
  storeSave(save);
};

const combat = createCombat(game);
const missions = createMissions(env.scene, game);
game.combat = combat;
game.missions = missions;

game.onWasted = function onWasted() {
  if (game.mode !== 'playing') return;
  game.mode = 'over';
  audio.engine(false, 0);
  audio.siren(false, 0);
  hud.showGameOver('wasted', retryRun, quitToMenu);
};

game.onBusted = function onBusted() {
  if (game.mode !== 'playing') return;
  game.mode = 'over';
  audio.engine(false, 0);
  audio.siren(false, 0);
  hud.showGameOver('busted', retryRun, quitToMenu);
};

game.hideStartScreen = function hideStartScreen() {
  hud.hideStart();
  document.getElementById('hud').style.display = 'block';
};

function startGame() {
  audio.ensure();
  game.hideStartScreen();
  game.mode = 'playing';
  hud.toast('Welcome to Solmar Bay. Visit Rico\'s Garage ($) to take a job.', 5);
}

function retryRun() {
  document.querySelectorAll('.overlay').forEach((o) => o.remove());
  document.getElementById('hud').style.display = 'block';
  if (missions.active) missions.fail('Run restarted');
  police.reset();
  combat.reset();
  player.vehicle = 'foot';
  player.car = null;
  player.boat = null;
  player.pos.set(PLACES.playerStart.x, 0, PLACES.playerStart.z);
  player.heading = PLACES.playerStart.heading;
  player.group.visible = true;
  player.group.position.copy(player.pos);
  player.group.rotation.y = player.heading;
  playerCar.health = playerCar.maxHealth;
  playerCar.pos.set(-20, 0, -40);
  playerCar.heading = 0;
  playerCar.speed = 0;
  boat.health = boat.maxHealth;
  boat.pos.set(244, 0, 72);
  boat.heading = Math.PI / 2;
  boat.speed = 0;
  game.mode = 'playing';
  game.snapCamera = true;
  hud.toast('Back on your feet. The city is still yours to take.', 3);
}

function quitToMenu() {
  document.querySelectorAll('.overlay').forEach((o) => o.remove());
  if (missions.active) missions.fail('Quit to menu');
  police.reset();
  game.mode = 'menu';
  document.getElementById('hud').style.display = 'none';
  hud.showStart(save, startGame);
}

game.enterCar = function enterCar(car) {
  const pi = parkedCars.indexOf(car);
  if (pi >= 0) parkedCars.splice(pi, 1);
  const ti = traffic.cars.findIndex((t) => t.car === car);
  if (ti >= 0) traffic.cars.splice(ti, 1);
  player.vehicle = 'car';
  player.car = car;
  player.group.visible = false;
  rig.yaw = car.heading;
  game.snapCamera = true;
  audio.beep(660, 0.1);
};

function exitCar() {
  const car = player.car;
  if (!car) return;
  player.vehicle = 'foot';
  player.car = null;
  player.pos.set(car.pos.x - Math.cos(car.heading) * 2.4, 0, car.pos.z + Math.sin(car.heading) * 2.4);
  player.heading = car.heading;
  player.group.visible = true;
  player.group.position.copy(player.pos);
  player.group.rotation.y = player.heading;
  if (!parkedCars.includes(car)) parkedCars.push(car);
  game.snapCamera = true;
}

function boardBoat() {
  player.vehicle = 'boat';
  player.boat = boat;
  player.group.visible = false;
  rig.yaw = boat.heading;
  game.snapCamera = true;
  hud.toast('At the helm. Sail to the buoy.', 3);
  audio.beep(760, 0.15);
}

function exitBoat() {
  player.vehicle = 'foot';
  player.boat = null;
  player.pos.set(PLACES.dock.x, 0, PLACES.dock.z);
  player.heading = Math.PI;
  player.group.visible = true;
  player.group.position.copy(player.pos);
  player.group.rotation.y = player.heading;
  game.snapCamera = true;
}

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  const all = [...parkedCars, ...traffic.cars.map((t) => t.car)];
  for (const car of all) {
    const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

// ---- Per-frame updates ----
let pendingAction = null;

function updateOnFoot(dt) {
  const yaw = rig.yaw;
  const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
  const right = { x: -Math.cos(yaw), z: Math.sin(yaw) };
  let mx = 0;
  let mz = 0;
  if (input.isDown(KEYS.up)) { mx += fwd.x; mz += fwd.z; }
  if (input.isDown(KEYS.down)) { mx -= fwd.x; mz -= fwd.z; }
  if (input.isDown(KEYS.right)) { mx += right.x; mz += right.z; }
  if (input.isDown(KEYS.left)) { mx -= right.x; mz -= right.z; }
  const len = Math.hypot(mx, mz);
  const running = input.isDown(KEYS.run);
  const speed = running ? TUNING.runSpeed : TUNING.walkSpeed;
  const prev = { x: player.pos.x, z: player.pos.z };
  if (len > 0) {
    mx /= len;
    mz /= len;
    player.heading = Math.atan2(mx, mz);
    player.pos.x += mx * speed * dt;
    player.pos.z += mz * speed * dt;
    player.speed = speed;
    player.group.position.y = Math.abs(Math.sin(game.time * 11)) * 0.07;
  } else {
    player.speed = 0;
    player.group.position.y = 0;
  }
  city.resolveCircle(player.pos, TUNING.playerRadius, prev);
  player.group.position.x = player.pos.x;
  player.group.position.z = player.pos.z;
  player.group.rotation.y = player.heading;

  if (input.wasPressed(KEYS.punch)) combat.tryPunch();

  // Interaction prompt and the E key.
  pendingAction = null;
  const boatD = Math.hypot(boat.pos.x - player.pos.x, boat.pos.z - player.pos.z);
  const car = nearestCar(4.5);
  const garageD = Math.hypot(PLACES.garage.x - player.pos.x, PLACES.garage.z - player.pos.z);
  if (boatD < 5.5) {
    hud.setPrompt('Press E to board the boat');
    pendingAction = 'boat';
  } else if (car) {
    hud.setPrompt('Press E to enter the car');
    pendingAction = { type: 'car', car };
  } else if (garageD < 14 && missions.index < 3 && !missions.active) {
    hud.setPrompt('Press E to start mission: ' + MISSIONS[missions.index].name);
    pendingAction = 'mission';
  } else {
    hud.setPrompt('');
  }
  if (input.wasPressed(KEYS.enter) && pendingAction) {
    if (pendingAction === 'boat') boardBoat();
    else if (pendingAction === 'mission') missions.startNext();
    else if (pendingAction.type === 'car') game.enterCar(pendingAction.car);
  }
}

function updateDriving(dt) {
  const car = player.car;
  if (!car) {
    player.vehicle = 'foot';
    return;
  }
  // The camera and the HUD follow the player position, so keep it
  // glued to the car while driving.
  player.pos.copy(car.pos);
  player.heading = car.heading;
  const throttle = (input.isDown(KEYS.up) ? 1 : 0) + (input.isDown(KEYS.down) ? -1 : 0)
    + (game.shotDrive ? 0.7 : 0);
  const steer = (input.isDown(KEYS.left) ? 1 : 0) + (input.isDown(KEYS.right) ? -1 : 0);
  const handbrake = input.isDown(KEYS.brake);
  if (car.health <= 0) {
    car.speed *= Math.max(0, 1 - 2 * dt);
    hud.setPrompt('Your car is wrecked — press E to get out and find another ride');
    if (input.wasPressed(KEYS.enter)) exitCar();
    player.speed = car.speed;
    return;
  }
  const res = driveCar(car, dt, throttle, steer, handbrake, city);
  player.speed = car.speed;
  if (res.hit && res.impact > 9) {
    combat.damagePlayer((res.impact - 9) * 1.1);
    game.audio.crash(0.7);
  }
  const garageD = Math.hypot(PLACES.garage.x - car.pos.x, PLACES.garage.z - car.pos.z);
  if (garageD < 16 && car.health < car.maxHealth && game.cash >= TUNING.repairCost) {
    hud.setPrompt('Press R to repair the car ($' + TUNING.repairCost + ')');
    if (input.wasPressed(KEYS.retry)) {
      game.cash -= TUNING.repairCost;
      car.health = car.maxHealth;
      game.saveGame();
      hud.toast('Car repaired. -$' + TUNING.repairCost, 2.5);
      audio.beep(880, 0.15);
    }
  } else {
    hud.setPrompt(Math.abs(car.speed) < 1 ? 'Press E to step out' : '');
  }
  if (input.wasPressed(KEYS.enter) && Math.abs(car.speed) < 1) exitCar();
}

function updateBoating(dt) {
  const throttle = (input.isDown(KEYS.up) ? 1 : 0) + (input.isDown(KEYS.down) ? -1 : 0);
  const steer = (input.isDown(KEYS.left) ? 1 : 0) + (input.isDown(KEYS.right) ? -1 : 0);
  driveBoat(boat, dt, throttle, steer, city);
  player.speed = boat.speed;
  player.pos.copy(boat.pos);
  player.heading = boat.heading;
  if (boat.health <= 0) {
    boat.health = boat.maxHealth;
    boat.pos.set(244, 0, 72);
    boat.heading = Math.PI / 2;
    boat.speed = 0;
    if (missions.active) missions.fail('The boat was wrecked');
    exitBoat();
    hud.toast('The boat went down. She is back at the dock.', 3);
    return;
  }
  const dockD = Math.hypot(PLACES.dock.x - boat.pos.x, PLACES.dock.z - boat.pos.z);
  if (dockD < 12 && Math.abs(boat.speed) < 1) {
    hud.setPrompt('Press E to step ashore');
    if (input.wasPressed(KEYS.enter)) exitBoat();
  } else {
    hud.setPrompt('');
  }
}

function hudState() {
  const step = missions.active ? missions.active.def.steps[missions.active.stepIndex] : null;
  return {
    cash: game.cash,
    health: combat.health,
    maxHealth: combat.maxHealth,
    stars: police.stars,
    speedKmh: Math.abs(player.speed) * 3.6,
    vehicle: player.vehicle,
    missionName: missions.active ? missions.active.def.name : null,
    objective: step ? step.label : '',
    timeLeft: missions.active ? missions.active.timeLeft : 0,
    targetDist: missions.active ? missions.targetDistance() : 0,
    timeOfDay: game.timeOfDay,
    time: game.time,
    yaw: rig.yaw,
    player,
    target: missions.currentTarget(),
    policeCars: police.cars,
    trafficCars: traffic.cars,
    boat,
  };
}

// ---- Main loop ----
let last = performance.now();
let frames = 0;
const statusEl = document.getElementById('status');

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  game.time += dt;
  if (!game.timeFrozen) game.timeOfDay = (game.timeOfDay + dt / TUNING.dayLength) % 1;

  const night = updateDayNight(env, game.timeOfDay);
  city.setNight(night);
  city.update(dt);

  if (input.anyKey) audio.ensure();

  if (game.mode === 'menu') {
    rig.orbit({ x: 10, z: 0 }, 130, game.time * 0.045, 58);
    traffic.update(dt, null);
    peds.update(dt, player.pos, 0);
  } else if (game.mode === 'playing') {
    if (input.wasPressed(KEYS.pause)) {
      game.mode = 'paused';
      audio.engine(false, 0);
      audio.siren(false, 0);
      hud.showPause({
        onResume: () => { game.mode = 'playing'; },
        onRestart: retryRun,
        onMute: () => {
          save.muted = !save.muted;
          audio.setMuted(save.muted);
          storeSave(save);
        },
        muted: save.muted,
      });
    }
    if (input.wasPressed(KEYS.mute)) {
      save.muted = !save.muted;
      audio.setMuted(save.muted);
      storeSave(save);
      hud.toast(save.muted ? 'Sound muted' : 'Sound on', 1.5);
    }

    if (player.vehicle === 'foot') updateOnFoot(dt);
    else if (player.vehicle === 'car') updateDriving(dt);
    else updateBoating(dt);

    missions.update(dt);
    police.update(dt, player, game);
    traffic.update(dt, player.car);
    peds.update(dt, player.pos, Math.abs(player.speed));
    combat.update(dt);

    if (police.stars > save.bestWanted) {
      save.bestWanted = police.stars;
      storeSave(save);
    }

    const driving = player.vehicle !== 'foot';
    audio.engine(driving, driving ? Math.abs(player.speed) / TUNING.carMaxSpeed : 0);
    audio.siren(police.stars > 0, dt);

    rig.update(player.pos, player.heading, dt, input, game.snapCamera);
    game.snapCamera = false;
    hud.update(hudState(), dt);
  } else if (game.mode === 'paused') {
    if (input.wasPressed(KEYS.pause)) {
      document.querySelectorAll('.overlay').forEach((o) => o.remove());
      game.mode = 'playing';
    }
  } else if (game.mode === 'over') {
    if (input.wasPressed(KEYS.retry)) retryRun();
    rig.update(player.pos, player.heading, dt, null, false);
  }

  env.renderer.render(env.scene, env.camera);
  frames += 1;
  if (frames === 1 && statusEl) statusEl.textContent = 'ready';
  input.endFrame();
}

// Boot.
document.getElementById('hud').style.display = 'none';
hud.showStart(save, startGame);
const shot = applyShot(game);
if (shot === 'start') {
  // Stay on the menu; the start screen is the shot.
}
window.__game = game;
window.__shot = shot;
requestAnimationFrame(frame);
