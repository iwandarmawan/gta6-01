// The Solmar PD: how wanted stars turn into a chase. At one star a single
// interceptor rolls out; more stars add more cars, and at four stars a
// helicopter joins with a spotlight. Police steer at the player and ram on
// contact — that is the whole of their tactics, and it is enough.
import { makeVehicle, driveVehicle, removeVehicle } from './cars.js';

const THREE = window.THREE;

export function makePolice(scene) {
  return { cars: [], heli: null, heliLight: null, spawnTimer: 0 };
}

function wantedCarCount(wanted) {
  return wanted <= 0 ? 0 : wanted <= 1 ? 1 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4;
}

function makeHeli(scene) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.2, 4),
    new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
  );
  body.castShadow = true;
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 4),
    new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
  );
  tail.position.set(0, 0.2, 3.5);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(7, 0.1, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  rotor.position.y = 0.9;
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(6, 24, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
  );
  spot.rotation.x = Math.PI;
  spot.position.y = -12;
  group.add(body, tail, rotor, spot);
  group.userData.rotor = rotor;
  scene.add(group);
  return group;
}

// Keep the pursuit at the right size for the wanted level, then drive each
// car at the player. Returns true when a car rammed the player this frame.
export function updatePolice(police, scene, player, wanted, dt, time) {
  const want = wantedCarCount(wanted);
  while (police.cars.length < want) {
    const angle = Math.random() * Math.PI * 2;
    const car = makeVehicle(
      scene, 'police',
      player.x + Math.cos(angle) * 45, player.z + Math.sin(angle) * 45,
      angle,
    );
    police.cars.push(car);
  }
  while (police.cars.length > want) {
    removeVehicle(scene, police.cars.pop());
  }
  if (wanted >= 4 && !police.heli) police.heli = makeHeli(scene);
  if (wanted < 4 && police.heli) { scene.remove(police.heli); police.heli = null; }
  if (police.heli) {
    police.heli.position.set(player.x + 6, 26, player.z + 6);
    police.heli.userData.rotor.rotation.y = time * 20;
  }
  let rammed = false;
  for (const car of police.cars) {
    const dx = player.x - car.x, dz = player.z - car.z;
    const dist = Math.hypot(dx, dz);
    const wantHeading = Math.atan2(-dx, -dz);
    let diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    driveVehicle(car, 1, 0, false, dt);
    if (dist < 3.2) {
      rammed = true;
      // The ram shoves the player's car and costs speed, not position.
      car.speed *= -0.3;
      car.x -= Math.sin(car.heading) * 2;
      car.z -= Math.cos(car.heading) * 2;
    }
  }
  return rammed;
}

export function clearPolice(police, scene) {
  for (const car of police.cars) removeVehicle(scene, car);
  police.cars = [];
  if (police.heli) { scene.remove(police.heli); police.heli = null; }
}
