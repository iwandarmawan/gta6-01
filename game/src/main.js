// Solmar Bay — night build. Wires the city, vehicles, traffic, peds, police,
// missions, HUD and audio into one loop, and stages the four screenshots.
import { buildCity } from './city.js';
import { makeVehicle, driveCar, hitsCollider } from './cars.js';
import { makeTraffic, updateTraffic } from './traffic.js';
import { makePeds, updatePeds } from './peds.js';
import { makePolice, updatePolice } from './police.js';
import { makeCombat, shoot, updateCombat } from './combat.js';
import { makeMissions, currentMission, missionBeacon, updateMissions, startFare } from './missions.js';
import { makeHud, updateHud } from './hud.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { saveGame, loadGame } from './save.js';
import { makeRender, followCamera } from './render.js';
import { shotFromUrl, stageShot } from './shots.js';
import { POI } from './config.js';

const { renderer, scene, camera, headlight } = makeRender();
const { colliders, animated } = buildCity(scene);
const hud = makeHud();
const input = makeInput();
const audio = makeAudio();
const traffic = makeTraffic(scene, 10);
const peds = makePeds(scene, 18);
const police = makePolice(scene);
const combat = makeCombat(scene);
const missions = makeMissions();

// Player on foot.
const player = new THREE.Group();
const jacket = new THREE.MeshLambertMaterial({ color: 0x8c2f2f, emissive: 0x301010, emissiveIntensity: 0.8 });
const skin = new THREE.MeshLambertMaterial({ color: 0xc9a184 });
const pLegs = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.85, 0.3), new THREE.MeshLambertMaterial({ color: 0x1a1d26 }));
pLegs.position.y = 0.42;
const pTorso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.68, 0.34), jacket);
pTorso.position.y = 1.15;
const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), skin);
pHead.position.y = 1.7;
player.add(pLegs, pTorso, pHead);
player.position.set(2, 0, 8);
scene.add(player);

// Player vehicles, parked around the night city.
const sedan = makeVehicle('sedan', 0xb02020);
sedan.position.set(6, 0, -4);
sedan.userData.speed = 0;
sedan.userData.heading = 0.6;
sedan.rotation.y = 0.6;
scene.add(sedan);
const pickup = makeVehicle('pickup', 0xd07020);
pickup.position.set(60, 0, -128);
pickup.userData.speed = 0;
pickup.userData.heading = -Math.PI / 2;
pickup.rotation.y = -Math.PI / 2;
scene.add(pickup);
const moto = makeVehicle('moto', 0x20a0c0);
moto.position.set(-6, 0, 10);
moto.userData.speed = 0;
moto.userData.heading = 2.2;
moto.rotation.y = 2.2;
scene.add(moto);
const skiff = makeVehicle('boat', 0xe8e8e8);
skiff.position.set(POI.marina.x, 0, -168);
skiff.userData.speed = 0;
skiff.userData.heading = Math.PI;
skiff.userData.topMul = 0.9;
skiff.rotation.y = Math.PI;
scene.add(skiff);
const vehicles = [sedan, pickup, moto, skiff];

// Mission beacon: a pillar of light plus a ground ring.
const beaconMat = new THREE.MeshBasicMaterial({
  color: 0xffe14d, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
});
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 34, 12, 1, true), beaconMat);
scene.add(beacon);
const beaconRing = new THREE.Mesh(
  new THREE.RingGeometry(2.4, 3.2, 24),
  new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
);
beaconRing.rotation.x = -Math.PI / 2;
beaconRing.position.y = 0.08;
scene.add(beaconRing);

// Game state.
const saved = loadGame();
const G = {
  player, vehicles: { sedan, pickup, moto, skiff }, traffic, police, shot: {},
  hud, missions, stats: { engine: false, armor: false },
  car: null, inCar: false, speed: 0, heading: 2.4,
  cash: saved?.cash ?? 0, health: 100, wanted: 0, wantedTimer: 0,
  objective: 'Find the next job', missionTimer: 0, toast: '', toastIn: 0,
  beacon: null, score: saved?.score ?? 0, started: false, shotMode: false,
  policeCars: [], lastShotPos: null, stolen: new Set(), busted: false,
};
if (saved) {
  missions.index = saved.missionIndex || 0;
  G.stats.engine = !!saved.engine;
  G.stats.armor = !!saved.armor;
}

