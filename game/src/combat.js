// Combat: a short tracer shot. Firing near police raises the wanted level;
// a hit on a police car slows it. Kept deliberately simple and visible.
import THREE from 'three';

export function makeCombat(scene) {
  const mat = new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0 });
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geo, mat);
  scene.add(line);
  return { line, mat, ttl: 0 };
}

export function fireShot(combat, origin, heading, police) {
  const dir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  const end = origin.clone().add(dir.multiplyScalar(26));
  end.y = 1.2;
  const pts = [origin.clone().setY(1.2), end];
  combat.line.geometry.setFromPoints(pts);
  combat.mat.opacity = 1;
  combat.ttl = 0.12;
  // A hit on the nearest police car within the cone slows it and raises heat.
  let hit = false;
  for (const c of police.cars) {
    const dx = c.x - origin.x, dz = c.z - origin.z;
    const along = dx * Math.sin(heading) + dz * Math.cos(heading);
    const side = Math.abs(dx * Math.cos(heading) - dz * Math.sin(heading));
    if (along > 0 && along < 26 && side < 2.5) { c.speed *= 0.5; hit = true; }
  }
  return hit;
}

export function updateCombat(combat, dt) {
  if (combat.ttl > 0) {
    combat.ttl -= dt;
    combat.mat.opacity = Math.max(0, combat.ttl / 0.12);
  }
}
