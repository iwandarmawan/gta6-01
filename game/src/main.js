// Solmar Bay — boot and the one loop. The game moves between screens:
// title, play, paused, briefing, and game over (busted / wasted / job
// failed). Input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. Rico Vega starts on foot by
// the plaza; Delgado's first job is to steal a car.
//
// ?seed=N fixes the city and the traffic. ?shot=start|play|chase|mission
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { STEP, WORLD, PLAYER, CAR, MISSIONS, ECONOMY, POLICE } from './config.js';
import { createRng } from './rng.js';
import { buildCity, resolveCircle } from './city.js';
import { createPlayerCar, stepPlayerCar, randomCar } from './cars.js';
import { createTraffic, stepTraffic, nearestTrafficCar } from './traffic.js';
import { createPeds, stepPeds, scarePeds } from './peds.js';
import { createPolice, stepPolice, addWanted } from './police.js';
import { createCombat, stepCombat, shootPistol, punch, reloadPistol, stepEnemies } from './combat.js';
import { createMissions, startMission, updateMission } from './missions.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { loadSave, writeSave, freshSave } from './save.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_PUNCH, ACTION_RELOAD, ACTION_MUTE, ACTION_WEAPON1, ACTION_WEAPON2, ACTION_SHOOT } from './input.js';
import { createRenderer, createPlayerMesh } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : WORLD.seed;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const rng = createRng(seed);
const city = buildCity(renderer.scene, rng);

const saved = loadSave() || freshSave();
const G = {
  rng, city, scene: renderer.scene, camera: renderer.camera,
  mode: 'title',
  time: 0,
  seed,
  cash: saved.cash,
  missionsDone: {},
  missionDefs: MISSIONS,
  player: { x: city.plaza.x + 14, z: city.plaza.z + 6, angle: -Math.PI / 2, speed: 0, vy: 0, grounded: true, health: PLAYER.health },
  playerMesh: createPlayerMesh(),
  inCar: false,
  car: null,
  parkedCars: [],
  wanted: 0,
  mission: { id: 0, stage: 'idle', timer: 0, target: null, state: 'idle', name: '', reward: 0 },
  pendingBrief: 0,
  pendingBriefTimer: 0,
  failReason: '',
  shake: 0, // crash camera shake, seconds remaining
  stats: { shotsFired: 0, hits: 0, pedsHit: 0, carsStolen: 0 },
  audio: createAudio(),
  hud: null,
  input: null,
  traffic: null,
  peds: null,
  police: null,
  combat: null,
  missions: null,
};
for (let i = 1; i <= 5; i += 1) G.missionsDone[i] = saved.bestMission >= i;
if (saved.muted) G.audio.setMuted(true);
renderer.scene.add(G.playerMesh);

G.hud = createHud();
G.traffic = createTraffic(G, renderer.scene, rng);
G.peds = createPeds(G, renderer.scene, rng);
G.police = createPolice(G, renderer.scene);
G.combat = createCombat(G, renderer.scene);
G.combat.enemies = [];
G.missions = createMissions(G, renderer.scene);
G.input = createInput(canvas);

G.saveGame = function saveGame() {
  let best = 0;
  for (let i = 1; i <= 5; i += 1) if (G.missionsDone[i]) best = i;
  writeSave({ cash: G.cash, bestMission: best, muted: G.audio.isMuted() });
};

G.busted = function busted() {
  if (G.mode !== 'play') return;
  G.cash = Math.max(0, G.cash - ECONOMY.bustCost);
  G.wanted = 0;
  G.audio.siren(false);
  G.audio.busted();
  G.player.health = PLAYER.health;
  G.mode = 'over';
  G.hud.showOver('BUSTED', `The Solmar Bay PD took $${ECONOMY.bustCost} and let you walk. Rico is back at the plaza — press Enter to keep going.`);
  G.saveGame();
  respawnPlayer();
};

G.wasted = function wasted() {
  if (G.mode !== 'play') return;
  G.cash = Math.max(0, G.cash - ECONOMY.wastedCost);
  G.wanted = 0;
  G.audio.siren(false);
  G.audio.busted();
  G.player.health = PLAYER.health;
  G.mode = 'over';
  G.hud.showOver('WASTED', `Rico woke up at the plaza clinic, $${ECONOMY.wastedCost} lighter. Press Enter to keep going.`);
  G.saveGame();
  respawnPlayer();
};

function respawnPlayer() {
  // Clear the heat and put Rico back on his feet at the plaza.
  for (const car of G.police.cars) renderer.scene.remove(car.mesh);
  for (const off of G.police.officers) renderer.scene.remove(off.mesh);
  for (const rb of G.police.roadblocks) renderer.scene.remove(rb.mesh);
  G.police.cars = [];
  G.police.officers = [];
  G.police.roadblocks = [];
  if (G.inCar && G.car) {
    renderer.scene.remove(G.car.mesh);
    G.car = null;
    G.inCar = false;
  }
  G.player.x = city.plaza.x + 14;
  G.player.z = city.plaza.z + 6;
  G.player.angle = -Math.PI / 2;
  G.player.vy = 0;
  G.player.grounded = true;
  G.player.speed = 0;
}

