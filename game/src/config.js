// Solmar Bay — tuning, layout and content data for the whole game.
// One place holds every number the other modules share, so the city,
// the missions and the HUD always agree about where things are.

// World layout: a coastal island, x in [-260, 260], z in [-200, 200].
// A water channel at x in [110, 150] splits Downtown (west) from
// Portside (east); one bridge at z in [-14, 14] joins them.
export const WORLD = {
  minX: -260, maxX: 260, minZ: -200, maxZ: 200,
  landMinX: -240, landMaxX: 240, landMinZ: -180, landMaxZ: 180,
  channelMinX: 110, channelMaxX: 150,
  bridgeMinZ: -14, bridgeMaxZ: 14,
  waterY: -0.7,
  seed: 1337,
};

// Named places every system uses (missions, world art, minimap).
export const PLACES = {
  garage: { x: -50, z: -60, label: "Rico's Garage" },
  hotel: { x: 70, z: -120, label: 'Solmar Grand Hotel' },
  hotelFront: { x: 70, z: -105, label: 'Solmar Grand Hotel entrance' },
  marina: { x: 225, z: 60, label: 'Marina Bay' },
  dock: { x: 232, z: 72, label: 'Marina Dock' },
  buoy: { x: 305, z: 150, label: 'Harbour Buoy' },
  lighthouse: { x: -225, z: 165, label: 'South Point Light' },
  beach: { x: -60, z: 168, label: 'Coral Beach' },
  plaza: { x: 0, z: 0, label: 'Liberty Plaza' },
  packages: [
    { x: -135, z: -95, label: 'Package 1 — North Arcade' },
    { x: 35, z: 125, label: 'Package 2 — Palm Court' },
    { x: 185, z: -95, label: 'Package 3 — Portside Yard' },
  ],
  playerStart: { x: -50, z: -44, heading: Math.PI },
};

// Road centrelines. Traffic loops and the minimap are built from these.
export const ROADS = [
  // Downtown verticals
  { x1: -200, z1: -150, x2: -200, z2: 150 },
  { x1: -140, z1: -150, x2: -140, z2: 150 },
  { x1: -80, z1: -150, x2: -80, z2: 150 },
  { x1: -20, z1: -150, x2: -20, z2: 150 },
  { x1: 40, z1: -150, x2: 40, z2: 150 },
  { x1: 100, z1: -150, x2: 100, z2: 150 },
  // Downtown horizontals
  { x1: -200, z1: -150, x2: 100, z2: -150 },
  { x1: -200, z1: -90, x2: 100, z2: -90 },
  { x1: -200, z1: -30, x2: 100, z2: -30 },
  { x1: -200, z1: 30, x2: 100, z2: 30 },
  { x1: -200, z1: 90, x2: 100, z2: 90 },
  { x1: -200, z1: 150, x2: 100, z2: 150 },
  // Bridge road across the channel
  { x1: 100, z1: 0, x2: 170, z2: 0 },
  // Portside grid
  { x1: 170, z1: -150, x2: 170, z2: 150 },
  { x1: 210, z1: -150, x2: 210, z2: 150 },
  { x1: 170, z1: -150, x2: 230, z2: -150 },
  { x1: 170, z1: -90, x2: 230, z2: -90 },
  { x1: 170, z1: 90, x2: 230, z2: 90 },
  { x1: 170, z1: 150, x2: 230, z2: 150 },
  // Coastal avenue along the south shore to the marina
  { x1: -200, z1: 165, x2: 230, z2: 165 },
];

// Rectangular loops traffic cars drive, as waypoint lists.
export const TRAFFIC_LOOPS = [
  [[-200, -150], [100, -150], [100, 150], [-200, 150]],
  [[-140, -90], [-20, -90], [-20, 90], [-140, 90]],
  [[-80, -30], [40, -30], [40, 30], [-80, 30]],
  [[170, -150], [210, -150], [210, 150], [170, 150]],
  [[100, 0], [170, 0], [170, 165], [-200, 165], [-200, 150], [100, 150]],
];

