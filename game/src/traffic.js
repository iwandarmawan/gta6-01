// Ambient traffic: cars cruising the street grid, wrapping at the city edge.
// They are scenery with a job — they make the screenshots read as a living city.
const THREE = window.THREE;

import { STREETS_X, STREETS_Z } from './config.js';
import { makeVehicle, spinWheels } from './cars.js';

const PAINT = [0x3a6ac2, 0xc2a23a, 0x7a3a8a, 0x3a8a5a, 0x8a8a8a, 0xc25a2a];

export class Traffic {
  constructor(scene, rng, count = 10) {
    this.cars = [];
    for (let i = 0; i < count; i++) {
      const kind = rng.pick(['sedan', 'pickup', 'sedan', 'pickup', 'bike']);
      const v = makeVehicle(kind, rng.pick(PAINT));
      const axis = rng.chance(0.5) ? 'x' : 'z';
      const dir = rng.chance(0.5) ? 1 : -1;
      const car = { v, axis, dir, speed: rng.range(8, 14), x: 0, z: 0 };
      if (axis === 'x') {
        car.x = rng.pick(STREETS_X) + (dir > 0 ? 2 : -2);
        car.z = rng.range(-190, 190);
      } else {
        car.x = rng.range(-130, 130);
        car.z = rng.pick(STREETS_Z) + (dir > 0 ? 2 : -2);
      }
      v.group.position.set(car.x, 0, car.z);
      scene.add(v.group);
      this.cars.push(car);
    }
  }

  update(dt) {
    for (const c of this.cars) {
      if (c.axis === 'x') {
        c.z += c.dir * c.speed * dt;
        if (c.z > 195) c.z = -195;
        if (c.z < -195) c.z = 195;
        c.v.group.rotation.y = c.dir > 0 ? 0 : Math.PI;
      } else {
        c.x += c.dir * c.speed * dt;
        if (c.x > 135) c.x = -135;
        if (c.x < -135) c.x = 135;
        c.v.group.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      c.v.group.position.set(c.x, 0, c.z);
      spinWheels(c.v, dt, c.speed);
    }
  }

  positions() {
    return this.cars.map((c) => ({ x: c.x, z: c.z }));
  }
}
