// Vehicles: built from boxes, driven with simple arcade physics.
// A vehicle is a group with a body, a cabin, wheels and a live state.
import { VEHICLES } from './config.js';

function box(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  return mesh;
}

// Build one vehicle of the given kind at (x, z), facing `heading` radians.
export function makeVehicle(kind, x, z, heading = 0) {
  const spec = VEHICLES[kind];
  const group = new THREE.Group();
  if (spec.kind === 'boat') {
    group.add(box(2.6, 0.9, 6.5, spec.color, 0, 0.7, 0));
    group.add(box(1.8, 0.8, 2.2, 0x2e4a6a, 0, 1.5, -0.6));
    group.add(box(2.8, 0.25, 6.8, 0x8a6a42, 0, 0.35, 0));
  } else if (spec.kind === 'moto') {
    group.add(box(0.7, 0.9, 2.4, spec.color, 0, 0.8, 0));
    group.add(box(0.5, 0.5, 0.9, 0x222222, 0, 1.3, -0.2));
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const dz of [-0.95, 0.95]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.25, 10), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.42, dz);
      group.add(wheel);
    }
  } else {
    group.add(box(2, 0.75, 4.4, spec.color, 0, 0.65, 0));
    group.add(box(1.8, 0.65, 2.2, 0x9fc8e8, 0, 1.3, -0.2));
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    for (const [wx, wz] of [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.42, wz);
      group.add(wheel);
    }
    if (kind === 'police') {
      group.add(box(1.2, 0.25, 0.5, 0xff2222, -0.4, 1.75, -0.2));
      group.add(box(1.2, 0.25, 0.5, 0x2244ff, 0.4, 1.75, -0.2));
      group.add(box(1.9, 0.5, 0.2, 0xffffff, 0, 0.7, 2.21));
    }
  }
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  const vehicle = {
    kind,
    spec,
    group,
    x,
    z,
    heading,
    speed: 0,
    driver: null, // 'player' | 'traffic' | 'police' | null
    hp: 100,
    smoke: 0,
  };
  return vehicle;
}

// One physics step for a driven vehicle. `steer` is -1..1, `throttle` is -1..1.
// Returns nothing; the vehicle moves and its mesh follows.
export function driveVehicle(v, steer, throttle, dt, topBoost = 1) {
  const top = v.spec.top * topBoost;
  v.speed += throttle * v.spec.accel * dt;
  v.speed *= Math.max(0, 1 - 0.9 * dt); // drag
  if (v.speed > top) v.speed = top;
  if (v.speed < -top * 0.4) v.speed = -top * 0.4;
  if (Math.abs(v.speed) > 0.1) {
    v.heading -= steer * v.spec.steer * dt * Math.sign(v.speed) * Math.min(1, Math.abs(v.speed) / 8);
  }
  v.x += Math.sin(v.heading) * v.speed * dt;
  v.z += Math.cos(v.heading) * v.speed * dt;
  v.group.position.set(v.x, v.spec.kind === 'boat' ? 0.1 : 0, v.z);
  v.group.rotation.y = v.heading;
  return v;
}

// Keep a vehicle inside the world and out of the sea (cars) or on the water (boats).
export function clampVehicle(v, world) {
  const lim = world / 2 - 4;
  v.x = Math.max(-lim, Math.min(lim, v.x));
  v.z = Math.max(-lim, Math.min(lim, v.z));
  if (v.spec.kind !== 'boat' && v.x > 186) {
    v.x = 186;
    v.speed *= 0.5;
  }
  if (v.spec.kind === 'boat' && v.x < 150) {
    v.x = 150;
    v.speed *= 0.5;
  }
}
