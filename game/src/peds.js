// peds.js — pedestrians strolling the plaza and sidewalks.
import THREE from 'three';
import { mulberry32, pick, range } from './rng.js';

const SHIRTS = [0xc23a2e, 0x2a7ad9, 0x3a9a4a, 0xe8a02a, 0x8a4ad9, 0xd9d9d9];

export function makePed(rng) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: pick(rng, SHIRTS), roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 8), shirt);
  body.position.y = 0.95; body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 }));
  head.position.y = 1.65; g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: 0.9 }));
  legs.position.y = 0.3; g.add(legs);
  g.userData.heading = range(rng, 0, Math.PI * 2);
  g.userData.speed = range(rng, 0.8, 1.6);
  g.userData.turnAt = 0;
  return g;
}

export function spawnPeds(scene, count = 18) {
  const rng = mulberry32(4242);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = makePed(rng);
    const nearPlaza = i < 8;
    const x = nearPlaza ? range(rng, -24, 24) : range(rng, -140, 140);
    const z = nearPlaza ? range(rng, -24, 24) : pick(rng, [-120, -60, 0, 60, 120]) + range(rng, -4, 4);
    p.position.set(x, 0, z);
    scene.add(p);
    peds.push(p);
  }
  return peds;
}

export function updatePeds(peds, dt, time) {
  for (const p of peds) {
    if (time > p.userData.turnAt) {
      p.userData.heading += (Math.random() - 0.5) * 0.9;
      p.userData.turnAt = time + 2 + Math.random() * 3;
    }
    p.position.x += Math.sin(p.userData.heading) * p.userData.speed * dt;
    p.position.z += Math.cos(p.userData.heading) * p.userData.speed * dt;
    if (Math.abs(p.position.x) > 165) p.userData.heading += Math.PI;
    if (p.position.z > 145 || p.position.z < -165) p.userData.heading += Math.PI;
    p.rotation.y = p.userData.heading;
    // Gentle walk bob.
    p.position.y = Math.abs(Math.sin(time * 6 + p.position.x)) * 0.05;
  }
}
