// Pedestrians: 18 people walking the foggy sidewalks.
import THREE from 'three';
import { makeRng } from './rng.js';
import { LAYOUT_SEED, PLAZA } from './config.js';

const SHIRTS = [0xc0392b, 0x2e6f8e, 0xd8a03c, 0x5a7a4a, 0x8e44ad, 0xd8dee2];

export function makePeds(scene, count = 18) {
  const rng = makeRng(LAYOUT_SEED + 11);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.9, 0.35),
      new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) })
    );
    body.position.y = 0.95;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xd8b08a })
    );
    head.position.y = 1.6;
    g.add(head);
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.55, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x2c343c })
    );
    legs.position.y = 0.28;
    g.add(legs);
    const nearPlaza = i < 6;
    const x = nearPlaza ? PLAZA.x + rng.range(-14, 14) : rng.range(-120, 160);
    const z = nearPlaza ? PLAZA.z + rng.range(-14, 14) : rng.range(-160, 160);
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({ group: g, x, z, heading: rng.range(0, Math.PI * 2), speed: rng.range(0.8, 1.6), t: rng.range(0, 10) });
  }
  return peds;
}

export function updatePeds(peds, dt) {
  for (const p of peds) {
    p.t -= dt;
    if (p.t <= 0) { p.heading = Math.random() * Math.PI * 2; p.t = 3 + Math.random() * 6; }
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    p.x = Math.max(-140, Math.min(190, p.x));
    p.z = Math.max(-190, Math.min(190, p.z));
    p.group.position.set(p.x, 0, p.z);
    p.group.rotation.y = p.heading;
  }
}
