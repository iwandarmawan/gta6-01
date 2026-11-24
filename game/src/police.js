// Police: interceptors that chase and ram, plus the helicopter with its
// spotlight cone at four stars and up. Wanted decays when the player lies low.
import { makeVehicle } from './cars.js';
import { hitsCollider } from './cars.js';

export function makePolice(scene) {
  const heli = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a2a4a, emissive: 0x0a1428, emissiveIntensity: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 4.6), bodyMat);
  heli.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4), bodyMat);
  tail.position.set(0, 0.3, -3.8);
  heli.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.08, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 0.9;
  heli.add(rotor);
  const spotMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 26, 12, 1, true), spotMat);
  cone.position.y = -13;
  heli.add(cone);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -25.8;
  heli.add(pool);
  heli.visible = false;
  heli.userData.rotor = rotor;
  heli.userData.pool = pool;
  scene.add(heli);
  return { cars: [], heli };
}

export function updatePolice(police, wanted, playerPos, playerOnFoot, dt, colliders, scene, onBusted) {
  const want = Math.min(5, Math.max(0, wanted));
  // Spawn interceptors up to the wanted level.
  while (police.cars.length < want) {
    const car = makeVehicle('police', 0x1a2a4a);
    const a = Math.random() * Math.PI * 2;
    car.position.set(playerPos.x + Math.sin(a) * 45, 0, playerPos.z + Math.cos(a) * 45);
    car.userData.speed = 0;
    car.userData.heading = Math.atan2(playerPos.x - car.position.x, playerPos.z - car.position.z);
    scene.add(car);
    police.cars.push(car);
  }
  while (police.cars.length > want) {
    const car = police.cars.pop();
    scene.remove(car);
  }
  for (const car of police.cars) {
    const dx = playerPos.x - car.position.x;
    const dz = playerPos.z - car.position.z;
    const dist = Math.hypot(dx, dz);
    const target = Math.atan2(dx, dz);
    let dh = target - car.userData.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.userData.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    car.userData.speed = Math.min(26, car.userData.speed + 12 * dt);
    const nx = car.position.x + Math.sin(car.userData.heading) * car.userData.speed * dt;
    const nz = car.position.z + Math.cos(car.userData.heading) * car.userData.speed * dt;
    if (!hitsCollider(nx, nz, colliders)) {
      car.position.x = nx;
      car.position.z = nz;
    } else {
      car.userData.speed *= 0.5;
    }
    car.rotation.y = car.userData.heading;
    if (dist < 2.6) {
      if (playerOnFoot && want >= 2) onBusted();
      car.userData.speed *= 0.5;
    }
  }
  // Helicopter at four stars and up.
  const heli = police.heli;
  if (want >= 4) {
    heli.visible = true;
    heli.position.set(
      playerPos.x + Math.sin(performance.now() / 1400) * 14,
      26,
      playerPos.z + Math.cos(performance.now() / 1400) * 14,
    );
    heli.userData.rotor.rotation.y += dt * 22;
    heli.rotation.y = Math.atan2(playerPos.x - heli.position.x, playerPos.z - heli.position.z);
  } else {
    heli.visible = false;
  }
}
