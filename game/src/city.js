// city.js — builds dawn Solmar Bay: ground, sea, roads, buildings, palms,
// lamps, lighthouse, marina, airfield, signs, sun and birds.
import THREE from 'three';
import { WORLD, DAWN } from './config.js';
import { mulberry32, pick, range } from './rng.js';

function textSprite(text, color = '#2a2a2a', bg = 'rgba(255,240,210,0.92)') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 96);
  g.fillStyle = color; g.font = 'bold 56px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(16, 3), mat);
}

function makePalm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.4, 7, 6),
    new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 }));
  trunk.position.y = 3.5; trunk.castShadow = true;
  g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.8 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.4, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.3, 7.2, Math.sin(a) * 1.3);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    g.add(leaf);
  }
  return g;
}

function makeLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.6, metalness: 0.4 }));
  pole.position.y = 2.6; g.add(pole);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: DAWN.lampGlow, emissiveIntensity: 0.9 }));
  bulb.position.y = 5.3; g.add(bulb);
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: DAWN.lampPoolOpacity, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.06;
  g.add(pool);
  return g;
}

function makeBuilding(rng, w, h, d) {
  const colors = [0x9a8a7a, 0x7a6a5a, 0xa89078, 0x8a7a6a, 0xb09a80];
  const mat = new THREE.MeshStandardMaterial({ color: pick(rng, colors), roughness: 0.85 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  b.castShadow = true; b.receiveShadow = true;
  // Windows: mostly dark at dawn, a few still lit.
  const litMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: DAWN.windowLit, emissiveIntensity: DAWN.windowEmissive });
  const darkMat = new THREE.MeshStandardMaterial({ color: DAWN.windowDark, roughness: 0.4 });
  const cols = Math.max(2, Math.floor(w / 4));
  const rows = Math.max(2, Math.floor(h / 4));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (rng() < 0.45) continue;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), rng() < 0.3 ? litMat : darkMat);
      win.position.set(-w / 2 + 2 + (i * (w - 4)) / Math.max(1, cols - 1), 2.5 + (j * (h - 5)) / Math.max(1, rows - 1), d / 2 + 0.06);
      b.add(win);
    }
  }
  return b;
}

