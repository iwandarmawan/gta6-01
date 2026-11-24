// The law: PD interceptors that chase the player when wanted, and a police
// helicopter with a spotlight at four stars and above. Wanted decays when the
// player stays clean and out of sight; getting caught costs a fine.
const THREE = window.THREE;

import { makeVehicle, spinWheels, flashLightBar } from './cars.js';
import { WANTED } from './config.js';

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.units = [];
    this.heli = null;
    this.bustTimer = 0;
    this.decayTimer = 0;
    this.damageCooldown = 0;
  }

  // Match the number of interceptors on the road to the wanted level.
  setWanted(n, px, pz) {
    while (this.units.length < Math.min(n, 4)) {
      const v = makeVehicle('interceptor');
      v.hp = 100;
      v.disabled = false;
      const a = (this.units.length / 4) * Math.PI * 2;
      v.group.position.set(px + Math.cos(a) * 40, 0, pz + Math.sin(a) * 40);
      this.scene.add(v.group);
      this.units.push({ v, heading: 0, speed: 0, hitCooldown: 0 });
    }
    while (this.units.length > Math.min(n, 4)) {
      const u = this.units.pop();
      this.scene.remove(u.v.group);
    }
    if (n >= 4 && !this.heli) this.spawnHeli(px, pz);
    if (n < 4 && this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
  }

  spawnHeli(px, pz) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 5), new THREE.MeshLambertMaterial({ color: 0x1a1a22 }));
    body.position.y = 0;
    group.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4), new THREE.MeshLambertMaterial({ color: 0x1a1a22 }));
    tail.position.set(0, 0.2, -4);
    group.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x333338 }));
    rotor.position.y = 0.9;
    group.add(rotor);
    const search = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2c8 }));
    search.position.set(0, -0.9, 1.5);
    group.add(search);
    // Spotlight cone, apex at the helicopter, opening on the ground below.
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(5, 26, 14, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    beam.position.y = -13.5;
    group.add(beam);
    group.position.set(px + 10, 26, pz + 10);
    this.scene.add(group);
    this.heli = { group, rotor, beam };
  }

  update(dt, t, G) {
    const p = G.player;
    this.damageCooldown = Math.max(0, this.damageCooldown - dt);
    const px = p.pos.x;
    const pz = p.pos.z;

    for (const u of this.units) {
      const pos = u.v.group.position;
      const dx = px - pos.x;
      const dz = pz - pos.z;
      const dist = Math.hypot(dx, dz);
      if (u.v.disabled) {
        flashLightBar(u.v, t * 0.2);
        continue;
      }
      const want = Math.atan2(dx, dz);
      let dh = want - u.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      u.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      u.speed = Math.min(34, u.speed + 16 * dt);
      pos.x += Math.sin(u.heading) * u.speed * dt;
      pos.z += Math.cos(u.heading) * u.speed * dt;
      u.v.group.rotation.y = u.heading;
      spinWheels(u.v, dt, u.speed);
      flashLightBar(u.v, t);
      // Ram damage, once a second at most.
      if (dist < 4 && this.damageCooldown <= 0) {
        G.damagePlayer(6, 'rammed by the police');
        this.damageCooldown = 1;
      }
      // Bust: caught at low speed, up close.
      if (dist < 4.5 && p.speed < 3) this.bustTimer += dt;
      else this.bustTimer = Math.max(0, this.bustTimer - dt * 2);
    }
    if (this.bustTimer > 3) {
      this.bustTimer = 0;
      G.busted();
    }

    if (this.heli) {
      const h = this.heli;
      h.group.position.x += (px + 8 - h.group.position.x) * Math.min(1, dt * 1.5);
      h.group.position.z += (pz + 8 - h.group.position.z) * Math.min(1, dt * 1.5);
      h.group.position.y = 26 + Math.sin(t * 0.8) * 1.5;
      h.rotor.rotation.y = t * 30;
      h.group.rotation.y = Math.atan2(px - h.group.position.x, pz - h.group.position.z);
    }

    // Wanted decays after a clean stretch with no police nearby.
    if (p.wanted > 0) {
      const nearest = this.units.reduce((m, u) => {
        const d = Math.hypot(u.v.group.position.x - px, u.v.group.position.z - pz);
        return Math.min(m, d);
      }, 999);
      if (nearest > 60) {
        this.decayTimer += dt;
        if (this.decayTimer > WANTED.decaySeconds) {
          this.decayTimer = 0;
          p.wanted = Math.max(0, p.wanted - 1);
          this.setWanted(p.wanted, px, pz);
        }
      } else {
        this.decayTimer = 0;
      }
    }
  }

  // Police units and peds as raycast targets for shooting.
  targets() {
    const out = [];
    for (const u of this.units) {
      if (u.v.disabled) continue;
      out.push({ x: u.v.group.position.x, z: u.v.group.position.z, r: 2, kind: 'cop', unit: u });
    }
    return out;
  }
}
