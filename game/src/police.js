// Wanted + police: stars 0–5 that rise on crimes, police cars that spawn at
// the edge of sight and chase, ram and try to box the player in, officers on
// foot when the player is on foot, roadblocks at 3 stars, and a wanted level
// that decays when the player stays hidden and quiet. Busted and wasted are
// the two ways a run ends — both cost cash and drop the heat.
const THREE = window.THREE;
import { POLICE, COLORS } from './config.js';
import { createCarMesh } from './cars.js';
import { resolveCircle } from './city.js';

function createPoliceCarMesh() {
  const group = createCarMesh(COLORS.police, 'sedan');
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.18, 0.4),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  );
  bar.position.set(0, 1.95, -0.2);
  group.add(bar);
  const bar2 = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.18, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x2a6aff }),
  );
  bar2.position.set(0, 1.95, 0.3);
  group.add(bar2);
  group.userData.lightRed = bar;
  group.userData.lightBlue = bar2;
  return group;
}

function createOfficerMesh() {
  const group = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1c2f6e });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.34), navy);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.72;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46), navy);
  cap.position.y = 1.95;
  group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), navy);
  legL.position.set(-0.14, 0.32, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), navy);
  legR.position.set(0.14, 0.32, 0);
  group.add(legR);
  group.userData = { legL, legR };
  return group;
}

export function createPolice(G, scene) {
  return {
    cars: [],
    officers: [],
    roadblocks: [],
    bustProgress: 0,
    decayTimer: 0,
    crimeCooldown: 0,
    spawnTimer: 0,
  };
}

/** Put a police car at an exact spot (screenshot scenes use this). */
export function forcePoliceCar(G, scene, x, z, angle) {
  const mesh = createPoliceCarMesh();
  mesh.position.set(x, 0, z);
  mesh.rotation.y = -angle;
  scene.add(mesh);
  const car = { mesh, x, z, angle, speed: 0, hp: 3 };
  G.police.cars.push(car);
  return car;
}

export function addWanted(G, n) {
  if (G.wanted >= 5) return;
  G.wanted = Math.min(5, G.wanted + n);
  G.police.decayTimer = 0;
  G.hud.flashWanted();
  G.audio.siren(G.wanted > 0);
}

function spawnPoliceCar(G, scene) {
  const a = G.rng.angle();
  const dist = 90;
  const px = G.inCar ? G.car.x : G.player.x;
  const pz = G.inCar ? G.car.z : G.player.z;
  let x = px + Math.cos(a) * dist;
  let z = pz + Math.sin(a) * dist;
  x = Math.max(-G.city.half, Math.min(G.city.half, x));
  z = Math.max(-G.city.half, Math.min(G.city.half, z));
  const mesh = createPoliceCarMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const car = { mesh, x, z, angle: Math.atan2(pz - z, px - x), speed: 0, hp: 3 };
  G.police.cars.push(car);
  return car;
}

function spawnOfficer(G, scene) {
  const a = G.rng.angle();
  const x = G.player.x + Math.cos(a) * 40;
  const z = G.player.z + Math.sin(a) * 40;
  const mesh = createOfficerMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const off = { mesh, x, z, angle: 0, hp: 3, walkPhase: 0 };
  G.police.officers.push(off);
  return off;
}

function spawnRoadblock(G, scene) {
  // Two police cars parked across the road ahead of the player.
  const px = G.inCar ? G.car.x : G.player.x;
  const pz = G.inCar ? G.car.z : G.player.z;
  const heading = G.inCar ? G.car.angle : G.player.angle;
  const bx = px + Math.cos(heading) * 55;
  const bz = pz + Math.sin(heading) * 55;
  const perp = heading + Math.PI / 2;
  for (const off of [-4, 4]) {
    const mesh = createPoliceCarMesh();
    const x = bx + Math.cos(perp) * off;
    const z = bz + Math.sin(perp) * off;
    mesh.position.set(x, 0, z);
    mesh.rotation.y = -perp;
    scene.add(mesh);
    G.police.roadblocks.push({ mesh, x, z, angle: perp });
  }
}

