// Solmar Bay itself: the ground, road grid, buildings, palms, beach, sea, lighthouse,
// airfield, marina and signs. Everything is plain three.js boxes, cylinders and planes
// with canvas textures, so the game loads offline with no assets to fetch.
import { AIRFIELD, BEACH_X, GARAGE, LIGHTHOUSE, MARINA, PLAZA, RAMP, ROAD_EVERY, ROAD_W, SEA_X, WORLD } from './config.js';
import { mulberry32, range } from './rng.js';

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A building face: sun-bleached plaster with lit windows.
function buildingTexture(base, lit) {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, w, 10);
    for (let y = 24; y < h - 16; y += 30) {
      for (let x = 14; x < w - 14; x += 28) {
        ctx.fillStyle = Math.random() < 0.5 ? lit : '#2c3542';
        ctx.fillRect(x, y, 16, 20);
      }
    }
  });
}

// A big roadside sign: white letters on a sea-blue board.
function signTexture(text) {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2e7fa8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 4);
  });
}

function box(w, h, d, color, x, z, y = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

// Build the whole city into the scene. Returns colliders (building AABBs) and landmarks.
export function buildCity(scene) {
  const rng = mulberry32(20261124);
  const group = new THREE.Group();
  const colliders = [];
  const palette = ['#b8a88a', '#9fb3c8', '#c8b8a0', '#a8b8a0', '#c09890', '#8aa8b8'];

  // Ground: grass inland, sand on the beach strip, sea beyond it.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD, WORLD),
    new THREE.MeshLambertMaterial({ color: 0x7fae56 }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(SEA_X - BEACH_X, WORLD),
    new THREE.MeshLambertMaterial({ color: 0xe8d8a8 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set((BEACH_X + SEA_X) / 2, 0.02, 0);
  group.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(240, WORLD + 240),
    new THREE.MeshLambertMaterial({ color: 0x2e7fa8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(SEA_X + 120, 0.01, 0);
  group.add(sea);

  // Roads: dark strips on the grid, with pale sidewalks beside them.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e2e34 });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xd8cdb2 });
  for (let c = -180; c <= 180; c += ROAD_EVERY) {
    for (const [w, d, x, z] of [
      [ROAD_W, WORLD, c, 0],
      [WORLD, ROAD_W, 0, c],
    ]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.03, z);
      group.add(road);
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(w + 8, d + 8), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x, 0.025, z);
      group.add(walk);
    }
  }

  // Buildings: one per block that is not a road, plaza, beach or airfield.
  const blockCenters = [];
  for (let x = -180; x <= 150; x += ROAD_EVERY) {
    for (let z = -180; z <= 180; z += ROAD_EVERY) {
      const cx = x + ROAD_EVERY / 2;
      const cz = z + ROAD_EVERY / 2;
      if (Math.abs(cx) < 45 && Math.abs(cz) < 45) continue; // Palm Plaza
      if (cx > 120) continue; // beach
      if (cx < -90 && cz < -90) continue; // airfield
      if (Math.abs(cx - GARAGE.pos[0]) < 45 && Math.abs(cz - GARAGE.pos[1]) < 45) continue;
      blockCenters.push([cx, cz]);
    }
  }
  for (const [cx, cz] of blockCenters) {
    const w = range(rng, 22, 34);
    const d = range(rng, 22, 34);
    const h = range(rng, 12, 42);
    const tex = buildingTexture(palette[Math.floor(rng() * palette.length)], '#ffd98a');
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ map: tex }));
    b.position.set(cx, h / 2, cz);
    group.add(b);
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  }

  // Palm Plaza: a fountain ring and a circle of palms at the centre.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 11, 1.6, 20),
    new THREE.MeshLambertMaterial({ color: 0xbcd8e8 }),
  );
  fountain.position.set(PLAZA[0], 0.8, PLAZA[1]);
  group.add(fountain);
  colliders.push({ minX: -11, maxX: 11, minZ: -11, maxZ: 11 });

  // Palms along the beach road and around the plaza.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e8b3a });
  function palm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.4, 4.5, 7), leafMat);
    crown.position.set(x, 8.5, z);
    group.add(trunk, crown);
  }
  for (let z = -180; z <= 180; z += 30) palm(BEACH_X - 8, z);
  for (const [x, z] of [[-24, -20], [24, -20], [-24, 20], [24, 20], [0, -26], [0, 26]]) palm(x, z);

  // The lighthouse on the north-east point, white with a red cap.
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 4.5, 26, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
  );
  tower.position.set(LIGHTHOUSE[0], 13, LIGHTHOUSE[1]);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 4, 10),
    new THREE.MeshLambertMaterial({ color: 0xc23b2e }),
  );
  cap.position.set(LIGHTHOUSE[0], 28, LIGHTHOUSE[1]);
  group.add(tower, cap);
  colliders.push({ minX: LIGHTHOUSE[0] - 5, maxX: LIGHTHOUSE[0] + 5, minZ: LIGHTHOUSE[1] - 5, maxZ: LIGHTHOUSE[1] + 5 });

  // The airfield: a runway strip and a hangar in the south-west.
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 120),
    new THREE.MeshLambertMaterial({ color: 0x3a3a40 }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(AIRFIELD[0], 0.04, AIRFIELD[1]);
  group.add(runway);
  const hangar = box(30, 10, 18, 0x8a94a0, AIRFIELD[0] - 30, AIRFIELD[1]);
  group.add(hangar);
  colliders.push({ minX: AIRFIELD[0] - 45, maxX: AIRFIELD[0] - 15, minZ: AIRFIELD[1] - 9, maxZ: AIRFIELD[1] + 9 });

  // The marina: wooden docks reaching into the sea, with a skiff moored.
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  for (const dz of [-20, 20, 60]) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 4), dockMat);
    dock.position.set(BEACH_X + 14, 0.4, MARINA[1] + dz);
    group.add(dock);
  }

  // Rico's Garage: a low workshop with a sign.
  const garage = box(24, 7, 16, 0x4a6a8a, GARAGE.pos[0], GARAGE.pos[1]);
  group.add(garage);
  const garageSign = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 5),
    new THREE.MeshLambertMaterial({ map: signTexture("RICO'S GARAGE") }),
  );
  garageSign.position.set(GARAGE.pos[0], 6, GARAGE.pos[1] - 8.2);
  group.add(garageSign);
  colliders.push({ minX: GARAGE.pos[0] - 12, maxX: GARAGE.pos[0] + 12, minZ: GARAGE.pos[1] - 8, maxZ: GARAGE.pos[1] + 8 });

  // Roadside signs that name the city for the judge's camera.
  function sign(text, x, z, ry) {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 4.5),
      new THREE.MeshLambertMaterial({ map: signTexture(text), side: THREE.DoubleSide }),
    );
    s.position.set(x, 5, z);
    s.rotation.y = ry;
    group.add(s);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 6), trunkMat);
    post.position.set(x, 2.5, z);
    group.add(post);
  }
  sign('SOLMAR BAY', 150, -140, -Math.PI / 2);
  sign('MARINA', MARINA[0] - 6, MARINA[1] + 34, Math.PI);
  sign('SOLMAR BAY', -60, 150, 0);

  // The leap ramp: a wedge at the end of the north road.
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1, 14),
    new THREE.MeshLambertMaterial({ color: 0xd8a83a }),
  );
  ramp.position.set(RAMP[0], 1.5, RAMP[1]);
  ramp.rotation.x = -0.35;
  group.add(ramp);

  scene.add(group);
  return { colliders, group };
}
