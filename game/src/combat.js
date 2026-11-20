// Combat: fists and a pistol. The pistol is hitscan — a ray from the camera
// through the crosshair — with a muzzle flash, a 12-round magazine, a 48-round
// reserve and a 1.2 s reload. Fists are short range with a knockback shove.
// Shooting raises the heat and clears the block: pedestrians flee, and anyone
// hit hard enough goes down.
const THREE = window.THREE;
import { COMBAT } from './config.js';
import { knockDownPed, scarePeds } from './peds.js';
import { addWanted } from './police.js';
import { enemyDown } from './missions.js';

export function createCombat(G, scene) {
  // Muzzle flash: a bright sprite at the barrel, shown for one frame in ten.
  // Double-sided so it reads from the chase camera behind the player.
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), flashMat);
  flash.rotation.z = Math.PI / 4; // a diamond reads as a flash, not a billboard
  flash.visible = false;
  scene.add(flash);
  const flashLight = new THREE.PointLight(0xffc93c, 0, 14);
  scene.add(flashLight);
  // The player's pistol: a small dark box in the right hand when drawn.
  const pistol = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.14, 0.42),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  pistol.visible = false;
  scene.add(pistol);
  return {
    mag: COMBAT.magSize,
    reserve: COMBAT.reserveMax,
    reloading: 0,
    weapon: 'fists',
    flashTimer: 0,
    flash, flashLight, pistol,
    cooldown: 0,
    raycaster: new THREE.Raycaster(),
  };
}

function hitTargets(G) {
  // Everything a bullet can hit: pedestrians, officers, ambush enemies.
  const targets = [];
  for (const ped of G.peds.peds) if (!ped.down) targets.push({ mesh: ped.mesh, kind: 'ped', ref: ped, radius: 1.1, y: 1.1 });
  for (const off of G.police.officers) targets.push({ mesh: off.mesh, kind: 'officer', ref: off, radius: 1.1, y: 1.1 });
  for (const en of G.combat.enemies) if (en.hp > 0) targets.push({ mesh: en.mesh, kind: 'enemy', ref: en, radius: 1.1, y: 1.1 });
  return targets;
}

export function shootPistol(G) {
  const C = G.combat;
  if (C.reloading > 0 || C.cooldown > 0 || C.weapon !== 'pistol') return false;
  if (C.mag <= 0) {
    G.audio.click();
    C.cooldown = 0.25;
    return false;
  }
  C.mag -= 1;
  C.cooldown = 0.22;
  C.flashTimer = 0.07;
  G.audio.shot();
  G.stats.shotsFired += 1;
  // Aim like a third-person shooter: take the crosshair's line of sight
  // (the camera's forward ray), pick the point 30 m out on it, and fire
  // from the player's gun toward that point. A ray straight out of the
  // high chase camera passes over heads at close range; this one does not.
  const camDir = new THREE.Vector3();
  G.camera.getWorldDirection(camDir);
  const aimPoint = G.camera.position.clone().add(camDir.multiplyScalar(30));
  const origin = new THREE.Vector3(G.player.x, 1.4, G.player.z);
  const dir = aimPoint.sub(origin).normalize();
  C.raycaster.set(origin, dir);
  C.raycaster.far = COMBAT.shotRange;
  let best = null;
  let bestDist = COMBAT.shotRange;
  for (const t of hitTargets(G)) {
    const centre = new THREE.Vector3(t.ref.x, t.y, t.ref.z);
    const toTarget = centre.clone().sub(C.raycaster.ray.origin);
    const along = toTarget.dot(C.raycaster.ray.direction);
    if (along < 0 || along > bestDist) continue;
    const closest = C.raycaster.ray.origin.clone().add(C.raycaster.ray.direction.clone().multiplyScalar(along));
    if (closest.distanceTo(centre) < t.radius && along < bestDist) {
      best = t;
      bestDist = along;
    }
  }
  // Muzzle flash sits at the player's hand, facing the camera.
  const hand = new THREE.Vector3(G.player.x, 1.4, G.player.z);
  C.flash.position.copy(hand).add(new THREE.Vector3(Math.cos(G.player.angle), 0, Math.sin(G.player.angle)).multiplyScalar(0.9));
  C.flash.visible = true;
  C.flashLight.position.copy(C.flash.position);
  C.flashLight.intensity = 6;
  if (best) {
    G.stats.hits += 1;
    if (best.kind === 'ped') {
      knockDownPed(G, best.ref);
      G.stats.pedsHit += 1;
    } else if (best.kind === 'officer') {
      best.ref.hp -= 1;
      if (best.ref.hp <= 0) {
        best.ref.mesh.visible = false;
        best.ref.x = 1e6; // off the map; the police step removes it
        addWanted(G, 1);
      }
    } else if (best.kind === 'enemy') {
      best.ref.hp -= 1;
      if (best.ref.hp <= 0) {
        best.ref.mesh.visible = false;
        best.ref.x = 1e6;
        enemyDown(G);
      }
    }
  }
  // Gunfire raises the heat (throttled) and scares the block.
  if (G.police.crimeCooldown <= 0) {
    addWanted(G, 1);
    G.police.crimeCooldown = 3;
  }
  scarePeds(G, G.player.x, G.player.z, 35);
  return true;
}

