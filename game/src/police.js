// Solmar Bay — wanted level and police.
// Stars rise on crimes (stealing, shooting, hitting pedestrians, killing
// officers) and fall when the player stays hidden and quiet. Police cars
// chase and ram; on foot, officers chase and punch. At 3+ stars, roadblocks
// appear ahead of the player. Getting caught costs cash; getting wasted
// costs more.

import { TUNE, WORLD, clamp, dist2 } from './config.js';
import { Car } from './cars.js';

const T = window.THREE;

function makeOfficerMesh() {
  const group = new T.Group();
  const navy = new T.MeshLambertMaterial({ color: 0x1a2a4a });
  const skin = new T.MeshLambertMaterial({ color: 0xe8b88a });
  for (const s of [-1, 1]) {
    const leg = new T.Mesh(new T.BoxGeometry(0.16, 0.8, 0.16), navy);
    leg.position.set(s * 0.12, 0.4, 0);
    group.add(leg);
  }
  const torso = new T.Mesh(new T.BoxGeometry(0.58, 0.72, 0.32), navy);
  torso.position.y = 1.16;
  torso.castShadow = true;
  group.add(torso);
  // Badge: a small gold square on the chest.
  const badge = new T.Mesh(
    new T.BoxGeometry(0.1, 0.1, 0.02),
    new T.MeshBasicMaterial({ color: 0xffd832 }),
  );
  badge.position.set(-0.14, 1.3, 0.17);
  group.add(badge);
  const head = new T.Mesh(new T.SphereGeometry(0.24, 8, 6), skin);
  head.position.y = 1.76;
  group.add(head);
  const cap = new T.Mesh(
    new T.CylinderGeometry(0.26, 0.26, 0.1, 8),
    new T.MeshLambertMaterial({ color: 0x0a1428 }),
  );
  cap.position.y = 1.95;
  group.add(cap);
  return group;
}

