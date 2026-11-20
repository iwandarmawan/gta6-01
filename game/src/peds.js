// Pedestrians: low-poly walkers on the sidewalks who wander between random
// corners, cross at junctions, and run from gunfire and crashes. A scared
// pedestrian is the city's fastest gossip: one shot clears a whole block.
const THREE = window.THREE;
import { PEDS } from './config.js';

const SHIRTS = [0xe85a5a, 0x5a8fe8, 0xf2d05a, 0x39d353, 0xd87fd8, 0xffffff, 0x2b2b2b, 0xff9a3c];

function createPedMesh(rng) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: rng.pick([0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf2c9a0]) });
  const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) });
  const pants = new THREE.MeshLambertMaterial({ color: rng.pick([0x2b3a55, 0x3a3a3a, 0x5a4a3a]) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.32), shirt);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), pants);
  legL.position.set(-0.14, 0.32, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), pants);
  legR.position.set(0.14, 0.32, 0);
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), shirt);
  armL.position.set(-0.38, 1.05, 0);
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), shirt);
  armR.position.set(0.38, 1.05, 0);
  group.add(armR);
  group.userData = { legL, legR, armL, armR };
  return group;
}

export function createPeds(G, scene, rng) {
  const peds = [];
  for (let i = 0; i < PEDS.count; i += 1) {
    const mesh = createPedMesh(rng);
    const x = rng.range(-G.city.half, G.city.half);
    const z = rng.range(-G.city.half, G.city.half);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh, x, z,
      angle: rng.angle(),
      speed: PEDS.walkSpeed * rng.range(0.8, 1.2),
      target: null,
      fleeing: 0,
      down: false,
      downTimer: 0,
      walkPhase: rng.range(0, Math.PI * 2),
    });
  }
  return { peds };
}

function pickTarget(G, ped) {
  // A random nearby sidewalk corner to stroll toward.
  const line = G.rng.pick(G.city.roads);
  const along = G.rng.range(-G.city.half + 20, G.city.half - 20);
  if (G.rng.chance(0.5)) return { x: along, z: line + 9 };
  return { x: line + 9, z: along };
}

/** Scare every pedestrian within `radius` of (x, z): they run away from it. */
export function scarePeds(G, x, z, radius) {
  for (const ped of G.peds.peds) {
    if (ped.down) continue;
    const dx = ped.x - x;
    const dz = ped.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < radius) {
      ped.fleeing = 2.5;
      ped.target = { x: ped.x + (dx / (d || 1)) * 40, z: ped.z + (dz / (d || 1)) * 40 };
    }
  }
}

/** The nearest car (player's or traffic) to (x, z) within `maxDist`. */
function nearestCarTo(G, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  const consider = (car) => {
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  };
  if (G.inCar && G.car) consider(G.car);
  for (const car of G.traffic.cars) consider(car);
  return best;
}

export function stepPeds(G, dt) {
  for (const ped of G.peds.peds) {
    if (ped.down) {
      ped.downTimer -= dt;
      ped.mesh.rotation.x = Math.max(0, ped.mesh.rotation.x - dt * 2);
      if (ped.downTimer <= 0) {
        ped.down = false;
        ped.mesh.rotation.x = 0;
        ped.mesh.position.y = 0;
        ped.fleeing = 3;
        ped.target = pickTarget(G, ped);
      }
      continue;
    }
    if (ped.fleeing > 0) ped.fleeing -= dt;
    if (!ped.target || (Math.abs(ped.x - ped.target.x) < 2 && Math.abs(ped.z - ped.target.z) < 2)) {
      ped.target = pickTarget(G, ped);
    }
    // Wait at the kerb when a car is about to cross in front.
    const crossingCar = nearestCarTo(G, ped.x, ped.z, 6);
    if (crossingCar && ped.fleeing <= 0) {
      const cx = crossingCar.x - ped.x;
      const cz = crossingCar.z - ped.z;
      const cd = Math.sqrt(cx * cx + cz * cz) || 1;
      const closing = (cx * Math.cos(crossingCar.angle || 0) + cz * Math.sin(crossingCar.angle || 0)) / cd;
      if (closing > 0.8) {
        ped.mesh.userData.legL.rotation.x = 0;
        ped.mesh.userData.legR.rotation.x = 0;
        ped.mesh.position.set(ped.x, 0, ped.z);
        ped.mesh.rotation.y = -ped.angle + Math.PI / 2;
        continue;
      }
    }
    // Step aside when a car is bearing down on the sidewalk ahead.
    const carNear = nearestCarTo(G, ped.x, ped.z, 7);
    if (carNear) {
      const cx = carNear.x - ped.x;
      const cz = carNear.z - ped.z;
      const cd = Math.sqrt(cx * cx + cz * cz) || 1;
      const closing = (cx * Math.cos(carNear.angle || 0) + cz * Math.sin(carNear.angle || 0)) / cd;
      if (closing > 0.7) {
        ped.target = { x: ped.x - (cz / cd) * 6, z: ped.z + (cx / cd) * 6 };
      }
    }
    const dx = ped.target.x - ped.x;
    const dz = ped.target.z - ped.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const speed = ped.fleeing > 0 ? PEDS.fleeSpeed : ped.speed;
    const wantAngle = Math.atan2(dz, dx);
    let diff = wantAngle - ped.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ped.angle += Math.max(-3 * dt, Math.min(3 * dt, diff));
    ped.x += Math.cos(ped.angle) * speed * dt;
    ped.z += Math.sin(ped.angle) * speed * dt;
    ped.x = Math.max(-G.city.half, Math.min(G.city.half + 40, ped.x));
    ped.z = Math.max(-G.city.half, Math.min(G.city.half, ped.z));
    ped.walkPhase += dt * speed * 3;
    const swing = Math.sin(ped.walkPhase) * 0.5;
    ped.mesh.userData.legL.rotation.x = swing;
    ped.mesh.userData.legR.rotation.x = -swing;
    ped.mesh.userData.armL.rotation.x = -swing * 0.7;
    ped.mesh.userData.armR.rotation.x = swing * 0.7;
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = -ped.angle + Math.PI / 2;
  }
}

/** Knock a pedestrian down (shot or run over): they stay down, then flee. */
export function knockDownPed(G, ped) {
  if (ped.down) return;
  ped.down = true;
  ped.downTimer = 2.5;
  ped.mesh.rotation.x = -Math.PI / 2 + 0.15;
  ped.mesh.position.y = 0.35;
}
