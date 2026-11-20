// Traffic: cars that follow the road lanes, stop at junctions, and keep a
// loose gap to the car ahead. Each one drives along one road line, turns at
// intersections, and despawns far behind the player to respawn ahead — the
// city always feels busy without ever simulating the whole grid.
import { TRAFFIC } from './config.js';
import { createCarMesh, randomCar } from './cars.js';
import { resolveCircle } from './city.js';

function spawnSpot(G, rng, near) {
  // A road line near the player (or anywhere at boot), on a random lane.
  const lines = G.city.roads;
  const line = rng.pick(lines);
  const along = near
    ? near + rng.range(-90, 90)
    : rng.range(-G.city.half + 20, G.city.half - 20);
  const lane = rng.chance(0.5) ? 3 : -3;
  if (rng.chance(0.5)) return { x: along, z: line + lane, angle: rng.chance(0.5) ? 0 : Math.PI };
  return { x: line + lane, z: along, angle: rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2 };
}

export function createTraffic(G, scene, rng) {
  const cars = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const spot = spawnSpot(G, rng, null);
    const spec = randomCar(rng);
    const mesh = createCarMesh(spec.color, spec.shape);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = -spot.angle;
    scene.add(mesh);
    cars.push({
      mesh, x: spot.x, z: spot.z, angle: spot.angle,
      speed: rng.range(TRAFFIC.speed * 0.7, TRAFFIC.speed * 1.1),
      wait: 0, shape: spec.shape,
    });
  }
  return { cars };
}

function nearestAhead(G, car) {
  // The closest traffic car ahead on the same lane, if any.
  let best = null;
  let bestD = TRAFFIC.minGap;
  for (const other of G.traffic.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const forward = dx * Math.cos(car.angle) + dz * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dz * Math.cos(car.angle));
    if (forward > 0 && forward < bestD && side < 3) {
      best = other;
      bestD = forward;
    }
  }
  return best;
}

export function stepTraffic(G, dt) {
  const player = G.inCar ? { x: G.car.x, z: G.car.z } : { x: G.player.x, z: G.player.z };
  for (const car of G.traffic.cars) {
    // Far behind the player: recycle ahead so the streets stay busy.
    const dx = car.x - player.x;
    const dz = car.z - player.z;
    if (dx * dx + dz * dz > 260 * 260) {
      const spot = spawnSpot(G, G.rng, null);
      car.x = spot.x;
      car.z = spot.z;
      car.angle = spot.angle;
      car.wait = 0;
    }
    // Junction pause: sometimes wait a beat at an intersection.
    const nearJunction = G.city.roads.some((p) => Math.abs(car.x - p) < 4 && Math.abs(car.z - p) < 4);
    if (car.wait > 0) {
      car.wait -= dt;
      continue;
    }
    if (nearJunction && G.rng.chance(0.004)) {
      car.wait = G.rng.range(0.8, 2.2);
      continue;
    }
    if (nearestAhead(G, car)) continue;
    // Ease off near a junction so the flow reads as city driving, not a race.
    const approachingJunction = G.city.roads.some((p) => Math.abs(car.x - p) < 10 && Math.abs(car.z - p) < 10);
    const cruise = approachingJunction ? car.speed * 0.5 : car.speed;
    // Panic brake if the player is right in front of us — and honk about it.
    const pdx = player.x - car.x;
    const pdz = player.z - car.z;
    const pForward = pdx * Math.cos(car.angle) + pdz * Math.sin(car.angle);
    const pSide = Math.abs(-pdx * Math.sin(car.angle) + pdz * Math.cos(car.angle));
    if (pForward > 0 && pForward < 10 && pSide < 3) {
      if (!car.honked) {
        car.honked = true;
        G.audio.horn();
      }
      continue;
    }
    car.honked = false;
    const nx = car.x + Math.cos(car.angle) * cruise * dt;
    const nz = car.z + Math.sin(car.angle) * cruise * dt;
    const fixed = resolveCircle(G.city, nx, nz, 2.3);
    if (fixed.x === nx && fixed.z === nz) {
      car.x = nx;
      car.z = nz;
    } else {
      // Blocked by a building (should not happen on roads): turn around.
      car.angle += Math.PI;
    }
    // At an intersection, sometimes turn onto the crossing road.
    const atCross = G.city.roads.some((p) => Math.abs(car.x - p) < 2) && G.city.roads.some((p) => Math.abs(car.z - p) < 2);
    if (atCross && G.rng.chance(0.02)) car.angle += G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = -car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.4;
  }
}

/** The nearest traffic car to (x, z) within `maxDist`, or null. */
export function nearestTrafficCar(G, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.traffic.cars) {
    const dx = car.x - x;
    const dz = car.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}
