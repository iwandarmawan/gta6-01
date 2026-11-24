// traffic.js — ambient traffic cars cruising the grid and the coast road.
import { makeCar, placeCar } from './cars.js';
import { mulberry32, pick, range } from './rng.js';

const KINDS = ['sedan', 'pickup', 'sedan', 'pickup'];
const LANES = [
  { x: -120, z: -140, heading: 0, vertical: true },
  { x: -60, z: 140, heading: Math.PI, vertical: true },
  { x: 0, z: -140, heading: 0, vertical: true },
  { x: 60, z: 140, heading: Math.PI, vertical: true },
  { x: 120, z: -140, heading: 0, vertical: true },
  { x: -170, z: 120, heading: Math.PI / 2, vertical: false },
  { x: 170, z: 60, heading: -Math.PI / 2, vertical: false },
  { x: -170, z: -60, heading: Math.PI / 2, vertical: false },
];

export function spawnTraffic(scene, count = 8) {
  const rng = mulberry32(777);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const lane = LANES[i % LANES.length];
    const car = makeCar(pick(rng, KINDS));
    const t = rng();
    const x = lane.vertical ? lane.x + range(rng, -2, 2) : -170 + t * 340;
    const z = lane.vertical ? -140 + t * 290 : lane.z + range(rng, -2, 2);
    placeCar(car, x, z, lane.heading, range(rng, 10, 16));
    car.userData.lane = lane;
    car.userData.cruise = car.userData.speed;
    scene.add(car);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt) {
  for (const car of cars) {
    const lane = car.userData.lane;
    car.userData.speed = car.userData.cruise;
    car.position.x += Math.sin(lane.heading) * car.userData.speed * dt;
    car.position.z += Math.cos(lane.heading) * car.userData.speed * dt;
    // Wrap around the city edge.
    if (lane.vertical && car.position.z > 150) car.position.z = -140;
    if (lane.vertical && car.position.z < -145) car.position.z = 145;
    if (!lane.vertical && car.position.x > 175) car.position.x = -170;
    if (!lane.vertical && car.position.x < -175) car.position.x = 170;
    car.rotation.y = lane.heading;
  }
}
