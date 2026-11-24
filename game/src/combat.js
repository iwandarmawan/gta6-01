// Combat: a pistol, fired with the mouse, aimed at the centre of the
// screen. A shot that lands on a pedestrian or a police car counts as a
// crime; a shot that lands on nothing still makes a noise. The crosshair
// is the HUD's business; this file only decides what a shot hits.
import { WANTED } from './config.js';

const THREE = window.THREE;

// Fire one shot from the camera through the screen centre. peds and police
// are the only things that can be hit; returns what was hit, if anything.
export function fireShot(G, camera) {
  const origin = camera.position.clone();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const ray = new THREE.Raycaster(origin, dir, 0.1, 120);
  const targets = [];
  for (const ped of G.peds) targets.push({ obj: ped.mesh, kind: 'ped', ref: ped });
  for (const car of G.police.cars) targets.push({ obj: car.mesh, kind: 'police', ref: car });
  for (const car of G.traffic) targets.push({ obj: car.mesh, kind: 'traffic', ref: car });
  const hits = ray.intersectObjects(targets.map((t) => t.obj), true);
  if (hits.length === 0) return null;
  const hit = hits[0];
  let node = hit.object;
  while (node.parent && node.parent !== G.scene) node = node.parent;
  const found = targets.find((t) => t.obj === node);
  if (!found) return null;
  return found;
}

// What a hit does: a pedestrian falls and the law notices; a police car
// takes the hit and the wanted level climbs; traffic just gets a dent.
export function applyHit(G, found) {
  if (!found) return 'miss';
  if (found.kind === 'ped') {
    found.ref.mesh.visible = false;
    found.ref.down = true;
    addWanted(G, WANTED.hitPed);
    return 'ped';
  }
  if (found.kind === 'police') {
    addWanted(G, WANTED.shoot);
    return 'police';
  }
  return 'traffic';
}

// Raise the wanted level, capped at five stars.
export function addWanted(G, stars) {
  G.wanted = Math.min(5, G.wanted + stars);
  G.lastCrimeAt = G.time;
  G.hud.setWanted(G.wanted);
}