function enterCar(car) {
  G.inCar = true;
  G.car = car;
  G.stats.carsStolen += 1;
  G.audio.click();
}

function stealTrafficCar(car) {
  // Pull a traffic car out of the flow and hand it to the player.
  const idx = G.traffic.cars.indexOf(car);
  if (idx !== -1) G.traffic.cars.splice(idx, 1);
  const playerCar = createPlayerCar(renderer.scene, car.x, car.z, car.angle, car.mesh.userData.color || 0xd84a4a, car.shape);
  playerCar.damage = 0;
  renderer.scene.remove(car.mesh);
  enterCar(playerCar);
  addWanted(G, 1);
  G.hud.toast('Car stolen! The heat is on.');
}

function exitCar() {
  if (!G.car) return;
  const a = G.car.angle + Math.PI / 2;
  G.player.x = G.car.x + Math.cos(a) * 3;
  G.player.z = G.car.z + Math.sin(a) * 3;
  G.player.angle = G.car.angle;
  G.player.speed = 0;
  G.parkedCars.push(G.car);
  G.car = null;
  G.inCar = false;
  G.audio.click();
}

function tryEnterCar() {
  // Nearest drivable car: a parked one first, else a traffic car to steal.
  let best = null;
  let bestD = 4.5;
  for (const car of G.parkedCars) {
    const d = Math.hypot(car.x - G.player.x, car.z - G.player.z);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  if (best) {
    const idx = G.parkedCars.indexOf(best);
    G.parkedCars.splice(idx, 1);
    enterCar(best);
    return;
  }
  const near = nearestTrafficCar(G, G.player.x, G.player.z, 4.5);
  if (near) stealTrafficCar(near);
}

function stepPlayerOnFoot(dt) {
  const p = G.player;
  const input = G.input;
  const left = input.held('left');
  const right = input.held('right');
  const up = input.held('up');
  const down = input.held('down');
  if (left) p.angle -= 2.6 * dt;
  if (right) p.angle += 2.6 * dt;
  const run = input.held('run');
  const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let move = 0;
  if (up) move = 1;
  if (down) move = -0.6;
  p.speed = move * speed;
  const nx = p.x + Math.cos(p.angle) * p.speed * dt;
  const nz = p.z + Math.sin(p.angle) * p.speed * dt;
  const fixed = resolveCircle(G.city, nx, nz, PLAYER.radius);
  p.x = fixed.x;
  p.z = fixed.z;
  p.x = Math.max(G.city.bounds.minX, Math.min(G.city.bounds.maxX, p.x));
  p.z = Math.max(G.city.bounds.minZ, Math.min(G.city.bounds.maxZ, p.z));
  if (input.held('jump') && p.grounded) {
    p.vy = PLAYER.jumpSpeed;
    p.grounded = false;
  }
  if (!p.grounded) {
    p.vy -= PLAYER.gravity * dt;
    p.y = (p.y || 0) + p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.grounded = true;
    }
  }
  // Walk cycle on the legs and arms.
  const swinging = Math.abs(p.speed) > 0.5;
  const phase = (G.time * (run ? 11 : 7)) % (Math.PI * 2);
  const swing = swinging ? Math.sin(phase) * 0.55 : 0;
  G.playerMesh.userData.legL.rotation.x = swing;
  G.playerMesh.userData.legR.rotation.x = -swing;
  G.playerMesh.userData.armL.rotation.x = -swing * 0.7;
  G.playerMesh.userData.armR.rotation.x = swing * 0.7;
  G.playerMesh.position.set(p.x, p.y || 0, p.z);
  G.playerMesh.rotation.y = -p.angle + Math.PI / 2;
  G.playerMesh.visible = true;
  // Health trickles back while the heat is off.
  if (G.wanted === 0 && p.health < PLAYER.health) p.health = Math.min(PLAYER.health, p.health + PLAYER.healthRegen * dt);
}

