// Builds the night city: ground, sea, roads, lit buildings, street lamps, neon
// signs, the lighthouse, marina, airfield, Palm Plaza and Rico's Garage.
// Returns the static colliders (AABBs) and the animated bits (lighthouse beam).
import { mulberry32, range, pick, int } from './rng.js';
import { WORLD, POI, NIGHT } from './config.js';

function windowTexture(rng, base) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  // Lit windows: warm most of the time, a few cool, the rest dark.
  for (let y = 8; y < 248; y += 18) {
    for (let x = 8; x < 120; x += 16) {
      const r = rng();
      if (r < 0.52) g.fillStyle = '#ffc46b';
      else if (r < 0.62) g.fillStyle = '#7fd4ff';
      else g.fillStyle = '#0c1220';
      g.fillRect(x, y, 10, 12);
    }
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

function textSign(text, w, h, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = fg;
  g.font = 'bold 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  return new THREE.CanvasTexture(c);
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export function buildCity(scene) {
  const rng = mulberry32(20261124);
  const colliders = [];
  const animated = { beam: null, beam2: null };

  const lambert = (color, emissive, ei) =>
    new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000, emissiveIntensity: ei || 1 });

  // Ground, sea and beach.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 460),
    lambert(NIGHT.ground),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 80),
    new THREE.MeshLambertMaterial({ color: NIGHT.sea, emissive: 0x0a2438, emissiveIntensity: 0.6 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, WORLD.seaZ - 40);
  scene.add(sea);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 20),
    lambert(NIGHT.sand),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, -141);
  scene.add(sand);

  // Moon disc + stars.
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(14, 24),
    new THREE.MeshBasicMaterial({ color: 0xf4f0d8, fog: false }),
  );
  moon.position.set(-120, 150, -320);
  moon.lookAt(0, 0, 0);
  scene.add(moon);
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 260; i++) {
    starPos.push(range(rng, -420, 420), range(rng, 90, 320), range(rng, -420, -160));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.6, fog: false })));

  // Roads: one coast road along the beach, a grid of streets in town.
  const roadMat = lambert(NIGHT.road);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xc8b25a });
  function road(x, z, w, d) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.03, z);
    scene.add(r);
    // Centre dashes.
    const n = Math.floor(Math.max(w, d) / 8);
    for (let i = 0; i < n; i++) {
      const t = -Math.max(w, d) / 2 + 4 + i * 8;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      if (w > d) dash.position.set(t + x, 0.05, z);
      else dash.position.set(x, 0.05, t + z);
      scene.add(dash);
    }
  }
  road(0, WORLD.coastRoadZ, 440, 10);
  const streetsX = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
  const streetsZ = [-100, -60, -20, 20, 60, 100, 140];
  for (const x of streetsX) road(x, 20, 8, 240);
  for (const z of streetsZ) road(0, z, 320, 8);

  // Buildings with lit windows, in the blocks between streets.
  const facades = ['#1c2233', '#232a3d', '#1a2030', '#262033'];
  const winTex = facades.map((f) => windowTexture(rng, f));
  const neonMats = NIGHT.neon.map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const inAirfield = (x, z) => x > -205 && x < -95 && z > 95 && z < 205;
  const inMarina = (x, z) => x > 115 && x < 205 && z > -205 && z < -115;
  const nearPlaza = (x, z) => Math.hypot(x - POI.plaza.x, z - POI.plaza.z) < 30;
  const nearGarage = (x, z) => Math.hypot(x - POI.garage.x, z - POI.garage.z) < 22;
  for (let bi = 0; bi < streetsX.length - 1; bi++) {
    for (let bj = 0; bj < streetsZ.length - 1; bj++) {
      const cx = (streetsX[bi] + streetsX[bi + 1]) / 2;
      const cz = (streetsZ[bj] + streetsZ[bj + 1]) / 2;
      if (inAirfield(cx, cz) || inMarina(cx, cz) || nearPlaza(cx, cz) || nearGarage(cx, cz)) continue;
      const n = int(rng, 1, 3);
      for (let k = 0; k < n; k++) {
        const w = range(rng, 12, 22);
        const d = range(rng, 12, 22);
        const h = range(rng, 9, 34);
        const x = cx + range(rng, -8, 8);
        const z = cz + range(rng, -8, 8);
        const tex = pick(rng, winTex);
        const mat = new THREE.MeshLambertMaterial({
          map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9,
        });
        const b = box(w, h, d, mat, x, h / 2, z);
        scene.add(b);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
        // Roof cap.
        scene.add(box(w + 0.6, 0.5, d + 0.6, lambert(0x0a0d16), x, h + 0.25, z));
        // Neon sign on some taller buildings.
        if (h > 20 && rng() < 0.5) {
          const sign = box(w * 0.7, 1.2, 0.4, pick(rng, neonMats), x, h * 0.72, z + d / 2 + 0.3);
          scene.add(sign);
        }
      }
    }
  }

  // Street lamps along the coast road and around the plaza.
  const lampPole = lambert(0x11141c);
  const lampGlow = new THREE.MeshBasicMaterial({ color: NIGHT.lamp });
  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xffd27a, transparent: true, opacity: 0.2, depthWrite: false,
  });
  function lamp(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), lampPole);
    pole.position.y = 3;
    g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampGlow);
    bulb.position.y = 6.1;
    g.add(bulb);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(6, 16), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.06;
    g.add(pool);
    g.position.set(x, 0, z);
    scene.add(g);
  }
  for (let x = -200; x <= 200; x += 40) lamp(x, WORLD.coastRoadZ - 6);
  for (let x = -200; x <= 200; x += 40) lamp(x, WORLD.coastRoadZ + 6);
  for (let a = 0; a < 8; a++) {
    const t = (a / 8) * Math.PI * 2;
    lamp(Math.cos(t) * 22, Math.sin(t) * 22);
  }

  // Palm trees along the coast and plaza.
  const trunkMat = lambert(0x3a2c1c);
  const frondMat = lambert(0x0e3d1e, 0x062a12, 0.7);
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = 0.08;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 4), frondMat);
      const a = (i / 6) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
      frond.rotation.z = Math.cos(a) * 1.1;
      frond.rotation.x = -Math.sin(a) * 1.1;
      g.add(frond);
    }
    g.position.set(x, 0, z);
    scene.add(g);
  }
  for (let x = -190; x <= 190; x += 38) palm(x, -128);
  for (let a = 0; a < 6; a++) {
    const t = (a / 6) * Math.PI * 2;
    palm(Math.cos(t) * 16, Math.sin(t) * 16);
  }

  // Lighthouse on the north-west point, beam sweeping the dark.
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 4.5, 26, 12),
    new THREE.MeshLambertMaterial({ color: 0xd8d2c4, emissive: 0x555044, emissiveIntensity: 0.5 }),
  );
  tower.position.y = 13;
  lh.add(tower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.8, 4, 12),
    lambert(0x8c2f2f, 0x3c1010, 0.8),
  );
  band.position.y = 16;
  lh.add(band);
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 3, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  );
  lampRoom.position.y = 27.5;
  lh.add(lampRoom);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(7, 90, 12, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(45, 27.5, 0);
  lh.add(beam);
  const beam2 = beam.clone();
  beam2.rotation.z = -Math.PI / 2;
  beam2.position.set(-45, 27.5, 0);
  lh.add(beam2);
  lh.position.set(POI.lighthouse.x, 0, POI.lighthouse.z);
  scene.add(lh);
  animated.beam = beam;
  animated.beam2 = beam2;
  colliders.push({
    minX: POI.lighthouse.x - 5, maxX: POI.lighthouse.x + 5,
    minZ: POI.lighthouse.z - 5, maxZ: POI.lighthouse.z + 5,
  });

  // Marina: wooden docks into the sea, moored boats, a lit MARINA sign.
  const dockMat = lambert(0x4a3823);
  for (const dx of [-12, 0, 12]) {
    scene.add(box(3, 0.6, 26, dockMat, POI.marina.x + dx, 0.4, -163));
    colliders.push({
      minX: POI.marina.x + dx - 1.5, maxX: POI.marina.x + dx + 1.5,
      minZ: -176, maxZ: -150,
    });
  }
  const signMat = new THREE.MeshBasicMaterial({ map: textSign('MARINA', 256, 64, '#7fd4ff', '#0a1a2e') });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), signMat);
  sign.position.set(POI.marina.x, 7, -146);
  scene.add(sign);
  scene.add(box(14.6, 4, 0.4, lambert(0x0a1a2e), POI.marina.x, 7, -146.3));

  // Airfield: runway, hangar, windsock, tower.
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 130),
    lambert(0x14161c),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(POI.airfield.x, 0.04, POI.airfield.z);
  scene.add(runway);
  for (let i = -5; i <= 5; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1, 6), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(POI.airfield.x, 0.06, POI.airfield.z + i * 11);
    scene.add(dash);
  }
  scene.add(box(24, 10, 18, lambert(0x2a2f3a, 0x11151f, 0.8), POI.airfield.x + 30, 5, POI.airfield.z));
  colliders.push({
    minX: POI.airfield.x + 18, maxX: POI.airfield.x + 42,
    minZ: POI.airfield.z - 9, maxZ: POI.airfield.z + 9,
  });
  const sockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 9, 6), lampPole);
  sockPole.position.set(POI.airfield.x - 20, 4.5, POI.airfield.z - 40);
  scene.add(sockPole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 3.4, 8),
    new THREE.MeshBasicMaterial({ color: 0xff7a3c }),
  );
  sock.rotation.z = Math.PI / 2 - 0.3;
  sock.position.set(POI.airfield.x - 18.4, 8.6, POI.airfield.z - 40);
  scene.add(sock);

  // Palm Plaza: fountain, benches, neon palms.
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7.5, 1.2, 20),
    lambert(0x2c3444, 0x0e1626, 0.8),
  );
  basin.position.set(0, 0.6, 0);
  scene.add(basin);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(6.4, 20),
    new THREE.MeshBasicMaterial({ color: 0x2f7fb8 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 1.25, 0);
  scene.add(water);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 4, 8), lambert(0x3a4356));
  col.position.set(0, 3, 0);
  scene.add(col);
  colliders.push({ minX: -8, maxX: 8, minZ: -8, maxZ: 8 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    scene.add(box(3, 0.8, 1, lambert(0x4a3823), Math.cos(a) * 12, 0.4, Math.sin(a) * 12));
  }

  // Rico's Garage: open-front workshop with a glowing sign.
  const g = new THREE.Group();
  g.add(box(20, 8, 14, lambert(0x323a4a, 0x141a26, 0.7), 0, 4, 0));
  g.add(box(20, 1, 14.6, lambert(0x1a2030), 0, 8.4, 0));
  const gsign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 4),
    new THREE.MeshBasicMaterial({ map: textSign("RICO'S GARAGE", 256, 64, '#ffb347', '#14100a') }),
  );
  gsign.position.set(0, 6.5, 7.2);
  g.add(gsign);
  // Work light spilling out of the open front.
  const spill = new THREE.Mesh(
    new THREE.CircleGeometry(9, 16),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.1, depthWrite: false }),
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, 0.07, 10);
  g.add(spill);
  g.position.set(POI.garage.x, 0, POI.garage.z);
  scene.add(g);
  colliders.push({
    minX: POI.garage.x - 10, maxX: POI.garage.x + 10,
    minZ: POI.garage.z - 7, maxZ: POI.garage.z + 7,
  });

  return { colliders, animated };
}
