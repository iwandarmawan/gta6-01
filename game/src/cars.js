// Vehicle factory: every drivable thing in Solmar Bay is built from boxes.
// Forward is local +z; group.rotation.y = heading. Wheels spin around their
// axle (a wrapper group per wheel), and every vehicle carries a blob shadow.
const THREE = window.THREE;

import { VEHICLES } from './config.js';

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}
function basic(color) {
  return new THREE.MeshBasicMaterial({ color });
}

function wheel(r, w) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 10), lambert(0x1a1a1a));
  tyre.rotation.z = Math.PI / 2;
  g.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 8), lambert(0x8a8a8a));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

function blobShadow(group, radius) {
  const s = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }),
  );
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.02;
  group.add(s);
}

export function makeVehicle(kind, color) {
  const spec = VEHICLES[kind];
  const c = color ?? spec.color;
  const group = new THREE.Group();
  const wheels = [];
  let lightBar = null;

  function addWheel(x, y, z, r = 0.38, w = 0.3) {
    const wh = wheel(r, w);
    wh.position.set(x, y, z);
    group.add(wh);
    wheels.push(wh);
    return wh;
  }

  if (kind === 'sedan' || kind === 'interceptor') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), lambert(c));
    body.position.y = 0.55;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), lambert(0x2a3038));
    cabin.position.set(0, 1.2, -0.2);
    group.add(cabin);
    addWheel(-0.95, 0.38, 1.45);
    addWheel(0.95, 0.38, 1.45);
    addWheel(-0.95, 0.38, -1.45);
    addWheel(0.95, 0.38, -1.45);
    for (const sx of [-0.6, 0.6]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), basic(0xffe9a8));
      head.position.set(sx, 0.6, 2.22);
      group.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), basic(0xc22a2a));
      tail.position.set(sx, 0.6, -2.22);
      group.add(tail);
    }
    if (kind === 'interceptor') {
      for (const sx of [-1.01, 1.01]) {
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 2.4), lambert(0xe8e4da));
        door.position.set(sx, 0.6, 0);
        group.add(door);
      }
      const bar = new THREE.Group();
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.4), basic(0xff2a2a));
      red.position.x = -0.35;
      const blue = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.4), basic(0x2a6aff));
      blue.position.x = 0.35;
      bar.add(red, blue);
      bar.position.y = 1.65;
      group.add(bar);
      lightBar = { red, blue };
    }
    blobShadow(group, 2.4);
  } else if (kind === 'pickup') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4.6), lambert(c));
    body.position.y = 0.6;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 1.6), lambert(0x2a3038));
    cabin.position.set(0, 1.3, -0.9);
    group.add(cabin);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 1.8), lambert(0x3a3a3a));
    bed.position.set(0, 1.05, 1.1);
    group.add(bed);
    addWheel(-0.95, 0.42, 1.5, 0.42);
    addWheel(0.95, 0.42, 1.5, 0.42);
    addWheel(-0.95, 0.42, -1.5, 0.42);
    addWheel(0.95, 0.42, -1.5, 0.42);
    blobShadow(group, 2.5);
  } else if (kind === 'bike') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 2.1), lambert(c));
    frame.position.y = 0.7;
    group.add(frame);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.6), lambert(0x1a1a1a));
    seat.position.set(0, 1.0, -0.5);
    group.add(seat);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), lambert(0x1a1a1a));
    bar.position.set(0, 1.05, 0.85);
    group.add(bar);
    // Rider: torso and helmet, leaning over the tank.
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.4), lambert(0x8a2a3a));
    torso.position.set(0, 1.35, -0.2);
    torso.rotation.x = 0.4;
    group.add(torso);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), lambert(0xe8e4da));
    helmet.position.set(0, 1.75, 0.05);
    group.add(helmet);
    addWheel(0, 0.45, 0.85, 0.45, 0.15);
    addWheel(0, 0.45, -0.85, 0.45, 0.15);
    blobShadow(group, 1.4);
  } else if (kind === 'skiff') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 5), lambert(c));
    hull.position.y = 0.4;
    group.add(hull);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 4.4), lambert(0x3a3a44));
    inner.position.y = 0.75;
    group.add(inner);
    for (const z of [-1.2, 0.4]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.5), lambert(0x6a4a2a));
      seat.position.set(0, 0.85, z);
      group.add(seat);
    }
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), lambert(0x1a1a1a));
    motor.position.set(0, 0.6, -2.6);
    group.add(motor);
    blobShadow(group, 2.6);
  }

  return { group, spec, kind, wheels, lightBar };
}

// Spin the wheels to match a speed in m/s.
export function spinWheels(veh, dt, speed) {
  for (const w of veh.wheels) w.rotation.x += (speed * dt) / 0.4;
}

// Flash a police light bar, red then blue, twice a second.
export function flashLightBar(veh, t) {
  if (!veh.lightBar) return;
  const on = Math.sin(t * 12) > 0;
  veh.lightBar.red.material.color.setHex(on ? 0xff2a2a : 0x4a1010);
  veh.lightBar.blue.material.color.setHex(on ? 0x10104a : 0x2a6aff);
}
