# Solmar Bay — Foggy Morning

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original 3D open-world crime game for the [gta6-01 bounty](https://make.fun/bounty/gta6-01): Rico Marlowe runs jobs for Vera Costa across a foggy morning Solmar Bay — thick mist between the towers, lamps still glowing, headlights cutting through the fog, the lighthouse beam a soft cone in the mist, wet streets from the night's rain.

**Play:** WASD to drive and walk, E to enter/exit a vehicle, F to shoot, R to repair at Rico's Garage. Six story missions (First Wheels $150, Harbour Escape $300, City Taxi $250, Sunset Courier $400, Rooftop Leap $350, Lighthouse Cache $500) plus repeatable taxi fares; garage upgrades (repair $50, engine $400 +25% speed, armor $300 +50 HP); wanted levels 1–5 with police interceptors and a helicopter at 4+ stars; traffic, pedestrians, a minimap, a save system, and a drivable boat at the marina.

**Tech:** three.js (vendored UMD build) with a `three-shim.js` re-export, Node 22 stdlib only. `main.ts` copies `game/` and `screenshots/` into the output dir before building the dossier, so it runs cleanly from a fresh empty output directory.
