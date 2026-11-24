// traffic.js — ambient traffic cars looping the wet streets.
import { makeVehicle, placeCar } from './cars.js';
import { WORLD } from './config.js';

export function makeTraffic(scene, rand) {
  const cars = [];
  const streets = [];
  for (let s = WORLD.streetMin + 6; s <= WORLD.streetMax + 6; s += WORLD.streetStep) streets.push(s);
  for (let i = 0; i < 10; i++) {
    const kind = rand() < 0.6 ? 'sedan' : 'pickup';
    const v = makeVehicle(kind);
    // Recolour traffic so the player's red sedan stays distinct.
    v.group.children.forEach((m) => {
      if (m.material && m.material.color && m.geometry && m.geometry.type === 'BoxGeometry' && m.position.y === 0.75) {
        m.material = m.material.clone();
        m.material.color.setHex([0x3a5a8a, 0x5a5a5a, 0x7a6a3a, 0x2a4a3a][i % 4]);
      }
    });
    scene.add(v.group);
    const vertical = rand() < 0.5;
    const street = streets[Math.floor(rand() * streets.length)];
    const along = (rand() - 0.5) * 280;
    const dir = rand() < 0.5 ? 1 : -1;
    placeCar(v, vertical ? street : along, vertical ? along : street, vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2), 0);
    cars.push({ v, vertical, street, dir, speed: 8 + rand() * 6 });
  }
  return {
    cars,
    update(dt) {
      if (dt <= 0) return;
      for (const c of cars) {
        const step = c.speed * dt * (c.dir > 0 ? 1 : -1);
        if (c.vertical) {
          c.v.group.position.z += step;
          if (c.v.group.position.z > 150) c.v.group.position.z = -150;
          if (c.v.group.position.z < -150) c.v.group.position.z = 150;
        } else {
          c.v.group.position.x += step;
          if (c.v.group.position.x > 140) c.v.group.position.x = -150;
          if (c.v.group.position.x < -150) c.v.group.position.x = 140;
        }
      }
    },
  };
}
