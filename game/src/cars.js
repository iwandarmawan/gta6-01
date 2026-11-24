// cars.js — vehicles: build, place, drive.
// placeCar(car, x, z, heading, speed): car FIRST — the v12 arity bug was here.
import THREE from 'three';
import { VEHICLES } from './config.js';

function wheel() {
  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }));
  w.rotation.z = Math.PI / 2;
  w.castShadow = true;
  return w;
}

function headlight(color = 0xffe9b0) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x333333, emissive: color, emissiveIntensity: 1.2 }));
}

export function makeCar(kind) {
  const spec = VEHICLES[kind] || VEHICLES.sedan;
  const g = new THREE.Group();
  g.userData.kind = kind;
  g.userData.top = spec.top;
  g.userData.speed = 0;
  g.userData.heading = 0;
  if (kind === 'bike') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 2.4),
      new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.4, metalness: 0.3 }));
    body.position.y = 0.7; body.castShadow = true;
    g.add(body);
    const w1 = wheel(); w1.position.set(0, 0.42, 0.9);
    const w2 = wheel(); w2.position.set(0, 0.42, -0.9);
    g.add(w1); g.add(w2);
    const hl = headlight(); hl.position.set(0, 0.8, 1.25); g.add(hl);
    return g;
  }
  if (kind === 'skiff') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 5.2),
      new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.5 }));
    hull.position.y = 0.5; hull.castShadow = true;
    g.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.4 }));
    cabin.position.set(0, 1.2, -0.6); g.add(cabin);
    const hl = headlight(0xfff2c0); hl.position.set(-0.6, 0.9, 2.6); g.add(hl);
    const hl2 = headlight(0xfff2c0); hl2.position.set(0.6, 0.9, 2.6); g.add(hl2);
    return g;
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.4),
    new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.35, metalness: 0.35 }));
  body.position.y = 0.65; body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.2, metalness: 0.5 }));
  cabin.position.set(0, 1.3, -0.2); cabin.castShadow = true;
  g.add(cabin);
  const spots = [[-0.75, 1.45], [0.75, 1.45], [-0.75, -1.45], [0.75, -1.45]];
  for (const [x, z] of spots) {
    const w = wheel(); w.position.set(x, 0.42, z); g.add(w);
  }
  const h1 = headlight(); h1.position.set(-0.6, 0.7, 2.22); g.add(h1);
  const h2 = headlight(); h2.position.set(0.6, 0.7, 2.22); g.add(h2);
  const tlMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2a2a, emissiveIntensity: 1.0 });
  for (const x of [-0.6, 0.6]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.1), tlMat);
    tl.position.set(x, 0.7, -2.22); g.add(tl);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
    bar.position.set(0, 1.72, -0.2); g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 1.6 }));
    red.position.set(-0.32, 1.86, -0.2); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x000022, emissive: 0x2040ff, emissiveIntensity: 1.6 }));
    blue.position.set(0.32, 1.86, -0.2); g.add(blue);
    g.userData.lightBar = { red, blue };
  }
  return g;
}

export function placeCar(car, x, z, heading, speed) {
  car.position.set(x, 0, z);
  car.rotation.y = heading;
  car.userData.heading = heading;
  car.userData.speed = speed;
}

export function driveCar(car, dt, input, opts = {}) {
  const u = car.userData;
  const top = (opts.top || u.top || 30) * (opts.boost || 1);
  const accel = 22, brake = 34, drag = 6;
  if (input.up) u.speed += accel * dt;
  if (input.down) u.speed -= brake * dt;
  if (!input.up && !input.down) u.speed -= Math.sign(u.speed) * drag * dt;
  if (Math.abs(u.speed) < 0.2 && !input.up && !input.down) u.speed = 0;
  u.speed = Math.max(-10, Math.min(top, u.speed));
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  if (Math.abs(u.speed) > 0.5) u.heading += steer * 1.9 * dt * Math.sign(u.speed);
  // Collision penalty only when time actually advances (dt > 0).
  // In frozen shot mode dt is 0 and the staged speed must survive.
  if (dt > 0 && opts.colliding) u.speed *= 0.4;
  car.position.x += Math.sin(u.heading) * u.speed * dt;
  car.position.z += Math.cos(u.heading) * u.speed * dt;
  car.rotation.y = u.heading;
  return u.speed;
}
