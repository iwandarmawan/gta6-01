// Ambient traffic: cars that loop the road grid so the city feels alive.
// Each car follows one straight road and wraps around at the edge.
import { ROAD_EVERY, WORLD } from './config.js';
import { makeVehicle, driveVehicle } from './cars.js';
import { mulberry32, range } from './rng.js';

export function createTraffic(scene, count = 14) {
  const rng = mulberry32(777);
  const cars = [];
  const colors = ['sedan', 'pickup', 'sedan', 'pickup', 'sedan'];
  for (let i = 0; i < count; i++) {
    const kind = colors[i % colors.length];
    const along = Math.floor(range(rng, -3, 4)) * ROAD_EVERY;
    const vertical = rng() < 0.5;
    const start = range(rng, -180, 180);
    const dir = rng() < 0.5 ? 1 : -1;
    const lane = (rng() < 0.5 ? -2.5 : 2.5) * dir;
    const v = makeVehicle(kind, vertical ? along + lane : start, vertical ? start : along + lane, vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2));
    v.driver = 'traffic';
    v.speed = range(rng, 8, 13);
    v.vertical = vertical;
    v.dir = dir;
    v.lane = lane;
    v.road = along;
    scene.add(v.group);
    cars.push(v);
  }
  return cars;
}

export function updateTraffic(cars, dt) {
  const lim = WORLD / 2 - 6;
  for (const v of cars) {
    driveVehicle(v, 0, 0, dt);
    // Hold the lane: straight-line driving, no steering.
    if (v.vertical) {
      v.x = v.road + v.lane;
      v.z += v.dir * v.speed * dt;
      if (v.z > lim) v.z = -lim;
      if (v.z < -lim) v.z = lim;
    } else {
      v.z = v.road + v.lane;
      v.x += v.dir * v.speed * dt;
      if (v.x > lim) v.x = -lim;
      if (v.x < -lim) v.x = lim;
    }
    v.group.position.set(v.x, 0, v.z);
    v.group.rotation.y = v.heading;
  }
}