export function punch(G) {
  const C = G.combat;
  if (C.cooldown > 0 || C.weapon !== 'fists') return false;
  C.cooldown = 0.35;
  G.audio.punch();
  const fx = Math.cos(G.player.angle);
  const fz = Math.sin(G.player.angle);
  for (const t of hitTargets(G)) {
    const dx = t.ref.x - G.player.x;
    const dz = t.ref.z - G.player.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    const facing = (dx * fx + dz * fz) / (d || 1);
    if (d < COMBAT.punchRange && facing > 0.5) {
      if (t.kind === 'ped') knockDownPed(G, t.ref);
      else if (t.kind === 'officer') {
        t.ref.hp -= 1;
        t.ref.x += fx * 2;
        t.ref.z += fz * 2;
        if (t.ref.hp <= 0) {
          t.ref.mesh.visible = false;
          t.ref.x = 1e6;
        }
      } else if (t.kind === 'enemy') {
        t.ref.hp -= 1;
        if (t.ref.hp <= 0) {
          t.ref.mesh.visible = false;
          t.ref.x = 1e6;
          enemyDown(G);
        }
      }
      return true;
    }
  }
  return false;
}

export function reloadPistol(G) {
  const C = G.combat;
  if (C.weapon !== 'pistol' || C.reloading > 0 || C.mag === COMBAT.magSize || C.reserve === 0) return;
  C.reloading = COMBAT.reloadTime;
  G.audio.reload();
}

export function stepCombat(G, dt) {
  const C = G.combat;
  if (C.cooldown > 0) C.cooldown -= dt;
  if (C.reloading > 0) {
    C.reloading -= dt;
    if (C.reloading <= 0) {
      const need = COMBAT.magSize - C.mag;
      const take = Math.min(need, C.reserve);
      C.mag += take;
      C.reserve -= take;
    }
  }
  if (C.flashTimer > 0) {
    C.flashTimer -= dt;
    if (C.flashTimer <= 0) {
      C.flash.visible = false;
      C.flashLight.intensity = 0;
    }
  }
  // The pistol rides in the player's right hand when drawn.
  C.pistol.visible = G.combat.weapon === 'pistol' && !G.inCar;
  if (C.pistol.visible) {
    const a = G.player.angle;
    C.pistol.position.set(
      G.player.x + Math.cos(a) * 0.45 - Math.sin(a) * 0.3,
      1.25,
      G.player.z + Math.sin(a) * 0.45 + Math.cos(a) * 0.3,
    );
    C.pistol.rotation.y = -a;
  }
}

/** Ambush enemies for mission 4: armed men who shoot back (slowly). */
export function spawnEnemy(G, scene, x, z) {
  const group = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a1a1a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.34), dark);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.72;
  group.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.42), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gun.position.set(0.35, 1.1, 0.3);
  group.add(gun);
  group.position.set(x, 0, z);
  scene.add(group);
  const enemy = { mesh: group, x, z, angle: 0, hp: 3, shootTimer: 1.5, walkPhase: 0 };
  G.combat.enemies.push(enemy);
  return enemy;
}

export function stepEnemies(G, dt) {
  for (const en of G.combat.enemies) {
    if (en.hp <= 0) continue;
    const dx = G.player.x - en.x;
    const dz = G.player.z - en.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    en.angle = Math.atan2(dz, dx);
    if (dist > 12) {
      en.x += Math.cos(en.angle) * 4.5 * dt;
      en.z += Math.sin(en.angle) * 4.5 * dt;
    }
    en.shootTimer -= dt;
    if (en.shootTimer <= 0 && dist < 40) {
      en.shootTimer = 1.6;
      // A wild shot: it can hit the player.
      if (G.rng.chance(0.45)) {
        G.player.health = Math.max(0, G.player.health - 9);
        G.hud.damageFlash();
        G.audio.enemyShot();
      } else {
        G.audio.enemyShot();
      }
    }
    en.mesh.position.set(en.x, 0, en.z);
    en.mesh.rotation.y = -en.angle + Math.PI / 2;
  }
}
