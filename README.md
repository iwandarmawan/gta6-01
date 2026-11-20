# Solmar Bay — an open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/iwandarmawan/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An entry for [make.fun gta6-01](https://make.fun/bounty/gta6-01): build
the most complete open-world crime game you can, in the spirit of GTA 6 —
an original city, original characters, original story. Nothing here is
from Rockstar's games: no names, map, art or music of theirs.

## The game

**Solmar Bay** is a sun-soaked coastal city. Rico Vega, a driver fresh
out of the east-side garages, takes jobs from Delgado, a fixer who pays
in cash — while the Solmar Bay police answer every crime with a wanted
level and a chase.

- **A living city** — a 10×10-block grid with procedural buildings,
  palms, street lights, a beach and sea, a central plaza with a fountain
  and a park. One seed builds the same city every run.
- **On foot and by car** — third-person walk/run/jump, arcade driving
  with steering, handbrake, collisions, damage and smoke. Steal any of
  the parked cars (E) — the first one is free, the next ones draw the law.
- **Traffic and pedestrians** — cars follow the road grid and stop at
  junctions and for the car ahead; pedestrians walk the sidewalks and
  flee from crashes.
- **Combat** — fists and a pistol (Delgado hands it over when the jobs
  get loud). Click or press F to punch or shoot, R to reload: hitscan
  shots with a muzzle flash and tracer, ammo and reserve in the HUD,
  a hit marker on every landing hit. Thugs shoot back, pedestrians
  flee from gunfire, and every shot in public raises the wanted level.
- **Wanted and police** — stars 0–5 rise on stealing, crashes,
  hitting pedestrians and shooting; police cruisers spawn, chase, ram
  and try to box you in, and roadblocks go up on the avenues when a
  job goes loud. Stay out of sight and the heat cools off. Get caught
  and you are busted; wreck yourself and you are wasted.
- **Missions and story** — a five-mission arc from Delgado. v2 plays
  four: "First Wheels" (steal a car, drive to the plaza, $250),
  "The Getaway" (grab the package at the north docks, lose a 2-star
  chase to the safehouse, $300), "Clockwork" (a 90-second delivery to
  the beach house with a live countdown, $400) and "The Informant"
  (meet the contact at the park on foot, survive the ambush, escape
  three stars and roadblocks, $500). Missions chain automatically;
  failing one retries after Delgado's timer, and N skips the wait.
  Waypoint beacon, objective line, cash rewards. Cash pickups are
  scattered around the city.
- **HUD and minimap** — cash, health, wanted stars, speed, ammo,
  objective, in-game clock, and a live minimap with roads, the player
  arrow, the mission blip, police dots, thug dots and roadblocks.
  The pause screen lists the whole mission arc and the cash on hand.
- **Sound and save** — engine hum, sirens, gunshots, punches and
  pickup blips, all synthesised with WebAudio (no audio files); cash,
  best mission and settings save to localStorage.

## How it plays

Open `game/index.html` in a desktop browser (or `node serve.ts` and open
http://localhost:8080). No build step, no network request at play time:
three.js is vendored under `game/vendor/`.

- **W A S D** walk / drive · **Shift** run · **Space** jump / handbrake
- **E** enter / exit car · **Click / F** punch / shoot · **R** reload · **N** next job
- **Mouse drag** look around · **P** pause · **M** mute · **R** restart after busted / wasted

## Screenshots

Real renders of the game's own code (`?shot=start|play|chase|mission&seed=1`):

1. `1-start.jpg` — the cover: Rico's coupe on the main avenue, plaza and skyline.
2. `2-play.jpg` — combat in the plaza: Rico firing his pistol at a thug, a pedestrian fleeing.
3. `3-chase.jpg` — a 3-star police chase at 93 km/h.
4. `4-mission.jpg` — "Clockwork": the sedan racing the 90-second clock to the beach house.

## How it is built

Plain static files under `game/` (three.js r160 vendored as
`game/vendor/three.min.js`), one system per source file under `game/src/`:
`rng.js` (seeded city), `city.js`, `cars.js`, `traffic.js`, `player.js`,
`police.js`, `missions.js`, `combat.js` (fists, pistol, thugs),
`hud.js`, `audio.js`, `shots.js`, `main.js`
(boot, loop, cameras, save). `main.ts` copies `game/` and `screenshots/`
to the output and writes `dossier.json` with the kit's
`vendor/makefun-game.ts`.

## Status

- **v1**: city, driving, on-foot, traffic, pedestrians,
  wanted + police, HUD + minimap, mission 1, save, synth sound, 4
  screenshots. Play-tested in headless Chromium with zero console errors.
  Submitted 19 Nov 2026; transcript gate passed at 99.8%.
- **v2** (this commit): combat (fists + pistol, thugs who shoot back),
  missions 2–4 playable with chaining and retries, roadblocks,
  finished car damage (fire, wrecked traffic), pause menu with the
  mission arc, fresh screenshots. Play-tested in headless Chromium
  with zero console errors.
- **v3** (planned): mission 5, side activities, final polish.
