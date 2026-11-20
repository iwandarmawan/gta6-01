// traffic.js — Solmar Bay traffic: cars that follow the road grid and
// pedestrians who walk the sidewalks and run from trouble.
(function (global) {
  'use strict';

  // A traffic car drives from intersection to intersection on the road grid.
  // At each junction it keeps going straight most of the time, sometimes turns.
  function makeTrafficCar(scene, rng, city) {
    const roads = city.roads;
    const horizontal = rng.chance(0.5);
    const road = rng.pick(roads);
    const dir = rng.chance(0.5) ? 1 : -1;
    // Lane offset: keep right, 3 m from the road centre.
    const lane = 3;
    const type = rng.pick(['sedan', 'sedan', 'coupe', 'van', 'taxi', 'truck']);
    const color = type === 'taxi' ? 0xf2c200 : rng.pick(VP.PAINTS);
    const car = VP.makeCar(type, color, 0, 0, 0);
    if (horizontal) {
      car.x = rng.range(-city.half, city.half);
      car.z = road + (dir > 0 ? lane : -lane);
      car.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.x = road + (dir > 0 ? -lane : lane);
      car.z = rng.range(-city.half, city.half);
      car.heading = dir > 0 ? 0 : Math.PI;
    }
    car.speed = rng.range(7, 11);
    car.cruise = car.speed;
    car.axis = horizontal ? 'x' : 'z';
    car.dir = dir;
    car.wait = 0;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    scene.add(car.mesh);
    return car;
  }

  function nextIntersection(car, city) {
    // The next grid line ahead of the car along its axis.
    const pos = car.axis === 'x' ? car.x : car.z;
    const step = city.pitch;
    const k = Math.floor((pos - -city.half) / step);
    const ahead = car.dir > 0 ? (k + 1) * step - city.half : k * step - city.half;
    return ahead;
  }

  function updateTrafficCar(car, dt, rng, city, others, pedestrians = []) {
    // A wrecked car is done driving: it sits there smoking until the
    // city tows it (it never does — Solmar Bay is like that).
    if (car.damage >= 1) {
      car.speed = 0;
      car.mesh.position.set(car.x, 0, car.z);
      return;
    }
    if (car.wait > 0) {
      car.wait -= dt;
      car.speed = 0;
      return;
    }
    // Stop for a car directly ahead in the same lane.
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    for (const o of others) {
      if (o === car) continue;
      const dx = o.x - car.x;
      const dz = o.z - car.z;
      const along = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (along > 0 && along < 8 && side < 2.2) {
        car.speed = Math.max(0, car.speed - 14 * dt);
        car.mesh.position.set(car.x, 0, car.z);
        return;
      }
    }
    // And for a pedestrian crossing right ahead — Solmar Bay drivers
    // stop for jaywalkers, at least when someone is watching.
    for (const p of pedestrians) {
      const dx = p.x - car.x;
      const dz = p.z - car.z;
      const along = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      if (along > 0 && along < 6 && side < 1.6) {
        car.speed = Math.max(0, car.speed - 14 * dt);
        car.mesh.position.set(car.x, 0, car.z);
        return;
      }
    }
    // Ease back up to cruising speed.
    car.speed += (car.cruise - car.speed) * Math.min(1, dt * 1.5);
    const target = nextIntersection(car, city);
    const pos = car.axis === 'x' ? car.x : car.z;
    const dist = (target - pos) * car.dir;
    if (dist <= 0.5) {
      // Reached a junction: mostly straight on, sometimes turn.
      const roll = rng.next();
      const turn = roll < 0.62 ? 0 : roll < 0.81 ? 1 : -1; // straight, left, right
      if (turn === 0) {
        // Keep the same axis and direction; the next intersection is ahead.
      } else {
        const wasX = car.axis === 'x';
        car.axis = wasX ? 'z' : 'x';
        // Turning left/right from the current heading: facing +X, a left
        // turn heads -Z and a right turn heads +Z; facing +Z it is the
        // mirror image. (turn = +1 left, -1 right.)
        const newDir = turn * car.dir * (wasX ? -1 : 1);
        car.dir = newDir;
        // Snap onto the new road's lane.
        const lane = 3;
        if (car.axis === 'x') {
          car.z = Math.round((car.z + city.half) / city.pitch) * city.pitch - city.half + (car.dir > 0 ? lane : -lane);
          car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          car.x = Math.round((car.x + city.half) / city.pitch) * city.pitch - city.half + (car.dir > 0 ? -lane : lane);
          car.heading = car.dir > 0 ? 0 : Math.PI;
        }
      }
      // A short pause at some junctions reads as stopping for the cross road.
      if (rng.chance(0.25)) car.wait = rng.range(0.8, 2.2);
    }
    // Drive: advance along the current axis and lane.
    const step = car.speed * dt;
    if (car.axis === 'x') {
      car.x += car.dir * step;
      const laneZ = Math.round((car.z + city.half) / city.pitch) * city.pitch - city.half + (car.dir > 0 ? 3 : -3);
      car.z += (laneZ - car.z) * Math.min(1, dt * 3);
      car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.z += car.dir * step;
      const laneX = Math.round((car.x + city.half) / city.pitch) * city.pitch - city.half + (car.dir > 0 ? -3 : 3);
      car.x += (laneX - car.x) * Math.min(1, dt * 3);
      car.heading = car.dir > 0 ? 0 : Math.PI;
    }
    // Wrap around the far edge so traffic never runs out.
    if (car.x > city.half + 8) car.x = -city.half - 8;
    if (car.x < -city.half - 8) car.x = city.half + 8;
    if (car.z > city.half + 8) car.z = -city.half - 8;
    if (car.z < -city.half - 8) car.z = city.half + 8;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    const spin = (car.speed * dt) / 0.36;
    for (const w of car.mesh.userData.wheels) w.spinner.rotation.x += spin;
  }

  // --- pedestrians ---------------------------------------------------------
  function makePedestrian(scene, rng, city) {
    const group = new THREE.Group();
    const skin = rng.pick([0xd9a066, 0xb97a4a, 0x8a5a30, 0xe8b88a]);
    const shirt = rng.pick([0xc0392b, 0x2e6db4, 0x27ae60, 0xf2d05a, 0x8e44ad, 0xe8e8e8, 0x333333]);
    const legs = rng.pick([0x2c3e50, 0x5a5a5a, 0x8a6a42, 0xdddddd]);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.28),
      new THREE.MeshLambertMaterial({ color: shirt }));
    body.position.y = 1.02;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshLambertMaterial({ color: skin }));
    head.position.y = 1.5;
    head.castShadow = true;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.2),
      new THREE.MeshLambertMaterial({ color: legs }));
    legL.position.set(-0.13, 0.34, 0);
    const legR = legL.clone();
    legR.position.x = 0.13;
    group.add(body);
    group.add(head);
    group.add(legL);
    group.add(legR);
    group.userData.legL = legL;
    group.userData.legR = legR;
    const ped = {
      mesh: group,
      x: 0,
      z: 0,
      heading: 0,
      speed: rng.range(1.1, 1.9),
      targetX: 0,
      targetZ: 0,
      fleeT: 0,
      walkPhase: rng.range(0, 6),
    };
    retargetPed(ped, rng, city);
    ped.x = ped.targetX;
    ped.z = ped.targetZ;
    retargetPed(ped, rng, city);
    group.position.set(ped.x, 0, ped.z);
    scene.add(group);
    return ped;
  }

  // A sidewalk point: just off a road, inside a block's edge.
  function sidewalkPoint(rng, city) {
    const road = rng.pick(city.roads);
    const along = rng.range(-city.half, city.half);
    const side = rng.chance(0.5) ? 1 : -1;
    if (rng.chance(0.5)) return { x: along, z: road + side * 7.5 };
    return { x: road + side * 7.5, z: along };
  }

  function retargetPed(ped, rng, city) {
    const p = sidewalkPoint(rng, city);
    ped.targetX = p.x;
    ped.targetZ = p.z;
  }

  function updatePedestrian(ped, dt, rng, city, threat) {
    // Flee from a nearby crash or gunshot for a few seconds.
    if (threat) {
      const dx = ped.x - threat.x;
      const dz = ped.z - threat.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < 18 && d > 0.01) {
        ped.fleeT = 3;
        ped.targetX = ped.x + (dx / d) * 30;
        ped.targetZ = ped.z + (dz / d) * 30;
      }
    }
    if (ped.fleeT > 0) ped.fleeT -= dt;
    const speed = ped.fleeT > 0 ? 4.2 : ped.speed;
    const dx = ped.targetX - ped.x;
    const dz = ped.targetZ - ped.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 0.6) {
      retargetPed(ped, rng, city);
      return;
    }
    ped.heading = Math.atan2(dx, dz);
    ped.x += (dx / d) * speed * dt;
    ped.z += (dz / d) * speed * dt;
    ped.walkPhase += dt * speed * 4;
    const swing = Math.sin(ped.walkPhase) * 0.5;
    ped.mesh.userData.legL.rotation.x = swing;
    ped.mesh.userData.legR.rotation.x = -swing;
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = ped.heading;
  }

  global.VP = global.VP || {};
  global.VP.makeTrafficCar = makeTrafficCar;
  global.VP.updateTrafficCar = updateTrafficCar;
  global.VP.makePedestrian = makePedestrian;
  global.VP.updatePedestrian = updatePedestrian;
})(typeof window !== 'undefined' ? window : globalThis);
