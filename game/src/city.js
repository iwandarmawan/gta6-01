// Solmar Bay itself: the coastal island, its two districts, the
// bridge, the marina, the beach, the roads, the buildings, the palms
// and the street lamps. Built once from a seed, so the same seed
// always grows the same city.

import { WORLD, ROADS, PLACES, PALETTE } from './config.js';
import { makeRng } from './rng.js';

const THREE = window.THREE;

// Canvas texture of lit and dark windows for a building face.
function makeWindowTexture(base, litRatio, rng) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = rng.next() < litRatio;
      g.fillStyle = lit ? '#ffd98a' : '#2c3846';
      g.fillRect(10 + col * 23, 10 + row * 20, 14, 12);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Canvas texture with a big sign text.
function makeSignTexture(text, sub, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg;
  g.font = 'bold 56px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, sub ? 52 : 64);
  if (sub) {
    g.font = '28px sans-serif';
    g.fillText(sub, 256, 100);
  }
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Canvas texture for a road: asphalt with a dashed centre line.
function makeRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = '#3a3f46';
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#c8c8c8';
  g.fillRect(2, 0, 3, 128);
  g.fillRect(59, 0, 3, 128);
  g.fillStyle = '#e8e8e8';
  g.fillRect(30, 10, 4, 44);
  g.fillRect(30, 74, 4, 44);
  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function buildCity(scene, seed) {
  const rng = makeRng(seed || WORLD.seed);
  const colliders = [];
  const lampMats = [];
  const windowMats = [];
  const group = new THREE.Group();
  scene.add(group);

  function addCollider(minX, maxX, minZ, maxZ) {
    colliders.push({ minX, maxX, minZ, maxZ });
  }

  function box(w, h, d, mat, x, y, z, shadow) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    if (shadow !== false) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    group.add(mesh);
    return mesh;
  }

  const lambert = (color) => new THREE.MeshLambertMaterial({ color });

  // ---- Land: two slabs with the water channel between them ----
  const landTop = lambert(0x9aa584);
  const landSide = lambert(0xcbb98a);
  const landMats = [landSide, landSide, landTop, landSide, landSide, landSide];
  const westSlab = new THREE.Mesh(new THREE.BoxGeometry(350, 2, 360), landMats);
  westSlab.position.set(-65, -1, 0);
  westSlab.receiveShadow = true;
  group.add(westSlab);
  const eastSlab = new THREE.Mesh(new THREE.BoxGeometry(90, 2, 360), landMats);
  eastSlab.position.set(195, -1, 0);
  eastSlab.receiveShadow = true;
  group.add(eastSlab);

  // ---- Sea ----
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = WORLD.waterY;
  group.add(water);

  // ---- Roads and sidewalks ----
  const roadTex = makeRoadTexture();
  const sidewalkMat = lambert(PALETTE.sidewalk);
  for (const road of ROADS) {
    const dx = road.x2 - road.x1;
    const dz = road.z2 - road.z1;
    const len = Math.hypot(dx, dz);
    const cx = (road.x1 + road.x2) / 2;
    const cz = (road.z1 + road.z2) / 2;
    const angle = Math.atan2(dx, dz);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(14, len), sidewalkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.rotation.z = angle;
    walk.position.set(cx, 0.01, cz);
    walk.receiveShadow = true;
    group.add(walk);
    const tex = roadTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, Math.max(1, Math.round(len / 16)));
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(10, len),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = angle;
    strip.position.set(cx, 0.03, cz);
    strip.receiveShadow = true;
    group.add(strip);
  }

  // ---- Bridge over the channel ----
  const bridgeDeck = box(46, 1, 28, lambert(0x8a8578), 130, -0.5, 0);
  bridgeDeck.receiveShadow = true;
  box(46, 1.2, 1, lambert(0x6b6f75), 130, 0.6, -13.5);
  box(46, 1.2, 1, lambert(0x6b6f75), 130, 0.6, 13.5);
  const bridgeTex = roadTex.clone();
  bridgeTex.needsUpdate = true;
  bridgeTex.repeat.set(1, 3);
  const bridgeRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 44),
    new THREE.MeshLambertMaterial({ map: bridgeTex }),
  );
  bridgeRoad.rotation.x = -Math.PI / 2;
  bridgeRoad.rotation.z = Math.PI / 2;
  bridgeRoad.position.set(130, 0.04, 0);
  bridgeRoad.receiveShadow = true;
  group.add(bridgeRoad);

  // ---- Buildings ----
  const windowTexes = [
    makeWindowTexture('#e8e0cc', 0.28, rng),
    makeWindowTexture('#d8cbb2', 0.2, rng),
    makeWindowTexture('#cfd8dc', 0.35, rng),
  ];
  const downtownX = [-200, -140, -80, -20, 40, 100];
  const downtownZ = [-150, -90, -30, 30, 90, 150];
  const skipBlocks = { '3,2': true, '2,1': true, '4,0': true }; // plaza, garage, hotel

  function placeBuilding(cx, cz, w, d, h, colorIdx) {
    const tex = windowTexes[rng.int(0, 2)];
    const mat = new THREE.MeshLambertMaterial({
      color: PALETTE.building[colorIdx % PALETTE.building.length],
      map: tex,
    });
    // Windows glow a little at night through the shared emissive.
    mat.emissive = new THREE.Color(0xffc860);
    mat.emissiveIntensity = 0;
    windowMats.push(mat);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(cx, h / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const roof = box(w + 0.6, 0.8, d + 0.6, lambert(PALETTE.roof[rng.int(0, 2)]), cx, h + 0.4, cz);
    roof.castShadow = true;
    if (rng.chance(0.5)) {
      box(2.5, 1.2, 2.5, lambert(0x777777), cx + rng.range(-w / 4, w / 4), h + 1.4, cz + rng.range(-d / 4, d / 4));
    }
    addCollider(cx - w / 2 - 0.3, cx + w / 2 + 0.3, cz - d / 2 - 0.3, cz + d / 2 + 0.3);
    return mesh;
  }

  for (let i = 0; i < downtownX.length - 1; i++) {
    for (let j = 0; j < downtownZ.length - 1; j++) {
      if (skipBlocks[i + ',' + j]) continue;
      const x0 = downtownX[i] + 8;
      const x1 = downtownX[i + 1] - 8;
      const z0 = downtownZ[j] + 8;
      const z1 = downtownZ[j + 1] - 8;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const dist = Math.hypot(cx, cz);
      const h = Math.max(8, Math.min(48, 12 + (1 - Math.min(1, dist / 280)) * 30 + rng.range(0, 10)));
      if (rng.chance(0.55)) {
        placeBuilding(cx, cz, rng.range(22, 30), rng.range(22, 30), h, rng.int(0, 7));
      } else {
        placeBuilding(cx - 11, cz, rng.range(14, 18), rng.range(20, 26), h * 0.8, rng.int(0, 7));
        placeBuilding(cx + 11, cz, rng.range(14, 18), rng.range(20, 26), h * 0.65, rng.int(0, 7));
      }
    }
  }

  // Portside blocks: low warehouses and shops.
  const portBlocks = [
    [170, 210, -150, -90], [170, 210, -90, 90], [170, 210, 90, 150],
    [210, 240, -150, -90], [210, 240, 90, 150],
  ];
  for (const [x0, x1, z0, z1] of portBlocks) {
    const cx = (x0 + x1) / 2 + 4;
    const cz = (z0 + z1) / 2;
    const w = Math.min(24, x1 - x0 - 12);
    const d = Math.min(30, z1 - z0 - 12);
    placeBuilding(cx, cz, w, d, rng.range(7, 16), rng.int(0, 7));
  }

  // ---- Landmarks ----
  // Rico's Garage with a painted sign.
  placeBuilding(PLACES.garage.x, PLACES.garage.z, 26, 16, 7, 3);
  const garageSign = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 5),
    new THREE.MeshLambertMaterial({ map: makeSignTexture("RICO'S GARAGE", 'REPAIRS • $50', '#20344a', '#ffd94a') }),
  );
  garageSign.position.set(PLACES.garage.x, 8.6, PLACES.garage.z + 8.2);
  group.add(garageSign);

  // Solmar Grand Hotel tower.
  placeBuilding(PLACES.hotel.x, PLACES.hotel.z, 22, 22, 55, 3);
  const hotelSign = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 4.5),
    new THREE.MeshLambertMaterial({ map: makeSignTexture('SOLMAR GRAND', '', '#3a2a4a', '#ffffff') }),
  );
  hotelSign.position.set(PLACES.hotel.x, 50, PLACES.hotel.z + 11.2);
  group.add(hotelSign);

  // Liberty Plaza fountain.
  const fountainBase = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6.5, 0.9, 20),
    lambert(0xb8b0a0),
  );
  fountainBase.position.set(10, 0.45, 0);
  fountainBase.castShadow = true;
  fountainBase.receiveShadow = true;
  group.add(fountainBase);
  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 5.2, 0.3, 20),
    new THREE.MeshLambertMaterial({ color: 0x4aa8d8 }),
  );
  fountainWater.position.set(10, 0.8, 0);
  group.add(fountainWater);
  const fountainColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.1, 3, 10),
    lambert(0xd8d0c0),
  );
  fountainColumn.position.set(10, 2.2, 0);
  fountainColumn.castShadow = true;
  group.add(fountainColumn);
  addCollider(3.5, 16.5, -6.5, 6.5);

  // South Point lighthouse.
  const lightBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.2, 14, 12),
    lambert(0xf0ead8),
  );
  lightBase.position.set(PLACES.lighthouse.x, 7, PLACES.lighthouse.z);
  lightBase.castShadow = true;
  group.add(lightBase);
  const lightBand = new THREE.Mesh(
    new THREE.CylinderGeometry(2.75, 2.85, 3, 12),
    lambert(0xc23b2e),
  );
  lightBand.position.set(PLACES.lighthouse.x, 9, PLACES.lighthouse.z);
  group.add(lightBand);
  const lightTopMat = new THREE.MeshLambertMaterial({ color: 0xffe9a0, emissive: 0xffd94a });
  lightTopMat.emissiveIntensity = 0.4;
  const lightTop = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 10), lightTopMat);
  lightTop.position.set(PLACES.lighthouse.x, 14.6, PLACES.lighthouse.z);
  group.add(lightTop);
  lampMats.push(lightTopMat);
  addCollider(-228.5, -221.5, 161.5, 168.5);

  // Hills at the edges.
  const hillMat = lambert(0x5d8a4a);
  for (const [hx, hz, hr, hh] of [[-225, -100, 28, 22], [225, -140, 25, 20], [-225, 100, 25, 18]]) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 10), hillMat);
    hill.position.set(hx, hh / 2 - 1, hz);
    hill.castShadow = true;
    hill.receiveShadow = true;
    group.add(hill);
    addCollider(hx - hr * 0.6, hx + hr * 0.6, hz - hr * 0.6, hz + hr * 0.6);
  }

  // ---- Beach: sand strip, umbrellas, palms ----
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(480, 16),
    lambert(PALETTE.sand),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.04, 173);
  sand.receiveShadow = true;
  group.add(sand);
  const umbrellaColors = [0xe84a5f, 0x2e9e8f, 0xe8a33d, 0x4a7de8];
  for (let i = 0; i < 5; i++) {
    const ux = -180 + i * 85 + rng.range(-8, 8);
    const uz = 172 + rng.range(-2, 3);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 6), lambert(0xdddddd));
    pole.position.set(ux, 1.7, uz);
    group.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.1, 8),
      lambert(umbrellaColors[i % umbrellaColors.length]),
    );
    top.position.set(ux, 3.6, uz);
    top.castShadow = true;
    group.add(top);
  }

  // ---- Palms ----
  function placePalm(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 5, 6),
      lambert(0x8a6a44),
    );
    trunk.position.set(x, 2.5, z);
    trunk.castShadow = true;
    group.add(trunk);
    for (let f = 0; f < 5; f++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3, 4), lambert(0x3f8f4f));
      const a = (f / 5) * Math.PI * 2;
      frond.position.set(x + Math.cos(a) * 1.1, 5.4, z + Math.sin(a) * 1.1);
      frond.rotation.z = Math.cos(a) * 1.1;
      frond.rotation.x = -Math.sin(a) * 1.1;
      frond.castShadow = true;
      group.add(frond);
    }
  }
  for (let i = 0; i < 12; i++) placePalm(-215 + i * 38 + rng.range(-6, 6), 172 + rng.range(-2, 2));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    placePalm(10 + Math.cos(a) * 11, Math.sin(a) * 11);
  }
  for (let i = 0; i < 16; i++) {
    const rx = rng.range(-230, 230);
    const rz = rng.pick([-158, -98, -38, 22, 82, 142]);
    placePalm(rx, rz + rng.range(-3, 3));
  }

  // ---- Street lamps ----
  const poleMat = lambert(0x3c4148);
  for (const road of ROADS) {
    const dx = road.x2 - road.x1;
    const dz = road.z2 - road.z1;
    const len = Math.hypot(dx, dz);
    const steps = Math.floor(len / 60);
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0.5 : s / steps;
      const lx = road.x1 + dx * t + (dz === 0 ? 0 : 6.5);
      const lz = road.z1 + dz * t + (dx === 0 ? 6.5 : 0);
      if (lx < WORLD.landMinX + 4 || lx > WORLD.landMaxX - 4) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.5, 6), poleMat);
      pole.position.set(lx, 3.25, lz);
      group.add(pole);
      const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffe9a0 });
      headMat.emissiveIntensity = 0;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), headMat);
      head.position.set(lx, 6.6, lz);
      group.add(head);
      lampMats.push(headMat);
    }
  }

  // ---- Marina docks and buoy ----
  const woodMat = lambert(0x9a7a52);
  box(18, 0.5, 4, woodMat, 247, 0.25, 62);
  box(15, 0.5, 4, woodMat, 245, 0.25, 84);
  box(4, 0.5, 26, woodMat, 239, 0.25, 73);
  for (const [px, pz] of [[255, 62], [252, 84], [239, 60], [239, 86]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.2, 6), woodMat);
    post.position.set(px, 0.4, pz);
    group.add(post);
  }
  const buoyMat = new THREE.MeshLambertMaterial({ color: 0xff6a00, emissive: 0xff6a00 });
  buoyMat.emissiveIntensity = 0.25;
  const buoy = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.2, 8), buoyMat);
  buoy.position.set(PLACES.buoy.x, 0.6, PLACES.buoy.z);
  group.add(buoy);
  lampMats.push(buoyMat);

  // ---- Queries the gameplay modules use ----
  function isWater(x, z) {
    if (x < WORLD.landMinX || x > WORLD.landMaxX || z < WORLD.landMinZ || z > WORLD.landMaxZ) return true;
    if (x >= WORLD.channelMinX && x <= WORLD.channelMaxX) {
      return !(z >= WORLD.bridgeMinZ && z <= WORLD.bridgeMaxZ);
    }
    return false;
  }

  function resolveCircle(pos, radius, prev) {
    let hit = false;
    for (const c of colliders) {
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      let dx = pos.x - cx;
      let dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      hit = true;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        // Centre inside the box: push out along the smallest penetration.
        const px = Math.min(pos.x - c.minX, c.maxX - pos.x);
        const pz = Math.min(pos.z - c.minZ, c.maxZ - pos.z);
        if (px < pz) pos.x = pos.x - c.minX < c.maxX - pos.x ? c.minX - radius : c.maxX + radius;
        else pos.z = pos.z - c.minZ < c.maxZ - pos.z ? c.minZ - radius : c.maxZ + radius;
      }
    }
    if (isWater(pos.x, pos.z)) {
      pos.x = prev.x;
      pos.z = prev.z;
      hit = true;
    }
    pos.x = Math.max(WORLD.minX + 2, Math.min(WORLD.maxX - 2, pos.x));
    pos.z = Math.max(WORLD.minZ + 2, Math.min(WORLD.maxZ - 2, pos.z));
    return hit;
  }

  function resolveBoat(pos, radius, prev) {
    if (!isWater(pos.x, pos.z)) {
      pos.x = prev.x;
      pos.z = prev.z;
      return true;
    }
    pos.x = Math.max(WORLD.minX - 60, Math.min(WORLD.maxX + 80, pos.x));
    pos.z = Math.max(WORLD.minZ - 60, Math.min(WORLD.maxZ + 60, pos.z));
    return false;
  }

  // Night factor 0 (day) .. 1 (night): lamps and windows glow.
  function setNight(f) {
    for (const m of lampMats) m.emissiveIntensity = 0.15 + f * 1.4;
    for (const m of windowMats) m.emissiveIntensity = f * 0.55;
  }

  let waterT = 0;
  function update(dt) {
    waterT += dt;
    water.position.y = WORLD.waterY + Math.sin(waterT * 0.8) * 0.06;
    buoy.position.y = 0.6 + Math.sin(waterT * 1.3) * 0.25;
    buoy.rotation.y += dt * 0.4;
  }

  return { colliders, isWater, resolveCircle, resolveBoat, setNight, update, water };
}
