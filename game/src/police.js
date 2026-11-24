// The wanted system for Solmar Bay: stars 0 to 5, earned by crime, lost by
// laying low. Police cars chase and ram the player; at four stars a
// helicopter circles overhead with a spotlight. Getting busted costs cash.

const THREE = window.THREE;
import { WORLD } from './config.js';
import { makeRng, pick, range } from './rng.js';
import { createVehicleMesh, spawnVehicle } from './cars.js';
import { groundHeight, resolveCollision } from './city.js';
import { playSiren } from './audio.js';

export function addWanted(G, stars) {
  G.wanted = Math.max(0, Math.min(5, G.wanted + stars));
  G.wantedTimer = 0;
  if (G.wanted > 0) playSiren(G.audio, true);
}

export function clearWanted(G) {
  G.wanted = 0;
  G.wantedTimer = 0;
  playSiren(G.audio, false);
}

export function updateWanted(G, dt) {
  if (G.wanted === 0) return;
  G.wantedTimer += dt;
  // Lay low for 25 seconds with no new crime and the heat cools by a star.
  if (G.wantedTimer > 25) {
    G.wanted -= 1;
    G.wantedTimer = 0;
    if (G.wanted === 0) playSiren(G.audio, false);
  }
}

function spawnPoliceCar(G) {
  const rng = makeRng((G.elapsed * 1000) | 0);
  const edge = pick(rng, ['n', 's', 'e', 'w']);
  let x;
  let z;
  if (edge === 'n') { x = range(rng, -180, 180); z = -170; }
  else if (edge === 's') { x = range(rng, -180, 180); z = 170; }
  else if (edge === 'e') { x = 210; z = range(rng, -160, 160); }
  else { x = -210; z = range(rng, -160, 160); }
  const v = spawnVehicle(G, 'police', x, z, 0, 0x1a2a4a);
  v.police = true;
  v.chaseSpeed = 0;
  G.police.push(v);
  return v;
}

export function updatePolice(G, dt) {
  const want = Math.min(G.wanted + 1, 5);
  while (G.police.length < want && G.wanted > 0) spawnPoliceCar(G);
  while (G.police.length > want) {
    const v = G.police.pop();
    G.scene.remove(v.mesh);
    const i = G.vehicles.indexOf(v);
    if (i >= 0) G.vehicles.splice(i, 1);
  }
  const target = G.player.vehicle ? G.player.vehicle.pos : G.player.pos;
  for (const v of G.police) {
    const dx = target.x - v.pos.x;
    const dz = target.z - v.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const wantAngle = Math.atan2(-dx, -dz);
    let diff = wantAngle - v.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    v.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const chaseTop = Math.min(33, 20 + G.wanted * 2.5);
    v.chaseSpeed = Math.min(chaseTop, v.chaseSpeed + 12 * dt);
    const fx = -Math.sin(v.angle);
    const fz = -Math.cos(v.angle);
    v.pos.x += fx * v.chaseSpeed * dt;
    v.pos.z += fz * v.chaseSpeed * dt;
    resolveCollision(G, v.pos, 2.2);
    v.pos.y = groundHeight(v.pos.x, v.pos.z);
    v.mesh.position.copy(v.pos);
    v.mesh.rotation.y = v.angle;
    const lights = v.mesh.userData.policeLights;
    if (lights) {
      const phase = Math.floor(G.elapsed * 6) % 2 === 0;
      lights[0].material.emissiveIntensity = phase ? 2 : 0.2;
      lights[1].material.emissiveIntensity = phase ? 0.2 : 2;
    }
    // Ram the player: damage on contact, and a slow arrest when on foot.
    if (dist < 3.2) {
      if (G.player.vehicle) {
        G.player.vehicle.damage = Math.min(100, (G.player.vehicle.damage || 0) + 12 * dt);
        v.chaseSpeed *= 0.6;
      } else {
        G.player.health -= 14 * dt;
        if (G.player.health <= 0) bustPlayer(G);
      }
    }
  }
  // Helicopter at four stars and up.
  if (G.wanted >= 4 && !G.heli) {
    const heli = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
    heli.add(body);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.15, 0.8), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    rotor.position.y = 1.2;
    heli.add(rotor);
    heli.userData.rotor = rotor;
    const spot = new THREE.Mesh(new THREE.ConeGeometry(4, 18, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    spot.position.y = -9;
    spot.rotation.x = Math.PI;
    heli.add(spot);
    G.scene.add(heli);
    G.heli = heli;
  }
  if (G.heli) {
    if (G.wanted < 4) {
      G.scene.remove(G.heli);
      G.heli = null;
    } else {
      const a = G.elapsed * 0.5;
      G.heli.position.set(
        target.x + Math.cos(a) * 26,
        34,
        target.z + Math.sin(a) * 26,
      );
      G.heli.rotation.y = -a;
      G.heli.userData.rotor.rotation.y += dt * 22;
    }
  }
}

export function bustPlayer(G) {
  G.player.health = 100;
  const fine = Math.min(200, Math.floor(G.player.cash * 0.2));
  G.player.cash -= fine;
  clearWanted(G);
  G.mode = 'busted';
  G.bustedFine = fine;
  if (G.player.vehicle) {
    G.player.vehicle.driver = null;
    G.player.vehicle = null;
    G.player.onFoot = true;
  }
  G.player.pos.set(-8, 0, -8);
  G.player.angle = Math.PI * 0.75;
}
