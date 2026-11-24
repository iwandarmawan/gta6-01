// Pedestrians: walkers on the sidewalks, wandering the grid, bobbing as they go.
// They make the city feel inhabited and give the chase shots foreground life.
const THREE = window.THREE;

import { STREETS_X, STREETS_Z } from './config.js';

const SHIRTS = [0xc25a5a, 0x5a8ac2, 0x8ac25a, 0xc2a23a, 0x8a5a8a, 0xe8e4da, 0x3a3a44];

export class Peds {
  constructor(scene, rng, count = 18) {
    this.list = [];
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      const shirt = rng.pick(SHIRTS);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.1, 8), new THREE.MeshLambertMaterial({ color: shirt }));
      body.position.y = 0.95;
      group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd9a986 }));
      head.position.y = 1.72;
      group.add(head);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a2a33 }));
      legs.position.y = 0.35;
      group.add(legs);
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.55, 12),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      group.add(shadow);

      const axis = rng.chance(0.5) ? 'x' : 'z';
      const dir = rng.chance(0.5) ? 1 : -1;
      const ped = {
        group, body, axis, dir,
        speed: rng.range(1, 2.2),
        x: 0, z: 0, phase: rng.range(0, Math.PI * 2),
      };
      if (axis === 'x') {
        ped.x = rng.pick(STREETS_X) + (dir > 0 ? 5.5 : -5.5);
        ped.z = rng.range(-190, 190);
      } else {
        ped.x = rng.range(-130, 130);
        ped.z = rng.pick(STREETS_Z) + (dir > 0 ? 5.5 : -5.5);
      }
      group.position.set(ped.x, 0, ped.z);
      scene.add(group);
      this.list.push(ped);
    }
  }

  update(dt, t) {
    for (const p of this.list) {
      if (p.axis === 'x') {
        p.z += p.dir * p.speed * dt;
        if (p.z > 195 || p.z < -195) p.dir *= -1;
        p.group.rotation.y = p.dir > 0 ? 0 : Math.PI;
      } else {
        p.x += p.dir * p.speed * dt;
        if (p.x > 135 || p.x < -135) p.dir *= -1;
        p.group.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      p.group.position.set(p.x, Math.abs(Math.sin(t * 4 + p.phase)) * 0.06, p.z);
    }
  }

  positions() {
    return this.list.map((p) => ({ x: p.x, z: p.z }));
  }
}
