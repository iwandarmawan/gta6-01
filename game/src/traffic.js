// Street traffic for Solmar Bay: ordinary cars looping the road grid. Each
// car follows one rectangular loop, slows for the car ahead, and keeps the
// city feeling alive behind the player's own driving.

const THREE = window.THREE;
import { VEHICLES } from './config.js';
import { makeRng, pick, range } from './rng.js';
import { createVehicleMesh } from './cars.js';
import { groundHeight } from './city.js';

export function spawnTraffic(G) {
  const rng = makeRng(4242);
  G.traffic = [];
  const loops = G.city.trafficLoops;
  for (let i = 0; i < 14; i++) {
    const loop = loops[i % loops.length];
    const kind = pick(rng, ['sedan', 'sedan', 'pickup']);
    const color = pick(rng, VEHICLES[kind].colors);
    const mesh = createVehicleMesh(G, kind, color);
    G.scene.add(mesh);
    // Start on a random edge of the loop, heading along it.
    const edge = Math.floor(rng() * 4);
    let x;
    let z;
    let angle;
    if (edge === 0) { x = range(rng, loop.x0, loop.x1); z = loop.z0; angle = -Math.PI / 2; }
    else if (edge === 1) { x = loop.x1; z = range(rng, loop.z0, loop.z1); angle = Math.PI; }
    else if (edge === 2) { x = range(rng, loop.x0, loop.x1); z = loop.z1; angle = Math.PI / 2; }
    else { x = loop.x0; z = range(rng, loop.z0, loop.z1); angle = 0; }
    mesh.position.set(x, 0, z);
    mesh.rotation.y = angle;
    G.traffic.push({
      kind, mesh, loop, edge, angle,
      speed: range(rng, 8, 12),
      pos: mesh.position,
    });
  }
}

function cornerOf(loop, edge) {
  if (edge === 0) return { x: loop.x1, z: loop.z0 };
  if (edge === 1) return { x: loop.x1, z: loop.z1 };
  if (edge === 2) return { x: loop.x0, z: loop.z1 };
  return { x: loop.x0, z: loop.z0 };
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    // Slow down for the car directly ahead.
    let target = 10;
    for (const other of G.traffic) {
      if (other === car) continue;
      const dx = other.pos.x - car.pos.x;
      const dz = other.pos.z - car.pos.z;
      const ahead = -Math.sin(car.angle) * dx + -Math.cos(car.angle) * dz;
      const side = Math.cos(car.angle) * dx + -Math.sin(car.angle) * dz;
      if (ahead > 0 && ahead < 9 && Math.abs(side) < 3) target = 0;
    }
    // Slow down for the player's car ahead too.
    if (G.player.vehicle) {
      const dx = G.player.vehicle.pos.x - car.pos.x;
      const dz = G.player.vehicle.pos.z - car.pos.z;
      const ahead = -Math.sin(car.angle) * dx + -Math.cos(car.angle) * dz;
      const side = Math.cos(car.angle) * dx + -Math.sin(car.angle) * dz;
      if (ahead > 0 && ahead < 9 && Math.abs(side) < 3) target = 0;
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
    const fx = -Math.sin(car.angle);
    const fz = -Math.cos(car.angle);
    car.pos.x += fx * car.speed * dt;
    car.pos.z += fz * car.speed * dt;
    const corner = cornerOf(car.loop, car.edge);
    const dx = corner.x - car.pos.x;
    const dz = corner.z - car.pos.z;
    if (Math.abs(dx) < 2 && Math.abs(dz) < 2) {
      car.edge = (car.edge + 1) % 4;
      car.angle = [-Math.PI / 2, Math.PI, Math.PI / 2, 0][car.edge];
    }
    car.pos.y = groundHeight(car.pos.x, car.pos.z);
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.angle;
    const wheels = car.mesh.userData.wheels || [];
    for (const w of wheels) w.mesh.rotation.x += (car.speed / 0.38) * dt;
  }
}
