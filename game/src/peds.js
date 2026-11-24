// peds.js — 18 pedestrians strolling the sidewalks in the rain.
import THREE from './three-shim.js';

const SHIRTS = [0xc04040, 0x4060c0, 0xc0a040, 0x40a060, 0x8040a0, 0xc06080];

export function makePeds(scene, rand) {
  const peds = [];
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    const shirt = SHIRTS[i % SHIRTS.length];
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 }));
    body.position.y = 0.85; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8b08a, roughness: 0.8 }));
    head.position.y = 1.6; g.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 }));
    legs.position.y = 0.25; g.add(legs);
    const x = (rand() - 0.5) * 260, z = (rand() - 0.5) * 260;
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({ g, dir: rand() * Math.PI * 2, speed: 1 + rand() * 1.2, bob: rand() * 6 });
  }
  return {
    peds,
    update(dt, t) {
      if (dt <= 0) return;
      for (const p of peds) {
        p.g.position.x += Math.sin(p.dir) * p.speed * dt;
        p.g.position.z += Math.cos(p.dir) * p.speed * dt;
        p.g.rotation.y = p.dir;
        p.g.position.y = Math.abs(Math.sin(t * 4 + p.bob)) * 0.06;
        if (Math.abs(p.g.position.x) > 145 || Math.abs(p.g.position.z) > 145 || p.g.position.x > 145) {
          p.dir = Math.random() * Math.PI * 2;
          p.g.position.x = Math.max(-140, Math.min(140, p.g.position.x));
          p.g.position.z = Math.max(-140, Math.min(140, p.g.position.z));
        }
      }
    },
  };
}
