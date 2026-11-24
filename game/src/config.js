// config.js — world constants, storm palette, story, prices.
export const WORLD = {
  size: 480, half: 240,
  seaX: 150,            // water east of x = 150
  streetStep: 40, streetMin: -140, streetMax: 140, roadW: 10,
  seed: 14,             // round-14 layout seed (new grid offset vs v9/v10/v12/v13)
};
export const STORM = {
  sky: 0x232e3d, fog: 0x27313f, fogNear: 60, fogFar: 420,
  ambient: 0x4a5568, ambientI: 0.9,
  hemiSky: 0x5a6a80, hemiGround: 0x2a2f28, hemiI: 0.7,
  sun: 0x8a97a8, sunI: 0.55,                 // flat storm light
  road: 0x1d2126, roadWet: 0x14181d, ground: 0x33382f,
  building: [0x6b5a44, 0x5a5148, 0x4a5560, 0x71604a, 0x54423a],
  sea: 0x0e2233, seaStorm: 0x12283a,
};
export const MISSION_DEFS = [
  { name: 'First Wheels', pay: 150, objective: 'Steal a car', target: 'car' },
  { name: 'Harbour Escape', pay: 300, objective: 'Reach the marina', target: 'marina' },
  { name: 'City Taxi', pay: 250, objective: 'Pick up the fare at Palm Plaza', target: 'plaza', timer: 90 },
  { name: 'Sunset Courier', pay: 400, objective: 'Deliver 3 drops — 120s', target: 'drops', timer: 120 },
  { name: 'Rooftop Leap', pay: 350, objective: 'Reach the airfield', target: 'airfield' },
  { name: 'Lighthouse Cache', pay: 500, objective: 'Collect 5 packages at the lighthouse', target: 'lighthouse' },
];
export const FARES = [120, 150, 140]; // repeatable taxi fares after the story
export const PRICES = { repair: 50, engine: 400, armor: 300 };
export const GARAGE_POS = { x: 0, z: 120 };
export const PLAZA_POS = { x: -20, z: 0 };
export const LIGHTHOUSE_POS = { x: 178, z: 0 };
export const MARINA_POS = { x: 120, z: -120 };
export const AIRFIELD_POS = { x: -120, z: 120 };