function stepWorld(dt, actions) {
  const input = G.input;
  actions = actions || 0;
  if (actions & ACTION_MUTE) {
    G.audio.setMuted(!G.audio.isMuted());
    G.saveGame();
  }
  if (actions & ACTION_WEAPON1) G.combat.weapon = 'fists';
  if (actions & ACTION_WEAPON2) G.combat.weapon = 'pistol';
  if (actions & ACTION_PUNCH) punch(G);
  if (actions & ACTION_RELOAD) reloadPistol(G);
  if (actions & ACTION_SHOOT) shootPistol(G);
  if (actions & ACTION_ENTER) {
    if (G.inCar) exitCar();
    else tryEnterCar();
  }
  if (G.inCar && G.car) {
    stepPlayerCar(G, G.car, input, dt);
    G.playerMesh.visible = false;
    G.player.x = G.car.x;
    G.player.z = G.car.z;
    G.player.angle = G.car.angle;
  } else {
    stepPlayerOnFoot(dt);
  }
  stepTraffic(G, dt);
  stepPeds(G, dt);
  stepPolice(G, dt);
  stepCombat(G, dt);
  stepEnemies(G, dt);
  updateMission(G, dt);
  // A wrecked car strands the driver: step out and leave the wreck behind.
  if (G.inCar && G.car && G.car.damage >= 100) {
    const wreck = G.car;
    const a = wreck.angle + Math.PI / 2;
    G.player.x = wreck.x + Math.cos(a) * 3;
    G.player.z = wreck.z + Math.sin(a) * 3;
    G.player.angle = wreck.angle;
    G.player.speed = 0;
    G.car = null;
    G.inCar = false;
    renderer.scene.remove(wreck.mesh);
    G.hud.toast('The car is wrecked — get out!');
  }
  if (G.player.health <= 0) G.wasted();
  if (G.pendingBrief > 0) {
    G.pendingBriefTimer -= dt;
    if (G.pendingBriefTimer <= 0) {
      const next = G.pendingBrief;
      G.pendingBrief = 0;
      G.mode = 'brief';
      G.hud.showBrief(MISSIONS[next - 1]);
    }
  }
  G.audio.engine(G.inCar ? G.car.speed : 0, G.inCar);
  G.audio.siren(G.wanted > 0 && (G.police.cars.length > 0 || G.police.officers.length > 0));
}

function announce(message) {
  status.textContent = message;
}

function startGame() {
  respawnPlayer();
  G.cash = saved.cash;
  G.player.health = PLAYER.health;
  G.wanted = 0;
  G.mode = 'brief';
  G.hud.showBrief(MISSIONS[0]);
  announce('Solmar Bay. Rico Vega. Press Enter to start the first job.');
}

function runShot(name) {
  stageShot(name, G);
  let painted = 0;
  function paint() {
    // dt = 1 snaps the chase camera straight to its staged spot.
    renderer.updateCamera(G, 1);
    renderer.render();
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();
  G.hud.showPanel('title');
  G.hud.objective('Press Enter — Rico Vega is waiting at the plaza');

  function handleActions(actions) {
    // Clicking starts the game from the title and retries from game over —
    // the title screen promises "press Enter or click", so a click counts.
    const confirm = (actions & ACTION_CONFIRM) || (actions & ACTION_SHOOT);
    if (screen === 'title' && confirm) {
      G.audio.unlock();
      screen = 'play';
      G.mode = 'play';
      startGame();
    } else if (screen === 'play' && (actions & ACTION_PAUSE)) {
      screen = 'paused';
      G.mode = 'paused';
      G.saveGame(); // pausing is a safe moment to persist cash and progress
      G.hud.showPause(G);
      announce('Paused.');
    } else if (screen === 'paused' && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = 'play';
      G.mode = 'play';
      G.hud.showPanel(null);
      announce('Playing.');
    } else if (screen === 'brief' && confirm) {
      const id = G.mode === 'brief' ? (G.pendingBriefId || 1) : 1;
      screen = 'play';
      G.mode = 'play';
      G.hud.showPanel(null);
      startMission(G, id);
      announce(`Job ${id} started.`);
    } else if (screen === 'over' && confirm) {
      screen = 'play';
      G.mode = 'play';
      G.hud.showPanel(null);
      // After busted/wasted: back on the street, job as it was.
      if (G.mission.state === 'failed') {
        startMission(G, G.mission.id);
      }
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    // Camera smoothing runs on wall time so it converges even when the
    // frame rate is low; the world itself still steps on fixed 1/60 s.
    const frameDt = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += frameDt;
    last = now;
    // The briefing screen tracks which job it is showing.
    if (G.mode === 'brief' && screen !== 'brief') screen = 'brief';
    if (G.mode === 'over' && screen !== 'over') screen = 'over';
    if (G.mode === 'play') screen = screen === 'paused' ? 'paused' : 'play';
    // One action-take per frame: the screen logic reads it first, the world
    // gets what is left on its first fixed step, so no press is lost or doubled.
    const actions = G.input.takeActions();
    handleActions(actions);
    if (screen === 'play') {
      let first = true;
      while (accumulator >= STEP) {
        G.time += STEP;
        stepWorld(STEP, first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.updateCamera(G, frameDt);
    G.hud.update(G, 1 / 60);
    renderer.render();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      G.mode = 'paused';
      G.hud.showPause(G);
      announce('Paused.');
    }
  });

  // Track which job the briefing panel is showing.
  const origShowBrief = G.hud.showBrief.bind(G.hud);
  G.hud.showBrief = (def) => {
    G.pendingBriefId = def.id;
    origShowBrief(def);
  };

  announce('Solmar Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

// For play-tests: the whole live state is reachable as window.SB.
window.SB = G;
window.__game = G;

if (shot) runShot(shot);
else runGame();
