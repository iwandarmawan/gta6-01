// Vehicles: the car mesh factory, arcade driving physics shared by
// the player, traffic and police, and the marina boat — the new
// system this entry adds: a drivable boat on the harbour.

import { TUNING, PALETTE } from './config.js';

const THREE = window.THREE;

// Build a low-poly car from boxes. Returns { group, wheels, frontWheels }.
export function makeCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isPolice ? PALETTE.police : color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1c2836 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.85, 2), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 1.7), glassMat);
  cabin.position.set(-0.2, 1.5, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x161616 });
  const wheels = [];
  const frontWheels = [];
  for (const [wx, wz] of [[1.5, 0.95], [1.5, -0.95], [-1.5, 0.95], [-1.5, -0.95]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
    if (wx > 0) frontWheels.push(wheel);
  }
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6c0, emissive: 0xffe9a0 });
  headMat.emissiveIntensity = 0.5;
  for (const wz of [0.6, -0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.4), headMat);
    head.position.set(2.22, 0.85, wz);
    group.add(head);
  }
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xc02020, emissive: 0x881111 });
  tailMat.emissiveIntensity = 0.5;
  for (const wz of [0.6, -0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.4), tailMat);
    tail.position.set(-2.22, 0.85, wz);
    group.add(tail);
  }
  if (isPolice) {
    const redMat = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff2222 });
    const blueMat = new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x2244ff });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), redMat);
    red.position.set(-0.2, 1.95, 0.45);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), blueMat);
    blue.position.set(-0.2, 1.95, -0.45);
    group.add(blue);
    group.userData.lightBar = { redMat, blueMat };
  }
  group.userData.wheels = wheels;
  group.userData.frontWheels = frontWheels;
  return group;
}

// A drivable car: position, heading, speed and health.
export function makeCar(scene, x, z, heading, color, isPolice) {
  const group = makeCarMesh(color, isPolice);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  return {
    group, isPolice: !!isPolice,
    pos: group.position,
    heading, speed: 0, steer: 0,
    health: TUNING.carHealth, maxHealth: TUNING.carHealth,
    wheels: group.userData.wheels,
    frontWheels: group.userData.frontWheels,
  };
}

// Arcade driving step. throttle -1..1, steer -1..1. Returns the
// impact speed when the car hit something hard this frame.
export function driveCar(car, dt, throttle, steer, handbrake, city) {
  const prev = { x: car.pos.x, z: car.pos.z };
  const speedBefore = car.speed;
  if (throttle > 0) car.speed += TUNING.carAccel * throttle * dt;
  else if (throttle < 0) {
    car.speed += (car.speed > 0.5 ? -TUNING.carBrake : TUNING.carAccel * 0.7) * dt;
  }
  if (handbrake) car.speed -= car.speed * 3.2 * dt;
  car.speed -= car.speed * 0.55 * dt; // drag
  if (car.speed > TUNING.carMaxSpeed) car.speed = TUNING.carMaxSpeed;
  if (car.speed < -TUNING.carMaxReverse) car.speed = -TUNING.carMaxReverse;
  if (Math.abs(car.speed) < 0.05 && throttle === 0) car.speed = 0;
  const steerAmount = steer * TUNING.carTurn * Math.min(1, Math.abs(car.speed) / 12);
  car.heading += steerAmount * Math.sign(car.speed) * dt * (handbrake ? 1.5 : 1);
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  const hit = city.resolveCircle(car.pos, TUNING.carRadius, prev);
  let impact = 0;
  if (hit) {
    impact = Math.abs(speedBefore);
    car.speed *= -0.25;
    car.health -= Math.max(0, (impact - 9) * 1.6);
  }
  car.group.rotation.y = car.heading;
  for (const w of car.wheels) w.rotation.y += car.speed * dt * 1.4;
  for (const w of car.frontWheels) w.rotation.z = -steer * 0.35;
  return { hit, impact };
}

// The marina boat: a small motorboat the player can sail.
export function makeBoat(scene, x, z) {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 2.4), hullMat);
  hull.position.y = 0.3;
  hull.castShadow = true;
  group.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 4), hullMat);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.position.set(3.4, 0.3, 0);
  bow.scale.set(1, 1, 1.9);
  bow.castShadow = true;
  group.add(bow);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.9, 1.6),
    new THREE.MeshLambertMaterial({ color: 0x2e5fa8 }),
  );
  cabin.position.set(-0.4, 1.1, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xc23b2e });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.24, 0.22, 2.44), stripeMat);
  stripe.position.y = 0.62;
  group.add(stripe);
  group.position.set(x, 0, z);
  scene.add(group);
  return {
    group,
    pos: group.position,
    heading: Math.PI / 2,
    speed: 0,
    health: 100,
    maxHealth: 100,
    bobT: 0,
  };
}

// Boat step: throttle -1..1, steer -1..1. Returns true on a hard hit.
export function driveBoat(boat, dt, throttle, steer, city) {
  const prev = { x: boat.pos.x, z: boat.pos.z };
  const speedBefore = boat.speed;
  boat.speed += TUNING.boatAccel * throttle * dt;
  boat.speed -= boat.speed * 0.4 * dt;
  if (boat.speed > TUNING.boatMaxSpeed) boat.speed = TUNING.boatMaxSpeed;
  if (boat.speed < -4) boat.speed = -4;
  boat.heading += steer * TUNING.boatTurn * Math.min(1, Math.abs(boat.speed) / 8) * Math.sign(boat.speed || 1) * dt;
  boat.pos.x += Math.sin(boat.heading) * boat.speed * dt;
  boat.pos.z += Math.cos(boat.heading) * boat.speed * dt;
  const hit = city.resolveBoat(boat.pos, TUNING.boatRadius, prev);
  if (hit) {
    boat.speed *= -0.2;
    boat.health -= Math.max(0, (Math.abs(speedBefore) - 6) * 2);
  }
  boat.bobT += dt;
  boat.group.rotation.y = boat.heading;
  boat.group.position.y = Math.sin(boat.bobT * 1.6) * 0.12;
  boat.group.rotation.z = Math.sin(boat.bobT * 1.1) * 0.03;
  return hit;
}
