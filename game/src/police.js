// police.js — interceptor patrol cars and the helicopter with its spotlight.
// updateHeli / updatePolice are skipped entirely in frozen shot mode (round 13
// lesson: the heli repositions absolutely every frame and would overwrite staging).
import THREE from './three-shim.js';
import { makeVehicle, placeCar } from './cars.js';

export function makePolice(scene) {
  const cars = [];
  for (let i = 0; i < 2; i++) {
    const v = makeVehicle('interceptor');
    scene.add(v.group);
    placeCar(v, -40 - i * 12, 40 + i * 8, 0, 0);
    cars.push({ v, state: 'patrol', target: null });
  }
  // Helicopter: dark body, rotor, translucent spotlight cone.
  const heli = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.5, metalness: 0.4 }));
  heli.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.5 }));
  tail.position.set(-3, 0.2, 0); heli.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
  rotor.position.y = 0.9; heli.add(rotor);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 16, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.y = -8.5; heli.add(cone);
  heli.position.set(0, 18, 0);
  scene.add(heli);
  return { cars, heli, rotor, heliAngle: 0 };
}

export function updatePolice(police, playerPos, wanted, dt, colliders, audio) {
  if (dt <= 0) return;
  for (const p of police.cars) {
    const v = p.v;
    const dx = playerPos.x - v.group.position.x;
    const dz = playerPos.z - v.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (wanted > 0 && dist < 120) {
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - v.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      v.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
      v.speed = Math.min(v.top, v.speed + 18 * dt);
      if (dist < 4) { v.speed *= 0.5; }
    } else {
      // Patrol: slow cruise along the coast road.
      v.speed = Math.min(12, v.speed + 6 * dt);
      const wantHeading = Math.PI / 2;
      let dh = wantHeading - v.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      v.heading += Math.max(-1 * dt, Math.min(1 * dt, dh));
    }
    v.group.position.x += Math.sin(v.heading) * v.speed * dt;
    v.group.position.z += Math.cos(v.heading) * v.speed * dt;
    v.group.position.x = Math.max(-150, Math.min(145, v.group.position.x));
    v.group.position.z = Math.max(-150, Math.min(150, v.group.position.z));
    v.group.rotation.y = v.heading;
  }
}

export function updateHeli(police, playerPos, dt, t) {
  if (dt <= 0) return; // never overwrite a staged helicopter
  police.heliAngle += dt * 0.35;
  const r = 14;
  police.heli.position.set(
    playerPos.x + Math.cos(police.heliAngle) * r,
    12 + Math.sin(t * 0.8) * 1.5,
    playerPos.z + Math.sin(police.heliAngle) * r
  );
  police.heli.rotation.y = Math.atan2(playerPos.x - police.heli.position.x, playerPos.z - police.heli.position.z);
  police.rotor.rotation.y = t * 30;
}
