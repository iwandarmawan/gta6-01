// Cars: boxy low-poly bodies in several colours and shapes, plus the
// player's arcade driving. A car is a THREE.Group with a body, a cabin, four
// wheels and two headlights; the group carries its live state in userData so
// traffic, police and the player all drive the same shape of object.
const THREE = window.THREE;
import { CAR } from './config.js';
import { resolveCircle } from './city.js';

const BODY_COLORS = [0xd84a4a, 0x4a7fd8, 0xf2c94c, 0x39d353, 0xe8e8e8, 0x2b2b2b, 0xd87fd8, 0x7fd8d0];
const BODY_SHAPES = ['sedan', 'hatch', 'pickup', 'van'];

/** Build a car mesh. `shape` picks the body style; `color` the paint. */
export function createCarMesh(color, shape) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const len = shape === 'van' ? 5.2 : shape === 'pickup' ? 4.8 : 4.4;
  const bodyH = shape === 'van' ? 1.5 : 0.85;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, bodyH, len), paint);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);
  if (shape !== 'pickup') {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, shape === 'van' ? 3.6 : 2.2), glass);
    cabin.position.set(0, bodyH + 0.65, shape === 'van' ? -0.3 : -0.2);
    cabin.castShadow = true;
    group.add(cabin);
  } else {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 2.2), dark);
    bed.position.set(0, 1.05, -1.1);
    group.add(bed);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  for (const lx of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
    lamp.position.set(lx, 0.8, len / 2 + 0.02);
    group.add(lamp);
  }
  // Brake lights: they glow red while the driver is on the brakes.
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0x550000 });
  const brakeL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), brakeMat);
  brakeL.position.set(-0.7, 0.8, -len / 2 - 0.02);
  group.add(brakeL);
  const brakeR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), brakeMat.clone());
  brakeR.position.set(0.7, 0.8, -len / 2 - 0.02);
  group.add(brakeR);
  // Damage smoke: a grey cone that appears once the car is badly hurt.
  const smoke = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 2.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x777777, transparent: true, opacity: 0.55 }),
  );
  smoke.position.set(0, 2.2, len / 2 - 0.6);
  smoke.visible = false;
  group.add(smoke);
  group.userData = { wheels, smoke, len, shape, brakeL, brakeR };
  return group;
}

export function randomCar(rng) {
  return { color: rng.pick(BODY_COLORS), shape: rng.pick(BODY_SHAPES) };
}

/** A fresh player car at (x, z) facing `angle` (radians, 0 = +x east). */
export function createPlayerCar(scene, x, z, angle, color, shape) {
  const mesh = createCarMesh(color, shape);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = -angle;
  scene.add(mesh);
  return {
    mesh, x, z, angle,
    speed: 0, steer: 0, damage: 0,
    color, shape,
  };
}

/**
 * Arcade driving: W/S accelerate and brake/reverse, A/D steer (stronger at
 * low speed), Space handbrakes. Buildings stop the car with a slide and a
 * damage tick; hard hits add damage and smoke.
 */
export function stepPlayerCar(G, car, input, dt) {
  const up = input.held('up');
  const down = input.held('down');
  const left = input.held('left');
  const right = input.held('right');
  const handbrake = input.held('jump');
  if (up) car.speed += CAR.accel * dt;
  if (down) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.accel * 0.7) * dt;
  if (!up && !down) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
  // A wrecked car loses its legs: damage caps the top speed.
  const damageFactor = 1 - Math.min(0.5, car.damage / 200);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed * damageFactor, car.speed));
  const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, 8 * dt);
  const speedFactor = Math.min(1, Math.abs(car.speed) / 12);
  car.angle += car.steer * CAR.steer * speedFactor * Math.sign(car.speed) * dt * (car.speed < 0 ? -1 : 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const nz = car.z + Math.sin(car.angle) * car.speed * dt;
  const fixed = resolveCircle(G.city, nx, nz, CAR.radius);
  if (fixed.x !== nx || fixed.z !== nz) {
    // A building stopped us: keep the slide, lose speed, take damage on a hard hit.
    if (Math.abs(car.speed) > 14) {
      car.damage = Math.min(100, car.damage + CAR.damagePerHit);
      G.audio.crash();
      G.shake = 0.35;
    }
    car.speed *= 0.35;
  }
  car.x = fixed.x;
  car.z = fixed.z;
  // Soft city bounds: the sea and the map edge push back.
  car.x = Math.max(G.city.bounds.minX, Math.min(G.city.bounds.maxX - 40, car.x));
  car.z = Math.max(G.city.bounds.minZ, Math.min(G.city.bounds.maxZ, car.z));
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = -car.angle;
  const spin = car.speed * dt * 2.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  const smoky = car.damage >= CAR.smokeAt;
  car.mesh.userData.smoke.visible = smoky;
  if (smoky) {
    car.mesh.userData.smoke.rotation.y += dt * 3;
    car.mesh.userData.smoke.scale.y = 1 + Math.sin(G.time * 9) * 0.15;
  }
  // Brake lights glow while the driver is on the brakes or the handbrake.
  const braking = down || handbrake;
  car.mesh.userData.brakeL.material.color.setHex(braking ? 0xff2a2a : 0x550000);
  car.mesh.userData.brakeR.material.color.setHex(braking ? 0xff2a2a : 0x550000);
  return car;
}
