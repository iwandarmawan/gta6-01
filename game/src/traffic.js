// Traffic: cars cruising the street grid at night, headlights on, slowing
// near the player so the roads feel alive without pile-ups.
import { makeVehicle } from './cars.js';
import { mulberry32, pick, range } from './rng.js';

const STREETS_X = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
const STREETS_Z = [-100, -60, -20, 20, 60, 100, 140];

export function makeTraffic(scene, count) {
  const rng = mulberry32(777);
  const colors = [0x5a6b8a, 0x8a5a3c, 0x3c6b4a, 0x6b3c5a, 0x777777, 0x2a4a6b];
  const cars = [];
  for (let i = 0; i < count; i++) {
    const car = makeVehicle('sedan', pick(rng, colors));
    const onX = rng() < 0.5;
    const street = onX ? pick(rng, STREETS_X) : pick(rng, STREETS_Z);
    const along = range(rng, -140, 140);
    car.position.set(onX ? street + (rng() < 0.5 ? -2 : 2) : along, 0, onX ? along : street + (rng() < 0.5 ? -2 : 2));
    car.userData.speed = range(rng, 7, 12);
    car.userData.heading = onX ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    car.userData.axis = onX ? 'z' : 'x';
    car.userData.street = street;
    car.userData.dir = car.userData.heading === 0 || car.userData.heading === Math.PI / 2 ? 1 : -1;
    scene.add(car);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, playerPos) {
  for (const car of cars) {
    // Slow down when the player is right ahead.
    const dx = playerPos.x - car.position.x;
    const dz = playerPos.z - car.position.z;
    const dist = Math.hypot(dx, dz);
    const want = dist < 14 ? 3 : car.userData.cruise || 10;
    car.userData.cruise = car.userData.cruise || 10;
    const speed = Math.min(car.userData.cruise, want + (dist >= 14 ? 8 : 0));
    const step = speed * dt * car.userData.dir;
    if (car.userData.axis === 'z') {
      car.position.z += step;
      if (car.position.z > 150) car.position.z = -150;
      if (car.position.z < -150) car.position.z = 150;
    } else {
      car.position.x += step;
      if (car.position.x > 170) car.position.x = -170;
      if (car.position.x < -170) car.position.x = 170;
    }
    car.rotation.y = car.userData.heading;
    for (const w of car.userData.wheels) w.rotation.x += speed * dt * 2;
  }
}
