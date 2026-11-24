// Pedestrians for Solmar Bay: people walking the sidewalks between random
// points, who scatter when a gun goes off or a car bears down on them.

const THREE = window.THREE;
import { makeRng, pick, range } from './rng.js';
import { randomSidewalkPoint, resolveCollision } from './city.js';

const SHIRTS = [0xd43a2a, 0x2a6ad4, 0x2e8f5a, 0xe8b48c, 0x9a6ad4, 0xf2e3c6, 0x3a3a40];

export function spawnPeds(G) {
  const rng = makeRng(987);
  G.peds = [];
  for (let i = 0; i < 24; i++) {
    const p = randomSidewalkPoint(G, rng);
    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, SHIRTS) });
    const skin = new THREE.MeshLambertMaterial({ color: pick(rng, [0xe8b48c, 0xc98a5a, 0x8a5a3a, 0xf2d0b0]) });
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.35), new THREE.MeshLambertMaterial({ color: 0x2a3542 }));
    legs.position.y = 0.4;
    group.add(legs);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.4), shirt);
    torso.position.y = 1.2;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
    head.position.y = 1.85;
    group.add(head);
    group.position.set(p.x, 0, p.z);
    G.scene.add(group);
    const dest = randomSidewalkPoint(G, rng);
    G.peds.push({
      mesh: group,
      pos: group.position,
      dest,
      speed: range(rng, 1.2, 2.2),
      scared: 0,
      angle: rng() * Math.PI * 2,
    });
  }
}

export function scarePeds(G, x, z, radius) {
  for (const ped of G.peds) {
    const dx = ped.pos.x - x;
    const dz = ped.pos.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < radius) {
      ped.scared = 3;
      ped.dest = { x: ped.pos.x + (dx / (d || 1)) * 20, z: ped.pos.z + (dz / (d || 1)) * 20 };
    }
  }
}

export function updatePeds(G, dt) {
  const rng = G.rng;
  for (const ped of G.peds) {
    const dx = ped.dest.x - ped.pos.x;
    const dz = ped.dest.z - ped.pos.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 1.5) {
      ped.dest = randomSidewalkPoint(G, rng);
      continue;
    }
    const speed = ped.scared > 0 ? ped.speed * 2.4 : ped.speed;
    ped.scared = Math.max(0, ped.scared - dt);
    ped.pos.x += (dx / d) * speed * dt;
    ped.pos.z += (dz / d) * speed * dt;
    ped.angle = Math.atan2(-dx, -dz);
    ped.mesh.rotation.y = ped.angle;
    ped.mesh.position.y = Math.abs(Math.sin(G.elapsed * 6 + ped.pos.x)) * 0.08;
    resolveCollision(G, ped.pos, 0.6);
  }
}
