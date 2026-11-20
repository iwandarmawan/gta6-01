# Solmar Bay — an open-world crime game for make.fun

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original 3D open-world crime game built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01) ($1,666, 100 paid places). Rico Vega is back in Solmar Bay, a sun-soaked coastal city, running jobs for fixer Delgado.

## What is in the game

- A deterministic 10×10-block coastal city: grid streets, procedural buildings, palms, street lights, a beach with a pier, a central plaza and a park — built from one seed, so every run looks the same.
- Arcade driving and car stealing: steal any parked or traffic car, chase camera, building collisions, car damage and smoke.
- On-foot play: walk, run, jump, enter and exit cars, fists and a pistol (hitscan, muzzle flash, 12-round mag, reload).
- Traffic AI that follows the lanes and stops at junctions, and pedestrians who stroll the sidewalks and flee from gunfire.
- Wanted 0–5 stars with police cars that chase and ram, officers on foot, roadblocks at 3 stars, and a wanted level that decays when you stay hidden and quiet. Busted and wasted both cost cash.
- Four playable story jobs: First Wheels ($250), The Getaway ($300), Clockwork — a 90-second timed delivery ($400), and The Informant — an on-foot tail that turns into a pistol ambush ($500). A fifth job unlocks after them.
- Cash pickups ($50) scattered around the sidewalks, a wanted level that decays when you stay hidden, and a pause menu listing every job with its reward and done state.

## Missions

| Job | What to do | Reward |
|-----|------------|--------|
| 1 — First Wheels | Steal any car, drive it to the plaza marker | $250 |
| 2 — The Getaway | Pick up the package at the docks, escape a 2-star chase to the safehouse | $300 |
| 3 — Clockwork | Deliver across the city in 90 seconds (fail on timeout, retry offered) | $400 |
| 4 — The Informant | Meet the informant in the park on foot, survive the ambush, escape at 3 stars | $500 |
| 5 — The Big One | Locked until the first four jobs are done | $1,000 |
- HUD with cash, health, wanted stars, speed, ammo, objective line, mission countdown and a live canvas minimap; WebAudio synth sound (engine, sirens, gunshots, stings); localStorage save.

## How to play

Serve the game folder and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

W A S D drive / walk · E enter or steal a car · Space jump / handbrake · F punch · Click shoot · R reload · 1 fists / 2 pistol · P pause · M mute.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own code, staged with `?shot=start|play|chase|mission&seed=1`: the cover avenue, combat in the plaza, a 3-star police chase, and the timed delivery.

## Files

- `game/index.html` — the page: WebGL canvas, DOM HUD, menu panels.
- `game/vendor/three.min.js` — three.js r160, vendored from the official CDN.
- `game/src/` — one system per file: `config` (tuning), `rng` (seeded random), `city` (the world), `cars` (bodies + arcade driving), `traffic`, `peds`, `police` (wanted + pursuit), `combat` (fists + pistol), `missions` (jobs 1–4 + pickups), `audio` (WebAudio synth), `hud` (DOM + minimap), `save`, `input`, `render` (camera + scene), `main` (boot + loop + screens), `shots` (screenshot staging).
- `main.ts` — copies `game/` + `screenshots/` to `/output` and writes `dossier.json`.
- `shots.json` — the four screenshot poses and their query strings.

## License

MIT — see [LICENSE](LICENSE).
