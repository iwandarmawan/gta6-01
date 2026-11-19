// cars.js — Solmar Bay vehicles: low-poly car models and arcade driving.
// A car is a THREE.Group with a body, cabin, four wheels and lights, plus a
// small physics state (position, heading, speed, steering, damage).
(function (global) {
  'use strict';

  // Body styles the city spawns: length, width, cabin size, top speed.
  const TYPES = {
    sedan: { len: 4.4, wid: 1.9, cabLen: 2.2, cabH: 0.65, top: 34, accel: 13 },
    coupe: { len: 4.0, wid: 1.85, cabLen: 1.8, cabH: 0.55, top: 38, accel: 15 },
    van: { len: 5.0, wid: 2.1, cabLen: 3.4, cabH: 0.9, top: 28, accel: 10 },
    truck: { len: 5.6, wid: 2.2, cabLen: 1.6, cabH: 0.9, top: 26, accel: 9 },
    taxi: { len: 4.4, wid: 1.9, cabLen: 2.2, cabH: 0.65, top: 34, accel: 13 },
    police: { len: 4.5, wid: 1.95, cabLen: 2.2, cabH: 0.65, top: 40, accel: 16 },
  };
  const PAINTS = [0xc0392b, 0x2e6db4, 0x27ae60, 0xf2d05a, 0x8e44ad, 0xe67e22, 0x7f8c8d, 0x1a1a1a, 0xe8e8e8, 0x16a085];

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.3, 8);
  const hubMat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x223344 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xdd2222 });

  function makeCarMesh(type, color) {
    const spec = TYPES[type] || TYPES.sedan;
    const g = new THREE.Group();
    const paint = new THREE.MeshLambertMaterial({ color: color });
    const L = spec.len;
    const W = spec.wid;

    const body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.62, L), paint);
    body.position.y = 0.55;
    body.castShadow = true;
    g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(W - 0.25, spec.cabH, spec.cabLen), glassMat);
    cabin.position.set(0, 0.55 + 0.31 + spec.cabH / 2, type === 'truck' ? L / 2 - spec.cabLen / 2 - 0.3 : -0.2);
    cabin.castShadow = true;
    g.add(cabin);
    if (type === 'truck') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 0.5, L * 0.42),
        new THREE.MeshLambertMaterial({ color: 0x5a5a5a }));
      bed.position.set(0, 0.9, -L * 0.22);
      g.add(bed);
    }
    if (type === 'taxi') {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.7),
        new THREE.MeshBasicMaterial({ color: 0xf2d05a }));
      sign.position.set(0, 0.55 + 0.62 + spec.cabH + 0.11, -0.2);
      g.add(sign);
    }
    // Wheels: front pair steers, all four spin on their axle.
    // Each wheel is a group (steering, around Y) holding a spinner group
    // (rolling, around the axle X) holding the tyre and hub.
    const wheels = [];
    const wx = [-W / 2 + 0.05, W / 2 - 0.05];
    const wz = [L / 2 - 0.85, -L / 2 + 0.85];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const wheel = new THREE.Group();
        const spinner = new THREE.Group();
        const tyre = new THREE.Mesh(wheelGeo, wheelMat);
        tyre.rotation.z = Math.PI / 2;
        const hub = new THREE.Mesh(hubGeo, hubMat);
        hub.rotation.z = Math.PI / 2;
        spinner.add(tyre);
        spinner.add(hub);
        wheel.add(spinner);
        wheel.position.set(wx[j], 0.36, wz[i]);
        wheel.castShadow = true;
        g.add(wheel);
        wheels.push({ node: wheel, spinner: spinner, front: i === 0 });
      }
    }
    // Headlights and taillights.
    for (const x of [-W / 2 + 0.35, W / 2 - 0.35]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.08), headMat);
      h.position.set(x, 0.62, L / 2 + 0.01);
      g.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.08), tailMat);
      t.position.set(x, 0.62, -L / 2 - 0.01);
      g.add(t);
    }
    g.userData.wheels = wheels;
    g.userData.spec = spec;
    return g;
  }

  // A police light bar: two flashing boxes on the roof.
  function makeLightBar() {
    const bar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.z = -0.35;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.z = 0.35;
    bar.add(red);
    bar.add(blue);
    bar.userData.red = red;
    bar.userData.blue = blue;
    return bar;
  }

  // Circle (the car) against an axis-aligned building box, pushed out.
  // Returns the push vector, or null when there is no overlap.
  function collideCircleAABB(x, z, r, box) {
    const cx = Math.max(box.minX, Math.min(x, box.maxX));
    const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return null;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      return { x: (dx / d) * (r - d), z: (dz / d) * (r - d) };
    }
    // Centre inside the box: push out along the smallest axis.
    const pushes = [
      { x: box.minX - r - x, z: 0 },
      { x: box.maxX + r - x, z: 0 },
      { x: 0, z: box.minZ - r - z },
      { x: 0, z: box.maxZ + r - z },
    ];
    let best = pushes[0];
    for (const p of pushes) {
      if (Math.abs(p.x) + Math.abs(p.z) < Math.abs(best.x) + Math.abs(best.z)) best = p;
    }
    return best;
  }

  // One car: mesh + arcade physics state. Drive with input {throttle, steer, handbrake}.
  function makeCar(type, color, x, z, heading) {
    const spec = TYPES[type] || TYPES.sedan;
    const mesh = makeCarMesh(type, color);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    const car = {
      type: type,
      spec: spec,
      mesh: mesh,
      x: x,
      z: z,
      heading: heading,
      speed: 0,
      steer: 0,
      damage: 0, // 0 fine .. 1 wrecked
      radius: Math.max(spec.len, spec.wid) * 0.42,
      smoke: null,
    };
    return car;
  }

  function driveCar(car, input, dt, colliders, bounds) {
    const spec = car.spec;
    const top = spec.top * (1 - car.damage * 0.45);
    // Steering follows speed: full lock only when slow, gentler when fast.
    const steerTarget = input.steer * (0.55 / (1 + Math.abs(car.speed) * 0.03));
    car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
    if (input.handbrake) {
      car.speed -= car.speed * Math.min(1, dt * 2.2);
    } else if (input.throttle > 0) {
      car.speed += spec.accel * input.throttle * dt * (1 - Math.max(0, car.speed) / top);
    } else if (input.throttle < 0) {
      if (car.speed > 0.5) {
        car.speed -= spec.accel * 1.4 * dt; // braking
      } else {
        car.speed += spec.accel * 0.55 * input.throttle * dt; // reverse, capped
        if (car.speed < -9) car.speed = -9;
      }
    } else {
      car.speed -= car.speed * Math.min(1, dt * 0.9); // rolling drag
    }
    if (Math.abs(car.speed) < 0.05 && input.throttle === 0) car.speed = 0;
    // Heading turns with speed; reverse flips the steering sense.
    car.heading += car.steer * car.speed * dt * 0.32;
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    let nx = car.x + fx * car.speed * dt;
    let nz = car.z + fz * car.speed * dt;
    // Collide with buildings: slide along the wall, lose a little speed.
    let hit = false;
    for (const b of colliders) {
      const push = collideCircleAABB(nx, nz, car.radius, b);
      if (push) {
        nx += push.x;
        nz += push.z;
        hit = true;
      }
    }
    if (hit) {
      const before = car.speed;
      car.speed *= 0.55;
      if (Math.abs(before) > 12) car.damage = Math.min(1, car.damage + 0.12);
    }
    // Stay inside the world.
    nx = Math.max(bounds.minX, Math.min(bounds.maxX, nx));
    nz = Math.max(bounds.minZ, Math.min(bounds.maxZ, nz));
    car.x = nx;
    car.z = nz;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    // Wheels spin on their axle and the front pair steers.
    const spin = (car.speed * dt) / 0.36;
    for (const w of car.mesh.userData.wheels) {
      w.spinner.rotation.x += spin;
      w.node.rotation.y = w.front ? car.steer * 1.6 : 0;
    }
    // Body roll and pitch sell the speed.
    car.mesh.rotation.z = -car.steer * Math.min(1, Math.abs(car.speed) / 20) * 0.06;
    car.mesh.rotation.x = input.throttle > 0 ? -0.012 : input.throttle < 0 ? 0.015 : 0;
    return hit;
  }

  // A puff of dark smoke above a damaged car; call once per frame while hurt.
  function carSmoke(scene, car, dt, accumulator) {
    if (car.damage < 0.35) return;
    accumulator.t += dt;
    if (accumulator.t < 0.12) return;
    accumulator.t = 0;
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.6 })
    );
    puff.position.set(car.x + (Math.random() - 0.5), 1.4, car.z + (Math.random() - 0.5));
    scene.add(puff);
    accumulator.puffs.push({ mesh: puff, life: 0.9 });
  }

  function updateSmoke(accumulator, dt) {
    for (let i = accumulator.puffs.length - 1; i >= 0; i--) {
      const p = accumulator.puffs[i];
      p.life -= dt;
      p.mesh.position.y += dt * 1.5;
      p.mesh.material.opacity = Math.max(0, p.life * 0.6);
      p.mesh.scale.multiplyScalar(1 + dt * 1.2);
      if (p.life <= 0) {
        p.mesh.parent.remove(p.mesh);
        p.mesh.material.dispose();
        accumulator.puffs.splice(i, 1);
      }
    }
  }

  global.VP = global.VP || {};
  global.VP.TYPES = TYPES;
  global.VP.PAINTS = PAINTS;
  global.VP.makeCarMesh = makeCarMesh;
  global.VP.makeLightBar = makeLightBar;
  global.VP.makeCar = makeCar;
  global.VP.driveCar = driveCar;
  global.VP.collideCircleAABB = collideCircleAABB;
  global.VP.carSmoke = carSmoke;
  global.VP.updateSmoke = updateSmoke;
})(typeof window !== 'undefined' ? window : globalThis);
