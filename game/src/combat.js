// Combat for Solmar Bay: a pistol the player fires with the mouse. A shot
// is a ray from the camera; the first person or vehicle it crosses takes
// the hit, the shooter gains heat, and nearby pedestrians scatter.

const THREE = window.THREE;
import { playGunshot } from './audio.js';
import { scarePeds } from './peds.js';
import { addWanted } from './police.js';

export function createCombat(G) {
  return { cooldown: 0, tracer: null, flash: 0 };
}

function rayHits(G, origin, dir, maxDist) {
  // Returns the closest hit among peds, police cars and traffic cars.
  let best = null;
  let bestD = maxDist;
  function testPoint(px, pz, radius, kind, ref) {
    const dx = px - origin.x;
    const dz = pz - origin.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 0 || along > bestD) return;
    const px2 = origin.x + dir.x * along;
    const pz2 = origin.z + dir.z * along;
    const side = Math.sqrt((px - px2) * (px - px2) + (pz - pz2) * (pz - pz2));
    if (side < radius) {
      bestD = along;
      best = { kind, ref, dist: along };
    }
  }
  for (const ped of G.peds) testPoint(ped.pos.x, ped.pos.z, 1.0, 'ped', ped);
  for (const v of G.police) testPoint(v.pos.x, v.pos.z, 2.4, 'police', v);
  for (const v of G.traffic) testPoint(v.pos.x, v.pos.z, 2.4, 'traffic', v);
  for (const v of G.vehicles) {
    if (v.driver === 'player') continue;
    testPoint(v.pos.x, v.pos.z, 2.4, 'parked', v);
  }
  return best;
}

export function shoot(G) {
  const combat = G.combat;
  if (combat.cooldown > 0 || !G.player.onFoot || G.mode !== 'play') return;
  combat.cooldown = 0.28;
  playGunshot(G.audio);
  const origin = G.player.pos.clone();
  origin.y += 1.5;
  const dir = { x: -Math.sin(G.player.angle), z: -Math.cos(G.player.angle) };
  const hit = rayHits(G, origin, dir, 60);
  // Tracer line from the muzzle to the hit (or to full range).
  const end = hit
    ? new THREE.Vector3(origin.x + dir.x * hit.dist, 1.2, origin.z + dir.z * hit.dist)
    : new THREE.Vector3(origin.x + dir.x * 60, 1.2, origin.z + dir.z * 60);
  if (combat.tracer) G.scene.remove(combat.tracer);
  const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
  combat.tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a0 }));
  G.scene.add(combat.tracer);
  combat.flash = 0.08;
  scarePeds(G, origin.x, origin.z, 18);
  if (hit) {
    if (hit.kind === 'ped') {
      const i = G.peds.indexOf(hit.ref);
      if (i >= 0) {
        G.scene.remove(hit.ref.mesh);
        G.peds.splice(i, 1);
      }
      addWanted(G, 1);
      G.stats.crimes += 1;
    } else if (hit.kind === 'police') {
      hit.ref.damage = Math.min(100, (hit.ref.damage || 0) + 25);
      addWanted(G, 1);
      G.stats.crimes += 1;
    } else {
      addWanted(G, 1);
      G.stats.crimes += 1;
    }
  }
}

export function updateCombat(G, dt) {
  const combat = G.combat;
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  if (combat.flash > 0) {
    combat.flash -= dt;
    if (combat.flash <= 0 && combat.tracer) {
      G.scene.remove(combat.tracer);
      combat.tracer = null;
    }
  }
}
