// Combat: hitscan shooting with a tracer and muzzle flash. Shooting in
// public raises the wanted level; hitting a pedestrian or a police car
// raises it faster.
export function makeCombat(scene) {
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 });
  const tracer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1), tracerMat);
  tracer.visible = false;
  scene.add(tracer);
  return { tracer, cooldown: 0, flash: 0 };
}

export function shoot(combat, origin, dir, targets, onCrime) {
  if (combat.cooldown > 0) return false;
  combat.cooldown = 0.28;
  combat.flash = 0.06;
  const rangeMax = 60;
  let hit = null;
  let hitDist = rangeMax;
  for (const t of targets) {
    const to = { x: t.position.x - origin.x, z: t.position.z - origin.z };
    const along = to.x * dir.x + to.z * dir.z;
    if (along < 0 || along > rangeMax) continue;
    const perp = Math.abs(to.x * dir.z - to.z * dir.x);
    if (perp < 1.6 && along < hitDist) {
      hit = t;
      hitDist = along;
    }
  }
  const end = {
    x: origin.x + dir.x * hitDist,
    y: 1.3,
    z: origin.z + dir.z * hitDist,
  };
  const tr = combat.tracer;
  tr.visible = true;
  tr.position.set((origin.x + end.x) / 2, 1.3, (origin.z + end.z) / 2);
  tr.scale.z = hitDist;
  tr.lookAt(end.x, 1.3, end.z);
  if (hit) {
    hit.userData.hp = (hit.userData.hp ?? 3) - 1;
    onCrime(1);
    if (hit.userData.hp <= 0) {
      hit.userData.dead = true;
      onCrime(1);
    }
  } else {
    onCrime(0);
  }
  return !!hit;
}

export function updateCombat(combat, dt) {
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  combat.flash = Math.max(0, combat.flash - dt);
  if (combat.flash <= 0) combat.tracer.visible = false;
}