G.enterCar = (vehicle, pose) => {
  if (pose) {
    vehicle.position.set(pose.x, 0, pose.z);
    vehicle.userData.heading = pose.heading;
    vehicle.userData.speed = pose.speed || 0;
    vehicle.rotation.y = pose.heading;
  }
  G.car = vehicle;
  G.inCar = true;
  G.speed = vehicle.userData.speed || 0;
  G.heading = vehicle.userData.heading;
  player.visible = false;
  if (!G.stolen.has(vehicle) && vehicle !== skiff) {
    G.stolen.add(vehicle);
    addWanted(1);
  }
};

G.spawnPoliceCar = () => {
  const car = makeVehicle('police', 0x1a2a4a);
  car.userData.speed = 0;
  car.userData.heading = 0;
  scene.add(car);
  police.cars.push(car);
  return car;
};

function addWanted(n) {
  G.wanted = Math.min(5, G.wanted + n);
  G.wantedTimer = 0;
}

function nearestVehicle(maxD) {
  let best = null;
  let bestD = maxD;
  for (const v of vehicles) {
    if (v === G.car) continue;
    const d = Math.hypot(v.position.x - player.position.x, v.position.z - player.position.z);
    if (d < bestD) {
      best = v;
      bestD = d;
    }
  }
  return best;
}

function showEnd(title, sub) {
  G.busted = true;
  hud.endcard.style.display = 'block';
  hud.endcard.innerHTML = `<h1>${title}</h1><p>${sub}</p><button id="respawnBtn">BACK ON THE STREET</button>`;
  document.getElementById('respawnBtn').addEventListener('click', () => {
    hud.endcard.style.display = 'none';
    G.busted = false;
    G.health = 100;
    G.wanted = 0;
    G.cash = Math.max(0, G.cash - 100);
    player.position.set(2, 0, 8);
    G.heading = 2.4;
    if (G.car) {
      G.car = null;
      G.inCar = false;
      player.visible = true;
    }
    saveGame(G);
  });
}

hud.startBtn.addEventListener('click', () => {
  audio.ensure();
  hud.menu.style.display = 'none';
  G.started = true;
  input.clearPressed();
});

// Screenshot staging.
const { shot, seed } = shotFromUrl();
if (shot) stageShot(shot, G);