export class Police {
  constructor(scene, rng, colliders, game) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.game = game;
    this.cars = [];
    this.officers = [];
    this.roadblocks = [];
    this.roadblockTimer = 0;
    this.bustTimer = 0; // time a cop has been touching the player
  }

  // A crime was committed: raise the wanted level (max 5) and reset the
  // decay clock. Returns the new level.
  addWanted(n) {
    const g = this.game;
    g.wanted = clamp(g.wanted + n, 0, 5);
    g.lastCrimeAt = g.time;
    return g.wanted;
  }

  // Per-frame: spawn/despawn police to match stars, chase, roadblocks,
  // decay when hidden, and check for busted.
  update(dt) {
    const g = this.game;
    const px = g.player.x;
    const pz = g.player.z;

    // --- Spawn police cars to match the wanted level (1 per star). -------
    while (this.cars.length < g.wanted) {
      const angle = this.rng.range(0, Math.PI * 2);
      const x = clamp(px + Math.cos(angle) * 55, -260, 260);
      const z = clamp(pz + Math.sin(angle) * 55, -260, 260);
      const car = new Car(this.scene, this.rng, x, z, Math.atan2(px - x, pz - z), true);
      car.cruise = 13;
      this.cars.push(car);
    }
    while (this.cars.length > g.wanted) {
      const car = this.cars.pop();
      car.remove(this.scene);
    }

    // --- Foot officers when the player is on foot and wanted >= 2. -------
    const wantOfficers = (!g.player.inCar && g.wanted >= 2) ? Math.min(g.wanted - 1, 3) : 0;
    while (this.officers.length < wantOfficers) {
      const angle = this.rng.range(0, Math.PI * 2);
      const mesh = makeOfficerMesh();
      const x = clamp(px + Math.cos(angle) * 26, -260, 260);
      const z = clamp(pz + Math.sin(angle) * 26, -260, 260);
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      this.officers.push({ mesh, x, z, heading: 0, hp: 100, punchTimer: 0 });
    }
    while (this.officers.length > wantOfficers) {
      const o = this.officers.pop();
      this.scene.remove(o.mesh);
    }

    // --- Chase: police cars steer at the player and ram. ------------------
    let nearestPolice = null;
    for (const car of this.cars) {
      const d = dist2(car.x, car.z, px, pz);
      if (nearestPolice === null || d < nearestPolice) nearestPolice = d;
      const want = Math.atan2(px - car.x, pz - car.z);
      let diff = want - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = clamp(diff * 1.6, -1, 1);
      const throttle = clamp((16 - car.speed) / 5, 0, 1);
      car.drive(dt, throttle, steer, this.colliders);
      // Ram: if the police car touches the player's car, shove + damage.
      if (g.player.inCar && g.player.car && d < 3.4) {
        g.player.car.addDamage(0.02 * dt * 60);
        g.player.car.speed *= 1 - 0.6 * dt;
        if (Math.abs(g.player.car.speed) > 6) g.shake(0.25);
      }
      // Busted on foot: a police car right on top of the player.
      if (!g.player.inCar && d < 2.6) this.bustTimer += dt;
    }

    // --- Officers chase on foot and punch when close. ----------------------
    for (const o of this.officers) {
      const d = dist2(o.x, o.z, px, pz);
      const want = Math.atan2(px - o.x, pz - o.z);
      let diff = want - o.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      o.heading += clamp(diff, -3 * dt, 3 * dt);
      const speed = 5.4;
      // Close in — but stop at arm's length and hold the player there:
      // walking through the player would break the bust contact.
      if (d > 1.2) {
        o.x += Math.sin(o.heading) * speed * dt;
        o.z += Math.cos(o.heading) * speed * dt;
      }
      o.mesh.position.set(o.x, 0, o.z);
      o.mesh.rotation.y = o.heading;
      o.punchTimer -= dt;
      if (d < 1.6) {
        this.bustTimer += dt;
        if (o.punchTimer <= 0) {
          o.punchTimer = 0.9;
          g.damagePlayer(8, 'officer');
        }
      }
    }

    // --- Roadblocks at 3+ stars: two parked police cars across the road. ---
    this.roadblockTimer -= dt;
    if (g.wanted >= 3 && this.roadblockTimer <= 0 && this.roadblocks.length < 2) {
      this.roadblockTimer = 14;
      const ahead = g.player.inCar ? 46 : 30;
      const hx = Math.sin(g.player.heading);
      const hz = Math.cos(g.player.heading);
      const bx = clamp(px + hx * ahead, -250, 250);
      const bz = clamp(pz + hz * ahead, -250, 250);
      // Snap the block to the nearest road centreline so it sits on a road.
      const roadX = Math.round(bx / WORLD.PITCH) * WORLD.PITCH;
      const roadZ = Math.round(bz / WORLD.PITCH) * WORLD.PITCH;
      const useX = Math.abs(bx - roadX) < Math.abs(bz - roadZ);
      const cx = useX ? roadX : bx;
      const cz = useX ? bz : roadZ;
      const blockCars = [];
      for (const off of [-4, 4]) {
        const car = new Car(this.scene, this.rng,
          useX ? cx + off : cx, useX ? cz : cz + off,
          useX ? Math.PI / 2 : 0, true);
        blockCars.push(car);
      }
      this.roadblocks.push({ cars: blockCars, x: cx, z: cz, life: 22 });
    }
    for (let i = this.roadblocks.length - 1; i >= 0; i -= 1) {
      const rb = this.roadblocks[i];
      rb.life -= dt;
      if (rb.life <= 0) {
        for (const car of rb.cars) car.remove(this.scene);
        this.roadblocks.splice(i, 1);
      }
    }

    // --- Wanted decay: quiet + hidden for a while loses a star. -----------
    const quietFor = g.time - g.lastCrimeAt;
    const nearest = nearestPolice == null ? 999 : nearestPolice;
    if (g.wanted > 0 && quietFor > TUNE.wantedDecayDelay && nearest > TUNE.wantedSightRange) {
      g.decayTimer += dt;
      if (g.decayTimer >= TUNE.wantedDecayStep) {
        g.decayTimer = 0;
        g.wanted -= 1;
      }
    } else {
      g.decayTimer = 0;
    }

    // --- Busted: a cop held contact for 1.5 s. ----------------------------
    // Contact decays fast when every cop is far away, so a near-miss does
    // not linger into a bust minutes later.
    const anyClose = (nearestPolice != null && nearestPolice <= 4)
      || this.officers.some((o) => dist2(o.x, o.z, px, pz) <= 2);
    if (!anyClose) this.bustTimer = 0;
    if (this.bustTimer > 1.5) {
      this.bustTimer = 0;
      g.busted();
    }
    return nearestPolice;
  }

  clearAll() {
    for (const car of this.cars) car.remove(this.scene);
    this.cars = [];
    for (const o of this.officers) this.scene.remove(o.mesh);
    this.officers = [];
    for (const rb of this.roadblocks) for (const car of rb.cars) car.remove(this.scene);
    this.roadblocks = [];
    this.bustTimer = 0;
  }
}
