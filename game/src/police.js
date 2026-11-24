// police.js — police interceptors and the helicopter with its spotlight.
import THREE from 'three';
import { makeCar, placeCar } from './cars.js';
import { mulberry32, range } from './rng.js';

export function spawnPolice(scene, count = 2) {
  const rng = mulberry32(99);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const car = makeCar('police');
    placeCar(car, range(rng, -40, 40), 100 + i * 18, Math.PI, 0);
    scene.add(car);
    cars.push(car);
  }
  return cars;
}

export function makeHeli() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.6),
    new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.4, metalness: 0.4 }));
  body.castShadow = true;
  g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.4 }));
  tail.position.set(0, 0.3, -4); g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 }));
  rotor.position.y = 1.0; g.add(rotor);
  g.userData.rotor = rotor;
  // Spotlight cone pointing down at the street.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.x = Math.PI; // apex up at the heli, opening down
  cone.position.y = -13;
  g.add(cone);
  g.userData.cone = cone;
  const spot = new THREE.PointLight(0xfff2c0, 60, 60, 1.6);
  spot.position.y = -2;
  g.add(spot);
  return g;
}

export function updatePolice(cars, target, dt, wanted) {
  for (const car of cars) {
    if (wanted < 1 || !target) {
      car.userData.speed = Math.max(0, car.userData.speed - 10 * dt);
    } else {
      // Ram the target: steer toward it, faster than a sedan.
      const dx = target.position.x - car.position.x;
      const dz = target.position.z - car.position.z;
      const want = Math.atan2(dx, dz);
      let diff = want - car.userData.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.userData.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      car.userData.speed = Math.min(32, car.userData.speed + 18 * dt);
    }
    car.position.x += Math.sin(car.userData.heading) * car.userData.speed * dt;
    car.position.z += Math.cos(car.userData.heading) * car.userData.speed * dt;
    car.rotation.y = car.userData.heading;
    // Flash the light bar.
    const bar = car.userData.lightBar;
    if (bar) {
      const phase = Math.floor(performance.now() / 180) % 2 === 0;
      bar.red.material.emissiveIntensity = phase ? 2.2 : 0.2;
      bar.blue.material.emissiveIntensity = phase ? 0.2 : 2.2;
    }
  }
}

export function updateHeli(heli, target, dt, time, wanted) {
  if (!heli) return;
  heli.userData.rotor.rotation.y += dt * 22;
  if (wanted >= 4 && target) {
    // Orbit the target, spotlight cone sweeping the street.
    const a = time * 0.35;
    heli.position.set(
      target.position.x + Math.cos(a) * 16,
      26,
      target.position.z + Math.sin(a) * 16);
    heli.lookAt(target.position.x, 0, target.position.z);
  } else {
    heli.position.set(60 + Math.sin(time * 0.1) * 20, 30, 60);
  }
}
