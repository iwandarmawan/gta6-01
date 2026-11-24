// cars.js — vehicle factory, placement and arcade driving with AABB collision.
// The collision penalty only applies when dt > 0 (frozen shot mode must never
// decay a staged speed — round 12 lesson).
import THREE from './three-shim.js';
import { WORLD } from './config.js';

const KINDS = {
  sedan: { color: 0xb02020, top: 34, accel: 22, w: 2, l: 4.4, h: 1.1 },
  pickup: { color: 0xd07020, top: 32, accel: 20, w: 2.1, l: 4.8, h: 1.3 },
  runner: { color: 0x20a0a0, top: 38, accel: 26, w: 0.9, l: 2.4, h: 1.0 },
  skiff: { color: 0xd8d8d8, top: 26, accel: 16, w: 2.4, l: 6, h: 0.9 },
  interceptor: { color: 0xe8e8e8, top: 36, accel: 26, w: 2, l: 4.6, h: 1.1 },
};

export function makeVehicle(kind) {
  const k = KINDS[kind];
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: k.color, roughness: 0.35, metalness: 0.4 });
  if (kind === 'skiff') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(k.w, k.h, k.l), bodyMat);
    hull.position.y = 0.5; g.add(hull);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.8 }));
    seat.position.set(0, 1.1, -0.5); g.add(seat);
  } else if (kind === 'runner') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(k.w, 0.5, k.l), bodyMat);
    frame.position.y = 0.7; g.add(frame);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 }));
    seat.position.set(0, 1.0, -0.3); g.add(seat);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(k.w, k.h, k.l), bodyMat);
    body.position.y = 0.75; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(k.w - 0.3, 0.8, k.l * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x18222e, roughness: 0.15, metalness: 0.5 }));
    cabin.position.set(0, 1.6, -0.3); g.add(cabin);
  }
  // Wheels.
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.95 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const nWheels = kind === 'runner' ? 2 : (kind === 'skiff' ? 0 : 4);
  const wz = kind === 'runner' ? [0.9, -0.9] : [1.45, -1.45];
  for (const z of wz) {
    for (const x of (kind === 'runner' ? [0] : [-k.w / 2, k.w / 2])) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(x, 0.42, z); g.add(w);
    }
  }
  // Headlights (emissive + translucent cones) and taillights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false });
  for (const x of [-k.w / 2 + 0.35, k.w / 2 - 0.35]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), headMat);
    h.position.set(x, 0.8, k.l / 2 + 0.02); g.add(h);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 7, 10, 1, true), coneMat);
    cone.rotation.x = Math.PI / 2 + 0.25; cone.position.set(x, 0.7, k.l / 2 + 3.5); g.add(cone);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    t.position.set(x, 0.8, -k.l / 2 - 0.02); g.add(t);
  }
  // Police light bar.
  if (kind === 'interceptor') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
    bar.position.set(0, 2.15, -0.3); g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    red.position.set(-0.3, 2.15, -0.3); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    blue.position.set(0.3, 2.15, -0.3); g.add(blue);
  }
  const v = { group: g, kind, speed: 0, heading: 0, top: k.top, accel: k.accel, w: k.w, l: k.l, health: 3 };
  g.userData.vehicle = v;
  return v;
}

export function placeCar(v, x, z, heading, speed) {
  v.heading = heading;
  v.speed = speed || 0;
  v.group.position.set(x, 0, z);
  v.group.rotation.y = heading;
}

export function driveCar(v, input, dt, colliders, opts) {
  if (dt <= 0) return; // frozen shot mode: never decay a staged speed
  const o = opts || {};
  const top = v.top * (o.engine ? 1.25 : 1);
  if (input.f > 0) v.speed += v.accel * dt;
  else if (input.f < 0) v.speed -= v.accel * 0.7 * dt;
  else v.speed -= Math.sign(v.speed) * 8 * dt;
  if (input.brake) v.speed -= Math.sign(v.speed) * 30 * dt;
  if (Math.abs(v.speed) < 0.1 && input.f === 0) v.speed = 0;
  v.speed = Math.max(-10, Math.min(top, v.speed));
  v.heading -= input.s * dt * 1.9 * Math.sign(v.speed || 1) * Math.min(1, Math.abs(v.speed) / 8);
  const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
  let nx = v.group.position.x + fx * v.speed * dt * 3.6 / 3.6;
  let nz = v.group.position.z + fz * v.speed * dt;
  // Keep land vehicles out of the sea; keep the skiff in the water.
  if (v.kind === 'skiff') {
    if (nx < WORLD.seaX + 1) { nx = WORLD.seaX + 1; v.speed *= 0.5; }
  } else if (nx > WORLD.seaX - 2) { nx = WORLD.seaX - 2; v.speed *= 0.4; }
  nx = Math.max(-230, Math.min(230, nx));
  nz = Math.max(-230, Math.min(230, nz));
  // AABB collision with buildings: push out on the smallest axis, bleed speed.
  for (const c of colliders) {
    const hw = c.hw + v.w / 2, hd = c.hd + v.l / 2;
    const dx = nx - c.x, dz = nz - c.z;
    if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
      const px = hw - Math.abs(dx), pz = hd - Math.abs(dz);
      if (px < pz) nx = c.x + Math.sign(dx || 1) * hw;
      else nz = c.z + Math.sign(dz || 1) * hd;
      v.speed *= 0.4;
    }
  }
  v.group.position.x = nx;
  v.group.position.z = nz;
  v.group.rotation.y = v.heading;
}
