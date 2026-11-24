// Vehicles: sedan, pickup, motorcycle, skiff and the police interceptor.
// One factory, one arcade driver. Headlights are emissive boxes plus a fake
// light cone so the night reads without a spotlight per car.
export function makeVehicle(type, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.12 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x0c1018, emissive: 0x05070c, emissiveIntensity: 0.6 });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0x8a94a6 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a8, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide,
  });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const wheels = [];
  function wheel(x, z) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    g.add(w);
    wheels.push(w);
    return w;
  }
  function part(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  if (type === 'moto') {
    part(0.5, 0.5, 2.2, bodyMat, 0, 0.8, 0);
    part(0.4, 0.5, 0.8, darkMat, 0, 1.15, -0.2);
    part(0.9, 0.08, 0.08, chromeMat, 0, 1.25, 0.7);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.18, 10), wheelMat);
    f.rotation.x = Math.PI / 2;
    f.position.set(0, 0.36, 0.95);
    g.add(f);
    const b = f.clone();
    b.position.z = -0.95;
    g.add(b);
    wheels.push(f, b);
    part(0.2, 0.15, 0.1, headMat, 0, 0.9, 1.15);
  } else if (type === 'boat') {
    part(2.2, 0.7, 5.2, bodyMat, 0, 0.7, 0);
    const bow = part(2.0, 0.6, 1.4, bodyMat, 0, 0.7, 3.0);
    bow.rotation.x = -0.35;
    part(1.6, 0.9, 1.8, darkMat, 0, 1.4, -0.4);
    part(0.3, 0.2, 0.1, headMat, -0.8, 0.9, 2.6);
    part(0.3, 0.2, 0.1, headMat, 0.8, 0.9, 2.6);
  } else {
    const len = type === 'pickup' ? 4.6 : 4.2;
    const cabLen = type === 'pickup' ? 1.6 : 2.2;
    const cabZ = type === 'pickup' ? -0.5 : -0.2;
    part(1.9, 0.65, len, bodyMat, 0, 0.65, 0);
    part(1.7, 0.6, cabLen, darkMat, 0, 1.2, cabZ);
    part(0.25, 0.18, 0.1, headMat, -0.65, 0.7, len / 2);
    part(0.25, 0.18, 0.1, headMat, 0.65, 0.7, len / 2);
    part(0.25, 0.18, 0.1, tailMat, -0.65, 0.7, -len / 2);
    part(0.25, 0.18, 0.1, tailMat, 0.65, 0.7, -len / 2);
    // Fake headlight cone so the road ahead glows at night. Kept small and
    // faint: a big cone fills the frame when a car sits near the camera.
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 7, 10, 1, true), coneMat);
    cone.rotation.x = Math.PI / 2 + 0.12;
    cone.position.set(0, 0.5, len / 2 + 3.4);
    g.add(cone);
    wheel(-0.85, len / 2 - 0.8);
    wheel(0.85, len / 2 - 0.8);
    wheel(-0.85, -len / 2 + 0.8);
    wheel(0.85, -len / 2 + 0.8);
    if (type === 'police') {
      part(0.5, 0.22, 0.3, new THREE.MeshBasicMaterial({ color: 0xff2a2a }), -0.35, 1.62, cabZ);
      part(0.5, 0.22, 0.3, new THREE.MeshBasicMaterial({ color: 0x2a6bff }), 0.35, 1.62, cabZ);
      part(1.7, 0.1, 0.9, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 1.56, cabZ + 0.4);
    }
  }
  g.userData.wheels = wheels;
  return g;
}

// Arcade driving: accelerate, brake, steer, collide with building AABBs.
export function driveCar(car, input, dt, colliders, stats) {
  const top = (stats.engine ? 34 : 27) * (car.userData.topMul || 1);
  const accel = 16;
  const brake = 26;
  if (input.up) car.userData.speed = Math.min(top, car.userData.speed + accel * dt);
  else if (input.down) car.userData.speed = Math.max(-10, car.userData.speed - brake * dt);
  else car.userData.speed *= Math.max(0, 1 - 1.6 * dt);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const dir = car.userData.speed >= 0 ? 1 : -1;
  car.userData.heading += steer * 1.9 * dt * dir * Math.min(1, Math.abs(car.userData.speed) / 8);
  const nx = car.position.x + Math.sin(car.userData.heading) * car.userData.speed * dt;
  const nz = car.position.z + Math.cos(car.userData.heading) * car.userData.speed * dt;
  if (!hitsCollider(nx, nz, colliders)) {
    car.position.x = nx;
    car.position.z = nz;
  } else if (dt > 0) {
    // Only slow the car when it is actually moving into something: with
    // dt = 0 (frozen staged shots) the else branch must not eat the speed.
    car.userData.speed *= 0.4;
  }
  car.position.x = Math.max(-215, Math.min(215, car.position.x));
  car.position.z = Math.max(-215, Math.min(215, car.position.z));
  car.rotation.y = car.userData.heading;
  for (const w of car.userData.wheels) w.rotation.x += car.userData.speed * dt * 2;
}

export function hitsCollider(x, z, colliders) {
  for (const c of colliders) {
    if (x > c.minX - 1 && x < c.maxX + 1 && z > c.minZ - 1 && z < c.maxZ + 1) return true;
  }
  return false;
}
