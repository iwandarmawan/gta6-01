// Solmar Bay — cars: mesh building, arcade driving, damage and smoke.
// A car is a small group of boxes (body, cabin, wheels, lights) with a
// simple physics state: position, heading, speed and damage 0..1. Damage
// bends the handling and, past a threshold, makes the car smoke.

import { COLORS, TUNE, WORLD, clamp } from './config.js';

const T = window.THREE;

let carCounter = 0;

// Build one car mesh. `police` cars get the dark paint, a light bar and a
// roof number; ordinary cars get a random paint colour and body shape.
export function makeCarMesh(rng, police = false) {
  const group = new T.Group();
  const paint = police ? COLORS.policePaint : rng.pick(COLORS.carPaint);
  const sedan = !police && rng.chance(0.5);
  const bodyLen = sedan ? 4.4 : 3.8;
  const bodyW = 1.9;
  const bodyH = 0.75;

  const body = new T.Mesh(
    new T.BoxGeometry(bodyW, bodyH, bodyLen),
    new T.MeshLambertMaterial({ color: paint }),
  );
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  const cabin = new T.Mesh(
    new T.BoxGeometry(bodyW * 0.82, 0.62, bodyLen * 0.45),
    new T.MeshLambertMaterial({ color: police ? 0x101418 : 0x1c2733 }),
  );
  cabin.position.set(0, 1.2, sedan ? -0.2 : 0.1);
  cabin.castShadow = true;
  group.add(cabin);

  // Wheels: dark cylinders, spun by the drive code for a rolling look.
  const wheelGeo = new T.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheelMat = new T.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) {
    const wheel = new T.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
    wheels.push(wheel);
  }

  // Headlights (front) and tail lights (rear): small emissive boxes.
  const headMat = new T.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const s of [-1, 1]) {
    const h = new T.Mesh(new T.BoxGeometry(0.34, 0.18, 0.08), headMat);
    h.position.set(s * 0.6, 0.62, bodyLen / 2 + 0.02);
    group.add(h);
  }
  const tailMat = new T.MeshBasicMaterial({ color: 0xd82a2a });
  for (const s of [-1, 1]) {
    const t = new T.Mesh(new T.BoxGeometry(0.34, 0.16, 0.08), tailMat);
    t.position.set(s * 0.6, 0.62, -bodyLen / 2 - 0.02);
    group.add(t);
  }
  let lightBar = null;
  let lightR = null;
  let lightB = null;
  if (police) {
    lightBar = new T.Mesh(
      new T.BoxGeometry(1.1, 0.22, 0.4),
      new T.MeshLambertMaterial({ color: 0x222222 }),
    );
    lightBar.position.set(0, 1.62, -0.1);
    group.add(lightBar);
    lightR = new T.Mesh(
      new T.BoxGeometry(0.5, 0.16, 0.42),
      new T.MeshBasicMaterial({ color: COLORS.policeLightR }),
    );
    lightR.position.set(-0.28, 1.78, -0.1);
    group.add(lightR);
    lightB = new T.Mesh(
      new T.BoxGeometry(0.5, 0.16, 0.42),
      new T.MeshBasicMaterial({ color: COLORS.policeLightB }),
    );
    lightB.position.set(0.28, 1.78, -0.1);
    group.add(lightB);
  }

  // Smoke puffs for damaged cars: a few grey sprites the drive code puffs.
  const smokeMat = new T.MeshBasicMaterial({ color: 0x777777, transparent: true, opacity: 0.55 });
  const smoke = [];
  for (let i = 0; i < 5; i += 1) {
    const puff = new T.Mesh(new T.SphereGeometry(0.4, 6, 5), smokeMat.clone());
    puff.visible = false;
    group.add(puff);
    smoke.push(puff);
  }

  return { group, wheels, lightR, lightB, smoke, bodyLen, tailMat };
}

export class Car {
  constructor(scene, rng, x, z, heading, police = false) {
    this.id = carCounter;
    carCounter += 1;
    this.police = police;
    this.mesh = makeCarMesh(rng, police);
    this.group = this.mesh.group;
    this.group.position.set(x, 0, z);
    this.group.rotation.y = heading;
    scene.add(this.group);
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.damage = 0;
    this.steer = 0;
    this.dead = false;
    this.smokeTimer = 0;
    this.flashTimer = 0; // police light-bar blink clock
  }

