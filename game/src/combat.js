// Pistol combat: a click fires a hitscan shot from the camera's centre.
// Hitting a pedestrian knocks them down (and the law notices); hitting a police
// car dents it and smokes it. A short tracer and a muzzle flash sell the shot.
export function createCombat(scene) {
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  const tracer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1), tracerMat);
  tracer.visible = false;
  scene.add(tracer);
  const flash = new THREE.PointLight(0xffe08a, 0, 12);
  scene.add(flash);
  return { tracer, flash, cooldown: 0 };
}

export function updateCombat(G, dt) {
  const C = G.combat;
  C.cooldown = Math.max(0, C.cooldown - dt);
  C.tracer.visible = C.cooldown > 0.22;
  C.flash.intensity = C.cooldown > 0.2 ? 6 : 0;
}

export function shoot(G) {
  const C = G.combat;
  if (C.cooldown > 0 || G.mode !== 'play' || G.paused) return;
  C.cooldown = 0.3;
  G.audio.blip(160, 0.09, 'square', 0.16);

  // The shot flies from the camera through the screen's centre.
  const origin = G.camera.position.clone();
  const dir = new THREE.Vector3();
  G.camera.getWorldDirection(dir);
  const end = origin.clone().addScaledVector(dir, 60);
  C.tracer.position.copy(origin).addScaledVector(dir, 30);
  C.tracer.lookAt(end);
  C.tracer.scale.set(1, 1, 60);
  C.flash.position.copy(origin).addScaledVector(dir, 2);

  // Nearest living pedestrian or police car near the ray.
  let best = null;
  let bestDist = 60;
  const toTarget = new THREE.Vector3();
  function test(x, z, kind, ref) {
    toTarget.set(x - origin.x, 0, z - origin.z);
    const along = toTarget.x * dir.x + toTarget.z * dir.z;
    if (along < 2 || along > bestDist) return;
    const perp = Math.hypot(toTarget.x - dir.x * along, toTarget.z - dir.z * along);
    if (perp < 2.5) {
      bestDist = along;
      best = { kind, ref };
    }
  }
  for (const p of G.peds) if (p.alive) test(p.x, p.z, 'ped', p);
  for (const car of G.police.cars) test(car.x, car.z, 'police', car);

  if (best && best.kind === 'ped') {
    best.ref.alive = false;
    best.ref.group.rotation.x = -Math.PI / 2;
    best.ref.group.position.y = 0.3;
    G.player.wanted = Math.min(5, G.player.wanted + 1);
    G.hud.flash('A witness called the PD');
  } else if (best && best.kind === 'police') {
    best.ref.hp -= 34;
    best.ref.smoke = 1;
    if (best.ref.hp <= 0) {
      G.scene.remove(best.ref.group);
      G.police.cars = G.police.cars.filter((c) => c !== best.ref);
      G.player.wanted = Math.min(5, G.player.wanted + 1);
    }
  }
}
