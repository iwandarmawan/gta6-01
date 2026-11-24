// config.js — Solmar Bay at dawn: layout, palette, missions, economy.
// Sea is SOUTH (z > 150). Sun rises in the EAST (+x), low and warm.
export const WORLD = {
  size: 420,
  seaZ: 150,
  plaza: { x: 0, z: 0 },
  garage: { x: 25, z: -45 },
  lighthouse: { x: 0, z: 185 },
  marina: { x: -140, z: 165 },
  airfield: { x: 150, z: -110 },
  streetsX: [-120, -60, 0, 60, 120],
  streetsZ: [-120, -60, 0, 60, 120],
  coastZ: 140,
};

export const DAWN = {
  skyTop: 0x7fa8d8, skyHorizon: 0xffd9a8, sun: 0xffdf9a,
  fog: 0xf2b27a, fogNear: 90, fogFar: 420,
  ambient: 0xffe2c0, ambientIntensity: 1.15,
  hemiSky: 0xffd9a0, hemiGround: 0x5a4a3a, hemiIntensity: 0.85,
  sunLight: 0xffc98a, sunIntensity: 1.1,
  moon: null, // dawn: no moon, the sun does the work
  road: 0x33363e, roadLine: 0xd8c9a0,
  ground: 0x7d6b4f, beach: 0xd9b98a, sea: 0x35597a,
  windowLit: 0xffd27a, windowDark: 0x2a3242, windowEmissive: 0.25,
  lampGlow: 0xffd9a0, lampPoolOpacity: 0.15,
};

export const MISSIONS = [
  { id: 'wheels', name: 'First Wheels', pay: 150, objective: 'Steal a car (walk up and press E)' },
  { id: 'harbour', name: 'Harbour Escape', pay: 300, objective: 'Take the skiff to the lighthouse point' },
  { id: 'taxi', name: 'City Taxi', pay: 250, time: 90, objective: 'Pick up the fare at Palm Plaza' },
  { id: 'courier', name: 'Sunset Courier', pay: 400, time: 120, drops: 3, objective: 'Deliver 3 packages before sunrise ends' },
  { id: 'rooftop', name: 'Rooftop Leap', pay: 350, objective: 'Reach the rooftop cache' },
  { id: 'cache', name: 'Lighthouse Cache', pay: 500, packages: 5, objective: 'Collect 5 packages at the lighthouse' },
];

export const FARES = [120, 150, 140];
export const GARAGE = { repair: 50, engine: 400, armor: 300, engineBoost: 1.25, armorHp: 50 };
export const PLAYER = { hp: 100, walkSpeed: 6, runSpeed: 10 };
export const VEHICLES = {
  sedan: { top: 30, color: 0xc23a2e, name: 'Sedan' },
  pickup: { top: 28, color: 0xd97a2b, name: 'Pickup' },
  bike: { top: 34, color: 0x2a7ad9, name: 'Coast Runner' },
  skiff: { top: 22, color: 0xe8e8e8, name: 'Skiff' },
  police: { top: 36, color: 0xe8e8e8, name: 'Interceptor' },
};
