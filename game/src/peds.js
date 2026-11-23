// Pedestrians: people strolling the sidewalks who hurry away
// when a fast car comes at them — and who go down (then get back
// up) when the player picks a fight.

import { TUNING, ROADS } from './config.js';
import { makeRng } from './rng.js';

const THREE = window.THREE;

const SHIRTS = [0xe86a6a, 0x6aa8e8, 0x6ae88a, 0xe8d06a, 0xb06ae8, 0xe8e8e8, 0x6ad8e8];
const SKINS = [0xf0c8a0, 0xc89878, 0x8a5a3a, 0xf0d0b0];

function makePedMesh(rng) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.05, 0.42),
    new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) }),
  );
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshLambertMaterial({ color: rng.pick(SKINS) }),
  );
  head.position.y = 1.8;
  head.castShadow = true;
  group.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2f38 });
  for (const lx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.28), legMat);
    leg.position.set(lx, 0.28, 0);
    group.add(leg);
  }
  return group;
}

function randomSidewalkPoint(rng) {
  const road = rng.pick(ROADS);
  const t = rng.next();
  const x = road.x1 + (road.x2 - road.x1) * t;
  const z = road.z1 + (road.z2 - road.z1) * t;
  const alongX = road.z1 === road.z2;
  return {
    x: x + (alongX ? 0 : rng.pick([-7, 7])),
    z: z + (alongX ? rng.pick([-7, 7]) : 0),
  };
}

export function createPedestrians(scene, city, seed) {
  const rng = makeRng(seed + 77);
  const peds = [];
  for (let i = 0; i < TUNING.pedCount; i++) {
    const p = randomSidewalkPoint(rng);
    const group = makePedMesh(rng);
    group.position.set(p.x, 0, p.z);
    scene.add(group);
    peds.push({
      group,
      pos: group.position,
      heading: rng.range(0, Math.PI * 2),
      speed: rng.range(1.2, 2.2),
      target: randomSidewalkPoint(rng),
      state: 'walk',
      downTimer: 0,
      bobT: rng.range(0, 6),
    });
  }

  // Knock a pedestrian down (player punch). Returns the ped or null.
  function knockDown(x, z, range) {
    let best = null;
    let bestD = range;
    for (const p of peds) {
      if (p.state === 'down') continue;
      const d = Math.hypot(p.pos.x - x, p.pos.z - z);
      if (d < bestD) { best = p; bestD = d; }
    }
    if (!best) return null;
    best.state = 'down';
    best.downTimer = 3;
    best.group.rotation.x = -Math.PI / 2;
    best.group.position.y = 0.4;
    return best;
  }

  function update(dt, playerPos, playerSpeed) {
    for (const p of peds) {
      if (p.state === 'down') {
        p.downTimer -= dt;
        if (p.downTimer <= 0) {
          p.state = 'flee';
          p.group.rotation.x = 0;
          p.group.position.y = 0;
          const dx = p.pos.x - playerPos.x;
          const dz = p.pos.z - playerPos.z;
          const d = Math.hypot(dx, dz) || 1;
          p.target = { x: p.pos.x + (dx / d) * 40, z: p.pos.z + (dz / d) * 40 };
        }
        continue;
      }
      const dxP = p.pos.x - playerPos.x;
      const dzP = p.pos.z - playerPos.z;
      const dP = Math.hypot(dxP, dzP);
      if (playerSpeed > 6 && dP < 9) {
        p.state = 'flee';
        p.target = { x: p.pos.x + (dxP / (dP || 1)) * 30, z: p.pos.z + (dzP / (dP || 1)) * 30 };
      } else if (p.state === 'flee' && dP > 25) {
        p.state = 'walk';
        p.target = randomSidewalkPoint(rng);
      }
      const dx = p.target.x - p.pos.x;
      const dz = p.target.z - p.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2) {
        if (p.state === 'flee') p.state = 'walk';
        p.target = randomSidewalkPoint(rng);
        continue;
      }
      const speed = p.state === 'flee' ? 5.5 : p.speed;
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - p.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
      const prev = { x: p.pos.x, z: p.pos.z };
      p.pos.x += Math.sin(p.heading) * speed * dt;
      p.pos.z += Math.cos(p.heading) * speed * dt;
      // Slide around buildings instead of walking through them.
      if (city) city.resolveCircle(p.pos, 0.5, prev);
      p.bobT += dt * speed * 2;
      p.group.position.y = Math.abs(Math.sin(p.bobT)) * 0.08;
      p.group.rotation.y = p.heading;
    }
  }

  return { peds, update, knockDown };
}
