// Combat: click to shoot from the camera's centre. A tracer flashes, the
// nearest cop or pedestrian in the line of fire takes the hit, and the law
// notices. Shooting is a crime — it raises the wanted level.
const THREE = window.THREE;

import { WANTED } from './config.js';

// Ray-sphere test: does the ray (origin, dir) pass within r of (x, y, z)?
// Returns the distance along the ray, or Infinity.
function raySphere(ox, oy, oz, dx, dy, dz, x, y, z, r) {
  const cx = x - ox;
  const cy = y - oy;
  const cz = z - oz;
  const t = cx * dx + cy * dy + cz * dz;
  if (t < 0) return Infinity;
  const d2 = cx * cx + cy * cy + cz * cz - t * t;
  return d2 <= r * r ? t : Infinity;
}

export function shoot(G) {
  const cam = G.camera;
  const origin = cam.position;
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  const from = new THREE.Vector3(G.player.pos.x, 1.4, G.player.pos.z);

  let best = null;
  let bestT = 90;
  for (const u of G.police.targets()) {
    const t = raySphere(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, u.x, 1, u.z, u.r);
    if (t < bestT) {
      bestT = t;
      best = { kind: 'cop', unit: u.unit };
    }
  }
  for (const p of G.peds.list) {
    if (p.down) continue;
    const t = raySphere(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, p.x, 1.2, p.z, 1);
    if (t < bestT) {
      bestT = t;
      best = { kind: 'ped', ped: p };
    }
  }

  const hit = origin.clone().addScaledVector(dir, Math.min(bestT, 90));
  // Tracer line, gone in a blink.
  const geo = new THREE.BufferGeometry().setFromPoints([from, hit]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
  G.scene.add(line);
  G.tracers.push({ line, ttl: 0.09 });
  G.audio.shot();

  if (!best) return;
  if (best.kind === 'cop') {
    best.unit.v.hp -= 34;
    G.addWanted(WANTED.shootCop);
    if (best.unit.v.hp <= 0) {
      best.unit.v.disabled = true;
      best.unit.speed = 0;
      G.toast('Interceptor disabled');
    }
  } else {
    best.ped.down = true;
    best.ped.group.rotation.z = Math.PI / 2;
    best.ped.group.position.y = 0.4;
    G.addWanted(WANTED.shootPed);
    G.toast('A pedestrian is down — the cops saw that');
  }
}
