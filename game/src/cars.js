// Vehicles: how each kind looks, and how it moves. Arcade physics on
// purpose — a car should answer the keys at once, not simulate suspension.
// Every vehicle is a group with a body, a cabin and four wheels (the boat
// and the bike are shaped differently), and a state: position, heading and
// speed. The police interceptor is a sedan with a light bar.
import { VEHICLES } from './config.js';

const THREE = window.THREE;

function makeBody(color, w, h, d, y) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.y = y; mesh.castShadow = true;
  return mesh;
}

function makeWheel() {
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  wheel.rotation.z = Math.PI / 2;
  wheel.castShadow = true;
  return wheel;
}

// A vehicle mesh for a kind, with its wheels grouped so they can spin.
export function buildVehicleMesh(kind) {
  const spec = VEHICLES[kind];
  const group = new THREE.Group();
  const wheels = [];
  if (kind === 'boat') {
    const hull = makeBody(spec.color, 2.4, 0.9, 6, 0.5);
    group.add(hull);
    const rim = makeBody(0x37474f, 2.0, 0.5, 5.2, 1.1);
    group.add(rim);
    const seat = makeBody(0x8d6e63, 1.4, 0.5, 1.6, 1.2);
    group.add(seat);
    return { group, wheels, length: 6 };
  }
  if (kind === 'bike') {
    const frame = makeBody(spec.color, 0.5, 0.5, 2.4, 0.8);
    group.add(frame);
    const tank = makeBody(0x222222, 0.5, 0.4, 0.8, 1.0);
    group.add(tank);
    const seat = makeBody(0x111111, 0.45, 0.25, 0.9, 0.95);
    seat.position.z = 0.7;
    group.add(seat);
    for (const [x, z] of [[0, -0.9], [0, 0.9]]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.2, 12),
        new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.45, z);
      group.add(wheel);
      wheels.push(wheel);
    }
    return { group, wheels, length: 2.4 };
  }
  const body = makeBody(spec.color, 2, 0.7, kind === 'pickup' ? 4.6 : 4.2, 0.75);
  group.add(body);
  const cabin = makeBody(kind === 'pickup' ? 0x222222 : 0x9fc3e0, 1.7, 0.6, kind === 'pickup' ? 1.6 : 2.2, 1.35);
  cabin.position.z = kind === 'pickup' ? 0.9 : 0;
  group.add(cabin);
  if (kind === 'pickup') {
    const bed = makeBody(0x333333, 1.8, 0.4, 2.2, 1.0);
    bed.position.z = -1.1;
    group.add(bed);
  }
  if (kind === 'police') {
    const bar = makeBody(0xffffff, 1.4, 0.25, 0.5, 1.75);
    group.add(bar);
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.2, 0.45),
      new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    );
    red.position.set(-0.35, 1.9, 0);
    group.add(red);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.2, 0.45),
      new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    );
    blue.position.set(0.35, 1.9, 0);
    group.add(blue);
  }
  for (const [x, z] of [[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]]) {
    const wheel = makeWheel();
    wheel.position.set(x, 0.42, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  return { group, wheels, length: kind === 'pickup' ? 4.6 : 4.2 };
}

// A live vehicle: its mesh, its kind, where it is and how fast it goes.
export function makeVehicle(scene, kind, x, z, heading = 0) {
  const { group, wheels, length } = buildVehicleMesh(kind);
  group.position.set(x, kind === 'boat' ? 0.1 : 0, z);
  group.rotation.y = heading;
  scene.add(group);
  return {
    kind, spec: VEHICLES[kind], mesh: group, wheels, length,
    x, z, heading, speed: 0, steer: 0,
    // Forward vector from the heading (three.js: -z is forward at heading 0).
    forward() { return { x: -Math.sin(this.heading), z: -Math.cos(this.heading) }; },
  };
}

// One step of arcade driving. throttle: -1 reverse, 0 coast, 1 full.
// steer: -1 left, 1 right. handbrake cuts speed hard.
export function driveVehicle(v, throttle, steer, handbrake, dt) {
  const top = v.spec.top * (v.boost || 1);
  if (throttle > 0) v.speed += v.spec.accel * dt;
  else if (throttle < 0) v.speed -= (v.speed > 0.5 ? v.spec.brake : v.spec.accel * 0.6) * dt;
  else v.speed -= Math.sign(v.speed) * 6 * dt;
  if (handbrake) v.speed -= Math.sign(v.speed) * 30 * dt;
  if (Math.abs(v.speed) < 0.05 && throttle === 0) v.speed = 0;
  v.speed = Math.max(-top * 0.45, Math.min(top, v.speed));
  const turn = steer * v.spec.turn * Math.min(1, Math.abs(v.speed) / 8) * Math.sign(v.speed || 1);
  v.heading += turn * dt;
  const f = v.forward();
  v.x += f.x * v.speed * dt;
  v.z += f.z * v.speed * dt;
  v.mesh.position.set(v.x, v.kind === 'boat' ? 0.1 + Math.sin(Date.now() * 0.002) * 0.05 : 0, v.z);
  v.mesh.rotation.y = v.heading;
  // The bike leans into its turns; cars stay flat.
  v.mesh.rotation.z = v.kind === 'bike' ? -steer * Math.min(0.35, Math.abs(v.speed) / 60) : 0;
  for (const wheel of v.wheels) wheel.rotation.x += (v.speed / 0.42) * dt;
}

// Remove a vehicle from the scene for good.
export function removeVehicle(scene, v) {
  scene.remove(v.mesh);
}
