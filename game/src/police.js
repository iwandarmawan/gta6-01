// police.js — Solmar Bay wanted level: crimes raise stars, police cars
// spawn and chase, roadblocks go up when a job goes loud, and getting
// caught (or wrecked) ends the run. Stars decay when the player stays
// out of sight for a while.
(function (global) {
  'use strict';

  const MAX_WANTED = 5;

  function makeWanted() {
    return {
      stars: 0,
      heat: 0, // 0..100; stars rise as heat crosses thresholds
      hiddenT: 0, // seconds since the player was last seen committing a crime
      bustedT: 0, // seconds a police car has been touching the player
    };
  }

  // Heat thresholds: 20 -> 1 star, 45 -> 2, 70 -> 3, 90 -> 4, 100 -> 5.
  function starsFor(heat) {
    if (heat >= 100) return 5;
    if (heat >= 90) return 4;
    if (heat >= 70) return 3;
    if (heat >= 45) return 2;
    if (heat >= 20) return 1;
    return 0;
  }

  function addHeat(wanted, amount) {
    wanted.heat = Math.min(100, wanted.heat + amount);
    wanted.stars = starsFor(wanted.heat);
    wanted.hiddenT = 0;
  }

  // Heat cools off after 12 quiet seconds — faster when no police car is
  // close enough to see the player, slower while the chase is on.
  function updateWanted(wanted, dt, seen, nearestPolice) {
    if (!seen) {
      wanted.hiddenT += dt;
      if (wanted.hiddenT > 12) {
        const rate = nearestPolice > 60 ? 7 : 4;
        wanted.heat = Math.max(0, wanted.heat - dt * rate);
        wanted.stars = starsFor(wanted.heat);
      }
    } else {
      wanted.hiddenT = 0;
    }
  }

  // How many police cars the current stars call for.
  function policeCount(stars) {
    if (stars <= 0) return 0;
    if (stars === 1) return 1;
    if (stars === 2) return 2;
    if (stars === 3) return 3;
    return 4;
  }

  function makePoliceCar(scene, rng, city, x, z) {
    const car = VP.makeCar('police', 0x111111, x, z, 0);
    const bar = VP.makeLightBar();
    bar.position.set(0, 1.55, -0.2);
    car.mesh.add(bar);
    car.lightBar = bar;
    car.isPolice = true;
    car.speed = 0;
    car.cruise = 30;
    scene.add(car.mesh);
    return car;
  }

  // A police car steers straight at its target and rams it. It has no
  // road following: it cuts across plazas and sidewalks to box the player in.
  function updatePoliceCar(car, targetX, targetZ, dt, colliders, bounds, rng) {
    const dx = targetX - car.x;
    const dz = targetZ - car.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    // Steer toward the player, harder when far away.
    const steer = Math.max(-1, Math.min(1, dh * 1.8));
    // Ease off the gas when very close, so the car rams instead of orbiting.
    const throttle = dist > 6 ? 1 : dist > 2.5 ? 0.5 : 0.15;
    VP.driveCar(car, { throttle: throttle, steer: steer, handbrake: false }, dt, colliders, bounds);
    // Flash the light bar, red and blue alternating.
    const phase = Math.floor(performance.now() / 180) % 2 === 0;
    car.lightBar.userData.red.material.color.setHex(phase ? 0xff2222 : 0x551111);
    car.lightBar.userData.blue.material.color.setHex(phase ? 0x111155 : 0x2244ff);
    return dist;
  }

  // Keep the police roster matched to the wanted level, spawning new cars
  // on a road a little way from the player.
  function syncPolice(scene, police, wanted, rng, city, playerX, playerZ) {
    const want = policeCount(wanted.stars);
    while (police.length < want) {
      const road = rng.pick(city.roads);
      const along = rng.pick([-1, 1]) * rng.range(60, 110);
      const x = playerX + along;
      const z = playerZ + rng.range(-40, 40);
      const clampedX = Math.max(city.bounds.minX + 10, Math.min(city.bounds.maxX - 10, x));
      const clampedZ = Math.max(city.bounds.minZ + 10, Math.min(city.bounds.maxZ - 10, z));
      const car = makePoliceCar(scene, rng, city, clampedX, clampedZ);
      police.push(car);
    }
    while (police.length > want) {
      const car = police.pop();
      scene.remove(car.mesh);
    }
  }

  // --- roadblocks ------------------------------------------------------------
  // A roadblock is two police cruisers parked across the road plus three
  // striped barriers. They do not chase: they sit there, engines running,
  // and the player has to slip around them or smash through.
  function makeRoadblock(scene, x, z, heading) {
    const group = new THREE.Group();
    const cars = [];
    const offsets = [-2.6, 2.6];
    for (const off of offsets) {
      const cx = x + Math.cos(heading) * off;
      const cz = z - Math.sin(heading) * off;
      const car = VP.makeCar('police', 0x111111, cx, cz, heading + Math.PI / 2);
      const bar = VP.makeLightBar();
      bar.position.set(0, 1.55, -0.2);
      car.mesh.add(bar);
      car.lightBar = bar;
      car.isPolice = true;
      car.speed = 0;
      scene.add(car.mesh);
      cars.push(car);
    }
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xff8c1a });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (let i = -1; i <= 1; i++) {
      const barrier = new THREE.Group();
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.25), i % 2 === 0 ? stripeMat : whiteMat);
      beam.position.y = 0.9;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.5), stripeMat);
      legL.position.set(-1.4, 0.45, 0);
      const legR = legL.clone();
      legR.position.x = 1.4;
      barrier.add(beam);
      barrier.add(legL);
      barrier.add(legR);
      barrier.position.set(x + Math.cos(heading) * i * 4, 0, z - Math.sin(heading) * i * 4);
      barrier.rotation.y = heading;
      scene.add(barrier);
      group.add(barrier);
    }
    return { x: x, z: z, heading: heading, cars: cars, group: group };
  }

  // The parked cruisers of every roadblock, flat — traffic treats them
  // as obstacles, so cars queue behind a roadblock instead of driving
  // straight through it.
  function roadblockCars(blocks) {
    const cars = [];
    for (const b of blocks) for (const c of b.cars) cars.push(c);
    return cars;
  }

  // Put the blocks up or take them down. Spots come from the mission's
  // story spots, so the escape route is always blocked the same way.
  function syncRoadblocks(scene, blocks, want, spots) {
    if (want && blocks.length === 0) {
      for (const s of spots) blocks.push(makeRoadblock(scene, s.x, s.z, s.heading));
    }
    if (!want && blocks.length > 0) {
      for (const b of blocks) {
        for (const car of b.cars) scene.remove(car.mesh);
        for (const child of b.group.children) scene.remove(child);
      }
      blocks.length = 0;
    }
    // The parked cruisers keep their light bars flashing.
    for (const b of blocks) {
      const phase = Math.floor(performance.now() / 180) % 2 === 0;
      for (const car of b.cars) {
        car.lightBar.userData.red.material.color.setHex(phase ? 0xff2222 : 0x551111);
        car.lightBar.userData.blue.material.color.setHex(phase ? 0x111155 : 0x2244ff);
      }
    }
  }

  // Busted check: a police car touching the player (on foot or in a slow
  // car) for 2.5 seconds ends the run.
  function updateBusted(wanted, police, playerX, playerZ, inCar, playerSpeed, dt) {
    let touching = false;
    for (const car of police) {
      const dx = car.x - playerX;
      const dz = car.z - playerZ;
      if (Math.sqrt(dx * dx + dz * dz) < (inCar ? 3.4 : 2.2)) touching = true;
    }
    if (touching && (!inCar || playerSpeed < 4)) {
      wanted.bustedT += dt;
      if (wanted.bustedT > 2.5) return true;
    } else {
      wanted.bustedT = Math.max(0, wanted.bustedT - dt * 2);
    }
    return false;
  }

  global.VP = global.VP || {};
  global.VP.makeWanted = makeWanted;
  global.VP.addHeat = addHeat;
  global.VP.updateWanted = updateWanted;
  global.VP.policeCount = policeCount;
  global.VP.makePoliceCar = makePoliceCar;
  global.VP.updatePoliceCar = updatePoliceCar;
  global.VP.syncPolice = syncPolice;
  global.VP.makeRoadblock = makeRoadblock;
  global.VP.syncRoadblocks = syncRoadblocks;
  global.VP.roadblockCars = roadblockCars;
  global.VP.updateBusted = updateBusted;
  global.VP.MAX_WANTED = MAX_WANTED;
})(typeof window !== 'undefined' ? window : globalThis);
