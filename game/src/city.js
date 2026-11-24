// Solmar Bay itself: the ground, the sea and the beach, the road grid, the
// buildings, the palms, the marina, the lighthouse and the airfield. Built
// once from a fixed seed, so the city is the same every time it loads.
// Returns the building colliders (axis-aligned boxes the player and cars
// cannot drive through) and the lighthouse beam, which turns.
import { WORLD, ROADS_X, ROADS_Z, ROAD_W, PALETTE, PLAZA, GARAGE, MARINA, LIGHTHOUSE, AIRFIELD } from './config.js';

const THREE = window.THREE;

// A sign painted on a canvas and hung on a plane: no image files, no network.
function textSign(text, width, height, fg = '#ffffff', bg = '#2e6f8e') {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg; g.font = 'bold 64px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
  );
  return mesh;
}

function box(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function palm(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25 * scale, 0.4 * scale, 6 * scale, 6),
    new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk }),
  );
  trunk.position.y = 3 * scale; trunk.castShadow = true;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(2.6 * scale, 3 * scale, 7),
    new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf }),
  );
  leaves.position.y = 7 * scale; leaves.castShadow = true;
  group.add(trunk, leaves);
  group.position.set(x, 0, z);
  return group;
}

export function buildCity(scene, rng) {
  const colliders = [];
  const add = (mesh) => { scene.add(mesh); return mesh; };

  // Grass under everything, sand along the shore, sea beyond it. The sea sits
  // a touch higher than the sand's east edge so the water reads as water.
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.maxX - WORLD.minX + 260, WORLD.maxZ - WORLD.minZ + 120),
    new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
  );
  grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0, 0); grass.receiveShadow = true;
  add(grass);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.sandX1 - WORLD.sandX0, WORLD.maxZ - WORLD.minZ + 120),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set((WORLD.sandX0 + WORLD.sandX1) / 2, 0.01, 0);
  sand.receiveShadow = true;
  add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(320, WORLD.maxZ - WORLD.minZ + 200),
    new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(WORLD.seaX + 160, 0.015, 0);
  add(sea);

  // Roads: dark strips on the grid, sidewalks a shade lighter beside them.
  for (const x of ROADS_X) {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_W, WORLD.maxZ - WORLD.minZ),
      new THREE.MeshLambertMaterial({ color: PALETTE.road }),
    );
    road.rotation.x = -Math.PI / 2; road.position.set(x, 0.05, 0); road.receiveShadow = true;
    add(road);
    for (const side of [-1, 1]) {
      const walk = new THREE.Mesh(
        new THREE.PlaneGeometry(3, WORLD.maxZ - WORLD.minZ),
        new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk }),
      );
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x + side * (ROAD_W / 2 + 1.5), 0.04, 0);
      walk.receiveShadow = true;
      add(walk);
    }
  }
  for (const z of ROADS_Z) {
    // The cross streets run from the west edge to the coast road: they stop
    // at the sand, so no dark strip crosses the beach and the sea.
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(155 - WORLD.minX, ROAD_W),
      new THREE.MeshLambertMaterial({ color: PALETTE.road }),
    );
    road.rotation.x = -Math.PI / 2; road.position.set((155 + WORLD.minX) / 2, 0.05, z); road.receiveShadow = true;
    add(road);
  }

  // Buildings fill the blocks between roads, one or two a block, heights and
  // colours drawn from the seed. The plaza, garage and airfield blocks stay
  // open for their landmarks.
  const xBounds = [-220, -150, -90, -30, 30, 90, 150, 160];
  const zBounds = [-160, -120, -60, 0, 60, 120, 160];
  const isLandmarkCell = (x0, x1, z0, z1) => {
    const overlaps = (ax, az) => ax >= x0 && ax < x1 && az >= z0 && az < z1;
    if (overlaps(PLAZA.x, PLAZA.z)) return true;
    if (overlaps(GARAGE.x, GARAGE.z)) return true;
    if (x0 >= -220 && x1 <= -180 && z0 >= -160 && z1 <= -60) return true; // airfield
    return false;
  };
  for (let i = 0; i < xBounds.length - 1; i++) {
    for (let j = 0; j < zBounds.length - 1; j++) {
      const x0 = xBounds[i], x1 = xBounds[i + 1], z0 = zBounds[j], z1 = zBounds[j + 1];
      if (isLandmarkCell(x0, x1, z0, z1)) continue;
      const count = rng() < 0.4 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = (x1 - x0) * (count === 1 ? 0.62 : 0.42);
        const d = (z1 - z0) * (count === 1 ? 0.62 : 0.42);
        const cx = x0 + (x1 - x0) * (count === 1 ? 0.5 : k === 0 ? 0.27 : 0.73);
        const cz = z0 + (z1 - z0) * (count === 1 ? 0.5 : k === 0 ? 0.3 : 0.7);
        const h = 8 + rng() * 22;
        const color = PALETTE.building[Math.floor(rng() * PALETTE.building.length)];
        const building = box(w, h, d, color, cx, h / 2, cz);
        add(building);
        const roof = box(w * 0.9, 0.6, d * 0.9, PALETTE.roof, cx, h + 0.3, cz);
        add(roof);
        colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
      }
    }
  }

  // Palm Plaza: a fountain ringed with palms.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 7, 1.2, 16),
    new THREE.MeshLambertMaterial({ color: 0xcfd8dc }),
  );
  fountain.position.set(PLAZA.x, 0.6, PLAZA.z); fountain.castShadow = true;
  add(fountain);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 0.4, 16),
    new THREE.MeshLambertMaterial({ color: 0x4fc3f7 }),
  );
  water.position.set(PLAZA.x, 1.1, PLAZA.z);
  add(water);
  for (const [px, pz] of [[48, -12], [72, -12], [48, 12], [72, 12], [60, -16], [60, 16]]) {
    add(palm(px, pz, 1.1));
  }
  const plazaSign = textSign('PALM PLAZA', 14, 3.5, '#ffffff', '#3e7d32');
  plazaSign.position.set(PLAZA.x, 6, PLAZA.z - 18);
  add(plazaSign);

  // Palms along the coast road and the beach.
  for (let z = -140; z <= 140; z += 28) {
    add(palm(143, z, 0.9 + rng() * 0.4));
    if (rng() < 0.6) add(palm(157, z + 12, 0.9 + rng() * 0.3));
  }

  // Rico's Garage: a low workshop with its sign over the door.
  const garage = box(24, 8, 16, 0x8d6e63, GARAGE.x, 4, GARAGE.z);
  add(garage);
  const garageRoof = box(25, 0.8, 17, PALETTE.roof, GARAGE.x, 8.4, GARAGE.z);
  add(garageRoof);
  colliders.push({ x0: GARAGE.x - 12, x1: GARAGE.x + 12, z0: GARAGE.z - 8, z1: GARAGE.z + 8 });
  const garageSign = textSign("RICO'S GARAGE", 16, 4, '#ffe082', '#5d4037');
  garageSign.position.set(GARAGE.x, 7, GARAGE.z - 8.5);
  add(garageSign);

  // The marina: three wooden docks reaching into the sea, with a skiff moored.
  for (const dz of [45, 70, 95]) {
    const dock = box(30, 0.8, 4, PALETTE.dock, 210, 0.4, dz);
    add(dock);
  }
  const marinaSign = textSign('MARINA', 16, 4, '#ffffff', '#2e6f8e');
  marinaSign.position.set(196, 6, 40);
  marinaSign.rotation.y = Math.PI / 2;
  add(marinaSign);
  const baySign = textSign('SOLMAR BAY', 22, 5.5, '#ffffff', '#2e6f8e');
  baySign.position.set(196, 9, 100);
  baySign.rotation.y = Math.PI / 2;
  add(baySign);

  // The lighthouse on the point, its beam turning slowly.
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 3.5, 18, 12),
    new THREE.MeshLambertMaterial({ color: PALETTE.lighthouse }),
  );
  tower.position.set(LIGHTHOUSE.x, 9, LIGHTHOUSE.z); tower.castShadow = true;
  add(tower);
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 2.8, 3, 12),
    new THREE.MeshLambertMaterial({ color: PALETTE.lighthouseTop }),
  );
  lampRoom.position.set(LIGHTHOUSE.x, 19, LIGHTHOUSE.z);
  add(lampRoom);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(4, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(LIGHTHOUSE.x, 19, LIGHTHOUSE.z);
  add(beam);
  colliders.push({ x0: LIGHTHOUSE.x - 4, x1: LIGHTHOUSE.x + 4, z0: LIGHTHOUSE.z - 4, z1: LIGHTHOUSE.z + 4 });

  // The airfield: a runway, a hangar and a windsock on the west edge.
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 80),
    new THREE.MeshLambertMaterial({ color: 0x37474f }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(-200, 0.05, -100);
  runway.receiveShadow = true;
  add(runway);
  for (let z = -130; z <= -70; z += 15) {
    const dash = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(-200, 0.07, z);
    add(dash);
  }
  const hangar = box(20, 9, 24, 0x78909c, -176, 4.5, -130);
  add(hangar);
  colliders.push({ x0: -186, x1: -166, z0: -142, z1: -118 });
  const sockPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x90a4ae }),
  );
  sockPole.position.set(-182, 4, -70);
  add(sockPole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(1, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0xff7043 }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(-180, 7.5, -70);
  add(sock);
  const airSign = textSign('AIRFIELD', 14, 3.5, '#ffffff', '#546e7a');
  airSign.position.set(-200, 7, -58);
  add(airSign);

  return {
    colliders,
    beam,
    // The beam sweeps the sea; call every frame.
    update(time) { beam.rotation.y = time * 0.4; },
  };
}

// Push a circle (a player or a car) out of every building box it overlaps.
export function resolveColliders(pos, radius, colliders) {
  for (const c of colliders) {
    const cx = Math.max(c.x0, Math.min(pos.x, c.x1));
    const cz = Math.max(c.z0, Math.min(pos.z, c.z1));
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;
    if (d2 < 0.0001) { pos.x = c.x1 + radius; continue; }
    const d = Math.sqrt(d2);
    pos.x = cx + (dx / d) * radius;
    pos.z = cz + (dz / d) * radius;
  }
}