export function stepPolice(G, dt) {
  const P = G.police;
  if (P.crimeCooldown > 0) P.crimeCooldown -= dt;
  const px = G.inCar ? G.car.x : G.player.x;
  const pz = G.inCar ? G.car.z : G.player.z;
  const pSpeed = G.inCar ? Math.abs(G.car.speed) : 0;

  // Spawn to match the wanted level (cars while driving, officers on foot).
  P.spawnTimer -= dt;
  if (G.wanted > 0 && P.spawnTimer <= 0) {
    P.spawnTimer = 2.5;
    if (G.inCar && P.cars.length < Math.min(POLICE.maxCars, G.wanted)) spawnPoliceCar(G, G.scene);
    else if (!G.inCar && P.officers.length < Math.min(2, G.wanted - 1) && G.wanted >= 2) spawnOfficer(G, G.scene);
    if (G.wanted >= POLICE.roadblockAt && P.roadblocks.length === 0) spawnRoadblock(G, G.scene);
  }
  if (G.wanted === 0) {
    // Heat gone: clear the roadblocks.
    for (const rb of P.roadblocks) G.scene.remove(rb.mesh);
    P.roadblocks = [];
  }

  // Police cars chase and ram.
  for (let i = P.cars.length - 1; i >= 0; i -= 1) {
    const car = P.cars[i];
    const dx = px - car.x;
    const dz = pz - car.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    if (dist > 320) {
      G.scene.remove(car.mesh);
      P.cars.splice(i, 1);
      continue;
    }
    const wantAngle = Math.atan2(dz, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
    // Do not pile into the player's bumper: hold a car-length back, then ram.
    const gap = dist < 5 ? 0.4 : 1;
    car.speed = Math.min(POLICE.chaseSpeed * gap, car.speed + 12 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const nz = car.z + Math.sin(car.angle) * car.speed * dt;
    const fixed = resolveCircle(G.city, nx, nz, 2.3);
    car.x = fixed.x;
    car.z = fixed.z;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = -car.angle;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.4;
    // Flashing light bar.
    const on = Math.floor(G.time * 6) % 2 === 0;
    car.mesh.userData.lightRed.visible = on;
    car.mesh.userData.lightBlue.visible = !on;
    // Ram contact: a hit every POLICE.ramCooldown, not every step, or one
    // touch wrecks a car.
    if (dist < 4.5) {
      car.ramCooldown = (car.ramCooldown || 0) - dt;
      if (car.ramCooldown <= 0) {
        car.ramCooldown = POLICE.ramCooldown;
        if (G.inCar) {
          G.car.damage = Math.min(100, G.car.damage + 4);
          G.car.speed *= 0.7;
          G.player.health = Math.max(0, G.player.health - POLICE.ramDamage);
          G.hud.damageFlash();
          G.audio.crash();
        } else if (dist < 3.2) {
          G.player.health = Math.max(0, G.player.health - POLICE.ramDamage);
          G.hud.damageFlash();
        }
      }
    }
  }

  // Officers on foot chase the player and try to bust them.
  let touching = false;
  for (let i = P.officers.length - 1; i >= 0; i -= 1) {
    const off = P.officers[i];
    const dx = G.player.x - off.x;
    const dz = G.player.z - off.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    if (dist > 200 || G.inCar) {
      G.scene.remove(off.mesh);
      P.officers.splice(i, 1);
      continue;
    }
    const wantAngle = Math.atan2(dz, dx);
    off.angle = wantAngle;
    const speed = 7.5;
    off.x += Math.cos(wantAngle) * speed * dt;
    off.z += Math.sin(wantAngle) * speed * dt;
    off.walkPhase += dt * speed * 2;
    off.mesh.userData.legL.rotation.x = Math.sin(off.walkPhase) * 0.6;
    off.mesh.userData.legR.rotation.x = -Math.sin(off.walkPhase) * 0.6;
    off.mesh.position.set(off.x, 0, off.z);
    off.mesh.rotation.y = -wantAngle + Math.PI / 2;
    if (dist < 2.2) touching = true;
  }
  if (touching && G.wanted > 0 && !G.inCar) {
    P.bustProgress += dt;
    G.hud.bustWarning(P.bustProgress / POLICE.bustTime);
    if (P.bustProgress >= POLICE.bustTime) {
      P.bustProgress = 0;
      G.busted();
    }
  } else {
    P.bustProgress = Math.max(0, P.bustProgress - dt * 2);
  }

  // Wanted decay: quiet and unseen for a while, one star fades.
  const nearestPolice = Math.min(
    ...P.cars.map((c) => Math.hypot(c.x - px, c.z - pz)),
    ...P.officers.map((o) => Math.hypot(o.x - px, o.z - pz)),
    999,
  );
  if (G.wanted > 0 && nearestPolice > 60 && pSpeed < 2 && P.crimeCooldown <= 0) {
    P.decayTimer += dt;
    if (P.decayTimer >= POLICE.decayDelay) {
      P.decayTimer = 0;
      G.wanted -= 1;
      G.audio.siren(G.wanted > 0);
    }
  } else {
    P.decayTimer = 0;
  }
}
