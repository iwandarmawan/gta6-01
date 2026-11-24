// combat.js — shooting: tracer + muzzle flash + a simple hit check.
// Shooting at police raises the wanted level; that is the risk/reward loop.
import THREE from 'three';
import { sfx } from './audio.js';

export function shoot(state) {
  const { scene, player, police, peds } = state;
  sfx.shot();
  // Muzzle flash: a brief bright sphere at the player's hand.
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.9 }));
  flash.position.copy(player.position).add(new THREE.Vector3(0, 1.4, 0));
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 70);
  // Tracer: a thin bright line 24 units forward.
  const dir = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
  const from = player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
  const to = from.clone().add(dir.clone().multiplyScalar(24));
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9b0 }));
  scene.add(line);
  setTimeout(() => scene.remove(line), 90);
  // Hit check: nearest police car or ped within a narrow cone ahead.
  let hit = null;
  for (const car of police) {
    const d = car.position.distanceTo(player.position);
    if (d < 26) {
      const toCar = car.position.clone().sub(player.position).normalize();
      if (toCar.dot(dir) > 0.94) { hit = car; break; }
    }
  }
  if (hit) {
    state.wanted = Math.min(5, state.wanted + 1);
    state.toast = 'Police hit! Wanted level up.';
    state.toastAt = performance.now();
  } else {
    for (const p of peds) {
      const d = p.position.distanceTo(player.position);
      if (d < 20) {
        const toPed = p.position.clone().sub(player.position).normalize();
        if (toPed.dot(dir) > 0.96) {
          state.wanted = Math.min(5, state.wanted + 1);
          state.toast = 'Pedestrian hit! Wanted level up.';
          state.toastAt = performance.now();
          break;
        }
      }
    }
  }
}
