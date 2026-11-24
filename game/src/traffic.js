// Ambient traffic: cars cruising the street grid through the fog.
import { makeVehicle } from './cars.js';
import { makeRng } from './rng.js';
import { LAYOUT_SEED, GRID_OFFSET } from './config.js';

const LANES = [];
for (let i = -4; i <= 4; i++) {
  const p = i * 44 + GRID_OFFSET;
  if (p >= -136) LANES.push(p); // never a traffic lane on the water
}

export function makeTraffic(scene, count = 10) {
  const rng = makeRng(LAYOUT_SEED + 7);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const kind = rng.pick(['sedan', 'sedan', 'pickup']);
    const v = makeVehicle(kind);
    const vertical = rng.next() < 0.5;
    const lane = rng.pick(LANES);
    const along = rng.range(-180, 180);
    const dir = rng.next() < 0.5 ? 1 : -1;
    v.position.set(vertical ? lane + 2.5 : along, 0, vertical ? along : lane + 2.5);
    v.rotation.y = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    scene.add(v);
    cars.push({ vehicle: v, vertical, lane, along, dir, speed: rng.range(8, 14) });
  }
  return cars;
}

export function updateTraffic(cars, dt) {
  for (const c of cars) {
    c.along += c.dir * c.speed * dt;
    if (c.along > 190) c.along = -190;
    if (c.along < -190) c.along = 190;
    if (c.vertical) c.vehicle.position.set(c.lane + 2.5, 0, c.along);
    else c.vehicle.position.set(c.along, 0, c.lane + 2.5);
  }
}