// Main loop.
const clock = new THREE.Clock();
let statusSet = false;
function frame() {
  requestAnimationFrame(frame);
  // In shot mode the world is frozen: the staged positions, speeds and
  // objectives hold for the screenshot instead of driving away under the
  // virtual-time budget.
  let dt = Math.min(0.05, clock.getDelta());
  if (G.shotMode) dt = 0;
  const t = clock.elapsedTime;
  if (animated.beam) {
    animated.beam.rotation.y = t * 0.35;
    animated.beam2.rotation.y = t * 0.35;
  }
  if (G.started && !G.busted) {
    input.poll();
    // Wanted decay: lie low and the heat fades.
    G.wantedTimer += dt;
    if (G.wanted > 0 && G.wantedTimer > 15) {
      G.wanted -= 1;
      G.wantedTimer = 0;
    }
    if (G.inCar && G.car) {
      if (input.brake) G.car.userData.speed *= Math.max(0, 1 - 3 * dt);
      driveCar(G.car, input, dt, colliders, G.stats);
      G.speed = G.car.userData.speed;
      G.heading = G.car.userData.heading;
      player.position.copy(G.car.position);
      headlight.position.set(
        G.car.position.x + Math.sin(G.heading) * 2,
        2,
        G.car.position.z + Math.cos(G.heading) * 2,
      );
      headlight.target.position.set(
        G.car.position.x + Math.sin(G.heading) * 24,
        0.5,
        G.car.position.z + Math.cos(G.heading) * 24,
      );
      headlight.intensity = 1.4;
      if (input.consume('KeyE')) {
        G.car = null;
        G.inCar = false;
        player.visible = true;
        player.position.set(
          G.player.position.x - Math.sin(G.heading) * 2.5,
          0,
          G.player.position.z - Math.cos(G.heading) * 2.5,
        );
        G.speed = 0;
      }
    } else {
      const walk = (input.up ? 1 : 0) - (input.down ? 1 : 0);
      const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const run = 5.2;
      const nx = player.position.x + Math.sin(G.heading) * walk * run * dt + Math.cos(G.heading) * strafe * run * dt * 0.7;
      const nz = player.position.z + Math.cos(G.heading) * walk * run * dt - Math.sin(G.heading) * strafe * run * dt * 0.7;
      if (!hitsCollider(nx, nz, colliders)) {
        player.position.x = nx;
        player.position.z = nz;
      }
      player.position.x = Math.max(-215, Math.min(215, player.position.x));
      player.position.z = Math.max(-215, Math.min(215, player.position.z));
      player.rotation.y = G.heading;
      G.speed = 0;
      headlight.intensity = 0;
      if (input.consume('KeyE')) {
        const v = nearestVehicle(4.5);
        if (v) G.enterCar(v);
      }
      if (input.shoot) {
        const dir = { x: Math.sin(G.heading), z: Math.cos(G.heading) };
        const origin = { x: player.position.x, z: player.position.z };
        const targets = [...police.cars, ...peds.filter((p) => !p.userData.dead)];
        const hit = shoot(combat, origin, dir, targets, addWanted);
        if (hit) audio.shot();
        G.lastShotPos = { x: player.position.x, z: player.position.z };
      }
    }
    // Garage: G buys upgrades and repairs.
    if (input.consume('KeyG')) {
      const d = Math.hypot(player.position.x - POI.garage.x, player.position.z - POI.garage.z);
      if (d < 16) {
        if (G.health < 100 && G.cash >= 50) {
          G.cash -= 50;
          G.health = 100;
          G.toast = 'Patched up — $50';
        } else if (!G.stats.engine && G.cash >= 400) {
          G.cash -= 400;
          G.stats.engine = true;
          G.toast = 'Engine upgrade fitted — $400 (+25% speed)';
        } else if (!G.stats.armor && G.cash >= 300) {
          G.cash -= 300;
          G.stats.armor = true;
          G.toast = 'Armour plating fitted — $300 (+50 HP)';
        } else {
          G.toast = "Rico's Garage — nothing to buy right now";
        }
        G.toastIn = 3;
        saveGame(G);
      }
    }
    // Taxi fares once the story is done.
    if (input.consume('KeyT')) {
      if (startFare(missions, G)) {
        G.toast = 'Taxi fare started';
        G.toastIn = 3;
      }
    }
    updateMissions(missions, G, dt);
    if (!G.shotMode) {
      G.missionTimer = missions.timer || 0;
      G.beacon = missionBeacon(missions);
      G.toast = missions.toast || G.toast;
      G.toastIn = Math.max(G.toastIn, missions.toastIn || 0);
    }
    updateTraffic(traffic, dt, player.position);
    updatePeds(peds, dt, G.lastShotPos);
    updatePolice(police, G.wanted, player.position, !G.inCar, dt, colliders, scene, () => {
      if (!G.busted) {
        showEnd('BUSTED', 'The Solmar Bay PD caught you. $100 bail, back on the street.');
        audio.chime();
      }
    });
    G.policeCars = police.cars;
    // Dead police cars and peds leave the scene.
    for (let i = police.cars.length - 1; i >= 0; i--) {
      if (police.cars[i].userData.dead) {
        scene.remove(police.cars[i]);
        police.cars.splice(i, 1);
      }
    }
    for (const p of peds) {
      if (p.userData.dead) p.visible = false;
    }
    updateCombat(combat, dt);
    audio.engine(G.inCar ? G.speed : 0, G.inCar);
    audio.siren(G.wanted >= 1, t);
    // Beacon pillar follows the objective.
    if (G.beacon) {
      beacon.visible = true;
      beaconRing.visible = true;
      beacon.position.set(G.beacon.x, 17, G.beacon.z);
      beaconRing.position.set(G.beacon.x, 0.08, G.beacon.z);
      beacon.rotation.y = t * 0.8;
    } else {
      beacon.visible = false;
      beaconRing.visible = false;
    }
    // Camera. Staged shots may raise / lengthen the on-foot camera so a
    // landmark does not hide the staged car.
    const target = G.inCar && G.car ? G.car.position : player.position;
    followCamera(camera, target, G.heading, G.inCar ? 11 : (G.camDist || 8), G.inCar ? 5.2 : (G.camHeight || 4), G.shotMode, dt, G.camSide || 0);
  } else {
    // Menu orbit: slow sweep over the night city.
    const a = t * 0.05;
    camera.position.set(Math.sin(a) * 120, 55, Math.cos(a) * 120);
    camera.lookAt(0, 0, -40);
    updateTraffic(traffic, dt, player.position);
    updatePeds(peds, dt, null);
  }
  updateHud(hud, G, dt);
  renderer.render(scene, camera);
  if (!statusSet) {
    document.getElementById('status').textContent = 'ready';
    statusSet = true;
  }
}
frame();
