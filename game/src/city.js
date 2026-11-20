// Solmar Bay itself: a deterministic sun-soaked coastal grid city. One seed
// builds the same streets, buildings, palms and beach every run. The builder
// drops every mesh into the scene and hands back the gameplay facts the
// other systems need: building colliders, road lines, the plaza, the docks,
// the safehouse, the park, the city bounds and the cash pickup spots.
const THREE = window.THREE;
import { WORLD, COLORS } from './config.js';

const PALETTE = [
  0xe8d8b0, 0xd9b48f, 0xc9a06a, 0xb7c4c9, 0x9fb8c8,
  0xe6b8a2, 0xd8c9a3, 0xa8b89a, 0xc4a4a4, 0x8fa8bf,
  0xe0d0c0, 0x7fa3c0, 0x5f8fb0, 0xd0b090,
];

function windowTexture(rng, litRatio) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#20242c';
  g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 124; y += 12) {
    for (let x = 4; x < 60; x += 10) {
      g.fillStyle = rng.chance(litRatio) ? rng.pick(['#ffd98a', '#fff2c0', '#9fd8ff']) : '#3a4552';
      g.fillRect(x, y, 6, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function box(w, h, d, color, x, y, z, mat) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat || new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildCity(scene, rng) {
  const { grid: GRID, block: BLOCK, road: ROAD, pitch: PITCH, half: HALF, beachX: BEACH_X } = WORLD;
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'city';
  const m4 = new THREE.Matrix4();

  // Ground: pale sidewalk concrete under everything, wide enough for the beach.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2 + 220, HALF * 2 + 40),
    new THREE.MeshLambertMaterial({ color: COLORS.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(60, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // Roads: dark asphalt strips, one per grid line, with pale centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: COLORS.road });
  const roadLines = [];
  for (let i = 0; i <= GRID; i += 1) roadLines.push(-HALF + i * PITCH);
  for (const p of roadLines) {
    const alongX = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, ROAD), roadMat);
    alongX.rotation.x = -Math.PI / 2;
    alongX.position.set(0, 0.02, p);
    alongX.receiveShadow = true;
    group.add(alongX);
    const alongZ = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, HALF * 2), roadMat);
    alongZ.rotation.x = -Math.PI / 2;
    alongZ.position.set(p, 0.02, 0);
    alongZ.receiveShadow = true;
    group.add(alongZ);
  }
  const dashGeo = new THREE.BoxGeometry(0.35, 0.06, 3);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2e9c9 });
  const dashCount = roadLines.length * 2 * 40;
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
  let di = 0;
  for (const p of roadLines) {
    for (let k = 0; k < 40; k += 1) {
      const t = -HALF + 6 + k * 12;
      m4.makeTranslation(t, 0.06, p);
      dashes.setMatrixAt(di, m4);
      di += 1;
      m4.makeTranslation(p, 0.06, t);
      dashes.setMatrixAt(di, m4);
      di += 1;
    }
  }
  dashes.count = di;
  group.add(dashes);

  // Beach and sea on the east edge, with a wooden pier for the docks.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(50, HALF * 2 + 40),
    new THREE.MeshLambertMaterial({ color: COLORS.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(HALF + 25, 0.01, 0);
  sand.receiveShadow = true;
  group.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(160, HALF * 2 + 40),
    new THREE.MeshLambertMaterial({ color: COLORS.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(BEACH_X + 80, 0, 0);
  group.add(sea);
  const sea2 = new THREE.Mesh(
    new THREE.PlaneGeometry(160, HALF * 2 + 40),
    new THREE.MeshLambertMaterial({ color: 0x4fa8dd, transparent: true, opacity: 0.45 }),
  );
  sea2.rotation.x = -Math.PI / 2;
  sea2.position.set(BEACH_X + 80, 0.15, 0);
  group.add(sea2);
  const pier = box(30, 1, 8, 0x8a6a42, HALF + 55, 0.5, -120);
  group.add(pier);

  // Buildings, one or two per block, taller toward downtown.
  const winTexes = [windowTexture(rng, 0.35), windowTexture(rng, 0.55), windowTexture(rng, 0.2)];
  const plazaBlock = { i: 4, j: 4 };
  const parkBlock = { i: 1, j: 7 };
  const downtown = (i, j) => Math.abs(i - 4.5) + Math.abs(j - 4.5) < 3;
  for (let i = 0; i < GRID; i += 1) {
    for (let j = 0; j < GRID; j += 1) {
      const cx = -HALF + PITCH * i + ROAD / 2 + BLOCK / 2;
      const cz = -HALF + PITCH * j + ROAD / 2 + BLOCK / 2;
      if (i === plazaBlock.i && j === plazaBlock.j) continue;
      if (i === parkBlock.i && j === parkBlock.j) continue;
      const count = rng.chance(0.35) ? 1 : 2;
      for (let b = 0; b < count; b += 1) {
        const tall = downtown(i, j) && rng.chance(0.6);
        const w = rng.range(10, 18);
        const d = rng.range(10, 18);
        const h = tall ? rng.range(30, 62) : rng.range(8, 26);
        const ox = count === 1 ? 0 : (b === 0 ? -8 : 8);
        const oz = count === 1 ? 0 : (b === 0 ? 6 : -6);
        const x = cx + ox;
        const z = cz + oz;
        const tex = rng.pick(winTexes);
        tex.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 9)));
        const mat = new THREE.MeshLambertMaterial({ color: rng.pick(PALETTE), map: tex.clone() });
        mat.map.needsUpdate = true;
        group.add(box(w, h, d, 0, x, h / 2, z, mat));
        group.add(box(rng.range(2, 4), 1.2, rng.range(2, 4), 0x8a8f94, x + rng.range(-3, 3), h + 0.6, z + rng.range(-3, 3)));
        if (rng.chance(0.3)) {
          const tower = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.6, 3, 8),
            new THREE.MeshLambertMaterial({ color: 0x7a5a3a }),
          );
          tower.position.set(x + w / 4, h + 2.2, z - d / 4);
          tower.castShadow = true;
          group.add(tower);
        }
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // The central plaza: fountain, benches, palms.
  const plaza = { x: -HALF + PITCH * 4 + ROAD / 2 + BLOCK / 2, z: -HALF + PITCH * 4 + ROAD / 2 + BLOCK / 2 };
  const plazaSlab = new THREE.Mesh(
    new THREE.CylinderGeometry(13, 13, 0.4, 24),
    new THREE.MeshLambertMaterial({ color: COLORS.plaza }),
  );
  plazaSlab.position.set(plaza.x, 0.2, plaza.z);
  plazaSlab.receiveShadow = true;
  group.add(plazaSlab);
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4.6, 1.2, 16),
    new THREE.MeshLambertMaterial({ color: 0x8fa8bf }),
  );
  fountain.position.set(plaza.x, 0.6, plaza.z);
  fountain.castShadow = true;
  group.add(fountain);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.3, 16),
    new THREE.MeshLambertMaterial({ color: 0x4fa8dd }),
  );
  water.position.set(plaza.x, 1.2, plaza.z);
  group.add(water);
  colliders.push({ minX: plaza.x - 4.6, maxX: plaza.x + 4.6, minZ: plaza.z - 4.6, maxZ: plaza.z + 4.6 });
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2;
    group.add(box(3, 0.5, 1, 0x8a7a5a, plaza.x + Math.cos(a) * 10, 0.45, plaza.z + Math.sin(a) * 10));
  }

  // The park: grass, trees, a pond.
  const park = { x: -HALF + PITCH * 1 + ROAD / 2 + BLOCK / 2, z: -HALF + PITCH * 7 + ROAD / 2 + BLOCK / 2 };
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(BLOCK - 4, BLOCK - 4),
    new THREE.MeshLambertMaterial({ color: COLORS.grass }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(park.x, 0.03, park.z);
  grass.receiveShadow = true;
  group.add(grass);
  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6, 0.3, 16),
    new THREE.MeshLambertMaterial({ color: 0x4fa8dd }),
  );
  pond.position.set(park.x + 6, 0.2, park.z - 4);
  group.add(pond);

  // Palms: instanced trunks + fronds along sidewalks, the beach and the plaza.
  const palmSpots = [];
  for (let i = 0; i <= GRID; i += 1) {
    for (let k = 0; k < 5; k += 1) {
      const t = -HALF + 30 + k * 96 + rng.range(-8, 8);
      palmSpots.push([t, -HALF + i * PITCH + 8]);
      palmSpots.push([-HALF + i * PITCH + 8, t]);
    }
  }
  for (let k = 0; k < 10; k += 1) palmSpots.push([HALF + 12 + rng.range(-4, 4), -200 + k * 44]);
  // A second row of palms further up the sand, for the beach skyline.
  for (let k = 0; k < 6; k += 1) palmSpots.push([HALF + 30 + rng.range(-4, 4), -180 + k * 72]);
  for (let k = 0; k < 8; k += 1) {
    const a = rng.range(0, Math.PI * 2);
    palmSpots.push([plaza.x + Math.cos(a) * 15, plaza.z + Math.sin(a) * 15]);
    palmSpots.push([park.x + rng.range(-14, 14), park.z + rng.range(-14, 14)]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 6, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  const frondGeo = new THREE.ConeGeometry(2.6, 2.2, 7);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3f8f3f });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, palmSpots.length);
  palmSpots.forEach((p, idx) => {
    m4.makeTranslation(p[0], 3, p[1]);
    trunks.setMatrixAt(idx, m4);
    m4.makeTranslation(p[0], 6.6, p[1]);
    fronds.setMatrixAt(idx, m4);
  });
  trunks.castShadow = true;
  group.add(trunks);
  group.add(fronds);

  // Street lights along the main avenue.
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x44484e });
  const lampGeo = new THREE.SphereGeometry(0.35, 8, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  const lightSpots = [];
  for (let i = 0; i <= GRID; i += 1) {
    for (let k = 0; k < 5; k += 1) {
      const t = -HALF + 24 + k * 96;
      lightSpots.push([t, -HALF + i * PITCH + 6.8]);
      lightSpots.push([-HALF + i * PITCH + 6.8, t]);
    }
  }
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lightSpots.length);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lightSpots.length);
  lightSpots.forEach((p, idx) => {
    m4.makeTranslation(p[0], 3.5, p[1]);
    poles.setMatrixAt(idx, m4);
    m4.makeTranslation(p[0], 7.1, p[1]);
    lamps.setMatrixAt(idx, m4);
  });
  group.add(poles);
  group.add(lamps);

  // Beach umbrellas and drifting clouds.
  for (let k = 0; k < 8; k += 1) {
    const ux = HALF + 14 + rng.range(-6, 6);
    const uz = -180 + k * 52 + rng.range(-8, 8);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }),
    );
    pole.position.set(ux, 1.3, uz);
    group.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1, 8),
      new THREE.MeshLambertMaterial({ color: rng.pick([0xe85a5a, 0x5a8fe8, 0xf2d05a, 0xffffff]) }),
    );
    top.position.set(ux, 3, uz);
    group.add(top);
  }
  // A welcome sign at the west gate: "SOLMAR BAY" on a canvas texture.
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const sg = signCanvas.getContext('2d');
  sg.fillStyle = '#1c2f6e';
  sg.fillRect(0, 0, 512, 128);
  sg.fillStyle = '#ffc93c';
  sg.font = 'bold 64px system-ui, sans-serif';
  sg.textAlign = 'center';
  sg.textBaseline = 'middle';
  sg.fillText('SOLMAR BAY', 256, 66);
  const signTex = new THREE.CanvasTexture(signCanvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 4),
    new THREE.MeshLambertMaterial({ map: signTex }),
  );
  sign.position.set(-HALF - 2, 6, 0);
  sign.rotation.y = Math.PI / 2; // faces east, into the city
  group.add(sign);
  const signPostL = box(0.4, 6, 0.4, 0x44484e, -HALF - 2, 3, -7);
  const signPostR = box(0.4, 6, 0.4, 0x44484e, -HALF - 2, 3, 7);
  group.add(signPostL);
  group.add(signPostR);

  // Drifting clouds: soft white blobs high above the city.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let k = 0; k < 10; k += 1) {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(rng.range(8, 16), 8, 6), cloudMat);
    cl.scale.y = 0.35;
    cl.position.set(rng.range(-260, 320), rng.range(70, 110), rng.range(-260, 260));
    group.add(cl);
  }

  // Sun, sky and fog.
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.25);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 600;
  group.add(sun);
  group.add(new THREE.HemisphereLight(0xbfd8ff, 0x8a7a5a, 0.75));
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.fog, 260, 620);

  scene.add(group);

  // Cash pickups: green glowing stacks on sidewalks, eight of them.
  const pickups = [];
  for (let k = 0; k < 8; k += 1) {
    const road = rng.pick(roadLines);
    const t = rng.range(-HALF + 20, HALF - 20);
    const onX = rng.chance(0.5);
    pickups.push({ x: onX ? t : road + 9, z: onX ? road + 9 : t, taken: false, mesh: null });
  }

  return {
    colliders,
    roads: roadLines,
    plaza,
    park,
    docks: { x: HALF + 55, z: -120 },
    safehouse: { x: -HALF + 12, z: HALF - 12 },
    northGate: { x: HALF - 12, z: -HALF + 12 },
    pickups,
    bounds: { minX: -HALF - 6, maxX: BEACH_X + 160, minZ: -HALF - 6, maxZ: HALF + 6 },
    half: HALF,
    pitch: PITCH,
    road: ROAD,
  };
}

