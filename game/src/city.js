// Solmar Bay at dusk: the static city. Sea on the west, beach and coast road,
// a street grid, marina north-west, airfield east, lighthouse point south-west,
// Palm Plaza at the centre, Rico's Garage beside it. All geometry is seeded,
// so the same seed builds the same city every time.
const THREE = window.THREE;

import { STREETS_X, STREETS_Z, CITY, COAST, POIS, SUNSET } from './config.js';
import { makeTextTexture } from './render.js';
import { makeVehicle } from './cars.js';

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}
function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

export function buildCity(scene, rng) {
  const colliders = [];
  const g = new THREE.Group();
  scene.add(g);

  function box(w, h, d, color, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat ?? lambert(color));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }
  function flat(w, d, color, x, z, y, mat) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat ?? lambert(color));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }

  // Ground, sea, beach, coast road.
  flat(760, 760, SUNSET.ground, 0, 0, 0);
  flat(560, 800, SUNSET.sea, -420, 0, -0.4);
  // Sun glitter on the water, west toward the setting sun.
  const glitter = flat(500, 70, SUNSET.seaGlitter, -400, -40, -0.2, basic(SUNSET.seaGlitter, { transparent: true, opacity: 0.22 }));
  flat(28, 800, SUNSET.beach, -154, 0, 0.02);
  flat(14, 400, SUNSET.road, COAST.roadX, 0, 0.03);
  for (let z = -195; z <= 195; z += 10) flat(0.5, 4, SUNSET.roadLine, COAST.roadX, z, 0.05);

  // Street grid.
  for (const x of STREETS_X) flat(8, 400, SUNSET.road, x, 0, 0.03);
  for (const z of STREETS_Z) flat(280, 8, SUNSET.road, 0, z, 0.03);
  for (let z = -195; z <= 195; z += 10) flat(0.5, 4, SUNSET.roadLine, 0, z, 0.05);
  for (let x = -135; x <= 135; x += 10) flat(4, 0.5, SUNSET.roadLine, x, 0, 0.05);

  // Buildings, one or two per block, skipped at the plaza and the garage block.
  const blocks = [];
  for (let i = 0; i < STREETS_X.length - 1; i++) {
    for (let j = 0; j < STREETS_Z.length - 1; j++) {
      blocks.push([STREETS_X[i], STREETS_X[i + 1], STREETS_Z[j], STREETS_Z[j + 1]]);
    }
  }
  for (const [x0, x1, z0, z1] of blocks) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    if (Math.abs(cx) < 22 && Math.abs(cz) < 22) continue; // Palm Plaza
    if (x0 === 0 && z0 === 0) continue; // Rico's Garage block
    const bw = x1 - x0 - 8;
    const bd = z1 - z0 - 8;
    const n = rng.chance(0.4) ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const w = n === 2 ? bw / 2 - 2 : bw;
      const d = n === 2 ? bd : bd - 2;
      const bx = n === 2 ? cx + (k === 0 ? -bw / 4 : bw / 4) : cx;
      const bz = cz;
      const h = rng.range(8, 14) + Math.max(0, 24 - Math.abs(cx) * 0.12) * rng.next();
      const color = rng.pick(SUNSET.building);
      box(w, h, d, color, bx, h / 2, bz);
      box(w + 0.6, 0.8, d + 0.6, SUNSET.roof, bx, h + 0.4, bz);
      colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
      // Lit windows on the sunset (west) face and the south face: dusk lights on.
      if (h > 14) {
        const floors = Math.floor(h / 5);
        for (let f = 0; f < floors; f++) {
          if (!rng.chance(0.6)) continue;
          const wy = 3 + f * 5;
          const lit = rng.chance(0.7);
          const win = new THREE.Mesh(
            new THREE.PlaneGeometry(1.4, 2),
            basic(lit ? SUNSET.windowLit : SUNSET.windowDark),
          );
          win.position.set(bx - w / 2 - 0.05, wy, bz + rng.range(-d / 3, d / 3));
          win.rotation.y = -Math.PI / 2;
          g.add(win);
          if (rng.chance(0.5)) {
            const win2 = new THREE.Mesh(
              new THREE.PlaneGeometry(1.4, 2),
              basic(lit ? SUNSET.windowLit : SUNSET.windowDark),
            );
            win2.position.set(bx + rng.range(-w / 3, w / 3), wy, bz + d / 2 + 0.05);
            g.add(win2);
          }
        }
      }
    }
  }

  // Palms: beach, plaza ring, a few street corners.
  function palm(x, z, s = 1) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.32 * s, 5 * s, 6), lambert(SUNSET.palmTrunk));
    trunk.position.set(x, 2.5 * s, z);
    g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 2.4 * s, 5), lambert(SUNSET.palmLeaf));
      const a = (i / 3) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 0.9 * s, 5.4 * s, z + Math.sin(a) * 0.9 * s);
      leaf.rotation.z = Math.cos(a) * 0.7;
      leaf.rotation.x = -Math.sin(a) * 0.7;
      g.add(leaf);
    }
  }
  for (let z = -180; z <= 180; z += 24) palm(-141, z, rng.range(0.9, 1.2));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    palm(Math.cos(a) * 13, Math.sin(a) * 13, 1.1);
  }
  for (let i = 0; i < 8; i++) {
    const x = rng.pick(STREETS_X) + 6;
    const z = rng.pick(STREETS_Z) + 6;
    if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
    palm(x, z, 1);
  }

  // Streetlights: poles with warm lamps, just coming on at dusk.
  function streetlight(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6, 6), lambert(0x2a2a33));
    pole.position.set(x, 3, z);
    g.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), basic(SUNSET.lamp));
    lamp.position.set(x, 6.2, z);
    g.add(lamp);
  }
  for (let z = -160; z <= 160; z += 40) streetlight(5, z);
  for (let x = -120; x <= 120; x += 40) streetlight(x, 5);
  for (let z = -180; z <= 180; z += 36) streetlight(-141, z);

  // Lighthouse point, south-west, on the rocks: white tower, red band, beam.
  const lh = POIS.lighthouse;
  box(10, 3, 8, 0x4a4a55, lh.x + 2, 1.2, lh.z + 2);
  box(8, 2.5, 7, 0x55555f, lh.x - 3, 1, lh.z - 3);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.5, 26, 12), lambert(SUNSET.lighthouseWhite));
  tower.position.set(lh.x, 14, lh.z);
  g.add(tower);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 4, 12), lambert(SUNSET.lighthouseRed));
  band.position.set(lh.x, 17, lh.z);
  g.add(band);
  const lampTop = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), basic(0xffe9a8));
  lampTop.position.set(lh.x, 28, lh.z);
  g.add(lampTop);
  const beamPivot = new THREE.Group();
  beamPivot.position.set(lh.x, 28, lh.z);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const dir of [0, Math.PI]) {
    const beam = new THREE.Mesh(new THREE.ConeGeometry(5, 130, 12, 1, true), beamMat);
    beam.rotation.z = -Math.PI / 2 + dir;
    beam.position.x = Math.cos(dir) * 65;
    beamPivot.add(beam);
  }
  g.add(beamPivot);
  colliders.push({ minX: lh.x - 6, maxX: lh.x + 6, minZ: lh.z - 6, maxZ: lh.z + 6 });

  // Marina, north-west: three docks into the sea, a moored skiff, MARINA sign.
  const ma = POIS.marina;
  for (const dz of [-12, 0, 12]) {
    box(34, 1, 2.5, 0x6a4a2a, ma.x - 17, 0.4, ma.z + dz);
    box(1, 2.5, 1, 0x4a3220, ma.x - 32, 1, ma.z + dz);
  }
  box(6, 1.6, 3, 0xe8e4da, ma.x - 20, 0.6, ma.z + 12);
  box(4, 1, 2, 0x8a4a3a, ma.x - 20, 1.6, ma.z + 12);
  const marinaSign = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.5),
    new THREE.MeshBasicMaterial({ map: makeTextTexture('MARINA', { bg: '#1a2a5a', font: 'bold 72px sans-serif' }) }),
  );
  marinaSign.position.set(-148, 5, ma.z - 14);
  marinaSign.rotation.y = Math.PI / 2;
  g.add(marinaSign);
  box(0.4, 5, 0.4, 0x2a2a33, -148, 2.5, ma.z - 20);
  box(0.4, 5, 0.4, 0x2a2a33, -148, 2.5, ma.z - 8);

  // SOLMAR BAY welcome sign on the coast road.
  const baySign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 4),
    new THREE.MeshBasicMaterial({ map: makeTextTexture('SOLMAR BAY', { bg: '#7a2a3a', font: 'bold 64px sans-serif' }) }),
  );
  baySign.position.set(-141, 6, 60);
  baySign.rotation.y = Math.PI / 2;
  g.add(baySign);
  box(0.4, 6, 0.4, 0x2a2a33, -141, 3, 54);
  box(0.4, 6, 0.4, 0x2a2a33, -141, 3, 66);

  // Airfield, east: runway, hangar, windsock, tower.
  const af = POIS.airfield;
  flat(24, 130, 0x2a2a33, af.x, af.z, 0.04);
  for (let z = af.z - 55; z <= af.z + 55; z += 12) flat(1, 5, 0xe8e4da, af.x, z, 0.06);
  box(22, 9, 16, 0x8a7a6a, af.x + 24, 4.5, af.z + 30);
  box(23, 1, 17, 0x5a4a42, af.x + 24, 9.4, af.z + 30);
  colliders.push({ minX: af.x + 13, maxX: af.x + 35, minZ: af.z + 22, maxZ: af.z + 38 });
  const sockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 6), lambert(0x2a2a33));
  sockPole.position.set(af.x - 18, 4, af.z - 50);
  g.add(sockPole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 8), lambert(0xe07a1e));
  sock.rotation.z = Math.PI / 2;
  sock.position.set(af.x - 16.5, 7.6, af.z - 50);
  g.add(sock);
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 18, 8), lambert(0x9a8a7a));
  tw.position.set(af.x + 18, 9, af.z - 30);
  g.add(tw);
  box(7, 4, 7, 0x6a7a8a, af.x + 18, 20, af.z - 30);
  colliders.push({ minX: af.x + 14, maxX: af.x + 22, minZ: af.z - 34, maxZ: af.z - 26 });

  // Palm Plaza fountain and benches.
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.5, 1.2, 20), lambert(0x9a8a7a));
  basin.position.set(0, 0.6, 0);
  g.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(7.3, 20), lambert(0x4a6a9a));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 1.15, 0);
  g.add(water);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.3, 3, 10), lambert(0x9a8a7a));
  col.position.set(0, 2.4, 0);
  g.add(col);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), basic(SUNSET.lamp));
  orb.position.set(0, 4.4, 0);
  g.add(orb);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    box(3, 0.8, 1, 0x6a5a4a, Math.cos(a) * 11, 0.4, Math.sin(a) * 11);
  }
  colliders.push({ minX: -8.5, maxX: 8.5, minZ: -8.5, maxZ: 8.5 });

  // Rico's Garage, with a parked pickup outside.
  const ga = POIS.garage;
  box(16, 6, 12, 0x7a4a3a, ga.x, 3, ga.z);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(10, 4.5), basic(0x1a1218));
  door.position.set(ga.x - 8.05, 2.4, ga.z);
  door.rotation.y = -Math.PI / 2;
  g.add(door);
  const garageSign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 2.5),
    new THREE.MeshBasicMaterial({ map: makeTextTexture("RICO'S GARAGE", { bg: '#2a4a2a', font: 'bold 52px sans-serif' }) }),
  );
  garageSign.position.set(ga.x - 8.1, 5.6, ga.z);
  garageSign.rotation.y = -Math.PI / 2;
  g.add(garageSign);
  colliders.push({ minX: ga.x - 8, maxX: ga.x + 8, minZ: ga.z - 6, maxZ: ga.z + 6 });
  const parked = makeVehicle('pickup', 0xe07a1e);
  parked.group.position.set(ga.x - 2, 0, ga.z + 12);
  parked.group.rotation.y = Math.PI / 2;
  g.add(parked.group);

  function update(dt, t) {
    beamPivot.rotation.y = t * 0.5;
    glitter.material.opacity = 0.18 + 0.06 * Math.sin(t * 0.7);
  }

  return { colliders, update };
}