// Mission definitions in story order.
export const MISSIONS = [
  {
    id: 'harbour-hustle',
    name: 'Harbour Hustle',
    briefing: 'A client waits at Marina Bay. Pick them up, then drop them at the Solmar Grand Hotel before the clock runs out.',
    reward: 150,
    timeLimit: 150,
    steps: [
      { kind: 'goto', label: 'Drive to the client at Marina Bay', target: 'marina' },
      { kind: 'goto', label: 'Drop the client at the Solmar Grand Hotel', target: 'hotelFront' },
    ],
  },
  {
    id: 'package-run',
    name: 'Package Run',
    briefing: 'Three parcels are stashed around the city. Collect them all and bring them to Rico\'s Garage. The law will not like it — each pickup draws heat.',
    reward: 250,
    timeLimit: 240,
    steps: [
      { kind: 'collect', label: 'Collect the package at North Arcade', target: 'packages.0' },
      { kind: 'collect', label: 'Collect the package at Palm Court', target: 'packages.1' },
      { kind: 'collect', label: 'Collect the package at Portside Yard', target: 'packages.2' },
      { kind: 'goto', label: 'Deliver the parcels to Rico\'s Garage', target: 'garage' },
    ],
  },
  {
    id: 'harbour-escape',
    name: 'Harbour Escape',
    briefing: 'Take the boat from Marina Dock, sail out to the harbour buoy, then bring her back to the dock. Watch the hull — and the law.',
    reward: 400,
    timeLimit: 260,
    steps: [
      { kind: 'board', label: 'Board the boat at Marina Dock', target: 'dock' },
      { kind: 'goto', label: 'Sail to the harbour buoy', target: 'buoy', vehicle: 'boat' },
      { kind: 'goto', label: 'Bring the boat back to Marina Dock', target: 'dock', vehicle: 'boat' },
    ],
  },
];

// Movement, combat, police and economy tuning.
export const TUNING = {
  walkSpeed: 6, runSpeed: 10.5, playerRadius: 0.7,
  carAccel: 14, carBrake: 26, carMaxSpeed: 34, carMaxReverse: 10,
  carTurn: 1.9, carGrip: 6.5, carRadius: 1.9, carHealth: 100,
  boatAccel: 8, boatMaxSpeed: 20, boatTurn: 1.1, boatRadius: 2.4,
  trafficSpeed: 10, trafficCount: 10, pedCount: 14,
  playerHealth: 100, repairCost: 50,
  heatPerPunch: 25, heatPerPackage: 20, heatPerRam: 20, heatDecay: 2.2,
  policeBustTime: 2.5, policeBustRange: 4.5,
  dayLength: 300,
};

// Key bindings (KeyboardEvent.code values).
export const KEYS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'], brake: ['Space'],
  enter: ['KeyE'], punch: ['KeyF'], pause: ['KeyP', 'Escape'],
  mute: ['KeyM'], retry: ['KeyR'],
};

// Palettes: sun-soaked coastal city.
export const PALETTE = {
  building: [0xf5efe0, 0xe8dcc0, 0xd9a066, 0x9fc3d8, 0xa8c686, 0xd8d8d8, 0xf2b8a0, 0x8fb8a8],
  roof: [0x8a7a66, 0x6b7c8c, 0xb0563a],
  road: 0x3a3f46, sidewalk: 0x9a938a, sand: 0xe8d49a,
  grass: 0x7fae62, sea: 0x2e7fa8, skyDay: 0x87bfe8,
  car: [0xc23b2e, 0x2e5fa8, 0xe8c832, 0x3aa655, 0xeeeeee, 0x222222, 0x7a4a9e],
  police: 0xe8e8e8,
};

// Save key for localStorage.
export const SAVE_KEY = 'solmar-bay-save-v1';
