// Solmar Bay, handed in (Node 22, standard library only): this program
// copies the game and its screenshots from beside this file into /output
// and writes /output/dossier.json with the vendored make.fun library —
// the summary the judge reads. The game itself is game/ (plain static
// files a desktop browser loads offline: game/index.html and its ES
// modules, three.js vendored under game/vendor/) and the pictures are
// screenshots/ (four real renders of the game's own code, the first by
// name the cover). Run it with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out
// node main.ts`; outside the grader MAKEFUN_OUTPUT_DIR stands in for
// /output, and the grader's own caps (reference/gate.json) are the ones
// passed to buildDossier below, so this program refuses exactly where
// the scorer would: more than 4 screenshots or one over 256 KiB, more
// than 993 entries in game/ or 48 MiB of game files in all, or a game
// path over 1000 bytes.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
