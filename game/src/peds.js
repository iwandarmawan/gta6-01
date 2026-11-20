// Solmar Bay — pedestrians: simple walkers on the sidewalks who stroll
// between blocks and flee from gunfire and crashes. They are the city's
// life: without them the streets feel empty, and the screenshots need them.

import { WORLD, clamp, dist2 } from './config.js';

const T = window.THREE;

const SHIRTS = [0xd84a4a, 0x4a7ad8, 0x4ad87a, 0xd8c84a, 0xd84ad8, 0xe8e8e8, 0x4ad8d8, 0x8a5a3a];
const PANTS = [0x2a2a3a, 0x3a3a3a, 0x4a3a2a, 0x2a3a4a];

function makePedMesh(rng) {
  const group = new T.Group();
  const shirt = rng.pick(SHIRTS);
  const pants = rng.pick(PANTS);
  const skin = [0xe8b88a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0][rng.int(0, 3)];
  // Legs.
  for (const s of [-1, 1]) {
    const leg = new T.Mesh(
      new T.BoxGeometry(0.16, 0.8, 0.16),
      new T.MeshLambertMaterial({ color: pants }),
    );
    leg.position.set(s * 0.12, 0.4, 0);
    group.add(leg);
  }
  // Torso.
  const torso = new T.Mesh(
    new T.BoxGeometry(0.55, 0.7, 0.3),
    new T.MeshLambertMaterial({ color: shirt }),
  );
  torso.position.y = 1.15;
  torso.castShadow = true;
  group.add(torso);
  // Head.
  const head = new T.Mesh(
    new T.SphereGeometry(0.24, 8, 6),
    new T.MeshLambertMaterial({ color: skin }),
  );
  head.position.y = 1.75;
  head.castShadow = true;
  group.add(head);
  // Arms swing while walking (animated by the update step).
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new T.Mesh(
      new T.BoxGeometry(0.13, 0.62, 0.13),
      new T.MeshLambertMaterial({ color: shirt }),
    );
    arm.position.set(s * 0.36, 1.15, 0);
    group.add(arm);
    arms.push(arm);
  }
  return { group, arms };
}

export class Pedestrians {
  constructor(scene, rng, colliders) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.peds = [];
  }

  spawn(count) {
    for (let i = 0; i < count; i += 1) {
      const mesh = makePedMesh(this.rng);
      // Start on a sidewalk: offset from a road centreline by half a block.
      const road = this.rng.pick([-216, -162, -108, -54, 0, 54, 108, 162, 216]);
      const along = this.rng.range(-240, 240);
      const x = this.rng.chance(0.5) ? road + 11 : along;
      const z = this.rng.chance(0.5) ? along : road + 11;
      mesh.group.position.set(clamp(x, -260, 260), 0, clamp(z, -260, 260));
      this.scene.add(mesh.group);
      this.peds.push({
        mesh, x: mesh.group.position.x, z: mesh.group.position.z,
        heading: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(1.1, 1.9),
        walkPhase: this.rng.range(0, Math.PI * 2),
        fleeing: 0, // seconds left of fleeing
        target: null,
        dead: false,
        hp: 100,
      });
    }
  }

  // Gunfire or a crash nearby: every ped in range runs away from it.
  scare(x, z, radius) {
    for (const p of this.peds) {
      if (p.dead) continue;
      if (dist2(p.x, p.z, x, z) < radius) {
        p.fleeing = 3 + this.rng.range(0, 2);
        p.heading = Math.atan2(p.x - x, p.z - z);
      }
    }
  }

  // Flee from fast traffic too: a car barrelling down the sidewalk is
  // just as scary as a gunshot. `cars` is the traffic list (may be empty).
  update(dt, cars = []) {
    for (const p of this.peds) {
      if (p.dead) continue;
      for (const car of cars) {
        if (!car.dead && Math.abs(car.speed) > 6 && dist2(p.x, p.z, car.x, car.z) < 5) {
          p.fleeing = Math.max(p.fleeing, 1.5);
          p.heading = Math.atan2(p.x - car.x, p.z - car.z);
        }
      }
      if (p.fleeing > 0) {
        p.fleeing -= dt;
        p.speed = 4.2;
      } else {
        p.speed = 1.5;
        // Wander: pick a new target point every so often.
        if (!p.target || dist2(p.x, p.z, p.target.x, p.target.z) < 3) {
          p.target = {
            x: clamp(p.x + this.rng.range(-60, 60), -260, 260),
            z: clamp(p.z + this.rng.range(-60, 60), -260, 260),
          };
        }
        const want = Math.atan2(p.target.x - p.x, p.target.z - p.z);
        let diff = want - p.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.heading += clamp(diff, -1.6 * dt, 1.6 * dt);
      }
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      p.x = clamp(p.x, -262, 262);
      p.z = clamp(p.z, -262, 262);
      // Keep peds out of buildings: slide along the footprint.
      for (const c of this.colliders) {
        if (p.x > c.minX - 0.4 && p.x < c.maxX + 0.4 && p.z > c.minZ - 0.4 && p.z < c.maxZ + 0.4) {
          p.x = Math.max(c.minX - 0.4, Math.min(p.x, c.maxX + 0.4));
        }
      }
      p.mesh.group.position.set(p.x, 0, p.z);
      p.mesh.group.rotation.y = p.heading;
      // Arm swing while walking.
      p.walkPhase += dt * p.speed * 2.4;
      const swing = Math.sin(p.walkPhase) * 0.5;
      p.mesh.arms[0].rotation.x = swing;
      p.mesh.arms[1].rotation.x = -swing;
    }
  }

  // Nearest living ped to a point (for hitscan targets and punching).
  nearest(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const p of this.peds) {
      if (p.dead) continue;
      const d = dist2(p.x, p.z, x, z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // A ped that was shot: fall over (sink + tip) and stay down. Nearby
  // peds see it happen and run.
  kill(p) {
    p.dead = true;
    p.mesh.group.rotation.x = -Math.PI / 2;
    p.mesh.group.position.y = 0.25;
    this.scare(p.x, p.z, 25);
  }
}
