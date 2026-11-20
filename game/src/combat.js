// combat.js — Solmar Bay fighting: fists and a pistol, hitscan shots,
// muzzle flash, tracers, and the thugs who shoot back. Rico starts with
// his fists; Delgado hands him a pistol when the jobs get loud.
(function (global) {
  'use strict';

  const PISTOL_RANGE = 60;
  const PISTOL_DAMAGE = 34;
  const PISTOL_COOLDOWN = 0.32;
  const PISTOL_MAG = 12;
  const PUNCH_RANGE = 2.6;
  const PUNCH_DAMAGE = 25;
  const PUNCH_COOLDOWN = 0.5;
  const RELOAD_TIME = 1.2;
  const THUG_HP = 100;
  const THUG_SHOT_DAMAGE = 7;
  const THUG_SHOT_EVERY = 1.7;
  const THUG_RANGE = 26;

  function makeCombat(scene) {
    // A flat glowing quad for the muzzle flash and a line for the tracer.
    // Both live in the scene, hidden until a shot fires.
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd94a, transparent: true, opacity: 0.95, side: THREE.DoubleSide,
    });
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), flashMat);
    flash.visible = false;
    scene.add(flash);
    const tracerGeo = new THREE.BufferGeometry();
    tracerGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({
      color: 0xffe9a0, transparent: true, opacity: 0,
    }));
    tracer.visible = false;
    scene.add(tracer);
    return {
      scene: scene,
      weapon: 'fists',
      ammo: 0,
      reserve: 0,
      reloadT: 0,
      attackT: 0,
      flashT: 0,
      flash: flash,
      tracer: tracer,
      tracerT: 0,
      hitmarkT: 0,
      kills: 0,
    };
  }

  // Bolt a small pistol onto the player's right hand. The gun points along
  // the arm, so it aims where Rico faces.
  function attachGun(player) {
    if (player.mesh.userData.gun) return;
    const gun = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.42), dark);
    barrel.position.set(0, -0.05, 0.22);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.12), dark);
    grip.position.set(0, -0.18, -0.02);
    gun.add(barrel);
    gun.add(grip);
    gun.position.set(0, -0.28, 0.1);
    player.mesh.userData.armR.add(gun);
    player.mesh.userData.gun = gun;
  }

  function grantPistol(combat, player) {
    attachGun(player);
    combat.weapon = 'pistol';
    if (combat.ammo <= 0) combat.ammo = PISTOL_MAG;
    if (combat.reserve <= 0) combat.reserve = 48;
  }

  function setWeapon(combat, player, name) {
    if (name === 'pistol') {
      grantPistol(combat, player);
    } else {
      combat.weapon = 'fists';
      if (player.mesh.userData.gun) player.mesh.userData.gun.visible = false;
    }
    if (name === 'pistol' && player.mesh.userData.gun) player.mesh.userData.gun.visible = true;
  }

  // Where a shot goes: straight ahead of the camera on foot. The player
  // turns to face the shot, so the mesh and the bullet agree.
  function aimDir(world) {
    return { x: Math.sin(world.camYaw), z: Math.cos(world.camYaw) };
  }

  function gunTip(world) {
    const d = aimDir(world);
    return {
      x: world.player.x + d.x * 0.9,
      y: 1.35,
      z: world.player.z + d.z * 0.9,
      dx: d.x,
      dz: d.z,
    };
  }

  // The nearest thing a bullet can hit: a thug first, then a pedestrian,
  // anything inside a narrow cone ahead of the muzzle and within range.
  function pickTarget(world, tip, range) {
    let best = null;
    let bestD = range;
    const consider = function (x, z, kind, ref) {
      const dx = x - tip.x;
      const dz = z - tip.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1 || d > bestD) return;
      const along = (dx * tip.dx + dz * tip.dz) / d;
      if (along < 0.92) return; // outside the firing cone
      bestD = d;
      best = { kind: kind, ref: ref, dist: d, x: x, z: z };
    };
    for (const t of world.thugs) if (!t.dead) consider(t.x, t.z, 'thug', t);
    for (const p of world.pedestrians) consider(p.x, p.z, 'ped', p);
    return best;
  }

  function showTracer(combat, tip, end) {
    const pos = combat.tracer.geometry.attributes.position;
    pos.setXYZ(0, tip.x, tip.y, tip.z);
    pos.setXYZ(1, end.x, end.y, end.z);
    pos.needsUpdate = true;
    combat.tracer.visible = true;
    combat.tracer.material.opacity = 0.9;
    combat.tracerT = 0.09;
  }

  function showFlash(combat, tip) {
    combat.flash.position.set(tip.x, tip.y, tip.z);
    combat.flash.rotation.y = Math.atan2(tip.dx, tip.dz);
    combat.flash.visible = true;
    combat.flash.material.opacity = 0.95;
    combat.flashT = 0.07;
  }

  function fireShot(combat, world) {
    const player = world.player;
    if (combat.ammo <= 0) {
      VP.reloadSound(world.audio);
      return 'empty';
    }
    combat.ammo--;
    combat.attackT = PISTOL_COOLDOWN;
    player.heading = world.camYaw; // Rico turns to face the shot
    player.aimT = 0.4; // the gun arm rises to aim
    const tip = gunTip(world);
    showFlash(combat, tip);
    VP.shot(world.audio);
    VP.addHeat(world.wanted, 2); // a gunshot in public draws the law
    world.lastHeatT = world.time;
    // Pedestrians near the shot run for cover.
    world.gunshotThreat = { x: player.x, z: player.z, until: world.time + 1.5 };
    const target = pickTarget(world, tip, PISTOL_RANGE);
    if (!target) {
      showTracer(combat, tip, { x: tip.x + tip.dx * PISTOL_RANGE, y: 1.2, z: tip.z + tip.dz * PISTOL_RANGE });
      return 'miss';
    }
    showTracer(combat, tip, { x: target.x, y: 1.2, z: target.z });
    combat.hitmarkT = 0.4;
    if (target.kind === 'thug') {
      hurtThug(target.ref, PISTOL_DAMAGE, world);
      return 'hit-thug';
    }
    // A bullet that finds a pedestrian is a crime: they flee, heat jumps.
    target.ref.fleeT = 5;
    target.ref.targetX = target.ref.x + (target.ref.x - player.x) * 2;
    target.ref.targetZ = target.ref.z + (target.ref.z - player.z) * 2;
    VP.addHeat(world.wanted, 20);
    world.lastHeatT = world.time;
    return 'hit-ped';
  }

  function punch(combat, world) {
    const player = world.player;
    combat.attackT = PUNCH_COOLDOWN;
    player.heading = world.camYaw;
    player.punchT = 0.25; // the fist swings forward
    VP.thud(world.audio);
    // A punch reaches anything close and roughly in front of Rico.
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    let hit = null;
    for (const t of world.thugs) {
      if (t.dead) continue;
      const dx = t.x - player.x;
      const dz = t.z - player.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < PUNCH_RANGE && (dx * fx + dz * fz) / d > 0.5) { hit = t; break; }
    }
    if (hit) {
      hurtThug(hit, PUNCH_DAMAGE, world);
      combat.hitmarkT = 0.3;
      return 'hit-thug';
    }
    for (const p of world.pedestrians) {
      const dx = p.x - player.x;
      const dz = p.z - player.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < PUNCH_RANGE && d > 0.01 && (dx * fx + dz * fz) / d > 0.5) {
        p.fleeT = 5;
        p.targetX = p.x + (dx / d) * 30;
        p.targetZ = p.z + (dz / d) * 30;
        VP.addHeat(world.wanted, 10);
        world.lastHeatT = world.time;
        return 'hit-ped';
      }
    }
    return 'miss';
  }

  // One attack press: pistol fires, fists swing. Driving, pausing and
  // reloading all block it.
  function attackPressed(combat, world) {
    if (world.player.inCar || world.state !== 'playing') return 'blocked';
    if (combat.reloadT > 0 || combat.attackT > 0) return 'cooling';
    if (combat.weapon === 'pistol') return fireShot(combat, world);
    return punch(combat, world);
  }

  function startReload(combat, world) {
    if (combat.weapon !== 'pistol') return false;
    if (combat.reloadT > 0 || combat.ammo >= PISTOL_MAG || combat.reserve <= 0) return false;
    combat.reloadT = RELOAD_TIME;
    VP.reloadSound(world.audio);
    return true;
  }

  function updateCombat(combat, world, dt) {
    if (combat.attackT > 0) combat.attackT -= dt;
    if (combat.hitmarkT > 0) combat.hitmarkT -= dt;
    if (combat.reloadT > 0) {
      combat.reloadT -= dt;
      if (combat.reloadT <= 0) {
        const need = PISTOL_MAG - combat.ammo;
        const take = Math.min(need, combat.reserve);
        combat.ammo += take;
        combat.reserve -= take;
      }
    }
    if (combat.flashT > 0) {
      combat.flashT -= dt;
      combat.flash.material.opacity = Math.max(0, combat.flashT / 0.07) * 0.95;
      combat.flash.rotation.z += dt * 9; // the flash spins as it dies
      if (combat.flashT <= 0) combat.flash.visible = false;
    }
    if (combat.tracerT > 0) {
      combat.tracerT -= dt;
      combat.tracer.material.opacity = Math.max(0, combat.tracerT / 0.09) * 0.9;
      if (combat.tracerT <= 0) combat.tracer.visible = false;
    }
    // The gunshot scare fades; pedestrians stop running from an old shot.
    if (world.gunshotThreat && world.time > world.gunshotThreat.until) world.gunshotThreat = null;
  }

  // --- thugs ---------------------------------------------------------------
  // A thug is a pedestrian-shaped figure in a dark jacket with a red
  // bandana and a gun in hand. They stand their ground, close in slowly
  // and shoot at Rico when he is in range.
  function makeThugMesh() {
    const g = new THREE.Group();
    const jacket = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
    const skin = new THREE.MeshLambertMaterial({ color: 0xb97a4a });
    const red = new THREE.MeshLambertMaterial({ color: 0xc0392b });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.7, 0.32), jacket);
    body.position.y = 1.05;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skin);
    head.position.y = 1.58;
    head.castShadow = true;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.44), red);
    band.position.y = 1.66;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), jacket);
    legL.position.set(-0.14, 0.36, 0);
    const legR = legL.clone();
    legR.position.x = 0.14;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), jacket);
    armL.position.set(-0.37, 1.05, 0);
    const armR = armL.clone();
    armR.position.x = 0.37;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.37, 0.82, 0.25);
    g.add(body);
    g.add(head);
    g.add(band);
    g.add(legL);
    g.add(legR);
    g.add(armL);
    g.add(armR);
    g.add(gun);
    g.userData.legL = legL;
    g.userData.legR = legR;
    g.userData.gun = gun;
    return g;
  }

  function makeThug(scene, x, z) {
    const mesh = makeThugMesh();
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    return {
      mesh: mesh,
      x: x,
      z: z,
      heading: 0,
      hp: THUG_HP,
      shootT: 1 + Math.random() * 0.8,
      dead: false,
      deadT: 0,
      walkPhase: 0,
    };
  }

  function hurtThug(thug, dmg, world) {
    if (thug.dead) return;
    thug.hp -= dmg;
    if (thug.hp <= 0) {
      thug.dead = true;
      thug.deadT = 0;
      thug.mesh.rotation.x = -Math.PI / 2; // falls flat on his back
      thug.mesh.position.y = 0.25;
      if (world.combat) world.combat.kills++;
      VP.addHeat(world.wanted, 12); // killing in public draws the law
      world.lastHeatT = world.time;
    }
  }

  function thugsAlive(thugs) {
    let n = 0;
    for (const t of thugs) if (!t.dead) n++;
    return n;
  }

  // A live thug closes in to shooting range and fires on a timer. Dead
  // ones lie still for a while, then the city cleans them up. In a staged
  // screenshot the thugs hold their pose and never shoot.
  function updateThug(thug, world, dt) {
    if (thug.dead) {
      thug.deadT += dt;
      if (thug.deadT > 12) {
        thug.mesh.parent.remove(thug.mesh);
        thug.gone = true;
      }
      return;
    }
    if (world.shotMode) return;
    const player = world.player;
    const dx = player.x - thug.x;
    const dz = player.z - thug.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    thug.heading = Math.atan2(dx, dz);
    thug.mesh.rotation.y = thug.heading;
    if (d > 10 && d < 40) {
      // Close in slowly, walking, gun still in hand.
      thug.x += (dx / d) * 2.3 * dt;
      thug.z += (dz / d) * 2.3 * dt;
      thug.walkPhase += dt * 8;
      const swing = Math.sin(thug.walkPhase) * 0.45;
      thug.mesh.userData.legL.rotation.x = swing;
      thug.mesh.userData.legR.rotation.x = -swing;
      thug.mesh.position.set(thug.x, 0, thug.z);
    }
    if (d < THUG_RANGE && !player.inCar) {
      thug.shootT -= dt;
      if (thug.shootT <= 0) {
        thug.shootT = THUG_SHOT_EVERY * (0.85 + Math.random() * 0.3);
        // A hit on Rico: health drops, the vignette flashes red.
        world.health = Math.max(0, world.health - THUG_SHOT_DAMAGE);
        world.hurtFlashT = 0.35;
        VP.shot(world.audio);
        // The shot's flash shows at the thug's gun.
        if (world.combat) {
          world.combat.flash.position.set(thug.x + Math.sin(thug.heading) * 0.8, 1.3, thug.z + Math.cos(thug.heading) * 0.8);
          world.combat.flash.visible = true;
          world.combat.flash.material.opacity = 0.9;
          world.combat.flashT = 0.06;
        }
      }
    }
  }

  global.VP = global.VP || {};
  global.VP.makeCombat = makeCombat;
  global.VP.grantPistol = grantPistol;
  global.VP.setWeapon = setWeapon;
  global.VP.attackPressed = attackPressed;
  global.VP.startReload = startReload;
  global.VP.updateCombat = updateCombat;
  global.VP.makeThug = makeThug;
  global.VP.hurtThug = hurtThug;
  global.VP.thugsAlive = thugsAlive;
  global.VP.updateThug = updateThug;
  global.VP.PISTOL_MAG = PISTOL_MAG;
})(typeof window !== 'undefined' ? window : globalThis);
