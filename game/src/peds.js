// Pedestrians: night crowds on the sidewalks, a few standing at the plaza,
// scattering when a shot goes off nearby.
import { mulberry32, pick, range } from './rng.js';

const SHIRTS = [0xc94f4f, 0x4f7dc9, 0x4fc97d, 0xc9a44f, 0x9a4fc9, 0xdddddd, 0x4fc9c2];

export function makePeds(scene, count) {
  const rng = mulberry32(4242);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({
      color: pick(rng, SHIRTS), emissive: pick(rng, SHIRTS), emissiveIntensity: 0.25,
    });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc9a184 });
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.28),
      new THREE.MeshLambertMaterial({ color: 0x1a1d26 }));
    legs.position.y = 0.4;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), shirt);
    torso.position.y = 1.1;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
    head.position.y = 1.65;
    g.add(legs, torso, head);
    const onStreet = rng() < 0.5;
    g.position.set(
      onStreet ? range(rng, -170, 170) : range(rng, -170, 170),
      0,
      range(rng, -120, 150),
    );
    g.userData = {
      speed: range(rng, 0.8, 1.6),
      heading: range(rng, 0, Math.PI * 2),
      changeIn: range(rng, 3, 9),
      flee: 0,
    };
    scene.add(g);
    peds.push(g);
  }
  return peds;
}

export function updatePeds(peds, dt, dangerPos) {
  for (const p of peds) {
    const u = p.userData;
    u.changeIn -= dt;
    if (dangerPos && Math.hypot(p.position.x - dangerPos.x, p.position.z - dangerPos.z) < 18) {
      u.flee = 2.5;
    }
    if (u.flee > 0) {
      u.flee -= dt;
      const away = Math.atan2(p.position.x - dangerPos.x, p.position.z - dangerPos.z);
      p.position.x += Math.sin(away) * 3.2 * dt;
      p.position.z += Math.cos(away) * 3.2 * dt;
      p.rotation.y = away;
      continue;
    }
    if (u.changeIn <= 0) {
      u.heading = Math.random() * Math.PI * 2;
      u.changeIn = 3 + Math.random() * 6;
    }
    p.position.x += Math.sin(u.heading) * u.speed * dt;
    p.position.z += Math.cos(u.heading) * u.speed * dt;
    if (p.position.x < -175) p.position.x = -175;
    if (p.position.x > 175) p.position.x = 175;
    if (p.position.z < -125) p.position.z = -125;
    if (p.position.z > 175) p.position.z = 175;
    p.rotation.y = u.heading;
    p.position.y = Math.abs(Math.sin(performance.now() / 300 + u.speed * 10)) * 0.05;
  }
}
