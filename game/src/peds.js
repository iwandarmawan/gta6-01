// Pedestrians: people walking the sidewalks, so the city feels lived in.
// Each one wanders between nearby points on foot, at a walking pace, and
// never thinks about the player — which is why hitting one is a crime.
import { ROADS_X, ROADS_Z } from './config.js';

const THREE = window.THREE;

const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1];

function makePedMesh(shirt) {
  const group = new THREE.Group();
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.8, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
  );
  legs.position.y = 0.4;
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.7, 0.35),
    new THREE.MeshLambertMaterial({ color: shirt }),
  );
  torso.position.y = 1.15;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xf1c27d }),
  );
  head.position.y = 1.7;
  group.add(legs, torso, head);
  group.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return group;
}

function sidewalkPoint(rng) {
  if (rng() < 0.5) {
    const x = ROADS_X[Math.floor(rng() * ROADS_X.length)] + (rng() < 0.5 ? -6.5 : 6.5);
    return { x, z: -150 + rng() * 300 };
  }
  const z = ROADS_Z[Math.floor(rng() * ROADS_Z.length)] + (rng() < 0.5 ? -6.5 : 6.5);
  return { x: -210 + rng() * 360, z };
}

export function makePeds(scene, rng, count = 18) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = sidewalkPoint(rng);
    const mesh = makePedMesh(SHIRTS[Math.floor(rng() * SHIRTS.length)]);
    mesh.position.set(p.x, 0, p.z);
    scene.add(mesh);
    peds.push({
      mesh, x: p.x, z: p.z,
      target: sidewalkPoint(rng),
      speed: 1 + rng() * 0.8,
      heading: rng() * Math.PI * 2,
    });
  }
  return peds;
}

// Walk toward the current target; pick a new one on arrival.
export function updatePeds(peds, rng, dt) {
  for (const ped of peds) {
    const dx = ped.target.x - ped.x, dz = ped.target.z - ped.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.5) {
      ped.target = sidewalkPoint(rng);
      continue;
    }
    const want = Math.atan2(dx, dz);
    let diff = want - ped.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ped.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
    ped.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.z += Math.cos(ped.heading) * ped.speed * dt;
    ped.mesh.position.set(ped.x, Math.abs(Math.sin(Date.now() * 0.004 + ped.x)) * 0.04, ped.z);
    ped.mesh.rotation.y = ped.heading;
  }
}
