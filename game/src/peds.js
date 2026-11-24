// Pedestrians: small figures strolling the sidewalks, turning at intersections.
import { ROAD_EVERY, WORLD } from './config.js';
import { mulberry32, range, pick } from './rng.js';

const SHIRTS = [0xe8e8e8, 0x3a6ad8, 0xe8b13a, 0x8a3ad8, 0x3ad86a, 0xd83a5a];

export function createPeds(scene, count = 18) {
  const rng = mulberry32(4242);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.9, 0.4),
      new THREE.MeshLambertMaterial({ color: pick(rng, SHIRTS) }),
    );
    shirt.position.y = 1.05;
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
    group.add(shirt, head, legs);
    const x = Math.floor(range(rng, -3, 3)) * ROAD_EVERY + (rng() < 0.5 ? -8 : 8);
    const z = range(rng, -170, 170);
    group.position.set(x, 0, z);
    scene.add(group);
    peds.push({
      group,
      x,
      z,
      heading: pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
      speed: range(rng, 1.2, 2.2),
      alive: true,
      alongRoad: rng() < 0.5,
    });
  }
  return peds;
}

export function updatePeds(peds, dt) {
  const lim = WORLD / 2 - 8;
  for (const p of peds) {
    if (!p.alive) continue;
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    // Turn at intersections so they stay on the grid.
    const nearX = Math.abs(p.x % ROAD_EVERY) < 4 || Math.abs((p.x % ROAD_EVERY) - ROAD_EVERY) < 4;
    const nearZ = Math.abs(p.z % ROAD_EVERY) < 4 || Math.abs((p.z % ROAD_EVERY) - ROAD_EVERY) < 4;
    if ((nearX || nearZ) && Math.random() < dt * 0.25) {
      p.heading = Math.floor(Math.random() * 4) * Math.PI / 2;
    }
    if (p.x > lim || p.x < -lim || p.z > lim || p.z < -lim) p.heading += Math.PI;
    p.group.position.set(p.x, 0, p.z);
    p.group.rotation.y = p.heading;
    p.group.position.y = Math.abs(Math.sin(performance.now() / 300 + p.x)) * 0.06;
  }
}
