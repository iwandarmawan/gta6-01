// Vehicles: sedan, pickup, motorcycle "Coast Runner", boat (skiff) and the
// police interceptor. Simple arcade kinematics; collisions clamp to the city
// and slow on building overlap.
import THREE from 'three';
import { VEHICLE_TOP_SPEEDS, CITY_BOUND, SEA_EDGE } from './config.js';

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshPhongMaterial({ color, shininess: 60, specular: 0x44505a })
  );
  m.position.set(x, y, z);
  return m;
}

function wheel(x, z) {
  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12),
    new THREE.MeshPhongMaterial({ color: 0x111417 })
  );
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0.42, z);
  return w;
}

export function makeVehicle(kind) {
  const g = new THREE.Group();
  g.userData.kind = kind;
  if (kind === 'sedan') {
    g.add(box(2, 0.7, 4.4, 0xc0392b, 0, 0.7, 0));
    g.add(box(1.7, 0.6, 2.2, 0x2c343c, 0, 1.3, -0.2));
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    hl.position.set(0, 0.75, 2.21); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
    tl.position.set(0, 0.75, -2.21); g.add(tl);
    g.add(wheel(-0.95, 1.5)); g.add(wheel(0.95, 1.5)); g.add(wheel(-0.95, -1.5)); g.add(wheel(0.95, -1.5));
  } else if (kind === 'pickup') {
    g.add(box(2, 0.8, 4.8, 0xd35400, 0, 0.75, 0));
    g.add(box(1.8, 0.7, 1.6, 0x2c343c, 0, 1.4, 0.9));
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    hl.position.set(0, 0.8, 2.41); g.add(hl);
    g.add(wheel(-0.95, 1.6)); g.add(wheel(0.95, 1.6)); g.add(wheel(-0.95, -1.6)); g.add(wheel(0.95, -1.6));
  } else if (kind === 'bike') {
    g.add(box(0.5, 0.5, 2.2, 0x1a7a8c, 0, 0.8, 0));
    g.add(box(0.4, 0.5, 0.7, 0x111417, 0, 1.15, 0.3));
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    hl.position.set(0, 0.85, 1.15); g.add(hl);
    g.add(wheel(0, 0.9)); g.add(wheel(0, -0.9));
  } else if (kind === 'boat') {
    // Skiff: pale hull with a pointed bow, an outboard motor, no wheels —
    // it must read as a boat on open water, never as a car.
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.7, 5.2),
      new THREE.MeshPhongMaterial({ color: 0xd8dee2, shininess: 40 })
    );
    hull.position.y = 0.35;
    g.add(hull);
    const bow = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 1.8, 4),
      new THREE.MeshPhongMaterial({ color: 0xd8dee2, shininess: 40 })
    );
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.35, 3.4);
    g.add(bow);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 5.3), new THREE.MeshPhongMaterial({ color: 0x2e6f8e }));
    rim.position.y = 0.72;
    g.add(rim);
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.4), new THREE.MeshPhongMaterial({ color: 0x22282e }));
    motor.position.set(0, 0.6, -2.7);
    g.add(motor);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.6), new THREE.MeshPhongMaterial({ color: 0x8a5a2e }));
    seat.position.set(0, 0.85, 0.4);
    g.add(seat);
  } else if (kind === 'police') {
    g.add(box(2, 0.7, 4.4, 0xe8e8e8, 0, 0.7, 0));
    g.add(box(1.7, 0.6, 2.2, 0x1a2028, 0, 1.3, -0.2));
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    barR.position.set(-0.45, 1.7, -0.2); g.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x2050ff }));
    barB.position.set(0.45, 1.7, -0.2); g.add(barB);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    hl.position.set(0, 0.75, 2.21); g.add(hl);
    g.add(wheel(-0.95, 1.5)); g.add(wheel(0.95, 1.5)); g.add(wheel(-0.95, -1.5)); g.add(wheel(0.95, -1.5));
  }
  return g;
}

// Drive state for one vehicle: position, heading, speed.
export function makeDriver(vehicle, x, z, heading = 0) {
  vehicle.position.set(x, 0, z);
  vehicle.rotation.y = heading;
  return { vehicle, x, z, heading, speed: 0, kind: vehicle.userData.kind };
}

export function driveCar(d, input, dt, colliders, upgrades = {}) {
  const top = (VEHICLE_TOP_SPEEDS[d.kind] || 30) * (upgrades.engine ? 1.25 : 1);
  const accel = d.kind === 'boat' ? 10 : 16;
  if (input.forward) d.speed += accel * dt;
  if (input.back) d.speed -= accel * 0.7 * dt;
  if (!input.forward && !input.back) d.speed *= Math.max(0, 1 - 1.6 * dt);
  d.speed = Math.max(-8, Math.min(top, d.speed));
  if (Math.abs(d.speed) > 0.5) {
    d.heading += (input.left ? 1 : 0) * 1.9 * dt * Math.sign(d.speed);
    d.heading -= (input.right ? 1 : 0) * 1.9 * dt * Math.sign(d.speed);
  }
  const nx = d.x + Math.sin(d.heading) * d.speed * dt;
  const nz = d.z + Math.cos(d.heading) * d.speed * dt;
  // Stay inside the city; boats stay on the water, cars stay off it.
  const onWater = nx < SEA_EDGE;
  if (d.kind === 'boat') {
    d.x = Math.max(-260, Math.min(SEA_EDGE - 2, nx));
    d.z = Math.max(-200, Math.min(200, nz));
  } else {
    if (onWater) { d.speed *= 0.4; }
    else { d.x = nx; d.z = nz; }
    d.x = Math.max(-CITY_BOUND, Math.min(CITY_BOUND, d.x));
    d.z = Math.max(-CITY_BOUND, Math.min(CITY_BOUND, d.z));
  }
  // Building collision: stop and slide.
  for (const c of colliders) {
    if (Math.abs(d.x - c.x) < c.hw + 1 && Math.abs(d.z - c.z) < c.hd + 1) {
      d.speed *= 0.3;
      d.x -= Math.sin(d.heading) * d.speed * dt * 2;
      d.z -= Math.cos(d.heading) * d.speed * dt * 2;
    }
  }
  d.vehicle.position.set(d.x, d.kind === 'boat' ? -0.15 : 0, d.z);
  d.vehicle.rotation.y = d.heading;
  return d;
}
