// Traffic: cars that drive the city's road grid in loops, so the streets
// are never empty. Each car follows a rectangle of roads at a steady speed,
// turning at the corners; they never leave the road, and they never think.
import { ROADS_X, ROADS_Z } from './config.js';
import { makeVehicle, driveVehicle } from './cars.js';

const KINDS = ['sedan', 'sedan', 'pickup', 'sedan', 'pickup'];

// A rectangular loop of roads: the car drives it clockwise, forever.
function makeLoop(rng) {
  const x1 = ROADS_X[Math.floor(rng() * 3)];
  const x2 = ROADS_X[3 + Math.floor(rng() * 3)];
  const z1 = ROADS_Z[Math.floor(rng() * 2)];
  const z2 = ROADS_Z[3 + Math.floor(rng() * 2)];
  return [
    { x: x1, z: z1 }, { x: x2, z: z1 }, { x: x2, z: z2 }, { x: x1, z: z2 },
  ];
}

export function makeTraffic(scene, rng, count = 14) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const loop = makeLoop(rng);
    const start = loop[Math.floor(rng() * 4)];
    const kind = KINDS[Math.floor(rng() * KINDS.length)];
    const car = makeVehicle(scene, kind, start.x, start.z, rng() * Math.PI * 2);
    car.loop = loop;
    car.target = (loop.indexOf(start) + 1) % 4;
    car.cruise = 7 + rng() * 4;
    cars.push(car);
  }
  return cars;
}

// Steer each traffic car toward its next loop corner; snap to the corner
// and take the next one when it arrives.
export function updateTraffic(cars, dt) {
  for (const car of cars) {
    const corner = car.loop[car.target];
    const dx = corner.x - car.x, dz = corner.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2) {
      car.target = (car.target + 1) % 4;
      continue;
    }
    const want = Math.atan2(-dx, -dz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
    car.speed = car.cruise;
    driveVehicle(car, 1, 0, false, dt);
    car.speed = car.cruise;
  }
}
