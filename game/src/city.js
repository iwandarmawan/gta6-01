// Solmar Bay — Foggy Morning: builds the city, the sea, the lighthouse,
// the marina, the airfield and the fog itself.
import THREE from 'three';
import { COLORS, SEA_EDGE, PLAZA, GARAGE, LIGHTHOUSE, MARINA, AIRFIELD, LAYOUT_SEED, GRID_OFFSET } from './config.js';
import { makeRng } from './rng.js';

// Canvas texture: a tower face with lit windows glowing through the fog.
function windowTexture(rng, warm) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3d4750';
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 12) {
      const lit = rng.next();
      if (lit < 0.55) {
        g.fillStyle = warm && rng.next() < 0.7 ? '#ffd98a' : '#9fc4e8';
        g.globalAlpha = 0.65 + rng.next() * 0.35;
      } else {
        g.fillStyle = '#20262c';
        g.globalAlpha = 1;
      }
      g.fillRect(x, y, 7, 8);
    }
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene) {
  const rng = makeRng(LAYOUT_SEED);
  const refs = { buildings: [], colliders: [], lamps: [], trafficSpots: [] };

  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.FogExp2(COLORS.fog, 0.011);

  scene.add(new THREE.HemisphereLight(0xcfd8de, 0x2a3138, 0.9));
  const sun = new THREE.DirectionalLight(0xffe8c0, 0.7);
  sun.position.set(60, 120, -40);
  scene.add(sun);

  // Ground — wet asphalt-grey, still dark from the night's rain. It covers
  // only the land (x >= SEA_EDGE): the sea plane sits below it, and a
  // ground plane spanning the sea would hide the water entirely.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(410, 520),
    new THREE.MeshPhongMaterial({ color: COLORS.ground, shininess: 70, specular: 0x44505a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(SEA_EDGE + 205, -0.05, 0);
  scene.add(ground);

  // The sea, west of the coast road: two tones, slightly below ground level.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 520),
    new THREE.MeshPhongMaterial({ color: COLORS.sea, shininess: 90, specular: 0x5a7286 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(SEA_EDGE - 110, -0.35, 0);
  scene.add(sea);
  const seaDeep = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 520),
    new THREE.MeshPhongMaterial({ color: COLORS.seaDeep, shininess: 90, specular: 0x4a6072 })
  );
  seaDeep.rotation.x = -Math.PI / 2;
  seaDeep.position.set(SEA_EDGE - 250, -0.5, 0);
  scene.add(seaDeep);

  // Street grid — wet roads with pale lane markings, offset by GRID_OFFSET.
  // No road may cross the sea: vertical roads west of the coast are skipped
  // and horizontal roads are clipped to start at the sea wall.
  const roadMat = new THREE.MeshPhongMaterial({ color: 0x262c32, shininess: 90, specular: 0x55606a });
  const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.roadLine });
  const roads = [];
  for (let i = -4; i <= 4; i++) {
    const p = i * 44 + GRID_OFFSET;
    if (p >= SEA_EDGE + 14) roads.push({ x: p, z: 0, w: 10, vertical: true });
    roads.push({ x: 0, z: p, w: 10, vertical: false });
  }
  for (const r of roads) {
    const len = r.vertical ? 400 : 350;
    const cx = r.vertical ? r.x : SEA_EDGE + len / 2;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r.vertical ? r.w : len, r.vertical ? len : r.w), roadMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(cx, 0.02, r.z);
    scene.add(mesh);
    // Dashed centre line.
    for (let d = -180; d < 180; d += 16) {
      if (!r.vertical && d < SEA_EDGE + 10) continue;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), lineMat);
      dash.rotation.x = -Math.PI / 2;
      if (r.vertical) dash.position.set(r.x, 0.04, d);
      else { dash.rotation.z = Math.PI / 2; dash.position.set(d, 0.04, r.z); }
      scene.add(dash);
    }
  }
  // Coast road along the sea wall.
  const coast = new THREE.Mesh(new THREE.PlaneGeometry(10, 400), roadMat);
  coast.rotation.x = -Math.PI / 2;
  coast.position.set(SEA_EDGE + 8, 0.02, 0);
  scene.add(coast);

  // Towers — muted blue-grey blocks, windows lit against the fog.
  const texWarm = windowTexture(rng, true);
  const texCool = windowTexture(rng, false);
  const blocks = [];
  for (let i = 0; i < 42; i++) {
    const bx = Math.round(rng.range(-3, 3)) * 44 + GRID_OFFSET + rng.range(-8, 8);
    const bz = Math.round(rng.range(-3, 3)) * 44 + GRID_OFFSET + rng.range(-8, 8);
    if (bx < SEA_EDGE + 14) continue; // keep the coast clear
    if (Math.abs(bx - PLAZA.x) < 18 && Math.abs(bz - PLAZA.z) < 18) continue; // keep the plaza open
    if (Math.abs(bx - GARAGE.x) < 14 && Math.abs(bz - GARAGE.z) < 14) continue;
    if (Math.abs(bx - AIRFIELD.x) < 30 && Math.abs(bz - AIRFIELD.z) < 22) continue;
    blocks.push({ x: bx, z: bz, w: rng.range(10, 18), d: rng.range(10, 18), h: rng.range(14, 46) });
  }
  for (const b of blocks) {
    const mat = new THREE.MeshLambertMaterial({ map: rng.next() < 0.5 ? texWarm : texCool });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    mesh.position.set(b.x, b.h / 2, b.z);
    scene.add(mesh);
    refs.buildings.push(mesh);
    refs.colliders.push({ x: b.x, z: b.z, hw: b.w / 2 + 1, hd: b.d / 2 + 1 });
  }

  // Palm Plaza — fountain, palms, and the gold mission beacon pillar.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 8, 1.2, 24),
    new THREE.MeshPhongMaterial({ color: 0x8a97a3, shininess: 60 })
  );
  fountain.position.set(PLAZA.x, 0.6, PLAZA.z);
  scene.add(fountain);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(6.2, 24),
    new THREE.MeshPhongMaterial({ color: 0x3a5a70, shininess: 100, specular: 0x88a8bc })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(PLAZA.x, 1.25, PLAZA.z);
  scene.add(water);
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: COLORS.beacon, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
  );
  beacon.position.set(PLAZA.x + 4, 13, PLAZA.z);
  scene.add(beacon);
  refs.beacon = beacon;

  // Palms along the plaza and the coast.
  const trunkMat = new THREE.MeshLambertMaterial({ color: COLORS.trunk });
  const leafMat = new THREE.MeshLambertMaterial({ color: COLORS.palm });
  function palm(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.4 * s, 7 * s, 8), trunkMat);
    trunk.position.y = 3.5 * s;
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.6 * s, 3.4 * s, 8), leafMat);
    crown.position.y = 8.2 * s;
    g.add(crown);
    g.position.set(x, 0, z);
    scene.add(g);
  }
  for (let i = 0; i < 10; i++) palm(PLAZA.x + Math.cos(i * 0.63) * 13, PLAZA.z + Math.sin(i * 0.63) * 13, 0.9 + rng.next() * 0.3);
  for (let z = -160; z <= 160; z += 32) palm(SEA_EDGE + 16, z + rng.range(-4, 4), 1);

  // Street lamps — still glowing in the morning fog.
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x2c343c });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: COLORS.lampGlow });
  function lamp(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.4, 8), lampPoleMat);
    pole.position.y = 2.7;
    g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), lampGlowMat);
    bulb.position.y = 5.5;
    g.add(bulb);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 10, 10),
      new THREE.MeshBasicMaterial({ color: COLORS.lampGlow, transparent: true, opacity: 0.14, depthWrite: false })
    );
    halo.position.y = 5.5;
    g.add(halo);
    g.position.set(x, 0, z);
    scene.add(g);
    refs.lamps.push(g);
  }
  for (let z = -176; z <= 176; z += 44) { lamp(SEA_EDGE + 14, z); lamp(GRID_OFFSET + 44, z + 22); lamp(GRID_OFFSET - 44, z - 22); }

  // Rico's Garage — low block with a glowing sign band.
  const garage = new THREE.Mesh(
    new THREE.BoxGeometry(16, 5, 10),
    new THREE.MeshLambertMaterial({ color: 0x7a4a2e })
  );
  garage.position.set(GARAGE.x, 2.5, GARAGE.z);
  scene.add(garage);
  refs.colliders.push({ x: GARAGE.x, z: GARAGE.z, hw: 9, hd: 6 });
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(16.2, 1, 0.3),
    new THREE.MeshBasicMaterial({ color: 0xffb84d })
  );
  sign.position.set(GARAGE.x, 4.6, GARAGE.z + 5.1);
  scene.add(sign);

  // The lighthouse on the western point — its beam is a soft cone in the fog.
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 4.2, 22, 16),
    new THREE.MeshLambertMaterial({ color: COLORS.lighthouse })
  );
  tower.position.y = 11;
  lh.add(tower);
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 3, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0 })
  );
  lampRoom.position.y = 23;
  lh.add(lampRoom);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(7, 45, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(22, 23, 0);
  lh.add(beam);
  lh.position.set(LIGHTHOUSE.x, 0, LIGHTHOUSE.z);
  scene.add(lh);
  refs.lighthouse = lh;
  refs.beam = beam;
  refs.colliders.push({ x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, hw: 5, hd: 5 });

  // Marina — docks reaching into the foggy water, a few moored boats.
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  for (let i = 0; i < 3; i++) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 26), dockMat);
    dock.position.set(MARINA.x + i * 8, 0.1, MARINA.z);
    scene.add(dock);
  }

  // Airfield — runway strip and a small tower, east side.
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(14, 90), new THREE.MeshPhongMaterial({ color: COLORS.runway }));
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(AIRFIELD.x, 0.03, AIRFIELD.z);
  scene.add(runway);
  const atower = new THREE.Mesh(
    new THREE.BoxGeometry(6, 18, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a97a3 })
  );
  atower.position.set(AIRFIELD.x + 14, 9, AIRFIELD.z - 20);
  scene.add(atower);
  refs.colliders.push({ x: AIRFIELD.x + 14, z: AIRFIELD.z - 20, hw: 4, hd: 4 });

  return refs;
}
