// Wanted system: police interceptors ram the player, and at 4+ stars a
// helicopter joins with a spotlight cone cutting through the fog.
import THREE from 'three';
import { makeVehicle } from './cars.js';
import { makeRng } from './rng.js';
import { LAYOUT_SEED } from './config.js';

export function makePolice(scene) {
  const rng = makeRng(LAYOUT_SEED + 21);
  const cars = [];
  for (let i = 0; i < 3; i++) {
    const v = makeVehicle('police');
    v.position.set(rng.range(-60, 60), 0, rng.range(-60, 60));
    scene.add(v);
    cars.push({ vehicle: v, x: v.position.x, z: v.position.z, heading: 0, speed: 0 });
  }
  // Helicopter: body, tail, rotor and a spotlight cone.
  const heli = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.4, 4.2),
    new THREE.MeshPhongMaterial({ color: 0x1a2028 })
  );
  heli.add(body);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 3.4),
    new THREE.MeshPhongMaterial({ color: 0x1a2028 })
  );
  tail.position.set(0, 0.3, -3.4);
  heli.add(tail);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.08, 0.5),
    new THREE.MeshPhongMaterial({ color: 0x111417 })
  );
  rotor.position.y = 0.9;
  heli.add(rotor);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 16, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  );
  cone.rotation.x = Math.PI;
  cone.position.y = -8.5;
  heli.add(cone);
  heli.position.set(0, 14, 0);
  scene.add(heli);
  return { cars, heli, rotor, cone, active: false };
}

export function updatePolice(police, player, wanted, dt, shotMode) {
  if (shotMode) return; // staged cameras/heli must not be overwritten
  police.active = wanted >= 4;
  police.heli.visible = police.active;
  if (police.active) {
    police.rotor.rotation.y += dt * 18;
    const tx = player.x, tz = player.z;
    police.heli.position.x += (tx - police.heli.position.x) * Math.min(1, dt * 1.2);
    police.heli.position.z += (tz - police.heli.position.z) * Math.min(1, dt * 1.2);
    police.heli.position.y = 14 + Math.sin(Date.now() * 0.001) * 0.6;
  }
  if (wanted <= 0) return;
  for (const c of police.cars) {
    const dx = player.x - c.x, dz = player.z - c.z;
    const dist = Math.hypot(dx, dz) || 1;
    const target = Math.atan2(dx, dz);
    let dh = target - c.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    c.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
    c.speed = Math.min(26 + wanted * 1.5, 33);
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
    c.vehicle.position.set(c.x, 0, c.z);
    c.vehicle.rotation.y = c.heading;
    if (dist < 4) { // ram: shove the player and slow the interceptor
      c.speed *= 0.4;
    }
  }
}

export function wantedStars(wanted) {
  return '★'.repeat(wanted) + '☆'.repeat(Math.max(0, 5 - wanted));
}