/** Push a circle (x, z, radius) out of every building collider it overlaps. */
export function resolveCircle(city, x, z, r) {
  let nx = x;
  let nz = z;
  for (const c of city.colliders) {
    const cx = Math.max(c.minX, Math.min(nx, c.maxX));
    const cz = Math.max(c.minZ, Math.min(nz, c.maxZ));
    const dx = nx - cx;
    const dz = nz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      nx = cx + (dx / d) * r;
      nz = cz + (dz / d) * r;
    } else if (d2 <= 0.0001) {
      // Centre inside the box: shove out along the smallest penetration axis.
      const left = nx - c.minX;
      const right = c.maxX - nx;
      const top = nz - c.minZ;
      const bottom = c.maxZ - nz;
      const m = Math.min(left, right, top, bottom);
      if (m === left) nx = c.minX - r;
      else if (m === right) nx = c.maxX + r;
      else if (m === top) nz = c.minZ - r;
      else nz = c.maxZ + r;
    }
  }
  return { x: nx, z: nz };
}

/** True when the point is on a road (within half a road width of a road line). */
export function onRoad(city, x, z) {
  const hw = city.road / 2 + 2;
  for (const p of city.roads) {
    if (Math.abs(x - p) < hw || Math.abs(z - p) < hw) return true;
  }
  return false;
}
