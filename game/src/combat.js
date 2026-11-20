// Solmar Bay — combat: fists and a pistol.
// The pistol is hitscan with a visible muzzle flash; the punch is a short
// melee arc. Shooting raises the wanted level and scares nearby peds.
// Thugs (mission 4) are armed too: they shoot back, badly.

import { COLORS, TUNE, clamp, dist2 } from './config.js';

const T = window.THREE;

export class Combat {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.weapon = 'fists'; // 'fists' | 'pistol'
    this.mag = TUNE.pistolMag;
    this.reserve = TUNE.pistolReserve;
    this.reloading = 0;
    this.fireTimer = 0; // pistol rate of fire: one shot per 0.28 s
    this.punchTimer = 0;
    this.punchAnim = 0;
    this.thugs = []; // mission-4 ambushers
    // Muzzle flash: a bright quad + point light at the gun, shown ~70 ms.
    this.flash = new T.Mesh(
      new T.PlaneGeometry(0.9, 0.9),
      new T.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.95, side: T.DoubleSide, depthWrite: false }),
    );
    this.flash.visible = false;
    this.scene.add(this.flash);
    this.flashLight = new T.PointLight(0xffd880, 0, 14);
    this.scene.add(this.flashLight);
    this.flashTimer = 0;
    // The pistol mesh, carried in the player's hand when equipped.
    this.gun = this.makeGunMesh();
    this.gun.visible = false;
    this.scene.add(this.gun);
  }

  makeGunMesh() {
    const gun = new T.Group();
    const dark = new T.MeshLambertMaterial({ color: 0x1a1a1a });
    const barrel = new T.Mesh(new T.BoxGeometry(0.07, 0.09, 0.42), dark);
    barrel.position.set(0, 0, 0.14);
    gun.add(barrel);
    const grip = new T.Mesh(new T.BoxGeometry(0.07, 0.2, 0.1), dark);
    grip.position.set(0, -0.1, -0.04);
    gun.add(grip);
    return gun;
  }

  setWeapon(w) {
    if (w !== 'fists' && w !== 'pistol') return;
    this.weapon = w;
    this.gun.visible = w === 'pistol';
  }

  reload() {
    if (this.weapon !== 'pistol' || this.reloading > 0) return;
    if (this.mag >= TUNE.pistolMag || this.reserve <= 0) return;
    this.reloading = TUNE.pistolReload;
    this.game.audio.blip(300, 500, 0.15, 0.15);
  }

  // Fire the equipped weapon. Returns what (if anything) was hit.
  // No drive-bys: shooting only works on foot.
  fire(origin, dirX, dirZ, dirY = 0) {
    const g = this.game;
    if (g.player.inCar) return null;
    if (this.weapon === 'fists') return this.punch(origin, dirX, dirZ);
    if (this.reloading > 0) return null;
    if (this.fireTimer > 0) return null; // rate of fire: no full-auto hose
    if (this.mag <= 0) {
      this.reload();
      return null;
    }
    this.mag -= 1;
    this.fireTimer = 0.28;
    g.audio.gunshot();
    this.showFlash(origin, dirX, dirZ);
    // Empty mag: reload right away instead of clicking on an empty gun.
    if (this.mag === 0) this.reload();
    // Hitscan: the nearest target along the shot direction, within range.
    const hit = this.raycast(origin, dirX, dirZ, dirY);
    g.police.addWanted(1);
    g.peds.scare(origin.x, origin.z, 30);
    if (hit) {
      if (hit.kind === 'ped') {
        hit.ped.hp -= TUNE.pistolDamage;
        if (hit.ped.hp <= 0) g.peds.kill(hit.ped);
        else g.peds.scare(hit.ped.x, hit.ped.z, 20);
      } else if (hit.kind === 'thug') {
        hit.thug.hp -= TUNE.pistolDamage;
        if (hit.thug.hp <= 0) this.killThug(hit.thug);
      } else if (hit.kind === 'officer') {
        hit.officer.hp -= TUNE.pistolDamage;
        if (hit.officer.hp <= 0) {
          this.game.scene.remove(hit.officer.mesh);
          g.police.officers = g.police.officers.filter((o) => o !== hit.officer);
          g.police.addWanted(1);
        }
      }
    }
    return hit;
  }

  punch(origin, dirX, dirZ) {
    if (this.punchTimer > 0) return null;
    this.punchTimer = TUNE.punchCooldown;
    this.punchAnim = 0.25;
    this.game.audio.punch();
    // Melee arc: the nearest ped / thug / officer in front, within range.
    const targets = [];
    for (const p of this.game.peds.peds) if (!p.dead) targets.push({ kind: 'ped', x: p.x, z: p.z, ref: p });
    for (const t of this.thugs) if (!t.dead) targets.push({ kind: 'thug', x: t.x, z: t.z, ref: t });
    for (const o of this.game.police.officers) targets.push({ kind: 'officer', x: o.x, z: o.z, ref: o });
    let best = null;
    let bestD = TUNE.punchRange;
    for (const t of targets) {
      const d = dist2(origin.x, origin.z, t.x, t.z);
      if (d >= bestD) continue;
      // Must be roughly in front of the player.
      const dot = ((t.x - origin.x) * dirX + (t.z - origin.z) * dirZ) / Math.max(d, 0.01);
      if (dot < 0.5) continue;
      bestD = d;
      best = t;
    }
    if (!best) return null;
    if (best.kind === 'ped') {
      best.ref.hp -= TUNE.punchDamage;
      if (best.ref.hp <= 0) this.game.peds.kill(best.ref);
      else this.game.peds.scare(best.ref.x, best.ref.z, 15);
    } else if (best.kind === 'thug') {
      best.ref.hp -= TUNE.punchDamage;
      if (best.ref.hp <= 0) this.killThug(best.ref);
    } else if (best.kind === 'officer') {
      best.ref.hp -= TUNE.punchDamage;
      if (best.ref.hp <= 0) {
        this.game.scene.remove(best.ref.mesh);
        this.game.police.officers = this.game.police.officers.filter((o) => o !== best.ref);
        this.game.police.addWanted(1);
      }
    }
    return best;
  }

  // Raycast against peds, thugs, officers and police cars, in that order of
  // distance along the ray. Returns {kind, ...} or null.
  raycast(origin, dirX, dirZ, dirY) {
    const g = this.game;
    const range = TUNE.pistolRange;
    let best = null;
    let bestT = range;
    const consider = (x, z, radius, kind, ref) => {
      const dx = x - origin.x;
      const dz = z - origin.z;
      const t = dx * dirX + dz * dirZ;
      if (t < 0 || t > bestT) return;
      const perp = Math.abs(dx * dirZ - dz * dirX);
      if (perp > radius + 0.4) return;
      bestT = t;
      best = { kind, ...ref };
    };
    for (const p of g.peds.peds) if (!p.dead) consider(p.x, p.z, 0.7, 'ped', { ped: p });
    for (const t of this.thugs) if (!t.dead) consider(t.x, t.z, 0.8, 'thug', { thug: t });
    for (const o of g.police.officers) consider(o.x, o.z, 0.7, 'officer', { officer: o });
    for (const car of g.police.cars) consider(car.x, car.z, 2.2, 'policecar', { car });
    if (best && best.kind === 'policecar') {
      best.car.addDamage(0.15);
      return best;
    }
    return best;
  }

  showFlash(origin, dirX, dirZ) {
    // Place the flash quad just ahead of the gun, facing the camera.
    this.flash.position.set(origin.x + dirX * 1.1, 1.45, origin.z + dirZ * 1.1);
    this.flash.lookAt(this.game.camera.position);
    this.flash.visible = true;
    this.flashLight.position.copy(this.flash.position);
    this.flashLight.intensity = 2.2;
    this.flashTimer = 0.07;
  }

  // ---- Thugs (mission 4 ambush) -----------------------------------------
  spawnThugs(x, z, count) {
    for (let i = 0; i < count; i += 1) {
      const group = new T.Group();
      const dark = new T.MeshLambertMaterial({ color: COLORS.thug });
      const torso = new T.Mesh(new T.BoxGeometry(0.58, 0.72, 0.32), dark);
      torso.position.y = 1.16;
      torso.castShadow = true;
      group.add(torso);
      const head = new T.Mesh(
        new T.SphereGeometry(0.24, 8, 6),
        new T.MeshLambertMaterial({ color: 0xc98a5a }),
      );
      head.position.y = 1.76;
      group.add(head);
      const gun = this.makeGunMesh();
      gun.position.set(0.3, 1.25, 0.2);
      group.add(gun);
      const tx = x + (i - 1) * 6;
      const tz = z + 8 + (i % 2) * 4;
      group.position.set(tx, 0, tz);
      this.scene.add(group);
      this.thugs.push({
        mesh: group, x: tx, z: tz, heading: 0, hp: TUNE.thugHp,
        dead: false, shootTimer: 1.2 + i * 0.5, flash: null,
      });
    }
  }

  killThug(t) {
    t.dead = true;
    t.mesh.rotation.x = -Math.PI / 2;
    t.mesh.position.y = 0.25;
  }

  clearThugs() {
    for (const t of this.thugs) this.scene.remove(t.mesh);
    this.thugs = [];
  }

  // Thugs shoot at the player with poor accuracy; a hit costs 7 HP.
  updateThugs(dt) {
    const g = this.game;
    for (const t of this.thugs) {
      if (t.dead) continue;
      const d = dist2(t.x, t.z, g.player.x, g.player.z);
      t.heading = Math.atan2(g.player.x - t.x, g.player.z - t.z);
      t.mesh.rotation.y = t.heading;
      t.shootTimer -= dt;
      if (t.shootTimer <= 0 && d < 45 && !g.player.inCar) {
        t.shootTimer = 1.1 + Math.random() * 0.9;
        g.audio.gunshot();
        // Muzzle flash at the thug's gun.
        this.flash.position.set(t.x + Math.sin(t.heading) * 1, 1.4, t.z + Math.cos(t.heading) * 1);
        this.flash.lookAt(g.camera.position);
        this.flash.visible = true;
        this.flashTimer = 0.06;
        // Poor aim: hits only ~35% of the time at close range.
        if (Math.random() < 0.35) g.damagePlayer(7, 'thug');
      }
    }
  }

  update(dt) {
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = TUNE.pistolMag - this.mag;
        const take = Math.min(need, this.reserve);
        this.mag += take;
        this.reserve -= take;
      }
    }
    if (this.punchTimer > 0) this.punchTimer -= dt;
    if (this.punchAnim > 0) this.punchAnim -= dt;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flash.visible = false;
        this.flashLight.intensity = 0;
      }
    }
    // Keep the gun mesh glued to the player's hand when equipped.
    if (this.gun.visible) {
      const p = this.game.player;
      const hx = Math.sin(p.heading);
      const hz = Math.cos(p.heading);
      this.gun.position.set(p.x + hx * 0.45 + hz * 0.25, 1.25, p.z + hz * 0.45 - hx * 0.25);
      this.gun.rotation.y = p.heading;
    }
    this.updateThugs(dt);
  }
}
