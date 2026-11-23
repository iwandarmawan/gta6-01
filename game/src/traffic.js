// Traffic: cars that drive the city's road loops all day, slowing
// for the car ahead of them and for the player.

import { TUNING, TRAFFIC_LOOPS, PALETTE } from './config.js';
import { makeCar } from './cars.js';

const THREE = window.THREE;

function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function createTraffic(scene, city, rng) {
  const cars = [];
  for (let i = 0; i < TUNING.trafficCount; i++) {
    const loop = TRAFFIC_LOOPS[i % TRAFFIC_LOOPS.length];
    const wp = Math.floor(rng.next() * loop.length);
    const [x, z] = loop[wp];
    const car = makeCar(scene, x + rng.range(-2, 2), z + rng.range(-2, 2), rng.range(0, Math.PI * 2), rng.pick(PALETTE.car), false);
    cars.push({
      car, loop, wp,
      speed: rng.range(8, 12),
      targetSpeed: rng.range(8, 12),
    });
  }

  function update(dt, playerCar) {
    for (const t of cars) {
      const { car, loop } = t;
      const [tx, tz] = loop[t.wp];
      const dx = tx - car.pos.x;
      const dz = tz - car.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 5) {
        t.wp = (t.wp + 1) % loop.length;
        continue;
      }
      // Slow for the car ahead, including the player's car.
      let slow = false;
      if (playerCar && dist2(car.pos.x, car.pos.z, playerCar.pos.x, playerCar.pos.z) < 90) slow = true;
      for (const other of cars) {
        if (other === t) continue;
        if (dist2(car.pos.x, car.pos.z, other.car.pos.x, other.car.pos.z) < 64) { slow = true; break; }
      }
      const want = slow ? 0 : t.targetSpeed;
      t.speed += (want - t.speed) * Math.min(1, dt * 1.5);
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      car.pos.x += Math.sin(car.heading) * t.speed * dt;
      car.pos.z += Math.cos(car.heading) * t.speed * dt;
      car.group.rotation.y = car.heading;
      for (const w of car.wheels) w.rotation.y += t.speed * dt * 1.4;
    }
  }

  return { cars, update };
}
