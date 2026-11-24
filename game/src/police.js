// The Solmar PD: wanted stars, pursuing interceptors, a helicopter at four stars,
// and the bust when the law catches the player.
import { WORLD } from './config.js';
import { clampVehicle, driveVehicle, makeVehicle } from './cars.js';
import { mulberry32 } from './rng.js';

export function createPolice(scene) {
  return {
    cars: [],
    heli: null,
    heliAngle: 0,
    spawnTimer: 0,
    bustTimer: 0,
  };
}

// How many interceptors the stars call for.
function wantedCars(wanted) {
  return [0, 1, 2, 3, 4, 5][wanted] ?? 0;
}

// Raise the wanted level (capped at 5) and tell the HUD.
export function addWanted(G, stars) {
  G.player.wanted = Math.min(5, G.player.wanted + stars);
  G.hud.flash(`Wanted level ${G.player.wanted} — the PD is coming`);
}

export function updatePolice(G, dt) {
  const P = G.player;
  const pol = G.police;
  const want = wantedCars(P.wanted);

  // Spawn interceptors at the city edge until the stars are matched.
  pol.spawnTimer -= dt;
  if (pol.cars.length < want && pol.spawnTimer <= 0) {
    pol.spawnTimer = 2.5;
    const rng = mulberry32((Date.now() % 100000) + pol.cars.length * 977);
    const edge = Math.floor(rng() * 4);
    const a = (rng() * 2 - 1) * 170;
    const [x, z] = edge === 0 ? [a, -180] : edge === 1 ? [a, 180] : edge === 2 ? [-180, a] : [180, a];
    const car = makeVehicle('police', x, z, 0);
    car.driver = 'police';
    G.scene.add(car.group);
    pol.cars.push(car);
  }

  // Chase: steer toward the player and ram.
  for (const car of pol.cars) {
    const dx = P.x - car.x;
    const dz = P.z - car.z;
    const dist = Math.hypot(dx, dz) || 1;
    const wantHeading = Math.atan2(dx, dz);
    let diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.5));
    const throttle = dist > 6 ? 1 : 0.4;
    driveVehicle(car, -steer, throttle, dt, 1.05);
    clampVehicle(car, WORLD);
    // Ram: shove the player's vehicle and hurt the player a little.
    if (dist < 4 && P.vehicle) {
      P.vehicle.speed *= 0.96;
      P.hp -= 2 * dt;
    }
    // On foot, a close interceptor starts the bust clock.
    if (dist < 3.5 && !P.vehicle) {
      pol.bustTimer += dt;
      if (pol.bustTimer > 1.5) bustPlayer(G);
    } else {
      pol.bustTimer = Math.max(0, pol.bustTimer - dt);
    }
  }

  // Wanted decays when no interceptor is close.
  const nearest = pol.cars.reduce((m, c) => Math.min(m, Math.hypot(P.x - c.x, P.z - c.z)), 999);
  if (P.wanted > 0 && nearest > 60) {
    G.wantedDecay = (G.wantedDecay || 0) + dt;
    if (G.wantedDecay > 25) {
      P.wanted -= 1;
      G.wantedDecay = 0;
      G.hud.flash(`Wanted level ${P.wanted}`);
    }
  } else {
    G.wantedDecay = 0;
  }

  // The helicopter circles above the player at four stars and up.
  if (P.wanted >= 4 && !pol.heli) {
    const heli = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 6), new THREE.MeshLambertMaterial({ color: 0x1a2a44 }));
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.15, 0.6), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rotor.position.y = 1;
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(4, 18, 12, 1, true),
      new THREE.MeshLambertMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.18 }),
    );
    beam.position.y = -9;
    heli.add(body, rotor, beam);
    heli.userData.rotor = rotor;
    G.scene.add(heli);
    pol.heli = heli;
  }
  if (pol.heli) {
    if (P.wanted < 4) {
      G.scene.remove(pol.heli);
      pol.heli = null;
    } else {
      pol.heliAngle += dt * 0.5;
      pol.heli.position.set(
        P.x + Math.cos(pol.heliAngle) * 22,
        42,
        P.z + Math.sin(pol.heliAngle) * 22,
      );
      pol.heli.rotation.y = -pol.heliAngle;
      pol.heli.userData.rotor.rotation.y += dt * 18;
    }
  }
}

// Busted: fine, wanted cleared, player dropped back at the plaza on foot.
export function bustPlayer(G) {
  const P = G.player;
  const fine = Math.min(P.cash, 100);
  P.cash -= fine;
  P.wanted = 0;
  P.hp = 100;
  if (P.vehicle) {
    P.vehicle.driver = null;
    P.vehicle = null;
  }
  P.x = 10;
  P.z = 10;
  P.heading = 0;
  G.police.bustTimer = 0;
  for (const car of G.police.cars) G.scene.remove(car.group);
  G.police.cars = [];
  G.hud.showBusted(fine);
  G.audio.blip(220, 0.4, 'square', 0.12);
}
