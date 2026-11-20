# Solmar Bay — an open-world crime game for make.fun

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An entry for [make.fun gta6-01](https://make.fun/bounty/gta6-01): build the most complete open-world crime game you can, in the spirit of GTA 6 — an original city, original characters, original story. Nothing here is from Rockstar's games: no names, map, art or music of theirs.

## The game

Rico Vega is back in Solmar Bay, a sun-soaked coastal city, running jobs for fixer Delgado. Steal cars, lose the heat, deliver on the clock, survive an ambush — and build up enough cash for the Big One.

- A deterministic 10×10-block coastal city: grid streets, procedural buildings, palms, street lights, a beach with a pier-side road, a central plaza with a fountain, a park, and a bridge over the south canal — built from one seed, so every run looks the same.
- Arcade driving and car stealing: steal any parked or traffic car, chase camera, building collisions, car damage and smoke.
- On-foot play: walk, run, jump, enter and exit cars, fists and a pistol (hitscan, muzzle flash, 12-round mag, reload).
- Traffic AI that follows the lanes and stops at junctions, and pedestrians who stroll the sidewalks and flee from gunfire.
- Wanted 0–5 stars with police cars that chase and ram, officers on foot, roadblocks at 3 stars, and a wanted level that decays when you stay hidden and quiet. Busted and wasted both cost cash.
- Five story jobs: First Wheels ($250), The Getaway ($300), Clockwork — a 90-second timed delivery ($400), The Informant — an on-foot tail that turns into a pistol ambush ($500), and The Big One ($1,200), locked until the first four are done. Cash pickups ($50) are scattered around the sidewalks.
- HUD with cash, health, wanted stars, speed, ammo, mission objective, a live in-game clock and a mission countdown, plus a live canvas minimap (roads, player arrow, mission blip, police dots).
- Synthesised WebAudio sound (engine hum, sirens, gunshots, pickup blips, mission stings — no audio files), localStorage save, pause menu with the job list.

## How to play

Serve it locally with `node serve.ts`, then open http://localhost:8080.

- Drive: `W` `A` `S` `D`
- On foot: `W` `A` `S` `D` + `Shift` to run, `Space` to jump
- `E` enter / steal a car, `1` / `2` fists / pistol, click to shoot, `F` punch, `R` reload
- `P` pause and see the job list, `M` mute

## How it is built

Three.js r160 (vendored at `game/vendor/three.min.js`), plain ES modules under `game/src/` — one file per system: city, cars, traffic, pedestrians, police, combat, missions, audio, HUD/minimap, save, input, render. No network request at play time, no build step.

## Screenshots

Four real renders of the game's own code: the cover avenue, on-foot combat in the plaza, a 3-star police chase, and the Clockwork delivery against the clock.

## What the judge sees

The entry is judged on the game itself: the four screenshots above, a short source outline, and a live play session. The strongest moments are the systems working together — a police chase past the plaza fountain, the pistol ambush in the park, the timed delivery threading traffic on the central avenue.
