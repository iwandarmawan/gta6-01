// combat.js — on-foot shooting: hitscan tracer, cooldown, police response.
import THREE from './three-shim.js';

export function createCombat(scene) {
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0 });
  const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
  const tracer = new THREE.Line(tracerGeo, tracerMat);
  tracer.frustumCulled = false;
  scene.add(tracer);
  let cooldown = 0;
  let tracerLeft = 0;
  return {
    cooldownLeft() { return cooldown; },
    shoot(from, heading, police, audio, onWanted) {
      if (cooldown > 0) return false;
      cooldown = 0.3;
      tracerLeft = 0.08;
      const fx = Math.sin(heading), fz = Math.cos(heading);
      const pts = [new THREE.Vector3(from.x, 1.4, from.z), new THREE.Vector3(from.x + fx * 40, 1.4, from.z + fz * 40)];
      tracerGeo.setFromPoints(pts);
      tracerMat.opacity = 0.9;
      audio.shot();
      // Hit the nearest police car roughly ahead.
      let best = null, bestD = 40;
      for (const p of police.cars) {
        const dx = p.v.group.position.x - from.x, dz = p.v.group.position.z - from.z;
        const d = Math.hypot(dx, dz);
        const dot = (dx * fx + dz * fz) / (d || 1);
        if (d < bestD && dot > 0.85) { best = p; bestD = d; }
      }
      if (best) { best.v.health -= 1; onWanted(1); }
      return true;
    },
    update(dt) {
      cooldown = Math.max(0, cooldown - dt);
      if (tracerLeft > 0) {
        tracerLeft -= dt;
        if (tracerLeft <= 0) tracerMat.opacity = 0;
      }
    },
  };
}