  get speedKmh() { return Math.abs(this.speed) * 3.6; }
  get forwardX() { return Math.sin(this.heading); }
  get forwardZ() { return Math.cos(this.heading); }

  // Arcade drive step: throttle in [-1, 1], steer in [-1, 1].
  drive(dt, throttle, steer, colliders) {
    const maxFwd = TUNE.carMaxSpeed * (1 - this.damage * 0.45);
    const maxRev = TUNE.carMaxReverse;
    if (throttle > 0) this.speed += TUNE.carAccel * throttle * dt;
    else if (throttle < 0) this.speed += (this.speed > 0.5 ? -TUNE.carBrake : TUNE.carReverse) * dt;
    else {
      // Coast down with drag.
      this.speed -= this.speed * TUNE.carDrag * dt;
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }
    this.speed = clamp(this.speed, -maxRev, maxFwd);
    this.steer = steer;
    const turn = steer * TUNE.carSteer * dt * clamp(this.speed / 8, -1, 1);
    this.heading += turn;
    let nx = this.x + Math.sin(this.heading) * this.speed * dt;
    let nz = this.z + Math.cos(this.heading) * this.speed * dt;
    // Stay inside the playable area (the sea and the canal stop cars).
    nx = clamp(nx, WORLD.BEACH_X + 6, WORLD.CITY_HALF);
    nz = clamp(nz, -WORLD.CITY_HALF, WORLD.CANAL_Z + 2);
    // Buildings: slide along them, take a little damage on a hard hit.
    let hit = false;
    for (let i = 0; i < colliders.length; i += 1) {
      const c = colliders[i];
      const cx = Math.max(c.minX, Math.min(nx, c.maxX));
      const cz = Math.max(c.minZ, Math.min(nz, c.maxZ));
      const dx = nx - cx;
      const dz = nz - cz;
      if (dx * dx + dz * dz < 1.3 * 1.3) {
        hit = true;
        const d = Math.hypot(dx, dz) || 1;
        nx = cx + (dx / d) * 1.3;
        nz = cz + (dz / d) * 1.3;
        if (Math.abs(this.speed) > 9) this.addDamage(0.08);
        this.speed *= 0.45;
      }
    }
    this.x = nx;
    this.z = nz;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
    // Rolling wheels, brake lights (bright while braking) and smoke.
    const spin = (this.speed * dt) / 0.36;
    for (const w of this.mesh.wheels) w.rotation.x += spin;
    if (this.mesh.tailMat) {
      this.mesh.tailMat.color.setHex(throttle < 0 ? 0xff5a4a : 0xd82a2a);
    }
    this.updateSmoke(dt);
    this.updateLights(dt);
    return hit;
  }

  addDamage(amount) {
    this.damage = clamp(this.damage + amount, 0, 1);
  }

  // Damaged cars puff grey smoke from the bonnet, faster as damage grows.
  updateSmoke(dt) {
    this.smokeTimer -= dt;
    const smoking = this.damage > 0.25;
    for (const puff of this.mesh.smoke) {
      if (!smoking) { puff.visible = false; continue; }
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.35 - this.damage * 0.2;
        puff.visible = true;
        puff.position.set((Math.random() - 0.5) * 0.8, 1.1, 1.6);
        puff.scale.setScalar(0.6 + Math.random() * 0.5);
      }
      if (puff.visible) {
        puff.position.y += dt * 1.4;
        puff.scale.multiplyScalar(1 + dt * 0.8);
        if (puff.position.y > 3.2) puff.visible = false;
      }
    }
  }

  // Police light bar alternates red / blue twice a second.
  updateLights(dt) {
    if (!this.police || !this.mesh.lightR) return;
    this.flashTimer += dt;
    const on = Math.floor(this.flashTimer * 2) % 2 === 0;
    this.mesh.lightR.material.color.setHex(on ? COLORS.policeLightR : 0x330000);
    this.mesh.lightB.material.color.setHex(on ? 0x000033 : COLORS.policeLightB);
  }

  remove(scene) {
    scene.remove(this.group);
    this.dead = true;
  }
}
