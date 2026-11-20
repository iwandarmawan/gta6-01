// player.js — Rico Vega on foot: third-person walk, run, jump, getting
// in and out of cars, and now fighting: fists up front, a pistol in the
// right hand once Delgado hands it over, and an aim pose when he fires.
// The player is a simple low-poly figure with swinging legs, a collision
// circle and a camera orbit.
(function (global) {
  'use strict';

  function makePlayerMesh() {
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x2e6db4 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.68, 0.3), shirt);
    body.position.y = 1.05;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skin);
    head.position.y = 1.56;
    head.castShadow = true;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    hair.position.y = 1.58;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), pants);
    legL.position.set(-0.14, 0.36, 0);
    const legR = legL.clone();
    legR.position.x = 0.14;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), shirt);
    armL.position.set(-0.36, 1.05, 0);
    const armR = armL.clone();
    armR.position.x = 0.36;
    // Arms hang from a shoulder pivot so the right one can rise to aim.
    armL.geometry.translate(0, 0.3, 0);
    armL.position.set(-0.36, 1.32, 0);
    armR.geometry.translate(0, 0.3, 0);
    armR.position.set(0.36, 1.32, 0);
    g.add(body);
    g.add(head);
    g.add(hair);
    g.add(legL);
    g.add(legR);
    g.add(armL);
    g.add(armR);
    g.userData.legL = legL;
    g.userData.legR = legR;
    g.userData.armL = armL;
    g.userData.armR = armR;
    return g;
  }

  function makePlayer(x, z) {
    const mesh = makePlayerMesh();
    mesh.position.set(x, 0, z);
    return {
      mesh: mesh,
      x: x,
      z: z,
      y: 0, // height above the ground (jumping)
      vy: 0,
      heading: 0,
      speed: 0,
      walkPhase: 0,
      radius: 0.55,
      inCar: null, // the car being driven, or null
      grounded: true,
      // Fighting state: the weapon in hand and the punch/aim animation.
      weapon: 'fists',
      punchT: 0, // seconds left of the punch swing
      aimT: 0, // seconds left of the raised-arm aim pose
    };
  }

  // The right arm rises to point the gun forward for a short beat after
  // every shot; a punch swings it forward hard and fast instead.
  function poseArms(player, dt, moving) {
    const armR = player.mesh.userData.armR;
    const armL = player.mesh.userData.armL;
    if (player.punchT > 0) {
      player.punchT -= dt;
      armR.rotation.x = -1.5 * (player.punchT / 0.25);
      armL.rotation.x = 0.4;
      return;
    }
    if (player.aimT > 0) {
      player.aimT -= dt;
      armR.rotation.x = -1.35; // gun arm level, pointing ahead
      armL.rotation.x = -0.5;
      return;
    }
    if (player.weapon === 'pistol') {
      // At rest the pistol hangs low, muzzle down.
      armR.rotation.x = -0.25;
      armL.rotation.x = moving ? -Math.sin(player.walkPhase) * 0.4 : 0;
      return;
    }
    // Fists: both arms swing with the walk.
    const swing = moving ? Math.sin(player.walkPhase) * 0.55 : 0;
    armL.rotation.x = -swing * 0.7;
    armR.rotation.x = swing * 0.7;
  }

  // Move on foot. input: {forward, strafe, run, jump} in camera space;
  // camYaw is the camera's yaw so W always walks away from the camera.
  function updatePlayer(player, input, camYaw, dt, colliders, bounds) {
    const walkSpeed = input.run ? 7.5 : 3.8;
    // Aiming the pistol slows Rico to a careful walk — no sprinting
    // down a sight line.
    const speed = player.aimT > 0.1 ? Math.min(walkSpeed, 2.4) : walkSpeed;
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);
    // Screen right is forward x up = (-cos yaw, sin yaw): D must step that way.
    const rx = -Math.cos(camYaw);
    const rz = Math.sin(camYaw);
    let mx = fx * input.forward + rx * input.strafe;
    let mz = fz * input.forward + rz * input.strafe;
    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 0.01) {
      mx /= len;
      mz /= len;
      player.speed = speed;
      player.heading = Math.atan2(mx, mz);
    } else {
      player.speed = 0;
    }
    let nx = player.x + mx * player.speed * dt;
    let nz = player.z + mz * player.speed * dt;
    // Collide with buildings as a circle.
    for (const b of colliders) {
      const push = VP.collideCircleAABB(nx, nz, player.radius, b);
      if (push) {
        nx += push.x;
        nz += push.z;
      }
    }
    nx = Math.max(bounds.minX, Math.min(bounds.maxX, nx));
    nz = Math.max(bounds.minZ, Math.min(bounds.maxZ, nz));
    player.x = nx;
    player.z = nz;
    // Jump: simple gravity, land back on the ground plane.
    if (input.jump && player.grounded) {
      player.vy = 6.5;
      player.grounded = false;
    }
    if (!player.grounded) {
      player.vy -= 18 * dt;
      player.y += player.vy * dt;
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        player.grounded = true;
      }
    }
    // Walk cycle: legs swing, body bobs a little, arms follow the pose.
    if (player.speed > 0.1) {
      player.walkPhase += dt * player.speed * 1.9;
      const swing = Math.sin(player.walkPhase) * 0.55;
      player.mesh.userData.legL.rotation.x = swing;
      player.mesh.userData.legR.rotation.x = -swing;
    } else {
      player.mesh.userData.legL.rotation.x *= 0.8;
      player.mesh.userData.legR.rotation.x *= 0.8;
    }
    poseArms(player, dt, player.speed > 0.1);
    player.mesh.position.set(player.x, player.y, player.z);
    // Face the walking direction; ease the turn so it never snaps.
    let dh = player.heading - player.mesh.rotation.y;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    player.mesh.rotation.y += dh * Math.min(1, dt * 12);
  }

  // The nearest drivable car within reach (parked, traffic or the player's).
  function nearestCar(player, cars, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      const dx = car.x - player.x;
      const dz = car.z - player.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  // Step out of a car beside its driver's door.
  function exitCar(player, car) {
    // Step out beside the driver's door (the car's left side).
    const sideX = Math.cos(car.heading);
    const sideZ = -Math.sin(car.heading);
    player.x = car.x + sideX * 2.2;
    player.z = car.z + sideZ * 2.2;
    player.y = 0;
    player.heading = car.heading;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.heading;
    player.mesh.visible = true;
    player.inCar = null;
    return player;
  }

  global.VP = global.VP || {};
  global.VP.makePlayer = makePlayer;
  global.VP.updatePlayer = updatePlayer;
  global.VP.nearestCar = nearestCar;
  global.VP.exitCar = exitCar;
})(typeof window !== 'undefined' ? window : globalThis);
