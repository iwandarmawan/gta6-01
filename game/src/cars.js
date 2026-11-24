// Vehicles for Solmar Bay: cars, a pickup, a motorcycle and the marina
// skiff. Arcade driving on purpose — throttle, steer, brake, handbrake —
// plus entering and leaving, damage, and the garage repair hook.

const THREE = window.THREE;
import { VEHICLES, WORLD } from './config.js';
import { makeRng, pick, range } from './rng.js';
import { isWater, groundHeight, resolveCollision } from './city.js';
import { playCrash } from './audio.js';

export function createVehicleMesh(G, kind, color) {
  const spec = VEHICLES[kind];
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c2430 });
  const wheels = [];

  if (kind === 'boat') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 6.0), bodyMat);
    hull.position.y = 0.5;
    group.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.0, 4), bodyMat);
    bow.rotation.x = -Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.5, -3.8);
    group.add(bow);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.2), darkMat);
    seat.position.set(0, 1.0, 0.6);
    group.add(seat);
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), darkMat);
    motor.position.set(0, 0.7, 3.1);
    group.add(motor);
  } else if (kind === 'bike') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.0), bodyMat);
    frame.position.y = 0.9;
    group.add(frame);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.7), darkMat);
    seat.position.set(0, 1.25, 0.5);
    group.add(seat);
    for (const dz of [-0.85, 0.85]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.18, 12),
        darkMat,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.42, dz);
      group.add(wheel);
      wheels.push({ mesh: wheel, front: dz < 0 });
    }
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(spec.width, 0.75, spec.length), bodyMat);
    body.position.y = 0.75;
    group.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(spec.width - 0.3, 0.65, spec.length * 0.45),
      new THREE.MeshLambertMaterial({ color: 0x9fc3d4 }),
    );
    cabin.position.set(0, 1.4, kind === 'pickup' ? 0.7 : 0.1);
    group.add(cabin);
    if (kind === 'pickup') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(spec.width - 0.2, 0.5, spec.length * 0.4), darkMat);
      bed.position.set(0, 1.05, -1.3);
      group.add(bed);
    }
    if (kind === 'police') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      bar.position.set(0, 1.85, 0.1);
      group.add(bar);
      const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.4), new THREE.MeshLambertMaterial({ color: 0xd43a2a, emissive: 0xd43a2a, emissiveIntensity: 1 }));
      lightL.position.set(-0.35, 1.95, 0.1);
      group.add(lightL);
      const lightR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.4), new THREE.MeshLambertMaterial({ color: 0x2a6ad4, emissive: 0x2a6ad4, emissiveIntensity: 1 }));
      lightR.position.set(0.35, 1.95, 0.1);
      group.add(lightR);
      group.userData.policeLights = [lightL, lightR];
    }
    for (const dx of [-spec.width / 2 + 0.15, spec.width / 2 - 0.15]) {
      for (const dz of [-spec.length / 2 + 0.7, spec.length / 2 - 0.7]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), darkMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(dx, 0.38, dz);
        group.add(wheel);
        wheels.push({ mesh: wheel, front: dz < 0 });
      }
    }
    const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.6 });
    for (const dx of [-0.6, 0.6]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.15), lightMat);
      lamp.position.set(dx, 0.8, -spec.length / 2 - 0.05);
      group.add(lamp);
    }
  }
  group.userData.wheels = wheels;
  return group;
}

export function spawnVehicle(G, kind, x, z, angle, color) {
  const spec = VEHICLES[kind];
  const mesh = createVehicleMesh(G, kind, color ?? pick(makeRng((x * 31 + z * 17) | 0), spec.colors));
  mesh.position.set(x, kind === 'boat' ? 0 : groundHeight(x, z), z);
  mesh.rotation.y = angle;
  G.scene.add(mesh);
  const v = {
    kind,
    spec,
    mesh,
    pos: mesh.position,
    angle,
    speed: 0,
    steer: 0,
    vy: 0,
    airborne: false,
    damage: 0,
    driver: null,
    smoke: null,
  };
  G.vehicles.push(v);
  return v;
}

export function spawnParkedVehicles(G) {
  const rng = makeRng(777);
  const spots = [
    { kind: 'sedan', x: -40, z: -52, a: 0 },
    { kind: 'sedan', x: 8, z: -92, a: Math.PI / 2 },
    { kind: 'pickup', x: -88, z: 48, a: 0 },
    { kind: 'sedan', x: 128, z: -52, a: Math.PI },
    { kind: 'sedan', x: 48, z: 128, a: Math.PI / 2 },
    { kind: 'pickup', x: -168, z: 8, a: Math.PI / 2 },
    { kind: 'sedan', x: 168, z: 48, a: 0 },
    { kind: 'sedan', x: -8, z: 168, a: Math.PI / 2 },
    { kind: 'sedan', x: 88, z: -168, a: 0 },
    { kind: 'pickup', x: -128, z: -128, a: Math.PI },
    { kind: 'bike', x: 12, z: 12, a: Math.PI / 4 },
    { kind: 'boat', x: 40, z: 168, a: Math.PI },
    { kind: 'boat', x: 80, z: 168, a: Math.PI },
    { kind: 'boat', x: 60, z: 120, a: 0 },
  ];
  for (const s of spots) {
    spawnVehicle(G, s.kind, s.x, s.z, s.a, pick(rng, VEHICLES[s.kind].colors));
  }
}

