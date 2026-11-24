// Shared constants for Solmar Bay — night city. Sea to the north (negative z),
// the city grid in the middle, the airfield to the south-west.
export const WORLD = {
  minX: -220,
  maxX: 220,
  minZ: -220,
  maxZ: 220,
  seaZ: -150, // z below this is water
  beachZ: -132, // z below this is sand
  coastRoadZ: -138,
};

export const POI = {
  plaza: { x: 0, z: 0, label: 'Palm Plaza' },
  garage: { x: 70, z: 70, label: "Rico's Garage" },
  lighthouse: { x: -185, z: -178, label: 'Lighthouse Point' },
  marina: { x: 150, z: -152, label: 'Marina' },
  airfield: { x: -150, z: 150, label: 'Airfield' },
};

export const MISSIONS = [
  { id: 'wheels', name: 'First Wheels', pay: 150, text: 'Steal a car', hint: 'Walk up to the red sedan and press E' },
  { id: 'harbour', name: 'Harbour Escape', pay: 300, text: 'Reach the lighthouse point', hint: 'Take the skiff from the marina' },
  { id: 'taxi', name: 'City Taxi', pay: 250, time: 90, text: 'Pick up the fare at Palm Plaza', hint: 'Drive to the beacon before the timer runs out' },
  { id: 'courier', name: 'Sunset Courier', pay: 400, time: 120, text: 'Deliver 3 packages', hint: 'Follow the beacons, 3 drops' },
  { id: 'leap', name: 'Rooftop Leap', pay: 350, text: 'Jump the airfield ramp', hint: 'Hit the ramp at full speed' },
  { id: 'cache', name: 'Lighthouse Cache', pay: 500, text: 'Collect 5 packages', hint: 'Five caches around the lighthouse point' },
];

export const FARES = [
  { from: 'Palm Plaza', to: 'Airfield', pay: 120 },
  { from: 'Airfield', to: 'Marina', pay: 150 },
  { from: 'Marina', to: 'Palm Plaza', pay: 140 },
];

export const PRICES = { repair: 50, engine: 400, armor: 300 };

export const NIGHT = {
  sky: 0x0a1128,
  fog: 0x0a1128,
  ground: 0x1a2030,
  road: 0x141821,
  sand: 0x8a7a52,
  sea: 0x06182e,
  moon: 0x9db4ff,
  lamp: 0xffd27a,
  windowWarm: 0xffc46b,
  windowCool: 0x7fd4ff,
  neon: [0xff4fa3, 0x39d5ff, 0x7dff5e, 0xffb347],
};
