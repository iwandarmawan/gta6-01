// Solmar Bay — traffic: cars that follow the road lanes, pause at
// junctions, and slow down for the player instead of ramming them.
// Traffic cars are ordinary Cars driven by a simple waypoint pilot.

import { WORLD, clamp, dist2 } from './config.js';
import { Car } from './cars.js';

export class Traffic {
  constructor(scene, rng, colliders) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.cars = [];
    // Road centrelines, for picking routes.
    this.roads = [];
    for (let k = -WORLD.GRID; k <= WORLD.GRID; k += 1) this.roads.push(k * WORLD.PITCH);
  }

  spawn(count) {
    for (let i = 0; i < count; i += 1) {
      const car = this.spawnOne();
      if (car) this.cars.push(car);
    }
  }

  // One traffic car on a random road, heading along it, with a route of
  // waypoints that turns at junctions.
  spawnOne() {
    const horizontal = this.rng.chance(0.5);
    const road = this.rng.pick(this.roads);
    const along = this.rng.range(-WORLD.CITY_HALF + 20, WORLD.CITY_HALF - 20);
    const x = horizontal ? along : road + (this.rng.chance(0.5) ? 3.2 : -3.2);
    const z = horizontal ? road + (this.rng.chance(0.5) ? 3.2 : -3.2) : along;
    const heading = horizontal
      ? (this.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2)
      : (this.rng.chance(0.5) ? 0 : Math.PI);
    const car = new Car(this.scene, this.rng, x, z, heading, false);
    car.cruise = this.rng.range(7, 11);
    car.route = this.makeRoute(x, z, heading);
    car.routeIndex = 0;
    car.wait = 0;
    return car;
  }

  // A route is a list of road waypoints: drive along the current road to a
  // random junction, turn onto the cross road, repeat.
  makeRoute(x, z, heading) {
    const route = [];
    let px = x;
    let pz = z;
    let dir = Math.round(heading / (Math.PI / 2)) % 4;
    for (let i = 0; i < 6; i += 1) {
      const len = this.rng.range(60, 160);
      const dx = dir === 1 ? 1 : dir === 3 ? -1 : 0;
      const dz = dir === 0 ? 1 : dir === 2 ? -1 : 0;
      px = clamp(px + dx * len, -WORLD.CITY_HALF + 10, WORLD.CITY_HALF - 10);
      pz = clamp(pz + dz * len, -WORLD.CITY_HALF + 10, WORLD.CITY_HALF - 10);
      route.push({ x: px, z: pz });
      // Turn left or right at the next junction.
      dir = (dir + (this.rng.chance(0.5) ? 1 : 3)) % 4;
    }
    return route;
  }

  update(dt, playerX, playerZ) {
    for (const car of this.cars) {
      if (car.dead) continue;
      const target = car.route[car.routeIndex];
      if (!target) {
        car.route = this.makeRoute(car.x, car.z, car.heading);
        car.routeIndex = 0;
        continue;
      }
      const d = dist2(car.x, car.z, target.x, target.z);
      if (d < 4) {
        car.routeIndex += 1;
        car.wait = 0.4; // brief pause at the junction, like a real driver
        continue;
      }
      // Slow down for the player when they are right ahead; a traffic car
      // stuck behind the player flags itself so the game can honk at them.
      const playerAhead = dist2(car.x, car.z, playerX, playerZ) < 14;
      car.blockedByPlayer = playerAhead;
      const want = Math.atan2(target.x - car.x, target.z - car.z);
      let diff = want - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = clamp(diff * 1.4, -1, 1);
      if (car.wait > 0) {
        car.wait -= dt;
        car.drive(dt, 0, 0, this.colliders);
      } else {
        const throttle = playerAhead ? 0.15 : clamp((car.cruise - car.speed) / 4, 0, 1);
        car.drive(dt, throttle, steer, this.colliders);
      }
      // Keep the car on the road: if it drifted far off, respawn it.
      if (Math.abs(car.x) > WORLD.CITY_HALF + 30 || Math.abs(car.z) > WORLD.CITY_HALF + 30) {
        this.respawn(car);
      }
    }
  }

  respawn(car) {
    const fresh = this.spawnOne();
    car.x = fresh.x;
    car.z = fresh.z;
    car.heading = fresh.heading;
    car.speed = 0;
    car.blockedByPlayer = false;
    car.route = fresh.route;
    car.routeIndex = 0;
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.heading;
    fresh.remove(this.scene);
  }

  // Nearest traffic car to a point (for stealing: the player grabs it).
  nearest(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of this.cars) {
      if (car.dead) continue;
      const d = dist2(car.x, car.z, x, z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }
}