export function nearestVehicle(G, pos, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const v of G.vehicles) {
    if (v.driver) continue;
    const dx = v.pos.x - pos.x;
    const dz = v.pos.z - pos.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

export function enterVehicle(G, v) {
  v.driver = 'player';
  G.player.vehicle = v;
  G.player.onFoot = false;
  G.player.pos.copy(v.pos);
}

export function exitVehicle(G) {
  const v = G.player.vehicle;
  if (!v) return;
  v.driver = null;
  v.speed = 0;
  G.player.vehicle = null;
  G.player.onFoot = true;
  const side = new THREE.Vector3(Math.cos(v.angle), 0, -Math.sin(v.angle));
  G.player.pos.set(v.pos.x + side.x * 3, groundHeight(v.pos.x + side.x * 3, v.pos.z + side.z * 3), v.pos.z + side.z * 3);
  G.player.angle = v.angle;
}

export function damageVehicle(G, v, amount) {
  v.damage = Math.min(100, v.damage + amount);
  if (v.damage >= 100 && !v.smoke) {
    const smoke = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 3, 8),
      new THREE.MeshLambertMaterial({ color: 0x555555, transparent: true, opacity: 0.6 }),
    );
    smoke.position.y = 2.2;
    v.mesh.add(smoke);
    v.smoke = smoke;
  }
  if (v.driver === 'player') playCrash(G.audio);
}

function forwardOf(angle) {
  // The car's nose is its local -Z, so after rotation.y the nose points here.
  return { x: -Math.sin(angle), z: -Math.cos(angle) };
}

export function updateVehicle(G, v, dt, throttle, steerInput, brake) {
  const spec = v.spec;
  const top = spec.topSpeed * (G.upgrades.engine && v.driver === 'player' ? 1.25 : 1);
  if (v.damage >= 100) {
    v.speed *= Math.max(0, 1 - 3 * dt);
  } else if (throttle > 0) {
    v.speed += spec.accel * throttle * dt;
  } else if (brake) {
    v.speed -= spec.brake * dt;
  } else {
    v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 6 * dt);
  }
  if (brake && v.speed < 0.5 && throttle <= 0) v.speed -= spec.accel * 0.5 * dt;
  v.speed = Math.max(-top * 0.35, Math.min(top, v.speed));
  const speedRatio = Math.min(1, Math.abs(v.speed) / top);
  v.angle += steerInput * spec.turn * speedRatio * dt * (v.speed >= 0 ? 1 : -1);
  v.steer = steerInput;

  const f = forwardOf(v.angle);
  const nx = v.pos.x + f.x * v.speed * dt;
  const nz = v.pos.z + f.z * v.speed * dt;
  if (v.kind === 'boat') {
    if (isWater(nx, nz)) {
      v.pos.x = nx;
      v.pos.z = nz;
    } else {
      v.speed *= 0.5;
    }
    v.pos.y = 0;
    v.mesh.rotation.z = Math.sin(G.elapsed * 2) * 0.02;
  } else {
    const wasWater = isWater(nx, nz);
    if (wasWater) {
      v.speed *= 0.4;
    } else {
      const before = { x: v.pos.x, z: v.pos.z };
      v.pos.x = nx;
      v.pos.z = nz;
      resolveCollision(G, v.pos, 2.2);
      const hit = Math.abs(v.pos.x - nx) > 0.01 || Math.abs(v.pos.z - nz) > 0.01;
      if (hit && Math.abs(v.speed) > 6) {
        damageVehicle(G, v, Math.abs(v.speed) * 0.8);
        v.speed *= 0.4;
      }
      void before;
      // The stunt ramp launches a fast car into the air.
      const ground = groundHeight(v.pos.x, v.pos.z);
      if (!v.airborne && Math.abs(v.pos.x - 60) < 5 && Math.abs(v.pos.z - 100) < 6 && Math.abs(v.speed) > 15) {
        v.vy = 9;
        v.airborne = true;
      }
      if (v.airborne) {
        v.vy -= 22 * dt;
        v.pos.y += v.vy * dt;
        if (v.pos.y <= ground) {
          v.pos.y = ground;
          v.vy = 0;
          v.airborne = false;
        }
      } else {
        v.pos.y = ground;
      }
    }
  }
  v.mesh.position.copy(v.pos);
  v.mesh.rotation.y = v.angle;
  const wheels = v.mesh.userData.wheels || [];
  for (const w of wheels) {
    w.mesh.rotation.x += (v.speed / 0.38) * dt;
    if (w.front) w.mesh.rotation.y = steerInput * 0.4;
  }
  if (v.smoke) {
    v.smoke.position.y = 2.2 + Math.sin(G.elapsed * 5) * 0.2;
    v.smoke.scale.setScalar(1 + Math.sin(G.elapsed * 3) * 0.1);
  }
}