export function buildCity(scene) {
  const rng = mulberry32(20261124);
  const refs = { beam: null, birds: [], sunDisc: null };

  // Ground + beach + sea (sea is SOUTH, z > seaZ).
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshStandardMaterial({ color: DAWN.ground, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, 26),
    new THREE.MeshStandardMaterial({ color: DAWN.beach, roughness: 1 }));
  beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.02, WORLD.seaZ - 8);
  beach.receiveShadow = true;
  scene.add(beach);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, 260),
    new THREE.MeshStandardMaterial({ color: DAWN.sea, roughness: 0.25, metalness: 0.35 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.01, WORLD.seaZ + 120);
  scene.add(sea);
  // Sun glitter on the water: a pale streak pointing at the eastern sun.
  const glitter = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 240),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.18, depthWrite: false }));
  glitter.rotation.x = -Math.PI / 2; glitter.position.set(60, 0.03, WORLD.seaZ + 110);
  scene.add(glitter);

  // Roads: grid + coast road, with pale dawn centre dashes.
  const roadMat = new THREE.MeshStandardMaterial({ color: DAWN.road, roughness: 0.55 });
  const dashMat = new THREE.MeshBasicMaterial({ color: DAWN.roadLine });
  function road(x, z, w, d) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.05, z); r.receiveShadow = true;
    scene.add(r);
    const n = Math.floor(Math.max(w, d) / 8);
    for (let i = 0; i < n; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      if (w > d) dash.position.set(-w / 2 + 4 + i * 8, 0.07, z);
      else dash.position.set(x, 0.07, -d / 2 + 4 + i * 8);
      scene.add(dash);
    }
  }
  for (const x of WORLD.streetsX) road(x, 0, 10, 300);
  for (const z of WORLD.streetsZ) road(0, z, 380, 10);
  road(0, WORLD.coastZ, 380, 12);

  // Buildings: blocks between streets, avoiding the plaza and the coast.
  const spots = [];
  for (const x of [-150, -90, -30, 30, 90, 150]) {
    for (const z of [-150, -90, -30, 30, 90]) {
      if (Math.abs(x) < 25 && Math.abs(z) < 25) continue; // Palm Plaza stays open
      spots.push([x, z]);
    }
  }
  for (const [x, z] of spots) {
    if (rng() < 0.2) continue;
    const w = range(rng, 14, 22), d = range(rng, 14, 22), h = range(rng, 12, 38);
    const b = makeBuilding(rng, w, h, d);
    b.position.set(x + range(rng, -3, 3), h / 2, z + range(rng, -3, 3));
    scene.add(b);
  }

  // Palm Plaza: fountain + palms + benches.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 8, 1.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x9aa8b8, roughness: 0.4 }));
  fountain.position.set(0, 0.6, 0); fountain.receiveShadow = true;
  scene.add(fountain);
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(6.2, 20),
    new THREE.MeshStandardMaterial({ color: 0x4a7a9a, roughness: 0.2, metalness: 0.3 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 1.25, 0);
  scene.add(water);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const palm = makePalm();
    palm.position.set(Math.cos(a) * 18, 0, Math.sin(a) * 18);
    scene.add(palm);
  }
  // Palms along the coast road.
  for (let x = -170; x <= 170; x += 28) {
    if (Math.abs(x) < 12) continue;
    const palm = makePalm();
    palm.position.set(x, 0, WORLD.coastZ - 10);
    scene.add(palm);
  }

  // Street lamps along the coast road and the plaza ring.
  for (let x = -170; x <= 170; x += 34) {
    const lamp = makeLamp();
    lamp.position.set(x, 0, WORLD.coastZ + 8);
    scene.add(lamp);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const lamp = makeLamp();
    lamp.position.set(Math.cos(a) * 26, 0, Math.sin(a) * 26);
    scene.add(lamp);
  }

  // Lighthouse at the south point, beam sweeping the dawn sea.
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 4.5, 26, 12),
    new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.7 }));
  tower.position.y = 13; tower.castShadow = true;
  lh.add(tower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.8, 4, 12),
    new THREE.MeshStandardMaterial({ color: 0xc23a2e, roughness: 0.7 }));
  band.position.y = 16; lh.add(band);
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 3, 10),
    new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffdf9a, emissiveIntensity: 0.8 }));
  lampRoom.position.y = 27; lh.add(lampRoom);
  const beamGeo = new THREE.ConeGeometry(7, 70, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(35, 27, 0);
  lh.add(beam);
  refs.beam = beam;
  lh.position.set(WORLD.lighthouse.x, 0, WORLD.lighthouse.z);
  scene.add(lh);

  // Marina (south-west): docks + moored skiffs.
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 22), dockMat);
    dock.position.set(WORLD.marina.x + i * 10, 0.5, WORLD.marina.z - 4);
    scene.add(dock);
  }
  const marinaSign = textSprite('MARINA');
  marinaSign.position.set(WORLD.marina.x + 10, 6, WORLD.marina.z - 18);
  scene.add(marinaSign);
  const baySign = textSprite('SOLMAR BAY');
  baySign.position.set(0, 7, WORLD.coastZ - 14);
  scene.add(baySign);

  // Airfield (north-east): runway + a small parked plane.
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 90),
    new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6 }));
  runway.rotation.x = -Math.PI / 2; runway.position.set(WORLD.airfield.x, 0.05, WORLD.airfield.z);
  scene.add(runway);
  const plane = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.4, metalness: 0.3 }));
  fus.rotation.x = Math.PI / 2; plane.add(fus);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xc23a2e, roughness: 0.5 }));
  plane.add(wing);
  plane.position.set(WORLD.airfield.x + 14, 1.4, WORLD.airfield.z + 20);
  scene.add(plane);

  // Rico's Garage (north): low workshop with a sign.
  const garage = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 0.8 }));
  garage.position.set(WORLD.garage.x, 3, WORLD.garage.z);
  garage.castShadow = true;
  scene.add(garage);
  const gSign = textSprite("RICO'S GARAGE", '#f2ede2', 'rgba(40,40,50,0.9)');
  gSign.position.set(WORLD.garage.x, 8, WORLD.garage.z + 6.5);
  scene.add(gSign);

  // Dawn sun disc, low in the east, + a soft glow.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(16, 32),
    new THREE.MeshBasicMaterial({ color: DAWN.sun, fog: false }));
  sunDisc.position.set(320, 42, -20);
  sunDisc.lookAt(0, 20, 0);
  scene.add(sunDisc);
  refs.sunDisc = sunDisc;
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(42, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.25, fog: false, depthWrite: false }));
  glow.position.set(320, 42, -22);
  glow.lookAt(0, 20, 0);
  scene.add(glow);

  // Morning birds: small dark V shapes drifting east.
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
  for (let i = 0; i < 5; i++) {
    const bird = new THREE.Group();
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.3), birdMat);
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.3), birdMat);
    w1.rotation.y = 0.5; w2.rotation.y = -0.5;
    w1.position.x = -0.7; w2.position.x = 0.7;
    bird.add(w1); bird.add(w2);
    bird.position.set(range(rng, -120, 60), range(rng, 45, 70), range(rng, -120, 80));
    scene.add(bird);
    refs.birds.push(bird);
  }

  // (Morning fog patches were cut: as flat discs over the sea they read as
  // grey slabs in the mission shot instead of mist.)
  return refs;
}
